(function () {
  const meta = window.REISE_DER_VERLORENEN_META || {};
  const levelDefinitions = meta.levels || [];
  const levelPools = {
    level1: window.REISE_DER_VERLORENEN_LEVEL1_CARDS || [],
    level2: window.REISE_DER_VERLORENEN_LEVEL2_CARDS || [],
    level3: window.REISE_DER_VERLORENEN_LEVEL3_CARDS || [],
    level4: window.REISE_DER_VERLORENEN_LEVEL4_CARDS || []
  };
  const playerLabels = ["Signal", "Kompass", "Hafen", "Transit"];

  const elements = {
    levelSelect: document.getElementById("levelSelect"),
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
    boardTitle: document.getElementById("boardTitle"),
    deckMeta: document.getElementById("deckMeta"),
    board: document.getElementById("board"),
    matchDetail: document.getElementById("matchDetail"),
    categoryGuide: document.getElementById("categoryGuide"),
    zoomModal: document.getElementById("zoomModal"),
    zoomType: document.getElementById("zoomType"),
    zoomTitle: document.getElementById("zoomTitle"),
    zoomMeta: document.getElementById("zoomMeta"),
    zoomText: document.getElementById("zoomText"),
    zoomCloseBtn: document.getElementById("zoomCloseBtn")
  };

  const fallbackLevel = {
    id: "level1",
    title: "Level 1",
    boardTitle: "Memory",
    promptLabel: "Karte A",
    responseLabel: "Karte B",
    guides: []
  };

  const state = {
    level: meta.defaultLevel || (levelDefinitions[0] && levelDefinitions[0].id) || "level1",
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
    lastMatch: null,
    zoomCardUid: null
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

  function getActiveLevel() {
    return levelDefinitions.find((level) => level.id === state.level) || levelDefinitions[0] || fallbackLevel;
  }

  function getActivePool() {
    return levelPools[state.level] || [];
  }

  function getCategories() {
    return ["Alle Bereiche", ...new Set(getActivePool().map((card) => card.category))];
  }

  function getFilteredPool() {
    if (state.activeCategory === "Alle Bereiche") {
      return getActivePool();
    }
    return getActivePool().filter((card) => card.category === state.activeCategory);
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
    const level = getActiveLevel();

    return shuffle(
      selection.flatMap((entry) => [
        {
          uid: `${entry.id}-prompt`,
          pairId: entry.id,
          faceType: "prompt",
          label: level.promptLabel,
          title: level.promptLabel,
          body: entry.prompt,
          category: entry.category
        },
        {
          uid: `${entry.id}-response`,
          pairId: entry.id,
          faceType: "response",
          label: level.responseLabel,
          title: level.responseLabel,
          body: entry.response,
          category: entry.category
        }
      ])
    );
  }

  function getCardByUid(uid) {
    return state.deck.find((card) => card.uid === uid) || null;
  }

  function getPairById(pairId) {
    return getActivePool().find((card) => card.id === pairId) || null;
  }

  function populateLevelSelect() {
    elements.levelSelect.innerHTML = levelDefinitions
      .map((level) => `<option value="${escapeHtml(level.id)}">${escapeHtml(level.title)}</option>`)
      .join("");
    elements.levelSelect.value = state.level;
  }

  function populateCategorySelect() {
    elements.categorySelect.innerHTML = getCategories()
      .map((category) => {
        const count = category === "Alle Bereiche"
          ? getActivePool().length
          : getActivePool().filter((entry) => entry.category === category).length;
        return `<option value="${escapeHtml(category)}">${escapeHtml(category)} (${count})</option>`;
      })
      .join("");
    elements.categorySelect.value = state.activeCategory;
  }

  function renderGuide() {
    const level = getActiveLevel();
    elements.categoryGuide.innerHTML = (level.guides || [])
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

  function updateLevelCopy() {
    const level = getActiveLevel();
    elements.boardTitle.textContent = level.boardTitle;
  }

  function updateSetupHint(requestedPairs, actualPairs, availablePairs) {
    const level = getActiveLevel();
    if (requestedPairs > availablePairs) {
      elements.setupHint.textContent =
        `${level.title}: Im gewählten Bereich gibt es ${availablePairs} Paare. Für diese Partie werden deshalb ${actualPairs} Paare verwendet.`;
      return;
    }

    elements.setupHint.textContent =
      `${level.title}: Im aktuellen Bereich stehen ${availablePairs} mögliche Paare zur Auswahl.`;
  }

  function setStatus(message) {
    elements.statusBanner.textContent = message;
  }

  function openZoom(uid) {
    const card = getCardByUid(uid);
    if (!card || !isVisible(card)) {
      return;
    }

    state.zoomCardUid = uid;
    elements.zoomType.textContent = card.label;
    elements.zoomTitle.textContent = card.title;
    elements.zoomMeta.textContent = `${card.category} · ${getActiveLevel().title}`;
    elements.zoomText.textContent = card.body;
    elements.zoomModal.classList.remove("modal-hidden");
    elements.zoomModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeZoom() {
    state.zoomCardUid = null;
    elements.zoomModal.classList.add("modal-hidden");
    elements.zoomModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
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

  function resetBoard(message) {
    stopTimer();
    closeZoom();
    state.players = createPlayers(Number(elements.playerCount.value));
    state.deck = [];
    state.openCards = [];
    state.matchedPairIds = new Set();
    state.currentPlayerIndex = 0;
    state.attempts = 0;
    state.matches = 0;
    state.activePairCount = 0;
    state.boardLocked = false;
    state.previewMode = false;
    state.startedAt = null;
    state.lastMatch = null;
    render();
    updateSetupHint(Number(elements.pairCount.value), Number(elements.pairCount.value), getActivePool().length);
    if (message) {
      setStatus(message);
    }
  }

  function startGame() {
    state.level = elements.levelSelect.value;
    state.activeCategory = elements.categorySelect.value;

    const level = getActiveLevel();
    const playerCount = Number(elements.playerCount.value);
    const requestedPairs = Number(elements.pairCount.value);
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
    closeZoom();

    updateSetupHint(requestedPairs, actualPairs, filteredPool.length);
    resetTimer();
    render();

    setStatus(
      `${level.title}: ${actualPairs} Paare im Bereich „${state.activeCategory}“. ${state.players[0].name} beginnt.`
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
      ? `${state.deck.length} Karten, ${getActiveLevel().title}, Bereich: ${state.activeCategory}.`
      : "Noch keine Partie aktiv.";
    updateTimer();
  }

  function renderMatchDetail() {
    if (!state.lastMatch) {
      elements.matchDetail.className = "match-detail empty-detail";
      elements.matchDetail.textContent = "Noch kein Paar gefunden.";
      return;
    }

    const level = getActiveLevel();
    elements.matchDetail.className = "match-detail";
    elements.matchDetail.innerHTML = `
      <p class="detail-category">${escapeHtml(state.lastMatch.category)}</p>
      <div class="detail-entry">
        <p class="detail-label">${escapeHtml(level.promptLabel)}</p>
        <p>${escapeHtml(state.lastMatch.prompt)}</p>
      </div>
      <div class="detail-entry">
        <p class="detail-label">${escapeHtml(level.responseLabel)}</p>
        <p>${escapeHtml(state.lastMatch.response)}</p>
      </div>
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
          card.faceType === "prompt" ? "card-name" : "card-description"
        ]
          .filter(Boolean)
          .join(" ");

        return `
          <article class="${classes}">
            <button
              class="card-toggle"
              type="button"
              data-uid="${escapeHtml(card.uid)}"
              aria-label="${escapeHtml(card.label)}"
              aria-pressed="${matched ? "true" : "false"}"
            >
              <span class="card-shell">
                <span class="card-face card-front">
                  <span class="card-badge">${escapeHtml(card.label)}</span>
                  <strong>${card.faceType === "prompt" ? "?" : "..."}</strong>
                </span>
                <span class="card-face card-back">
                  <span class="card-badge">${escapeHtml(card.label)}</span>
                  <span class="card-title">${escapeHtml(card.title)}</span>
                  <span class="card-text">${escapeHtml(card.body)}</span>
                </span>
              </span>
            </button>
            <button
              class="zoom-trigger ${visible ? "" : "zoom-hidden"}"
              type="button"
              data-zoom-uid="${escapeHtml(card.uid)}"
              aria-label="${escapeHtml(card.label)} vergrößern"
              title="Vollständigen Kartentext anzeigen"
            >
              <span aria-hidden="true">+</span>
            </button>
          </article>
        `;
      })
      .join("");
  }

  function render() {
    updateLevelCopy();
    renderScoreboard();
    renderStats();
    renderMatchDetail();
    renderGuide();
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

    setStatus(`${getActiveLevel().title} beendet nach ${duration}. ${winnerText}`);
  }

  function handleSuccessfulMatch(firstCard) {
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
    if (!card || isVisible(card)) {
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
      handleSuccessfulMatch(firstCard);
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

  function handleLevelChange() {
    state.level = elements.levelSelect.value;
    state.activeCategory = "Alle Bereiche";
    populateCategorySelect();
    resetBoard(`${getActiveLevel().title} gewählt. Stelle nun Bereich und Kartenzahl ein und starte die Partie.`);
  }

  function bindEvents() {
    elements.startGameBtn.addEventListener("click", startGame);
    elements.previewBtn.addEventListener("click", previewBoard);
    elements.zoomCloseBtn.addEventListener("click", closeZoom);
    elements.levelSelect.addEventListener("change", handleLevelChange);
    elements.categorySelect.addEventListener("change", () => {
      state.activeCategory = elements.categorySelect.value;
      updateSetupHint(Number(elements.pairCount.value), Number(elements.pairCount.value), getFilteredPool().length);
    });
    elements.pairCount.addEventListener("change", () => {
      updateSetupHint(Number(elements.pairCount.value), Number(elements.pairCount.value), getFilteredPool().length);
    });
    elements.board.addEventListener("click", (event) => {
      const zoomButton = event.target.closest("[data-zoom-uid]");
      if (zoomButton) {
        openZoom(zoomButton.dataset.zoomUid);
        return;
      }

      const button = event.target.closest("[data-uid]");
      if (!button) {
        return;
      }
      handleCardClick(button.dataset.uid);
    });
    elements.zoomModal.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-zoom]")) {
        closeZoom();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !elements.zoomModal.classList.contains("modal-hidden")) {
        closeZoom();
      }
    });
  }

  function init() {
    populateLevelSelect();
    populateCategorySelect();
    bindEvents();
    resetBoard(`${getActiveLevel().title} ist bereit. Wähle Bereich und Kartenzahl und starte eine neue Partie.`);
  }

  init();
})();
