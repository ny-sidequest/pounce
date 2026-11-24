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
- `js/game.js`, `results.js`, `app.js` screens; `scene.js` (six rooftops, the cat moves, the world stays put), `rig-cat.js` + `rig-thief.js` (the rigged vector characters), `motion.js` (60fps tween runtime), `world.js` (vector scenery), `portraits.js` (posed rigs as inline SVG), `home.js` (wanted posters), `art.js` (results header art), `rain.js`, `fx.js`, `audio.js`, `store.js` support
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

- The characters are rigged SVG: the cat (body, head, 2 ears, 4 legs, 3 tail segments, a neck band with knot and two verlet-physics ribbon tails) and the thief (coat, head, hat, mask, 2 arms, 2 legs, sack). Every pose and animation is on `/rigs.html`. Everything moves by code at 60fps (`js/motion.js`), pauses in hidden tabs, and respects `prefers-reduced-motion` (no leaps, still scarf).
- `/vector.html` is the original style spike (catch + fall loop, leap strip).
- Type: Fredoka (UI), Inter (long text); Pixelify Sans only for the logo, the neon sign and CLATTER!.
- `js/sequences.js` every animated moment as a timeline of timed steps (tune the beats in `T` and each step's `dur`).
- `js/timer.js` the pausable question timer and the gate that holds it during sequences and cards (tested in `tests/timer.test.js`).
- **Cache-busting:** run `npm run stamp` before committing. It hashes the js/css/data files and rewrites `index.html` (versioned entry script and stylesheet, plus an import map so every module import carries `?v=<hash>`).
