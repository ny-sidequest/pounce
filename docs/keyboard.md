# Keyboard and viewport on phones

Problem: iOS Safari overlays the keyboard and scrolls the whole document; Android Chrome resizes the layout. Anything sized with
`100vh` / `100dvh` therefore scrolls on one of them, and inputs under 16 px make iOS zoom in.

What the game does (`js/game.js`, `css/styles.css`):

- **Viewport meta** has `interactive-widget=resizes-content` so Android resizes consistently.
- **The document is locked during play** (`html.playing { overflow: hidden; overscroll-behavior: none }`); home and results scroll normally.
  On phones the game root is `position: fixed; inset: 0 auto auto 0; width: 100%`.
- **Sized from `visualViewport`**, not CSS units: on `resize` and `scroll` (throttled with `requestAnimationFrame`) we set `--vvh` to
  `visualViewport.height`, translate the game root by `visualViewport.offsetTop`, and call `window.scrollTo(0, 0)` to undo any browser scroll.
  Without `visualViewport` we fall back to `window.innerHeight`.
- **No `scrollIntoView`**; every focus uses `focus({ preventScroll: true })`.
- **Inputs are 18 px** (>= 16 px, so no iOS zoom), with `autocomplete`, `autocapitalize`, `autocorrect`, `spellcheck` off and `enterkeyhint="go"`.
- **Compact tiers by visible height** (`data-h` on the game root, from `--vvh`): `full` >= 480, `mid` 380-479 (strip folded to a 24 px line,
  20 px question, bar beside the timer), `low` < 380 (no strip, 40 px bar, 18 px question clamped to 3 lines, no hint).
  A long clue also shrinks (down to 15 px) until the card fits. The pounce sheet follows the same tiers.
- When the keyboard closes `--vvh` grows back and the layout returns to full size; the scroll position is already 0, so nothing jumps.

Tested (Chrome, iframe resized to each visible height, longest clue in `data/puzzles.json`): 390x844/520, 375x667/400/340,
360x640/360/300, 412x915/560. Eyebrow, timer, whole question, input and GO were visible and `scrollTop` was 0 in every case.
Real-device note: emulation cannot reproduce iOS's own scroll-on-focus, which is why the scroll reset and the fixed root exist.
