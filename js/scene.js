// The night scene. A row of six rooftops; the thief stands on the rightmost, the cat starts on the leftmost.
// The WORLD STAYS PUT: only the cat moves (and the thief, when it runs). Fixed scenery, fixed layout.
import { C, rect, stars, glyph, rng, moon } from './pixel.js';
import { catParts } from './cat.js';
import { thiefParts, maskParts } from './thief.js';
import { reducedMotion } from './fx.js';

export const VW = 360;
export const VH = 240;
export const ROOF_W = 54;
const PITCH = 60;
const X0 = 3;
const SURF = [152, 144, 156, 142, 150, 146]; // rooftop surface heights
const STREET = 212;
const CELL = 3; // character pixel size
const BINS = [30, 86, 150, 214, 278];
export const THIEF_ROOF = 5;

const roofX = (i) => X0 + PITCH * i;
const lampX = (i) => roofX(i) + 27;
const catXOn = (i) => roofX(i) + 3;
const catYOn = (i) => SURF[i] - 8 * CELL;
const THIEF_X = roofX(THIEF_ROOF) + 9;
const THIEF_Y = SURF[THIEF_ROOF] - 19 * CELL;
const CAUGHT = { x: roofX(THIEF_ROOF) + 5, y: SURF[THIEF_ROOF] - 12 * CELL };
const FOOT_Y = STREET - 6;
const footX = (step) => 22 + step * 40;
const snap = (v) => Math.round(v / 2) * 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function lamp(i) {
  return `<g class="lantern" data-i="${i}" transform="translate(${lampX(i) - 6} 40)">
    <g class="lan-halo">${rect(-8, -4, 28, 32, C.amber, 'opacity=".07"')}${rect(-4, 0, 20, 24, C.amber, 'opacity=".1"')}</g>
    ${rect(5, -4, 2, 4, C.line)}${rect(0, 0, 12, 4, C.line)}
    <rect class="glass" x="0" y="4" width="12" height="12"/><rect class="core" x="4" y="8" width="4" height="4"/>
    ${rect(0, 16, 12, 4, C.line)}
  </g>`;
}

function wire() {
  let out = '';
  for (let x = lampX(0) - 20; x < lampX(4) + 20; x += 4) out += rect(x, 36 + Math.round(1.5 * Math.sin(x / 40)), 4, 2, C.line);
  return out;
}

function windows(i, seed) {
  const r = rng(seed);
  let out = '';
  for (const y of [172, 184]) {
    for (const dx of [7, 23, 39]) {
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
  for (let i = -8; i < 14; i++) {
    const k = ((i % 6) + 6) % 6; // the city continues past both edges
    const x = roofX(i);
    const s = SURF[k];
    out += rect(x, s, ROOF_W, STREET - s, C.roof1) + rect(x, s, ROOF_W, 4, C.line);
    if (k === 1) out += rect(x + 8, s - 14, 10, 14, C.roof1) + rect(x + 6, s - 18, 14, 4, C.line); // chimney
    if (k === 2) out += rect(x + 36, s - 10, 8, 10, C.roof1) + rect(x + 34, s - 14, 12, 4, C.line);
    if (k === 3) out += rect(x + 6, s - 6, 3, 6, C.roof1) + rect(x + 22, s - 6, 3, 6, C.roof1) + rect(x + 4, s - 18, 24, 12, C.roof1) + rect(x + 8, s - 22, 16, 4, C.roof1); // water tank
    if (k === 4) out += rect(x + 40, s - 26, 2, 26, C.line) + rect(x + 34, s - 20, 14, 2, C.line); // antenna
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
  let out = rect(-500, STREET, VW + 1000, VH - STREET + 200, C.shadow) + rect(-500, STREET, VW + 1000, 2, C.line);
  for (let x = -496; x < VW + 500; x += 36) out += rect(x, STREET + 22, 16, 2, C.line, 'opacity=".6"');
  return out;
}

function bins() {
  return BINS.map((x, i) => `<g class="bin" data-i="${i}" transform="translate(${x} ${STREET - 6})">
    ${rect(0, 6, 20, 20, '#2E2C52')}${rect(0, 6, 20, 2, C.line)}${rect(4, 10, 2, 12, C.line)}${rect(10, 10, 2, 12, C.line)}${rect(15, 10, 2, 12, C.line)}
    <g class="lid">${rect(-2, 2, 24, 4, '#403D6E')}${rect(8, 0, 4, 2, '#403D6E')}</g></g>`).join('');
}

function farSkyline() {
  const r = rng(21);
  let out = '';
  let x = -500;
  while (x < VW + 500) {
    const w = (5 + Math.floor(r() * 7)) * 4;
    const h = 64 + Math.floor(r() * 24) * 4;
    out += rect(x, STREET - h, w, h, C.roof2);
    if (r() < 0.35) out += rect(x + 6, STREET - h - 8, 6, 8, C.roof2);
    for (let wy = STREET - h + 8; wy < STREET - 70; wy += 12) for (let wx = x + 5; wx < x + w - 5; wx += 10) if (r() < 0.1) out += rect(wx, wy, 4, 4, C.amber, 'opacity=".22"');
    x += w + (r() < 0.4 ? 4 : 0);
  }
  return out;
}

export const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function createScene(host) {
  host.innerHTML = `
  <div class="scene stars-bg">
   <svg class="scene-moon" viewBox="0 0 48 48" shape-rendering="crispEdges" aria-hidden="true">${moon(20, 22, 5)}</svg>
   <div class="stage" id="stage">
    <svg class="scene-svg" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMax meet" shape-rendering="crispEdges" role="img" aria-label="A row of rooftops at night. Your cat is on one roof; the masked thief is on the far right roof.">
      <g>${stars(VW, 560, 100, 11, 440)}</g>
      <rect id="sceneGlow" x="-500" y="-200" width="${VW + 1000}" height="900" fill="${C.amber}" opacity="0"/>
      <g class="gnd">
        ${farSkyline()}
        ${buildings()}
        ${neonSign(roofX(1) + 5, SURF[1] + 16)}
        ${street()}
        <g id="bins">${bins()}</g>
        <text class="atmo" x="6" y="208" fill="${C.dim}">don't look down</text>
        <text id="thiefLabel" class="atmo" x="${roofX(THIEF_ROOF) + 27}" y="${SURF[THIEF_ROOF] + 18}" text-anchor="middle" fill="${C.dim}">the thief</text>
        <g id="gapGroup">
          <g id="gapLine" class="slide" style="transform-origin:${roofX(THIEF_ROOF)}px 0">${rect(roofX(0) + ROOF_W, 112, roofX(THIEF_ROOF) - roofX(0) - ROOF_W, 2, C.amber, 'opacity=".8"').replace('y="112"','y="116"')}${rect(roofX(0) + ROOF_W, 112, 2, 10, C.amber)}</g>
          ${rect(roofX(THIEF_ROOF) - 2, 112, 2, 10, C.amber)}
          <text id="gapLabel" class="gap-label slide" x="${(roofX(0) + ROOF_W + roofX(THIEF_ROOF)) / 2}" y="110" text-anchor="middle" fill="${C.amber}">5.0m gap</text>
        </g>
      </g>
      <g id="lanterns" class="gnd">${wire()}${[0, 1, 2, 3, 4].map(lamp).join('')}</g>
      <rect id="dimmer" x="-500" y="-200" width="${VW + 1000}" height="900" fill="${C.shadow}" opacity="0"/>
      <g class="gnd">
        <g id="thiefLight" style="--lit:0">${rect(roofX(THIEF_ROOF) - 14, SURF[THIEF_ROOF] - 88, 76, 88, C.amber, 'class="lg lg1"')}${rect(roofX(THIEF_ROOF) - 6, SURF[THIEF_ROOF] - 78, 60, 78, C.amber, 'class="lg lg2"')}${rect(roofX(THIEF_ROOF) + 2, SURF[THIEF_ROOF] - 68, 44, 68, C.amber, 'class="lg lg3"')}</g>
        <g id="thiefPos" style="transform:translate(${THIEF_X}px,${THIEF_Y}px)"><g id="thiefArt" transform="scale(${CELL})"></g></g>
        <g id="maskG" opacity="0"><g id="maskArt" transform="scale(${CELL})">${maskParts()}</g></g>
        <g id="plate" opacity="0"></g>
        <g id="catPos" style="transform:translate(${catXOn(0)}px,${catYOn(0)}px)"><g id="catRot" class="cat-rot"><g id="catArt" transform="scale(${CELL})"></g></g></g>
        <text id="clatter" class="clatter" x="150" y="196" text-anchor="middle" fill="${C.amber}" opacity="0">CLATTER!</text>
      </g>
    </svg>
    <div class="lantern-labels">${[0, 1, 2, 3, 4].map((i) => `<div class="ll" data-i="${i}" style="left:${(lampX(i) / VW) * 100}%"><span class="sr-only">Clue ${i + 1}: not answered yet</span></div>`).join('')}</div>
   </div>
  </div>`;

  const $ = (s) => host.querySelector(s);
  const stage = $('#stage');
  const svg = $('.scene-svg');
  const catPos = $('#catPos');
  const catArt = $('#catArt');
  const thiefPos = $('#thiefPos');
  const thiefArt = $('#thiefArt');
  const maskG = $('#maskG');
  const plate = $('#plate');
  const gapLine = $('#gapLine');
  const gapLabel = $('#gapLabel');
  const gapGroup = $('#gapGroup');
  const glow = $('#sceneGlow');
  const dimmer = $('#dimmer');
  const light = $('#thiefLight');

  let cx = catXOn(0);
  let cy = catYOn(0);
  let roof = 0;
  let thief = 'stand';
  let alive = true;
  let clatterCb = null;

  /* ----------------------------------------------------------------- layout */
  function fitLabel(el) {
    el.style.fontSize = '';
    let size = parseFloat(getComputedStyle(el).fontSize);
    let guard = 0;
    while (el.scrollWidth > el.clientWidth + 0.5 && size > 8 && guard++ < 30) { size -= 0.5; el.style.fontSize = size + 'px'; }
  }
  const fitAll = () => host.querySelectorAll('.ll.filled').forEach(fitLabel);
  const sceneEl = $('.scene');
  function layout() {
    const cw = sceneEl.clientWidth;
    const ch = sceneEl.clientHeight;
    if (!cw || !ch) return;
    const vh = Math.max(VH, Math.min(560, Math.round((VW * ch) / cw)));
    svg.setAttribute('viewBox', `0 0 ${VW} ${vh}`);
    host.querySelectorAll('.gnd').forEach((g) => g.setAttribute('transform', `translate(0 ${vh - VH})`));
    stage.style.setProperty('--vh', vh);
    $('.lantern-labels').style.top = `${((vh - VH + 64) / vh) * 100}%`;
    fitAll();
  }
  new ResizeObserver(layout).observe(sceneEl);
  document.fonts?.ready.then(layout);

  /* ------------------------------------------------------------------ setters */
  const place = (x, y) => { cx = x; cy = y; catPos.getAnimations().forEach((a) => a.cancel()); catPos.style.transform = `translate(${x}px,${y}px)`; };
  const setPose = (name) => { catArt.innerHTML = catParts(name); };
  const setThiefPoseOnly = (p) => { thiefArt.innerHTML = thiefParts(p); };
  function setThief(state) {
    thief = state;
    thiefPos.style.opacity = state === 'gone' ? 0 : 1;
    if (state === 'caught') {
      thiefArt.innerHTML = thiefParts('caught');
      thiefPos.getAnimations().forEach((a) => a.cancel());
      thiefPos.style.transform = `translate(${CAUGHT.x}px,${CAUGHT.y}px)`;
    } else {
      thiefArt.innerHTML = thiefParts(state === 'run1' || state === 'run2' ? state : 'stand');
      if (state === 'stand') { thiefPos.getAnimations().forEach((a) => a.cancel()); thiefPos.style.transform = `translate(${THIEF_X}px,${THIEF_Y}px)`; }
    }
  }
  /** m = metres to the thief (5..1), or null to hide the gap line. */
  function setGap(m) {
    gapGroup.style.display = m == null ? 'none' : '';
    if (m == null) return;
    const catRight = roofX(THIEF_ROOF - Math.round(m)) + ROOF_W;
    const full = roofX(THIEF_ROOF) - (roofX(0) + ROOF_W);
    const now = roofX(THIEF_ROOF) - catRight;
    gapLine.style.transform = `scaleX(${now / full})`;
    gapLabel.style.transform = `translateX(${-(full - now) / 2}px)`;
    gapLabel.textContent = `${m.toFixed(1)}m gap`;
  }
  function setLight(n) {
    light.style.setProperty('--lit', n);
    glow.setAttribute('opacity', (Math.min(n, 5) * 0.011).toFixed(3));
  }
  const dim = (on) => dimmer.setAttribute('opacity', on ? '0.62' : '0');

  function lightLamp(i, answer, missed, animate = true) {
    $(`.lantern[data-i="${i}"]`).classList.add(missed ? 'missed' : 'lit');
    const label = $(`.ll[data-i="${i}"]`);
    label.className = `ll filled ${missed ? 'missed' : 'lit'}${animate ? ' pop' : ''}`;
    label.innerHTML = `<span class="sr-only">Clue ${i + 1}${missed ? ' (missed)' : ''}: </span>${escapeHTML(answer)}`;
    fitLabel(label);
  }

  /** Cat on a roof, instantly. */
  function setCatRoof(i, pose = 'crouch') { roof = i; place(catXOn(i), catYOn(i)); setPose(pose); setGap(5 - i); }

  /* ---------------------------------------------------------------- animation */
  const animate = (el, frames, opts) => el.animate(frames, opts).finished.catch(() => {});

  function arc(x0, y0, x1, y1, apex, n, t1 = 1) {
    const frames = [];
    for (let k = 0; k <= n; k++) {
      const t = (k / n) * t1;
      frames.push({ transform: `translate(${snap(x0 + (x1 - x0) * t)}px, ${snap(y0 + (y1 - y0) * t - 4 * apex * t * (1 - t))}px)`, offset: k / n, easing: 'steps(1, end)' });
    }
    return frames;
  }

  /** The cat creeps one roof closer: a small pixel hop, upright. */
  async function hopTo(i) {
    const x1 = catXOn(i);
    const y1 = catYOn(i);
    setPose('leap');
    if (reducedMotion()) place(x1, y1);
    else {
      await animate(catPos, arc(cx, cy, x1, y1, 20, 6), { duration: 360, fill: 'forwards' });
      place(x1, y1);
      setPose('land');
      await sleep(120);
    }
    setPose('crouch');
    roof = i;
    setGap(5 - i);
  }

  async function shakeThief() {
    if (reducedMotion()) return;
    await animate(thiefPos, [0, -3, 3, -3, 3, 0].map((dx, k) => ({ transform: `translate(${THIEF_X + dx}px,${THIEF_Y}px)`, offset: k / 5, easing: 'steps(1,end)' })), { duration: 380 });
    thiefPos.style.transform = `translate(${THIEF_X}px,${THIEF_Y}px)`;
  }

  function showPlate(name, animateIn) {
    const w = Math.min(150, name.length * 7.6 + 22);
    const x = roofX(THIEF_ROOF) - 8 - w;
    const y = 98;
    plate.innerHTML = `${rect(x - 4, y - 4, w + 8, 38, C.amber, 'opacity=".18"')}${rect(x, y, w, 30, C.sky)}${rect(x, y, w, 2, C.amber)}${rect(x, y + 28, w, 2, C.amber)}${rect(x, y, 2, 30, C.amber)}${rect(x + w - 2, y, 2, 30, C.amber)}${rect(x + w, y + 12, 6, 2, C.amber)}
      <text class="sign-text" x="${x + w / 2}" y="${y + 20}" text-anchor="middle" fill="${C.moon}" textLength="${w - 16}" lengthAdjust="spacingAndGlyphs">${escapeHTML(name)}</text>`;
    plate.setAttribute('opacity', '1');
    if (animateIn && !reducedMotion()) animate(plate, [{ transform: 'translateY(10px)', opacity: 0 }, { transform: 'translateY(-3px)', opacity: 1, offset: 0.6 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 360, easing: 'steps(5)' });
  }

  function maskRest() {
    maskG.getAnimations().forEach((a) => a.cancel());
    maskG.setAttribute('opacity', '1');
    $('#maskArt').setAttribute('transform', 'scale(2)');
    maskG.style.transform = `translate(${roofX(THIEF_ROOF) + 40}px,${SURF[THIEF_ROOF] - 17}px)`;
  }

  /** Correct pounce: the cat leaps onto the thief's roof, the thief staggers, the mask flips off. */
  async function leapCatch(name) {
    dim(false);
    gapGroup.style.display = 'none'; // the chase is over
    const x1 = roofX(THIEF_ROOF) + 1;
    const y1 = catYOn(THIEF_ROOF);
    setPose('wiggle');
    await sleep(reducedMotion() ? 0 : 150);
    setPose('leap');
    if (!reducedMotion()) await animate(catPos, arc(cx, cy, x1, y1, 34 + (x1 - cx) * 0.12, 10), { duration: 560, fill: 'forwards' });
    place(x1, y1);
    setPose('land');
    await shakeThief();
    // the mask flips off
    maskG.setAttribute('opacity', '1');
    $('#maskArt').setAttribute('transform', `scale(${CELL})`);
    const mx = THIEF_X + 3 * CELL;
    const my = THIEF_Y + 4 * CELL;
    const rx = roofX(THIEF_ROOF) + 40;
    const ry = SURF[THIEF_ROOF] - 17;
    setThief('caught');
    light.style.setProperty('--lit', 8);
    if (!reducedMotion()) {
      await animate(maskG, [
        { transform: `translate(${mx}px,${my}px)` },
        { transform: `translate(${mx - 10}px,${my - 26}px)`, offset: 0.4 },
        { transform: `translate(${mx - 24}px,${my - 10}px)`, offset: 0.7 },
        { transform: `translate(${rx}px,${ry}px)` }
      ], { duration: 520, easing: 'steps(7)', fill: 'forwards' });
    }
    maskRest();
    showPlate(name, true);
    await sleep(reducedMotion() ? 200 : 450);
    // the cat sits proudly on the thief
    setPose('leap');
    const sx = CAUGHT.x + 2;
    const sy = CAUGHT.y - 8 * CELL + 6;
    if (!reducedMotion()) await animate(catPos, arc(cx, cy, sx, sy, 16, 5), { duration: 300, fill: 'forwards' });
    place(sx, sy);
    setPose('proud');
  }

  /** The thief runs off the right edge of the scene. */
  async function runThief() {
    if (thief === 'gone' || thief === 'caught') return;
    thiefPos.getAnimations().forEach((a) => a.cancel());
    $('#thiefLabel').style.opacity = 0;
    if (reducedMotion()) { setThief('gone'); return; }
    let f = 0;
    const iv = setInterval(() => { f ^= 1; setThiefPoseOnly(f ? 'run1' : 'run2'); }, 110);
    await animate(thiefPos, [{ transform: `translate(${THIEF_X}px,${THIEF_Y}px)` }, { transform: `translate(${VW + 60}px,${THIEF_Y}px)` }], { duration: 900, easing: 'steps(10)', fill: 'forwards' });
    clearInterval(iv);
    setThief('gone');
  }

  /** Wrong pounce: the cat leaps, falls short, tumbles into the bins. The thief runs off. Returns the bin index. */
  async function leapFail() {
    dim(false);
    gapGroup.style.display = 'none';
    const reach = cx + (roofX(THIEF_ROOF) - cx) * 0.62;
    let bi = 0;
    BINS.forEach((b, k) => { if (Math.abs(b + 10 - reach) < Math.abs(BINS[bi] + 10 - reach)) bi = k; });
    const bx = BINS[bi];
    setPose('wiggle');
    await sleep(reducedMotion() ? 0 : 150);
    setPose('leap');
    if (!reducedMotion()) {
      setTimeout(() => setPose('tumble1'), 330);
      setTimeout(() => setPose('tumble2'), 470);
      setTimeout(() => setPose('tumble1'), 610);
      setTimeout(runThief, 300); // the thief notices and bolts
      await animate(catPos, arc(cx, cy, bx + 10 - 24, STREET - 14, 30, 12), { duration: 800, fill: 'forwards' });
    } else runThief();
    clatterCb?.();
    $('#bins').classList.add('clatter-on');
    $(`.bin[data-i="${bi}"]`).style.visibility = 'hidden';
    place(bx + 10 - 24, STREET + 18 - 30);
    setPose('bin');
    const ct = $('#clatter');
    ct.setAttribute('x', bx + 10);
    animate(ct, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)', offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 1200, easing: 'steps(6)' });
    await sleep(reducedMotion() ? 200 : 1100);
    return bi;
  }

  /** After a wrong pounce: the cat climbs out and walks the street below, one step per clue. */
  async function walkTo(step, animateIt = true) {
    const x1 = footX(step);
    const y1 = FOOT_Y - 8 * CELL + 6;
    $('#bins').querySelectorAll('.bin').forEach((b) => { b.style.visibility = ''; });
    if (!animateIt || reducedMotion()) { place(x1, y1); setPose('crouch'); return; }
    let f = 0;
    const iv = setInterval(() => { f ^= 1; setPose(f ? 'walk1' : 'walk2'); }, 140);
    await animate(catPos, [{ transform: `translate(${cx}px,${cy}px)` }, { transform: `translate(${x1}px,${y1}px)` }], { duration: 560, easing: 'steps(8)', fill: 'forwards' });
    clearInterval(iv);
    place(x1, y1);
    setPose('crouch');
  }

  /* ---------------------------------------------------- instant end states (restore / storyboard) */
  function showCaught(name) {
    setGap(null);
    setThief('caught');
    maskRest();
    showPlate(name, false);
    setLight(8);
    place(CAUGHT.x + 2, CAUGHT.y - 8 * CELL + 6);
    setPose('proud');
  }
  function showOnFoot(step = 0) {
    setGap(null);
    setThief('gone');
    $('#thiefLabel').style.opacity = 0;
    walkTo(step, false);
  }
  function showInBin(bi = 2) {
    setGap(null);
    setThief('gone');
    $('#thiefLabel').style.opacity = 0;
    $(`.bin[data-i="${bi}"]`).style.visibility = 'hidden';
    place(BINS[bi] + 10 - 24, STREET + 18 - 30);
    setPose('bin');
  }
  /** A mid-fall frame, for the storyboard: tumbling cat, thief already running. */
  function showTumble(frame = 'tumble2') {
    setGap(null);
    setThief('run1');
    thiefPos.style.transform = `translate(${THIEF_X + 34}px,${THIEF_Y}px)`;
    place(BINS[1] + 26, 176);
    setPose(frame);
  }

  /** The unmasking moment, for the storyboard: cat landed, mask mid-flip. */
  function showUnmasking() {
    setGap(null);
    place(roofX(THIEF_ROOF) + 1, catYOn(THIEF_ROOF));
    setPose('land');
    setThief('caught');
    setLight(8);
    maskG.setAttribute('opacity', '1');
    $('#maskArt').setAttribute('transform', `scale(${CELL})`);
    maskG.style.transform = `translate(${THIEF_X + 3 * CELL - 14}px,${THIEF_Y + 4 * CELL - 28}px)`;
  }

  setThief('stand');
  setPose('crouch');
  setGap(5);

  return {
    el: host, svg, stage, setPose, setGap, setLight, lightLamp, dim, setCatRoof, hopTo, leapCatch, leapFail, walkTo, runThief,
    showCaught, showOnFoot, showInBin, showTumble, showUnmasking, setThief,
    lampRect: (i) => $(`.lantern[data-i="${i}"]`).getBoundingClientRect(),
    thiefRect: () => thiefPos.getBoundingClientRect(),
    onClatter: (fn) => { clatterCb = fn; },
    getRoof: () => roof,
    isAlive: () => alive,
    destroy: () => { alive = false; }
  };
}
