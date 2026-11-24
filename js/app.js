// App shell: loads puzzles, the home screen (wanted posters), the story how-to, screen switching.
import { isComplete, hasStarted, newProgress, totals, titleFor, chaseState, leapMeters, formatNumber as fmt } from './engine.js';
import { maybeReset, loadProgress, applyReloadRule, getPref, setPref } from './store.js';
import { portrait, mountRig } from './portraits.js';
import { homeHTML } from './home.js';
import { pastHTML } from './past.js';
import { CONFIG } from './config.js';
import { tonightId, msToRollover, formatCountdown } from './tonight.js';
import { getPercentile } from './stats.js';
import { mountGame } from './game.js';
import { renderResults } from './results.js';
import { resumeAmbience, isSoundOn, setSound } from './audio.js';

const root = document.getElementById('app');
let puzzles = [];
let game = null;
let homeRig = null;
const soundIcon = (on) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/>${on ? '<path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>' : '<path d="M17 9l4 6M21 9l-4 6"/>'}</svg>`;

/* ------------------------------------------------------------------ how to */
const HOW_INTRO = 'A new masked thief every night. Only your cat is watching.';
const HOW_STEPS = [
  { art: () => portrait('cat', 'idle', 44), title: 'Crack the clues.', text: '5 clues, 20 seconds each, 3 tries. Faster answers score more.' },
  { art: () => '<span class="how-num">5.0 m</span>', title: 'Pounce or creep closer.', text: 'After each clue, pounce now or creep 1 m closer. Every metre you creep makes the pounce worth less: 5,000 after clue 1, 1,000 after clue 5.' },
  { art: () => portrait('thief', 'sneak', 64), title: 'One pounce. Name the thief.', text: 'Get it right and the mask comes off. Get it wrong and it’s into the bins.' },
  { art: () => '<span class="how-num">?</span>', title: 'Every clue points to the thief.', text: 'Spot the link and pounce early.' }
];

function showHow(returnFocus, onStart) {
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
  const close = (go) => { dlg.close(); dlg.remove(); setPref('seenHow', '1'); if (go && onStart) onStart(); else returnFocus?.focus?.(); };
  dlg.querySelector('#howClose').addEventListener('click', () => close(true));
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(false); });
}

/* --------------------------------------------------------------------- home */
function nightFor(pz) {
  const p = loadProgress(pz.id);
  if (p && isComplete(p)) {
    const st = chaseState(p);
    const base = { id: pz.id, score: fmt(totals(p).total), title: titleFor(p).title };
    return st === 'caught'
      ? { ...base, state: 'caught', name: pz.connect.answer, from: `${leapMeters(p.pounce.points).toFixed(1)} m`, pounced: true }
      : { ...base, state: 'away', pounced: p.pounce.status !== 'none' };
  }
  return { id: pz.id, state: 'new', started: !!(p && hasStarted(p)) };
}

const tonightPz = () => puzzles.find((x) => x.id === tonightId(puzzles.map((q) => q.id), new Date(), CONFIG));
let homeTimer = 0;
let entered = false;

function renderHome() {
  document.title = 'Pounce · leap before you look';
  const pz = tonightPz();
  const n = nightFor(pz);
  const state = n.state === 'new' && n.started ? 'started' : n.state;
  const played = n.state === 'caught' || n.state === 'away';
  root.innerHTML = homeHTML({ night: pz.id, state, score: n.score, title: n.title, leap: n.state === 'caught' ? n.from : null, pct: null, countdown: formatCountdown(msToRollover(new Date(), CONFIG.rolloverTz)), soundOn: isSoundOn() });
  const page = root.querySelector('.home2');
  if (!entered) { entered = true; page.classList.add('home2--enter'); }

  const how = root.querySelector('#howBtn');
  how.addEventListener('click', () => showHow(how));
  const sound = root.querySelector('#soundBtn');
  sound.addEventListener('click', () => { setSound(!isSoundOn()); const on = isSoundOn(); sound.setAttribute('aria-label', on ? 'Sound on' : 'Sound off'); sound.setAttribute('aria-pressed', String(on)); sound.innerHTML = soundIcon(on); });
  root.querySelector('.hm-past').addEventListener('click', (e) => { e.preventDefault(); history.pushState({ s: 'past' }, '', '#past'); route(); });

  // first visit: How to play first; its LET'S PROWL ▸ starts the chase. Return visits start straight away.
  const start = () => openPuzzle(pz.id);
  const begin = root.querySelector('#beginBtn');
  if (begin) begin.addEventListener('click', () => { if (getPref('seenHow')) start(); else showHow(begin, start); });
  root.querySelector('#resultsBtn')?.addEventListener('click', start);
  window.removeEventListener('keydown', onHomeKey);
  homeKey = (e) => {
    if (e.key !== 'Enter' || !begin || !begin.isConnected || document.querySelector('dialog[open]')) return;
    if (e.target.closest && e.target.closest('button, a, input')) return;
    e.preventDefault(); begin.click();
  };
  window.addEventListener('keydown', onHomeKey);

  // the countdown to the next thief; at zero the home screen becomes the next night
  clearInterval(homeTimer);
  const counts = root.querySelectorAll('.hm-count');
  homeTimer = setInterval(() => {
    if (tonightPz().id !== pz.id) { renderHome(); return; }
    const ms = msToRollover(new Date(), CONFIG.rolloverTz);
    counts.forEach((c) => { c.textContent = formatCountdown(ms); });
    if (ms > 86399000 && counts.length) renderHome(); // just rolled over past midnight
  }, 1000);

  if (played) {
    const sc = totals(loadProgress(pz.id)).total;
    getPercentile(pz.id, sc).then((r) => { const m = root.querySelector('#hmMeta'); if (m && r) m.textContent = [n.state === 'caught' ? `Leapt ${n.from}` : '', `better than ${r.betterThanPct}%`].filter(Boolean).join(' · '); }).catch(() => {});
  }
  window.scrollTo(0, 0);
}
let homeKey = null;
const onHomeKey = (e) => homeKey?.(e);

/* --------------------------------------------------------------- past nights */
function renderPast() {
  document.title = 'Past nights · Pounce';
  const tid = tonightPz().id;
  const nights = puzzles.filter((x) => x.id < tid).sort((a, b) => b.id - a.id).map(nightFor);
  root.innerHTML = pastHTML(nights);
  root.querySelectorAll('.poster').forEach((b) => b.addEventListener('click', () => openPuzzle(Number(b.dataset.id))));
  root.querySelector('#pastBack').addEventListener('click', () => { if (history.state && history.state.s === 'past') history.back(); else { history.replaceState(null, '', location.pathname + location.search); route(); } });
  window.scrollTo(0, 0);
}

function route() {
  teardown();
  if (location.hash === '#past') renderPast(); else renderHome();
}

/* --------------------------------------------------------------- navigation */
function teardown() {
  clearInterval(homeTimer);
  window.removeEventListener('keydown', onHomeKey);
  if (homeRig) { homeRig.destroy(); homeRig = null; }
  if (game) { game.destroy(); game = null; }
}

function goHome() {
  if (history.state && history.state.s) history.back();
  else route();
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

window.addEventListener('popstate', route);
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
  route();
  if (inProgress) openPuzzle(inProgress.id);
}

boot();
