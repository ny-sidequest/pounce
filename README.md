# Pounce: leap before you look

A daily trivia game prototype with a story: *every night, a masked thief creeps across the rooftops. Nobody sees it. Except your cat.*
Crack the clues to pick up its trail; each one brings the cat a roof closer. Pounce early and it is a long, risky leap: land it and you unmask the thief (the connect). Miss, and it is into the bins while the thief gets away.
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
- `js/game.js`, `results.js`, `app.js` screens; `scene.js` (six rooftops, the cat moves, the world stays put), `cat.js` + `thief.js` (pixel sprites), `home.js` (wanted posters), `art.js` (results header art), `pixel.js` (rect-based scenery), `fx.js`, `audio.js`, `store.js` support
- `data/puzzles.json` the 3 puzzles (answers are client-side in this prototype; production must check on a server)

## State machine (per puzzle)
`intro → question → break → question … → final → done`; `break|final → pounce → break|done`.
Chase state is derived from the saved state (`chasing`, `caught`, `on_foot`, `got_away`); the gap shown is 5.0 m through clue 1, then closes 1.0 m per clue, and equals the leap the available pounce is worth. Once the pounce is spent the pounce break is skipped (result shown ~1.2s, then the next clue); after a wrong pounce the cat follows on foot in the street.
Reload mid-question counts as a timeout; reload with the pounce box open counts as a wrong pounce.
Progress is saved under `pounce:v1:<id>`. Visit `?reset=1` to clear all saved data (dev only, not in the UI).

## Deploy to GitHub Pages
Push to GitHub, then Settings → Pages → Deploy from a branch → `main` / root.

To use pounce.io later: add a `CNAME` file containing `pounce.io` in the repo root, set the domain in Pages settings, and point DNS (A records to GitHub Pages IPs, or a CNAME for `www`).

## Feedback link
The footer link is `#feedback` in `js/app.js`; replace it with your Google Form URL.

## Characters, sequences and builds

- `js/sprites.js` frame-based sprite system; `js/sprite-cat.js` and `js/sprite-thief.js` generate every frame in code (view them all at `/sprites.html`).
- `js/sequences.js` every animated moment as a timeline of timed steps (tune the beats in `T` and each step's `dur`).
- `js/timer.js` the pausable question timer and the gate that holds it during sequences and cards (tested in `tests/timer.test.js`).
- **Cache-busting:** run `npm run stamp` before committing. It hashes the js/css/data files and rewrites `index.html` (versioned entry script and stylesheet, plus an import map so every module import carries `?v=<hash>`).
