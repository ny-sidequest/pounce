// The rigged vector thief: coat, head, hat, mask, 2 arms, 2 legs, and the amber-glowing "?" sack. Separate SVG parts, code-driven.
import { el, capsule } from './svgx.js';
import { clamp, lerp, rad, EASE } from './motion.js';

/** the cream mask band as a standalone shape (for the mask that flies off, and the one lying on the roof) */
export function maskShape(parent, attrs = {}) {
  const g = el('g', attrs, parent);
  el('path', { d: 'M-17 -9 Q0 -14 17 -9 L17 3 Q0 8 -17 3 Z', fill: 'url(#gMask)', stroke: '#FFF6DC', 'stroke-opacity': 0.7, 'stroke-width': 1 }, g);
  [-7, 7].forEach((x) => { el('ellipse', { cx: x, cy: -3, rx: 4.4, ry: 3, fill: '#0A0716' }, g); el('circle', { cx: x + 1.4, cy: -3.6, r: 1.2, fill: '#FFFFFF' }, g); });
  return g;
}

export function createThief(parent, rt, { scale = 1 } = {}) {
const BASE = scale;
const layer = el('g', {}, parent);
const th = { x: 650, y: 250, rot: 0, sx: 1, sy: 1, lean: 0, bob: 0, flip: 1, headRot: 0, hatY: 0, hatRot: 0, hatX: 0, aBack1: 30, aBack2: -28, aFront1: -8, aFront2: -6, legL: 0, legR: 0, sackSwing: 0, sackY: 0, sackX: 0, sackRot: 0, sackOn: 1, qA: 0, qY: 0,
  eyes: 1, face: 0, mode: 'sneak', yarn: 0, sit: 0, flash: 0, hatOff: 0 };
const thParts = {};
{
  const root = el('g', {}, layer); thParts.root = root;
  thParts.glow = el('g', {}, root);
  el('circle', { cx: -58, cy: -72, r: 62, fill: 'url(#gGlow)' }, thParts.glow);
  thParts.sackG = el('g', {}, root);                                    // sack (swings from the strap)
  el('path', { d: 'M-24 -112 Q-44 -104 -52 -92', fill: 'none', stroke: '#1E1640', 'stroke-width': 4, 'stroke-linecap': 'round' }, thParts.sackG);
  el('path', { d: 'M-52 -98 C-80 -94 -82 -50 -62 -42 C-46 -38 -30 -50 -34 -74 C-36 -90 -44 -96 -52 -98 Z', fill: 'url(#gSack)', stroke: '#FFE9B0', 'stroke-opacity': 0.8, 'stroke-width': 1.5, filter: 'url(#glow)' }, thParts.sackG);
  el('path', { d: 'M-52 -98 C-48 -104 -42 -102 -40 -97 C-44 -97 -48 -96 -52 -98 Z', fill: '#C46C10' }, thParts.sackG);
  el('path', { d: 'M-68 -78 C-74 -66 -70 -54 -62 -50', fill: 'none', stroke: '#8A4A0C', 'stroke-width': 1.4, 'stroke-dasharray': '3 3', 'stroke-linecap': 'round' }, thParts.sackG);
  const q = el('text', { x: -56, y: -60, 'text-anchor': 'middle', 'font-family': 'Exo 2, sans-serif', 'font-weight': 800, 'font-size': 34, fill: '#6B3E0A' }, thParts.sackG); q.textContent = '?';
  thParts.qFloat = el('text', { x: -56, y: -70, 'text-anchor': 'middle', 'font-family': 'Exo 2, sans-serif', 'font-weight': 800, 'font-size': 36, fill: '#FFB238', opacity: 0 }, root); thParts.qFloat.textContent = '?';
  thParts.legL = el('g', {}, root); thParts.legR = el('g', {}, root);
  for (const g of [thParts.legL, thParts.legR]) { el('path', { d: capsule(0, 0, 0, 12, 9, 8), fill: '#1B1338' }, g); el('path', { d: 'M-10 10 Q-10 4 -2 4 L10 4 Q16 10 14 14 L-10 14 Z', fill: '#0E0A1E', stroke: 'url(#rimCoat)', 'stroke-width': 1.2 }, g); }
  thParts.armB = el('g', {}, root);                                      // back arm (near the cat)
  thParts.coat = el('g', {}, root);
  el('path', { d: 'M-30 -112 C-42 -70 -44 -30 -46 -4 L42 -4 C38 -34 36 -72 30 -112 C14 -122 -14 -122 -30 -112 Z', fill: 'url(#gCoat)', stroke: 'url(#rimCoat)', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, thParts.coat);
  for (const d of ['M-12 -96 C-16 -60 -16 -30 -18 -8', 'M10 -96 C14 -60 16 -30 18 -8', 'M-2 -100 L-2 -10']) el('path', { d, fill: 'none', stroke: '#1B1240', 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.55 }, thParts.coat);
  for (const d of ['M-22 -92 C-26 -60 -26 -34 -30 -10', 'M22 -90 C28 -60 28 -34 32 -10']) el('path', { d, fill: 'none', stroke: '#9C90E8', 'stroke-width': 1.3, 'stroke-linecap': 'round', opacity: 0.35 }, thParts.coat);
  el('path', { d: 'M-46 -8 Q0 4 42 -8 L42 -4 L-46 -4 Z', fill: '#1B1240', opacity: 0.6 }, thParts.coat);
  thParts.yarn = el('g', { opacity: 0 }, root);
  for (const y of [-92, -66, -40]) { el('path', { d: `M-38 ${y} Q0 ${y + 14} 36 ${y}`, fill: 'none', stroke: '#FF2E88', 'stroke-width': 5, 'stroke-linecap': 'round' }, thParts.yarn); el('path', { d: `M-38 ${y + 2} Q0 ${y + 16} 36 ${y + 2}`, fill: 'none', stroke: '#B72A68', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, thParts.yarn); }
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
  const bob = s.mode === 'sneak' ? Math.sin(rt.t / 1000 * 7) * 1.6 : s.bob;
  thParts.root.setAttribute('transform', `translate(${s.x.toFixed(2)} ${s.y.toFixed(2)}) rotate(${s.rot.toFixed(2)}) scale(${(s.sx * BASE).toFixed(3)} ${(s.sy * BASE * (1 - sit * 0.34)).toFixed(3)})`);
  const lean = s.lean + (s.mode === 'sneak' ? 6 : 0);
  const body = `translate(0 ${bob.toFixed(2)}) rotate(${lean.toFixed(2)} 0 -6)`;
  thParts.coat.setAttribute('transform', body); thParts.collar.setAttribute('transform', body); thParts.yarn.setAttribute('transform', body); thParts.yarn.setAttribute('opacity', s.yarn);
  thParts.glow.setAttribute('opacity', 0.5 + Math.sin(rt.t / 1000 * 3) * 0.12);
  const sw = s.sackSwing + (s.mode === 'sneak' ? Math.sin(rt.t / 1000 * 7 - 1) * 4 : 0) + (s.mode === 'run' ? Math.sin(rt.t / 1000 * 18) * 8 : 0);
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
const thBase = () => Object.assign(th, { x: 650, y: 250, rot: 0, sx: 1, sy: 1, lean: 0, bob: 0, flip: 1, headRot: 0, hatY: 0, hatRot: 0, hatX: 0, aBack1: 30, aBack2: -28, aFront1: -8, aFront2: -6, legL: 0, legR: 0,
  sackSwing: 0, sackY: 0, sackX: 0, sackRot: 0, sackOn: 1, qA: 0, qY: -70, eyes: 1, face: 0, mode: 'sneak', yarn: 0, sit: 0 });
const thPose = (to, ms = 160, ease = 'outCubic') => rt.tween(th, to, ms, ease);
async function thGlance() {
  await thPose({ flip: -1, headRot: -6, eyes: 1.3 }, 150, 'inOutCubic');      // turns to look back at the cat
  await rt.wait(110);
  await thPose({ flip: 1, headRot: 0, eyes: 1 }, 170, 'inOutCubic');
}
async function thSpooked() {
  const y0 = th.y;
  await thPose({ y: y0 - 8 * BASE, aBack1: 150, aFront1: -150, aBack2: -10, aFront2: 10, eyes: 1.5, hatY: -6 }, 90, 'outCubic');
  thPose({ y: y0, hatY: 0 }, 220, 'outBack');
  await rt.wait(210);                                                    // arms stay up about 0.3 s in total
  await thPose({ aBack1: 30, aBack2: -28, aFront1: -8, aFront2: -6, eyes: 1 }, 160, 'inOutCubic');
}
async function thStagger() {
  th.mode = 'stagger';
  thPose({ hatY: -9, hatRot: 16, hatX: 5 }, 120, 'outCubic');
  await thPose({ rot: 15, lean: 10, aBack1: 150, aFront1: -130, aBack2: -20, aFront2: 20, legL: -20, legR: 16, eyes: 1.6, flip: 1 }, 130, 'outCubic');
  await thPose({ rot: -5, lean: -4, hatY: 0, hatRot: 0, hatX: 0 }, 220, 'outBack');
  await thPose({ rot: 0, lean: 0, aBack1: 30, aFront1: -8, aBack2: -28, aFront2: -6, legL: 0, legR: 0 }, 180, 'inOutSine');
}
async function thDropSack() {
  th.qA = 1;
  const p1 = rt.run(420, 'linear', (e) => { th.qY = lerp(-60, -130, EASE.outQuad(e)); th.qA = 1 - e; th.sackX = 0; });
  th.sackX = 0;
  await rt.run(300, 'inQuad', (e) => { th.sackY = lerp(0, 74, e); th.sackRot = lerp(0, 40, e); });
  await rt.run(200, 'outCubic', (e) => { th.sackY = 74 - Math.sin(Math.PI * e) * 12; });
  await p1;
}

/* ---------------------------------------------------------------- the public rig API */
const DEF = { rot: 0, lean: 0, bob: 0, flip: 1, headRot: 0, hatY: 0, hatRot: 0, hatX: 0, aBack1: 30, aBack2: -28, aFront1: -8, aFront2: -6, legL: 0, legR: 0,
  sackSwing: 0, sackY: 0, sackX: 0, sackRot: 0, sackOn: 1, qA: 0, eyes: 1, face: 0, yarn: 0, sit: 0 };
const resetState = () => { thBase0(); layer.removeAttribute('opacity'); };
const thBase0 = () => { const { x, y } = th; thBase(); th.x = x; th.y = y; th.qY = -70; };
const runLoop = () => { if (th.mode === 'run') { const w = rt.t / 1000 * 18; th.legL = Math.sin(w) * 38; th.legR = -Math.sin(w) * 38; th.bob = -Math.abs(Math.sin(w)) * 6; } };

function play(name) {
  switch (name) {
    case 'sneak': th.mode = 'sneak'; return thPose({ ...DEF, qA: 0 }, 220);
    case 'glance': return thGlance();
    case 'spooked': return thSpooked();
    case 'stagger': return thStagger();
    case 'sack_drop': return thDropSack();
    case 'unmasked': th.mode = 'unmasked'; return thPose({ ...DEF, face: 1, eyes: 1.4 }, 200);
    case 'tied': th.mode = 'tied'; return thPose({ ...DEF, face: 1, sit: 1, yarn: 1, aBack1: 14, aFront1: -14, aBack2: 6, aFront2: -6, legL: 70, legR: 74, eyes: 0.7, hatRot: -6, hatX: 3 }, 420, 'outBack');
    case 'hat_tip': th.mode = 'tip'; return th.hatOff ? Promise.resolve() : thPose({ aFront1: -150, aFront2: -40, hatY: -8, hatRot: -12, flip: 1 }, 250, 'outBack').then(() => rt.wait(60)).then(() => thPose({ aFront1: -8, aFront2: -6, hatY: 0, hatRot: 0 }, 120));
    case 'run': th.mode = 'run'; th.lean = 14; return thPose({ lean: 16, aBack1: -60, aFront1: 60, aBack2: -40, aFront2: -40 }, 200);
    default: return Promise.resolve();
  }
}
/** the thief's left (cat-side) shoulder in the parent's coordinates; `sit` overrides the sitting amount (to predict the tied pose) */
function shoulder(sit = th.sit) {
  const r = rad(th.rot); const c = Math.cos(r); const sn = Math.sin(r);
  const sy = th.sy * BASE * (1 - sit * 0.34);
  const lx = -40 * th.sx * BASE; const ly = -108 * sy;
  return [th.x + c * lx - sn * ly, th.y + sn * lx + c * ly + 2 * BASE];
}
const stopTick = rt.every((dt, t, held) => { if (held) return; runLoop(); thApply(); });
resetState(); thApply();
return {
  layer, state: th, parts: thParts, play, pose: thPose, apply: thApply, shoulder, resetState, DEF,
  place(x, y) { th.x = x; th.y = y; },
  destroy() { stopTick(); layer.remove(); }
};
}
