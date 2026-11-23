// The night world: a long strip of rooftops with a CAMERA. The thief stands on the last roof;
// the cat starts on the first. The camera frames the cat and the thief together and pushes in as the
// gap closes. The world stays put; only the cat (and the thief, when it runs) move.
import { C, rect, stars, glyph, rng, moon } from './pixel.js';
import { catParts } from './cat.js';
import { thiefParts, maskPiece } from './thief.js';
import { reducedMotion } from './fx.js';

// ---- world geometry (world units; the camera decides how big a unit is on screen)
export const P = 60;          // roof pitch
export const W = 56;          // roof width
const X0 = 8;
const SURF = [152, 144, 156, 142, 150, 146]; // rooftop surface heights
const STREET = 214;
const CAT = 3.5;              // cat cell size  -> cat is 56 units long, 28 tall
const TH = 4;                 // thief cell size -> thief is 48 wide, 88 tall
export const THIEF_ROOF = 5;
const BINS = [20, 92, 164, 236, 308];
const BIN_W = 28;
const MIN_V = 176;            // vertical extent the camera must always show (thief top to street)

export const roofX = (i) => X0 + P * i;
const roofRight = (i) => roofX(i) + W;
const catX = (i) => roofX(i) + W - 16 * CAT;      // nose at the roof edge
const catY = (i) => SURF[i] - 8 * CAT;
const THIEF_X = roofX(THIEF_ROOF) + 4;
const THIEF_Y = SURF[THIEF_ROOF] - 22 * TH;
const CAUGHT_X = roofX(THIEF_ROOF) + 3;
const CAUGHT_Y = SURF[THIEF_ROOF] - 14 * CAT;
const FOOT_Y = STREET + 14 - 8 * CAT;
const footX = (step) => 18 + step * 46;
const snap = (v) => Math.round(v / 2) * 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    <svg class="world" viewBox="0 0 360 240" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges" role="img" aria-label="A row of rooftops at night. Your cat is on one roof; the masked thief is on the far right roof.">
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
      <g id="thiefLight" style="--lit:0">${rect(roofX(THIEF_ROOF) - 20, SURF[THIEF_ROOF] - 110, 100, 110, C.amber, 'class="lg lg1"')}${rect(roofX(THIEF_ROOF) - 8, SURF[THIEF_ROOF] - 96, 76, 96, C.amber, 'class="lg lg2"')}${rect(roofX(THIEF_ROOF) + 4, SURF[THIEF_ROOF] - 80, 52, 80, C.amber, 'class="lg lg3"')}</g>
      <g id="thiefPos" style="transform:translate(${THIEF_X}px,${THIEF_Y}px)"><g id="thiefArt" transform="scale(${TH})"></g></g>
      <g id="maskG" opacity="0"><g id="maskArt" transform="scale(${TH})">${maskPiece()}</g></g>
      <g id="catPos" style="transform:translate(${catX(0)}px,${catY(0)}px)"><g id="catRot" class="cat-rot"><g id="catArt" transform="scale(${CAT})"></g></g></g>
      <g id="dust"></g>
      <text id="clatter" class="clatter" x="150" y="190" text-anchor="middle" fill="${C.amber}" opacity="0">CLATTER!</text>
    </svg>
    <div class="lamps" aria-hidden="true">${[0, 1, 2, 3, 4].map((i) => `<span class="lamp" data-i="${i}">${LAMP_SVG}</span>`).join('')}</div>
    <div class="overlay" id="overlay"></div>
  </div>`;

  const $ = (s) => host.querySelector(s);
  const sceneEl = $('.scene');
  const svg = $('.world');
  const catPos = $('#catPos');
  const catArt = $('#catArt');
  const thiefPos = $('#thiefPos');
  const thiefArt = $('#thiefArt');
  const maskG = $('#maskG');
  const glow = $('#sceneGlow');
  const dimmer = $('#dimmer');
  const light = $('#thiefLight');

  let cx = catX(0);
  let cy = catY(0);
  let roof = 0;
  let thief = 'stand';
  let alive = true;
  let clatterCb = null;
  let mode = 'chase';
  let gapFrom = roofRight(0);

  /* ------------------------------------------------------------------ camera */
  const cam = { cx: 190, yb: 246, w: 384 };
  let camRaf = 0;

  function render() {
    const cw = sceneEl.clientWidth;
    const ch = sceneEl.clientHeight;
    if (!cw || !ch) return;
    const aspect = ch / cw;
    const minV = ch >= 300 ? 232 : MIN_V; // always see the floating "?" over the thief's hat and the street (less when the scene is squeezed)
    const w = Math.max(cam.w, minV / aspect);
    const h = w * aspect;
    svg.setAttribute('viewBox', `${(cam.cx - w / 2).toFixed(2)} ${(cam.yb - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);
  }

  function camTo(t, ms = 400) {
    cancelAnimationFrame(camRaf);
    const to = { ...cam, ...t };
    if (!ms || reducedMotion()) { Object.assign(cam, to); render(); return Promise.resolve(); }
    const from = { ...cam };
    const t0 = performance.now();
    return new Promise((res) => {
      const step = (now) => {
        const k = Math.min(1, (now - t0) / ms);
        const e = 1 - Math.pow(1 - k, 3); // ease-out
        cam.cx = from.cx + (to.cx - from.cx) * e;
        cam.yb = from.yb + (to.yb - from.yb) * e;
        cam.w = from.w + (to.w - from.w) * e;
        render();
        if (k < 1) camRaf = requestAnimationFrame(step); else res();
      };
      camRaf = requestAnimationFrame(step);
    });
  }

  /** Where the camera should be for the current mode. */
  function target() {
    if (mode === 'chase') {
      const left = roofX(roof) - 4;
      const right = roofRight(THIEF_ROOF) - 2;
      return { cx: (left + right) / 2, yb: 246, w: right - left };
    }
    if (mode === 'thief') return { cx: roofX(THIEF_ROOF) + 4, yb: 214, w: 170 };      // hero push-in
    if (mode === 'caught') return { cx: roofX(THIEF_ROOF) - 10, yb: 240, w: 230 };
    if (mode === 'fall') return { cx: Math.max(60, Math.min(cx + 30, 330)), yb: 252, w: 210 };
    if (mode === 'street') return { cx: Math.max(100, Math.min(cx + 50, 330)), yb: 250, w: 250 };
    return { cx: 190, yb: 246, w: 384 };
  }
  const frame = (m = mode, ms = 400) => { mode = m; return camTo(target(), ms); };

  const ro = new ResizeObserver(() => render());
  ro.observe(sceneEl);

  /* ------------------------------------------------------------------ helpers */
  const place = (x, y) => { cx = x; cy = y; catPos.getAnimations().forEach((a) => a.cancel()); catPos.style.transform = `translate(${x}px,${y}px)`; };
  const setPose = (name) => { catArt.innerHTML = catParts(name); };
  const animate = (el, frames, opts) => el.animate(frames, opts).finished.catch(() => {});

  function setThief(state) {
    thief = state;
    thiefPos.style.opacity = state === 'gone' ? 0 : 1;
    $('#thiefLabel').style.opacity = state === 'stand' ? 1 : 0;
    thiefPos.getAnimations().forEach((a) => a.cancel());
    if (state === 'caught') {
      thiefArt.setAttribute('transform', `scale(${CAT})`);
      thiefArt.innerHTML = thiefParts('caught');
      thiefPos.style.transform = `translate(${CAUGHT_X}px,${CAUGHT_Y}px)`;
    } else {
      thiefArt.setAttribute('transform', `scale(${TH})`);
      thiefArt.innerHTML = thiefParts(state === 'run1' || state === 'run2' ? state : 'stand');
      thiefPos.style.transform = `translate(${THIEF_X}px,${THIEF_Y}px)`;
    }
    thiefArt.classList.remove('glance');
  }

  /* --------------------------------------------------------------- the gap line */
  /** Computed from the real positions: the cat's roof edge to the thief's roof edge. */
  function layoutGap(startX) {
    const end = roofX(THIEF_ROOF);
    const len = Math.max(0, end - startX);
    $('#gapLine').setAttribute('x', startX);
    $('#gapLine').setAttribute('width', len);
    $('#gapTickL').setAttribute('x', startX);
    $('#gapTickR').setAttribute('x', end - 2);
    $('#gapLabel').setAttribute('x', startX + len / 2);
  }
  function setGapRoof(i, animateIt = false) {
    $('#gapLabel').textContent = `${THIEF_ROOF - i}.0m gap`;
    const to = roofRight(i);
    if (!animateIt || reducedMotion()) { gapFrom = to; layoutGap(to); return; }
    const from = gapFrom;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 360);
      layoutGap(from + (to - from) * k);
      if (k < 1 && alive) requestAnimationFrame(step); else gapFrom = to;
    };
    requestAnimationFrame(step);
  }
  const hideGap = () => { $('#gapGroup').style.display = 'none'; $('#lookLabel').style.opacity = 0; }; // the chase is over
  const showGap = () => { $('#gapGroup').style.display = ''; $('#lookLabel').style.opacity = 1; };

  /* ----------------------------------------------------------------- setters */
  function setLight(n) {
    light.style.setProperty('--lit', n);
    glow.setAttribute('opacity', (Math.min(n, 5) * 0.011).toFixed(3));
  }
  const dim = (on) => dimmer.setAttribute('opacity', on ? '0.62' : '0');

  /** Lanterns are pure light: amber for a correct answer, dim for a missed one. */
  function lightLamp(i, missed) {
    $(`.lamp[data-i="${i}"]`).classList.add(missed ? 'missed' : 'lit');
  }

  /** Cat on a roof, instantly (no animation). */
  function setCatRoof(i, pose = 'crouch') {
    roof = i;
    place(catX(i), catY(i));
    setPose(pose);
    showGap();
    setGapRoof(i);
    mode = 'chase';
    camTo(target(), 0);
  }

  /* ------------------------------------------------------------ animation */
  function arc(x0, y0, x1, y1, apex, n, t1 = 1) {
    const frames = [];
    for (let k = 0; k <= n; k++) {
      const t = (k / n) * t1;
      frames.push({ transform: `translate(${snap(x0 + (x1 - x0) * t)}px, ${snap(y0 + (y1 - y0) * t - 4 * apex * t * (1 - t))}px)`, offset: k / n, easing: 'steps(1, end)' });
    }
    return frames;
  }

  /** The cat creeps one roof closer: a small two-frame jump; the camera pushes in a little. */
  async function hopTo(i) {
    if (i === roof) return;
    const x1 = catX(i);
    const y1 = catY(i);
    roof = i;
    setGapRoof(i, true);
    frame('chase', 400);
    setPose('leap');
    if (reducedMotion()) place(x1, y1);
    else {
      await animate(catPos, arc(cx, cy, x1, y1, 22, 6), { duration: 360, fill: 'forwards' });
      place(x1, y1);
      setPose('land');
      await sleep(120);
    }
    setPose('crouch');
  }

  /** After clue 1 the cat stays put but reacts: eyes narrow, it lowers, and the thief glances back. */
  async function react() {
    setPose('narrow');
    thiefArt.classList.add('glance');
    await sleep(reducedMotion() ? 300 : 1100);
    thiefArt.classList.remove('glance');
    if (thief === 'stand') setPose('crouch');
  }

  function dust(x, y, n = 12) {
    if (reducedMotion()) return;
    const g = $('#dust');
    for (let k = 0; k < n; k++) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const s = k % 3 === 0 ? 4 : 2;
      el.setAttribute('width', s); el.setAttribute('height', s); el.setAttribute('fill', k % 2 ? C.muted : C.dim);
      el.setAttribute('x', x); el.setAttribute('y', y);
      g.appendChild(el);
      const dx = (Math.random() - 0.5) * 64;
      el.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${snap(dx)}px,${-snap(10 + Math.random() * 26)}px)`, opacity: 1, offset: 0.5 }, { transform: `translate(${snap(dx * 1.3)}px,4px)`, opacity: 0 }],
        { duration: 600, easing: 'steps(6)', fill: 'forwards' }).finished.then(() => el.remove(), () => el.remove());
    }
  }

  function shake() {
    if (reducedMotion()) return;
    sceneEl.classList.remove('shake6');
    void sceneEl.offsetWidth;
    sceneEl.classList.add('shake6');
    setTimeout(() => sceneEl.classList.remove('shake6'), 260);
  }

  async function shakeThief() {
    if (reducedMotion()) return;
    await animate(thiefPos, [0, -4, 4, -4, 4, 0].map((dx, k) => ({ transform: `translate(${THIEF_X + dx}px,${THIEF_Y}px)`, offset: k / 5, easing: 'steps(1,end)' })), { duration: 420 });
    thiefPos.style.transform = `translate(${THIEF_X}px,${THIEF_Y}px)`;
  }

  function maskRest() {
    maskG.getAnimations().forEach((a) => a.cancel());
    maskG.setAttribute('opacity', '1');
    $('#maskArt').setAttribute('transform', 'scale(2)');
    maskG.style.transform = `translate(${roofX(THIEF_ROOF) + 36}px,${SURF[THIEF_ROOF] - 10}px)`;
  }

  /** Correct pounce: a big arc onto the thief's roof, the thief staggers, the mask flips off and spins away. */
  async function leapCatch() {
    dim(false);
    hideGap();
    mode = 'thief';
    const cam1 = camTo(target(), 500);
    setPose('wiggle');
    await sleep(reducedMotion() ? 0 : 200);
    setPose('leap');
    const x1 = roofX(THIEF_ROOF) - 2;
    const y1 = catY(THIEF_ROOF);
    if (!reducedMotion()) await animate(catPos, arc(cx, cy, x1, y1, 46 + (x1 - cx) * 0.1, 12), { duration: 650, fill: 'forwards' });
    place(x1, y1);
    setPose('land');
    dust(x1 + 20, SURF[THIEF_ROOF] - 4, 8);
    await shakeThief();
    // the mask flips off and spins away
    maskG.setAttribute('opacity', '1');
    $('#maskArt').setAttribute('transform', `scale(${TH})`);
    const mx = THIEF_X + 4 * TH;
    const my = THIEF_Y + 5 * TH;
    setThief('caught');
    light.style.setProperty('--lit', 8);
    if (!reducedMotion()) {
      const spin = $('#maskArt');
      spin.style.transformBox = 'fill-box';
      spin.style.transformOrigin = 'center';
      spin.animate([{ rotate: '0deg' }, { rotate: '540deg' }], { duration: 640, easing: 'steps(8)' });
      await animate(maskG, [
        { transform: `translate(${mx}px,${my}px)` },
        { transform: `translate(${mx - 20}px,${my - 56}px)`, offset: 0.35 },
        { transform: `translate(${mx - 60}px,${my - 30}px)`, offset: 0.7 },
        { transform: `translate(${roofX(THIEF_ROOF) + 36}px,${SURF[THIEF_ROOF] - 10}px)` }
      ], { duration: 640, easing: 'steps(8)', fill: 'forwards' });
    }
    maskRest();
    await cam1;
    await sleep(reducedMotion() ? 100 : 300);
    // the cat sits proudly on the thief
    setPose('leap');
    const sx = CAUGHT_X + 2;
    const sy = CAUGHT_Y - 8 * CAT + 6;
    if (!reducedMotion()) await animate(catPos, arc(cx, cy, sx, sy, 18, 5), { duration: 300, fill: 'forwards' });
    place(sx, sy);
    setPose('proud');
  }

  /** The thief runs off the right edge of the world. */
  async function runThief() {
    if (thief === 'gone' || thief === 'caught') return;
    thiefPos.getAnimations().forEach((a) => a.cancel());
    $('#thiefLabel').style.opacity = 0;
    if (reducedMotion()) { setThief('gone'); return; }
    thiefArt.setAttribute('transform', `scale(${TH})`);
    let f = 0;
    const iv = setInterval(() => { f ^= 1; thiefArt.innerHTML = thiefParts(f ? 'run1' : 'run2'); }, 110);
    await animate(thiefPos, [{ transform: `translate(${THIEF_X}px,${THIEF_Y}px)` }, { transform: `translate(${THIEF_X + 520}px,${THIEF_Y}px)` }], { duration: 1000, easing: 'steps(12)', fill: 'forwards' });
    clearInterval(iv);
    setThief('gone');
  }

  /** Wrong pounce: leap, fall short, tumble into the bins. The camera follows the cat down. Returns the bin index. */
  async function leapFail() {
    dim(false);
    hideGap();
    const startX = cx;
    const startY = cy;
    const reach = startX + (roofX(THIEF_ROOF) - startX) * 0.62;
    let bi = 0;
    BINS.forEach((b, k) => { if (Math.abs(b + BIN_W / 2 - reach) < Math.abs(BINS[bi] + BIN_W / 2 - reach)) bi = k; });
    const bx = BINS[bi];
    setPose('wiggle');
    await sleep(reducedMotion() ? 0 : 200);
    setPose('leap');
    const x1 = bx + BIN_W / 2 - 8 * CAT;
    const y1 = STREET + 14 - 8 * CAT - 2;
    mode = 'fall';
    camTo({ cx: Math.max(60, Math.min(bx + BIN_W / 2 + 10, 330)), yb: 252, w: 210 }, 700);
    if (!reducedMotion()) {
      setTimeout(() => setPose('tumble1'), 360);
      setTimeout(() => setPose('tumble2'), 520);
      setTimeout(() => setPose('tumble1'), 680);
      setTimeout(runThief, 300); // the thief notices and bolts
      await animate(catPos, arc(startX, startY, x1, y1, 40, 14), { duration: 900, fill: 'forwards' });
    } else runThief();
    clatterCb?.();
    shake();
    dust(x1 + 20, STREET + 10, 14);
    $('#bins').classList.add('clatter-on');
    $(`.bin[data-i="${bi}"]`).style.visibility = 'hidden';
    place(bx + BIN_W / 2 - 24, STREET + 22 - 30);
    setPose('bin');
    const ct = $('#clatter');
    ct.setAttribute('x', bx + BIN_W / 2);
    ct.setAttribute('y', STREET - 8);
    animate(ct, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)', offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 1200, easing: 'steps(6)' });
    await sleep(reducedMotion() ? 200 : 1100);
    return bi;
  }

  /** After a wrong pounce: the cat climbs out and walks the street, one step per clue. */
  async function walkTo(step, animateIt = true) {
    const x1 = footX(step);
    const y1 = FOOT_Y;
    $('#bins').querySelectorAll('.bin').forEach((b) => { b.style.visibility = ''; });
    mode = 'street';
    if (!animateIt || reducedMotion()) { place(x1, y1); setPose('crouch'); camTo(target(), 0); return; }
    let f = 0;
    const iv = setInterval(() => { f ^= 1; setPose(f ? 'walk1' : 'walk2'); }, 140);
    const x0 = cx;
    const y0 = cy;
    cx = x1; // the camera aims where the cat is going
    camTo(target(), 600);
    await animate(catPos, [{ transform: `translate(${x0}px,${y0}px)` }, { transform: `translate(${x1}px,${y1}px)` }], { duration: 600, easing: 'steps(8)', fill: 'forwards' });
    clearInterval(iv);
    place(x1, y1);
    setPose('crouch');
  }

  /* ------------------------------------------------- instant end states */
  function showCaught() {
    hideGap();
    setThief('caught');
    maskRest();
    setLight(8);
    place(CAUGHT_X + 2, CAUGHT_Y - 8 * CAT + 6);
    setPose('proud');
    mode = 'caught';
    camTo(target(), 0);
  }
  function showOnFoot(step = 0) {
    hideGap();
    setThief('gone');
    walkTo(step, false);
  }
  function showInBin(bi = 2) {
    hideGap();
    setThief('gone');
    $(`.bin[data-i="${bi}"]`).style.visibility = 'hidden';
    place(BINS[bi] + BIN_W / 2 - 24, STREET - 8);
    setPose('bin');
    mode = 'fall';
    camTo(target(), 0);
  }
  /** A mid-fall frame (storyboard / screenshots). */
  function showTumble(frameName = 'tumble2') {
    hideGap();
    setThief('run1');
    thiefPos.style.transform = `translate(${THIEF_X + 80}px,${THIEF_Y}px)`;
    place(BINS[2] + 10, 150);
    setPose(frameName);
    mode = 'fall';
    camTo(target(), 0);
  }
  /** The catch at its peak: cat landed, mask spinning away. */
  function showUnmasking() {
    hideGap();
    place(roofX(THIEF_ROOF) - 2, catY(THIEF_ROOF));
    setPose('land');
    setThief('caught');
    setLight(8);
    maskG.setAttribute('opacity', '1');
    $('#maskArt').setAttribute('transform', `scale(${TH})`);
    maskG.style.transform = `translate(${THIEF_X - 24}px,${THIEF_Y - 20}px)`;
    mode = 'thief';
    camTo(target(), 0);
  }

  setThief('stand');
  setPose('crouch');
  setGapRoof(0);
  render();

  return {
    el: host, svg, sceneEl, setPose, setLight, lightLamp, dim, setCatRoof, hopTo, react, leapCatch, leapFail, walkTo,
    runThief, showCaught, showOnFoot, showInBin, showTumble, showUnmasking, setThief, frame, camTo, render,
    lampRect: (i) => $(`.lamp[data-i="${i}"]`).getBoundingClientRect(),
    catRect: () => catPos.getBoundingClientRect(),
    thiefRect: () => thiefPos.getBoundingClientRect(),
    onClatter: (fn) => { clatterCb = fn; },
    getRoof: () => roof,
    getMode: () => mode,
    overlay: () => $('#overlay'),
    isAlive: () => alive,
    destroy: () => { alive = false; ro.disconnect(); cancelAnimationFrame(camRaf); }
  };
}
