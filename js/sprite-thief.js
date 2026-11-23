// The thief: 28x44 base grid, facing right (away from the cat; its sack faces the cat).
// A deep purple coat with the collar up, a wide-brimmed hat, a cream mask band over two eye-holes on a dark face,
// and a sack over one shoulder that GLOWS amber with the "?" stitched on it. The thief is clearly lighter than the
// night sky (lit purple + a light rim) and clearly different from the black cat.
import { Grid, defineSprite } from './sprites.js';

export const THIEF_PALETTE = {
  '.': null,
  c: '#3B2A6B', C: '#24194A',      // coat + shade
  h: '#1A1530', H: '#5A4A9C',      // hat + band
  f: '#1E1630',                    // dark face
  w: '#F4E7C3', d: '#05040C', x: '#FFFFFF', // mask band, eye holes, glint
  a: '#FFB238', A: '#C27C1C', q: '#6B3E0A', e: '#FFB238', E: '#FFE9B0', // sack, shade, stitched "?", loot glyph
  p: '#FF4F9A', P: '#C2306F',      // pink yarn (matches the scarf)
  s: '#D9C9B0', S: '#A8967C',      // skin
  B: '#0E0A1E',                    // boots
  m: '#8A7CD0', o: '#1A1238'       // rim: moon side / shade side
};

const W = 28;
const H = 44;
const BODY = ['c', 'C', 'h', 'H', 'f', 'w', 's', 'B', 'a', 'A', 'p', 'P'];

function thief(o = {}) {
  const {
    dx = 0, dy = 0, lean = 0, hx = 0, hy = 0, face = 'R', eyes = 'open', mask = true, hatDx = 0, hatDy = 0,
    armL = 'down', armR = 'down', legs = 'stand', sackDy = 0, noSack = false, flap = false, mouth = 'none', top = 15,
    boots, hatOff = false, yarn = false, extra
  } = o;
  const g = new Grid(W, H);
  const X = (x) => x + dx;
  const Y = (y) => y + dy;

  // --- the sack: hangs on the back (facing the cat), fully visible beside the coat, with the "?" stitched on
  if (!noSack) {
    g.ellipse(X(4), Y(26 + sackDy), 4, 7, 'A');
    g.ellipse(X(3), Y(25 + sackDy), 3, 6, 'a');
    g.glyph('?', X(2), Y(23 + sackDy), 'q');
    g.rect(X(2), Y(19 + sackDy), 4, 2, 'A');
    g.line(X(11), Y(top), X(5), Y(19 + sackDy), 'C', 1);
  }
  // --- coat flap (running)
  if (flap) g.poly([[X(9), Y(26)], [X(2), Y(30)], [X(3), Y(40)], [X(8), Y(40)]], 'C');
  // --- boots
  const bs = boots || ({
    stand: [[9, 40], [17, 40]], a: [[9, 38], [17, 40]], b: [[9, 40], [17, 38]], sit: [[11, 41], [18, 41]]
  })[legs] || [[9, 40], [17, 40]];
  bs.forEach(([bx, by]) => g.rect(X(bx), Y(by), legs === 'sit' ? 8 : 5, legs === 'sit' ? 3 : 4, 'B'));
  // --- torso: a long, slightly hunched coat
  g.poly([[X(10 + lean), Y(top)], [X(21 + lean), Y(top)], [X(23), Y(28)], [X(25), Y(40)], [X(6), Y(40)], [X(8), Y(28)]], 'c');
  g.poly([[X(18 + lean), Y(top)], [X(21 + lean), Y(top)], [X(25), Y(40)], [X(20), Y(40)]], 'C');
  g.rect(X(6), Y(38), 19, 2, 'C');
  g.line(X(14), Y(top + 3), X(14), Y(38), 'C', 1);
  if (yarn) {
    [8, 14].forEach((k) => { g.rect(X(7), Y(top + k), 17, 2, 'p').rect(X(7), Y(top + k + 2), 17, 1, 'P'); });
    g.rect(X(20), Y(top + 6), 3, 3, 'p').rect(X(21), Y(top + 9), 2, 4, 'P'); // the knot and a loose end
  }
  // --- arms (hands in skin tone so the action reads)
  const arm = (side, kind) => {
    const sx = side === 'L' ? 10 + lean : 21 + lean;
    const ex = side === 'L' ? 8 : 24;
    const hand = (x, y) => g.rect(X(x), Y(y), 3, 3, 's');
    if (kind === 'down') { g.line(X(sx), Y(top + 2), X(ex), Y(top + 15), 'c', 3); hand(ex - 1, top + 15); }
    else if (kind === 'up') { g.line(X(sx), Y(top + 2), X(side === 'L' ? 4 : 25), Y(top - 8), 'c', 3); hand(side === 'L' ? 3 : 24, top - 11); }
    else if (kind === 'half') { g.line(X(sx), Y(top + 2), X(ex + 1), Y(top - 3), 'c', 3); hand(ex, top - 6); }
    else if (kind === 'tip') { g.line(X(sx), Y(top + 2), X(22), Y(8), 'c', 3); hand(20, 5); }
    else if (kind === 'flail') { g.line(X(sx), Y(top + 2), X(side === 'L' ? 3 : 27), Y(top + 5), 'c', 3); hand(side === 'L' ? 2 : 25, top + 4); }
  };
  arm('L', armL);
  arm('R', armR);
  // --- collar up, slightly hunched
  g.poly([[X(8 + lean + hx), Y(8 + hy)], [X(11 + hx), Y(10 + hy)], [X(11 + hx), Y(top + 2)], [X(8 + lean), Y(top + 2)]], 'c');
  g.poly([[X(22 + lean + hx), Y(8 + hy)], [X(19 + hx), Y(10 + hy)], [X(19 + hx), Y(top + 2)], [X(22 + lean), Y(top + 2)]], 'c');
  g.line(X(11 + hx), Y(11 + hy), X(11 + hx), Y(top + 1), 'C', 1).line(X(19 + hx), Y(11 + hy), X(19 + hx), Y(top + 1), 'C', 1);
  // --- head: dark face with a cream mask band, or the bare face once unmasked
  const fx = X(10 + hx);
  const fy = Y(8 + hy);
  if (mask) {
    g.rect(fx, fy, 10, 8, 'f').rect(fx, fy + 2, 10, 3, 'w');
    const sh = face === 'R' ? 1 : face === 'L' ? -1 : 0;
    const eh = eyes === 'wide' ? 2 : 1;
    g.rect(fx + 2 + sh, fy + 3, 2, eh, 'd').rect(fx + 6 + sh, fy + 3, 2, eh, 'd');
    if (eyes !== 'narrow') g.set(fx + (face === 'L' ? 2 : 3) + sh, fy + 3, 'x').set(fx + (face === 'L' ? 6 : 7) + sh, fy + 3, 'x');
    if (eyes === 'narrow') { g.rect(fx + 2 + sh, fy + 2, 2, 1, 'w'); g.rect(fx + 6 + sh, fy + 2, 2, 1, 'w'); }
  } else {
    g.rect(fx, fy, 10, 8, 's').rect(fx, fy + 7, 10, 1, 'S');
    g.rect(fx + 2, fy + 2, 3, 3, 'x').rect(fx + 6, fy + 2, 3, 3, 'x');
    g.set(fx + 3, fy + 3, 'd').set(fx + 7, fy + 3, 'd');
    if (mouth === 'open') g.rect(fx + 4, fy + 5, 3, 2, 'd');
    else if (mouth === 'frown') { g.rect(fx + 3, fy + 6, 4, 1, 'd'); g.set(fx + 2, fy + 7, 'd').set(fx + 7, fy + 7, 'd'); g.line(fx + 1, fy + 1, fx + 4, fy + 2, 'd', 1).line(fx + 9, fy + 1, fx + 6, fy + 2, 'd', 1); }
    else g.rect(fx + 4, fy + 6, 3, 1, 'd');
  }
  // --- hat
  if (!hatOff) {
    const hxp = X(hx + hatDx);
    const hyp = Y(hy + hatDy);
    g.rect(hxp + 9, hyp + 1, 12, 5, 'h').rect(hxp + 9, hyp + 4, 12, 1, 'H');
    g.rect(hxp + 5, hyp + 6, 20, 2, 'h').set(hxp + 5, hyp + 8, 'h').set(hxp + 24, hyp + 8, 'h');
  }
  extra?.(g);
  return g.rim(BODY, 'm', 'o');
}

/* --------------------------------------------------------------- animations */
const sneak = (f) => thief({ hx: 1, dy: [0, -1, 0, -1][f], legs: ['stand', 'a', 'stand', 'b'][f], sackDy: [0, 1, 0, 1][f] });

const glance = (f) => thief([
  { hx: 0, face: 'mid', eyes: 'wide' },
  { hx: -3, face: 'L', eyes: 'wide', hatDx: -1 },
  { hx: -1, face: 'mid' }
][f]);

const spooked = (f) => thief({ dy: [-2, -1][f], hy: 0, hatDy: [-2, -1][f], armL: 'up', armR: 'up', eyes: 'wide', legs: f ? 'stand' : 'a', hx: 1 });

const stagger = (f) => thief({
  dx: [1, 2, 1][f], lean: [2, 3, 1][f], hx: [1, 2, 1][f], hatDy: [-1, 0, -1][f], hatOff: f === 1,
  armL: 'flail', armR: 'up', eyes: 'wide', legs: ['a', 'b', 'a'][f], sackDy: [-1, 2, 0][f],
  extra: f === 1 ? (g) => { g.rect(19, 0, 8, 1, 'h').rect(21, -0, 4, 1, 'H'); g.rim(['h', 'H']); } : undefined
});

const sackDrop = (f) => thief({
  noSack: true, hx: 1, armL: 'down', armR: 'down', extra: (g) => {
    g.ellipse(5, 40, 6, 3, 'A').ellipse(5, 39, 5, 2, 'a').glyph('?', 4, 36, 'q');
    if (f === 1) g.glyph('?', 4, 27, 'e');
  }
});

const unmasked = (f) => thief({ mask: false, hx: 1, hatDx: 2, hatDy: -1, eyes: 'wide', mouth: f ? 'none' : 'open', armL: f ? 'down' : 'half', armR: 'down' });

const tied = (f) => thief({
  mask: false, mouth: 'frown', top: 24, hy: 9, hx: 0, hatDx: 1, hatDy: f ? 0 : -1, legs: 'sit', sackDy: 3, armL: 'down', armR: 'down', yarn: true,
  extra: undefined
});

const hatTip = (f) => thief({ hx: 1, face: 'R', eyes: f === 1 ? 'narrow' : 'open', armR: ['half', 'tip', 'tip'][f], hatDy: [0, -3, -1][f], hatDx: [0, 1, 0][f] });

const run = (f) => {
  const s = [-4, 0, 4, 0][f];
  return thief({
    dx: 2, lean: 3, hx: 1, flap: true, armL: f % 2 ? 'up' : 'down', armR: f % 2 ? 'down' : 'up', sackDy: [0, -1, 0, -1][f],
    boots: [[9 + s, f === 1 ? 38 : 40], [17 - s, f === 3 ? 38 : 40]]
  });
};

export const THIEF = defineSprite('thief', [W, H], THIEF_PALETTE, {
  sneak: { fps: 5, loop: true, frames: [0, 1, 2, 3].map(sneak) },
  glance: { fps: 4, loop: false, frames: [0, 1, 2].map(glance) },
  spooked: { fps: 8, loop: false, frames: [0, 1].map(spooked) },
  stagger: { fps: 8, loop: false, frames: [0, 1, 2].map(stagger) },
  sack_drop: { fps: 3, loop: false, frames: [0, 1].map(sackDrop) },
  unmasked: { fps: 3, loop: true, frames: [0, 1].map(unmasked) },
  tied: { fps: 2, loop: true, frames: [0, 1].map(tied) },
  hat_tip: { fps: 5, loop: false, frames: [0, 1, 2].map(hatTip) },
  run: { fps: 10, loop: true, frames: [0, 1, 2, 3].map(run) }
});
