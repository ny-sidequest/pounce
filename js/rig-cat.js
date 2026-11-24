// The rigged vector cat: body, head, 2 ears, 4 legs, 3 tail segments, a flat neck band with a knot and two ribbon tails
// (6-point verlet chains). Every part is a separate SVG node, driven by code (transforms only).
import { el, capsule, chain } from './svgx.js';
import { clamp, lerp, rad, EASE } from './motion.js';

const catPart = (parent, tag, attrs) => el(tag, { fill: 'url(#gCat)', stroke: 'url(#rimCat)', 'stroke-width': 1.5, 'stroke-linejoin': 'round', ...attrs }, parent);

/** createCat(parentSVGGroup, runtime, { scale }) -> rig. Position/scale are in the PARENT's units. */
export function createCat(parent, rt, { scale = 1 } = {}) {
const BASE = scale;
const layer = el('g', {}, parent);
const cat = { x: 160, y: 250, rot: 0, sx: 1, sy: 1, torsoY: 0, torsoRot: 0, headRot: 0, earL: 0, earR: 0,
  legBF: 0, legBN: 0, legFF: 0, legFN: 0, legScale: 1, tailBase: 200, tailCurl: 0, tailAmp: 14, tailSpeed: 3, blink: 0, lid: 0, eyeScale: 1, bug: 0, dazed: 0, bang: 0, peel: 0,
  mode: 'idle', wiggle: 0, scarfUp: 0, attach: false, cs: BASE, vx: 0, vy: 0, px: 160, py: 250, flash: 0, swat: 0 };
const catParts = {};
{
  const root = el('g', {}, layer); catParts.root = root;
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
  // scarf: a flat band that wraps the neck (partly behind the head) + a small knot at the back of the neck.
  // The two ribbon tails are drawn in world space (see updateScarf), behind or in front of the body.
  const band = el('g', {}, root); catParts.band = band; root.insertBefore(band, hg);
  el('path', { d: 'M5 -40 C13 -27 30 -22 47 -27 L47 -22 C29 -16 10 -21 2 -36 Z', fill: '#C2306F' }, band);                    // underside shade
  el('path', { d: 'M7 -50 C15 -38 31 -33 47 -37 L48 -26 C30 -20 13 -27 4 -42 Z', fill: '#FF4F9A' }, band);                     // the band
  el('path', { d: 'M9 -49 C17 -38 31 -34 46 -36', fill: 'none', stroke: '#FF9CC8', 'stroke-width': 1.3, 'stroke-linecap': 'round', opacity: 0.8 }, band);
  el('path', { d: 'M10 -41 C18 -32 31 -28 46 -30', fill: 'none', stroke: '#C2306F', 'stroke-width': 1.2, 'stroke-linecap': 'round', opacity: 0.75 }, band);   // soft fold line
  el('ellipse', { cx: 11, cy: -45, rx: 6.5, ry: 5.6, fill: '#FF4F9A', stroke: '#FFD6E8', 'stroke-opacity': 0.5, 'stroke-width': 1 }, band);                  // knot
  el('path', { d: 'M6 -43 C9 -39 14 -39 17 -42 C16 -38 12 -36 8 -38 Z', fill: '#C2306F' }, band);
  el('path', { d: 'M8 -48 C10 -50 13 -50 15 -48', fill: 'none', stroke: '#FF9CC8', 'stroke-width': 1, 'stroke-linecap': 'round' }, band);
}
const tailAng = [200, 200, 200];

/** a point in the cat's local space after the torso's lean/wiggle (pivot at the hips), so head, legs, band, tail and knot all follow the body */
const torsoPt = (x, y) => {
  const ty = cat.torsoY; const a = rad(cat.torsoRot + cat.wiggle); const c = Math.cos(a); const sn = Math.sin(a);
  const px = -30; const py = -34 + ty; const dx = x - px; const dy = (y + ty) - py;
  return [px + dx * c - dy * sn, py + dx * sn + dy * c];
};
const catApply = () => {
  const s = cat;
  const breathe = s.mode === 'idle' ? Math.sin(rt.t / 1000 * 2.3) * 1 : 0;
  const sxx = s.sx * s.cs; const syy = s.sy * s.cs;
  catParts.root.setAttribute('transform', `translate(${s.x.toFixed(2)} ${s.y.toFixed(2)}) rotate(${s.rot.toFixed(2)}) scale(${sxx.toFixed(3)} ${syy.toFixed(3)})`);
  const ty = s.torsoY;
  const tT = `translate(0 ${ty.toFixed(2)}) rotate(${(s.torsoRot + s.wiggle).toFixed(2)} -30 -34)`;
  catParts.torso.setAttribute('transform', `${tT} scale(1 ${(1 + breathe * 0.014).toFixed(4)})`);
  catParts.band.setAttribute('transform', tT);
  const leg = (g, hx, ang) => { const [lx, ly] = torsoPt(hx, -30); g.setAttribute('transform', `translate(${lx.toFixed(2)} ${ly.toFixed(2)}) rotate(${ang.toFixed(2)}) scale(1 ${clamp((-ly - 2) / 28 * s.legScale, 0.35, 3).toFixed(3)})`); };
  leg(catParts.legBF, -26, s.legBF); leg(catParts.legBN, -18, s.legBN); leg(catParts.legFF, 20, s.legFF); leg(catParts.legFN, 26, s.legFN);
  const [hx, hy] = torsoPt(32, -54 - breathe * 0.5);
  catParts.head.setAttribute('transform', `translate(${hx.toFixed(2)} ${hy.toFixed(2)}) rotate(${(s.headRot + s.torsoRot * 0.35).toFixed(2)})`);
  catParts.earL.setAttribute('transform', `rotate(${s.earL.toFixed(2)} -6 -12)`);
  catParts.earR.setAttribute('transform', `rotate(${s.earR.toFixed(2)} 10 -12)`);
  const bl = clamp(s.blink + s.lid * 0.5, 0, 1);
  catParts.eyes.forEach(({ g, cx }) => g.setAttribute('transform', `translate(${cx} -3) scale(${(s.eyeScale).toFixed(3)} ${(s.eyeScale * (1 - bl * 0.94)).toFixed(3)}) translate(${-cx} 3)`));
  catParts.bug.setAttribute('opacity', s.bug); catParts.dazed.setAttribute('opacity', s.dazed);
  catParts.dazed.setAttribute('transform', `rotate(${(rt.t * 0.4) % 360} 5 -3)`);
  catParts.bangG.setAttribute('opacity', s.bang); catParts.peel.setAttribute('opacity', s.peel);
  catParts.eyes.forEach(({ g }) => g.setAttribute('opacity', s.dazed > 0.5 ? 0 : 1));
};

function catUpdate(dt) {
  const s = cat; const sec = rt.t / 1000;
  // velocity (world units / s) for the scarf's wind
  if (dt > 0) { s.vx = lerp(s.vx, (s.x - s.px) / (dt / 1000), 0.4); s.vy = lerp(s.vy, (s.y - s.py) / (dt / 1000), 0.4); }
  s.px = s.x; s.py = s.y;
  // blink every few seconds when relaxed
  if (s.mode === 'idle') { const ph = (sec % 3.4); s.blink = ph > 3.2 ? Math.sin(((ph - 3.2) / 0.2) * Math.PI) : 0; }
  // tail: 3 segments with follow-through
  const swish = s.mode === 'idle' || s.mode === 'crouch';
  for (let i = 0; i < 3; i++) {
    const target = s.tailBase + i * s.tailCurl + (swish ? Math.sin(sec * s.tailSpeed - i * 0.9) * s.tailAmp * (0.5 + i * 0.5) : 0) + i * 6 * (s.mode === 'leap' ? -1 : 1);
    tailAng[i] += (target - tailAng[i]) * (1 - Math.exp(-dt / (36 + i * 42)));
  }
  const tp = chain(torsoPt(-44, -36), tailAng, [24, 22, 20]);
  const tw = [[8, 6.4], [6.4, 4.8], [4.8, 3]];
  catParts.tail.forEach((p, i) => p.setAttribute('d', capsule(tp[i][0], tp[i][1], tp[i + 1][0], tp[i + 1][1], tw[i][0], tw[i][1])));
  if (rt.still) scarfSettle(); else updateScarf(dt);
}

/* ---------------------------- scarf: two flat ribbon tails, a 6-point verlet chain each, drawn as one smooth closed path */
const KNOT = [12, -44];                      // knot position in the cat's local space (back-left of the neck)
const TAILS = [
  { L: 46, w0: 10, w1: 5, ph: 0.0, rest: -0.35, p: [], q: [], el: null, front: false },
  { L: 34, w0: 9, w1: 4.5, ph: 2.2, rest: 0.05, p: [], q: [], el: null, front: false }
];
for (const t of TAILS) { t.el = el('path', { fill: '#FF4F9A', stroke: '#FFD6E8', 'stroke-opacity': 0.55, 'stroke-width': 0.9, 'stroke-linejoin': 'round' }, catParts.root); catParts.root.insertBefore(t.el, catParts.band); }
// ribbons are simulated in world space and drawn in the cat's local space: behind the band/head when trailing, in front of the head when swinging forward
function toLocal(pt) {
  const s = cat; const r = rad(s.rot); const c = Math.cos(r); const sn = Math.sin(r);
  const dx = pt[0] - s.x; const dy = pt[1] - s.y;
  return [(c * dx + sn * dy) / (s.sx * s.cs), (-sn * dx + c * dy) / (s.sy * s.cs)];
}
function knotWorld() {
  const s = cat; const r = rad(s.rot); const c = Math.cos(r); const sn = Math.sin(r);
  const [kx, ky] = torsoPt(KNOT[0], KNOT[1]);
  const lx = kx * s.sx * s.cs; const ly = ky * s.sy * s.cs;
  return [s.x + c * lx - sn * ly, s.y + sn * lx + c * ly];
}
let knotPrev = null; let scarfReady = false;
function scarfReset() {
  const k = knotWorld(); knotPrev = k.slice(); scarfReady = true;
  for (const t of TAILS) {
    const seg = t.L * cat.cs / 5; t.p = []; t.q = [];
    for (let i = 0; i < 6; i++) { const pt = [k[0] + (t.rest * i * seg), k[1] + i * seg * 0.95]; t.p.push(pt); t.q.push(pt.slice()); }
  }
}
function updateScarf(dt) {
  if (!scarfReady) scarfReset();
  const s = cat; const sec = rt.t / 1000;
  const K = knotWorld();
  const sdt = Math.max(dt, 1) / 1000;
  const kv = [(K[0] - knotPrev[0]) / sdt, (K[1] - knotPrev[1]) / sdt];
  knotPrev = K.slice();
  const sp = Math.hypot(kv[0], kv[1]);
  if (sp > 3500) { scarfReset(); }                         // a teleport (sequence jump): don't whip the ribbon
  const SUB = 2; const h = sdt / SUB;
  const damp = Math.pow(0.85, (sdt * 1000) / 16.67 / SUB);
  for (let step = 0; step < SUB; step++) {
    for (const t of TAILS) {
      const rest = t.L * s.cs / 5;
      t.p[0] = K.slice(); t.q[0] = K.slice();
      for (let i = 1; i < 6; i++) {
        const p = t.p[i]; const q = t.q[i];
        let ax = (-70 * (1 - i / 10) + t.rest * 40) * s.cs;         // hangs slightly back
        let ay = 520 * s.cs;                                      // light gravity
        const push = 0.34 * h;                              // pushed opposite to the cat's velocity (trail in a leap, stream up in a fall)
        ay -= s.scarfUp * 1500;
        if (s.mode === 'idle') ax += Math.sin(sec * 2.3 + t.ph + i * 0.5) * 45 * (i / 5);   // sways with the breathing
        const vx = (p[0] - q[0]) * damp; const vy = (p[1] - q[1]) * damp;
        q[0] = p[0]; q[1] = p[1];
        p[0] += vx + ax * h * h - kv[0] * push * (i / 5); p[1] += vy + ay * h * h - kv[1] * push * (i / 5);
      }
      for (let it = 0; it < 5; it++) for (let i = 1; i < 6; i++) {
        const a = t.p[i - 1]; const b = t.p[i];
        let dx = b[0] - a[0]; let dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1e-6; const diff = (l - rest) / l;
        if (i === 1) { b[0] -= dx * diff; b[1] -= dy * diff; } else { a[0] += dx * diff * 0.5; a[1] += dy * diff * 0.5; b[0] -= dx * diff * 0.5; b[1] -= dy * diff * 0.5; }
      }
      for (let i = 2; i < 6; i++) {                         // a little bending stiffness: smooth, cloth-like arcs, no kinks
        const a = t.p[i - 2]; const b = t.p[i - 1]; const c = t.p[i];
        c[0] += (2 * b[0] - a[0] - c[0]) * 0.12; c[1] += (2 * b[1] - a[1] - c[1]) * 0.12;
      }
      t.p[0] = K.slice();
    }
  }
  const f = (n) => n.toFixed(1);
  for (const [ti, t] of TAILS.entries()) {
    // Catmull-Rom through the chain, then offset by the taper width to build the ribbon outline
    const P = t.p; const D = [];
    for (let i = 0; i < 5; i++) {
      const p0 = P[Math.max(0, i - 1)]; const p1 = P[i]; const p2 = P[i + 1]; const p3 = P[Math.min(5, i + 2)];
      for (let u = 0; u < 5; u++) {
        const k = u / 5; const k2 = k * k; const k3 = k2 * k;
        D.push([0, 1].map((c) => 0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * k + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * k2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * k3)));
      }
    }
    D.push(P[5].slice());
    const n = D.length; const Lft = []; const Rgt = [];
    const speedTw = clamp(sp / 400, 0, 1);
    let midCos = 1;
    for (let i = 0; i < n; i++) {
      const a = D[Math.max(0, i - 1)]; const b = D[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0]; let ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const u = i / (n - 1);
      const tw = sec * (3 + 4 * speedTw) + t.ph + u * (1.5 + 3 * speedTw);
      const cs = Math.cos(tw);
      if (i === Math.round((n - 1) / 2)) midCos = cs;
      const hw = (lerp(t.w0, t.w1, u) / 2) * (0.5 + 0.5 * Math.abs(cs));
      Lft.push([D[i][0] - ty * hw, D[i][1] + tx * hw]); Rgt.push([D[i][0] + ty * hw, D[i][1] - tx * hw]);
      if (i === n - 1) { var T = [tx, ty]; }
    }
    const tip = D[n - 1];
    const notch = [tip[0] - T[0] * 3.6, tip[1] - T[1] * 3.6];                       // an angled / forked cut at the tip
    const Ll = Lft.map(toLocal); const Rl = Rgt.map(toLocal); const nl = toLocal(notch);
    let d = `M${f(Ll[0][0])} ${f(Ll[0][1])}`;
    for (let i = 1; i < n; i++) d += `L${f(Ll[i][0])} ${f(Ll[i][1])}`;
    d += `L${f(nl[0])} ${f(nl[1])}`;
    for (let i = n - 1; i >= 0; i--) d += `L${f(Rl[i][0])} ${f(Rl[i][1])}`;
    t.el.setAttribute('d', d + 'Z');
    t.el.setAttribute('fill', midCos >= 0 ? '#FF4F9A' : '#C2306F');                    // darker underside when the ribbon twists over
    // trailing -> behind the body; swinging forward -> in front (hysteresis so it doesn't flicker)
    const fwd = P[5][0] - K[0];
    const wantFront = t.front ? fwd > 0 : fwd > 10;
    if (wantFront !== t.front) { t.front = wantFront; if (wantFront) catParts.root.appendChild(t.el); else catParts.root.insertBefore(t.el, catParts.band); }
  }
}

function lerpAngle(a, b, t) { let d = ((b - a + 540) % 360) - 180; return a + d * t; }

/* ---- cat poses (tweens over the rig) */
const catBase = () => Object.assign(cat, { attach: false, cs: BASE, rot: 0, sx: 1, sy: 1, torsoY: 0, torsoRot: 0, headRot: 0, earL: 0, earR: 0, legBF: 0, legBN: 0, legFF: 0, legFN: 0, legScale: 1,
  tailBase: 200, tailCurl: 0, tailAmp: 14, tailSpeed: 3, blink: 0, lid: 0, eyeScale: 1, bug: 0, dazed: 0, bang: 0, peel: 0, mode: 'idle', wiggle: 0, scarfUp: 0, swat: 0 });
const catPose = (to, ms = 160, ease = 'outCubic') => rt.tween(cat, to, ms, ease);
async function catCrouch() {
  cat.mode = 'crouch';
  await catPose({ torsoY: 16, torsoRot: -4, headRot: 6, legBF: -28, legBN: -20, legFF: 34, legFN: 26, eyeScale: 1.22, tailBase: 190, tailAmp: 10, tailSpeed: 7, earL: -8, earR: 8 }, 200);
  // the classic bum wiggle
  rt.run(1e6, 'linear', () => { if (cat.mode === 'crouch') cat.wiggle = Math.sin(rt.t / 1000 * 26) * 4.2; });
}
async function catLeap(x1, y1, apex, ms, endPose = true) {
  cat.mode = 'leap'; cat.wiggle = 0;
  const x0 = cat.x; const y0 = cat.y;
  catPose({ torsoY: -4, torsoRot: 0, legBF: 62, legBN: 70, legFF: -70, legFN: -62, legScale: 0.92, eyeScale: 1.3, headRot: -6, earL: 18, earR: 20, tailBase: 188, tailAmp: 3 }, ms * 0.2, 'outCubic');
  await rt.run(ms, 'inOutSine', (e) => {
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
  await rt.run(380, 'outElastic', (e) => { cat.sx = lerp(1.28, 1, e); cat.sy = lerp(0.7, 1, e); });
}
async function catSettle(ms = 300) {
  cat.mode = 'idle'; cat.wiggle = 0;
  await catPose({ rot: 0, sx: 1, sy: 1, torsoY: 0, torsoRot: 0, headRot: 0, legBF: 0, legBN: 0, legFF: 0, legFN: 0, legScale: 1, eyeScale: 1, earL: 0, earR: 0, tailBase: 200, tailCurl: 0, tailAmp: 14, tailSpeed: 3, scarfUp: 0 }, ms);
}
/** sit_smug: haunches down, front legs straight, chin up, eyes half shut, tail curled down and around */
const SIT = { torsoY: 4, torsoRot: -42, headRot: 10, legBF: -82, legBN: -74, legFF: 0, legFN: 3, legScale: 1, eyeScale: 0.55, earL: -6, earR: 6, tailBase: 118, tailCurl: -34, tailAmp: 2, tailSpeed: 1.2, rot: 0, sx: 1, sy: 1 };
const catSit = (ms = 320) => { cat.mode = 'sit'; cat.wiggle = 0; return catPose(SIT, ms, 'outBack'); };
async function catSwat() {
  if (cat.attach) {                                   // seated on the shoulder: only the front paw and head move
    await catPose({ legFN: -62, headRot: 4, torsoRot: -38 }, 110, 'outCubic');
    await catPose({ legFN: -100, headRot: 16, torsoRot: -35 }, 90, 'outBack');
    await catPose({ legFN: SIT.legFN, headRot: SIT.headRot, torsoRot: SIT.torsoRot }, 170, 'inOutSine');
    return;
  }
  cat.mode = 'swat';
  await catPose({ legFN: -50, torsoRot: -6, headRot: 8, eyeScale: 0.8 }, 110, 'outCubic');
  await catPose({ legFN: -100, torsoRot: 4, headRot: -2 }, 90, 'outBack');
  await catPose({ legFN: -20, torsoRot: 0, headRot: 0, eyeScale: 1 }, 160, 'inOutSine');
}
async function catFlail(ms) {
  cat.mode = 'fall';
  rt.run(ms, 'linear', () => { if (cat.mode !== 'fall') return; const w = rt.t / 1000 * 24; cat.legBF = Math.sin(w) * 55; cat.legBN = Math.sin(w + 2) * 55; cat.legFF = Math.sin(w + 1) * 60 - 30; cat.legFN = Math.sin(w + 3) * 60 - 30; cat.tailBase = 200 + Math.sin(w * 0.7) * 30; });
}

/* ---------------------------------------------------------------- the public rig API */
const IDLE = { rot: 0, sx: 1, sy: 1, torsoY: 0, torsoRot: 0, headRot: 0, earL: 0, earR: 0, legBF: 0, legBN: 0, legFF: 0, legFN: 0, legScale: 1,
  tailBase: 200, tailCurl: 0, tailAmp: 14, tailSpeed: 3, eyeScale: 1, bug: 0, dazed: 0, bang: 0, peel: 0, scarfUp: 0, lid: 0 };
const deco = {};
{ // props for the title poses: shades, z, aura, sparkle, and the box / bin the cat sits in
  const hg = catParts.head;
  deco.shades = el('g', { opacity: 0 }, hg);
  el('path', { d: 'M-10 -9 L22 -9 Q22 3 16 3 L10 3 Q6 -1 2 3 L-4 3 Q-10 3 -10 -9 Z', fill: '#05040C', stroke: '#8B86B8', 'stroke-width': 1.2, 'stroke-linejoin': 'round' }, deco.shades);
  el('path', { d: 'M-6 -7 L-1 -7 L-4 -3 Z M12 -7 L17 -7 L14 -3 Z', fill: '#8B86B8', opacity: 0.7 }, deco.shades);
  deco.z = el('g', { opacity: 0 }, hg);
  [[26, -30, 12], [34, -44, 16], [44, -62, 20]].forEach(([x, y, s]) => { const t = el('text', { x, y, 'font-family': 'Fredoka, sans-serif', 'font-weight': 700, 'font-size': s, fill: '#F4E7C3' }, deco.z); t.textContent = 'z'; });
  deco.aura = el('g', { opacity: 0 }, layer); layer.insertBefore(deco.aura, catParts.root); // a soft glow behind the cat
  el('circle', { cx: 0, cy: -44, r: 78, fill: 'url(#gHalo)' }, deco.aura);
  deco.spark = el('g', { opacity: 0 }, catParts.root);
  [[48, -88, 7], [-30, -90, 5], [62, -50, 4]].forEach(([x, y, r]) => el('path', { d: `M${x} ${y - r} L${x + r * 0.28} ${y - r * 0.28} L${x + r} ${y} L${x + r * 0.28} ${y + r * 0.28} L${x} ${y + r} L${x - r * 0.28} ${y + r * 0.28} L${x - r} ${y} L${x - r * 0.28} ${y - r * 0.28} Z`, fill: '#FFE9B0' }, deco.spark));
  deco.box = el('g', { opacity: 0 }, catParts.root);                      // a cardboard box the cat sits in (front panel over the legs)
  el('path', { d: 'M-52 -34 L52 -34 L48 6 L-48 6 Z', fill: '#B98A55', stroke: '#E6BE88', 'stroke-width': 1.4, 'stroke-linejoin': 'round' }, deco.box);
  el('path', { d: 'M-52 -34 L-60 -48 L-20 -42 L-20 -34 Z M52 -34 L60 -48 L20 -42 L20 -34 Z', fill: '#9A6F40', stroke: '#E6BE88', 'stroke-width': 1, 'stroke-linejoin': 'round' }, deco.box);
  el('path', { d: 'M-40 -22 L40 -22 M-40 -10 L40 -10', stroke: '#7A5530', 'stroke-width': 1.2, opacity: 0.6 }, deco.box);
  el('rect', { x: -14, y: -34, width: 28, height: 6, rx: 1, fill: '#D9B07A' }, deco.box);
  deco.bin = el('g', { opacity: 0 }, catParts.root);                      // a bin the cat sits in
  el('path', { d: 'M-34 -38 L34 -38 L28 6 L-28 6 Z', fill: 'url(#gBin)', stroke: '#C7C2F0', 'stroke-opacity': 0.55, 'stroke-width': 1.4, 'stroke-linejoin': 'round' }, deco.bin);
  for (const x of [-16, 0, 16]) el('line', { x1: x, y1: -32, x2: x * 0.9, y2: 0, stroke: '#2E2B58', 'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: 0.7 }, deco.bin);
}
const setDeco = (on = {}) => { for (const k in deco) deco[k].setAttribute('opacity', on[k] ? 1 : 0); };
const resetState = () => { catBase(); setDeco(); layer.removeAttribute('opacity'); catParts.eyes.forEach(({ g }) => g.querySelector('ellipse').setAttribute('fill', '#FFB238')); };

/** Static title poses: the cat's "personality" for the results screens. */
const TITLES = {
  title_psychic: () => ({ pose: { eyeScale: 1.25, headRot: -6, earL: -10, earR: 10, tailBase: 205, tailAmp: 4 }, deco: { aura: 1, spark: 1 }, eyes: '#FFFFFF' }),
  title_cool: () => ({ pose: { headRot: 4, eyeScale: 0.9, earL: -6, earR: 6 }, deco: { shades: 1 } }),
  title_tilt: () => ({ pose: { headRot: 20, eyeScale: 1.1, earL: 8, earR: -4 } }),
  title_sleepy: () => ({ pose: { headRot: 14, eyeScale: 0.5, lid: 1, torsoY: 10, legBF: -60, legBN: -55, legFF: 30, legFN: 24, earL: 24, earR: -24, tailBase: 150, tailCurl: -20, tailAmp: 2 }, deco: { z: 1 } }),
  title_box: () => ({ pose: { torsoY: 8, headRot: -4, eyeScale: 1.1, legScale: 0.7 }, deco: { box: 1 } }),
  title_bin: () => ({ pose: { headRot: 14, dazed: 0, peel: 1, eyeScale: 1.05, torsoY: 8 }, deco: { bin: 1 } }),
  title_scaredy: () => ({ pose: { sx: 1.1, sy: 1.12, torsoY: -4, headRot: 8, eyeScale: 1.35, earL: 22, earR: -22, tailBase: 160, tailCurl: -40, tailAmp: 6, tailSpeed: 14, legFF: -8, legFN: 8 } })
};
function applyTitle(name) {
  const t = TITLES[name]?.(); if (!t) return false;
  resetState(); Object.assign(cat, IDLE, t.pose, { mode: 'title' }); setDeco(t.deco);
  catParts.eyes.forEach(({ g }) => g.querySelector('ellipse').setAttribute('fill', t.eyes || '#FFB238'));
  return true;
}

const walkLoop = () => { if (cat.mode === 'walk') { const w = rt.t / 1000 * 11; cat.legBF = Math.sin(w) * 26; cat.legBN = Math.sin(w + Math.PI) * 26; cat.legFF = Math.sin(w + Math.PI) * 26; cat.legFN = Math.sin(w) * 26; cat.torsoY = -Math.abs(Math.sin(w)) * 2.4; cat.tailBase = 205 + Math.sin(w * 0.5) * 8; cat.headRot = 2; } };

/** play a named pose/animation; resolves when it has settled (looping ones settle immediately) */
function play(name) {
  if (name.startsWith('title_')) { applyTitle(name); return Promise.resolve(); }
  if (name !== 'bin') setDeco({});
  cat.wiggle = cat.mode === 'crouch' && name === 'crouch' ? cat.wiggle : 0;
  switch (name) {
    case 'idle': cat.mode = 'idle'; return catPose(IDLE, 220);
    case 'alert': cat.mode = 'idle'; return catPose({ ...IDLE, earL: 8, earR: -8, eyeScale: 1.2, headRot: -5, torsoY: -1 }, 130).then(() => rt.wait(120));
    case 'droop': cat.mode = 'idle'; return catPose({ ...IDLE, earL: -30, earR: 30, headRot: 10, eyeScale: 0.78, torsoY: 3 }, 220);
    case 'hop': cat.mode = 'leap'; return catPose({ ...IDLE, torsoY: -2, legBF: 44, legBN: 52, legFF: -52, legFN: -44, eyeScale: 1.18, earL: 12, earR: 12, tailBase: 192, tailAmp: 3 }, 100);
    case 'crouch': return catCrouch();
    case 'leap': cat.mode = 'leap'; return catPose({ ...IDLE, torsoY: -4, legBF: 62, legBN: 70, legFF: -70, legFN: -62, legScale: 0.92, eyeScale: 1.3, headRot: -6, earL: 18, earR: 20, tailBase: 188, tailAmp: 3 }, 90);
    case 'land': cat.mode = 'idle'; return catLand();
    case 'swat': return catSwat();
    case 'sit_smug': return catSit();
    case 'realize': cat.mode = 'freeze'; return catPose({ ...IDLE, bug: 1, bang: 1, eyeScale: 1.1, headRot: -10, legBF: 40, legBN: 30, legFF: -45, legFN: -35, earL: 18, earR: 20, scarfUp: 0.6 }, 120, 'outBack');
    case 'fall': cat.mode = 'fall'; catParts.bangG.setAttribute('opacity', 0); catPose({ bang: 0, bug: 0, eyeScale: 1.2 }, 80); catFlail(6000); return Promise.resolve();
    case 'bin': cat.mode = 'bin'; setDeco({ bin: 1 }); Object.assign(cat, { legBF: 0, legBN: 0, legFF: 0, legFN: 0, bug: 0, bang: 0, dazed: 1, peel: 1, headRot: 14, torsoRot: 0, torsoY: 12, scarfUp: 0, eyeScale: 1, sx: 0.95, sy: 0.95 }); return rt.tween(cat, { sx: 1, sy: 1 }, 300, 'outElastic');
    case 'walk': cat.mode = 'walk'; return catPose({ ...IDLE, eyeScale: 1 }, 120);
    default: cat.mode = 'idle'; return catPose(IDLE, 200);
  }
}
const stopTick = rt.every((dt, t, held) => { if (held) return; if (cat.mode === 'walk') walkLoop(); catUpdate(dt); catApply(); });
function scarfSettle() { if (!scarfReady) scarfReset(); }
function settle(n = 50) { const was = rt.still; rt.still = false; for (let i = 0; i < n; i++) { catUpdate(16); } rt.still = was; catApply(); }
resetState(); catApply();
return {
  layer, state: cat, play, pose: catPose, apply: catApply, update: catUpdate, settle, resetState, setDeco, applyTitle, SIT,
  leap: catLeap, land: catLand, sit: catSit, swat: catSwat,
  place(x, y) { cat.x = x; cat.y = y; cat.px = x; cat.py = y; },
  destroy() { stopTick(); layer.remove(); }
};
}
