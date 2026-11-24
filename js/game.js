// Night screen controller: one night's chase, from the first clue to the end of the night.
// Moments are played as timelines (sequences.js). The question timer is paused for as long as any
// sequence or card is on screen, and only starts once the clue is fully visible.
import {
  QUESTION_SECONDS, BREAK_SECONDS, POUNCE_SECONDS, MAX_ATTEMPTS, QUESTIONS_PER_PUZZLE,
  answerGuess, judgePounce, pounceValue, totals, titleFor, formatNumber as fmt,
  leapMeters, formatMeters, skipsBreak, chaseState, gapForState,
  startQuestion, resolveQuestion, nextClue, canPounce, openPounce, cancelPounce, noteClose,
  resolvePounce, skipFinal, applyReload
} from './engine.js';
import { createScene, escapeHTML } from './scene.js';
import { rainHTML } from './rain.js';
import { sparkBurst, floatPoints, reducedMotion } from './fx.js';
import { fitText } from './fit.js';
import { sfx, isSoundOn, setSound } from './audio.js';
import { saveProgress } from './store.js';
import { PausableTimer, TimerGate } from './timer.js';
import { runTimeline, clueSequence, catchSequence, fallSequence, letGoSequence } from './sequences.js';

const $ = (root, sel) => root.querySelector(sel);
const HEADS_UP = 'Heads up: the remaining clues are general knowledge, not about the thief.';
const m1 = (g) => `${g.toFixed(1)} m`;
const wait = (ms) => new Promise((r) => setTimeout(r, reducedMotion() ? Math.min(ms, 30) : ms));

function countdown(seconds, onTick, onDone) {
  const end = performance.now() + seconds * 1000;
  let raf = 0;
  let stopped = false;
  const tick = () => {
    if (stopped) return;
    const rem = (end - performance.now()) / 1000;
    if (rem <= 0) { onTick(0); stopped = true; onDone(); return; }
    onTick(rem);
    raf = requestAnimationFrame(tick);
  };
  tick();
  return { stop() { stopped = true; cancelAnimationFrame(raf); }, remaining: () => Math.max(0, (end - performance.now()) / 1000) };
}

const strand = (id) => `<div class="strand" id="${id}" style="--p:1" aria-hidden="true"><div class="strand-fill"></div></div>`;
const setStrand = (el, frac, urgent) => { el.style.setProperty('--p', Math.max(0, Math.min(1, frac)).toFixed(4)); el.classList.toggle('urgent', urgent); };

export function mountGame(root, puzzle, initial, { onHome, onResults }) {
  let p = initial;
  let timer = null;          // break / pounce countdown
  let qTimer = null;         // the question timer (pausable)
  let qRaf = 0;
  let breakRemaining = BREAK_SECONDS;
  let attempts = 0;
  let lastGuess = '';
  let pounceOpen = false;
  let destroyed = false;
  let skipTimer = 0;
  let shownScore = totals(p).total;

  root.innerHTML = `
  ${rainHTML()}
  <section class="screen game" id="game">
    <div class="topline">
      <button class="icon-btn" id="homeBtn" aria-label="Back to home">‹</button>
      <h1 class="pz-name">NIGHT #${puzzle.id}</h1>
      <button class="icon-btn" id="soundBtn"></button>
    </div>
    <header class="hud">
      <div class="hud-box hud-leap" id="leapBox"><span class="lab" id="leapLab">GAP</span><span class="val" id="leapVal"></span></div>
      <ol class="pips" id="pips" aria-label="Progress"></ol>
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
  const scene = createScene($(root, '#sceneHost'));

  const save = () => saveProgress(p);
  const announce = (t) => { live.textContent = ''; setTimeout(() => (live.textContent = t), 30); };
  const stopTimer = () => { if (timer) { timer.stop(); timer = null; } };
  const chase = () => chaseState(p);
  const correctCount = () => p.results.filter((r) => r.status === 'correct').length;
  const footStep = () => Math.max(0, p.results.length - (p.pounce.afterQ ?? 0));

  /* ------------------------------------------- the timer gate: no clock during sequences or cards */
  const gate = new TimerGate({ pause: () => qTimer?.pause(), resume: () => qTimer?.resume() });
  async function play(steps, extra = {}) {
    return gate.during(() => runTimeline(steps, { scene, sfx, cancelled: () => destroyed, ...extra }));
  }

  /* ----------------------------------------------------- keyboard / hero layout */
  let baseVV = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  function onViewport() {
    const vv = window.visualViewport;
    if (!vv) return;
    baseVV = Math.max(baseVV, vv.height);
    game.classList.toggle('kbd', vv.height < baseVV * 0.8);
  }
  window.visualViewport?.addEventListener('resize', onViewport);
  const setHero = (on) => game.classList.toggle('hero', on);

  /* ------------------------------------------------------------- trail strip */
  const chips = () => [...game.querySelectorAll('.chip')];
  function fillChip(i, answer, missed) {
    const chip = chips()[i];
    chip.classList.add(missed ? 'missed' : 'lit');
    const a = chip.querySelector('.ca');
    a.title = answer;
    a.innerHTML = `<span class="sr-only">Clue ${i + 1}${missed ? ' (missed)' : ''}: </span>${escapeHTML(answer)}`;
    fitText(a, { min: 12 });
  }
  const fitChips = () => game.querySelectorAll('.chip.lit .ca, .chip.missed .ca').forEach((a) => fitText(a, { min: 12 }));
  new ResizeObserver(fitChips).observe($(root, '#trail'));
  document.fonts?.ready.then(fitChips);
  game.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => c.classList.toggle('open')));

  /* ------------------------------------------------------------------- score / HUD */
  function updateScore(animate = true) {
    const el = $(root, '#score');
    const target = totals(p).total;
    if (!animate || reducedMotion() || target === shownScore) { el.textContent = fmt(target); shownScore = target; return; }
    const from = shownScore;
    const t0 = performance.now();
    shownScore = target;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 500);
      el.textContent = fmt(Math.round(from + (target - from) * k));
      if (k < 1 && !destroyed) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function updateHud() {
    const n = p.results.length;
    const st = chase();
    const box = $(root, '#leapBox');
    const lab = $(root, '#leapLab');
    const val = $(root, '#leapVal');
    box.className = 'hud-box hud-leap' + (st === 'on_foot' || st === 'got_away' ? ' foot' : st === 'caught' ? ' caught' : '');
    if (st === 'chasing') { lab.textContent = 'GAP'; val.textContent = formatMeters(gapForState(p)); val.className = 'val'; }
    else { lab.textContent = ''; val.textContent = st === 'caught' ? 'CAUGHT' : st === 'on_foot' ? 'ON FOOT' : 'GOT AWAY'; val.className = 'val state'; }
    $(root, '#pips').innerHTML = Array.from({ length: QUESTIONS_PER_PUZZLE }, (_, i) => {
      const r = p.results[i];
      const cur = !r && i === n;
      const cls = r ? (r.status === 'correct' ? 'done' : 'miss') : cur ? 'current' : '';
      const label = r ? (r.status === 'correct' ? 'correct' : 'missed') : cur ? 'current' : 'to come';
      return `<li class="pip ${cls}" aria-label="Clue ${i + 1}: ${label}"><span aria-hidden="true">${r && r.status !== 'correct' ? '×' : ''}</span></li>`;
    }).join('');
    $(root, '#homeBtn').hidden = p.phase === 'question' || p.phase === 'pounce';
    const s = $(root, '#soundBtn');
    const on = isSoundOn();
    s.textContent = 'SND';
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
  function stopQuestionTimer() { cancelAnimationFrame(qRaf); qTimer?.stop(); }

  /** start the clock once the clue is fully on screen; it never runs during a sequence or a card */
  function startQuestionTimer(clueIndex) {
    const tnum = $(panel, '#tnum');
    const qstrand = $(panel, '#qstrand');
    if (!tnum) return;
    qTimer = new PausableTimer(QUESTION_SECONDS);
    qTimer.start();
    if (gate.busy) qTimer.pause();
    let lastCall = QUESTION_SECONDS + 1;
    const tick = () => {
      if (destroyed || p.phase !== 'question' || p.results.length !== clueIndex) return;
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

  function showQuestion({ afterHero = false } = {}) {
    clearTimeout(skipTimer);
    stopQuestionTimer();
    p = p.phase === 'intro' ? startQuestion(p) : nextClue(p);
    save();
    attempts = 0;
    const i = p.results.length;
    const clue = puzzle.clues[i];
    updateHud();
    scene.catAnim(baseAnim());
    panel.innerHTML = `
      <div class="qpanel" id="qcard">
        <div class="q-meta"><span class="q-num">CLUE ${i + 1} OF ${QUESTIONS_PER_PUZZLE}</span>
          <span class="timer-num" id="tnum" aria-hidden="true">${QUESTION_SECONDS.toFixed(1)}</span></div>
        ${strand('qstrand')}
        <p class="q-text">${escapeHTML(clue.q)}</p>
        <form class="answer-form" id="aform" autocomplete="off">
          <input id="ans" type="text" enterkeyhint="go" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Your answer" placeholder="type your answer">
          <button class="btn btn-amber" type="submit" id="goBtn">GO</button>
        </form>
        <p class="tries" id="tries" role="status"></p>
      </div>`;
    const input = $(panel, '#ans');
    $(panel, '#goBtn').addEventListener('pointerdown', (e) => e.preventDefault()); // keep the keyboard open
    $(panel, '#aform').addEventListener('submit', (e) => { e.preventDefault(); submitAnswer(input, clue); });
    input.focus({ preventScroll: true });
    announce(`Clue ${i + 1}. ${clue.q}`);
    // the timer starts only when the clue is fully visible (after the card slides in / the layout settles)
    const delay = afterHero ? 520 : 260;
    setTimeout(() => { if (!destroyed && p.phase === 'question' && p.results.length === i) startQuestionTimer(i); }, reducedMotion() ? 30 : delay);
  }

  function submitAnswer(input, clue) {
    const guess = input.value.trim();
    if (!guess || p.phase !== 'question' || gate.busy) return;
    const time = qTimer && qTimer.started ? qTimer.elapsed() : 0.1;
    lastGuess = guess;
    attempts += 1;
    if (answerGuess(clue, guess)) { resolveQ('correct', { guess, time }); return; }
    const left = MAX_ATTEMPTS - attempts;
    if (left <= 0) { resolveQ('missed', { guess, time, reason: 'attempts' }); return; }
    sfx.nope();
    const card = $(panel, '#qcard');
    card.classList.remove('shake');
    void card.offsetWidth;
    card.classList.add('shake');
    $(panel, '#tries').textContent = `${left} ${left === 1 ? 'TRY' : 'TRIES'} LEFT`;
    input.value = '';
    input.focus({ preventScroll: true });
  }

  async function resolveQ(status, info) {
    if (p.phase !== 'question') return;
    stopQuestionTimer();
    lastGuess = '';
    p = resolveQuestion(p, { status, ...info });
    save();
    const i = p.results.length - 1;
    const r = p.results[i];
    const clue = puzzle.clues[i];
    const missed = status !== 'correct';
    fillChip(i, clue.answer, missed); // the answer goes in the trail strip, never in the scene
    scene.setLight(correctCount());
    updateScore();
    updateHud();
    panel.innerHTML = `<div class="break">${resultLine()}</div>`;
    if (!missed) {
      sfx.purr();
      const lr = scene.lampRect(i);
      sparkBurst(lr.left + lr.width / 2, lr.top + lr.height / 2, { count: 14, spread: 60 });
      const sr = scene.sceneEl.getBoundingClientRect();
      floatPoints(scene.catRect(), `+${fmt(r.points)}`, { left: sr.left, right: sr.right, top: sr.top, bottom: sr.bottom });
    } else sfx.nope();
    announce(missed ? `Missed. The answer was ${clue.answer}.` : `Correct. Plus ${r.points} points.`);

    const st = chase();
    const hopTo = st === 'chasing' && 5 - gapForState(p) !== scene.getRoof() ? 5 - gapForState(p) : null;
    await play(clueSequence({ idx: i, missed, kind: st === 'chasing' ? 'chase' : st === 'on_foot' ? 'foot' : 'caught', hopTo, footStep: footStep() }));
    if (destroyed) return;
    updateHud();
    showBreak();
  }

  /* ------------------------------------------------------------------- break */
  function resultLine() {
    const i = p.results.length - 1;
    const r = p.results[i];
    const clue = puzzle.clues[i];
    return r.status === 'correct'
      ? `<div class="result-line"><span class="pts-pill">+${fmt(r.points)}</span><span>Correct · ${r.time.toFixed(1)}s</span></div>`
      : `<div class="result-line"><span class="pts-pill miss">0</span><span>Missed · It was ${escapeHTML(clue.answer)}</span></div>`;
  }

  function showEnd() {
    stopTimer();
    setHero(false);
    const caught = chase() === 'caught';
    panel.innerHTML = `<div class="break">${p.results.length ? resultLine() : ''}
      <h2 class="break-title">${caught ? 'Case closed.' : 'It got away... this time.'}</h2>
      <button class="btn btn-amber" id="resultsBtn">SEE RESULTS ▸</button></div>`;
    $(panel, '#resultsBtn').addEventListener('click', () => onResults());
    updateHud();
  }

  function showBreak() {
    stopTimer();
    clearTimeout(skipTimer);
    const n = p.results.length;

    if (p.phase === 'done') { showEnd(); return; }

    const pounceBtn = `<button class="btn btn-neon" id="pounceBtn"><span>POUNCE ▸</span><span class="pv">${fmt(pounceValue(n))}</span></button>`;

    if (p.phase === 'final') {
      panel.innerHTML = `<div class="break">${resultLine()}
        <h2 class="break-title">Last chance: the thief is ${m1(gapForState(p))} away.</h2>
        ${pounceBtn}
        <button class="btn" id="skipBtn">Let it go</button></div>`;
      $(panel, '#pounceBtn').addEventListener('click', openPounceBox);
      $(panel, '#skipBtn').addEventListener('click', letItGo);
      scene.catAnim('crouch');
      return;
    }
    if (skipsBreak(p)) {
      panel.innerHTML = `<div class="break">${resultLine()}</div>`;
      skipTimer = setTimeout(() => !destroyed && goNext(), 1000);
      return;
    }
    panel.innerHTML = `<div class="break">${resultLine()}
      <h2 class="break-title">The thief is ${m1(gapForState(p))} away. Leap now, or creep closer?</h2>
      ${pounceBtn}
      <button class="btn" id="nextBtn">Creep closer →</button>
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
    }, goNext);
  }

  function goNext() {
    if (destroyed || p.phase !== 'break') return;
    stopTimer();
    showQuestion();
  }

  /** After clue 5 the player lets the thief go: it tips its hat and runs; the cat sits down (scaredy). */
  async function letItGo() {
    p = skipFinal(p);
    save();
    panel.innerHTML = `<div class="break"><h2 class="break-title">The thief slips into the night...</h2></div>`;
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
          <input id="pans" type="text" enterkeyhint="go" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Name the thief" placeholder="Name the thief">
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
    setHero(true); // the question card slides away, the scene fills the screen
    await wait(430);
    if (destroyed) return;
    if (correct) await catchThief(value);
    else await fallShort(n, reason);
  }

  /* ------------------------------------------- DOM cards used by the sequences */
  const overlay = () => scene.overlay();

  /** place a card centred above the characters, clamped to the scene's safe area (never at the screen edge) */
  function placeAbovePair(el) {
    const sr = scene.sceneEl.getBoundingClientRect();
    const t = scene.thiefRect();
    const c = scene.catRect();
    const pw = el.offsetWidth;
    const ph = el.offsetHeight;
    const centre = t.left + t.width / 2 - sr.left;
    const left = Math.max(10, Math.min(sr.width - pw - 10, centre - pw / 2));
    const safe = sr.width >= 900 ? 132 : 10;
    const top = Math.max(safe, Math.min(sr.height - ph - 10, Math.min(t.top, c.top) - sr.top - ph - 14));
    el.style.left = left + 'px';
    el.style.top = top + 'px';
  }

  function plateUI(value, t) {
    let tapResolve;
    const tapped = new Promise((r) => { tapResolve = r; });
    return {
      showPlate() {
        const ov = overlay();
        ov.innerHTML = `
          <div class="plate" role="status">
            <p class="plate-kicker">THE THIEF WAS…</p>
            <p class="plate-name fit">${escapeHTML(puzzle.connect.answer)}</p>
            <p class="plate-pts">+${fmt(value)}</p>
            <p class="plate-title">${escapeHTML(t.title)}</p>
            <p class="plate-sub">Caught from ${formatMeters(leapMeters(value))}</p>
            <p class="plate-tap">tap to continue</p>
          </div>`;
        const plate = $(ov, '.plate');
        fitText($(ov, '.plate-name'), { min: 16 });
        placeAbovePair(plate);
        const guard = setTimeout(() => ov.addEventListener('click', () => tapResolve(), { once: true }), 600);
        tapped.then(() => clearTimeout(guard));
      },
      waitForTap: () => tapped
    };
  }

  /** The catch: a timeline, then the heads-up card. */
  async function catchThief(value) {
    const t = titleFor(p);
    sfx.mrrp();
    announce(`Caught from ${formatMeters(leapMeters(value))}. Plus ${value} points. ${t.title}. The thief was ${puzzle.connect.answer}.`);
    const ui = plateUI(value, t);
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
    // the heads-up card: no clock runs while it is up; the next clue appears only after the tap
    await wait(450);
    panel.innerHTML = `<div class="break"><p class="heads-up">${HEADS_UP}</p><button class="btn btn-amber" id="huBtn">GOT IT ▸</button></div>`;
    gate.hold();
    await new Promise((resolve) => $(panel, '#huBtn').addEventListener('click', resolve, { once: true }));
    gate.release();
    if (destroyed || p.phase !== 'break') return;
    showQuestion({ afterHero: true });
  }

  /** Wrong pounce or timeout: the fall timeline, then the card. */
  async function fallShort(n, reason) {
    const prefix = reason === 'timeout' ? 'Out of time. ' : '';
    const state = {};
    const ui = {
      showCard: () => new Promise((resolve) => {
        updateHud();
        announce(`CLATTER! ${prefix}You fell short at ${m1(leapMeters(pounceValue(n)))}. The thief got away.`);
        const ov = overlay();
        ov.innerHTML = `
          <div class="plate plate--fall" role="status">
            <p class="plate-kicker">CLATTER!</p>
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
    if (p.phase === 'done') showEnd();
    else showQuestion({ afterHero: true });
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
    window.visualViewport?.removeEventListener('resize', onViewport);
    scene.destroy();
    if (p.phase === 'question' || p.phase === 'pounce') { p = applyReload(p); save(); }
    document.querySelectorAll('.fx-layer, .float-points').forEach((n) => n.remove());
  }

  return { destroy };
}
