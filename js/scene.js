// The rooftop scene for the game screen. One continuous world: the cat on the left roof,
// the lurking connect on the right, a gap between them that shrinks with every clue.
import { C, rect, stars, moon, skyline, neonSign, glyph } from './pixel.js';
import { catParts } from './cat.js';
import { reducedMotion } from './fx.js';
import { gapMeters, formatMeters } from './engine.js';

const VW = 360;
const VH = 240;
const ROOF_Y = 148;       // rooftop surface
const LEFT_EDGE = 100;    // right edge of the cat's roof
const RIGHT_START = 244;  // left edge of the far roof at the start (gap 6.0m = 144px)
const M = 24;             // px per metre
const CAT_X = 36;
const CAT_Y = ROOF_Y - 32; // cat sprite is 8 cells (32px) tall
const LANTERN_X = [44, 112, 180, 248, 316];
const snap = (v) => Math.round(v / 4) * 4;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const lurkerShape = [[3, 6, 8, 10], [1, 7, 12, 4], [4, 2, 6, 5], [4, 0, 1, 3], [9, 0, 1, 3], [0, 10, 2, 6], [12, 10, 2, 6]];

function lantern(x, i) {
  return `<g class="lantern" data-i="${i}" transform="translate(${x - 6} 12)">
    <g class="lan-halo">${rect(-8, -4, 28, 32, C.amber, 'opacity=".07"')}${rect(-4, 0, 20, 24, C.amber, 'opacity=".1"')}</g>
    ${rect(5, -4, 2, 4, C.line)}
    ${rect(0, 0, 12, 4, C.line)}
    <rect class="glass" x="0" y="4" width="12" height="12" />
    <rect class="core" x="4" y="8" width="4" height="4" />
    ${rect(0, 16, 12, 4, C.line)}
  </g>`;
}

function wire() {
  let out = '';
  for (let x = 0; x < VW; x += 4) {
    const sag = Math.round(2 * Math.sin((x / VW) * Math.PI * 5));
    out += rect(x, 8 + sag * 1, 4, 2, C.line);
  }
  return out;
}

function windowsFor(x0, w, y0, h, seed) {
  let out = '';
  let n = seed;
  for (let wy = y0 + 12; wy < y0 + h - 12; wy += 16) {
    for (let wx = x0 + 8; wx < x0 + w - 12; wx += 16) {
      n = (n * 9301 + 49297) % 233280;
      if (n / 233280 < 0.28) {
        const f = n % 3 === 0;
        out += rect(wx, wy, 8, 8, C.amber, `opacity=".55" class="win${f ? ' flick' : ''}"${f ? ` style="animation-delay:${((n % 90) / 10).toFixed(1)}s;animation-duration:${6 + (n % 70) / 10}s"` : ''}`);
      }
    }
  }
  return out;
}

function bins() {
  let out = '';
  for (let i = 0; i < 6; i++) {
    const x = 104 + i * 26;
    out += `<g class="bin" style="--i:${i}" transform="translate(${x} 212)">
      ${rect(0, 6, 20, 22, '#2E2C52')}${rect(0, 6, 20, 2, C.line)}${rect(4, 10, 2, 14, C.line)}${rect(10, 10, 2, 14, C.line)}${rect(15, 10, 2, 14, C.line)}
      <g class="lid">${rect(-2, 2, 24, 4, '#403D6E')}${rect(8, 0, 4, 2, '#403D6E')}</g></g>`;
  }
  return out;
}

export function createScene(host) {
  const starsMarkup = stars(VW, 560, 100, 11, 440);
  host.innerHTML = `
  <div class="scene stars-bg">
   <svg class="scene-moon" viewBox="0 0 48 48" shape-rendering="crispEdges" aria-hidden="true">${moon(20, 22, 5)}</svg>
   <div class="stage" id="stage">
    <svg class="scene-svg" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMax meet" shape-rendering="crispEdges" role="img" aria-label="Two rooftops at night with a gap between them. A cat crouches on the left roof. Something lurks on the right.">
      <g>${starsMarkup}</g>
      <rect id="sceneGlow" x="0" y="0" width="${VW}" height="600" fill="${C.amber}" opacity="0"/>
      <g class="gnd">
      <g>${skyline({ w: VW, h: VH, seed: 5, fill: C.roof2, minH: 72, maxH: 112, windows: 0.5, from: 90, to: VW })}</g>
      ${rect(118, 76, 76, 164, C.roof2)}${neonSign(124, 84)}
      ${rect(LEFT_EDGE, 200, 300, 40, C.shadow, 'opacity=".55"')}
      <g id="bins">${bins()}</g>
      <text class="atmo" x="106" y="196" fill="${C.dim}">don't look down</text>
      <g id="buildingL">
        ${rect(0, ROOF_Y, LEFT_EDGE, VH - ROOF_Y, C.roof1)}${rect(0, ROOF_Y, LEFT_EDGE, 4, C.line)}
        ${rect(6, ROOF_Y - 16, 12, 16, C.roof1)}${rect(4, ROOF_Y - 20, 16, 4, C.line)}
        ${rect(0, ROOF_Y - 40, 2, 40, C.line)}${rect(-6, ROOF_Y - 32, 14, 2, C.line)}
        ${windowsFor(0, LEFT_EDGE, ROOF_Y, VH - ROOF_Y, 3)}
      </g>
      <g id="roofR" class="slide">
        ${rect(RIGHT_START, ROOF_Y, 330, VH - ROOF_Y, C.roof1)}${rect(RIGHT_START, ROOF_Y, 330, 4, C.line)}
        ${rect(RIGHT_START + 118, ROOF_Y - 24, 10, 24, C.roof1)}${rect(RIGHT_START + 116, ROOF_Y - 28, 14, 4, C.line)}
        ${rect(RIGHT_START + 180, ROOF_Y - 28, 4, 28, C.roof1)}${rect(RIGHT_START + 172, ROOF_Y - 44, 20, 16, C.roof1)}
        ${windowsFor(RIGHT_START, 330, ROOF_Y, VH - ROOF_Y, 9)}
        <text class="atmo" x="${RIGHT_START + 66}" y="${ROOF_Y + 24}" text-anchor="middle" fill="${C.dim}">something lurks</text>
      </g>
      <g id="gapGroup">
        <g id="gapLine" class="slide" style="transform-origin:${LEFT_EDGE}px 0">${rect(LEFT_EDGE, 130, 144, 2, C.amber, 'opacity=".75"')}${rect(LEFT_EDGE, 126, 2, 10, C.amber)}${rect(LEFT_EDGE + 142, 126, 2, 10, C.amber)}</g>
        <text id="gapLabel" class="gap-label slide" x="${LEFT_EDGE + 72}" y="122" text-anchor="middle" fill="${C.amber}">6.0m gap</text>
      </g>
      <text class="atmo" x="${VW - 4}" y="${VH - 6}" text-anchor="end" fill="${C.dim}">the streetlights end here</text>
      </g>
      <g id="lanterns">${wire()}${LANTERN_X.map(lantern).join('')}</g>
      <rect id="dimmer" x="0" y="0" width="${VW}" height="600" fill="${C.shadow}" opacity="0"/>
      <g class="gnd">
      <g id="lurkerPos" class="slide">
        <g id="lurkerLight" style="--lit:0">${rect(RIGHT_START + 8, ROOF_Y - 84, 96, 84, C.amber, 'class="lg lg1"')}${rect(RIGHT_START + 18, ROOF_Y - 74, 76, 74, C.amber, 'class="lg lg2"')}${rect(RIGHT_START + 28, ROOF_Y - 64, 56, 64, C.amber, 'class="lg lg3"')}</g>
        <g id="lurker" transform="translate(${RIGHT_START + 36} ${ROOF_Y - 64}) scale(4)">
          <g class="rim">${lurkerShape.map(([x, y, w, h]) => rect(x - 0.5, y - 0.5, w + 1, h + 1, C.moon)).join('')}</g>
          ${lurkerShape.map(([x, y, w, h]) => rect(x, y, w, h, C.shadow)).join('')}
          <g class="qmark">${rect(4.5, 4.6, 5, 7, C.amber, 'opacity=".18"')}${glyph('?', 5.5, 5.5, 1, C.amber)}</g>
        </g>
        <g id="sign" opacity="0"></g>
      </g>
      <g id="catPos" style="transform:translate(${CAT_X}px,${CAT_Y}px)">
        <g id="catRot" class="cat-rot"><g id="catArt" transform="scale(4)"></g></g>
      </g>
      <g id="fallEyes" opacity="0">${rect(0, 0, 4, 4, C.amber)}${rect(12, 0, 4, 4, C.amber)}</g>
      <text id="clatter" class="clatter" x="150" y="204" text-anchor="middle" fill="${C.amber}" opacity="0">CLATTER</text>
      </g>
    </svg>
    <div class="lantern-labels">${LANTERN_X.map((x, i) => `<div class="ll" data-i="${i}" style="left:${(x / VW) * 100}%"><span class="sr-only">Clue ${i + 1}: not answered yet</span></div>`).join('')}</div>
   </div>
  </div>`;

  const $ = (s) => host.querySelector(s);
  const stage = $('#stage');
  const svg = $('.scene-svg');
  const roofR = $('#roofR');
  const lurkerPos = $('#lurkerPos');
  const gapLine = $('#gapLine');
  const gapLabel = $('#gapLabel');
  const catPos = $('#catPos');
  const catRot = $('#catRot');
  const catArt = $('#catArt');
  const sign = $('#sign');
  const light = $('#lurkerLight');
  const glow = $('#sceneGlow');
  const dimmer = $('#dimmer');
  const fallEyes = $('#fallEyes');

  let resolved = 0;
  let lit = 0;
  let pose = 'crouch';

  /* ---------------------------------------------------------------- labels */
  function fitLabel(el) {
    el.style.fontSize = '';
    let size = parseFloat(getComputedStyle(el).fontSize);
    let guard = 0;
    while (el.scrollWidth > el.clientWidth + 0.5 && size > 8 && guard++ < 30) {
      size -= 0.5;
      el.style.fontSize = size + 'px';
    }
  }
  const fitAll = () => host.querySelectorAll('.ll.filled').forEach(fitLabel);
  /** Adapt the scene height to the space available: ground anchored to the bottom, lanterns to the top. */
  const sceneEl = host.querySelector('.scene');
  function layout() {
    const cw = sceneEl.clientWidth;
    const ch = sceneEl.clientHeight;
    if (!cw || !ch) return;
    const vh = Math.max(VH, Math.min(560, Math.round((VW * ch) / cw)));
    svg.setAttribute('viewBox', `0 0 ${VW} ${vh}`);
    host.querySelectorAll('.gnd').forEach((g) => g.setAttribute('transform', `translate(0 ${vh - VH})`));
    stage.style.setProperty('--vh', vh);
    host.querySelector('.lantern-labels').style.top = `${(40 / vh) * 100}%`;
    fitAll();
  }
  new ResizeObserver(layout).observe(sceneEl);
  document.fonts?.ready.then(layout);

  /* ------------------------------------------------------------------ state */
  const slidePx = (res) => (6 - gapMeters(res)) * M; // how far the far roof has crept in
  const edgeX = (res = resolved) => RIGHT_START - slidePx(res);

  function setPose(name, cls = '') {
    pose = name;
    catArt.innerHTML = catParts(name);
    catRot.setAttribute('class', `cat-rot pose-${name} ${cls}`);
  }

  function setGap(res, animate = true) {
    resolved = res;
    const g = gapMeters(res);
    const px = slidePx(res);
    const cls = animate && !reducedMotion() ? 'slide' : 'slide instant';
    [roofR, lurkerPos, gapLine, gapLabel].forEach((e) => e.setAttribute('class', (e.getAttribute('class') || '').replace(/\bslide\b|\binstant\b/g, '').trim() + ' ' + cls));
    roofR.style.transform = `translateX(${-px}px)`;
    lurkerPos.style.transform = `translateX(${-px}px)`;
    gapLine.style.transform = `scaleX(${(g * M) / 144})`;
    gapLabel.style.transform = `translateX(${-(144 - g * M) / 2}px)`;
    gapLabel.textContent = `${formatMeters(g)} gap`;
  }

  function setLight(n) {
    lit = n;
    light.style.setProperty('--lit', n);
    glow.setAttribute('opacity', (n * 0.018).toFixed(3));
    $('#lurker .rim').style.opacity = (0.08 + n * 0.1).toFixed(2);
  }

  function lightLantern(i, answer, missed, animate = true) {
    const l = host.querySelector(`.lantern[data-i="${i}"]`);
    l.classList.add(missed ? 'missed' : 'lit');
    const label = host.querySelector(`.ll[data-i="${i}"]`);
    label.className = `ll filled ${missed ? 'missed' : 'lit'}${animate ? ' pop' : ''}`;
    label.innerHTML = `<span class="sr-only">Clue ${i + 1}${missed ? ' (missed)' : ''}: </span>${escapeHTML(answer)}`;
    fitLabel(label);
  }

  function dim(on) { dimmer.setAttribute('opacity', on ? '0.62' : '0'); }

  /* ------------------------------------------------------------- animation */
  const animate = (el, frames, opts) => el.animate(frames, opts).finished.catch(() => {});

  /** pixel-snapped arc as stepped keyframes. tEnd > 1 carries the arc below the roofline (a fall). */
  function arcFrames(x0, y0, dx, apex, tEnd, n) {
    const frames = [];
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * tEnd;
      frames.push({
        transform: `translate(${snap(x0 + dx * t)}px, ${snap(y0 - 4 * apex * t * (1 - t))}px)`,
        offset: i / n,
        easing: 'steps(1, end)'
      });
    }
    return frames;
  }

  async function leapAnim({ success }) {
    const edge = edgeX();
    const landX = edge + 4;
    const dx = landX - CAT_X;
    const apex = 28 + dx * 0.16;
    dim(false);
    setPose('wiggle');
    await sleep(reducedMotion() ? 0 : 140);
    setPose('leap');
    if (reducedMotion()) {
      catPos.style.transform = success ? `translate(${landX}px,${CAT_Y}px)` : `translate(${CAT_X}px,${CAT_Y}px)`;
      await sleep(300);
      return { landX };
    }
    if (success) {
      const n = 10;
      const move = animate(catPos, arcFrames(CAT_X, CAT_Y, dx, apex, 1, n), { duration: 560, fill: 'forwards' });
      animate(catRot, [{ transform: 'rotate(-18deg)' }, { transform: 'rotate(-6deg)', offset: 0.3 }, { transform: 'rotate(0deg)', offset: 0.55 }, { transform: 'rotate(14deg)' }], { duration: 560, easing: 'steps(6)', fill: 'forwards' });
      await move;
      catPos.style.transform = `translate(${snap(landX)}px,${CAT_Y}px)`;
      catPos.getAnimations().forEach((a) => a.cancel());
      setPose('land');
      catRot.getAnimations().forEach((a) => a.cancel());
      animate(catRot, [{ transform: 'scaleY(.78)' }, { transform: 'scaleY(1)' }], { duration: 160, easing: 'steps(3)' });
    } else {
      const reach = 0.74;
      const n = 12;
      const fall = animate(catPos, arcFrames(CAT_X, CAT_Y, dx * reach, apex, 1.34, n), { duration: 640, fill: 'forwards' });
      animate(catRot, [{ transform: 'rotate(-18deg)' }, { transform: 'rotate(10deg)', offset: 0.45 }, { transform: 'rotate(150deg)', offset: 0.75 }, { transform: 'rotate(260deg)' }], { duration: 640, easing: 'steps(8)', fill: 'forwards' });
      setTimeout(() => setPose('fall'), 280);
      await fall;
    }
    return { landX };
  }

  async function leapSuccess(connectName) {
    const edge = edgeX();
    await leapAnim({ success: true });
    // hero beat two: the shadow falls away
    const lurker = $('#lurker');
    const rim = lurker.querySelector('.rim');
    rim.style.opacity = 0;
    if (!reducedMotion()) {
      light.style.setProperty('--lit', 8);
      await animate(lurker, [{ transform: `translate(${RIGHT_START + 36}px, ${ROOF_Y - 64}px) scale(4)`, opacity: 1 }, { transform: `translate(${RIGHT_START + 36}px, ${ROOF_Y - 56}px) scale(4)`, opacity: 1, offset: 0.35 }, { transform: `translate(${RIGHT_START + 36}px, ${ROOF_Y + 20}px) scale(4)`, opacity: 0 }], { duration: 420, easing: 'steps(6)', fill: 'forwards' });
    } else {
      lurker.style.opacity = 0;
    }
    showSign(connectName, !reducedMotion());
    light.style.setProperty('--lit', 8);
    void edge;
    await sleep(reducedMotion() ? 200 : 500);
  }

  function showSign(name, animateIn) {
    const w = Math.min(158, name.length * 8.4 + 22);
    const cx = RIGHT_START + 64;
    const y = ROOF_Y - 76;
    sign.innerHTML = `${rect(cx - w / 2 - 6, y - 6, w + 12, 44, C.amber, 'opacity=".18"')}
      ${rect(cx - w / 2, y, w, 32, C.sky)}${rect(cx - w / 2, y, w, 2, C.amber)}${rect(cx - w / 2, y + 30, w, 2, C.amber)}${rect(cx - w / 2, y, 2, 32, C.amber)}${rect(cx + w / 2 - 2, y, 2, 32, C.amber)}
      <text class="sign-text" x="${cx}" y="${y + 21}" text-anchor="middle" fill="${C.moon}" textLength="${w - 16}" lengthAdjust="spacingAndGlyphs">${escapeHTML(name)}</text>`;
    sign.setAttribute('opacity', '1');
    if (animateIn) animate(sign, [{ transform: 'translateY(10px)', opacity: 0 }, { transform: 'translateY(-4px)', opacity: 1, offset: 0.6 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 360, easing: 'steps(5)' });
    $('#lurker').style.opacity = 0;
  }

  async function leapFail() {
    await leapAnim({ success: false });
    catPos.style.transform = `translate(${CAT_X}px,${CAT_Y + 400}px)`;
    catPos.getAnimations().forEach((a) => a.cancel());
    const x = snap(CAT_X + (edgeX() + 4 - CAT_X) * 0.74 + 30);
    host.querySelector('#bins').classList.add('clatter-on');
    const ct = $('#clatter');
    ct.setAttribute('x', Math.min(300, x + 10));
    animate(ct, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)', offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 1200, easing: 'steps(6)' });
    fallEyes.setAttribute('transform', `translate(${Math.min(x, 280)} 206)`);
    await sleep(reducedMotion() ? 200 : 900);
    fallEyes.setAttribute('opacity', '1');
    fallEyes.classList.add('blinking');
    await sleep(500);
  }

  /** Back to the roof after a fail (so the player can carry on). */
  function resetCat() {
    catPos.getAnimations().forEach((a) => a.cancel());
    catRot.getAnimations().forEach((a) => a.cancel());
    catPos.style.transform = `translate(${CAT_X}px,${CAT_Y}px)`;
    setPose('crouch');
  }

  function setRevealed(name) { showSign(name, false); setPose('land'); catPos.style.transform = `translate(${snap(edgeX() + 4)}px,${CAT_Y}px)`; light.style.setProperty('--lit', 8); }
  function setFallen() {
    // the pounce was spent and missed: the cat is back on the roof; bins stay tipped
    host.querySelector('#bins').classList.add('clatter-done');
  }

  setPose('crouch');
  setGap(0, false);

  return {
    el: host, svg, stage, setPose, setGap, setLight, lightLantern, dim, leapSuccess, leapFail, resetCat, setRevealed, setFallen,
    lanternRect: (i) => host.querySelector(`.lantern[data-i="${i}"]`).getBoundingClientRect(),
    lurkerRect: () => $('#lurker').getBoundingClientRect(),
    getPose: () => pose
  };
}

export function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
