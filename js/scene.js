// The night world: a long strip of rooftops with a CAMERA, and two rigged vector characters (the cat and the thief).
// This module only provides primitives (move the camera, play a rig animation, arc the cat, flash, shake...).
// The ORDER and TIMING of every moment lives in sequences.js, so beats are easy to tune.
import { ensureDefs } from './defs.js';
import { Runtime, reducedMotion, lerp } from './motion.js';
import { el } from './svgx.js';
import { createCat } from './rig-cat.js';
import { createThief, maskShape } from './rig-thief.js';
import { COL, rng, starsSVG, windowSVG, skylineLayer, moonSVG, neonSignSVG, binSVG, LAMP_SVG } from './world.js';

// ---- world geometry (world units; the camera decides how big a unit is on screen)
export const P = 60;            // roof pitch
export const W = 56;            // roof width
const X0 = 8;
const SURF = [152, 144, 156, 142, 150, 146]; // rooftop surface heights
const STREET = 214;
export const THIEF_ROOF = 5;
const BINS = [20, 92, 164, 236, 308];
const BIN_W = 28;

const CS = 0.56;                                // cat rig scale  -> the cat is ~62 units long, nose at +28
const TS = 0.47;                                // thief rig scale -> the thief is ~85 units tall
const NOSE = 50 * CS;                           // from the cat origin to the nose
const CAT_LEN = 100 * CS;

export const roofX = (i) => X0 + P * i;
const roofRight = (i) => roofX(i) + W;
const catX = (i) => roofRight(i) - NOSE;        // nose at the roof edge
const catY = (i) => SURF[i];                    // the cat origin is at its paws
const THIEF_X = roofX(THIEF_ROOF) + W / 2;
const THIEF_Y = SURF[THIEF_ROOF];
const THIEF_TOP = THIEF_Y - 88;
const FOOT_Y = STREET + 12;
const footX = (step) => 30 + step * 46;
const MASK_REST = { x: roofX(THIEF_ROOF) + 12, y: SURF[THIEF_ROOF] - 5 };

export const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ------------------------------------------------------------------ scenery */
function buildings() {
  let out = '';
  for (let i = -8; i < 15; i++) {
    const k = ((i % 6) + 6) % 6; // the city continues past both edges
    const x = roofX(i); const s = SURF[k];
    out += `<rect x="${x}" y="${s}" width="${W}" height="${STREET - s + 4}" rx="2" fill="url(#gBld)"/><rect x="${x}" y="${s}" width="${W}" height="3.5" rx="1.5" fill="#3E3874"/><rect x="${x + 1}" y="${s}" width="${W - 2}" height="1.2" rx=".6" fill="#8F89D0" opacity=".7"/>`;
    if (k === 1) out += `<rect x="${x + 8}" y="${s - 14}" width="10" height="14" rx="1.5" fill="#1B1838"/><rect x="${x + 6}" y="${s - 18}" width="14" height="4.5" rx="1.5" fill="#3E3874"/>`;
    if (k === 2) out += `<rect x="${x + 34}" y="${s - 12}" width="12" height="12" rx="1.5" fill="#1B1838"/><path d="M${x + 32} ${s - 12} L${x + 40} ${s - 18} L${x + 48} ${s - 12} Z" fill="#2A2552"/>`;
    if (k === 3) out += `<rect x="${x + 6}" y="${s - 6}" width="3" height="6" fill="#1B1838"/><rect x="${x + 22}" y="${s - 6}" width="3" height="6" fill="#1B1838"/><rect x="${x + 4}" y="${s - 18}" width="24" height="12" rx="3" fill="#1B1838"/><path d="M${x + 2} ${s - 18} L${x + 16} ${s - 25} L${x + 30} ${s - 18} Z" fill="#2A2552"/>`;
    if (k === 4) out += `<rect x="${x + 40}" y="${s - 26}" width="1.8" height="26" fill="#4A4488"/><rect x="${x + 34}" y="${s - 20}" width="14" height="1.8" fill="#4A4488"/>`;
    if (i !== 1) { // building 1 carries the OPEN sign
      const r = rng(5 + k * 11 + (i < 0 || i > 5 ? 3 : 0));
      for (const y of [166, 183]) for (const dx of [7, 24, 41]) out += windowSVG(x + dx, y, 9, 10, r, 0.48);
    }
  }
  return out;
}

const street = () => `<rect x="-700" y="${STREET}" width="1800" height="220" fill="url(#gGround)"/><rect x="-700" y="${STREET}" width="1800" height="2.5" fill="#4A4488"/>
  ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${200 + i * 5}" y="${STREET + 10}" width="2" height="7" rx="1" fill="#2B2650"/>`).join('')}
  <ellipse cx="${roofX(1) + 24}" cy="${STREET + 14}" rx="40" ry="5" fill="#FF2E88" opacity=".2"/><ellipse cx="${roofX(1) + 24}" cy="${STREET + 14}" rx="22" ry="2.4" fill="#FF86BA" opacity=".24"/>
  <ellipse cx="260" cy="${STREET + 26}" rx="30" ry="3.4" fill="#8B86B8" opacity=".12"/>`;

const bins = () => BINS.map((x, i) => `<g class="bin" data-i="${i}" transform="translate(${x} ${STREET - 26}) scale(.86)">${binSVG(BIN_W)}</g>`).join('');

/* -------------------------------------------------------------------- scene */
export function createScene(host) {
  ensureDefs();
  const rt = new Runtime();
  rt.still = reducedMotion();
  host.innerHTML = `
  <div class="scene">
    <svg class="scene-moon" viewBox="-60 -60 120 120" aria-hidden="true">${moonSVG(24)}</svg>
    <svg class="world" viewBox="0 0 360 240" preserveAspectRatio="xMidYMid slice" role="img" aria-label="A row of rooftops at night. Your cat, with a pink scarf, is on one roof; the masked thief with a glowing sack is on the far right roof.">
      <rect x="-700" y="-420" width="2000" height="800" fill="url(#sky)"/>
      <g>${starsSVG(-300, -300, 900, 380, 110, 7)}</g>
      <rect id="sceneGlow" x="-700" y="-400" width="2000" height="900" fill="${COL.amber}" opacity="0"/>
      <g id="farG">${skylineLayer({ x0: -700, x1: 1100, base: 196, seed: 11, fill: '#322C63', opacity: 0.7, minH: 70, maxH: 150, minW: 26, maxW: 52, rim: true })}</g>
      <g id="midG">${skylineLayer({ x0: -700, x1: 1100, base: 204, seed: 23, fill: '#252052', opacity: 0.95, minH: 44, maxH: 96, minW: 22, maxW: 44, windows: 0.12 })}</g>
      <g id="bld">${buildings()}</g>
      ${neonSignSVG(roofX(1) + 2, SURF[1] + 16)}
      ${street()}
      <g id="bins">${bins()}</g>
      <text id="lookLabel" class="atmo" x="${roofX(4) + 24}" y="${STREET + 28}" text-anchor="middle" fill="${COL.dim}">don't look down</text>
      <text id="thiefLabel" class="atmo" x="${roofX(THIEF_ROOF) + W - 2}" y="${SURF[THIEF_ROOF] + 16}" text-anchor="end" fill="${COL.dim}">the thief</text>
      <g id="gapGroup">
        <line id="gapLine" x1="0" y1="112" x2="10" y2="112" stroke="${COL.amber}" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 5" opacity=".9"/>
        <circle id="gapTickL" cx="0" cy="112" r="3" fill="${COL.amber}"/><circle id="gapTickR" cx="0" cy="112" r="3" fill="${COL.amber}"/>
        <text id="gapLabel" class="gap-label" x="0" y="100" text-anchor="middle" fill="${COL.amber}">5.0 m</text>
      </g>
      <rect id="dimmer" x="-700" y="-400" width="2000" height="900" fill="${COL.shadow}" opacity="0"/>
      <ellipse id="thiefLight" cx="${THIEF_X - 14}" cy="${THIEF_Y - 40}" rx="64" ry="60" fill="url(#gHalo)" opacity="0"/>
      <polygon id="spot" points="0,0 0,0 0,0 0,0" fill="url(#gSpot)" opacity="0"/>
      <g id="rigs"></g>
      <g id="fx"></g>
    </svg>
    <div class="lamps" aria-hidden="true">${[0, 1, 2, 3, 4].map((i) => `<span class="lamp" data-i="${i}">${LAMP_SVG}</span>`).join('')}</div>
    <div class="overlay" id="overlay"></div>
  </div>`;

  const $ = (s) => host.querySelector(s);
  const sceneEl = $('.scene');
  const svg = $('.world');
  const rigs = $('#rigs');
  const fx = $('#fx');
  const light = $('#thiefLight');
  const glow = $('#sceneGlow');
  const dimmerEl = $('#dimmer');
  const farG = $('#farG');
  const midG = $('#midG');
  let alive = true;

  // the scene owns the frame loop for scene-level motion (the rigs register their own tickers after this one)
  const lightState = { glow: 0, thief: 0, dim: 0, spot: 0 };
  let perched = false;
  const thiefRig = createThief(rigs, rt, { scale: TS });
  const catRig = createCat(rigs, rt, { scale: CS });
  const cat = catRig.state;
  const thief = thiefRig.state;
  thiefRig.place(THIEF_X, THIEF_Y);
  catRig.place(catX(0), catY(0));
  rt.every((dt, t, held) => {
    if (held) return;
    if (perched) { const [sx, sy] = thiefRig.shoulder(); cat.x = sx; cat.y = sy; cat.rot = thief.rot * 0.6; }
    light.setAttribute('opacity', (lightState.thief * (0.5 + 0.1 * Math.sin(t / 400)) + lightState.glow * 0.0).toFixed(3));
    $('#spot').setAttribute('opacity', (lightState.spot * 0.5).toFixed(3));
  });

  let roof = 0;
  let mode = 'chase';
  let gapFrom = roofRight(0);
  let thiefState = 'here'; // here | caught | gone
  let maskEl = null;

  /* ------------------------------------------------------------------ camera */
  const cam = { cx: 190, yb: 246, w: 384, top: THIEF_TOP };
  let reserve = 0; // extra screen px kept free at the top (room for the name plate during the catch)
  let safe = 8;
  const readSafe = () => { const v = parseFloat(getComputedStyle(sceneEl).getPropertyValue('--safe-top')); safe = Number.isFinite(v) ? v : (sceneEl.clientWidth >= 900 ? 132 : 8); };
  const safeTop = () => safe + reserve; // clear of the HUD / pips / lanterns

  function render() {
    const cw = sceneEl.clientWidth;
    const ch = sceneEl.clientHeight;
    if (!cw || !ch) return;
    const aspect = ch / cw;
    const denom = Math.max(0.2, aspect - safeTop() / cw);
    const w = Math.max(cam.w, (cam.yb - cam.top + 6) / denom);
    const h = w * aspect;
    const slack = h - (cam.yb - cam.top + 24);
    const yb = cam.yb + (aspect > 1.15 ? Math.max(0, slack) * 0.45 : 0);
    svg.setAttribute('viewBox', `${(cam.cx - w / 2).toFixed(2)} ${(yb - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);
    farG.setAttribute('transform', `translate(${((cam.cx - 190) * 0.3).toFixed(2)} 0)`);   // parallax: far layers drift with the camera
    midG.setAttribute('transform', `translate(${((cam.cx - 190) * 0.14).toFixed(2)} 0)`);
  }

  let camTok = 0;
  function camTo(t, ms = 350) {
    const to = { ...cam, ...t };
    const tok = ++camTok;
    if (!ms || reducedMotion()) { Object.assign(cam, to); render(); return Promise.resolve(); }
    const from = { ...cam };
    return rt.run(ms, 'inOutCubic', (e) => {
      if (tok !== camTok) return;
      for (const key of ['cx', 'yb', 'w', 'top']) cam[key] = from[key] + (to[key] - from[key]) * e;
      render();
    });
  }

  function target(m = mode) {
    if (m === 'chase') {
      const left = roofX(roof) - 26;
      const right = roofRight(THIEF_ROOF) + 12;
      return { cx: (left + right) / 2, yb: 246, w: right - left, top: THIEF_TOP };
    }
    if (m === 'thief') return { cx: roofX(THIEF_ROOF) + W / 2 - 6, yb: 216, w: 150, top: THIEF_TOP - 34 };
    if (m === 'caught') return { cx: roofX(THIEF_ROOF) - 6, yb: 240, w: 230, top: THIEF_TOP - 36 };
    if (m === 'rooftop') return { cx: roofX(THIEF_ROOF) - 20, yb: SURF[THIEF_ROOF] + 56, w: 210, top: THIEF_TOP };
    if (m === 'fall') return { cx: Math.max(60, Math.min(cat.x + 20, 330)), yb: 258, w: 210, top: STREET - 72 };
    if (m === 'street') return { cx: Math.max(100, Math.min(cat.x + 50, 330)), yb: 258, w: 250, top: STREET - 60 };
    return { cx: 190, yb: 246, w: 384, top: THIEF_TOP };
  }
  const frame = (m = mode, ms = 350) => { mode = m; $('#thiefLabel').style.opacity = m === 'chase' && thiefState === 'here' ? 1 : 0; return camTo(target(m), ms); };
  const ro = new ResizeObserver(() => { readSafe(); render(); });
  ro.observe(sceneEl);

  /* ------------------------------------------------------------------ helpers */
  const unperch = () => { perched = false; cat.attach = false; cat.cs = CS; cat.rot = 0; };
  const placeCat = (x, y) => { unperch(); catRig.place(x, y); };
  const placeThief = (x, y) => thiefRig.place(x, y);
  const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1.5;

  /** move the cat along an arc with stretch in the air and a squash on landing; perches on the thief if the target is the shoulder */
  async function catArc(x1, y1, ms, apex = 20) {
    const tied = thiefRig.shoulder(1); const hat = thiefRig.shoulder(0);
    const toShoulder = near([x1, y1], hat) || near([x1, y1], tied);
    if (perched && toShoulder) return;                          // already sitting there; it rides along as the thief sits down
    const x0 = cat.x; const y0 = cat.y;
    await rt.run(ms, 'inOutSine', (e) => {
      const live = toShoulder ? thiefRig.shoulder(thief.sit) : [x1, y1];   // land on the thief wherever it is now
      cat.x = lerp(x0, live[0], e); cat.y = lerp(y0, live[1], e) - 4 * apex * e * (1 - e);
      const st = Math.sin(Math.PI * e);
      cat.sx = 1 + 0.24 * st; cat.sy = 1 - 0.16 * st;                      // stretch in the air
      cat.rot = Math.max(-24, Math.min(24, Math.atan2((y1 - y0) - 4 * apex * (1 - 2 * e), x1 - x0 || 1) * 26));
    });
    cat.rot = 0;
    if (toShoulder) {
      perched = true; cat.attach = true; cat.cs = CS * 0.72;
      const [sx, sy] = thiefRig.shoulder(); cat.x = sx; cat.y = sy;
      catRig.sit(260);
      rt.run(380, 'outElastic', (e) => { cat.sx = lerp(1.25, 1, e); cat.sy = lerp(0.75, 1, e); });
    } else {
      cat.x = x1; cat.y = y1;
      rt.run(380, 'outElastic', (e) => { cat.sx = lerp(1.22, 1, e); cat.sy = lerp(0.8, 1, e); });   // squash on landing
    }
  }
  /** straight vertical drop with a spin */
  async function catDrop(y1, ms) {
    const y0 = cat.y; unperch();
    await rt.run(ms, 'inQuad', (e) => { cat.y = lerp(y0, y1, e); cat.rot = lerp(0, 220, e); });
    cat.rot = 0;
  }

  const setGapRoof = (i, animateIt = false) => {
    $('#gapLabel').textContent = `${THIEF_ROOF - i}.0 m`;
    const to = roofRight(i);
    const layout = (startX) => {
      const end = roofX(THIEF_ROOF);
      const len = Math.max(0, end - startX);
      const l = $('#gapLine');
      l.setAttribute('x1', startX); l.setAttribute('x2', startX + len);
      $('#gapTickL').setAttribute('cx', startX); $('#gapTickR').setAttribute('cx', end - 1);
      $('#gapLabel').setAttribute('x', startX + len / 2);
    };
    if (!animateIt || reducedMotion()) { gapFrom = to; layout(to); return; }
    const from = gapFrom;
    rt.run(300, 'outCubic', (e) => layout(from + (to - from) * e)).then(() => { gapFrom = to; });
  };
  const hideGap = () => { $('#gapGroup').style.display = 'none'; $('#lookLabel').style.opacity = 0; };
  const showGap = () => { $('#gapGroup').style.display = ''; $('#lookLabel').style.opacity = 1; };

  /* ----------------------------------------------------------------- lights */
  function setLight(n) { glow.setAttribute('opacity', (Math.min(n, 5) * 0.011).toFixed(3)); lightState.litN = n; }
  /** the thief's glow follows the thief: it leaves with it, no light box left behind */
  const thiefGlow = (on) => rt.tween(lightState, { thief: on ? 1 : 0 }, 300, 'outCubic');
  const dim = (on) => { rt.run(300, 'outCubic', (e) => dimmerEl.setAttribute('opacity', lerp(on ? 0 : 0.62, on ? 0.62 : 0, e))); };
  const lamp = (i, missed) => $(`.lamp[data-i="${i}"]`).classList.add(missed ? 'missed' : 'lit');

  /* --------------------------------------------------------------- characters */
  const catAnim = (name) => {
    if (name === 'sit_smug' && !perched) cat.attach = false;
    return catRig.play(name);
  };
  const thiefAnim = (name) => thiefRig.play(name);
  const pausePlayers = () => { rt.hold = 1e9; };
  const resumePlayers = () => { rt.hold = 0; rt.holdWaiters.splice(0).forEach((r) => r()); };

  /* ------------------------------------------------------------------ effects */
  function flash() {
    if (reducedMotion()) return;
    catRig.layer.setAttribute('filter', 'url(#flash)'); thiefRig.layer.setAttribute('filter', 'url(#flash)');
    setTimeout(() => { catRig.layer.removeAttribute('filter'); thiefRig.layer.removeAttribute('filter'); }, 90);
  }
  function shake(px = 4) {
    if (reducedMotion()) return;
    sceneEl.style.setProperty('--shake', Math.min(px, 4) + 'px');
    sceneEl.classList.remove('quake'); void sceneEl.offsetWidth; sceneEl.classList.add('quake');
    setTimeout(() => sceneEl.classList.remove('quake'), 260);
  }
  function dust(x, y, n = 12) {
    if (reducedMotion()) return;
    for (let k = 0; k < n; k++) {
      const c = el('circle', { cx: x, cy: y, r: 1.6 + Math.random() * 2.6, fill: k % 2 ? '#8B86B8' : '#5E5A8A', opacity: 0.8 }, fx);
      const dx = (Math.random() - 0.5) * 60; const up = 8 + Math.random() * 22;
      rt.run(520 + Math.random() * 200, 'outCubic', (e, kk) => { c.setAttribute('cx', x + dx * e); c.setAttribute('cy', y - up * Math.sin(Math.PI * Math.min(1, e * 0.9)) + 4 * e); c.setAttribute('opacity', (0.8 * (1 - kk)).toFixed(2)); c.setAttribute('r', (1.6 + (k % 4) * 0.7) * (1 + e)); }).then(() => c.remove());
    }
  }
  /** trailing speed lines behind the cat while it leaps */
  function speedLines(x0, y0, x1, y1, ms, apex = 40) {
    if (reducedMotion()) return;
    for (let i = 0; i < 4; i++) {
      const l = el('path', { d: '', fill: 'none', stroke: '#F4E7C3', 'stroke-width': 1.4 - i * 0.2, 'stroke-linecap': 'round', opacity: 0.7 }, fx);
      const pt = (u) => [lerp(x0, x1, u), lerp(y0, y1, u) - 4 * apex * u * (1 - u) - 18 + i * 5];
      rt.run(ms + 120, 'linear', (e, k) => {
        const a = pt(Math.max(0, e - 0.16 - i * 0.02)); const b = pt(Math.max(0, e - 0.02));
        l.setAttribute('d', `M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}`); l.setAttribute('opacity', (0.7 * (1 - k)).toFixed(2));
      }).then(() => l.remove());
    }
  }
  /** a spotlight cone falls onto the thief's face */
  function spotlight(on) {
    const fxp = THIEF_X; const fy = THIEF_Y - 58;
    $('#spot').setAttribute('points', `${fxp - 4},${fy - 110} ${fxp + 4},${fy - 110} ${fxp + 34},${fy + 60} ${fxp - 34},${fy + 60}`);
    rt.tween(lightState, { spot: on ? 1 : 0 }, 350, 'outCubic');
  }
  const ensureMask = () => {
    if (!maskEl) { maskEl = maskShape(fx, { opacity: 0 }); }
    return maskEl;
  };
  /** the mask comes off, spins up and lands on the roof */
  async function maskFly(ms = 600) {
    const m = ensureMask();
    const sx = THIEF_X + 2; const sy = THIEF_Y - 128 * TS;
    const rx = MASK_REST.x; const ry = MASK_REST.y;
    m.setAttribute('opacity', 1);
    thief.face = 1;                                          // the bare face shows as the mask leaves
    const sc = TS * 1.25;
    await rt.run(ms, 'linear', (e) => {
      const x = lerp(sx, rx, EASE_OUT(e)); const y = lerp(sy, ry, e) - 52 * 4 * e * (1 - e);
      m.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(EASE_OUT(e) * 540).toFixed(0)}) scale(${lerp(sc, sc * 0.8, e).toFixed(3)})`);
    });
    showMaskRest();
  }
  const EASE_OUT = (u) => 1 - (1 - u) * (1 - u);
  const showMaskRest = () => { const m = ensureMask(); m.setAttribute('opacity', 1); m.setAttribute('transform', `translate(${MASK_REST.x} ${MASK_REST.y}) rotate(-8) scale(${TS * 1.0})`); };
  const lidFly = (bi) => {
    const lid = $(`.bin[data-i="${bi}"] .lid`);
    if (reducedMotion()) { lid.style.visibility = 'hidden'; return; }
    rt.run(600, 'outCubic', (e) => lid.setAttribute('transform', `translate(${(e * 34).toFixed(1)} ${(-Math.sin(Math.PI * e) * 56 + e * 22).toFixed(1)}) rotate(${(e * 320).toFixed(0)} 14 4)`));
  };

  /* ------------------------------------------------------------------ states */
  function setCatRoof(i, anim = 'idle') {
    roof = i;
    placeCat(catX(i), catY(i));
    catRig.resetState(); cat.mode = 'idle';
    catAnim(anim);
    showGap();
    setGapRoof(i);
    mode = 'chase';
    camTo(target(), 0);
  }
  function showCaught() {
    hideGap();
    thiefState = 'caught';
    thief.face = 1; thiefAnim('tied');
    thiefRig.state.sit = 1; thief.yarn = 1;
    thiefGlow(false);
    spotlight(false);
    showMaskRest();
    setLight(8);
    perched = true; cat.attach = true; cat.cs = CS * 0.72;
    const [sx, sy] = thiefRig.shoulder(1); cat.x = sx; cat.y = sy;
    catRig.play('sit_smug');
    mode = 'caught';
    camTo(target(), 0);
  }
  function showOnFoot(step = 0) {
    hideGap();
    showGone();
    walkTo(step, false);
  }
  function showGone() { thiefState = 'gone'; thiefRig.layer.style.display = 'none'; $('#thiefLabel').style.opacity = 0; thiefGlow(false); }

  async function walkTo(step, animateIt = true) {
    const x1 = footX(step);
    $('#bins').querySelectorAll('.bin').forEach((b) => { b.style.visibility = ''; });
    mode = 'street';
    unperch();
    if (!animateIt || reducedMotion()) { placeCat(x1, FOOT_Y); catAnim('idle'); camTo(target(), 0); return; }
    catAnim('walk');
    const x0 = cat.x; const y0 = cat.y;
    camTo({ ...target(), cx: Math.max(100, Math.min(x1 + 50, 330)) }, 500);
    await rt.run(560, 'inOutSine', (e) => { cat.x = lerp(x0, x1, e); cat.y = lerp(y0, FOOT_Y, e); });
    catAnim('idle');
  }

  /* ------------------------------------------------ geometry used by sequences */
  const geo = {
    roofCat: (i) => ({ x: catX(i), y: catY(i) }),
    impact: () => ({ x: THIEF_X - 22 - NOSE, y: THIEF_Y - 28 }),                // the cat meets the thief's chest
    hat: () => { const [x, y] = thiefRig.shoulder(0); return { x, y }; },
    tiedHat: () => { const [x, y] = thiefRig.shoulder(1); return { x, y }; },
    thief: () => ({ x: THIEF_X, y: THIEF_Y }),
    nearestBin(x) { let bi = 0; BINS.forEach((b, k) => { if (Math.abs(b + BIN_W / 2 - x) < Math.abs(BINS[bi] + BIN_W / 2 - x)) bi = k; }); return bi; },
    bin: (bi) => ({ x: BINS[bi] + BIN_W / 2, y: STREET + 8 }),
    cat: () => ({ x: cat.x, y: cat.y }),
    reach: (frac) => cat.x + (roofX(THIEF_ROOF) - cat.x) * frac,
    midAirY: () => cat.y + 10
  };

  /** thief runs off the right edge of the world */
  async function thiefRun(ms = 650) {
    thiefAnim('run');
    $('#thiefLabel').style.opacity = 0;
    thiefGlow(false);
    const x0 = thief.x;
    await rt.run(ms, 'inQuad', (e) => { thief.x = x0 + 520 * e; });
    showGone();
  }

  // initial state
  thiefAnim('sneak');
  catAnim('idle');
  setGapRoof(0);
  lightState.thief = 1;
  render();

  return {
    el: host, svg, sceneEl, overlay: () => $('#overlay'), rt,
    frame, camTo, render, getMode: () => mode,
    setReserve: (px) => { reserve = px; render(); },
    refit: () => { readSafe(); render(); },
    lamp, setLight, thiefGlow, dim, spotlight,
    catAnim, catAsync: catAnim, thiefAnim, thiefAsync: thiefAnim, pausePlayers, resumePlayers,
    placeCat, placeThief, catArc, catDrop, thiefRun, walkTo,
    flash, shake, dust, speedLines, maskFly, showMaskRest, lidFly,
    hideBin: (bi) => { $(`.bin[data-i="${bi}"]`).style.visibility = 'hidden'; },
    binsShake: () => $('#bins').classList.add('clatter-on'),
    setCatRoof, setGapRoof, hideGap, showGap, showCaught, showOnFoot, showGone, geo,
    getRoof: () => roof, setRoof: (i) => { roof = i; },
    thiefState: () => thiefState,
    setThiefState: (s) => { thiefState = s; },
    thiefRect: () => thiefRig.layer.getBoundingClientRect(),
    catRect: () => catRig.layer.getBoundingClientRect(),
    lampRect: (i) => $(`.lamp[data-i="${i}"]`).getBoundingClientRect(),
    isAlive: () => alive,
    destroy: () => { alive = false; ro.disconnect(); rt.destroy(); }
  };
}
