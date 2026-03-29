# Reise der Verlorenen

Volldigitalisiertes Memory-Spiel zu Figuren aus dem Kontext der *St. Louis*, zur Flüchtlingspolitik bis 1939 und zur Migrationsdebatte von 2015. Das Projekt enthält drei vollständige Spiellevel mit identischer Memory-Logik.

Kurzbeschreibung:
Volldigitales Memory-Spiel zu *Reise der Verlorenen* mit 30 Figurenpaaren und GitHub Pages.

Website:
https://patrickfischerksa.github.io/reise-der-verlorenen/

Topics:
`memory-game`, `educational-game`, `history-education`, `theater`, `st-louis`, `github-pages`, `javascript`, `html`, `css`, `deutsch`

## Inhalt

- 30 Figurenpaare
- 30 zusätzliche Frage-Antwort-Paare zur Flüchtlingspolitik bis 1939
- 30 zusätzliche Frage-Antwort-Paare zur Migrationsdebatte von 2015
- Solo- oder lokaler Mehrspielermodus mit bis zu 4 Personen
- Filter nach Themenbereich
- Lernblick zum kurzen Einprägen des Decks
- Lupenfunktion für vollständige Kartentexte
- GitHub-Pages-taugliches, statisches Frontend ohne Build-Schritt

## Projektstruktur

- `index.html` enthält die Oberfläche
- `styles.css` enthält Layout und Karten-Design
- `cards.js` enthält alle Namen- und Beschreibungspaare
- `app.js` enthält Spielmechanik, Statistik und Mehrspielerlogik

## Lokal starten

Da das Projekt rein statisch ist, reicht es, `index.html` im Browser zu öffnen.

Für eine lokale Vorschau mit Server funktioniert zum Beispiel:

```bash
python3 -m http.server 8000
```

Dann im Browser `http://localhost:8000` öffnen.

## Auf GitHub veröffentlichen

Empfohlener Repository-Name:

```text
reise-der-verlorenen
```

### Variante 1: GitHub Pages direkt aus dem Branch

1. Dieses Verzeichnis als eigenes Repository mit dem Namen `reise-der-verlorenen` anlegen.
2. Alle Dateien aus diesem Ordner in das Repo hochladen.
3. In GitHub unter `Settings` -> `Pages` als Quelle `Deploy from a branch` wählen.
4. Branch `main` und Ordner `/ (root)` auswählen.

### Variante 2: GitHub Actions

Im Ordner `.github/workflows/` liegt bereits ein einfacher Workflow für GitHub Pages. Wenn du ihn verwendest:

1. Das Projekt als eigenes Repository hochladen.
2. Unter `Settings` -> `Pages` die Quelle auf `GitHub Actions` stellen.
3. Nach dem Push wird die Seite automatisch gebaut und veröffentlicht.

## Hinweise zur Didaktik

- Beschreibungen wurden bewusst gekürzt und in Stichwortform überführt.
- Die Kürzungen erhalten die jeweilige Rolle und Funktion der Figuren.
- Das Spiel eignet sich für Wiederholung, Figurenlernen und szenische Orientierung.
