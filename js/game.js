// Game screen controller: one prowl from the first clue to the last leap.
import {
  QUESTION_SECONDS, BREAK_SECONDS, POUNCE_SECONDS, MAX_ATTEMPTS, QUESTIONS_PER_PUZZLE,
  answerGuess, judgePounce, pounceValue, totals, titleFor, formatNumber as fmt,
  gapMeters, leapMeters, formatMeters, skipsBreak,
  startQuestion, resolveQuestion, nextClue, canPounce, openPounce, cancelPounce, noteClose,
  resolvePounce, skipFinal, applyReload
} from './engine.js';
import { catSVG } from './cat.js';
import { createScene, escapeHTML } from './scene.js';
import { rainHTML } from './pixel.js';
import { sparkBurst, floatPoints, reducedMotion } from './fx.js';
import { sfx, isSoundOn, setSound } from './audio.js';
import { saveProgress } from './store.js';

const $ = (root, sel) => root.querySelector(sel);
const HEADS_UP = 'Heads up: the remaining clues are general knowledge, not from the connect.';

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

const HOME_ICON = '‹';
const SND = () => 'SND';

export function mountGame(root, puzzle, initial, { onHome, onResults }) {
  let p = initial;
  let timer = null;
  let breakRemaining = BREAK_SECONDS;
  let qStart = 0;
  let attempts = 0;
  let lastGuess = '';
  let pounceOpen = false;
  let destroyed = false;
  let skipTimer = 0;
  let shownScore = totals(p).total;

  root.innerHTML = `
  ${rainHTML()}
  <section class="screen game">
    <div class="topline">
      <button class="icon-btn" id="homeBtn" aria-label="Back to home">${HOME_ICON}</button>
      <h1 class="pz-name">PROWL #${puzzle.id}</h1>
      <button class="icon-btn" id="soundBtn"></button>
    </div>
    <header class="hud">
      <div class="hud-box hud-leap"><span class="lab" id="leapLab">LEAP</span><span class="val" id="leapVal"></span></div>
      <ol class="pips" id="pips" aria-label="Progress"></ol>
      <div class="hud-box hud-score"><span class="lab">SCORE</span><span class="val" id="score">0</span></div>
    </header>
    <div id="sceneHost" style="display:contents"></div>
    <div class="panel" id="panel" aria-live="polite"></div>
    <div class="sr-only" id="live" aria-live="polite"></div>
  </section>
  <dialog class="modal pounce-dlg" id="pounceDlg" aria-labelledby="pdTitle"></dialog>
  <dialog class="modal reveal-dlg" id="revealDlg" aria-labelledby="rvTitle"></dialog>`;

  const panel = $(root, '#panel');
  const live = $(root, '#live');
  const pounceDlg = $(root, '#pounceDlg');
  const revealDlg = $(root, '#revealDlg');
  const scene = createScene($(root, '#sceneHost'));

  const save = () => saveProgress(p);
  const announce = (t) => { live.textContent = ''; setTimeout(() => (live.textContent = t), 30); };
  const stopTimer = () => { if (timer) { timer.stop(); timer = null; } };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const leapt = () => p.pounce.status === 'correct';
  const basePose = () => (canPounce(p) && (p.phase === 'break' || p.phase === 'final') ? 'wiggle' : 'crouch');

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
    $(root, '#leapLab').textContent = leapt() ? 'LEAPT' : 'LEAP';
    $(root, '#leapVal').textContent = formatMeters(leapt() ? leapMeters(p.pounce.points) : gapMeters(n));
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
    s.textContent = SND(on);
    s.classList.toggle('off', !on);
    s.setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
    s.setAttribute('aria-pressed', String(on));
  }

  /* -------------------------------------------------------- restore the world */
  const correctCount = () => p.results.filter((r) => r.status === 'correct').length;
  p.results.forEach((r, i) => scene.lightLantern(i, puzzle.clues[i].answer, r.status !== 'correct', false));
  scene.setLight(correctCount());
  if (leapt()) { scene.setGap(p.pounce.afterQ, false); scene.setRevealed(puzzle.connect.answer); }
  else { scene.setGap(p.results.length, false); if (p.pounce.status === 'wrong') scene.setFallen(); }
  updateScore(false);
  updateHud();

  /* ---------------------------------------------------------------- question */
  function showQuestion() {
    panel.style.visibility = '';
    clearTimeout(skipTimer);
    p = p.phase === 'intro' ? startQuestion(p) : nextClue(p);
    save();
    attempts = 0;
    const i = p.results.length;
    const clue = puzzle.clues[i];
    updateHud();
    if (!leapt()) scene.setPose('crouch');
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

    qStart = performance.now();
    const tnum = $(panel, '#tnum');
    const qstrand = $(panel, '#qstrand');
    let lastCall = QUESTION_SECONDS + 1;
    announce(`Clue ${i + 1}. ${clue.q}`);
    timer = countdown(QUESTION_SECONDS, (rem) => {
      tnum.textContent = rem.toFixed(1);
      const urgent = rem <= 5;
      tnum.classList.toggle('urgent', urgent);
      setStrand(qstrand, rem / QUESTION_SECONDS, urgent);
      for (const mark of [10, 5, 3]) if (lastCall > mark && rem <= mark) announce(`${mark} seconds left`);
      lastCall = rem;
    }, () => resolveQ('missed', { guess: lastGuess || null, time: QUESTION_SECONDS, reason: 'timeout' }));
  }

  function submitAnswer(input, clue) {
    const guess = input.value.trim();
    if (!guess || p.phase !== 'question') return;
    const time = (performance.now() - qStart) / 1000;
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

  function resolveQ(status, info) {
    if (p.phase !== 'question') return;
    stopTimer();
    lastGuess = '';
    p = resolveQuestion(p, { status, ...info });
    save();
    const i = p.results.length - 1;
    const r = p.results[i];
    const clue = puzzle.clues[i];
    const missed = status !== 'correct';
    scene.lightLantern(i, clue.answer, missed);
    scene.setLight(correctCount());
    if (!leapt()) scene.setGap(p.results.length);
    updateScore();
    updateHud();
    if (!missed) {
      sfx.purr();
      const lr = scene.lanternRect(i);
      sparkBurst(lr.left + lr.width / 2, lr.top + lr.height / 2, { count: 14, spread: 60 });
      floatPoints(lr, `+${fmt(r.points)}`);
    } else {
      sfx.nope();
    }
    announce(missed ? `Missed. The answer was ${clue.answer}.` : `Correct. Plus ${r.points} points.`);
    showBreak();
  }

  /* ------------------------------------------------------------------- break */
  function resultLine() {
    const i = p.results.length - 1;
    const r = p.results[i];
    const clue = puzzle.clues[i];
    return r.status === 'correct'
      ? `<div class="result-line"><span class="pts-pill">+${fmt(r.points)}</span><span>Correct · ${r.time.toFixed(1)}s</span></div>`
      : `<div class="result-line"><span class="pts-pill miss">0</span><span>Missed · It was <b>${escapeHTML(clue.answer)}</b></span></div>`;
  }

  function showBreak() {
    panel.style.visibility = '';
    stopTimer();
    clearTimeout(skipTimer);
    const n = p.results.length;
    const pounceBtn = `<button class="btn btn-neon" id="pounceBtn"><span>POUNCE ▸</span><span class="pv">${fmt(pounceValue(n))}</span></button>`;

    if (p.phase === 'done') {
      panel.innerHTML = `<div class="break">${resultLine()}<h2 class="break-title">That's all five</h2>
        <p class="break-sub">The roofs are quiet. Time to see how it all links.</p>
        <button class="btn btn-amber" id="resultsBtn">SEE RESULTS ▸</button></div>`;
      $(panel, '#resultsBtn').addEventListener('click', () => onResults());
      scene.setPose(leapt() ? 'land' : 'crouch');
      return;
    }
    if (p.phase === 'final') {
      panel.innerHTML = `<div class="break">${resultLine()}<h2 class="break-title">Last leap</h2>
        <p class="break-sub">Only ${formatMeters(gapMeters(n))} left to cross. One last chance.</p>
        ${pounceBtn}
        <button class="btn" id="skipBtn">Skip to results</button></div>`;
      $(panel, '#pounceBtn').addEventListener('click', openPounceBox);
      $(panel, '#skipBtn').addEventListener('click', () => { p = skipFinal(p); save(); onResults(); });
      scene.setPose('wiggle');
      return;
    }
    if (skipsBreak(p)) {
      // the pounce is spent: show the result for a moment, then carry on
      panel.innerHTML = `<div class="break">${resultLine()}</div>`;
      scene.setPose(leapt() ? 'land' : 'crouch');
      skipTimer = setTimeout(() => !destroyed && goNext(), 1200);
      return;
    }
    panel.innerHTML = `<div class="break">${resultLine()}
      <h2 class="break-title">Leap now, or creep closer?</h2>
      ${pounceBtn}
      <button class="btn" id="nextBtn">Creep closer →</button>
      <div class="break-timer" aria-hidden="true"><div class="bt-bar"><div class="bt-fill" id="btFill"></div></div><span id="btText">Creeping closer in ${BREAK_SECONDS}s</span></div></div>`;
    $(panel, '#pounceBtn').addEventListener('click', openPounceBox);
    $(panel, '#nextBtn').addEventListener('click', goNext);
    scene.setPose('wiggle');
    runBreakTimer(BREAK_SECONDS);
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
    scene.setPose('wiggle');
    pounceDlg.innerHTML = `
      <div class="dlg-box pounce-box" id="pbBox">
        <h2 id="pdTitle">Name the connect</h2>
        <p class="pb-sub">A ${formatMeters(leapMeters(pounceValue(n)))} leap · worth <b>${fmt(pounceValue(n))}</b> · one shot</p>
        <div class="q-meta"><span class="q-num">TIME TO LEAP</span><span class="timer-num" id="ptnum" aria-hidden="true">${POUNCE_SECONDS.toFixed(1)}</span></div>
        ${strand('pstrand')}
        <form class="answer-form" id="pform" autocomplete="off">
          <input id="pans" type="text" enterkeyhint="go" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Name the connect" placeholder="name the connect">
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
    scene.setPose(basePose());
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
      $(pounceDlg, '#pmsg').textContent = 'Close! Be more specific.';
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
    panel.style.visibility = 'hidden'; // no stale buttons behind the leap
    closePounceDlg();
    updateScore();
    updateHud();
    if (correct) await celebrate(value);
    else await tumble(n, reason);
  }

  async function celebrate(value) {
    const t = titleFor(p);
    sfx.mrrp();
    await scene.leapSuccess(puzzle.connect.answer);
    const lr = scene.lurkerRect();
    sparkBurst(lr.left + lr.width / 2, lr.top + lr.height / 3, { count: 40, spread: 170 });
    scene.setPose('crouch');
    updateHud();
    await wait(reducedMotion() ? 100 : 700);
    if (destroyed) return;
    revealDlg.innerHTML = `
      <div class="dlg-box reveal-box">
        <div class="pb-cat">${catSVG(t.pose, 4)}</div>
        <p class="reveal-title">PURRFECT!</p>
        <p class="big-pts" id="rvTitle">+${fmt(value)}</p>
        <p class="rv-connect">Leapt ${formatMeters(leapMeters(value))} · ${escapeHTML(puzzle.connect.answer)}</p>
        <p class="title-earned">${escapeHTML(t.title)}!</p>
        <button class="btn btn-amber" id="rvCont">${p.phase === 'done' ? 'SEE RESULTS ▸' : 'Creep on →'}</button>
      </div>`;
    revealDlg.showModal();
    $(revealDlg, '#rvCont').addEventListener('click', () => { revealDlg.close(); afterPounce(true); });
    announce(`Purrfect. Leapt ${formatMeters(leapMeters(value))}. Plus ${value} points. ${t.title}.`);
  }

  async function tumble(n, reason) {
    sfx.clatter();
    await scene.leapFail();
    if (destroyed) return;
    const t = titleFor(p);
    revealDlg.innerHTML = `
      <div class="dlg-box reveal-box">
        <div class="pb-cat">${catSVG(t.pose, 4)}</div>
        <p class="reveal-title">CLATTER!</p>
        <h2 id="rvTitle">${escapeHTML(t.title)}</h2>
        <p class="pb-msg">${reason === 'timeout' ? 'Out of time. ' : ''}Fell short at ${formatMeters(gapMeters(n))}. The connect stays hidden.</p>
        <button class="btn btn-amber" id="rvCont">${p.phase === 'done' ? 'SEE RESULTS ▸' : 'Climb out →'}</button>
      </div>`;
    revealDlg.showModal();
    $(revealDlg, '#rvCont').addEventListener('click', () => { revealDlg.close(); scene.resetCat(); scene.setFallen(); afterPounce(false); });
    announce(`Bin diver. Fell short at ${formatMeters(gapMeters(n))}. The connect stays hidden.`);
  }

  function afterPounce(wasCorrect) {
    if (destroyed) return;
    if (p.phase === 'done') { onResults(); return; }
    if (wasCorrect) { showHeadsUp(); return; }
    showQuestion();
  }

  /** One-line note after a correct pounce, before the next clue. */
  function showHeadsUp() {
    panel.style.visibility = '';
    panel.innerHTML = `<div class="break"><p class="heads-up">${HEADS_UP}</p><button class="btn btn-amber" id="huBtn">GOT IT ▸</button></div>`;
    const go = () => { clearTimeout(skipTimer); if (!destroyed && p.phase === 'break') showQuestion(); };
    $(panel, '#huBtn').addEventListener('click', go);
    skipTimer = setTimeout(go, 3200);
  }

  /* --------------------------------------------------------------- top bar UI */
  $(root, '#soundBtn').addEventListener('click', () => { setSound(!isSoundOn()); updateHud(); });
  $(root, '#homeBtn').addEventListener('click', () => { destroy(); onHome(); });

  /* ------------------------------------------------------------------- start */
  if (p.phase === 'intro' || p.phase === 'question') showQuestion();
  else { scene.setPose(basePose()); showBreak(); }

  function destroy() {
    destroyed = true;
    stopTimer();
    clearTimeout(skipTimer);
    if (p.phase === 'question' || p.phase === 'pounce') { p = applyReload(p); save(); }
    document.querySelectorAll('.fx-layer, .float-points').forEach((n) => n.remove());
  }

  return { destroy };
}
