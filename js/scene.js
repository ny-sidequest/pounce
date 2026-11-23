// The night world: a long strip of rooftops with a CAMERA, and two sprite characters (the cat and the thief).
// This module only provides primitives (move the camera, play a sprite animation, arc the cat, flash, shake...).
// The ORDER and TIMING of every moment lives in sequences.js, so beats are easy to tune.
import { C, rect, glyph, rng, moon } from './pixel.js';
import { SpritePlayer } from './sprites.js';
import { CAT } from './sprite-cat.js';
import { THIEF, MASK } from './sprite-thief.js';
import { reducedMotion } from './fx.js';

// ---- world geometry (world units; the camera decides how big a unit is on screen)
export const P = 60;            // roof pitch
export const W = 56;            // roof width
const X0 = 8;
const SURF = [152, 144, 156, 142, 150, 146]; // rooftop surface heights
const STREET = 214;
export const THIEF_ROOF = 5;
const BINS = [20, 92, 164, 236, 308];
const BIN_W = 28;

const CS = 1.8;                                 // world units per cat pixel   -> cat 57.6 x 43.2
const TS = 2;                                   // world units per thief pixel -> thief 56 x 88
const CW = 32 * CS;
const CH = 24 * CS;
const FEET = 22 * CS;                           // the cat's feet are on pixel row 22
const TW = 28 * TS;
const TH = 44 * TS;

export const roofX = (i) => X0 + P * i;
const roofRight = (i) => roofX(i) + W;
const catX = (i) => roofRight(i) - CW;          // nose at the roof edge
const catY = (i) => SURF[i] - FEET;
const THIEF_X = roofX(THIEF_ROOF) + (W - TW) / 2;
const THIEF_Y = SURF[THIEF_ROOF] - TH;
const HAT_FEET = THIEF_Y + 3 * TS;              // the cat perches on the standing thief's hat
const TIED_HAT_FEET = THIEF_Y + 11 * TS;        // ...and on the seated, tied thief's hat
const catOnX = THIEF_X + (TW - CW) / 2;
const FOOT_Y = STREET + 14 - FEET;
const footX = (step) => 18 + step * 46;
const snap = (v) => Math.round(v / 2) * 2;

export const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ------------------------------------------------------------------ scenery */
function windows(i, seed) {
  const r = rng(seed);
  let out = '';
  for (const y of [172, 184]) {
    for (const dx of [8, 24, 40]) {
      if (r() < 0.42) {
        const f = r() < 0.4;
        out += rect(roofX(i) + dx, y, 8, 8, C.amber, `opacity=".5" class="win${f ? ' flick' : ''}"${f ? ` style="animation-delay:${(r() * 9).toFixed(1)}s;animation-duration:${(6 + r() * 8).toFixed(1)}s"` : ''}`);
      }
    }
  }
  return out;
}

function buildings() {
  let out = '';
  for (let i = -8; i < 15; i++) {
    const k = ((i % 6) + 6) % 6; // the city continues past both edges
    const x = roofX(i);
    const s = SURF[k];
    out += rect(x, s, W, STREET - s, C.roof1) + rect(x, s, W, 4, C.line);
    if (k === 1) out += rect(x + 8, s - 14, 10, 14, C.roof1) + rect(x + 6, s - 18, 14, 4, C.line);
    if (k === 2) out += rect(x + 36, s - 10, 8, 10, C.roof1) + rect(x + 34, s - 14, 12, 4, C.line);
    if (k === 3) out += rect(x + 6, s - 6, 3, 6, C.roof1) + rect(x + 22, s - 6, 3, 6, C.roof1) + rect(x + 4, s - 18, 24, 12, C.roof1) + rect(x + 8, s - 22, 16, 4, C.roof1);
    if (k === 4) out += rect(x + 40, s - 26, 2, 26, C.line) + rect(x + 34, s - 20, 14, 2, C.line);
    if (i !== 1) out += windows(i, 5 + k * 11 + (i < 0 || i > 5 ? 3 : 0)); // building 1 carries the OPEN sign
  }
  return out;
}

function neonSign(x, y) {
  let out = rect(x - 3, y - 3, 4 * 12 + 3, 5 * 3 + 6, C.shadow) + rect(x - 3, y - 3, 4 * 12 + 3, 2, C.line);
  'OPEN'.split('').forEach((ch, i) => { out += glyph(ch, x + i * 12, y, 3, C.neon); });
  return `<g class="neon">${out}</g>`;
}

function street() {
  let out = rect(-600, STREET, 1600, 200, C.shadow) + rect(-600, STREET, 1600, 2, C.line);
  for (let x = -596; x < 1000; x += 40) out += rect(x, STREET + 30, 18, 2, C.line, 'opacity=".6"');
  return out;
}

function bins() {
  return BINS.map((x, i) => `<g class="bin" data-i="${i}" transform="translate(${x} ${STREET - 8})">
    ${rect(0, 8, BIN_W, 26, '#2E2C52')}${rect(0, 8, BIN_W, 3, C.line)}${rect(5, 14, 2, 16, C.line)}${rect(13, 14, 2, 16, C.line)}${rect(21, 14, 2, 16, C.line)}
    <g class="lid">${rect(-2, 3, BIN_W + 4, 5, '#403D6E')}${rect(11, 0, 6, 3, '#403D6E')}</g></g>`).join('');
}

function farSkyline() {
  const r = rng(21);
  let out = '';
  let x = -700;
  while (x < 1100) {
    const w = (5 + Math.floor(r() * 7)) * 4;
    const h = 64 + Math.floor(r() * 30) * 4;
    out += rect(x, STREET - h, w, h, C.roof2);
    if (r() < 0.35) out += rect(x + 6, STREET - h - 8, 6, 8, C.roof2);
    for (let wy = STREET - h + 8; wy < STREET - 70; wy += 12) for (let wx = x + 5; wx < x + w - 5; wx += 10) if (r() < 0.1) out += rect(wx, wy, 4, 4, C.amber, 'opacity=".22"');
    x += w + (r() < 0.4 ? 4 : 0);
  }
  return out;
}

const LAMP_SVG = `<svg viewBox="0 0 7 11" shape-rendering="crispEdges" aria-hidden="true">
  <rect x="3" y="0" width="1" height="2" class="l-chain"/><rect x="1" y="2" width="5" height="1" class="l-cap"/>
  <rect class="glass" x="1" y="3" width="5" height="5"/><rect class="core" x="3" y="5" width="1" height="1"/><rect x="1" y="8" width="5" height="1" class="l-cap"/></svg>`;

/* -------------------------------------------------------------------- scene */
export function createScene(host) {
  host.innerHTML = `
  <div class="scene stars-bg">
    <svg class="scene-moon" viewBox="0 0 48 48" shape-rendering="crispEdges" aria-hidden="true">${moon(20, 22, 5)}</svg>
    <svg class="world" viewBox="0 0 360 240" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges" role="img" aria-label="A row of rooftops at night. Your cat, with a pink scarf, is on one roof; the masked thief with a glowing sack is on the far right roof.">
      <rect id="sceneGlow" x="-700" y="-400" width="2000" height="900" fill="${C.amber}" opacity="0"/>
      ${farSkyline()}
      ${buildings()}
      ${neonSign(roofX(1) + 5, SURF[1] + 16)}
      ${street()}
      <g id="bins">${bins()}</g>
      <text id="lookLabel" class="atmo" x="${roofX(4) + 24}" y="${STREET - 6}" text-anchor="middle" fill="${C.dim}">don't look down</text>
      <text id="thiefLabel" class="atmo" x="${roofX(THIEF_ROOF) + W / 2}" y="${SURF[THIEF_ROOF] + 22}" text-anchor="middle" fill="${C.dim}">the thief</text>
      <g id="gapGroup">
        <rect id="gapLine" x="0" y="112" width="10" height="2" fill="${C.amber}" opacity=".85"/>
        <rect id="gapTickL" x="0" y="106" width="2" height="14" fill="${C.amber}"/>
        <rect id="gapTickR" x="0" y="106" width="2" height="14" fill="${C.amber}"/>
        <text id="gapLabel" class="gap-label" x="0" y="100" text-anchor="middle" fill="${C.amber}">5.0m gap</text>
      </g>
      <rect id="dimmer" x="-700" y="-400" width="2000" height="900" fill="${C.shadow}" opacity="0"/>
      <g id="thiefLight" style="--lit:0">${rect(roofX(THIEF_ROOF) - 14, SURF[THIEF_ROOF] - 100, 84, 100, C.amber, 'class="lg lg1"')}${rect(roofX(THIEF_ROOF) - 4, SURF[THIEF_ROOF] - 88, 64, 88, C.amber, 'class="lg lg2"')}${rect(roofX(THIEF_ROOF) + 6, SURF[THIEF_ROOF] - 74, 44, 74, C.amber, 'class="lg lg3"')}</g>
      <polygon id="spot" points="0,0 0,0 0,0 0,0" fill="${C.amber}" opacity="0"/>
      <g id="thiefPos" style="transform:translate(${THIEF_X}px,${THIEF_Y}px)"><image id="thiefImg" width="${TW}" height="${TH}"/></g>
      <g id="maskPos" opacity="0"><image id="maskImg" width="${8 * 3}" height="${4 * 3}"/></g>
      <g id="catPos" style="transform:translate(${catX(0)}px,${catY(0)}px)"><image id="catImg" width="${CW}" height="${CH}"/></g>
      <g id="fx"></g>
      <text id="clatter" class="clatter" x="150" y="190" text-anchor="middle" fill="${C.amber}" opacity="0">CLATTER!</text>
    </svg>
    <div class="lamps" aria-hidden="true">${[0, 1, 2, 3, 4].map((i) => `<span class="lamp" data-i="${i}">${LAMP_SVG}</span>`).join('')}</div>
    <div class="overlay" id="overlay"></div>
  </div>`;

  const $ = (s) => host.querySelector(s);
  const sceneEl = $('.scene');
  const svg = $('.world');
  const catPos = $('#catPos');
  const thiefPos = $('#thiefPos');
  const maskPos = $('#maskPos');
  const light = $('#thiefLight');
  const glow = $('#sceneGlow');
  const dimmerEl = $('#dimmer');
  const catP = new SpritePlayer($('#catImg'), CAT, { scale: 4 });
  const thiefP = new SpritePlayer($('#thiefImg'), THIEF, { scale: 4 });
  const maskP = new SpritePlayer($('#maskImg'), MASK, { scale: 4 });
  maskP.play('still');

  let cx = catX(0);
  let cy = catY(0);
  let roof = 0;
  let alive = true;
  let mode = 'chase';
  let gapFrom = roofRight(0);
  let thiefState = 'here'; // here | caught | gone

  /* ------------------------------------------------------------------ camera */
  const cam = { cx: 190, yb: 246, w: 384, top: THIEF_Y };
  let camRaf = 0;
  let reserve = 0; // extra screen px kept free at the top (room for the name plate during the catch)
  const safeTop = () => (sceneEl.clientWidth >= 900 ? 132 : 8) + reserve; // clear of the HUD / pips / lanterns

  function render() {
    const cw = sceneEl.clientWidth;
    const ch = sceneEl.clientHeight;
    if (!cw || !ch) return;
    const aspect = ch / cw;
    // the tallest feature must fit below the safe area: w * (aspect - safe/cw) >= yb - top
    const denom = Math.max(0.2, aspect - safeTop() / cw);
    const w = Math.max(cam.w, (cam.yb - cam.top + 6) / denom);
    const h = w * aspect;
    // in a tall (full-screen) scene, lift the action off the bottom edge so it sits in the middle of the screen
    const slack = h - (cam.yb - cam.top + 24);
    const yb = cam.yb + (aspect > 1.15 ? Math.max(0, slack) * 0.45 : 0);
    svg.setAttribute('viewBox', `${(cam.cx - w / 2).toFixed(2)} ${(yb - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);
  }

  function camTo(t, ms = 350) {
    cancelAnimationFrame(camRaf);
    const to = { ...cam, ...t };
    if (!ms || reducedMotion()) { Object.assign(cam, to); render(); return Promise.resolve(); }
    const from = { ...cam };
    const t0 = performance.now();
    return new Promise((res) => {
      const step = (now) => {
        const k = Math.min(1, (now - t0) / ms);
        const e = 1 - Math.pow(1 - k, 3); // ease-out
        for (const key of ['cx', 'yb', 'w', 'top']) cam[key] = from[key] + (to[key] - from[key]) * e;
        render();
        if (k < 1) camRaf = requestAnimationFrame(step); else res();
      };
      camRaf = requestAnimationFrame(step);
    });
  }

  function target(m = mode) {
    if (m === 'chase') {
      const left = roofX(roof) - 4;
      const right = roofRight(THIEF_ROOF) - 2;
      return { cx: (left + right) / 2, yb: 246, w: right - left, top: THIEF_Y };
    }
    if (m === 'thief') return { cx: roofX(THIEF_ROOF) + W / 2 - 6, yb: 216, w: 150, top: THIEF_Y - 34 };      // push in on the thief
    if (m === 'caught') return { cx: roofX(THIEF_ROOF) - 6, yb: 240, w: 230, top: THIEF_Y - 36 };
    if (m === 'rooftop') return { cx: roofX(THIEF_ROOF) - 20, yb: SURF[THIEF_ROOF] + 56, w: 210, top: THIEF_Y };
    if (m === 'fall') return { cx: Math.max(60, Math.min(cx + CW / 2, 330)), yb: 252, w: 190, top: STREET - 52 };
    if (m === 'street') return { cx: Math.max(100, Math.min(cx + 50, 330)), yb: 252, w: 250, top: STREET - 60 };
    return { cx: 190, yb: 246, w: 384, top: THIEF_Y };
  }
  const frame = (m = mode, ms = 350) => { mode = m; return camTo(target(m), ms); };
  const ro = new ResizeObserver(() => render());
  ro.observe(sceneEl);

  /* ------------------------------------------------------------------ helpers */
  const animate = (el, frames, opts) => el.animate(frames, opts).finished.catch(() => {});
  const placeCat = (x, y) => { cx = x; cy = y; catPos.getAnimations().forEach((a) => a.cancel()); catPos.style.transform = `translate(${x}px,${y}px)`; };
  const placeThief = (x, y) => { thiefPos.getAnimations().forEach((a) => a.cancel()); thiefPos.style.transform = `translate(${x}px,${y}px)`; };

  function arc(x0, y0, x1, y1, apex, n, t1 = 1) {
    const frames = [];
    for (let k = 0; k <= n; k++) {
      const t = (k / n) * t1;
      frames.push({ transform: `translate(${snap(x0 + (x1 - x0) * t)}px, ${snap(y0 + (y1 - y0) * t - 4 * apex * t * (1 - t))}px)`, offset: k / n, easing: 'steps(1, end)' });
    }
    return frames;
  }
  /** move the cat along a pixel-snapped arc; resolves when it arrives and parks it there */
  async function catArc(x1, y1, ms, apex = 20, n = 10) {
    const x0 = cx; const y0 = cy;
    if (!reducedMotion()) await animate(catPos, arc(x0, y0, x1, y1, apex, n), { duration: ms, fill: 'forwards' });
    placeCat(x1, y1);
  }
  /** straight vertical drop (or rise) */
  async function catDrop(y1, ms) {
    const x0 = cx; const y0 = cy;
    if (!reducedMotion()) await animate(catPos, [{ transform: `translate(${x0}px,${y0}px)` }, { transform: `translate(${x0}px,${y1}px)` }], { duration: ms, easing: 'steps(6)', fill: 'forwards' });
    placeCat(x0, y1);
  }

  const setGapRoof = (i, animateIt = false) => {
    $('#gapLabel').textContent = `${THIEF_ROOF - i}.0m gap`;
    const to = roofRight(i);
    const layout = (startX) => {
      const end = roofX(THIEF_ROOF);
      const len = Math.max(0, end - startX);
      $('#gapLine').setAttribute('x', startX); $('#gapLine').setAttribute('width', len);
      $('#gapTickL').setAttribute('x', startX); $('#gapTickR').setAttribute('x', end - 2);
      $('#gapLabel').setAttribute('x', startX + len / 2);
    };
    if (!animateIt || reducedMotion()) { gapFrom = to; layout(to); return; }
    const from = gapFrom; const t0 = performance.now();
    const step = (now) => { const k = Math.min(1, (now - t0) / 300); layout(from + (to - from) * k); if (k < 1 && alive) requestAnimationFrame(step); else gapFrom = to; };
    requestAnimationFrame(step);
  };
  const hideGap = () => { $('#gapGroup').style.display = 'none'; $('#lookLabel').style.opacity = 0; };
  const showGap = () => { $('#gapGroup').style.display = ''; $('#lookLabel').style.opacity = 1; };

  /* ----------------------------------------------------------------- lights */
  function setLight(n) {
    light.style.setProperty('--lit', n);
    glow.setAttribute('opacity', (Math.min(n, 5) * 0.011).toFixed(3));
  }
  /** the thief's glow follows the thief: it leaves with it, no light box left behind */
  const thiefGlow = (on) => { light.style.transition = 'opacity .3s steps(3)'; light.style.opacity = on ? 1 : 0; };
  const dim = (on) => dimmerEl.setAttribute('opacity', on ? '0.62' : '0');
  const lamp = (i, missed) => $(`.lamp[data-i="${i}"]`).classList.add(missed ? 'missed' : 'lit');

  /* --------------------------------------------------------------- characters */
  const catAnim = (name, opts) => catP.play(name, opts);
  const catAsync = (name, opts) => catP.playAsync(name, opts);
  const thiefAnim = (name, opts) => thiefP.play(name, opts);
  const thiefAsync = (name, opts) => thiefP.playAsync(name, opts);
  const pausePlayers = () => { catP.pause(); thiefP.pause(); };
  const resumePlayers = () => { catP.resume(); thiefP.resume(); };

  /* ------------------------------------------------------------------ effects */
  function flash() {
    if (reducedMotion()) return;
    catPos.classList.add('flash'); thiefPos.classList.add('flash');
    setTimeout(() => { catPos.classList.remove('flash'); thiefPos.classList.remove('flash'); }, 90);
  }
  function shake(px = 4) {
    if (reducedMotion()) return;
    sceneEl.style.setProperty('--shake', px + 'px');
    sceneEl.classList.remove('quake'); void sceneEl.offsetWidth; sceneEl.classList.add('quake');
    setTimeout(() => sceneEl.classList.remove('quake'), 260);
  }
  function dust(x, y, n = 12) {
    if (reducedMotion()) return;
    const g = $('#fx');
    for (let k = 0; k < n; k++) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const s = k % 3 === 0 ? 4 : 2;
      el.setAttribute('width', s); el.setAttribute('height', s); el.setAttribute('fill', k % 2 ? C.muted : C.dim);
      el.setAttribute('x', x); el.setAttribute('y', y);
      g.appendChild(el);
      const dx = (Math.random() - 0.5) * 70;
      el.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${snap(dx)}px,${-snap(10 + Math.random() * 26)}px)`, opacity: 1, offset: 0.5 }, { transform: `translate(${snap(dx * 1.3)}px,4px)`, opacity: 0 }],
        { duration: 600, easing: 'steps(6)', fill: 'forwards' }).finished.then(() => el.remove(), () => el.remove());
    }
  }
  /** three trailing speed-line pixels behind the cat while it leaps */
  function speedLines(x0, y0, x1, y1, ms, apex = 40) {
    if (reducedMotion()) return;
    const g = $('#fx');
    for (let k = 0; k < 3; k++) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      el.setAttribute('width', 8 - k * 2); el.setAttribute('height', 2); el.setAttribute('fill', C.moon);
      g.appendChild(el);
      const kf = [];
      for (let s = 0; s <= 8; s++) {
        const t = (s / 8) * Math.max(0, 1 - k * 0.06);
        kf.push({ transform: `translate(${snap(x0 + (x1 - x0) * t + 6)}px,${snap(y0 + 18 + k * 6 + (y1 - y0) * t - 4 * apex * t * (1 - t))}px)`, offset: s / 8, opacity: 0.8 - s * 0.08, easing: 'steps(1,end)' });
      }
      el.animate(kf, { duration: ms, delay: 40 + k * 30, fill: 'both' }).finished.then(() => el.remove(), () => el.remove());
    }
  }
  /** a spotlight cone falls onto the thief's face */
  function spotlight(on) {
    const sp = $('#spot');
    const fx = THIEF_X + TW / 2;
    const fy = THIEF_Y + 22;
    sp.setAttribute('points', `${fx - 6},${fy - 70} ${fx + 6},${fy - 70} ${fx + 34},${fy + 24} ${fx - 34},${fy + 24}`);
    sp.setAttribute('opacity', on ? '0.16' : '0');
  }
  /** the mask flies up, spins slowly and lands on the roof */
  async function maskFly(ms = 600) {
    const sx = THIEF_X + 18;
    const sy = THIEF_Y + 20;
    const rx = roofX(THIEF_ROOF) + 4;
    const ry = SURF[THIEF_ROOF] - 10;
    maskPos.setAttribute('opacity', '1');
    const img = $('#maskImg');
    img.style.transformBox = 'fill-box'; img.style.transformOrigin = 'center';
    if (!reducedMotion()) {
      img.animate([{ rotate: '0deg' }, { rotate: '360deg' }], { duration: ms, easing: 'steps(9)' });
      await animate(maskPos, [
        { transform: `translate(${sx}px,${sy}px)` },
        { transform: `translate(${sx - 6}px,${sy - 46}px)`, offset: 0.4 },
        { transform: `translate(${sx - 26}px,${sy - 26}px)`, offset: 0.75 },
        { transform: `translate(${rx}px,${ry}px)` }
      ], { duration: ms, easing: 'steps(9)', fill: 'forwards' });
    }
    maskPos.getAnimations().forEach((a) => a.cancel());
    maskPos.style.transform = `translate(${rx}px,${ry}px)`;
    img.getAnimations().forEach((a) => a.cancel());
  }
  const showMaskRest = () => { maskPos.setAttribute('opacity', '1'); maskPos.style.transform = `translate(${roofX(THIEF_ROOF) + 4}px,${SURF[THIEF_ROOF] - 10}px)`; };
  const lidFly = (bi) => {
    const lid = $(`.bin[data-i="${bi}"] .lid`);
    if (reducedMotion()) { lid.style.visibility = 'hidden'; return; }
    lid.animate([{ transform: 'translate(0,0) rotate(0)' }, { transform: 'translate(16px,-44px) rotate(160deg)', offset: 0.5 }, { transform: 'translate(34px,6px) rotate(340deg)' }], { duration: 600, easing: 'steps(8)', fill: 'forwards' });
  };

  /* ------------------------------------------------------------------ states */
  function setCatRoof(i, anim = 'idle') {
    roof = i;
    placeCat(catX(i), catY(i));
    catAnim(anim);
    showGap();
    setGapRoof(i);
    mode = 'chase';
    camTo(target(), 0);
  }
  function showCaught() {
    hideGap();
    thiefState = 'caught';
    thiefAnim('tied');
    thiefGlow(false);
    spotlight(false);
    showMaskRest();
    setLight(8);
    placeCat(catOnX, TIED_HAT_FEET - FEET);
    catAnim('sit_smug');
    mode = 'caught';
    camTo(target(), 0);
  }
  function showOnFoot(step = 0) {
    hideGap();
    showGone();
    walkTo(step, false);
  }
  function showGone() { thiefState = 'gone'; thiefPos.style.opacity = 0; $('#thiefLabel').style.opacity = 0; thiefGlow(false); }

  async function walkTo(step, animateIt = true) {
    const x1 = footX(step);
    $('#bins').querySelectorAll('.bin').forEach((b) => { b.style.visibility = ''; });
    mode = 'street';
    if (!animateIt || reducedMotion()) { placeCat(x1, FOOT_Y); catAnim('idle'); camTo(target(), 0); return; }
    catAnim('walk');
    const x0 = cx; const y0 = cy;
    cx = x1;
    camTo(target(), 500);
    await animate(catPos, [{ transform: `translate(${x0}px,${y0}px)` }, { transform: `translate(${x1}px,${FOOT_Y}px)` }], { duration: 560, easing: 'steps(8)', fill: 'forwards' });
    placeCat(x1, FOOT_Y);
    catAnim('idle');
  }

  /* ------------------------------------------------ geometry used by sequences */
  const geo = {
    roofCat: (i) => ({ x: catX(i), y: catY(i) }),
    impact: () => ({ x: THIEF_X - CW + 16, y: THIEF_Y + 16 }),                // the cat meets the thief's chest
    hat: () => ({ x: catOnX, y: HAT_FEET - FEET }),
    tiedHat: () => ({ x: catOnX, y: TIED_HAT_FEET - FEET }),
    thief: () => ({ x: THIEF_X, y: THIEF_Y }),
    nearestBin(x) { let bi = 0; BINS.forEach((b, k) => { if (Math.abs(b + BIN_W / 2 - x) < Math.abs(BINS[bi] + BIN_W / 2 - x)) bi = k; }); return bi; },
    bin: (bi) => ({ x: BINS[bi] + BIN_W / 2 - CW / 2, y: STREET + 24 - FEET }),
    cat: () => ({ x: cx, y: cy }),
    reach: (frac) => cx + (roofX(THIEF_ROOF) - cx) * frac,
    midAirY: () => cy + 10
  };

  /** thief runs off the right edge of the world */
  async function thiefRun(ms = 650) {
    thiefAnim('run');
    $('#thiefLabel').style.opacity = 0;
    thiefGlow(false);
    if (!reducedMotion()) await animate(thiefPos, [{ transform: `translate(${THIEF_X}px,${THIEF_Y}px)` }, { transform: `translate(${THIEF_X + 520}px,${THIEF_Y}px)` }], { duration: ms, easing: 'steps(9)', fill: 'forwards' });
    showGone();
  }

  // initial state
  thiefAnim('sneak');
  catAnim('idle');
  setGapRoof(0);
  render();

  return {
    el: host, svg, sceneEl, overlay: () => $('#overlay'),
    frame, camTo, render, getMode: () => mode,
    setReserve: (px) => { reserve = px; render(); },
    lamp, setLight, thiefGlow, dim, spotlight,
    catAnim, catAsync, thiefAnim, thiefAsync, pausePlayers, resumePlayers,
    placeCat, placeThief, catArc, catDrop, thiefRun, walkTo,
    flash, shake, dust, speedLines, maskFly, showMaskRest, lidFly,
    clatter: (x) => { const ct = $('#clatter'); ct.setAttribute('x', x); ct.setAttribute('y', STREET - 20); ct.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)', offset: 0.2 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: 1300, easing: 'steps(6)' }); },
    hideBin: (bi) => { $(`.bin[data-i="${bi}"]`).style.visibility = 'hidden'; },
    binsShake: () => $('#bins').classList.add('clatter-on'),
    setCatRoof, setGapRoof, hideGap, showGap, showCaught, showOnFoot, showGone, geo,
    getRoof: () => roof, setRoof: (i) => { roof = i; },
    thiefState: () => thiefState,
    setThiefState: (s) => { thiefState = s; },
    thiefRect: () => thiefPos.getBoundingClientRect(),
    catRect: () => catPos.getBoundingClientRect(),
    lampRect: (i) => $(`.lamp[data-i="${i}"]`).getBoundingClientRect(),
    isAlive: () => alive,
    destroy: () => { alive = false; ro.disconnect(); cancelAnimationFrame(camRaf); catP.stop(); thiefP.stop(); maskP.stop(); }
  };
}
