// "Pounce": a black cat with a moonlight rim, amber eyes and a pink scarf. 32x24 base grid, facing right.
// Frames are generated in code (ellipses / lines / polygons), then outlined with a 1px moon rim so the
// black body reads against the night. The scarf is the motion cue: it trails, flaps and sways.
import { Grid, defineSprite } from './sprites.js';

export const CAT_PALETTE = {
  '.': null,
  k: '#05040C',                   // body
  o: '#2B2650', m: '#6A66A0',     // rim: dark side / moon side
  e: '#FFB238', E: '#FFE9B0', f: '#B87A1C', // eyes, highlight, closed lid
  s: '#FF4F9A', S: '#C2306F',     // scarf + shade
  w: '#F4E7C3', p: '#F4A6A0',     // cream (marks, "!"), nose
  y: '#F2D13D', Y: '#B8962A',     // banana peel
  g: '#6B6896', G: '#4A4870', L: '#8B86B8', // bin
  n: '#B07A40', N: '#7A4E2A',     // cardboard
  j: '#2E4A9A', J: '#BFD6FF'      // sunglasses
};

const W = 32;
const H = 24;

/* --------------------------------------------------------------- parts */
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
  g.ellipse(x, y, 5, 5, 'k');
  if (ears === 'droop') {
    g.poly([[x - 5, y - 2], [x - 7, y - 5], [x - 2, y - 4]], 'k');
    g.poly([[x + 5, y - 2], [x + 7, y - 5], [x + 2, y - 4]], 'k');
  } else if (ears === 'back') {
    g.poly([[x - 5, y - 2], [x - 7, y - 6], [x - 1, y - 4]], 'k');
    g.poly([[x + 1, y - 4], [x + 4, y - 7], [x + 5, y - 2]], 'k');
  } else {
    g.poly([[x - 5, y - 2], [x - 4, y - 8], [x - 0.5, y - 4]], 'k');
    g.poly([[x + 0.5, y - 4], [x + 4, y - 8 + twitch], [x + 5, y - 2]], 'k');
  }
  eyesDraw(g, x, y, eyes, phase);
  g.set(x + 4, y + 2, 'p');
}

function scarf(g, nx, ny, { dir = 'down', wave = 0 } = {}) {
  g.rect(nx - 4, ny, 9, 2, 's').rect(nx - 4, ny + 2, 9, 1, 'S');
  if (dir === 'down') {
    g.line(nx - 2, ny + 3, nx - 2 + wave, ny + 9, 's', 2);
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
const finish = (g) => g.rim(['k']);

/* --------------------------------------------------------------- poses */
function sit({ tail = 0, eyes = 'open', ears = 'up', headDx = 0, headDy = 0, wave = 0, twitch = 0, scarfDir = 'down', extra } = {}) {
  const g = new Grid(W, H);
  const tails = [
    [[7, 21], [3, 21], [2, 17], [3, 13]],
    [[7, 21], [3, 21], [1, 18], [2, 14]],
    [[7, 21], [3, 22], [1, 19], [1, 15]],
    [[7, 21], [3, 21], [2, 18], [3, 14]]
  ];
  tailLine(g, tails[tail]);
  g.ellipse(14, 16, 7, 6, 'k').ellipse(9, 17, 4, 5, 'k');
  g.line(17, 17, 17, 22, 'k', 2).line(21, 19, 21, 22, 'k', 2);
  head(g, 19 + headDx, 8 + headDy, { eyes, ears, twitch });
  scarf(g, 19 + headDx, 12 + headDy, { dir: scarfDir, wave });
  extra?.(g);
  return finish(g);
}

function crouch(f) {
  const g = new Grid(W, H);
  const w = [0, 1, 0][f];
  const tails = [[[4, 19], [1, 16], [2, 12]], [[4, 19], [0, 17], [0, 13]], [[4, 19], [2, 15], [3, 11]]];
  tailLine(g, tails[f]);
  g.ellipse(14, 18, 9, 4, 'k').ellipse(6 + w, 16, 4, 5, 'k');
  g.line(19, 21, 26, 21, 'k', 2);
  head(g, 23, 16, { eyes: 'wide', ears: 'up' });
  scarf(g, 19, 19, { dir: 'back', wave: f % 2 });
  return finish(g);
}

function hop(f) {
  const g = new Grid(W, H);
  if (f === 0) return crouch(0);
  if (f === 1) {
    tailLine(g, [[6, 15], [2, 12], [1, 8]]);
    g.ellipse(13, 15, 8, 4, 'k').line(19, 16, 24, 18, 'k', 2).line(8, 18, 5, 21, 'k', 2);
    head(g, 22, 10, { eyes: 'open', ears: 'back' });
    scarf(g, 18, 13, { dir: 'back', wave: 1 });
  } else if (f === 2) {
    tailLine(g, [[6, 12], [2, 11], [1, 7]]);
    g.ellipse(14, 12, 8, 4, 'k').line(20, 15, 26, 18, 'k', 2).line(8, 15, 4, 18, 'k', 2);
    head(g, 24, 8, { eyes: 'open', ears: 'back' });
    scarf(g, 20, 11, { dir: 'back', wave: -1 });
  } else {
    tailLine(g, [[4, 19], [1, 16], [2, 12]]);
    g.ellipse(14, 19, 10, 3, 'k').line(5, 21, 2, 22, 'k', 2).line(24, 21, 28, 22, 'k', 2);
    head(g, 24, 17, { eyes: 'wide', ears: 'back' });
    scarf(g, 20, 20, { dir: 'back', wave: 0 });
  }
  return finish(g);
}

function leap(f) {
  const g = new Grid(W, H);
  const s = [0, 1, 0, 1][f];
  g.line(5, 11, 1, 8 + s, 'k', 2);
  g.line(5, 14, 21, 12, 'k', 7);
  g.line(7, 17, 1, 19 + s, 'k', 2).line(9, 17, 2, 21 - s, 'k', 2);
  g.line(23, 15, 30, 15 + s, 'k', 2).line(21, 16, 28, 18 - s, 'k', 2);
  head(g, 26, 10, { eyes: 'wide', ears: 'back' });
  scarf(g, 22, 13, { dir: 'back', wave: [0, 1, 0, -1][f] });
  return finish(g);
}

function land(f) {
  const g = new Grid(W, H);
  if (f === 0) {
    tailLine(g, [[4, 19], [1, 17], [2, 14]]);
    g.ellipse(14, 19, 10, 3, 'k').line(5, 21, 1, 22, 'k', 2).line(24, 21, 28, 22, 'k', 2);
    head(g, 23, 17, { eyes: 'wide', ears: 'back' });
    scarf(g, 19, 20, { dir: 'up', wave: 1 });
  } else {
    tailLine(g, [[4, 19], [1, 16], [2, 12]]);
    g.ellipse(14, 18, 9, 4, 'k').ellipse(6, 17, 4, 4, 'k').line(19, 21, 25, 21, 'k', 2);
    head(g, 23, 15, { eyes: 'open', ears: 'up' });
    scarf(g, 19, 18, { dir: 'back', wave: 0 });
  }
  return finish(g);
}

function swat(f) {
  const g = new Grid(W, H);
  tailLine(g, [[7, 21], [3, 21], [2, 17], [3, 13]]);
  g.ellipse(13, 16, 7, 6, 'k').ellipse(8, 17, 4, 5, 'k').line(16, 17, 16, 22, 'k', 2);
  if (f === 0) g.line(20, 16, 23, 9, 'k', 2);
  else if (f === 1) { g.line(20, 15, 30, 13, 'k', 3); g.set(31, 12, 'w').set(31, 14, 'w'); }
  else g.line(20, 16, 29, 19, 'k', 2);
  head(g, 20 + (f === 1 ? 1 : 0), 8, { eyes: 'narrow', ears: f === 1 ? 'back' : 'up' });
  scarf(g, 20, 12, { dir: f === 1 ? 'back' : 'down', wave: f % 2 });
  return finish(g);
}

function fall(f, eyes = 'wide') {
  const g = new Grid(W, H);
  const a = f % 2;
  g.line(12, 19, 9, 23 - a, 'k', 2).line(17, 19, 22, 23 - (1 - a), 'k', 2);   // back legs
  g.line(11, 14, 5, 11 + a * 2, 'k', 2).line(19, 14, 26, 11 + (1 - a) * 2, 'k', 2); // arms flailing
  g.line(11, 20, 7, 19 + a, 'k', 2);                                             // tail
  g.ellipse(15, 15, 5, 6, 'k');
  head(g, 17, 8, { eyes, ears: 'back' });
  scarf(g, 17, 12, { dir: 'up', wave: a * 2 });
  g.glyph('!', 25, 1, 'w');
  return finish(g);
}

function bin(f, eyes = 'spiral') {
  const g = new Grid(W, H);
  const lid = [0, 1, -1][f];
  g.rect(3, 13, 24, 10, 'g');
  [7, 12, 17, 22].forEach((x) => g.rect(x, 15, 1, 7, 'G'));
  g.rect(2 + lid, 12, 26, 2, 'L');
  const hy = [9, 8, 9][f];
  g.rect(8, 11, 3, 2, 'k').rect(20, 11, 3, 2, 'k');                  // paws on the rim
  head(g, 15, hy, { eyes, ears: 'droop', phase: f * 3 });
  g.line(9, hy - 5, 16, hy - 6, 'y', 2).line(16, hy - 6, 19, hy - 4, 'Y', 1).line(9, hy - 5, 8, hy - 2, 'Y', 2); // banana peel
  g.rect(11, 11, 9, 1, 's');                                        // scarf peeking over the rim
  return g.rim(['k', 'g', 'L']);
}

function walk(f) {
  const g = new Grid(W, H);
  const d = [-2, 0, 2, 0][f];
  tailLine(g, [[7, 12], [3, 9], [3, 5]]);
  g.line(21, 16, 21 + d, 22, 'k', 2).line(19, 16, 19 - d, 22, 'k', 2);
  g.line(9, 16, 9 - d, 22, 'k', 2).line(11, 16, 11 + d, 22, 'k', 2);
  g.ellipse(14, 14, 8, 4, 'k');
  head(g, 24, 11, { eyes: 'open', ears: 'up' });
  scarf(g, 19, 13, { dir: 'back', wave: f % 2 });
  return finish(g);
}

/* --------------------------------------------------------------- title poses */
const titleSit = (opts, extra) => sit({ ...opts, extra });

function titleBox() {
  const g = new Grid(W, H);
  head(g, 16, 8, { eyes: 'open', ears: 'up' });
  scarf(g, 16, 12, { dir: 'down' });
  g.rect(2, 13, 28, 10, 'n').rect(2, 13, 28, 2, 'N').rect(14, 13, 4, 10, 'w');
  g.poly([[2, 13], [0, 10], [7, 13]], 'N').poly([[30, 13], [32, 10], [25, 13]], 'N');
  return g.rim(['k', 'n', 'N']);
}

function scaredy() {
  const g = new Grid(W, H);
  g.ellipse(5, 12, 3, 5, 'k');
  g.ellipse(14, 15, 8, 7, 'k');
  [9, 11, 13, 15, 17, 19].forEach((x, i) => g.set(x, 6 - (i % 2), 'k'));
  g.line(8, 19, 7, 22, 'k', 2).line(20, 19, 21, 22, 'k', 2).line(12, 20, 12, 22, 'k', 2).line(17, 20, 17, 22, 'k', 2);
  head(g, 23, 11, { eyes: 'wide', ears: 'back' });
  scarf(g, 20, 14, { dir: 'up', wave: 1 });
  return finish(g);
}

/* --------------------------------------------------------------- sprite */
export const CAT = defineSprite('cat', [W, H], CAT_PALETTE, {
  idle: { fps: 4, loop: true, frames: [0, 1, 2, 3].map((i) => sit({ tail: i, wave: [0, 1, 0, -1][i] })) },
  idle_blink: { fps: 4, loop: true, frames: [0, 1, 2, 3].map((i) => sit({ tail: i, wave: [0, 1, 0, -1][i], eyes: 'closed' })) },
  alert: { fps: 6, loop: true, frames: [0, 1].map((i) => sit({ eyes: 'narrow', headDy: -1, twitch: i * 2, wave: i })) },
  hop: { fps: 10, loop: false, frames: [0, 1, 2, 3].map(hop) },
  crouch: { fps: 10, loop: true, frames: [0, 1, 2].map(crouch) },
  leap: { fps: 12, loop: true, frames: [0, 1, 2, 3].map(leap) },
  land: { fps: 8, loop: false, frames: [0, 1].map(land) },
  swat: { fps: 10, loop: false, frames: [0, 1, 2].map(swat) },
  sit_smug: { fps: 2, loop: true, frames: [0, 1].map((i) => sit({ eyes: 'half', tail: [0, 2][i], wave: i, ears: 'back' })) },
  fall: { fps: 10, loop: true, frames: [0, 1, 2, 3].map((i) => fall(i)) },
  realize: { fps: 1, loop: false, frames: [fall(0, 'bug')] },
  droop: { fps: 1, loop: false, frames: [sit({ eyes: 'closed', ears: 'droop', headDy: 1 })] },
  bin: { fps: 4, loop: true, frames: [0, 1, 2].map((i) => bin(i)) },
  walk: { fps: 8, loop: true, frames: [0, 1, 2, 3].map(walk) },
  // title poses (single frames)
  title_psychic: { fps: 1, loop: false, frames: [titleSit({ eyes: 'wide' }, (g) => { g.glyph('*', 2, 2, 'E').glyph('*', 27, 1, 'E').glyph('*', 29, 12, 'e').glyph('*', 1, 10, 'e'); })] },
  title_genius: { fps: 1, loop: false, frames: [titleSit({ eyes: 'shades' })] },
  title_curious: { fps: 1, loop: false, frames: [titleSit({ eyes: 'wide', headDx: 1, twitch: 3 }, (g) => { g.glyph('?', 27, 0, 'e'); })] },
  title_sleepy: { fps: 1, loop: false, frames: [titleSit({ eyes: 'closed', ears: 'back' }, (g) => { g.glyph('z', 26, 2, 'w').glyph('z', 29, 0, 'w'); })] },
  title_box: { fps: 1, loop: false, frames: [titleBox()] },
  title_bin_diver: { fps: 1, loop: false, frames: [bin(0)] },
  title_scaredy: { fps: 1, loop: false, frames: [scaredy()] }
});
