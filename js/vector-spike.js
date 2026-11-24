// Style spike: smooth vector characters (rigged SVG parts, code-driven at 60fps) in a flat illustrated night scene.
// Standalone: does not touch the live game. Beat timings come from js/sequences.js (T).
import { T } from './sequences.js';

const NS = 'http://www.w3.org/2000/svg';
const $ = (s) => document.querySelector(s);
const svg = $('#scene');
const stageEl = $('#stage');
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rad = (d) => (d * Math.PI) / 180;
const rng = (seed) => { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };

const EASE = {
  linear: (k) => k,
  outQuad: (k) => 1 - (1 - k) * (1 - k),
  inQuad: (k) => k * k,
  outCubic: (k) => 1 - Math.pow(1 - k, 3),
  inCubic: (k) => k * k * k,
  inOutCubic: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  inOutSine: (k) => -(Math.cos(Math.PI * k) - 1) / 2,
  outBack: (k) => { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  outElastic: (k) => (k === 0 ? 0 : k === 1 ? 1 : Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1)
};

/* ---------------------------------------------------------------- clock, tweens, hit-stop */
const clock = { t: 0, scale: 1, manual: false, hold: 0 };
const tweens = new Set();
const holdWaiters = [];
let onAdvance = null;

function advance(dt) {
  if (clock.hold > 0) { // hit-stop: everything freezes for a moment
    clock.hold -= dt;
    if (clock.hold <= 0) { clock.hold = 0; holdWaiters.splice(0).forEach((r) => r()); }
    renderAll();
    return;
  }
  clock.t += dt;
  for (const tw of [...tweens]) tw.step();
  updateAll(dt);
  renderAll();
  onAdvance?.();
}
const wait = (ms) => new Promise((res) => { const t0 = clock.t; const tw = { step() { if (clock.t - t0 >= ms) { tweens.delete(tw); res(); } } }; tweens.add(tw); });
const tweenTo = (obj, to, ms, ease = 'outCubic') => new Promise((res) => {
  const from = {}; for (const k in to) from[k] = obj[k];
  const t0 = clock.t;
  const tw = { step() { const k = clamp((clock.t - t0) / ms, 0, 1); const e = EASE[ease](k); for (const key in to) obj[key] = lerp(from[key], to[key], e); if (k >= 1) { tweens.delete(tw); res(); } } };
  tweens.add(tw);
});
const run = (ms, ease, fn) => new Promise((res) => {
  const t0 = clock.t;
  const tw = { step() { const k = clamp((clock.t - t0) / ms, 0, 1); fn(EASE[ease](k), k); if (k >= 1) { tweens.delete(tw); res(); } } };
  tweens.add(tw);
  fn(0, 0);
});
const hitStop = (ms) => new Promise((res) => { clock.hold = ms; holdWaiters.push(res); });

/* ---------------------------------------------------------------- gradients, filters */
const defs = el('defs', {}, svg);
defs.innerHTML = `
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A0918"/><stop offset=".7" stop-color="#1E1943"/><stop offset="1" stop-color="#2B2457"/></linearGradient>
<linearGradient id="gCat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2D2759"/><stop offset=".5" stop-color="#0F0C22"/><stop offset="1" stop-color="#05040C"/></linearGradient>
<linearGradient id="rimCat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D2CDFA" stop-opacity=".95"/><stop offset=".45" stop-color="#8078CC" stop-opacity=".4"/><stop offset="1" stop-color="#8078CC" stop-opacity="0"/></linearGradient>
<linearGradient id="gScarf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF86BA"/><stop offset="1" stop-color="#D23578"/></linearGradient>
<linearGradient id="gScarf2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF4F9A"/><stop offset="1" stop-color="#B72A68"/></linearGradient>
<linearGradient id="rimPink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD6E8" stop-opacity=".9"/><stop offset="1" stop-color="#FFD6E8" stop-opacity="0"/></linearGradient>
<linearGradient id="gCoat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5E49AC"/><stop offset="1" stop-color="#281C56"/></linearGradient>
<linearGradient id="rimCoat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D6CFFF" stop-opacity=".9"/><stop offset=".5" stop-color="#9C90E8" stop-opacity=".3"/><stop offset="1" stop-color="#9C90E8" stop-opacity="0"/></linearGradient>
<linearGradient id="gHat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3A3070"/><stop offset="1" stop-color="#0F0B20"/></linearGradient>
<linearGradient id="gFace" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2A2142"/><stop offset="1" stop-color="#0E0A1C"/></linearGradient>
<linearGradient id="gSkin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F0E0C6"/><stop offset="1" stop-color="#B79F82"/></linearGradient>
<linearGradient id="gMask" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF6DC"/><stop offset="1" stop-color="#D7C497"/></linearGradient>
<radialGradient id="gSack" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#FFE59A"/><stop offset=".55" stop-color="#FFB238"/><stop offset="1" stop-color="#C46C10"/></radialGradient>
<radialGradient id="gGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFB238" stop-opacity=".6"/><stop offset="1" stop-color="#FFB238" stop-opacity="0"/></radialGradient>
<linearGradient id="gBin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8581B8"/><stop offset="1" stop-color="#3D3A6B"/></linearGradient>
<linearGradient id="gBld" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26224A"/><stop offset="1" stop-color="#15122E"/></linearGradient>
<linearGradient id="gSpot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE09A" stop-opacity=".0"/><stop offset="1" stop-color="#FFE09A" stop-opacity=".38"/></linearGradient>
<radialGradient id="gMoonGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#F4E7C3" stop-opacity=".35"/><stop offset="1" stop-color="#F4E7C3" stop-opacity="0"/></radialGradient>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="blur6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="flash" x="-20%" y="-20%" width="140%" height="140%"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>
`;

/* ---------------------------------------------------------------- helpers: shapes */
function capsule(x0, y0, x1, y1, w0, w1) {
  const dx = x1 - x0; const dy = y1 - y0; const l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l; const ny = dx / l;
  const f = (n) => n.toFixed(2);
  const a = [x0 + nx * w0, y0 + ny * w0]; const b = [x1 + nx * w1, y1 + ny * w1];
  const c = [x1 - nx * w1, y1 - ny * w1]; const d = [x0 - nx * w0, y0 - ny * w0];
  return `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}A${f(w1)} ${f(w1)} 0 0 0 ${f(c[0])} ${f(c[1])}L${f(d[0])} ${f(d[1])}A${f(w0)} ${f(w0)} 0 0 0 ${f(a[0])} ${f(a[1])}Z`;
}
/** points along a chain of segments from `base`, with absolute angles (deg) */
function chain(base, angles, lens) {
  const pts = [base];
  let [x, y] = base;
  angles.forEach((a, i) => { x += Math.cos(rad(a)) * lens[i]; y += Math.sin(rad(a)) * lens[i]; pts.push([x, y]); });
  return pts;
}
const catPart = (parent, tag, attrs) => el(tag, { fill: 'url(#gCat)', stroke: 'url(#rimCat)', 'stroke-width': 1.5, 'stroke-linejoin': 'round', ...attrs }, parent);

/* ---------------------------------------------------------------- the scene */
const world = el('g', {}, svg);
el('rect', { x: -900, y: -500, width: 2600, height: 1300, fill: 'url(#sky)' }, world);

// stars with a slow twinkle
const stars = [];
{ const r = rng(7); const g = el('g', {}, world);
  for (let i = 0; i < 90; i++) { const c = el('circle', { cx: -600 + r() * 2000, cy: -250 + r() * 430, r: 0.8 + r() * 1.5, fill: '#F4E7C3', opacity: 0.4 }, g); stars.push({ c, ph: r() * 6, sp: 0.6 + r() * 1.6, base: 0.35 + r() * 0.5 }); }
}
// moon: smooth crescent with two crater tones and a soft glow
{ const g = el('g', { transform: 'translate(120 74)' }, world);
  el('circle', { r: 88, fill: 'url(#gMoonGlow)' }, g);
  el('path', { d: 'M12 -34 A36 36 0 1 0 12 34 A29 29 0 1 1 12 -34 Z', fill: '#F4E7C3' }, g);
  el('circle', { cx: -14, cy: -8, r: 5, fill: '#E2D3A8' }, g); el('circle', { cx: -22, cy: 12, r: 3.4, fill: '#E2D3A8' }, g); el('circle', { cx: -6, cy: 20, r: 2.4, fill: '#D6C593' }, g);
}
// skyline: two parallax layers (far = lighter and lower in contrast)
const farG = el('g', {}, world); const midG = el('g', {}, world);
function skyline(parent, seed, y0, hMin, hMax, fill, op, wMin, wMax) {
  const r = rng(seed); let x = -800;
  while (x < 1600) { const w = wMin + r() * (wMax - wMin); const h = hMin + r() * (hMax - hMin);
    el('rect', { x, y: y0 - h, width: w, height: h + 300, rx: 3, fill, opacity: op }, parent);
    if (r() < 0.35) el('rect', { x: x + w * 0.3, y: y0 - h - 10, width: w * 0.25, height: 12, fill, opacity: op }, parent);
    if (op > 0.9) for (let wy = y0 - h + 14; wy < y0 - 6; wy += 22) for (let wx = x + 10; wx < x + w - 14; wx += 20) if (r() < 0.16) el('rect', { x: wx, y: wy, width: 7, height: 9, rx: 1.5, fill: '#FFB238', opacity: 0.55 }, parent);
    x += w + 4 + r() * 8; }
}
skyline(farG, 11, 255, 90, 190, '#322C63', 0.75, 40, 80);
skyline(midG, 23, 262, 50, 120, '#1E1A40', 1, 36, 70);

// the two buildings, the alley between them, the street and the bin
const bld = el('g', {}, world);
function building(x0, x1) {
  el('rect', { x: x0, y: 250, width: x1 - x0, height: 260, fill: 'url(#gBld)' }, bld);
  el('rect', { x: x0, y: 250, width: x1 - x0, height: 7, fill: '#3E3874' }, bld);
  el('rect', { x: x0, y: 250, width: x1 - x0, height: 2, fill: '#8F89D0', opacity: 0.7 }, bld);
  const r = rng(Math.round(x0) + 3);
  for (let wy = 290; wy < 400; wy += 44) for (let wx = x0 + 24; wx < x1 - 40; wx += 56) {
    const lit = r() < 0.5;
    el('rect', { x: wx, y: wy, width: 30, height: 30, rx: 3, fill: lit ? '#FFB84A' : '#0F0D24', opacity: lit ? 0.85 : 1 }, bld);
    if (lit) {
      const k = r();
      if (k < 0.4) el('path', { d: `M${wx} ${wy} L${wx + 14} ${wy} L${wx} ${wy + 24} Z`, fill: '#E86C8C', opacity: 0.7 }, bld);        // curtain
      else if (k < 0.7) { el('circle', { cx: wx + 20, cy: wy + 12, r: 4.4, fill: '#2A1608' }, bld); el('rect', { x: wx + 15, y: wy + 17, width: 10, height: 13, rx: 4, fill: '#2A1608' }, bld); } // silhouette
    }
    el('rect', { x: wx - 2, y: wy + 30, width: 34, height: 3, rx: 1.5, fill: '#4A4488' }, bld);
  }
}
building(-900, 308); building(492, 1700);
// roof details
el('rect', { x: 36, y: 212, width: 30, height: 38, rx: 2, fill: '#1B1838' }, bld); el('rect', { x: 32, y: 208, width: 38, height: 7, rx: 2, fill: '#3E3874' }, bld);      // chimney
el('rect', { x: 266, y: 190, width: 3, height: 60, fill: '#4A4488' }, bld); el('rect', { x: 252, y: 206, width: 30, height: 3, fill: '#4A4488' }, bld);                    // antenna
el('rect', { x: 700, y: 206, width: 56, height: 36, rx: 4, fill: '#1B1838' }, bld); el('rect', { x: 706, y: 240, width: 4, height: 10, fill: '#1B1838' }, bld); el('rect', { x: 746, y: 240, width: 4, height: 10, fill: '#1B1838' }, bld);
el('path', { d: 'M696 206 L728 190 L760 206 Z', fill: '#2A2552' }, bld);                                                                                                    // water tank
// alley fire escape
{ const g = el('g', { stroke: '#4A4488', 'stroke-width': 2.5, fill: 'none', 'stroke-linecap': 'round' }, bld);
  [[316, 300, 340, 300], [316, 340, 340, 340], [316, 380, 340, 380]].forEach(([a, b, c, d]) => el('line', { x1: a, y1: b, x2: c, y2: d }, g));
  el('polyline', { points: '340,300 316,340 340,340 316,380 340,380 316,418' }, g); }
// street: kerb, grate, a puddle that reflects the neon
el('rect', { x: -900, y: 418, width: 2600, height: 120, fill: '#08070F' }, bld);
el('rect', { x: -900, y: 418, width: 2600, height: 3, fill: '#4A4488' }, bld);
{ const g = el('g', {}, bld);
  for (let i = 0; i < 6; i++) el('rect', { x: 330 + i * 8, y: 430, width: 3, height: 12, rx: 1, fill: '#2B2650' }, g);
  el('ellipse', { cx: 190, cy: 438, rx: 70, ry: 8, fill: '#FF4F9A', opacity: 0.22 }, g); el('ellipse', { cx: 190, cy: 438, rx: 40, ry: 4, fill: '#FF86BA', opacity: 0.25 }, g); }
// neon OPEN sign
const neon = el('g', { transform: 'translate(70 330)' }, world);
el('rect', { x: -6, y: -22, width: 104, height: 40, rx: 8, fill: '#08070F', stroke: '#3E3874', 'stroke-width': 2 }, neon);
el('rect', { x: -6, y: -22, width: 104, height: 40, rx: 8, fill: 'none', stroke: '#FF4F9A', 'stroke-width': 2.4, filter: 'url(#glow)', opacity: 0.9 }, neon);
const neonText = el('text', { x: 46, y: 8, 'text-anchor': 'middle', 'font-family': 'Fredoka, Pixelify Sans, sans-serif', 'font-weight': 700, 'font-size': 26, fill: '#FF86BA', filter: 'url(#glow)' }, neon);
neonText.textContent = 'OPEN';

// the bin (back + lid) sits in the alley; the front is drawn over the cat for the bin gag
const BIN_X = 400;
const binBack = el('g', { transform: `translate(${BIN_X} 418)` }, world);
el('path', { d: 'M-28 -46 L28 -46 L24 0 L-24 0 Z', fill: 'url(#gBin)', stroke: '#C7C2F0', 'stroke-opacity': 0.5, 'stroke-width': 1.5 }, binBack);
for (const x of [-14, 0, 14]) el('line', { x1: x, y1: -40, x2: x * 0.9, y2: -6, stroke: '#2E2B58', 'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: 0.7 }, binBack);
el('path', { d: 'M-18 -22 q5 4 11 1', fill: 'none', stroke: '#2E2B58', 'stroke-width': 2, 'stroke-linecap': 'round' }, binBack);   // a dent
const lid = el('g', { transform: 'translate(0 -46)' }, binBack);
el('path', { d: 'M-32 0 Q-32 -9 -22 -9 L22 -9 Q32 -9 32 0 Z', fill: '#9C97CC', stroke: '#E6E2FF', 'stroke-opacity': 0.6, 'stroke-width': 1.5 }, lid);
el('rect', { x: -9, y: -15, width: 18, height: 6, rx: 3, fill: '#B3AEE0' }, lid);   // handle

/* ---------------------------------------------------------------- characters */
const chars = el('g', {}, world);
const thiefLayer = el('g', {}, chars);
const catLayer = el('g', {}, chars);
const binFront = el('g', { transform: `translate(${BIN_X} 418)`, opacity: 0 }, world);
el('path', { d: 'M-28 -34 L28 -34 L24 0 L-24 0 Z', fill: 'url(#gBin)', stroke: '#C7C2F0', 'stroke-opacity': 0.5, 'stroke-width': 1.5 }, binFront);
for (const x of [-14, 0, 14]) el('line', { x1: x, y1: -30, x2: x * 0.9, y2: -6, stroke: '#2E2B58', 'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: 0.7 }, binFront);
const spotG = el('g', {}, world);
const spot = el('polygon', { points: '0,0 0,0 0,0 0,0', fill: 'url(#gSpot)', opacity: 0 }, spotG);
const fxLayer = el('g', {}, world);

/* ---------------------------- the cat: body, head, 2 ears, 4 legs, 3 tail segments, 5 scarf segments */
const cat = { x: 160, y: 250, rot: 0, sx: 1, sy: 1, torsoY: 0, torsoRot: 0, headRot: 0, earL: 0, earR: 0,
  legBF: 0, legBN: 0, legFF: 0, legFN: 0, legScale: 1, tailBase: 200, tailAmp: 14, tailSpeed: 3, blink: 0, lid: 0, eyeScale: 1, bug: 0, dazed: 0, bang: 0, peel: 0,
  mode: 'idle', wiggle: 0, scarfUp: 0, vx: 0, vy: 0, px: 160, py: 250, flash: 0, swat: 0 };
const catParts = {};
{
  const root = el('g', {}, catLayer); catParts.root = root;
  catParts.tail = [0, 1, 2].map(() => catPart(root, 'path', {}));
  catParts.legBF = el('g', {}, root); catParts.legFF = el('g', {}, root);
  for (const g of [catParts.legBF, catParts.legFF]) { catPart(g, 'path', { d: capsule(0, 0, 0, 25, 6.5, 4.2) }); catPart(g, 'ellipse', { cx: 2, cy: 27, rx: 7, ry: 3.8 }); g.setAttribute('opacity', 0.92); }
  catParts.torso = el('g', {}, root);
  catPart(catParts.torso, 'path', { d: 'M-46 -30 C-46 -54 -22 -60 6 -58 C28 -57 38 -48 38 -36 C38 -21 20 -15 0 -15 C-26 -15 -46 -15 -46 -30 Z' });
  catPart(catParts.torso, 'ellipse', { cx: -30, cy: -33, rx: 16, ry: 18 });
  catParts.legBN = el('g', {}, root); catParts.legFN = el('g', {}, root);
  for (const g of [catParts.legBN, catParts.legFN]) { catPart(g, 'path', { d: capsule(0, 0, 0, 25, 7, 4.5) }); catPart(g, 'ellipse', { cx: 2, cy: 27, rx: 7.5, ry: 4 }); }
  // head with 2 ears, eyes, nose, whiskers, plus the gag props (bang, peel, dazed spirals)
  const hg = el('g', {}, root); catParts.head = hg;
  catParts.earL = el('g', {}, hg); catParts.earR = el('g', {}, hg);
  catPart(catParts.earL, 'path', { d: 'M-10 -10 C-15 -22 -14 -31 -11 -36 C-5 -31 0 -23 3 -14 Z' }); el('path', { d: 'M-9 -14 C-12 -22 -12 -27 -10.5 -30 C-6 -26 -3 -21 -1.5 -15 Z', fill: '#B04A7A' }, catParts.earL);
  catPart(catParts.earR, 'path', { d: 'M5 -14 C8 -25 12 -32 17 -36 C18 -29 18 -20 16 -10 Z' }); el('path', { d: 'M7.5 -15 C9.5 -22 12 -27 14.5 -30 C15 -25 15 -20 14 -14 Z', fill: '#B04A7A' }, catParts.earR);
  catPart(hg, 'ellipse', { cx: 2, cy: 0, rx: 18, ry: 16 });
  catPart(hg, 'ellipse', { cx: 13, cy: 7, rx: 8, ry: 6.5, 'stroke-width': 0 });
  catParts.bug = el('g', { opacity: 0 }, hg); el('ellipse', { cx: -2, cy: -3, rx: 7, ry: 7.6, fill: '#F4E7C3' }, catParts.bug); el('ellipse', { cx: 12, cy: -3, rx: 7, ry: 7.6, fill: '#F4E7C3' }, catParts.bug);
  catParts.eyes = [-2, 12].map((cx) => {
    const g = el('g', {}, hg); el('ellipse', { cx, cy: -3, rx: 4.6, ry: 5.8, fill: '#FFB238' }, g); el('ellipse', { cx: cx + 0.8, cy: -3, rx: 1.4, ry: 4.4, fill: '#05040C' }, g);
    el('circle', { cx: cx - 1.4, cy: -5.2, r: 1.5, fill: '#FFF3D0' }, g); return { g, cx };
  });
  catParts.lid = el('g', { opacity: 0 }, hg); el('path', { d: 'M-8 -9 L18 -9 L18 -3 L-8 -3 Z', fill: '#14102A' }, catParts.lid);
  catParts.dazed = el('g', { opacity: 0 }, hg);
  [-2, 12].forEach((cx) => el('path', { d: `M${cx} -3 m0 0 a2 2 0 1 1 3 1.4 a4 4 0 1 1 -6 -3 a6 6 0 1 1 9 4`, fill: 'none', stroke: '#FFB238', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, catParts.dazed));
  el('path', { d: 'M18 3 l4 0 l-2 3.4 Z', fill: '#F4A6A0' }, hg);
  el('path', { d: 'M20 7 q-3 3 -7 2', fill: 'none', stroke: '#3A3366', 'stroke-width': 1.3, 'stroke-linecap': 'round' }, hg);
  for (const [x2, y2] of [[34, 2], [35, 7], [33, 12]]) el('line', { x1: 18, y1: 6, x2, y2, stroke: '#A8A2DC', 'stroke-width': 0.9, 'stroke-linecap': 'round', opacity: 0.8 }, hg);
  catParts.peel = el('g', { opacity: 0 }, hg);
  el('path', { d: 'M-12 -12 C-6 -22 8 -24 16 -14 C10 -16 0 -14 -6 -8 Z', fill: '#F2D13D', stroke: '#B8962A', 'stroke-width': 1.2 }, catParts.peel);
  el('path', { d: 'M-12 -12 C-16 -6 -14 -2 -10 0 C-10 -4 -9 -7 -6 -8 Z', fill: '#E0BC2A', stroke: '#B8962A', 'stroke-width': 1.2 }, catParts.peel);
  catParts.bangG = el('g', { opacity: 0 }, hg);
  el('rect', { x: 24, y: -52, width: 7, height: 20, rx: 3.5, fill: '#F4E7C3', stroke: '#05040C', 'stroke-width': 1.4 }, catParts.bangG); el('circle', { cx: 27.5, cy: -24, r: 4, fill: '#F4E7C3', stroke: '#05040C', 'stroke-width': 1.4 }, catParts.bangG);
  // scarf: a wrap + 5 tail segments
  catParts.scarfWrap = el('path', { d: 'M18 -52 Q36 -44 40 -36 Q42 -30 36 -30 Q28 -32 14 -40 Z', fill: 'url(#gScarf)', stroke: 'url(#rimPink)', 'stroke-width': 1.3 }, root);
  catParts.scarf = [0, 1, 2, 3, 4].map((i) => el('path', { fill: i % 2 ? 'url(#gScarf2)' : 'url(#gScarf)', stroke: 'url(#rimPink)', 'stroke-width': 1.1, 'stroke-linejoin': 'round' }, root));
}
const scarfAng = [90, 90, 90, 90, 90];
const tailAng = [200, 200, 200];

const catApply = () => {
  const s = cat;
  const breathe = s.mode === 'idle' ? Math.sin(clock.t / 1000 * 2.3) * 1 : 0;
  catParts.root.setAttribute('transform', `translate(${s.x.toFixed(2)} ${s.y.toFixed(2)}) rotate(${s.rot.toFixed(2)}) scale(${s.sx.toFixed(3)} ${s.sy.toFixed(3)})`);
  const ty = s.torsoY;
  catParts.torso.setAttribute('transform', `translate(0 ${ty.toFixed(2)}) rotate(${(s.torsoRot + s.wiggle).toFixed(2)} -30 -34) scale(1 ${(1 + breathe * 0.014).toFixed(4)})`);
  const legT = (hx, ang, i) => `translate(${hx} ${(-30 + ty).toFixed(2)}) rotate(${ang.toFixed(2)}) scale(1 ${clamp((30 - ty) / 30 * s.legScale, 0.35, 1.3).toFixed(3)})`;
  catParts.legBF.setAttribute('transform', legT(-26, s.legBF));
  catParts.legBN.setAttribute('transform', legT(-18, s.legBN));
  catParts.legFF.setAttribute('transform', legT(20, s.legFF));
  catParts.legFN.setAttribute('transform', legT(26, s.legFN));
  catParts.head.setAttribute('transform', `translate(32 ${(-54 + ty - breathe * 0.5).toFixed(2)}) rotate(${s.headRot.toFixed(2)})`);
  catParts.earL.setAttribute('transform', `rotate(${s.earL.toFixed(2)} -6 -12)`);
  catParts.earR.setAttribute('transform', `rotate(${s.earR.toFixed(2)} 10 -12)`);
  const bl = clamp(s.blink + s.lid * 0.5, 0, 1);
  catParts.eyes.forEach(({ g, cx }) => g.setAttribute('transform', `translate(${cx} -3) scale(${(s.eyeScale).toFixed(3)} ${(s.eyeScale * (1 - bl * 0.94)).toFixed(3)}) translate(${-cx} 3)`));
  catParts.bug.setAttribute('opacity', s.bug); catParts.dazed.setAttribute('opacity', s.dazed);
  catParts.dazed.setAttribute('transform', `rotate(${(clock.t * 0.4) % 360} 5 -3)`);
  catParts.bangG.setAttribute('opacity', s.bang); catParts.peel.setAttribute('opacity', s.peel);
  catParts.eyes.forEach(({ g }) => g.setAttribute('opacity', s.dazed > 0.5 ? 0 : 1));
};

function catUpdate(dt) {
  const s = cat; const sec = clock.t / 1000;
  // velocity (world units / s) for the scarf's wind
  if (dt > 0) { s.vx = lerp(s.vx, (s.x - s.px) / (dt / 1000), 0.4); s.vy = lerp(s.vy, (s.y - s.py) / (dt / 1000), 0.4); }
  s.px = s.x; s.py = s.y;
  // blink every few seconds when relaxed
  if (s.mode === 'idle') { const ph = (sec % 3.4); s.blink = ph > 3.2 ? Math.sin(((ph - 3.2) / 0.2) * Math.PI) : 0; }
  // tail: 3 segments with follow-through
  const swish = s.mode === 'idle' || s.mode === 'crouch';
  for (let i = 0; i < 3; i++) {
    const target = s.tailBase + (swish ? Math.sin(sec * s.tailSpeed - i * 0.9) * s.tailAmp * (0.5 + i * 0.5) : 0) + i * 6 * (s.mode === 'leap' ? -1 : 1);
    tailAng[i] += (target - tailAng[i]) * (1 - Math.exp(-dt / (36 + i * 42)));
  }
  const tp = chain([-44, -36 + s.torsoY], tailAng, [24, 22, 20]);
  const tw = [[8, 6.4], [6.4, 4.8], [4.8, 3]];
  catParts.tail.forEach((p, i) => p.setAttribute('d', capsule(tp[i][0], tp[i][1], tp[i + 1][0], tp[i + 1][1], tw[i][0], tw[i][1])));
  // scarf: 5 segments, each lagging more than the last (follow-through)
  const speed = Math.hypot(s.vx, s.vy);
  const wind = clamp(speed / 500, 0, 1);
  const phi = (Math.atan2(-s.vy, -s.vx) * 180) / Math.PI;       // trail opposite to the motion (world)
  const down = 90; const up = 255;
  let tgtWorld = lerpAngle(down, phi, wind);
  tgtWorld = lerpAngle(tgtWorld, up, s.scarfUp);
  const base = [26, -42 + s.torsoY];
  for (let i = 0; i < 5; i++) {
    const wave = Math.sin(sec * 5 - i * 0.9) * (3 + i * 2.2) * (0.4 + wind);
    const target = tgtWorld - s.rot + wave;
    scarfAng[i] = lerpAngle(scarfAng[i], target, 1 - Math.exp(-dt / (28 + i * 34)));
  }
  const sp = chain(base, scarfAng, [13, 13, 12, 12, 11]);
  const sw = [[7, 6.4], [6.4, 5.8], [5.8, 5], [5, 4.2], [4.2, 3.2]];
  catParts.scarf.forEach((p, i) => p.setAttribute('d', capsule(sp[i][0], sp[i][1], sp[i + 1][0], sp[i + 1][1], sw[i][0], sw[i][1])));
}
function lerpAngle(a, b, t) { let d = ((b - a + 540) % 360) - 180; return a + d * t; }

/* ---- cat poses (tweens over the rig) */
const catBase = () => Object.assign(cat, { rot: 0, sx: 1, sy: 1, torsoY: 0, torsoRot: 0, headRot: 0, earL: 0, earR: 0, legBF: 0, legBN: 0, legFF: 0, legFN: 0, legScale: 1,
  tailBase: 200, tailAmp: 14, tailSpeed: 3, blink: 0, lid: 0, eyeScale: 1, bug: 0, dazed: 0, bang: 0, peel: 0, mode: 'idle', wiggle: 0, scarfUp: 0, swat: 0 });
const catPose = (to, ms = 160, ease = 'outCubic') => tweenTo(cat, to, ms, ease);
async function catCrouch() {
  cat.mode = 'crouch';
  await catPose({ torsoY: 16, torsoRot: -4, headRot: 6, legBF: -28, legBN: -20, legFF: 34, legFN: 26, eyeScale: 1.22, tailBase: 190, tailAmp: 10, tailSpeed: 7, earL: -8, earR: 8 }, 200);
  // the classic bum wiggle
  run(1e6, 'linear', () => { if (cat.mode === 'crouch') cat.wiggle = Math.sin(clock.t / 1000 * 26) * 4.2; });
}
async function catLeap(x1, y1, apex, ms, endPose = true) {
  cat.mode = 'leap'; cat.wiggle = 0;
  const x0 = cat.x; const y0 = cat.y;
  catPose({ torsoY: -4, torsoRot: 0, legBF: 62, legBN: 70, legFF: -70, legFN: -62, legScale: 0.92, eyeScale: 1.3, headRot: -6, earL: 18, earR: 20, tailBase: 188, tailAmp: 3 }, ms * 0.2, 'outCubic');
  await run(ms, 'inOutSine', (e) => {
    cat.x = lerp(x0, x1, e); cat.y = lerp(y0, y1, e) - 4 * apex * e * (1 - e);
    const stretch = Math.sin(Math.PI * e);
    cat.sx = 1 + 0.26 * stretch; cat.sy = 1 - 0.18 * stretch;                 // stretch in the air
    const vy = (y1 - y0) - 4 * apex * (1 - 2 * e); cat.rot = clamp(Math.atan2(vy, x1 - x0) * 28, -26, 26);
  });
  cat.rot = 0;
  if (endPose) await catLand();
}
async function catLand() {
  // squash on impact, then an elastic recover
  cat.sx = 1.28; cat.sy = 0.7; cat.legBF = 20; cat.legBN = 20; cat.legFF = -20; cat.legFN = -20; cat.torsoY = 10;
  await run(380, 'outElastic', (e) => { cat.sx = lerp(1.28, 1, e); cat.sy = lerp(0.7, 1, e); });
}
async function catSettle(ms = 300) {
  cat.mode = 'idle'; cat.wiggle = 0;
  await catPose({ rot: 0, sx: 1, sy: 1, torsoY: 0, torsoRot: 0, headRot: 0, legBF: 0, legBN: 0, legFF: 0, legFN: 0, legScale: 1, eyeScale: 1, earL: 0, earR: 0, tailBase: 200, tailAmp: 14, tailSpeed: 3, scarfUp: 0 }, ms);
}
async function catSwat() {
  cat.mode = 'swat';
  await catPose({ legFN: -50, torsoRot: -6, headRot: 8, eyeScale: 0.8 }, 110, 'outCubic');
  await catPose({ legFN: -100, torsoRot: 4, headRot: -2 }, 90, 'outBack');
  await catPose({ legFN: -20, torsoRot: 0, headRot: 0, eyeScale: 1 }, 160, 'inOutSine');
}
async function catFlail(ms) {
  cat.mode = 'fall';
  run(ms, 'linear', () => { const w = clock.t / 1000 * 24; cat.legBF = Math.sin(w) * 55; cat.legBN = Math.sin(w + 2) * 55; cat.legFF = Math.sin(w + 1) * 60 - 30; cat.legFN = Math.sin(w + 3) * 60 - 30; cat.tailBase = 200 + Math.sin(w * 0.7) * 30; });
}

/* ---------------------------- the thief: coat, head, hat, mask, 2 arms, 2 legs, sack */
const th = { x: 650, y: 250, rot: 0, sx: 1, sy: 1, lean: 0, bob: 0, flip: 1, headRot: 0, hatY: 0, hatRot: 0, hatX: 0, aBack1: 8, aBack2: 6, aFront1: -8, aFront2: -6, legL: 0, legR: 0, sackSwing: 0, sackY: 0, sackX: 0, sackRot: 0, sackOn: 1, qA: 0, qY: 0,
  eyes: 1, face: 0, mode: 'sneak', yarn: 0, sit: 0, flash: 0, hatOff: 0 };
const thParts = {};
{
  const root = el('g', {}, thiefLayer); thParts.root = root;
  thParts.glow = el('g', {}, root);
  el('circle', { cx: -58, cy: -72, r: 62, fill: 'url(#gGlow)' }, thParts.glow);
  thParts.sackG = el('g', {}, root);                                    // sack (swings from the strap)
  el('path', { d: 'M-24 -112 Q-44 -104 -52 -92', fill: 'none', stroke: '#1E1640', 'stroke-width': 4, 'stroke-linecap': 'round' }, thParts.sackG);
  el('path', { d: 'M-52 -98 C-80 -94 -82 -50 -62 -42 C-46 -38 -30 -50 -34 -74 C-36 -90 -44 -96 -52 -98 Z', fill: 'url(#gSack)', stroke: '#FFE9B0', 'stroke-opacity': 0.8, 'stroke-width': 1.5, filter: 'url(#glow)' }, thParts.sackG);
  el('path', { d: 'M-52 -98 C-48 -104 -42 -102 -40 -97 C-44 -97 -48 -96 -52 -98 Z', fill: '#C46C10' }, thParts.sackG);
  el('path', { d: 'M-68 -78 C-74 -66 -70 -54 -62 -50', fill: 'none', stroke: '#8A4A0C', 'stroke-width': 1.4, 'stroke-dasharray': '3 3', 'stroke-linecap': 'round' }, thParts.sackG);
  const q = el('text', { x: -56, y: -60, 'text-anchor': 'middle', 'font-family': 'Fredoka, Pixelify Sans, sans-serif', 'font-weight': 800, 'font-size': 34, fill: '#6B3E0A' }, thParts.sackG); q.textContent = '?';
  thParts.qFloat = el('text', { x: -56, y: -70, 'text-anchor': 'middle', 'font-family': 'Fredoka, Pixelify Sans, sans-serif', 'font-weight': 800, 'font-size': 36, fill: '#FFB238', opacity: 0 }, root); thParts.qFloat.textContent = '?';
  thParts.legL = el('g', {}, root); thParts.legR = el('g', {}, root);
  for (const g of [thParts.legL, thParts.legR]) { el('path', { d: capsule(0, 0, 0, 12, 9, 8), fill: '#1B1338' }, g); el('path', { d: 'M-10 10 Q-10 4 -2 4 L10 4 Q16 10 14 14 L-10 14 Z', fill: '#0E0A1E', stroke: 'url(#rimCoat)', 'stroke-width': 1.2 }, g); }
  thParts.armB = el('g', {}, root);                                      // back arm (near the cat)
  thParts.coat = el('g', {}, root);
  el('path', { d: 'M-30 -112 C-42 -70 -44 -30 -46 -4 L42 -4 C38 -34 36 -72 30 -112 C14 -122 -14 -122 -30 -112 Z', fill: 'url(#gCoat)', stroke: 'url(#rimCoat)', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, thParts.coat);
  for (const d of ['M-12 -96 C-16 -60 -16 -30 -18 -8', 'M10 -96 C14 -60 16 -30 18 -8', 'M-2 -100 L-2 -10']) el('path', { d, fill: 'none', stroke: '#1B1240', 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.55 }, thParts.coat);
  for (const d of ['M-22 -92 C-26 -60 -26 -34 -30 -10', 'M22 -90 C28 -60 28 -34 32 -10']) el('path', { d, fill: 'none', stroke: '#9C90E8', 'stroke-width': 1.3, 'stroke-linecap': 'round', opacity: 0.35 }, thParts.coat);
  el('path', { d: 'M-46 -8 Q0 4 42 -8 L42 -4 L-46 -4 Z', fill: '#1B1240', opacity: 0.6 }, thParts.coat);
  thParts.yarn = el('g', { opacity: 0 }, root);
  for (const y of [-92, -66, -40]) { el('path', { d: `M-38 ${y} Q0 ${y + 14} 36 ${y}`, fill: 'none', stroke: '#FF4F9A', 'stroke-width': 5, 'stroke-linecap': 'round' }, thParts.yarn); el('path', { d: `M-38 ${y + 2} Q0 ${y + 16} 36 ${y + 2}`, fill: 'none', stroke: '#B72A68', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, thParts.yarn); }
  thParts.armF = el('g', {}, root);                                      // front arm (can tip the hat)
  for (const g of [thParts.armB, thParts.armF]) {
    el('path', { d: capsule(0, 0, 0, 30, 9.5, 8), fill: 'url(#gCoat)', stroke: 'url(#rimCoat)', 'stroke-width': 1.3 }, g);
    const fore = el('g', { transform: 'translate(0 30)' }, g); g.fore = fore;
    el('path', { d: capsule(0, 0, 0, 27, 8, 6.6), fill: 'url(#gCoat)', stroke: 'url(#rimCoat)', 'stroke-width': 1.3 }, fore);
    el('circle', { cx: 0, cy: 31, r: 6.2, fill: 'url(#gSkin)' }, fore);
  }
  // collar flaps, head (with the mask and an unmasked face underneath), hat
  thParts.collar = el('g', {}, root);
  el('path', { d: 'M-28 -108 C-36 -124 -34 -138 -28 -146 C-20 -134 -14 -124 -10 -116 Z', fill: 'url(#gCoat)', stroke: 'url(#rimCoat)', 'stroke-width': 1.3 }, thParts.collar);
  el('path', { d: 'M24 -108 C32 -124 32 -138 26 -146 C18 -134 12 -124 8 -116 Z', fill: 'url(#gCoat)', stroke: 'url(#rimCoat)', 'stroke-width': 1.3 }, thParts.collar);
  thParts.head = el('g', {}, root);
  el('ellipse', { cx: 0, cy: 0, rx: 16, ry: 18, fill: 'url(#gFace)', stroke: 'url(#rimCoat)', 'stroke-width': 1.3 }, thParts.head);
  thParts.faceU = el('g', { opacity: 0 }, thParts.head);              // the bare face
  el('ellipse', { cx: 0, cy: 0, rx: 15.2, ry: 17.2, fill: 'url(#gSkin)' }, thParts.faceU);
  for (const x of [-6.6, 6.6]) { el('circle', { cx: x, cy: -3, r: 4.6, fill: '#FFFFFF' }, thParts.faceU); el('circle', { cx: x, cy: -3, r: 2, fill: '#05040C' }, thParts.faceU); }
  thParts.brows = el('g', {}, thParts.faceU); el('path', { d: 'M-12 -11 Q-7 -14 -2 -11', fill: 'none', stroke: '#2A1608', 'stroke-width': 2, 'stroke-linecap': 'round' }, thParts.brows); el('path', { d: 'M12 -11 Q7 -14 2 -11', fill: 'none', stroke: '#2A1608', 'stroke-width': 2, 'stroke-linecap': 'round' }, thParts.brows);
  thParts.mouth = el('ellipse', { cx: 0, cy: 10, rx: 4, ry: 4.6, fill: '#3A1608' }, thParts.faceU);
  thParts.mask = el('g', {}, thParts.head);
  el('path', { d: 'M-17 -9 Q0 -14 17 -9 L17 3 Q0 8 -17 3 Z', fill: 'url(#gMask)', stroke: '#FFF6DC', 'stroke-opacity': 0.7, 'stroke-width': 1 }, thParts.mask);
  thParts.eyeHoles = [-7, 7].map((x) => { const g = el('g', {}, thParts.mask); el('ellipse', { cx: x, cy: -3, rx: 4.4, ry: 3, fill: '#0A0716' }, g); el('circle', { cx: x + 1.4, cy: -3.6, r: 1.2, fill: '#FFFFFF' }, g); return { g, x }; });
  thParts.hat = el('g', {}, root);
  el('path', { d: 'M-22 -4 C-22 -24 -14 -34 0 -34 C14 -34 22 -24 22 -4 Z', fill: 'url(#gHat)', stroke: 'url(#rimCoat)', 'stroke-width': 1.3 }, thParts.hat);
  el('path', { d: 'M-22 -6 Q0 -2 22 -6 L22 -12 Q0 -8 -22 -12 Z', fill: '#5A4A9C', opacity: 0.85 }, thParts.hat);
  el('ellipse', { cx: 0, cy: -2, rx: 42, ry: 9, fill: 'url(#gHat)', stroke: 'url(#rimCoat)', 'stroke-width': 1.5 }, thParts.hat);
  el('path', { d: 'M-40 -4 Q0 -8 40 -4', fill: 'none', stroke: '#D6CFFF', 'stroke-opacity': 0.6, 'stroke-width': 1.4, 'stroke-linecap': 'round' }, thParts.hat);
}
const thApply = () => {
  const s = th;
  const sit = s.sit;
  const bob = s.mode === 'sneak' ? Math.sin(clock.t / 1000 * 7) * 1.6 : s.bob;
  thParts.root.setAttribute('transform', `translate(${s.x.toFixed(2)} ${s.y.toFixed(2)}) rotate(${s.rot.toFixed(2)}) scale(${s.sx.toFixed(3)} ${(s.sy * (1 - sit * 0.34)).toFixed(3)})`);
  const lean = s.lean + (s.mode === 'sneak' ? 3 : 0);
  const body = `translate(0 ${bob.toFixed(2)}) rotate(${lean.toFixed(2)} 0 -6)`;
  thParts.coat.setAttribute('transform', body); thParts.collar.setAttribute('transform', body); thParts.yarn.setAttribute('transform', body); thParts.yarn.setAttribute('opacity', s.yarn);
  thParts.glow.setAttribute('opacity', 0.5 + Math.sin(clock.t / 1000 * 3) * 0.12);
  const sw = s.sackSwing + (s.mode === 'sneak' ? Math.sin(clock.t / 1000 * 7 - 1) * 4 : 0) + (s.mode === 'run' ? Math.sin(clock.t / 1000 * 18) * 8 : 0);
  thParts.sackG.setAttribute('transform', `${body} translate(${s.sackX.toFixed(2)} ${s.sackY.toFixed(2)}) rotate(${(sw + s.sackRot).toFixed(2)} -30 -108)`);
  thParts.sackG.setAttribute('opacity', s.sackOn); thParts.glow.setAttribute('visibility', s.sackOn > 0.5 && s.sackY < 20 ? 'visible' : 'hidden');
  thParts.qFloat.setAttribute('opacity', s.qA); thParts.qFloat.setAttribute('transform', `translate(${s.sackX.toFixed(1)} ${s.qY.toFixed(1)})`);
  thParts.legL.setAttribute('transform', `translate(-14 -10) rotate(${s.legL.toFixed(2)})`); thParts.legR.setAttribute('transform', `translate(12 -10) rotate(${s.legR.toFixed(2)})`);
  thParts.armB.setAttribute('transform', `${body} translate(-24 -106) rotate(${s.aBack1.toFixed(2)})`); thParts.armB.fore.setAttribute('transform', `translate(0 30) rotate(${s.aBack2.toFixed(2)})`);
  thParts.armF.setAttribute('transform', `${body} translate(24 -106) rotate(${s.aFront1.toFixed(2)})`); thParts.armF.fore.setAttribute('transform', `translate(0 30) rotate(${s.aFront2.toFixed(2)})`);
  // the head turns by flipping (a squash through zero reads as a turn)
  thParts.head.setAttribute('transform', `${body} translate(0 -128) rotate(${s.headRot.toFixed(2)}) scale(${s.flip.toFixed(3)} 1)`);
  thParts.hat.setAttribute('transform', `${body} translate(${(s.hatX).toFixed(2)} ${(-146 + s.hatY).toFixed(2)}) rotate(${s.hatRot.toFixed(2)}) scale(${s.flip < 0 ? 1 : 1})`);
  thParts.faceU.setAttribute('opacity', s.face); thParts.mask.setAttribute('opacity', 1 - s.face);
  thParts.eyeHoles.forEach(({ g, x }) => g.setAttribute('transform', `translate(${x} -3) scale(1 ${s.eyes.toFixed(3)}) translate(${-x} 3)`));
  thParts.mouth.setAttribute('rx', 3 + s.face * 1);
};
const thBase = () => Object.assign(th, { x: 650, y: 250, rot: 0, sx: 1, sy: 1, lean: 0, bob: 0, flip: 1, headRot: 0, hatY: 0, hatRot: 0, hatX: 0, aBack1: 8, aBack2: 6, aFront1: -8, aFront2: -6, legL: 0, legR: 0,
  sackSwing: 0, sackY: 0, sackX: 0, sackRot: 0, sackOn: 1, qA: 0, qY: -70, eyes: 1, face: 0, mode: 'sneak', yarn: 0, sit: 0 });
const thPose = (to, ms = 160, ease = 'outCubic') => tweenTo(th, to, ms, ease);
async function thGlance() {
  await thPose({ flip: -1, headRot: -6, eyes: 1.3 }, 150, 'inOutCubic');      // turns to look back at the cat
  await wait(110);
  await thPose({ flip: 1, headRot: 0, eyes: 1 }, 170, 'inOutCubic');
}
async function thSpooked() {
  await thPose({ y: 242, aBack1: 150, aFront1: -150, aBack2: -10, aFront2: 10, eyes: 1.5, hatY: -10 }, 90, 'outCubic');
  thPose({ y: 250, hatY: 0 }, 220, 'outBounce' in EASE ? 'outBounce' : 'outBack');
}
async function thStagger() {
  th.mode = 'stagger';
  thPose({ hatY: -70, hatRot: 220, hatX: 24 }, 220, 'outCubic');
  await thPose({ rot: 15, lean: 10, aBack1: 150, aFront1: -130, aBack2: -20, aFront2: 20, legL: -20, legR: 16, eyes: 1.6, flip: 1 }, 130, 'outCubic');
  await thPose({ rot: -5, lean: -4, hatY: 0, hatRot: 0, hatX: 0 }, 220, 'outBack');
  await thPose({ rot: 0, lean: 0, aBack1: 40, aFront1: -40, aBack2: 10, aFront2: -10, legL: 0, legR: 0 }, 180, 'inOutSine');
}
async function thDropSack() {
  th.qA = 1;
  const p1 = run(420, 'linear', (e) => { th.qY = lerp(-60, -130, EASE.outQuad(e)); th.qA = 1 - e; th.sackX = 0; });
  th.sackX = 0;
  await run(300, 'inQuad', (e) => { th.sackY = lerp(0, 74, e); th.sackRot = lerp(0, 40, e); });
  await run(200, 'outCubic', (e) => { th.sackY = 74 - Math.sin(Math.PI * e) * 12; });
  await p1;
}

/* ---------------------------------------------------------------- effects */
function dust(x, y, n = 14, spread = 70, color = '#8B86B8') {
  for (let i = 0; i < n; i++) {
    const c = el('circle', { cx: x, cy: y, r: 2 + Math.random() * 4, fill: color, opacity: 0.8 }, fxLayer);
    const dx = (Math.random() - 0.5) * spread; const up = 12 + Math.random() * 30;
    run(520 + Math.random() * 200, 'outCubic', (e, k) => { c.setAttribute('cx', x + dx * e); c.setAttribute('cy', y - up * Math.sin(Math.PI * Math.min(1, e * 0.9)) + 6 * e); c.setAttribute('opacity', 0.8 * (1 - k)); c.setAttribute('r', (2 + i % 4) * (1 + e)); }).then(() => c.remove());
  }
}
function speedLines(x0, y0, x1, y1, ms, apex) {
  for (let i = 0; i < 4; i++) {
    const l = el('path', { d: '', fill: 'none', stroke: '#F4E7C3', 'stroke-width': 2.2 - i * 0.3, 'stroke-linecap': 'round', opacity: 0.7 }, fxLayer);
    run(ms + 120, 'linear', (e, k) => {
      const tt = clamp(e - 0.0, 0, 1); const pt = (u) => [lerp(x0, x1, u), lerp(y0, y1, u) - 4 * apex * u * (1 - u) - 34 + i * 10];
      const a = pt(clamp(tt - 0.16 - i * 0.02, 0, 1)); const b = pt(clamp(tt - 0.02, 0, 1));
      l.setAttribute('d', `M${a[0]} ${a[1]} L${b[0]} ${b[1]}`); l.setAttribute('opacity', 0.75 * (1 - k));
    }).then(() => l.remove());
  }
}
let shakeAmp = 0;
const shake = (amp, ms = 220) => { shakeAmp = amp; run(ms, 'linear', (e, k) => { shakeAmp = amp * (1 - k); }); };
function flashChars(on) { catLayer.setAttribute('filter', on ? 'url(#flash)' : ''); thiefLayer.setAttribute('filter', on ? 'url(#flash)' : ''); }
function setSpot(on, x, y) {
  if (on) spot.setAttribute('points', `${x - 8},${y - 240} ${x + 8},${y - 240} ${x + 64},${y + 90} ${x - 64},${y + 90}`);
  tweenTo(spotState, { a: on ? 1 : 0 }, 350, 'outCubic');
}
const spotState = { a: 0 };

const plate = $('#plate');
function showPlate(kind) {
  plate.className = kind === 'fall' ? 'fall show' : 'show';
  plate.querySelector('.k').textContent = kind === 'fall' ? 'CLATTER!' : 'THE THIEF WAS…';
  plate.querySelector('.n').textContent = kind === 'fall' ? 'The thief got away.' : 'Robert Downey Jr.';
  plate.querySelector('.p').textContent = kind === 'fall' ? '' : '+4,000';
  plate.querySelector('.t').textContent = kind === 'fall' ? 'You fell short at 4.0 m' : 'Alley genius';
}
const hidePlate = () => { plate.className = ''; };

/* ---------------------------------------------------------------- mask (detaches and spins away) */
let maskEl = null;
function detachMask() {
  const m = thParts.mask;
  const mx = m.getScreenCTM(); const wx = world.getScreenCTM();
  const rel = wx.inverse().multiply(mx);
  maskEl = m; fxLayer.appendChild(m);
  m.setAttribute('transform', `matrix(${rel.a} ${rel.b} ${rel.c} ${rel.d} ${rel.e} ${rel.f})`);
  return rel;
}
async function maskFly(ms) {
  const rel = detachMask();
  const x0 = rel.e; const y0 = rel.f; const x1 = 598; const y1 = 244;
  th.face = 1; // hmm: the face is revealed as the mask leaves
  await run(ms, 'linear', (e) => {
    const u = e; const x = lerp(x0, x1, EASE.outQuad(u)); const y = lerp(y0, y1, u) - 150 * 4 * u * (1 - u) * 0.9;
    const ang = EASE.outCubic(u) * 540;
    maskEl.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${lerp(1, 0.8, u).toFixed(3)})`);
  });
  maskEl.setAttribute('transform', 'translate(598 244) rotate(-8) scale(.8)');
}
function restoreMask() { if (maskEl) { thParts.head.insertBefore(maskEl, thParts.head.children[2] || null); maskEl.setAttribute('transform', ''); maskEl = null; } }

/* ---------------------------------------------------------------- camera */
const cam = { cx: 405, w: 640, by: 462, minV: 410 };
function applyCam() {
  const r = stageEl.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const aspect = r.height / r.width;
  const w = Math.max(cam.w, cam.minV / aspect);
  const h = w * aspect;
  svg.setAttribute('viewBox', `${(cam.cx - w / 2).toFixed(2)} ${(cam.by - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  farG.setAttribute('transform', `translate(${(-(cam.cx - 405) * 0.35).toFixed(2)} 0)`);
  midG.setAttribute('transform', `translate(${(-(cam.cx - 405) * 0.15).toFixed(2)} 0)`);
}
const camTo = (to, ms = T.camFrame, ease = 'inOutCubic') => tweenTo(cam, to, ms, ease);

/* ---------------------------------------------------------------- update + render */
function updateAll(dt) {
  catUpdate(dt);
  // twinkle, neon flicker
  const sec = clock.t / 1000;
  stars.forEach((s) => s.c.setAttribute('opacity', (s.base * (0.65 + 0.35 * Math.sin(sec * s.sp + s.ph))).toFixed(3)));
  neon.setAttribute('opacity', (Math.sin(sec * 2.1) > 0.97 || (sec % 9) > 8.85 ? 0.45 : 1).toFixed(2));
  // thief: idle glance every few seconds when sneaking
  if (th.mode === 'sneak' && !glancing && sec - lastGlance > 4.2 && !seqRunning) { lastGlance = sec; glancing = true; thGlance().then(() => { glancing = false; }); }
}
let glancing = false; let lastGlance = 2;
function renderAll() {
  catApply(); thApply(); applyCam();
  spot.setAttribute('opacity', (spotState.a * 0.9).toFixed(3));
  world.setAttribute('transform', shakeAmp > 0.01 ? `translate(${((Math.random() - 0.5) * 2 * shakeAmp).toFixed(2)} ${((Math.random() - 0.5) * 2 * shakeAmp).toFixed(2)})` : '');
}

/* ---------------------------------------------------------------- reset */
function resetAll() {
  tweens.clear(); holdWaiters.splice(0).forEach((r) => r()); clock.hold = 0; shakeAmp = 0;
  restoreMask(); flashChars(false); hidePlate(); fxLayer.innerHTML = ''; spotState.a = 0; binFront.setAttribute('opacity', 0);
  lid.setAttribute('transform', 'translate(0 -46)');
  catBase(); Object.assign(cat, { x: 160, y: 250, px: 160, py: 250, vx: 0, vy: 0 }); scarfAng.fill(90); tailAng.fill(200);
  thBase(); glancing = false; lastGlance = clock.t / 1000;
  catParts.root.removeAttribute('opacity'); catLayer.removeAttribute('opacity');
  catLayer.parentNode.appendChild(catLayer);
  Object.assign(cam, { cx: 405, w: 640, by: 462, minV: 410 });
}

/* ---------------------------------------------------------------- sequences (beat timings from sequences.js) */
const beatEl = $('#beat');
let token = 0; let seqRunning = false; let beatHook = null;
async function steps(list, tok) {
  for (const s of list) {
    if (tok !== token) return false;
    beatEl.textContent = s.name; beatHook?.(s.name);
    await Promise.all([s.run?.(), wait(s.dur || 0)]);
  }
  return true;
}
const IMPACT = { x: 584, y: 176 };
const HAT = { x: 650, y: 78 };

const catchSteps = () => [
  { name: 'camera', dur: T.camFrame, run: () => camTo({ cx: 405, w: 640 }, T.camFrame) },
  { name: 'anticipation', dur: T.anticipation, run: () => { catCrouch(); thSpooked(); } },
  { name: 'leap', dur: T.leapCatch, run: () => { speedLines(cat.x, cat.y, IMPACT.x, IMPACT.y, T.leapCatch, 110); return catLeap(IMPACT.x, IMPACT.y, 110, T.leapCatch, false); } },
  { name: 'impact (hit-stop)', dur: 0, run: async () => { flashChars(true); dust(IMPACT.x + 40, 250, 12, 90); shake(4); await hitStop(T.impact); flashChars(false); } },
  { name: 'reaction', dur: T.reaction, run: async () => {
      camTo({ cx: 640, w: 330, by: 262, minV: 250 }, 250);
      thStagger();
      cat.sx = 1.2; cat.sy = 0.8;
      await run(300, 'inOutSine', (e) => { cat.x = lerp(IMPACT.x, HAT.x, e); cat.y = lerp(IMPACT.y, HAT.y, e) - 46 * Math.sin(Math.PI * e); cat.sx = lerp(1.2, 0.95, e); cat.sy = lerp(0.8, 1.05, e); });
      cat.mode = 'idle'; catLand(); } },
  { name: 'loot', dur: T.loot, run: () => thDropSack() },
  { name: 'unmask', dur: T.unmask, run: async () => { catSwat(); await wait(150); await maskFly(T.unmask - 150); } },
  { name: 'reveal', dur: T.reveal, run: () => { setSpot(true, 650, 160); thPose({ eyes: 1.5, aBack1: 140, aFront1: -140 }, 160); } },
  { name: 'name plate', dur: T.plate, run: () => showPlate('catch') },
  { name: 'hold (cat smug, thief tied)', dur: 1500, run: () => { th.mode = 'tied'; cat.mode = 'idle'; thPose({ sit: 1, yarn: 1, aBack1: 14, aFront1: -14, aBack2: 6, aFront2: -6, legL: 70, legR: 74, eyes: 0.7, hatRot: -10, hatX: 6, rot: 0 }, 420, 'outBack'); catPose({ eyeScale: 0.5, earL: -10, earR: 10 }, 300); tweenTo(cat, { y: 98 }, 420, 'outBack'); } }
];

const fallSteps = () => [
  { name: 'camera', dur: T.camFrame, run: () => camTo({ cx: 405, w: 640, by: 462, minV: 410 }, T.camFrame) },
  { name: 'anticipation', dur: T.anticipation, run: () => { catCrouch(); thSpooked(); } },
  { name: 'leap (falls short)', dur: T.leapFall, run: () => catLeap(402, 232, 50, T.leapFall, false) },
  { name: 'realisation (freeze)', dur: T.realize, run: () => { cat.mode = 'freeze'; cat.sx = 1; cat.sy = 1; cat.rot = 0; return catPose({ bug: 1, bang: 1, eyeScale: 1.1, headRot: -10, legBF: 40, legBN: 30, legFF: -45, legFN: -35, earL: 18, earR: 20, scarfUp: 0.6 }, 120, 'outBack'); } },
  { name: 'drop', dur: T.drop, run: async () => { catFlail(T.drop); camTo({ cx: 400, w: 330, by: 470, minV: 250 }, T.drop, 'inOutCubic'); await run(T.drop, 'inQuad', (e) => { cat.y = lerp(232, 398, e); cat.rot = lerp(0, 220, e); }); } },
  { name: 'impact (hit-stop)', dur: 0, run: async () => {
      cat.mode = 'bin'; cat.rot = 0; cat.sx = 0.9; cat.sy = 0.9; cat.x = BIN_X - 22; cat.y = 436;
      binFront.setAttribute('opacity', 1); flashChars(true); dust(BIN_X, 418, 16, 120, '#B3AEE0'); shake(6); showClatter();
      run(600, 'outCubic', (e) => lid.setAttribute('transform', `translate(${(e * 50).toFixed(1)} ${(-46 - Math.sin(Math.PI * e) * 90 + e * 40).toFixed(1)}) rotate(${(e * 300).toFixed(0)})`));
      await hitStop(T.impact); flashChars(false); } },
  { name: 'reaction (dazed, banana peel)', dur: T.binReaction, run: async () => {
      cat.legBF = cat.legBN = cat.legFF = cat.legFN = 0; cat.bug = 0; cat.bang = 0; cat.dazed = 1; cat.peel = 1; cat.headRot = 14; cat.torsoRot = 0; cat.scarfUp = 0; cat.eyeScale = 1;
      await run(T.binReaction, 'outElastic', (e) => { cat.y = lerp(446, 424, e); }); } },
  { name: 'thief exit', dur: 0, run: async () => { await camTo({ cx: 560, w: 520, by: 330, minV: 300 }, T.camRoof);
      th.mode = 'tip'; await Promise.all([thPose({ aFront1: -150, aFront2: -40, hatY: -8, hatRot: -12, flip: 1 }, T.hatTip, 'outBack')]);
      await thPose({ aFront1: -8, aFront2: -6, hatY: 0, hatRot: 0 }, 120);
      th.mode = 'run'; glancing = true;
      th.lean = 14; thPose({ lean: 16, aBack1: -60, aFront1: 60, aBack2: -40, aFront2: -40 }, 200);
      run(1e6, 'linear', () => { if (th.mode === 'run') { const w = clock.t / 1000 * 18; th.legL = Math.sin(w) * 38; th.legR = -Math.sin(w) * 38; th.bob = -Math.abs(Math.sin(w)) * 6; } });
      await run(T.thiefRun, 'inQuad', (e) => { th.x = lerp(650, 1050, e); });
    } },
  { name: 'camera back down', dur: T.camBack, run: () => camTo({ cx: 405, w: 640, by: 462, minV: 410 }, T.camBack) },
  { name: 'card', dur: 1500, run: () => showPlate('fall') }
];
const clatter = el('text', { 'text-anchor': 'middle', 'font-family': 'VT323, monospace', 'font-size': 34, fill: '#FFB238', opacity: 0, 'letter-spacing': 3 }, world);
clatter.textContent = 'CLATTER!';
function showClatter() { clatter.setAttribute('x', BIN_X); clatter.setAttribute('y', 340); run(1100, 'linear', (e, k) => { clatter.setAttribute('opacity', k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1); clatter.setAttribute('y', 340 - 10 * EASE.outCubic(Math.min(1, e * 2))); }); }

async function playCatch() { token++; const tok = token; seqRunning = true; resetAll(); const ok = await steps(catchSteps(), tok); if (tok === token) seqRunning = false; return ok; }
async function playFall() { token++; const tok = token; seqRunning = true; resetAll(); const ok = await steps(fallSteps(), tok); if (tok === token) seqRunning = false; return ok; }
let loopOn = true; let loopTok = 0;
async function loop() {
  const my = ++loopTok;
  while (loopOn && my === loopTok) {
    if (!(await playCatch())) return; if (!loopOn || my !== loopTok) return;
    if (!(await playFall())) return; if (!loopOn || my !== loopTok) return;
  }
}

/* ---------------------------------------------------------------- controls */
const bLoop = $('#bLoop'); const bSlow = $('#bSlow');
$('#bCatch').onclick = () => { loopOn = false; loopTok++; bLoop.classList.remove('on'); bLoop.textContent = 'Loop: off'; playCatch(); };
$('#bFall').onclick = () => { loopOn = false; loopTok++; bLoop.classList.remove('on'); bLoop.textContent = 'Loop: off'; playFall(); };
bLoop.onclick = () => { loopOn = !loopOn; bLoop.classList.toggle('on', loopOn); bLoop.textContent = 'Loop: ' + (loopOn ? 'on' : 'off'); if (loopOn) loop(); else loopTok++; };
bSlow.onclick = () => { const slow = clock.scale === 1; clock.scale = slow ? 0.25 : 1; bSlow.classList.toggle('on', slow); bSlow.textContent = 'Slow-mo: ' + (slow ? 'on (×0.25)' : 'off'); };

/* ---------------------------------------------------------------- the leap frame strip (deterministic, ~100 ms apart) */
async function snapshot() {
  const r = stageEl.getBoundingClientRect();
  const c = svg.cloneNode(true);
  c.setAttribute('xmlns', NS); c.setAttribute('width', Math.round(r.width)); c.setAttribute('height', Math.round(r.height));
  const img = new Image();
  await new Promise((res) => { img.onload = res; img.onerror = res; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(c)); });
  return { img, w: r.width, h: r.height };
}
async function leapStrip() {
  loopOn = false; loopTok++; bLoop.classList.remove('on'); bLoop.textContent = 'Loop: off';
  const wasManual = clock.manual; clock.manual = true; plate.className = '';
  token++; const tok = token; resetAll(); seqRunning = true;
  let t0 = null; beatHook = (name) => { if (name === 'leap') t0 = clock.t; };
  const done = steps(catchSteps(), tok);
  const frames = []; let next = 0; const step = 1000 / 60;
  let guard = 0;
  while (guard++ < 600 && frames.length < 14) {
    advance(step);
    await new Promise((r) => setTimeout(r, 0));   // let the timeline's promises settle between frames
    if (t0 !== null && clock.t - t0 + 1e-6 >= next) { frames.push({ ...(await snapshot()), t: Math.round(next) }); next += 100; }
  }
  beatHook = null; token++; seqRunning = false; clock.manual = wasManual;
  // contact sheet
  const cols = 4; const tw = 360; const th2 = Math.round(frames[0].h / frames[0].w * tw);
  const rows = Math.ceil(frames.length / cols);
  const cv = $('#sheet'); cv.width = cols * (tw + 6); cv.height = rows * (th2 + 26);
  const x = cv.getContext('2d'); x.fillStyle = '#05040C'; x.fillRect(0, 0, cv.width, cv.height); x.font = '18px monospace'; x.fillStyle = '#FFB238';
  frames.forEach((f, i) => { const cx = (i % cols) * (tw + 6); const cy = Math.floor(i / cols) * (th2 + 26); x.drawImage(f.img, cx, cy + 22, tw, th2); x.fillText(`+${f.t} ms`, cx + 4, cy + 17); });
  $('#sheetwrap').classList.add('show');
  await done.catch?.(() => {});
}
$('#bStrip').onclick = () => leapStrip();
$('#bClose').onclick = () => { $('#sheetwrap').classList.remove('show'); resetAll(); loopOn = true; bLoop.classList.add('on'); bLoop.textContent = 'Loop: on'; loop(); };
window.__vec = { advance, clock, playCatch, playFall, leapStrip, cam };

/* ---------------------------------------------------------------- go */
let last = performance.now();
function frame(now) { const dt = Math.min(50, now - last); last = now; if (!clock.manual) advance(dt * clock.scale); requestAnimationFrame(frame); }
resetAll(); renderAll();
requestAnimationFrame(frame);
window.addEventListener('resize', renderAll);
loop();
