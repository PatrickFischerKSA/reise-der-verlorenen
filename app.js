(function () {
  const cardPool = window.REISE_DER_VERLORENEN_CARDS || [];
  const meta = window.REISE_DER_VERLORENEN_META || {};
  const playerLabels = ["Signal", "Kompass", "Hafen", "Transit"];

  const elements = {
    playerCount: document.getElementById("playerCount"),
    pairCount: document.getElementById("pairCount"),
    categorySelect: document.getElementById("categorySelect"),
    startGameBtn: document.getElementById("startGameBtn"),
    previewBtn: document.getElementById("previewBtn"),
    setupHint: document.getElementById("setupHint"),
    scoreboard: document.getElementById("scoreboard"),
    pairsFoundStat: document.getElementById("pairsFoundStat"),
    attemptStat: document.getElementById("attemptStat"),
    timerStat: document.getElementById("timerStat"),
    statusBanner: document.getElementById("statusBanner"),
    deckMeta: document.getElementById("deckMeta"),
    board: document.getElementById("board"),
    matchDetail: document.getElementById("matchDetail"),
    categoryGuide: document.getElementById("categoryGuide")
  };

  const state = {
    players: [],
    deck: [],
    openCards: [],
    matchedPairIds: new Set(),
    currentPlayerIndex: 0,
    attempts: 0,
    matches: 0,
    activePairCount: 0,
    activeCategory: "Alle Bereiche",
    boardLocked: false,
    previewMode: false,
    startedAt: null,
    timerId: null,
    lastMatch: null
  };

  function shuffle(list) {
    const copy = [...list];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getCategories() {
    return ["Alle Bereiche", ...new Set(cardPool.map((card) => card.category))];
  }

  function getFilteredPool() {
    if (state.activeCategory === "Alle Bereiche") {
      return cardPool;
    }
    return cardPool.filter((card) => card.category === state.activeCategory);
  }

  function createPlayers(count) {
    return Array.from({ length: count }, (_, index) => ({
      id: index,
      name: `Spieler ${index + 1}`,
      badge: playerLabels[index] || `Spieler ${index + 1}`,
      score: 0
    }));
  }

  function buildDeck(selection) {
    return shuffle(
      selection.flatMap((entry) => [
        {
          uid: `${entry.id}-name`,
          pairId: entry.id,
          faceType: "name",
          label: "Name",
          title: entry.name,
          body: entry.name,
          category: entry.category
        },
        {
          uid: `${entry.id}-description`,
          pairId: entry.id,
          faceType: "description",
          label: "Beschreibung",
          title: entry.name,
          body: entry.description,
          category: entry.category
        }
      ])
    );
  }

  function getCardByUid(uid) {
    return state.deck.find((card) => card.uid === uid) || null;
  }

  function getPairById(pairId) {
    return cardPool.find((card) => card.id === pairId) || null;
  }

  function populateCategorySelect() {
    elements.categorySelect.innerHTML = getCategories()
      .map((category) => {
        const count = category === "Alle Bereiche"
          ? cardPool.length
          : cardPool.filter((entry) => entry.category === category).length;
        return `<option value="${escapeHtml(category)}">${escapeHtml(category)} (${count})</option>`;
      })
      .join("");
  }

  function renderGuide() {
    elements.categoryGuide.innerHTML = (meta.guides || [])
      .map(
        (guide) => `
          <article class="guide-item">
            <h3>${escapeHtml(guide.title)}</h3>
            <p>${escapeHtml(guide.note)}</p>
          </article>
        `
      )
      .join("");
  }

  function updateSetupHint(requestedPairs, actualPairs, availablePairs) {
    if (requestedPairs > availablePairs) {
      elements.setupHint.textContent =
        `Im gewählten Bereich gibt es ${availablePairs} Paare. Für diese Partie werden deshalb ${actualPairs} Paare verwendet.`;
      return;
    }

    elements.setupHint.textContent =
      `Im aktuellen Bereich stehen ${availablePairs} mögliche Paare zur Auswahl.`;
  }

  function setStatus(message) {
    elements.statusBanner.textContent = message;
  }

  function formatDuration(milliseconds) {
    if (!milliseconds || milliseconds < 0) {
      return "00:00";
    }

    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function updateTimer() {
    if (!state.startedAt) {
      elements.timerStat.textContent = "00:00";
      return;
    }
    elements.timerStat.textContent = formatDuration(Date.now() - state.startedAt);
  }

  function resetTimer() {
    if (state.timerId) {
      window.clearInterval(state.timerId);
    }
    state.startedAt = Date.now();
    state.timerId = window.setInterval(updateTimer, 1000);
    updateTimer();
  }

  function stopTimer() {
    if (state.timerId) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function startGame() {
    const playerCount = Number(elements.playerCount.value);
    const requestedPairs = Number(elements.pairCount.value);
    state.activeCategory = elements.categorySelect.value;

    const filteredPool = shuffle(getFilteredPool());
    const actualPairs = Math.min(requestedPairs, filteredPool.length);
    const selection = filteredPool.slice(0, actualPairs);

    state.players = createPlayers(playerCount);
    state.deck = buildDeck(selection);
    state.openCards = [];
    state.matchedPairIds = new Set();
    state.currentPlayerIndex = 0;
    state.attempts = 0;
    state.matches = 0;
    state.activePairCount = actualPairs;
    state.boardLocked = false;
    state.previewMode = false;
    state.lastMatch = null;

    updateSetupHint(requestedPairs, actualPairs, filteredPool.length);
    resetTimer();
    render();

    setStatus(
      `Neue Partie: ${actualPairs} Paare im Bereich „${state.activeCategory}“. ${state.players[0].name} beginnt.`
    );
  }

  function nextPlayer() {
    if (state.players.length <= 1) {
      return;
    }
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  }

  function isVisible(card) {
    return state.previewMode || state.openCards.includes(card.uid) || state.matchedPairIds.has(card.pairId);
  }

  function renderScoreboard() {
    elements.scoreboard.innerHTML = state.players
      .map(
        (player, index) => `
          <article class="score-chip ${index === state.currentPlayerIndex ? "active" : ""}">
            <p class="mini-label">${escapeHtml(player.badge)}</p>
            <strong>${escapeHtml(player.name)}</strong>
            <span class="score-value">${player.score}</span>
          </article>
        `
      )
      .join("");
  }

  function renderStats() {
    elements.pairsFoundStat.textContent = `${state.matches} / ${state.activePairCount}`;
    elements.attemptStat.textContent = String(state.attempts);
    elements.deckMeta.textContent = state.activePairCount
      ? `${state.deck.length} Karten, Bereich: ${state.activeCategory}.`
      : "Noch keine Partie aktiv.";
    updateTimer();
  }

  function renderMatchDetail() {
    if (!state.lastMatch) {
      elements.matchDetail.className = "match-detail empty-detail";
      elements.matchDetail.textContent = "Noch kein Paar gefunden.";
      return;
    }

    elements.matchDetail.className = "match-detail";
    elements.matchDetail.innerHTML = `
      <p class="detail-category">${escapeHtml(state.lastMatch.category)}</p>
      <h3>${escapeHtml(state.lastMatch.name)}</h3>
      <p>${escapeHtml(state.lastMatch.description)}</p>
    `;
  }

  function renderBoard() {
    if (!state.deck.length) {
      elements.board.className = "board empty-board";
      elements.board.innerHTML = `<p class="muted">Noch keine Karten im Spiel.</p>`;
      return;
    }

    const cardCount = state.deck.length;
    const compactClass = cardCount >= 40 ? "board compact" : cardCount >= 24 ? "board tight" : "board";
    elements.board.className = compactClass;
    elements.board.innerHTML = state.deck
      .map((card) => {
        const visible = isVisible(card);
        const matched = state.matchedPairIds.has(card.pairId);
        const classes = [
          "memory-card",
          visible ? "is-visible" : "",
          matched ? "is-matched" : "",
          card.faceType === "name" ? "card-name" : "card-description"
        ]
          .filter(Boolean)
          .join(" ");

        return `
          <button
            class="${classes}"
            type="button"
            data-uid="${escapeHtml(card.uid)}"
            aria-label="${escapeHtml(card.label)}"
            ${matched ? 'aria-pressed="true"' : 'aria-pressed="false"'}
          >
            <span class="card-shell">
              <span class="card-face card-front">
                <span class="card-badge">${escapeHtml(card.label)}</span>
                <strong>${card.faceType === "name" ? "?" : "..."}</strong>
              </span>
              <span class="card-face card-back">
                <span class="card-badge">${escapeHtml(card.label)}</span>
                <span class="card-title">${escapeHtml(card.title)}</span>
                <span class="card-text">${escapeHtml(card.body)}</span>
              </span>
            </span>
          </button>
        `;
      })
      .join("");
  }

  function render() {
    renderScoreboard();
    renderStats();
    renderMatchDetail();
    renderBoard();
  }

  function finishGame() {
    stopTimer();
    const duration = formatDuration(Date.now() - state.startedAt);
    const highScore = Math.max(...state.players.map((player) => player.score));
    const winners = state.players.filter((player) => player.score === highScore);
    const winnerText = winners.length === 1
      ? `${winners[0].name} gewinnt mit ${winners[0].score} Paaren.`
      : `Gleichstand: ${winners.map((player) => player.name).join(", ")} mit je ${highScore} Paaren.`;

    setStatus(`Partie beendet nach ${duration}. ${winnerText}`);
  }

  function handleSuccessfulMatch(firstCard, secondCard) {
    state.matchedPairIds.add(firstCard.pairId);
    state.matches += 1;
    state.players[state.currentPlayerIndex].score += 1;
    state.lastMatch = getPairById(firstCard.pairId);
    state.openCards = [];

    if (state.matches === state.activePairCount) {
      render();
      finishGame();
      return;
    }

    render();
    setStatus(`${state.players[state.currentPlayerIndex].name} hat ein Paar gefunden und bleibt am Zug.`);
  }

  function handleFailedMatch() {
    const currentPlayerName = state.players[state.currentPlayerIndex].name;
    state.boardLocked = true;
    window.setTimeout(() => {
      state.openCards = [];
      nextPlayer();
      state.boardLocked = false;
      render();
      setStatus(`Kein Paar. ${currentPlayerName} gibt ab, jetzt ist ${state.players[state.currentPlayerIndex].name} dran.`);
    }, 950);
  }

  function handleCardClick(uid) {
    if (!state.deck.length || state.boardLocked || state.previewMode) {
      return;
    }

    const card = getCardByUid(uid);
    if (!card) {
      return;
    }

    const alreadyVisible = isVisible(card);
    if (alreadyVisible) {
      return;
    }

    state.openCards.push(card.uid);
    renderBoard();

    if (state.openCards.length < 2) {
      return;
    }

    state.attempts += 1;
    const [firstUid, secondUid] = state.openCards;
    const firstCard = getCardByUid(firstUid);
    const secondCard = getCardByUid(secondUid);
    const isMatch =
      firstCard &&
      secondCard &&
      firstCard.pairId === secondCard.pairId &&
      firstCard.faceType !== secondCard.faceType;

    if (isMatch) {
      handleSuccessfulMatch(firstCard, secondCard);
      return;
    }

    handleFailedMatch();
    renderStats();
  }

  function previewBoard() {
    if (!state.deck.length || state.previewMode || state.boardLocked || state.openCards.length > 0) {
      return;
    }

    state.previewMode = true;
    renderBoard();
    setStatus("Lernblick aktiv: Alle Karten sind für acht Sekunden sichtbar.");

    window.setTimeout(() => {
      state.previewMode = false;
      renderBoard();
      setStatus(`Lernblick beendet. ${state.players[state.currentPlayerIndex].name} ist am Zug.`);
    }, 8000);
  }

  function bindEvents() {
    elements.startGameBtn.addEventListener("click", startGame);
    elements.previewBtn.addEventListener("click", previewBoard);
    elements.categorySelect.addEventListener("change", () => {
      state.activeCategory = elements.categorySelect.value;
      updateSetupHint(Number(elements.pairCount.value), Number(elements.pairCount.value), getFilteredPool().length);
    });
    elements.pairCount.addEventListener("change", () => {
      updateSetupHint(Number(elements.pairCount.value), Number(elements.pairCount.value), getFilteredPool().length);
    });
    elements.board.addEventListener("click", (event) => {
      const button = event.target.closest("[data-uid]");
      if (!button) {
        return;
      }
      handleCardClick(button.dataset.uid);
    });
  }

  function init() {
    populateCategorySelect();
    renderGuide();
    state.players = createPlayers(Number(elements.playerCount.value));
    render();
    bindEvents();
    updateSetupHint(Number(elements.pairCount.value), Number(elements.pairCount.value), cardPool.length);
  }

  init();
})();
