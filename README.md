# Pounce: leap before you look

A daily trivia game prototype. Five clues, one hidden connect, one leap. A moonlit pixel-art rooftop world: the cat stalks the connect across the rooftops; each clue closes the gap, and pouncing is leaping it.
Static site, vanilla JS/CSS, no build step.

## Run locally
```
python3 -m http.server 8000     # then open http://localhost:8000
```
(It must be served over http; opening index.html as a file won't load the puzzle JSON.)

## Tests
```
node --test        # or: npm test
```
Note: on Node 22+ the literal `node --test tests/` treats the folder as a file; plain `node --test` auto-discovers `tests/*.test.js`.

## Layout
- `js/engine.js` pure logic (scoring, matching, state machine, titles, share text), tested in `tests/`
- `js/game.js`, `results.js`, `app.js` screens; `scene.js` (rooftop world + leap/fall animation), `cat.js` (pixel sprites), `pixel.js` (rect-based scenery), `fx.js`, `audio.js`, `store.js` support
- `data/puzzles.json` the 3 puzzles (answers are client-side in this prototype; production must check on a server)

## State machine (per puzzle)
`intro → question → break → question … → final → done`; `break|final → pounce → break|done`.
Once the pounce is spent the pounce break is skipped (result shown ~1.2s, then the next clue). The gap shown in the HUD always equals the leap you could make right now (6.0m before clue 1, 1.0m after clue 5).
Reload mid-question counts as a timeout; reload with the pounce box open counts as a wrong pounce.
Progress is saved under `pounce:v1:<id>`. Visit `?reset=1` to clear all saved data (dev only, not in the UI).

## Deploy to GitHub Pages
Push to GitHub, then Settings → Pages → Deploy from a branch → `main` / root.

To use pounce.io later: add a `CNAME` file containing `pounce.io` in the repo root, set the domain in Pages settings, and point DNS (A records to GitHub Pages IPs, or a CNAME for `www`).

## Feedback link
The footer link is `#feedback` in `js/app.js`; replace it with your Google Form URL.
