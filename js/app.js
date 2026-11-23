// App shell: loads puzzles, home screen (a building of lit windows), how-to, screen switching.
import { isComplete, hasStarted, newProgress, totals, titleFor, formatNumber as fmt, leapMeters } from './engine.js';
import { maybeReset, loadProgress, applyReloadRule, getPref, setPref } from './store.js';
import { catSVG } from './cat.js';
import { C, moon, skyline, rainHTML } from './pixel.js';
import { mountGame } from './game.js';
import { renderResults } from './results.js';
import { resumeAmbience } from './audio.js';

const root = document.getElementById('app');
let puzzles = [];
let game = null;

/* ------------------------------------------------------------------ how to */
const HOW_STEPS = [
  { title: 'Answer fast', text: 'Five clues, 20 seconds each. The quicker you are right, the more you score.' },
  { title: 'Spot the connect', text: 'Every answer links to one hidden thing, lurking on the far roof.' },
  { title: 'Leap from further', text: 'Pounce after clue 1 for a 5.0 m leap worth 5,000. Each clue costs 1,000.' },
  { title: 'One leap only', text: 'Miss, and you fall short into the bins. So choose your moment.' }
];

function showHow(returnFocus) {
  const dlg = document.createElement('dialog');
  dlg.className = 'modal how-dlg';
  dlg.setAttribute('aria-labelledby', 'howTitle');
  dlg.innerHTML = `
    <div class="dlg-box how-box">
      <h2 id="howTitle">HOW TO PLAY</h2>
      <ol class="how-steps">
        ${HOW_STEPS.map((s, i) => `<li><span class="how-n" aria-hidden="true">${i + 1}</span><div><h3>${s.title}</h3><p>${s.text}</p></div></li>`).join('')}
      </ol>
      <button class="btn btn-amber" id="howClose">GOT IT</button>
    </div>`;
  document.body.appendChild(dlg);
  dlg.showModal();
  const close = () => { dlg.close(); dlg.remove(); setPref('seenHow', '1'); returnFocus?.focus?.(); };
  dlg.querySelector('#howClose').addEventListener('click', close);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
}

/* --------------------------------------------------------------------- home */
function windowFor(pz) {
  const p = loadProgress(pz.id);
  if (p && isComplete(p)) {
    const leap = p.pounce.status === 'correct' ? `leapt ${leapMeters(p.pounce.points).toFixed(1)} m` : 'no leap';
    return `<button class="window lit" data-id="${pz.id}" aria-label="Prowl ${pz.id}, played. Score ${fmt(totals(p).total)}, ${titleFor(p).title}, ${leap}. See results">
      <span class="win-body"><span class="win-score">${fmt(totals(p).total)}</span>
        <span class="win-meta">PROWL #${pz.id} · ${titleFor(p).title}</span>
        <span class="win-meta">${leap}</span></span>
      <span class="win-link">See results</span></button>`;
  }
  const started = p && hasStarted(p);
  return `<button class="window" data-id="${pz.id}">
    <span class="win-body"><span class="win-num">PROWL #${pz.id}</span>${started ? '<span class="win-meta">in progress</span>' : ''}</span>
    <span class="win-cta">${started ? '▸ RESUME' : '▸ PLAY'}</span></button>`;
}

function renderHome() {
  document.title = 'Pounce · leap before you look';
  const next = puzzles.find((pz) => { const p = loadProgress(pz.id); return !p || !isComplete(p); });
  root.innerHTML = `
  ${rainHTML()}
  <main class="screen home">
    <div class="home-sky stars-bg"></div>
    <svg class="home-moon" viewBox="0 0 48 48" shape-rendering="crispEdges" aria-hidden="true">${moon(20, 22, 5)}</svg>
    <svg class="skyline-strip" viewBox="0 0 640 80" preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges" aria-hidden="true">
      ${skyline({ w: 640, h: 80, seed: 3, fill: C.roof2, minH: 32, maxH: 72 })}
    </svg>
    <div class="home-inner">
      <h1 class="logo">POUNCE</h1>
      <p class="logo-sub">ONE LEAP A DAY</p>
      <p class="hero-line">Leap before you look.</p>
      <p class="rules-line">5 clues · 20s each · leap from further, score higher</p>
      ${next ? '<button class="btn btn-neon start" id="startBtn">▸ START</button>' : ''}
      <div class="facade">
        <div class="roofline"><div class="home-cat">${catSVG('crouch', 5)}</div></div>
        <div class="building">
          <span class="neon-open" aria-hidden="true">OPEN</span>
          ${puzzles.map(windowFor).join('')}
        </div>
        <div class="home-links">
          <button class="link-btn" id="howBtn">How to play</button>
          <p class="foot">A prototype. <a href="#feedback">Tell us what you think</a></p>
        </div>
      </div>
    </div>
  </main>`;
  root.querySelectorAll('.window').forEach((b) => b.addEventListener('click', () => openPuzzle(Number(b.dataset.id))));
  root.querySelector('#startBtn')?.addEventListener('click', () => openPuzzle(next.id));
  const how = root.querySelector('#howBtn');
  how.addEventListener('click', () => showHow(how));
  window.scrollTo(0, 0);
}

/* --------------------------------------------------------------- navigation */
function teardown() {
  if (game) { game.destroy(); game = null; }
}

function goHome() {
  if (history.state && history.state.s) history.back();
  else { teardown(); renderHome(); }
}

function openPuzzle(id) {
  teardown();
  const pz = puzzles.find((x) => x.id === id);
  const p = loadProgress(id) || newProgress(id);
  history.pushState({ s: 'p', id }, '');
  document.title = `Prowl #${id}`;
  window.scrollTo(0, 0);
  if (isComplete(p)) { showResults(pz, p); return; }
  game = mountGame(root, pz, p, {
    onHome: goHome,
    onResults: () => { const done = loadProgress(id); teardown(); showResults(pz, done); }
  });
}

function showResults(pz, p) {
  history.replaceState({ s: 'r', id: pz.id }, '');
  document.title = `Prowl #${pz.id} results`;
  window.scrollTo(0, 0);
  renderResults(root, pz, p, { onHome: goHome });
}

window.addEventListener('popstate', () => { teardown(); renderHome(); });
window.addEventListener('pointerdown', resumeAmbience, { once: true });

/* --------------------------------------------------------------------- boot */
async function boot() {
  maybeReset();
  try {
    const res = await fetch('data/puzzles.json');
    puzzles = (await res.json()).puzzles;
  } catch {
    root.innerHTML = '<main class="screen home"><p class="rules-line">Could not load the puzzles. Serve this folder over http (for example python3 -m http.server) and reload.</p></main>';
    return;
  }
  applyReloadRule(puzzles); // refresh rule: reloading mid-question counts as a timeout

  const inProgress = puzzles.find((pz) => { const p = loadProgress(pz.id); return p && hasStarted(p) && !isComplete(p); });
  history.replaceState(null, '');
  renderHome();
  if (inProgress) openPuzzle(inProgress.id);
  else if (!getPref('seenHow')) showHow();
}

boot();
