// "Pounce", hi-bit: a 64x48 black cat. Same silhouette, colours, pink scarf as the 32x24 original, at twice the
// resolution: anti-aliased curves, 3 tones of black-purple for form, a 1px moon rim, 4x4 eyes with a highlight dot,
// folded scarf (light + dark pink), whisker hints and pink inner ears.
import { Grid, defineSprite } from './sprites.js';
import { Hi, downsample, shade } from './hires.js';

export const CAT_HI_PALETTE = {
  '.': null,
  k: '#05040C', b: '#0D0A1C', h: '#181330', H: '#262050',     // black-purple: shadow, mid, light, highlight
  a: '#1A1636',                                               // anti-alias tone on curved edges
  o: '#2B2650', m: '#6A66A0',                                 // rim: dark side / moon side
  e: '#FFB238', E: '#FFE9B0', f: '#B87A1C',                   // eyes, highlight dot, closed lid
  s: '#FF4F9A', S: '#C2306F', q: '#FF9CC8',                   // scarf: mid, dark fold, light fold
  w: '#F4E7C3', p: '#F4A6A0', i: '#B04A7A', v: '#8B86B8',     // cream, nose, inner ear, whiskers
  y: '#F2D13D', Y: '#B8962A',                                 // banana peel
  g: '#6B6896', G: '#4A4870', L: '#8B86B8',                   // bin
  n: '#B07A40', N: '#7A4E2A',                                 // cardboard
  j: '#2E4A9A', J: '#BFD6FF'                                  // sunglasses
};

const W = 32;   // old units (the final grid is 64 x 48)
const H = 24;

/* --------------------------------------------------------------- parts (old units) */
function eyesDraw(g, x, y, kind, phase = 0) {
  const L = x - 3;
  const R = x + 1;
  switch (kind) {
    case 'narrow':
    case 'half': g.rect(L, y, 2, 1, 'e').rect(R, y, 2, 1, 'e'); break;
    case 'closed': g.rect(L, y, 2, 1, 'f').rect(R, y, 2, 1, 'f'); break;
    case 'wide':
      g.rect(L - 1, y - 2, 3, 3, 'e').rect(R, y - 2, 3, 3, 'e');
      g.set(L, y - 1, 'k').set(R + 1, y - 1, 'k');
      g.set(L - 1, y - 2, 'E').set(R, y - 2, 'E');
      break;
    case 'bug':
      g.rect(L - 1, y - 3, 4, 4, 'w').rect(R, y - 3, 4, 4, 'w');
      g.set(L + 1, y - 1, 'k').set(R + 1, y - 1, 'k');
      break;
    case 'spiral': {
      const ring = [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 1]];
      [L - 1, R].forEach((ex) => {
        ring.forEach(([dx, dy], i) => { if (i !== phase % 8) g.set(ex + dx, y - 2 + dy, 'e'); });
        g.set(ex + 1, y - 1, 'k');
      });
      break;
    }
    case 'shades':
      g.rect(L - 1, y - 2, 4, 3, 'j').rect(R - 1, y - 2, 4, 3, 'j').set(x, y - 1, 'j');
      g.set(L, y - 2, 'J').set(R, y - 2, 'J');
      break;
    default: // open
      g.rect(L, y - 1, 2, 2, 'e').rect(R, y - 1, 2, 2, 'e');
      g.set(L, y - 1, 'E').set(R, y - 1, 'E');
  }
}

function head(g, x, y, { eyes = 'open', ears = 'up', twitch = 0, phase = 0 } = {}) {
  g.meta.head = [x, y];
  g.ellipse(x, y, 5, 5, 'k');
  if (ears === 'droop') {
    g.poly([[x - 5, y - 2], [x - 7, y - 5], [x - 2, y - 4]], 'k');
    g.poly([[x + 5, y - 2], [x + 7, y - 5], [x + 2, y - 4]], 'k');
  } else if (ears === 'back') {
    g.poly([[x - 5, y - 2], [x - 7, y - 6], [x - 1, y - 4]], 'k');
    g.poly([[x + 1, y - 4], [x + 4, y - 7], [x + 5, y - 2]], 'k');
    g.poly([[x - 4.4, y - 3], [x - 5.8, y - 5.2], [x - 1.8, y - 4]], 'i');
    g.poly([[x + 1.8, y - 4], [x + 3.8, y - 6], [x + 4.4, y - 3]], 'i');
  } else {
    g.poly([[x - 5, y - 2], [x - 4, y - 8], [x - 0.5, y - 4]], 'k');
    g.poly([[x + 0.5, y - 4], [x + 4, y - 8 + twitch], [x + 5, y - 2]], 'k');
    g.poly([[x - 4.1, y - 3], [x - 3.8, y - 6.4], [x - 1.3, y - 4]], 'i');   // inner ears
    g.poly([[x + 1.3, y - 4], [x + 3.8, y - 6.4 + twitch * 0.8], [x + 4.1, y - 3]], 'i');
  }
  eyesDraw(g, x, y, eyes, phase);
  g.set(x + 4, y + 2, 'p');
}

function scarf(g, nx, ny, { dir = 'down', wave = 0 } = {}) {
  g.rect(nx - 4, ny, 9, 2, 's').rect(nx - 4, ny + 2, 9, 1, 'S');
  if (dir === 'down') {
    g.line(nx - 2, ny + 3, nx - 2 + wave, ny + 9, 's', 2);
    g.line(nx - 2 + wave * 0.4, ny + 8.5, nx - 2 + wave, ny + 9.6, 'S', 2);
    g.line(nx + 2, ny + 3, nx + 2 - wave, ny + 8, 'S', 2);
  } else if (dir === 'back') {
    g.line(nx - 4, ny, nx - 13, ny + 1 + wave, 's', 2);
    g.line(nx - 4, ny + 2, nx - 11, ny + 4 - wave, 'S', 2);
  } else { // up: flapping
    g.line(nx - 3, ny, nx - 8, ny - 6 + wave, 's', 2);
    g.line(nx, ny, nx - 4, ny - 7, 'S', 2);
  }
}

const tailLine = (g, pts) => { for (let i = 0; i < pts.length - 1; i++) g.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 'k', 2); };

/* --------------------------------------------------------------- finishing pipeline */
function finish(hi) {
  const g = downsample(hi, 'a');
  // form shading: three tones of black-purple, light from the upper-left
  shade(g, ['k', 'b', 'h', 'H', 'a'], { base: 'k', ramp: [[0, 'H'], [2, 'h'], [5, 'b']] });
  // eye highlight: a single 1px dot at the top-left of each highlight cluster
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    if (g.d[y][x] === 'E' && (g.get(x - 1, y) === 'E' || g.get(x, y - 1) === 'E')) g.d[y][x] = 'e';
  }
  // scarf folds: a light fold along the top edge, dark folds across the tails
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    if (g.d[y][x] !== 's') continue;
    const up = g.get(x, y - 1);
    if (!'sSq'.includes(up) || up === '.') g.d[y][x] = 'q';
    else if ((x + y) % 8 === 0 && g.get(x, y + 1) === 's') g.d[y][x] = 'S';  // diagonal fold lines
  }
  // 1px moonlight rim around the body (moon side lighter)
  g.rim(['k', 'b', 'h', 'H', 'a', 'i'], 'm', 'o');
  // whisker hints
  if (hi.meta.head) {
    const [hx, hy] = hi.meta.head;
    const px = Math.round(hx * 2) + 10;
    const py = Math.round(hy * 2) + 3;
    [[0, 0], [1, 0], [2, -1], [3, -1], [4, -2], [0, 3], [1, 3], [2, 3], [3, 4], [4, 4]].forEach(([dx, dy]) => { if (g.get(px + dx, py + dy) === '.') g.set(px + dx, py + dy, 'v'); });
  }
  return g;
}

/* --------------------------------------------------------------- poses */
function sit({ tail = 0, eyes = 'open', ears = 'up', headDx = 0, headDy = 0, wave = 0, twitch = 0, scarfDir = 'down', extra } = {}) {
  const g = new Hi(W, H);
  const tails = [
    [[7, 21], [3, 21], [2, 17], [3, 13]],
    [[7, 21], [3, 21], [1.5, 18], [2.5, 14]],
    [[7, 21], [3, 22], [1, 19], [1.5, 15]],
    [[7, 21], [3, 22], [1, 19.5], [1, 16]],
    [[7, 21], [3, 21.5], [1.5, 18.5], [2, 15]],
    [[7, 21], [3, 21], [2, 18], [3, 14]]
  ];
  tailLine(g, tails[tail % tails.length]);
  g.ellipse(14, 16, 7, 6, 'k').ellipse(9, 17, 4, 5, 'k');
  g.line(17, 17, 17, 22, 'k', 2).line(21, 19, 21, 22, 'k', 2);
  head(g, 19 + headDx, 8 + headDy, { eyes, ears, twitch });
  scarf(g, 19 + headDx, 12 + headDy, { dir: scarfDir, wave });
  extra?.(g);
  return finish(g);
}

function crouch(f) {
  const g = new Hi(W, H);
  const w = [0, 1, 0.6, -0.4][f % 4];
  const tails = [[[4, 19], [1, 16], [2, 12]], [[4, 19], [0, 17], [0, 13]], [[4, 19], [1, 16], [1.5, 12]], [[4, 19], [2, 15], [3, 11]]];
  tailLine(g, tails[f % 4]);
  g.ellipse(14, 18, 9, 4, 'k').ellipse(6 + w, 16, 4, 5, 'k');
  g.line(19, 21, 26, 21, 'k', 2);
  head(g, 23, 16, { eyes: 'wide', ears: 'up' });
  scarf(g, 19, 19, { dir: 'back', wave: [0, 1, 0, -1][f % 4] });
  return finish(g);
}

/** hop key poses: 0 squash, 1 launch, 2 rising, 3 peak, 4 descending, 5 landing squash */
function hop(f) {
  if (f === 0) return crouch(0);
  const g = new Hi(W, H);
  const P = [null,
    { body: [13, 15], head: [22, 10], tail: [[6, 15], [2, 12], [1, 8]], front: [19, 16, 24, 18], back: [8, 18, 5, 21], sc: [18, 13, 1] },
    { body: [13.5, 13.5], head: [23, 9], tail: [[6, 13.5], [2, 11.5], [1, 7.5]], front: [19.5, 15, 25, 18], back: [8, 16.5, 4.5, 19.5], sc: [19, 12, 0] },
    { body: [14, 12], head: [24, 8], tail: [[6, 12], [2, 11], [1, 7]], front: [20, 15, 26, 18], back: [8, 15, 4, 18], sc: [20, 11, -1] },
    { body: [14, 13.5], head: [24, 10], tail: [[6, 13.5], [2, 12], [1, 8]], front: [20, 16, 27, 19], back: [8, 17, 4, 20], sc: [20, 12.5, 0] }
  ];
  if (f === 5) {
    tailLine(g, [[4, 19], [1, 16], [2, 12]]);
    g.ellipse(14, 19, 10, 3, 'k').line(5, 21, 2, 22, 'k', 2).line(24, 21, 28, 22, 'k', 2);
    head(g, 24, 17, { eyes: 'wide', ears: 'back' });
    scarf(g, 20, 20, { dir: 'back', wave: 0 });
    return finish(g);
  }
  const c = P[f];
  tailLine(g, c.tail);
  g.ellipse(c.body[0], c.body[1], 8, 4, 'k').line(...c.front, 'k', 2).line(...c.back, 'k', 2);
  head(g, c.head[0], c.head[1], { eyes: 'open', ears: 'back' });
  scarf(g, c.sc[0], c.sc[1], { dir: 'back', wave: c.sc[2] });
  return finish(g);
}

function leap(f) {
  const g = new Hi(W, H);
  const s = [0, 0.6, 1, 0.6, 0, 0.6][f % 6];
  const oy = [0, -0.4, -0.8, -0.8, -0.4, 0][f % 6];
  const Y = (y) => y + oy;
  g.line(5, Y(11), 1, Y(8 + s), 'k', 2);
  g.line(5, Y(14), 21, Y(12), 'k', 7);
  g.line(7, Y(17), 1, Y(19 + s), 'k', 2).line(9, Y(17), 2, Y(21 - s), 'k', 2);
  g.line(23, Y(15), 30, Y(15 + s), 'k', 2).line(21, Y(16), 28, Y(18 - s), 'k', 2);
  head(g, 26, Y(10), { eyes: 'wide', ears: 'back' });
  scarf(g, 22, Y(13), { dir: 'back', wave: [0, 1, 1.5, 0.5, -0.5, -1][f % 6] });
  return finish(g);
}

function land(f) {
  const g = new Hi(W, H);
  if (f === 0) {
    tailLine(g, [[4, 19], [1, 17], [2, 14]]);
    g.ellipse(14, 19, 10, 3, 'k').line(5, 21, 1, 22, 'k', 2).line(24, 21, 28, 22, 'k', 2);
    head(g, 23, 17, { eyes: 'wide', ears: 'back' });
    scarf(g, 19, 20, { dir: 'up', wave: 1 });
  } else if (f === 1) {
    tailLine(g, [[4, 19], [1, 16.5], [2, 13]]);
    g.ellipse(14, 18.5, 9.5, 3.5, 'k').ellipse(6, 17.5, 4, 4, 'k').line(19, 21, 25, 21, 'k', 2);
    head(g, 23, 16, { eyes: 'open', ears: 'back' });
    scarf(g, 19, 19, { dir: 'back', wave: 1 });
  } else {
    tailLine(g, [[4, 19], [1, 16], [2, 12]]);
    g.ellipse(14, 18, 9, 4, 'k').ellipse(6, 17, 4, 4, 'k').line(19, 21, 25, 21, 'k', 2);
    head(g, 23, 15, { eyes: 'open', ears: 'up' });
    scarf(g, 19, 18, { dir: 'back', wave: 0 });
  }
  return finish(g);
}

function swat(f) {
  const g = new Hi(W, H);
  tailLine(g, [[7, 21], [3, 21], [2, 17], [3, 13]]);
  g.ellipse(13, 16, 7, 6, 'k').ellipse(8, 17, 4, 5, 'k').line(16, 17, 16, 22, 'k', 2);
  if (f === 0) g.line(20, 16, 23, 9, 'k', 2);
  else if (f === 1) g.line(20, 15.5, 27, 11, 'k', 2.4);
  else if (f === 2) { g.line(20, 15, 30, 13, 'k', 3); g.set(31, 12, 'w').set(31, 14, 'w'); }
  else g.line(20, 16, 29, 19, 'k', 2);
  head(g, 20 + (f >= 1 && f <= 2 ? 1 : 0), 8, { eyes: 'narrow', ears: f === 2 ? 'back' : 'up' });
  scarf(g, 20, 12, { dir: f === 2 ? 'back' : 'down', wave: f % 2 });
  return finish(g);
}

function fall(f, eyes = 'wide') {
  const g = new Hi(W, H);
  const a = [0, 0.5, 1, 1, 0.5, 0][f % 6];
  g.line(12, 19, 9, 23 - a, 'k', 2).line(17, 19, 22, 23 - (1 - a), 'k', 2);
  g.line(11, 14, 5, 11 + a * 2, 'k', 2).line(19, 14, 26, 11 + (1 - a) * 2, 'k', 2);
  g.line(11, 20, 7, 19 + a, 'k', 2);
  g.ellipse(15, 15, 5, 6, 'k');
  head(g, 17, 8, { eyes, ears: 'back' });
  scarf(g, 17, 12, { dir: 'up', wave: a * 2 });
  g.glyph('!', 25, 1, 'w');
  return finish(g);
}

function bin(f, eyes = 'spiral') {
  const g = new Hi(W, H);
  const lid = [0, 1, 0, -1][f % 4];
  g.rect(3, 13, 24, 10, 'g');
  [7, 12, 17, 22].forEach((x) => g.rect(x, 15, 1, 7, 'G'));
  g.rect(2 + lid, 12, 26, 2, 'L');
  g.rect(13 + lid, 11, 4, 1, 'L');                                    // lid handle
  g.rect(8, 18, 2, 2, 'G');                                           // a dent
  const hy = [9, 8.5, 9, 9.5][f % 4];
  g.rect(8, 11, 3, 2, 'k').rect(20, 11, 3, 2, 'k');
  head(g, 15, hy, { eyes, ears: 'droop', phase: f * 2 });
  g.line(9, hy - 5, 16, hy - 6, 'y', 2).line(16, hy - 6, 19, hy - 4, 'Y', 1).line(9, hy - 5, 8, hy - 2, 'Y', 2);
  g.rect(11, 11, 9, 1, 's');
  const out = finish(g);
  return out;
}

function walk(f) {
  const g = new Hi(W, H);
  const d = [-2, -1, 1, 2, 1, -1][f % 6];
  const bob = [0, -0.3, -0.5, 0, -0.3, -0.5][f % 6];
  tailLine(g, [[7, 12 + bob], [3, 9 + bob], [3, 5 + bob]]);
  g.line(21, 16, 21 + d, 22, 'k', 2).line(19, 16, 19 - d, 22, 'k', 2);
  g.line(9, 16, 9 - d, 22, 'k', 2).line(11, 16, 11 + d, 22, 'k', 2);
  g.ellipse(14, 14 + bob, 8, 4, 'k');
  head(g, 24, 11 + bob, { eyes: 'open', ears: 'up' });
  scarf(g, 19, 13 + bob, { dir: 'back', wave: [0, 1, 1, 0, -1, -1][f % 6] });
  return finish(g);
}

function titleBox() {
  const g = new Hi(W, H);
  head(g, 16, 8, { eyes: 'open', ears: 'up' });
  scarf(g, 16, 12, { dir: 'down' });
  const out = finish(g);
  // the box is drawn crisp on the final grid
  out.rect(4, 26, 56, 20, 'n').rect(4, 26, 56, 4, 'N').rect(28, 26, 8, 20, 'w');
  out.poly([[4, 26], [0, 20], [14, 26]], 'N').poly([[60, 26], [64, 20], [50, 26]], 'N');
  out.rim(['n', 'N'], 'm', 'o');
  return out;
}

function scaredy() {
  const g = new Hi(W, H);
  g.ellipse(5, 12, 3, 5, 'k');
  g.ellipse(14, 15, 8, 7, 'k');
  [9, 10.5, 12, 13.5, 15, 16.5, 18, 19.5].forEach((x, i) => g.poly([[x - 0.6, 8.5], [x, 6 - (i % 2)], [x + 0.6, 8.5]], 'k'));
  g.line(8, 19, 7, 22, 'k', 2).line(20, 19, 21, 22, 'k', 2).line(12, 20, 12, 22, 'k', 2).line(17, 20, 17, 22, 'k', 2);
  head(g, 23, 11, { eyes: 'wide', ears: 'back' });
  scarf(g, 20, 14, { dir: 'up', wave: 1 });
  return finish(g);
}

const mk = (n, fn) => () => Array.from({ length: n }, (_, i) => fn(i));

/* --------------------------------------------------------------- sprite */
export const CAT_HI = defineSprite('cat-hi', [64, 48], CAT_HI_PALETTE, {
  idle: { fps: 5, loop: true, frames: mk(6, (i) => sit({ tail: i, wave: [0, 0.7, 1, 0.7, 0, -0.7][i] })) },
  idle_blink: { fps: 5, loop: true, frames: mk(6, (i) => sit({ tail: i, wave: [0, 0.7, 1, 0.7, 0, -0.7][i], eyes: 'closed' })) },
  alert: { fps: 6, loop: true, frames: mk(2, (i) => sit({ eyes: 'narrow', headDy: -1, twitch: i * 2, wave: i })) },
  hop: { fps: 14, loop: false, frames: mk(6, hop) },
  crouch: { fps: 12, loop: true, frames: mk(4, crouch) },
  leap: { fps: 14, loop: true, frames: mk(6, leap) },
  land: { fps: 10, loop: false, frames: mk(3, land) },
  swat: { fps: 12, loop: false, frames: mk(4, swat) },
  sit_smug: { fps: 2, loop: true, frames: mk(2, (i) => sit({ eyes: 'half', tail: [0, 3][i], wave: i, ears: 'back' })) },
  fall: { fps: 12, loop: true, frames: mk(6, (i) => fall(i)) },
  realize: { fps: 1, loop: false, frames: () => [fall(0, 'bug')] },
  droop: { fps: 1, loop: false, frames: () => [sit({ eyes: 'closed', ears: 'droop', headDy: 1 })] },
  bin: { fps: 4, loop: true, frames: mk(4, (i) => bin(i)) },
  walk: { fps: 10, loop: true, frames: mk(6, walk) },
  title_psychic: { fps: 1, loop: false, frames: () => [sit({ eyes: 'wide', extra: (g) => { g.glyph('*', 2, 2, 'E').glyph('*', 27, 1, 'E').glyph('*', 29, 12, 'e').glyph('*', 1, 10, 'e'); } })] },
  title_genius: { fps: 1, loop: false, frames: () => [sit({ eyes: 'shades' })] },
  title_curious: { fps: 1, loop: false, frames: () => [sit({ eyes: 'wide', headDx: 1, twitch: 3, extra: (g) => { g.glyph('?', 27, 0, 'e'); } })] },
  title_sleepy: { fps: 1, loop: false, frames: () => [sit({ eyes: 'closed', ears: 'back', extra: (g) => { g.glyph('z', 26, 2, 'w').glyph('z', 29, 0, 'w'); } })] },
  title_box: { fps: 1, loop: false, frames: () => [titleBox()] },
  title_bin_diver: { fps: 1, loop: false, frames: () => [bin(0)] },
  title_scaredy: { fps: 1, loop: false, frames: () => [scaredy()] }
});
