// App shell: loads puzzles, home screen, how-to overlay, and screen switching.
import { isComplete, hasStarted, newProgress, totals, titleFor, formatNumber as fmt } from './engine.js';
import { maybeReset, loadProgress, applyReloadRule, getPref, setPref } from './store.js';
import { catSVG, yarnBall, pawSVG } from './cat.js';
import { mountGame } from './game.js';
import { renderResults } from './results.js';

const COLORS = { 1: '#7BAE7F', 2: '#5B7DB1', 3: '#E8483B' };
const root = document.getElementById('app');
let puzzles = [];
let game = null;

const colorFor = (id) => COLORS[id] || '#F2B33D';

/* ------------------------------------------------------------------- how to */
const HOW_STEPS = [
  {
    title: 'Answer fast',
    text: 'Five quick questions, 20 seconds each. The quicker you are right, the more you score.',
    art: `<svg viewBox="0 0 96 72" aria-hidden="true"><circle cx="48" cy="42" r="24" fill="#fff" stroke="#2B2118" stroke-width="3.5"/><path d="M48 42V26M48 42l11 7" stroke="#2B2118" stroke-width="3.5" stroke-linecap="round"/><rect x="42" y="9" width="12" height="7" rx="2" fill="#F2B33D" stroke="#2B2118" stroke-width="3"/><path d="M70 22l6-6" stroke="#2B2118" stroke-width="3.5" stroke-linecap="round"/><path d="M48 42L48 18A24 24 0 0 1 72 42z" fill="#F2B33D" opacity=".55"/></svg>`
  },
  {
    title: 'Pounce on the connect',
    text: 'Every answer links to one hidden thing. Spot it, and pounce between questions.',
    art: `<div class="how-art-knot">${yarnBall('#F2B33D')}<b>?</b></div>`
  },
  {
    title: 'Earlier pounces score more',
    text: 'Pounce after clue 1 for 5,000. It drops by 1,000 with every clue.',
    art: `<svg viewBox="0 0 96 72" aria-hidden="true"><g stroke="#2B2118" stroke-width="3" stroke-linejoin="round"><rect x="6" y="8" width="14" height="56" rx="4" fill="#E8483B"/><rect x="26" y="20" width="14" height="44" rx="4" fill="#F29A3D"/><rect x="46" y="32" width="14" height="32" rx="4" fill="#F2B33D"/><rect x="66" y="44" width="14" height="20" rx="4" fill="#7BAE7F"/></g></svg>`
  },
  {
    title: 'One pounce only',
    text: 'You get a single guess at the connect. A wrong one means a hairball, so choose your moment.',
    art: `<div class="how-art-one"><span>1</span>${pawSVG('#2B2118')}</div>`
  }
];

function showHow(returnFocus) {
  const dlg = document.createElement('dialog');
  dlg.className = 'modal how-dlg';
  dlg.setAttribute('aria-labelledby', 'howTitle');
  dlg.innerHTML = `
    <div class="how-box">
      <h2 id="howTitle">How to play</h2>
      <ol class="how-steps">
        ${HOW_STEPS.map((s, i) => `
          <li><div class="how-art">${s.art}</div>
            <div><h3><span class="how-n">${i + 1}</span>${s.title}</h3><p>${s.text}</p></div></li>`).join('')}
      </ol>
      <button class="btn btn-primary" id="howClose">Got it</button>
    </div>`;
  document.body.appendChild(dlg);
  dlg.showModal();
  const close = () => { dlg.close(); dlg.remove(); setPref('seenHow', '1'); returnFocus?.focus?.(); };
  dlg.querySelector('#howClose').addEventListener('click', close);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
}

/* --------------------------------------------------------------------- home */
function renderHome() {
  document.title = 'Pounce · five clues, one pounce';
  const cards = puzzles.map((pz) => {
    const p = loadProgress(pz.id);
    const c = colorFor(pz.id);
    let status;
    if (p && isComplete(p)) {
      status = `<span class="yc-score">${fmt(totals(p).total)}</span>
        <span class="yc-title">${titleFor(p).title}</span>
        <span class="yc-cta played">See results</span>`;
    } else if (p && hasStarted(p)) {
      status = `<span class="yc-title">In progress</span><span class="yc-cta">Resume</span>`;
    } else {
      status = `<span class="yc-cta bounce">Play</span>`;
    }
    return `<li><button class="yarn-card" data-id="${pz.id}" style="--ball:${c}">
      <span class="yc-ball">${yarnBall(c)}</span>
      <span class="yc-body"><span class="yc-name">Pounce #${pz.id}</span>${status}</span>
    </button></li>`;
  }).join('');

  root.innerHTML = `
  <main class="screen home">
    <div class="hero">
      <h1 class="wordmark" aria-label="pounce"><span aria-hidden="true">p<span class="wm-o">${yarnBall('#E8483B')}</span>unce</span></h1>
      <div class="hero-cat">${catSVG('crouch')}</div>
    </div>
    <p class="tagline">Five clues. One pounce.</p>
    <ul class="cards">${cards}</ul>
    <button class="link-btn how-link" id="howBtn">How to play</button>
    <footer class="foot"><span class="paw-bullet">${pawSVG('#8A6A4A')}</span> A prototype. <a href="#feedback">Tell us what you think</a></footer>
  </main>`;
  root.querySelectorAll('.yarn-card').forEach((b) => b.addEventListener('click', () => openPuzzle(Number(b.dataset.id))));
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

function openPuzzle(id, { replace = false } = {}) {
  teardown();
  const pz = puzzles.find((x) => x.id === id);
  const p = loadProgress(id) || newProgress(id);
  if (replace) history.replaceState({ s: 'p', id }, '');
  else history.pushState({ s: 'p', id }, '');
  document.title = `Pounce #${id}`;
  window.scrollTo(0, 0);
  if (isComplete(p)) { showResults(pz, p, true); return; }
  game = mountGame(root, pz, colorFor(id), p, {
    onHome: goHome,
    onResults: () => { const done = loadProgress(id); teardown(); showResults(pz, done, true); }
  });
}

function showResults(pz, p, replace) {
  if (replace) history.replaceState({ s: 'r', id: pz.id }, '');
  document.title = `Pounce #${pz.id} results`;
  window.scrollTo(0, 0);
  renderResults(root, pz, colorFor(pz.id), p, { onHome: goHome });
}

window.addEventListener('popstate', () => { teardown(); renderHome(); });

/* --------------------------------------------------------------------- boot */
async function boot() {
  maybeReset();
  try {
    const res = await fetch('data/puzzles.json');
    puzzles = (await res.json()).puzzles;
  } catch {
    root.innerHTML = `<main class="screen home"><p class="tagline">Could not load the puzzles. Serve this folder over http (for example python3 -m http.server) and reload.</p></main>`;
    return;
  }
  applyReloadRule(puzzles); // refresh rule: reloading mid-question counts as a timeout

  const inProgress = puzzles.find((pz) => { const p = loadProgress(pz.id); return p && hasStarted(p) && !isComplete(p); });
  history.replaceState(null, '');
  if (inProgress) {
    renderHome();
    openPuzzle(inProgress.id);
  } else {
    renderHome();
    if (!getPref('seenHow')) showHow();
  }
}

boot();
