// Posed rig portraits as inline SVG markup (home posters, how-to, unmasking card, results art) and animated rig mounts.
// Portraits are rendered from the SAME rigs the game uses: the rig is built off-screen, posed, settled, then serialized.
import { ensureDefs } from './defs.js';
import { Runtime } from './motion.js';
import { el, NS } from './svgx.js';
import { createCat } from './rig-cat.js';
import { createThief } from './rig-thief.js';

const BOXES = { thief: '-62 -196 124 204', cat: '-74 -98 150 106' };

function build(kind, pose, scale = 1) {
  ensureDefs();
  const svg = document.createElementNS(NS, 'svg');
  const g = el('g', {}, svg);
  const rt = new Runtime(); rt.paused = true; rt.still = false;
  let rig;
  if (kind === 'thief') {
    rig = createThief(g, rt, { scale }); rig.place(0, 0);
    const s = rig.state;
    if (pose === 'unmasked') Object.assign(s, { face: 1, eyes: 1.4, mode: 'unmasked' });
    else if (pose === 'tied') Object.assign(s, { face: 1, sit: 1, yarn: 1, mode: 'tied', aBack1: 14, aFront1: -14, aBack2: 6, aFront2: -6, legL: 70, legR: 74, eyes: 0.7, hatRot: -6, hatX: 3 });
    else Object.assign(s, { mode: 'sneak' });
    rig.apply();
  } else {
    rig = createCat(g, rt, { scale }); rig.place(0, 0);
    if (pose.startsWith('title_')) rig.applyTitle(pose);
    else if (pose === 'sit_smug') { Object.assign(rig.state, rig.SIT, { mode: 'sit' }); }
    else if (pose === 'bin') { rig.state.mode = 'bin'; Object.assign(rig.state, { dazed: 1, peel: 1, headRot: 14 }); }
    rig.settle(60);
  }
  rt.destroy();
  return { svg, g, rig };
}

/** inline <svg> markup for a posed rig */
export function portrait(kind, pose, height, cls = '') {
  const { svg } = build(kind, pose);
  const vb = BOXES[kind];
  const [, , w, h] = vb.split(' ').map(Number);
  svg.setAttribute('viewBox', vb);
  svg.setAttribute('class', `spr ${cls}`.trim());
  svg.setAttribute('height', height);
  svg.setAttribute('width', Math.round((height * w) / h));
  svg.setAttribute('aria-hidden', 'true');
  return svg.outerHTML;
}

/** an animated rig inside an existing <svg> element (home cat). Returns { rig, rt, destroy } */
export function mountRig(svg, kind, pose = 'idle', scale = 1) {
  ensureDefs();
  svg.setAttribute('viewBox', BOXES[kind]);
  const g = el('g', {}, svg);
  const rt = new Runtime();
  const rig = kind === 'cat' ? createCat(g, rt, { scale }) : createThief(g, rt, { scale });
  rig.place(0, 0);
  if (kind === 'cat') rig.play(pose);
  return { rig, rt, destroy: () => rt.destroy() };
}

/** the catch picture: the cat sits smug on the shoulder of the tied-up thief (inline <svg>) */
export function caughtPair(height) {
  ensureDefs();
  const svg = document.createElementNS(NS, 'svg');
  const g = el('g', {}, svg);
  const rt = new Runtime(); rt.paused = true;
  const th = createThief(g, rt, { scale: 1 }); th.place(0, 0);
  Object.assign(th.state, { face: 1, sit: 1, yarn: 1, mode: 'tied', aBack1: 14, aFront1: -14, aBack2: 6, aFront2: -6, legL: 70, legR: 74, eyes: 0.7, hatRot: -6, hatX: 3 });
  th.apply();
  const cat = createCat(g, rt, { scale: 0.72 });
  const [sx, sy] = th.shoulder(1); cat.place(sx, sy);
  Object.assign(cat.state, cat.SIT, { mode: 'sit', attach: true });
  cat.settle(60); rt.destroy();
  const vb = '-96 -186 190 196';
  svg.setAttribute('viewBox', vb); svg.setAttribute('class', 'spr'); svg.setAttribute('height', height);
  svg.setAttribute('width', Math.round((height * 190) / 196)); svg.setAttribute('aria-hidden', 'true');
  return svg.outerHTML;
}
