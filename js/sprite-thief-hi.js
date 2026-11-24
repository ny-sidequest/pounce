// The thief, hi-bit: a 56x88 figure. Same silhouette as the 28x44 original (long coat, collar up, wide-brimmed hat,
// cream mask band over two glinting eye-holes, a sack over one shoulder) at twice the resolution: coat folds in
// three purple tones, a highlighted hat brim, a stitched sack with a soft two-tone amber glow and a cleaner "?",
// and an unmasked face with brows and mouth shapes.
import { defineSprite } from './sprites.js';
import { Hi, downsample, shade, glowRings } from './hires.js';

export const THIEF_HI_PALETTE = {
  '.': null,
  c: '#3B2A6B', C: '#24194A', l: '#5A46A0',          // coat: mid, shade, light fold
  z: '#2E2257',                                        // anti-alias tone on curved edges
  h: '#1A1530', H: '#5A4A9C',                          // hat, highlight edge / band
  f: '#1E1630',                                        // dark face
  w: '#F4E7C3', d: '#05040C', x: '#FFFFFF',            // mask band, eye holes / brows, glint
  a: '#FFB238', A: '#C27C1C', q: '#6B3E0A',            // sack, shade, stitching / "?"
  e: '#FFB238', E: '#FFE9B0',                          // loot glyph
  g: '#6A4414', G: '#3A2610',                          // sack glow: near, far
  p: '#FF4F9A', P: '#C2306F',                          // pink yarn
  s: '#D9C9B0', S: '#A8967C',                          // skin
  B: '#0E0A1E',                                        // boots
  m: '#8A7CD0', o: '#1A1238'                           // rim: moon side / shade side
};

const W = 28;   // old units (the final grid is 56 x 88)
const H = 44;
const BODY = ['c', 'C', 'l', 'z', 'h', 'H', 'f', 'w', 's', 'S', 'B', 'a', 'A', 'p', 'P'];

function finish(hi, { glow = true } = {}) {
  const g = downsample(hi, 'z');
  shade(g, ['c', 'C', 'l', 'z'], { base: 'c', ramp: [[0, 'l']], shadeCh: 'C' });
  // eye glints: one pixel
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.d[y][x] === 'x' && (g.get(x - 1, y) === 'x' || g.get(x, y - 1) === 'x') && g.get(x, y + 1) !== 'x' && g.get(x + 1, y) === '.') g.d[y][x] = 'd';
  // sack stitching: dashes along an inner ring of the sack
  const edge = (x, y) => ['a', 'q'].includes(g.get(x, y)) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !['a', 'q'].includes(g.get(x + dx, y + dy)));
  const ring = [];
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    if (g.d[y][x] !== 'a') continue;
    if (!edge(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => edge(x + dx, y + dy)) && (x + y) % 3 === 0) ring.push([x, y]);
  }
  ring.forEach(([x, y]) => { g.d[y][x] = 'q'; });
  if (glow) glowRings(g, ['a', 'A'], 'g', 'G', 2, 4);   // soft amber glow, two tones
  g.rim(BODY, 'm', 'o');
  return g;
}

function thief(o = {}) {
  const {
    dx = 0, dy = 0, lean = 0, hx = 0, hy = 0, face = 'R', eyes = 'open', mask = true, hatDx = 0, hatDy = 0,
    armL = 'down', armR = 'down', legs = 'stand', sackDy = 0, noSack = false, flap = 0, mouth = 'none', top = 15,
    boots, hatOff = false, yarn = false, brows = 'none', extra
  } = o;
  const g = new Hi(W, H);
  const X = (x) => x + dx;
  const Y = (y) => y + dy;

  // --- the sack on the back, facing the cat: stitched, glowing, with the "?"
  if (!noSack) {
    g.ellipse(X(4), Y(26 + sackDy), 4, 7, 'A');
    g.ellipse(X(3.2), Y(25 + sackDy), 3.2, 6.2, 'a');
    g.glyph('?', X(2), Y(23 + sackDy), 'q');
    g.rect(X(2), Y(19 + sackDy), 4, 1.6, 'A');
    g.line(X(11), Y(top), X(5), Y(19 + sackDy), 'C', 0.8);
  }
  // --- coat flap (running)
  if (flap) g.poly([[X(9), Y(26)], [X(2 - flap), Y(30)], [X(3 - flap), Y(40)], [X(8), Y(40)]], 'C');
  // --- boots
  const bs = boots || ({
    stand: [[9, 40], [17, 40]], a: [[9, 38], [17, 40]], b: [[9, 40], [17, 38]], sit: [[11, 41], [18, 41]]
  })[legs] || [[9, 40], [17, 40]];
  bs.forEach(([bx, by]) => g.rect(X(bx), Y(by), legs === 'sit' ? 8 : 5, legs === 'sit' ? 3 : 4, 'B'));
  // --- torso: a long, slightly hunched coat with folds
  g.poly([[X(10 + lean), Y(top)], [X(21 + lean), Y(top)], [X(23), Y(28)], [X(25), Y(40)], [X(6), Y(40)], [X(8), Y(28)]], 'c');
  g.poly([[X(18 + lean), Y(top)], [X(21 + lean), Y(top)], [X(25), Y(40)], [X(20), Y(40)]], 'C');
  g.rect(X(6), Y(38), 19, 2, 'C');
  g.line(X(14), Y(top + 3), X(14), Y(38), 'C', 0.8);
  g.line(X(11.5 + lean * 0.4), Y(top + 5), X(10.5), Y(37), 'C', 0.6);
  g.line(X(17 + lean * 0.4), Y(top + 5), X(19), Y(37), 'C', 0.6);
  g.line(X(12), Y(top + 6), X(11), Y(36), 'l', 0.5);
  g.rect(X(6), Y(36), 19, 0.6, 'l');
  if (yarn) {
    [8, 14].forEach((k) => { g.rect(X(7), Y(top + k), 17, 2, 'p').rect(X(7), Y(top + k + 2), 17, 1, 'P'); });
    g.rect(X(20), Y(top + 6), 3, 3, 'p').rect(X(21), Y(top + 9), 2, 4, 'P');
  }
  // --- arms (skin-tone hands so the action reads)
  const arm = (side, kind) => {
    const sx = side === 'L' ? 10 + lean : 21 + lean;
    const ex = side === 'L' ? 8 : 24;
    const hand = (x, y) => g.ellipse(X(x + 1.5), Y(y + 1.5), 1.6, 1.6, 's');
    if (kind === 'down') { g.line(X(sx), Y(top + 2), X(ex), Y(top + 15), 'c', 3); hand(ex - 1, top + 15); }
    else if (kind === 'up') { g.line(X(sx), Y(top + 2), X(side === 'L' ? 4 : 25), Y(top - 8), 'c', 3); hand(side === 'L' ? 3 : 24, top - 11); }
    else if (kind === 'half') { g.line(X(sx), Y(top + 2), X(ex + 1), Y(top - 3), 'c', 3); hand(ex, top - 6); }
    else if (kind === 'tip') { g.line(X(sx), Y(top + 2), X(22), Y(8), 'c', 3); hand(20, 5); }
    else if (kind === 'flail') { g.line(X(sx), Y(top + 2), X(side === 'L' ? 3 : 27), Y(top + 5), 'c', 3); hand(side === 'L' ? 2 : 25, top + 4); }
  };
  arm('L', armL);
  arm('R', armR);
  // --- collar up
  g.poly([[X(8 + lean + hx), Y(8 + hy)], [X(11 + hx), Y(10 + hy)], [X(11 + hx), Y(top + 2)], [X(8 + lean), Y(top + 2)]], 'c');
  g.poly([[X(22 + lean + hx), Y(8 + hy)], [X(19 + hx), Y(10 + hy)], [X(19 + hx), Y(top + 2)], [X(22 + lean), Y(top + 2)]], 'c');
  g.line(X(11 + hx), Y(11 + hy), X(11 + hx), Y(top + 1), 'C', 0.8).line(X(19 + hx), Y(11 + hy), X(19 + hx), Y(top + 1), 'C', 0.8);
  // --- head: dark face with a cream mask band over glinting eye-holes, or the bare face once unmasked
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
    // brows
    if (brows === 'raised') g.line(fx + 1.5, fy + 0.6, fx + 4.5, fy + 0.4, 'd', 0.5).line(fx + 8.5, fy + 0.6, fx + 5.5, fy + 0.4, 'd', 0.5);
    else if (brows === 'angry') g.line(fx + 1, fy + 0.8, fx + 4.5, fy + 2, 'd', 0.6).line(fx + 9, fy + 0.8, fx + 5.5, fy + 2, 'd', 0.6);
    // mouth shapes: shocked / grumpy / flat
    if (mouth === 'open') g.ellipse(fx + 5.5, fy + 6, 1.3, 1.4, 'd');
    else if (mouth === 'frown') { g.line(fx + 3, fy + 6.2, fx + 7.5, fy + 6.2, 'd', 0.6); g.line(fx + 2.5, fy + 7, fx + 3.2, fy + 6.2, 'd', 0.6).line(fx + 8, fy + 7, fx + 7.3, fy + 6.2, 'd', 0.6); }
    else g.rect(fx + 4, fy + 6, 3, 0.8, 'd');
  }
  // --- hat with a highlight edge on the brim
  if (!hatOff) {
    const hxp = X(hx + hatDx);
    const hyp = Y(hy + hatDy);
    g.ellipse(hxp + 15, hyp + 3, 6.2, 3.2, 'h').rect(hxp + 9, hyp + 3, 12, 3, 'h').rect(hxp + 9, hyp + 4, 12, 1, 'H');
    g.rect(hxp + 5, hyp + 6, 20, 2, 'h').rect(hxp + 5, hyp + 6, 20, 0.5, 'H').set(hxp + 5, hyp + 8, 'h').set(hxp + 24, hyp + 8, 'h');
  }
  extra?.(g);
  return finish(g, { glow: !noSack });
}

/* --------------------------------------------------------------- animations (more frames) */
const sneak = (f) => thief({ hx: 1, dy: [0, -0.7, -1, 0, -0.7, -1][f], legs: ['stand', 'a', 'a', 'stand', 'b', 'b'][f], sackDy: [0, 0.6, 1, 0, 0.6, 1][f] });

const glance = (f) => thief([
  { hx: 0, face: 'mid', eyes: 'wide' },
  { hx: -1.5, face: 'mid', eyes: 'wide', hatDx: -0.5 },
  { hx: -3, face: 'L', eyes: 'wide', hatDx: -1 },
  { hx: -1.2, face: 'mid' }
][f]);

const spooked = (f) => thief({ dy: [-2, -1][f], hatDy: [-2, -1][f], armL: 'up', armR: 'up', eyes: 'wide', legs: f ? 'stand' : 'a', hx: 1 });

const stagger = (f) => thief({
  dx: [1, 2, 2.5, 1][f], lean: [2, 3, 3, 1][f], hx: [1, 2, 2, 1][f], hatDy: [-1, 0, 0, -1][f], hatOff: f === 1 || f === 2,
  armL: 'flail', armR: 'up', eyes: 'wide', legs: ['a', 'b', 'b', 'a'][f], sackDy: [-1, 2, 1, 0][f],
  extra: f === 1 || f === 2 ? (g) => { g.rect(19 - f * 2, f === 1 ? 0 : 2, 8, 1.4, 'h').rect(21 - f * 2, f === 1 ? 0 : 2, 4, 0.6, 'H'); } : undefined
});

const sackDrop = (f) => thief({
  noSack: true, hx: 1, armL: 'down', armR: 'down', extra: (g) => {
    g.ellipse(5, 40, 6, 3, 'A').ellipse(5, 39, 5, 2, 'a').glyph('?', 4, 36, 'q');
    if (f === 1) g.glyph('?', 4, 27, 'e');
  }
});

const unmasked = (f) => thief({ mask: false, hx: 1, hatDx: 2, hatDy: -1, eyes: 'wide', mouth: f ? 'none' : 'open', brows: f ? 'angry' : 'raised', armL: f ? 'down' : 'half', armR: 'down' });

const tied = (f) => thief({
  mask: false, mouth: 'frown', brows: 'angry', top: 24, hy: 9, hx: 0, hatDx: 1, hatDy: f ? 0 : -1, legs: 'sit', sackDy: 3, armL: 'down', armR: 'down', yarn: true
});

const hatTip = (f) => thief({ hx: 1, face: 'R', eyes: f === 1 ? 'narrow' : 'open', armR: ['half', 'tip', 'tip'][f], hatDy: [0, -3, -1][f], hatDx: [0, 1, 0][f] });

const run = (f) => {
  const s = [-4, -2, 0, 4, 2, 0][f];
  return thief({
    dx: 2, lean: 3, hx: 1, flap: [0, 1, 2, 1, 0, 1][f], armL: f % 2 ? 'up' : 'down', armR: f % 2 ? 'down' : 'up', sackDy: [0, -0.7, -1, 0, -0.7, -1][f],
    boots: [[9 + s, [40, 39, 38, 40, 39, 38][f]], [17 - s, [38, 39, 40, 38, 39, 40][f]]]
  });
};

const mk = (n, fn) => () => Array.from({ length: n }, (_, i) => fn(i));

export const THIEF_HI = defineSprite('thief-hi', [56, 88], THIEF_HI_PALETTE, {
  sneak: { fps: 7, loop: true, frames: mk(6, sneak) },
  glance: { fps: 10, loop: false, frames: mk(4, glance) },
  spooked: { fps: 8, loop: false, frames: mk(2, spooked) },
  stagger: { fps: 10, loop: false, frames: mk(4, stagger) },
  sack_drop: { fps: 3, loop: false, frames: mk(2, sackDrop) },
  unmasked: { fps: 3, loop: true, frames: mk(2, unmasked) },
  tied: { fps: 2, loop: true, frames: mk(2, tied) },
  hat_tip: { fps: 12, loop: false, frames: mk(3, hatTip) },
  run: { fps: 12, loop: true, frames: mk(6, run) }
});
