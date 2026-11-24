// App shell: loads puzzles, the home screen (wanted posters), the story how-to, screen switching.
import { isComplete, hasStarted, newProgress, totals, titleFor, chaseState, leapMeters, formatNumber as fmt } from './engine.js';
import { maybeReset, loadProgress, applyReloadRule, getPref, setPref } from './store.js';
import { portrait, mountRig } from './portraits.js';
import { homeHTML } from './home.js';
import { mountGame } from './game.js';
import { renderResults } from './results.js';
import { resumeAmbience } from './audio.js';

const root = document.getElementById('app');
let puzzles = [];
let game = null;
let homeRig = null;

/* ------------------------------------------------------------------ how to */
const HOW_INTRO = 'A new masked thief every night. Only your cat is watching.';
const HOW_STEPS = [
  { art: () => portrait('cat', 'idle', 44), title: 'Crack the clues.', text: '5 clues, 20 seconds each, 3 tries. Faster answers score more.' },
  { art: () => '<span class="how-num">5.0 m</span>', title: 'Pounce or creep closer.', text: 'After each clue, pounce now or creep 1 m closer. Every metre you creep makes the pounce worth less: 5,000 after clue 1, 1,000 after clue 5.' },
  { art: () => portrait('thief', 'sneak', 64), title: 'One pounce. Name the thief.', text: 'Get it right and the mask comes off. Get it wrong and it’s into the bins.' },
  { art: () => '<span class="how-num">?</span>', title: 'Every clue points to the thief.', text: 'Spot the link and pounce early.' }
];

function showHow(returnFocus) {
  const dlg = document.createElement('dialog');
  dlg.className = 'modal how-dlg';
  dlg.setAttribute('aria-labelledby', 'howTitle');
  dlg.innerHTML = `
    <div class="dlg-box how-box">
      <h2 id="howTitle">HOW TO PLAY</h2>
      <p class="how-intro">${HOW_INTRO}</p>
      <ol class="how-steps">
        ${HOW_STEPS.map((s, i) => `<li><div class="how-art" aria-hidden="true">${s.art()}</div><div><h3><span class="sr-only">Step ${i + 1}: </span>${s.title}</h3><p>${s.text}</p></div></li>`).join('')}
      </ol>
      <button class="btn btn-amber" id="howClose">LET’S PROWL ▸</button>
    </div>`;
  document.body.appendChild(dlg);
  dlg.showModal();
  const close = () => { dlg.close(); dlg.remove(); setPref('seenHow', '1'); returnFocus?.focus?.(); };
  dlg.querySelector('#howClose').addEventListener('click', close);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
}

/* --------------------------------------------------------------------- home */
function nightFor(pz) {
  const p = loadProgress(pz.id);
  if (p && isComplete(p)) {
    const st = chaseState(p);
    const base = { id: pz.id, score: fmt(totals(p).total), title: titleFor(p).title };
    return st === 'caught'
      ? { ...base, state: 'caught', name: pz.connect.answer, from: `${leapMeters(p.pounce.points).toFixed(1)} m` }
      : { ...base, state: 'away' };
  }
  return { id: pz.id, state: 'new', started: !!(p && hasStarted(p)) };
}

function renderHome() {
  document.title = 'Pounce · leap before you look';
  root.innerHTML = homeHTML(puzzles.map(nightFor));
  root.querySelectorAll('.poster').forEach((b) => b.addEventListener('click', () => openPuzzle(Number(b.dataset.id))));
  const how = root.querySelector('#howBtn');
  how.addEventListener('click', () => showHow(how));
  const hc = root.querySelector('#homeCat');
  if (hc) { homeRig?.destroy(); homeRig = mountRig(hc, 'cat', 'idle', 1); }
  // the poster row opens centred on the first unplayed night
  const wall = root.querySelector('.wall');
  const first = [...root.querySelectorAll('.poster')].find((b) => !b.classList.contains('poster--caught') && !b.classList.contains('poster--away')) || root.querySelector('.poster');
  if (wall && first && wall.scrollWidth > wall.clientWidth + 4) wall.scrollLeft = first.offsetLeft - (wall.clientWidth - first.offsetWidth) / 2;
  window.scrollTo(0, 0);
}

/* --------------------------------------------------------------- navigation */
function teardown() {
  if (homeRig) { homeRig.destroy(); homeRig = null; }
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
  document.title = `Night #${id}`;
  window.scrollTo(0, 0);
  if (isComplete(p)) { showResults(pz, p); return; }
  game = mountGame(root, pz, p, {
    onHome: goHome,
    onResults: () => { const done = loadProgress(id); teardown(); showResults(pz, done); }
  });
}

function showResults(pz, p) {
  history.replaceState({ s: 'r', id: pz.id }, '');
  document.title = `Night #${pz.id} results`;
  window.scrollTo(0, 0);
  renderResults(root, pz, p, { onHome: goHome });
}

window.addEventListener('popstate', () => { teardown(); renderHome(); });
window.addEventListener('pointerdown', resumeAmbience, { once: true });

/* --------------------------------------------------------------------- boot */
async function boot() {
  maybeReset();
  try {
    const res = await fetch('data/puzzles.json?v=' + (window.BUILD || Date.now()));
    puzzles = (await res.json()).puzzles;
  } catch {
    root.innerHTML = '<main class="screen home"><p class="story-intro">The rooftops didn’t load. Check your connection and refresh.</p></main>';
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
