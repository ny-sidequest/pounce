// Night screen controller: one night's chase, from the first clue to the end of the night.
// Moments are played as timelines (sequences.js). On phones every screen has one job (flow.js):
//   question -> story -> decision -> (ready) -> question ...
// The clue timer and the keyboard follow that mode: the clock runs only while the question is visible and
// accepting input, never in story, decision or ready, never during a sequence, never while the tab is hidden.
import {
  QUESTION_SECONDS, BREAK_SECONDS, POUNCE_SECONDS, MAX_ATTEMPTS, QUESTIONS_PER_PUZZLE,
  answerGuess, judgePounce, pounceValue, totals, formatNumber as fmt,
  leapMeters, formatMeters, skipsBreak, chaseState, gapForState,
  startQuestion, resolveQuestion, nextClue, canPounce, openPounce, cancelPounce, noteClose,
  resolvePounce, skipFinal, applyReload
} from './engine.js';
import { createScene, escapeHTML } from './scene.js';
import { rainHTML } from './rain.js';
import { sparkBurst, reducedMotion } from './fx.js';
import { fitText } from './fit.js';
import { sfx, isSoundOn, setSound } from './audio.js';
import { saveProgress } from './store.js';
import { PausableTimer, TimerGate } from './timer.js';
import { createFlow, timerRuns } from './flow.js';
import { recordRound } from './telemetry.js';
import { runTimeline, clueSequence, catchSequence, fallSequence, letGoSequence } from './sequences.js';

const $ = (root, sel) => root.querySelector(sel);
const HEADS_UP = 'Heads up: the remaining clues are general knowledge, not about the thief.';
const m1 = (g) => `${g.toFixed(1)} m`;
const wait = (ms) => new Promise((r) => setTimeout(r, reducedMotion() ? Math.min(ms, 30) : ms));

/** a pausable countdown (the break and the pounce box); paused while the tab is hidden */
function countdown(seconds, onTick, onDone) {
  let remain = seconds * 1000;
  let last = performance.now();
  let raf = 0;
  let stopped = false;
  let paused = false;
  const tick = (now) => {
    if (stopped || paused) return;
    remain -= now - last;
    last = now;
    if (remain <= 0) { onTick(0); stopped = true; onDone(); return; }
    onTick(remain / 1000);
    raf = requestAnimationFrame(tick);
  };
  tick(last);
  return {
    stop() { stopped = true; cancelAnimationFrame(raf); },
    pause() { if (paused || stopped) return; paused = true; cancelAnimationFrame(raf); },
    resume() { if (!paused || stopped) return; paused = false; last = performance.now(); raf = requestAnimationFrame(tick); },
    remaining: () => Math.max(0, remain / 1000)
  };
}

const isMobile = () => window.matchMedia('(max-width: 699px)').matches;

const strand = (id) => `<div class="strand" id="${id}" style="--p:1" aria-hidden="true"><div class="strand-fill"></div></div>`;
const setStrand = (el, frac, urgent) => { el.style.setProperty('--p', Math.max(0, Math.min(1, frac)).toFixed(4)); el.classList.toggle('urgent', urgent); };

/* ---------------------------------------------------------------- chase strip (phones: question + ready) */
const MINI_CAT = (x, y) => `<g transform="translate(${x} ${y})"><ellipse cx="12" cy="18" rx="12" ry="6" fill="#0B0A18" stroke="#8E89C2" stroke-width="1"/><circle cx="22" cy="10" r="7" fill="#0B0A18" stroke="#8E89C2" stroke-width="1"/><path d="M17 5l1-6 4 4M23 3l4-4 1 6" fill="#0B0A18" stroke="#8E89C2" stroke-width="1" stroke-linejoin="round"/><circle cx="20" cy="10" r="1.4" fill="#FFB238"/><circle cx="25" cy="10" r="1.4" fill="#FFB238"/><path d="M16 15q6 3 12 0" stroke="#FF2E88" stroke-width="3" fill="none"/></g>`;
const MINI_THIEF = (x, o = 1) => `<g transform="translate(${x} 0)" opacity="${o}"><path d="M2 32 L5 12 L19 12 L22 32 Z" fill="#3B2A6B"/><rect x="0" y="8" width="24" height="3" rx="1.5" fill="#1A1530"/><rect x="6" y="0" width="12" height="9" rx="3" fill="#1A1530"/><rect x="7" y="13" width="10" height="3" rx="1" fill="#F4E7C3"/><circle cx="-2" cy="22" r="6" fill="#FFB238"/></g>`;

export function mountGame(root, puzzle, initial, { onHome, onResults }) {
  let p = initial;
  let timer = null;          // break / pounce countdown
  let qTimer = null;         // the question timer (pausable)
  let qRaf = 0;
  let breakRemaining = BREAK_SECONDS;
  let attempts = 0;
  let guesses = [];
  let lastGuess = '';
  let pounceOpen = false;
  let destroyed = false;
  let skipTimer = 0;
  let visHold = false;
  let shownScore = totals(p).total;

  root.innerHTML = `
  ${rainHTML()}
  <section class="screen game" id="game" data-mode="question">
    <header class="topline">
      <button class="icon-btn" id="homeBtn" aria-label="Back to home"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></button>
      <h1 class="pz-name">NIGHT #${puzzle.id}</h1>
      <div class="top-right"><span class="top-score" id="topScore">0</span><button class="icon-btn" id="soundBtn"></button></div>
    </header>
    <div class="strip" id="strip"></div>
    <header class="hud">
      <div class="hud-box hud-leap" id="leapBox"><span class="lab" id="leapLab">GAP</span><span class="val" id="leapVal"></span></div>
      <div class="hud-mid"><ol class="pips" id="pips" aria-label="Progress"></ol><span class="hud-night">NIGHT #${puzzle.id}</span></div>
      <div class="hud-box hud-score"><span class="lab">SCORE</span><span class="val" id="score">0</span></div>
    </header>
    <div id="sceneHost" class="scene-host"></div>
    <div class="card" id="card">
      <ol class="trail" id="trail" aria-label="Your answers so far">
        ${Array.from({ length: QUESTIONS_PER_PUZZLE }, (_, i) => `<li class="chip" data-i="${i}"><span class="cn">${i + 1}</span><span class="ca fit"><span class="sr-only">Clue ${i + 1}: not answered yet</span></span></li>`).join('')}
      </ol>
      <div class="panel" id="panel" aria-live="polite"></div>
    </div>
    <div class="sr-only" id="live" aria-live="polite"></div>
  </section>
  <dialog class="modal pounce-dlg" id="pounceDlg" aria-labelledby="pdTitle"></dialog>`;

  const game = $(root, '#game');
  const panel = $(root, '#panel');
  const live = $(root, '#live');
  const pounceDlg = $(root, '#pounceDlg');
  const sceneHost = $(root, '#sceneHost');
  const scene = createScene(sceneHost);
  sceneHost.insertAdjacentHTML('beforeend', '<div class="res-pill" id="resPill" aria-hidden="true"></div>');
  const pillEl = $(root, '#resPill');

  const save = () => saveProgress(p);
  const announce = (t) => { live.textContent = ''; setTimeout(() => (live.textContent = t), 30); };
  const stopTimer = () => { if (timer) { timer.stop(); timer = null; } };
  const chase = () => chaseState(p);
  const correctCount = () => p.results.filter((r) => r.status === 'correct').length;
  const footStep = () => Math.max(0, p.results.length - (p.pounce.afterQ ?? 0));

  /* ------------------------- the mode state machine: the clock and the keyboard both follow it */
  const syncTimer = () => {
    if (!qTimer) return;
    if (timerRuns({ mode: flow.mode, hidden: document.hidden, busy: gate.busy })) qTimer.resume(); else qTimer.pause();
  };
  const gate = new TimerGate({ pause: syncTimer, resume: syncTimer });
  const flow = createFlow((m) => {
    game.dataset.mode = m;
    if (m !== 'question') { const a = document.activeElement; if (a && a.tagName === 'INPUT') a.blur(); } // leaving a question closes the keyboard
    if (isMobile()) { if (m === 'question' || m === 'ready') scene.rt.pause(); else scene.rt.resume(); } // the story is paused while it is hidden
    syncTimer();
    requestAnimationFrame(() => scene.refit());
  });

  async function play(steps, extra = {}) {
    return gate.during(() => runTimeline(steps, { scene, sfx, cancelled: () => destroyed, ...extra }));
  }

  /* ----------------------------------------------------- keyboard / visible-viewport sizing */
  document.documentElement.classList.add('playing');
  const vv = window.visualViewport;
  let baseVV = vv ? vv.height : window.innerHeight;
  const rootStyle = document.documentElement.style;
  let vpRaf = 0;
  /** size the game from the VISIBLE viewport (above the keyboard), not from CSS viewport units */
  function applyViewport() {
    vpRaf = 0;
    const h = vv ? vv.height : window.innerHeight;
    const top = vv ? vv.offsetTop : 0;
    baseVV = Math.max(baseVV, h);
    if (isMobile()) {
      rootStyle.setProperty('--vvh', h + 'px');
      rootStyle.setProperty('--vvt', top + 'px');
      game.style.transform = top ? `translateY(${top}px)` : '';
      const tier = h >= 480 ? 'full' : h >= 380 ? 'mid' : 'low';
      game.dataset.h = tier; document.documentElement.dataset.vh = tier;
      if (window.scrollY || document.scrollingElement.scrollTop) window.scrollTo(0, 0); // undo any scroll the browser added
    } else { rootStyle.removeProperty('--vvh'); rootStyle.removeProperty('--vvt'); game.style.transform = ''; delete game.dataset.h; delete document.documentElement.dataset.vh; }
    game.classList.toggle('kbd', h < baseVV * 0.8);
    fitQuestion();
  }
  const onViewport = () => { if (!vpRaf) vpRaf = requestAnimationFrame(applyViewport); };
  /** a long clue shrinks (down to 15px) until the whole card fits the space it has; never taller than the screen */
  function fitQuestion() {
    const q = panel.querySelector('.q-text');
    if (!q || !isMobile()) { if (q) q.style.fontSize = ''; return; }
    q.style.fontSize = '';
    let size = parseFloat(getComputedStyle(q).fontSize);
    for (let i = 0; i < 20 && panel.scrollHeight > panel.clientHeight + 1 && size > 15; i++) { size -= 1; q.style.fontSize = size + 'px'; }
  }
  vv?.addEventListener('resize', onViewport);
  vv?.addEventListener('scroll', onViewport);
  applyViewport();
  const keyboardOpen = () => !!vv && vv.height < baseVV * 0.85;
  /** blur the focused input, then wait (briefly) for the keyboard to finish closing before the scene expands */
  async function closeKeyboard() {
    const a = document.activeElement;
    if (a && a.tagName === 'INPUT') a.blur();
    if (!isMobile() || !keyboardOpen()) return;
    await new Promise((res) => { const done = () => { vv.removeEventListener('resize', done); res(); }; vv.addEventListener('resize', done); setTimeout(done, 380); });
    await wait(40);
  }
  const setHero = (on) => game.classList.toggle('hero', on);

  /* the clue timer and the break countdown never run while the tab is hidden */
  function onVisibility() {
    if (document.hidden && !visHold) { visHold = true; gate.hold(); timer?.pause(); }
    else if (!document.hidden && visHold) { visHold = false; gate.release(); timer?.resume(); }
  }
  document.addEventListener('visibilitychange', onVisibility);

  /* ------------------------------------------------------------- trail strip */
  const chips = () => [...game.querySelectorAll('.chip')];
  function fillChip(i, answer, missed) {
    const chip = chips()[i];
    chip.classList.add(missed ? 'missed' : 'lit');
    const a = chip.querySelector('.ca');
    a.title = answer;
    a.innerHTML = `<span class="sr-only">Clue ${i + 1}${missed ? ' (missed)' : ''}: </span>${escapeHTML(answer)}`;
    fitText(a, { min: 11 });
  }
  const fitChips = () => game.querySelectorAll('.chip.lit .ca, .chip.missed .ca').forEach((a) => fitText(a, { min: 11 }));
  new ResizeObserver(fitChips).observe($(root, '#trail'));
  document.fonts?.ready.then(fitChips);
  game.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => c.classList.toggle('open')));

  /* ------------------------------------------------------------------- score / HUD */
  function updateScore(animate = true) {
    const els = [$(root, '#score'), $(root, '#topScore')];
    const target = totals(p).total;
    const show = (n) => els.forEach((e) => { e.textContent = fmt(n); });
    if (!animate || reducedMotion() || target === shownScore) { show(target); shownScore = target; return; }
    const from = shownScore;
    const t0 = performance.now();
    shownScore = target;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 500);
      show(Math.round(from + (target - from) * k));
      if (k < 1 && !destroyed) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function pipsHTML() {
    const n = p.results.length;
    return Array.from({ length: QUESTIONS_PER_PUZZLE }, (_, i) => {
      const r = p.results[i];
      const cur = !r && i === n;
      const cls = r ? (r.status === 'correct' ? 'done' : 'miss') : cur ? 'current' : '';
      const label = r ? (r.status === 'correct' ? 'correct' : 'missed') : cur ? 'current' : 'to come';
      return `<li class="pip ${cls}" aria-label="Clue ${i + 1}: ${label}"><span aria-hidden="true"></span></li>`;
    }).join('');
  }

  /** the compact chase card: mini cat, mini thief, the gap in metres, five pips */
  function stripHTML() {
    const st = chase();
    const g = gapForState(p);
    let cat, label, dash = '#FFB238', thiefO = 1;
    if (st === 'chasing') { const x = 278 - 54 * g; cat = x; label = `${g.toFixed(1)} m`; }
    else if (st === 'caught') { cat = 262; label = 'CAUGHT'; dash = '#3DFFC8'; }
    else { cat = 40; label = st === 'got_away' ? 'GOT AWAY' : 'ON FOOT'; dash = '#8E89C2'; thiefO = 0.35; }
    const mid = (cat + 24 + 296) / 2;
    const aria = st === 'chasing' ? `Chase progress: the cat is ${g.toFixed(1)} metres from the thief` : `Chase over: ${label.toLowerCase()}`;
    return `<svg viewBox="0 0 326 34" role="img" aria-label="${aria}">
      <line x1="6" y1="22" x2="320" y2="22" stroke="#34296B" stroke-width="2"/>
      ${st === 'caught' ? '' : `<line x1="${cat + 24}" y1="22" x2="296" y2="22" stroke="${dash}" stroke-width="2" stroke-dasharray="4 5"/>`}
      ${MINI_CAT(cat, 6)}${MINI_THIEF(298, thiefO)}
      <text x="${st === 'caught' ? 190 : mid}" y="13" text-anchor="middle" font-size="13" fill="${st === 'caught' ? '#3DFFC8' : dash}">${label}</text></svg>
      <div class="strip-row"><ol class="pips">${pipsHTML()}</ol></div>`;
  }

  function updateHud() {
    const st = chase();
    const box = $(root, '#leapBox');
    const lab = $(root, '#leapLab');
    const val = $(root, '#leapVal');
    box.className = 'hud-box hud-leap' + (st === 'on_foot' || st === 'got_away' ? ' foot' : st === 'caught' ? ' caught' : '');
    if (st === 'chasing') { lab.textContent = 'GAP'; val.textContent = formatMeters(gapForState(p)).replace('m', ' m'); val.className = 'val'; }
    else { lab.textContent = ''; val.textContent = st === 'caught' ? 'CAUGHT' : st === 'on_foot' ? 'ON FOOT' : 'GOT AWAY'; val.className = 'val state'; }
    $(root, '#pips').innerHTML = pipsHTML();
    $(root, '#strip').innerHTML = stripHTML();
    $(root, '#homeBtn').hidden = p.phase === 'pounce';
    const s = $(root, '#soundBtn');
    const on = isSoundOn();
    s.textContent = on ? 'SND' : 'MUTE';
    s.classList.toggle('off', !on);
    s.setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
    s.setAttribute('aria-pressed', String(on));
  }

  /** the cat's resting animation for the current state */
  const baseAnim = () => (chase() === 'caught' ? 'sit_smug' : canPounce(p) && (p.phase === 'break' || p.phase === 'final') ? 'crouch' : 'idle');

  /* -------------------------------------------------------- restore the world */
  p.results.forEach((r, i) => { scene.lamp(i, r.status !== 'correct'); fillChip(i, puzzle.clues[i].answer, r.status !== 'correct'); });
  scene.setLight(correctCount());
  {
    const st = chase();
    if (st === 'caught') scene.showCaught();
    else if (st === 'on_foot') scene.showOnFoot(footStep());
    else if (st === 'got_away') { scene.setCatRoof(4); scene.showGone(); }
    else scene.setCatRoof(5 - gapForState(p));
  }
  updateScore(false);
  updateHud();

  /* ---------------------------------------------------------------- question */
  function stopQuestionTimer() { cancelAnimationFrame(qRaf); qTimer?.stop(); qTimer = null; }

  /** start the clock once the clue is fully on screen; it runs only in question mode */
  function startQuestionTimer(clueIndex) {
    const tnum = $(panel, '#tnum');
    const qstrand = $(panel, '#qstrand');
    if (!tnum) return;
    qTimer = new PausableTimer(QUESTION_SECONDS);
    qTimer.start();
    syncTimer();
    let lastCall = QUESTION_SECONDS + 1;
    const tick = () => {
      if (destroyed || p.phase !== 'question' || p.results.length !== clueIndex || !qTimer) return;
      const rem = qTimer.remaining();
      tnum.textContent = rem.toFixed(1);
      const urgent = rem <= 5;
      tnum.classList.toggle('urgent', urgent);
      setStrand(qstrand, rem / QUESTION_SECONDS, urgent);
      for (const mark of [10, 5, 3]) if (lastCall > mark && rem <= mark) announce(`${mark} seconds left`);
      lastCall = rem;
      if (qTimer.expired()) { resolveQ('missed', { guess: lastGuess || null, time: QUESTION_SECONDS, reason: 'timeout' }); return; }
      qRaf = requestAnimationFrame(tick);
    };
    qRaf = requestAnimationFrame(tick);
  }

  /** reveal the question. Always called from a tap (or a desktop timeout) so the input can be focused right here. */
  function showQuestion({ afterHero = false, fromReady = false } = {}) {
    clearTimeout(skipTimer);
    stopQuestionTimer();
    stopTimer();
    p = p.phase === 'intro' ? startQuestion(p) : nextClue(p);
    save();
    attempts = 0;
    guesses = [];
    lastGuess = '';
    const i = p.results.length;
    const clue = puzzle.clues[i];
    flow.go('question');
    setHero(false);
    updateHud();
    scene.catAnim(baseAnim());
    panel.innerHTML = `
      <div class="qpanel" id="qcard">
        <div class="q-meta"><span class="q-num">CLUE ${i + 1} OF ${QUESTIONS_PER_PUZZLE}</span>
          <span class="timer-num" id="tnum" aria-hidden="true">${QUESTION_SECONDS.toFixed(1)}</span></div>
        ${strand('qstrand')}
        <h2 class="q-text">${escapeHTML(clue.q)}</h2>
        <form class="answer-form" id="aform" autocomplete="off">
          <label class="sr-only" for="ans">Your answer</label>
          <input id="ans" type="text" enterkeyhint="go" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="type your answer">
          <button class="btn btn-amber" type="submit" id="goBtn">GO</button>
        </form>
        <p class="tries" id="tries" role="status">${MAX_ATTEMPTS} tries · answer clears the gap</p>
      </div>`;
    const input = $(panel, '#ans');
    $(panel, '#goBtn').addEventListener('pointerdown', (e) => e.preventDefault()); // keep the keyboard open
    $(panel, '#aform').addEventListener('submit', (e) => { e.preventDefault(); submitAnswer(input, clue); });
    input.focus({ preventScroll: true }); // inside the tap handler: the keyboard opens at once
    fitQuestion();
    announce(`Clue ${i + 1}. ${clue.q}`);
    // the clock starts once the clue is on screen: straight away after a tap on the ready card
    const delay = fromReady ? 0 : afterHero ? 520 : 260;
    setTimeout(() => { if (!destroyed && p.phase === 'question' && p.results.length === i && !qTimer) startQuestionTimer(i); }, reducedMotion() ? 30 : delay);
  }

  function submitAnswer(input, clue) {
    const guess = input.value.trim();
    if (!guess || p.phase !== 'question' || gate.busy || flow.mode !== 'question') return;
    const time = qTimer && qTimer.started ? qTimer.elapsed() : 0.1;
    lastGuess = guess;
    guesses.push(guess);
    attempts += 1;
    if (answerGuess(clue, guess)) { resolveQ('correct', { guess, time }); return; }
    const left = MAX_ATTEMPTS - attempts;
    if (left <= 0) { resolveQ('missed', { guess, time, reason: 'attempts' }); return; }
    sfx.nope();
    const card = $(panel, '#qcard');
    card.classList.remove('shake');
    void card.offsetWidth;
    card.classList.add('shake');
    const t = $(panel, '#tries');
    t.textContent = `${left} ${left === 1 ? 'try' : 'tries'} left`;
    t.classList.add('warn');
    input.value = '';
    input.focus({ preventScroll: true });
  }

  /** the one result toast: "+960 Pollo · 1.6 s". Points are shown here and nowhere else. */
  function showPill(r, clue) {
    const ok = r.status === 'correct';
    pillEl.className = 'res-pill' + (ok ? '' : ' miss');
    pillEl.innerHTML = ok
      ? `<span><b>+${fmt(r.points)}</b><i>${escapeHTML(clue.answer)} · ${r.time.toFixed(1)} s</i></span>`
      : `<span><b>0</b><i>Missed · it was ${escapeHTML(clue.answer)}</i></span>`;
    void pillEl.offsetWidth;
    pillEl.classList.add('show');
  }
  const hidePill = () => pillEl.classList.remove('show');

  async function resolveQ(status, info) {
    if (p.phase !== 'question') return;
    stopQuestionTimer();
    const clueGuesses = guesses.slice();
    lastGuess = '';
    p = resolveQuestion(p, { status, tries: attempts, guesses: clueGuesses, ...info });
    save();
    const i = p.results.length - 1;
    const r = p.results[i];
    const clue = puzzle.clues[i];
    const missed = status !== 'correct';
    fillChip(i, clue.answer, missed); // the answer goes in the trail strip, never in the scene
    scene.setLight(correctCount());
    updateScore();
    updateHud();
    if (!missed) sfx.purr(); else sfx.nope();
    announce(missed ? `Missed. The answer was ${clue.answer}.` : `Correct. Plus ${r.points} points.`);

    await closeKeyboard();               // 1. close the keyboard   2. expand the scene   3. play the beat
    if (destroyed) return;
    flow.go('story');
    panel.innerHTML = '';
    if (!missed) { const lr = scene.lampRect(i); sparkBurst(lr.left + lr.width / 2, lr.top + lr.height / 2, { count: 14, spread: 60 }); }
    showPill(r, clue);
    const st = chase();
    const hopTo = st === 'chasing' && 5 - gapForState(p) !== scene.getRoof() ? 5 - gapForState(p) : null;
    await play(clueSequence({ idx: i, missed, kind: st === 'chasing' ? 'chase' : st === 'on_foot' ? 'foot' : 'caught', hopTo, footStep: footStep() }));
    hidePill();
    if (destroyed) return;
    updateHud();
    showBreak();
  }

  /* ------------------------------------------------------------------- break */
  function showEnd() {
    stopTimer();
    setHero(false);
    flow.go('decision');
    recordRound(p); // one anonymous event per finished night (never blocks the UI)
    const caught = chase() === 'caught';
    panel.innerHTML = `<div class="break">
      <h2 class="break-title">${caught ? 'Case closed.' : 'It got away... this time.'}</h2>
      <button class="btn btn-neon" id="resultsBtn">SEE RESULTS ▸</button></div>`;
    $(panel, '#resultsBtn').addEventListener('click', () => onResults());
    updateHud();
  }

  /** the next clue, without a tap: phones get the ready card (no keyboard without a gesture); desktops just go */
  function nextWithoutTap() {
    if (destroyed || p.phase !== 'break') return;
    if (isMobile()) showReady(); else showQuestion();
  }

  function showReady() {
    stopTimer();
    clearTimeout(skipTimer);
    flow.go('ready');
    const n = p.results.length + 1;
    updateHud();
    scene.catAnim(baseAnim());
    panel.innerHTML = `<div class="ready">
      <p class="q-num">CLUE ${n} OF ${QUESTIONS_PER_PUZZLE}</p>
      <h2 class="ready-title">Ready for the next clue?</h2>
      <button class="btn btn-amber" id="revealBtn">REVEAL CLUE ▸</button>
      <p class="ready-note">The timer starts when you tap.</p></div>`;
    $(panel, '#revealBtn').addEventListener('click', () => showQuestion({ fromReady: true }));
    announce(`Ready for clue ${n}?`);
  }

  function showBreak() {
    stopTimer();
    clearTimeout(skipTimer);
    const n = p.results.length;

    if (p.phase === 'done') { showEnd(); return; }
    if (skipsBreak(p)) {
      flow.go('story');
      skipTimer = setTimeout(nextWithoutTap, isMobile() ? 500 : 900);
      return;
    }
    flow.go('decision');
    const pounceBtn = `<button class="btn btn-neon" id="pounceBtn"><span>POUNCE ▸</span> <span class="pv">${fmt(pounceValue(n))}</span></button>`;

    if (p.phase === 'final') {
      panel.innerHTML = `<div class="break">
        <h2 class="break-title">Last chance: the thief is ${m1(gapForState(p))} away.</h2>
        ${pounceBtn}
        <button class="btn btn-ghost" id="skipBtn">Let it go</button></div>`;
      $(panel, '#pounceBtn').addEventListener('click', openPounceBox);
      $(panel, '#skipBtn').addEventListener('click', letItGo);
      scene.catAnim('crouch');
      return;
    }
    panel.innerHTML = `<div class="break">
      <div><h2 class="break-title">The thief is ${m1(gapForState(p))} away.</h2><p class="break-sub">Leap now, or creep closer?</p></div>
      ${pounceBtn}
      <button class="btn btn-ghost" id="nextBtn">Creep closer →</button>
      <div class="break-timer" aria-hidden="true"><div class="bt-bar"><div class="bt-fill" id="btFill"></div></div><span id="btText">Creeping closer in ${BREAK_SECONDS}s</span></div></div>`;
    $(panel, '#pounceBtn').addEventListener('click', openPounceBox);
    $(panel, '#nextBtn').addEventListener('click', goNext);
    scene.catAnim('crouch');
    runBreakTimer(BREAK_SECONDS); // starts only now, after the sequence has finished
  }

  function runBreakTimer(seconds) {
    const fill = $(panel, '#btFill');
    const text = $(panel, '#btText');
    breakRemaining = seconds;
    timer = countdown(seconds, (rem) => {
      breakRemaining = rem;
      if (fill) fill.style.transform = `scaleX(${rem / BREAK_SECONDS})`;
      if (text) text.textContent = `Creeping closer in ${Math.ceil(rem)}s`;
    }, nextWithoutTap);
    if (document.hidden) timer.pause();
  }

  /** "Creep closer" tapped: straight to the question, the input focused inside this tap */
  function goNext() {
    if (destroyed || p.phase !== 'break') return;
    stopTimer();
    showQuestion();
  }

  /** After clue 5 the player lets the thief go: it tips its hat and runs; the cat sits down (scaredy). */
  async function letItGo() {
    p = skipFinal(p);
    save();
    flow.go('story');
    panel.innerHTML = '';
    updateHud();
    await play(letGoSequence());
    if (!destroyed) showEnd();
  }

  /* ------------------------------------------------------------------- pounce */
  function openPounceBox() {
    if (!canPounce(p)) return;
    stopTimer();
    const n = p.results.length;
    p = openPounce(p);
    save();
    updateHud();
    pounceOpen = true;
    scene.dim(true);
    scene.catAnim('crouch');
    pounceDlg.innerHTML = `
      <div class="dlg-box pounce-box" id="pbBox">
        <h2 id="pdTitle">Who's under the mask?</h2>
        <p class="pb-sub">A ${m1(leapMeters(pounceValue(n)))} leap · worth <b>${fmt(pounceValue(n))}</b> · one shot</p>
        <div class="q-meta"><span class="q-num">TIME TO LEAP</span><span class="timer-num" id="ptnum" aria-hidden="true">${POUNCE_SECONDS.toFixed(1)}</span></div>
        ${strand('pstrand')}
        <form class="answer-form" id="pform" autocomplete="off">
          <label class="sr-only" for="pans">Name the thief</label>
          <input id="pans" type="text" enterkeyhint="go" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Name the thief">
          <button class="btn btn-neon" type="submit" id="pgo">LEAP ▸</button>
        </form>
        <p class="pb-msg" id="pmsg" role="status"></p>
        <button class="link-btn" id="pBack" type="button">Not yet</button>
      </div>`;
    pounceDlg.showModal();
    const input = $(pounceDlg, '#pans');
    input.focus({ preventScroll: true });
    $(pounceDlg, '#pgo').addEventListener('pointerdown', (e) => e.preventDefault());
    $(pounceDlg, '#pform').addEventListener('submit', (e) => { e.preventDefault(); submitPounce(input); });
    $(pounceDlg, '#pBack').addEventListener('click', backOutOfPounce);

    const tnum = $(pounceDlg, '#ptnum');
    const pstrand = $(pounceDlg, '#pstrand');
    timer = countdown(POUNCE_SECONDS, (rem) => {
      tnum.textContent = rem.toFixed(1);
      tnum.classList.toggle('urgent', rem <= 5);
      setStrand(pstrand, rem / POUNCE_SECONDS, rem <= 5);
    }, () => finishPounce(false, null, 'timeout'));
  }

  pounceDlg.addEventListener('cancel', (e) => { e.preventDefault(); if (pounceOpen && p.phase === 'pounce') backOutOfPounce(); });

  function closePounceDlg() {
    pounceOpen = false;
    if (pounceDlg.open) pounceDlg.close();
  }

  function backOutOfPounce() {
    if (p.phase !== 'pounce') return;
    stopTimer();
    p = cancelPounce(p);
    save();
    closePounceDlg();
    scene.dim(false);
    updateHud();
    if (p.phase === 'break') runBreakTimer(Math.max(3, Math.min(BREAK_SECONDS, breakRemaining)));
    scene.catAnim(baseAnim());
  }

  function submitPounce(input) {
    const guess = input.value.trim();
    if (!guess || p.phase !== 'pounce') return;
    const verdict = judgePounce(puzzle.connect, guess, p.pounce.closeUsed);
    if (verdict === 'close') {
      p = noteClose(p);
      save();
      const box = $(pounceDlg, '#pbBox');
      box.classList.remove('shake');
      void box.offsetWidth;
      box.classList.add('shake');
      $(pounceDlg, '#pmsg').textContent = 'Close! The mask slips... be more specific.';
      sfx.nope();
      input.value = '';
      input.focus({ preventScroll: true });
      return;
    }
    finishPounce(verdict === 'correct', guess, null);
  }

  async function finishPounce(correct, guess, reason) {
    if (p.phase !== 'pounce') return;
    stopTimer();
    const n = p.results.length;
    const value = pounceValue(n);
    p = resolvePounce(p, { correct, guess });
    save();
    closePounceDlg();
    updateScore();
    await closeKeyboard();
    if (destroyed) return;
    flow.go('story');
    setHero(true); // the question card slides away, the scene fills the screen
    await wait(430);
    if (destroyed) return;
    if (correct) await catchThief(value);
    else await fallShort(n, reason);
  }

  /* ------------------------------------------- DOM cards used by the sequences */
  const overlay = () => scene.overlay();

  /** place a card centred above the characters, below the HUD, never over the cat or the thief */
  function placeAbovePair(el) {
    const sr = scene.sceneEl.getBoundingClientRect();
    const t = scene.thiefRect();
    const c = scene.catRect();
    const pw = el.offsetWidth;
    const ph = el.offsetHeight;
    const centre = t.left + t.width / 2 - sr.left;
    const left = Math.max(10, Math.min(sr.width - pw - 10, centre - pw / 2));
    const safe = sr.width >= 900 ? 132 : 64;
    const above = Math.min(t.top, c.top) - sr.top - ph - 14;
    const top = Math.max(safe, Math.min(sr.height - ph - 10, above));
    el.style.left = left + 'px';
    el.style.top = top + 'px';
  }

  function plateUI(value) {
    let tapResolve;
    const tapped = new Promise((r) => { tapResolve = r; });
    return {
      showPlate() {
        const ov = overlay();
        // no rank here: the title is revealed only on the results page
        ov.innerHTML = `
          <div class="plate" role="status">
            <p class="plate-kicker">THE THIEF WAS…</p>
            <p class="plate-name fit">${escapeHTML(puzzle.connect.answer)}</p>
            <p class="plate-sub">Caught from ${formatMeters(leapMeters(value))} · +${fmt(value)}</p>
            <p class="plate-tap">tap to continue</p>
          </div>`;
        const plate = $(ov, '.plate');
        fitText($(ov, '.plate-name'), { min: 15 });
        placeAbovePair(plate);
        const guard = setTimeout(() => ov.addEventListener('click', () => tapResolve(), { once: true }), 600);
        tapped.then(() => clearTimeout(guard));
      },
      waitForTap: () => tapped
    };
  }

  /** The catch: a timeline, then the heads-up card. */
  async function catchThief(value) {
    sfx.mrrp();
    announce(`Caught from ${formatMeters(leapMeters(value))}. Plus ${value} points. The thief was ${puzzle.connect.answer}.`);
    const ui = plateUI(value);
    await play(catchSequence(), { ui });
    if (destroyed) return;
    const tr = scene.thiefRect();
    sparkBurst(tr.left + tr.width / 2, tr.top + tr.height / 3, { count: 36, spread: 170 });
    overlay().innerHTML = '';
    scene.dim(false);
    scene.setReserve(0);
    setHero(false);
    scene.frame('caught', 350);
    updateHud();
    if (p.phase === 'done') { await wait(450); showEnd(); return; }
    // the heads-up card: no clock runs while it is up; the next clue appears only after the tap (the tap opens the keyboard)
    await wait(450);
    if (destroyed) return;
    flow.go('decision');
    panel.innerHTML = `<div class="break"><p class="heads-up">${HEADS_UP}</p><button class="btn btn-amber" id="huBtn">GOT IT ▸</button></div>`;
    gate.hold();
    $(panel, '#huBtn').addEventListener('click', () => {
      gate.release();
      if (destroyed || p.phase !== 'break') return;
      showQuestion({ afterHero: true });
    }, { once: true });
  }

  /** Wrong pounce or timeout: the fall timeline, then the card. */
  async function fallShort(n, reason) {
    const prefix = reason === 'timeout' ? 'Out of time. ' : '';
    const state = {};
    const ui = {
      showCard: () => new Promise((resolve) => {
        updateHud();
        announce(`${prefix}You fell short at ${m1(leapMeters(pounceValue(n)))}. The thief got away.`);
        const ov = overlay();
        ov.innerHTML = `
          <div class="plate plate--fall" role="status">
            <p class="plate-kicker">SO CLOSE</p>
            <p class="plate-name">The thief got away.</p>
            <p class="plate-sub">${prefix}You fell short at ${m1(leapMeters(pounceValue(n)))}. The mask stays on.</p>
            <button class="btn btn-amber" id="climbBtn">Climb out →</button>
          </div>`;
        placeAbovePair($(ov, '.plate'));
        $(ov, '#climbBtn').addEventListener('click', resolve, { once: true });
      })
    };
    await play(fallSequence(state), { ui });
    if (destroyed) return;
    overlay().innerHTML = '';
    scene.dim(false);
    await gate.during(() => scene.walkTo(0, true)); // the cat climbs out and follows on foot, down in the street
    if (destroyed) return;
    setHero(false);
    await wait(450);
    if (destroyed) return;
    if (p.phase === 'done') showEnd();
    else nextWithoutTap();
  }

  /* --------------------------------------------------------------- top bar UI */
  $(root, '#soundBtn').addEventListener('click', () => { setSound(!isSoundOn()); updateHud(); });
  $(root, '#homeBtn').addEventListener('click', () => { destroy(); onHome(); });

  /* ------------------------------------------------------------------- start */
  if (p.phase === 'intro' || p.phase === 'question') showQuestion();
  else { scene.catAnim(baseAnim()); showBreak(); }

  function destroy() {
    destroyed = true;
    stopTimer();
    stopQuestionTimer();
    clearTimeout(skipTimer);
    vv?.removeEventListener('resize', onViewport);
    vv?.removeEventListener('scroll', onViewport);
    document.removeEventListener('visibilitychange', onVisibility);
    rootStyle.removeProperty('--vvh');
    rootStyle.removeProperty('--vvt');
    document.documentElement.classList.remove('playing'); delete document.documentElement.dataset.vh;
    scene.destroy();
    if (p.phase === 'question' || p.phase === 'pounce') { p = applyReload(p); save(); }
    document.querySelectorAll('.fx-layer, .float-points').forEach((n) => n.remove());
  }

  return { destroy };
}
