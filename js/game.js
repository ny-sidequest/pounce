// Game screen controller: one puzzle from first clue to the last pounce.
import {
  QUESTION_SECONDS, BREAK_SECONDS, POUNCE_SECONDS, MAX_ATTEMPTS, QUESTIONS_PER_PUZZLE,
  answerGuess, judgePounce, pounceValue, totals, titleFor, formatNumber as fmt,
  startQuestion, resolveQuestion, nextClue, canPounce, openPounce, cancelPounce, noteClose,
  resolvePounce, skipFinal, applyReload
} from './engine.js';
import { catSVG } from './cat.js';
import { createBoard, escapeHTML } from './board.js';
import { confetti, pawBurst, floatPoints, reducedMotion } from './fx.js';
import { sfx, isSoundOn, setSound } from './audio.js';
import { saveProgress } from './store.js';

const SOUND_ON = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const SOUND_OFF = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16.5 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const HOME_ICON = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M14.5 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const $ = (root, sel) => root.querySelector(sel);

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
  return {
    stop() { stopped = true; cancelAnimationFrame(raf); },
    remaining: () => Math.max(0, (end - performance.now()) / 1000)
  };
}

const strand = (id) =>
  `<div class="strand" id="${id}" style="--p:1" aria-hidden="true"><div class="strand-fill"></div><span class="strand-ball"></span></div>`;
const setStrand = (el, frac, urgent) => {
  el.style.setProperty('--p', Math.max(0, Math.min(1, frac)).toFixed(4));
  el.classList.toggle('urgent', urgent);
};

export function mountGame(root, puzzle, color, initial, { onHome, onResults }) {
  let p = initial;
  let timer = null; // question / break / pounce countdown
  let breakRemaining = BREAK_SECONDS;
  let qStart = 0;
  let attempts = 0;
  let lastGuess = '';
  let pounceOpen = false;
  let destroyed = false;
  let poseTimer = 0;
  let shownScore = totals(p).total;

  root.innerHTML = `
  <section class="screen game" style="--ball:${color}">
    <header class="topbar">
      <button class="icon-btn" id="homeBtn" aria-label="Back to home">${HOME_ICON}</button>
      <h1 class="pz-name">Pounce #${puzzle.id}</h1>
      <div class="score-pill"><span class="sr-only">Score </span><b id="score">0</b></div>
      <button class="icon-btn" id="soundBtn"></button>
    </header>
    <ol class="dots" id="dots"></ol>
    <div class="board" id="board" role="group" aria-label="Clue board"></div>
    <div class="panel" id="panel" aria-live="polite"></div>
    <div class="cat-row">
      <div class="bubble" id="bubble" aria-hidden="true"></div>
      <div class="cat-wrap" id="cat"></div>
    </div>
    <div class="sr-only" id="live" aria-live="polite"></div>
  </section>
  <dialog class="modal pounce-dlg" id="pounceDlg" aria-labelledby="pdTitle"></dialog>
  <dialog class="modal reveal-dlg" id="revealDlg" aria-labelledby="rvTitle"></dialog>`;

  const panel = $(root, '#panel');
  const catEl = $(root, '#cat');
  const bubble = $(root, '#bubble');
  const live = $(root, '#live');
  const pounceDlg = $(root, '#pounceDlg');
  const revealDlg = $(root, '#revealDlg');
  const board = createBoard($(root, '#board'), color);

  /* ----------------------------------------------------------- small helpers */
  const save = () => saveProgress(p);
  const announce = (t) => { live.textContent = ''; setTimeout(() => (live.textContent = t), 30); };
  const stopTimer = () => { if (timer) { timer.stop(); timer = null; } };

  function basePose() {
    if (canPounce(p) && (p.phase === 'break' || p.phase === 'final')) return 'crouch';
    return 'idle';
  }
  function setPose(name, ms = 0) {
    clearTimeout(poseTimer);
    catEl.innerHTML = catSVG(name);
    if (ms) poseTimer = setTimeout(() => !destroyed && setPose(basePose()), ms);
  }
  function say(text, ms = 2200) {
    bubble.textContent = text;
    bubble.classList.toggle('show', !!text);
    if (text) setTimeout(() => bubble.textContent === text && bubble.classList.remove('show'), ms);
  }

  function updateScore(animate = true) {
    const el = $(root, '#score');
    const target = totals(p).total;
    if (!animate || reducedMotion() || target === shownScore) { el.textContent = fmt(target); shownScore = target; return; }
    const from = shownScore;
    const t0 = performance.now();
    shownScore = target;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 600);
      el.textContent = fmt(Math.round(from + (target - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1 && !destroyed) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function updateDots() {
    const n = p.results.length;
    $(root, '#dots').innerHTML = Array.from({ length: QUESTIONS_PER_PUZZLE }, (_, i) => {
      const r = p.results[i];
      const cur = !r && i === n;
      const cls = r ? (r.status === 'correct' ? 'done' : 'miss') : cur ? 'current' : '';
      const label = r ? (r.status === 'correct' ? 'correct' : 'missed') : cur ? 'current' : 'to come';
      return `<li class="dot ${cls}" aria-label="Question ${i + 1}: ${label}"><span aria-hidden="true">${r && r.status !== 'correct' ? '×' : ''}</span></li>`;
    }).join('');
  }

  function updateChrome() {
    const inPlay = p.phase === 'question' || p.phase === 'pounce';
    $(root, '#homeBtn').hidden = inPlay;
    const s = $(root, '#soundBtn');
    const on = isSoundOn();
    s.innerHTML = on ? SOUND_ON : SOUND_OFF;
    s.setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
    s.setAttribute('aria-pressed', String(on));
    updateDots();
  }

  /* ------------------------------------------------------------ restore view */
  p.results.forEach((r, i) => board.fillSlot(i, puzzle.clues[i].answer, { missed: r.status !== 'correct', animate: false }));
  if (p.pounce.status === 'correct') board.setRevealed(puzzle.connect.answer);
  updateScore(false);
  updateChrome();

  /* ---------------------------------------------------------------- question */
  function showQuestion() {
    if (p.phase === 'intro') p = startQuestion(p);
    else p = nextClue(p);
    save();
    attempts = 0;
    const i = p.results.length;
    const clue = puzzle.clues[i];
    updateChrome();
    setPose('idle');
    say('');
    panel.innerHTML = `
      <div class="card qcard" id="qcard">
        <div class="q-meta"><span class="q-num">Clue ${i + 1} of ${QUESTIONS_PER_PUZZLE}</span>
          <span class="timer-num" id="tnum" aria-hidden="true">${QUESTION_SECONDS.toFixed(1)}</span></div>
        ${strand('qstrand')}
        <p class="q-text">${escapeHTML(clue.q)}</p>
        <form class="answer-form" id="aform" autocomplete="off">
          <input id="ans" type="text" enterkeyhint="go" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Your answer" placeholder="Type your answer">
          <button class="btn btn-go" type="submit" id="goBtn">Go</button>
        </form>
        <p class="tries" id="tries" role="status"></p>
      </div>`;
    const input = $(panel, '#ans');
    const form = $(panel, '#aform');
    $(panel, '#goBtn').addEventListener('pointerdown', (e) => e.preventDefault()); // keep the keyboard open
    form.addEventListener('submit', (e) => { e.preventDefault(); submitAnswer(input, clue); });
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
      for (const mark of [10, 5, 3]) if (lastCall > mark && rem <= mark) { announce(`${mark} seconds left`); }
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
    $(panel, '#tries').textContent = `${left} ${left === 1 ? 'try' : 'tries'} left`;
    setPose('tilt', 1200);
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
    board.fillSlot(i, clue.answer, { missed: status !== 'correct' });
    updateScore();
    updateChrome();
    const c = board.slotCenter(i);
    if (status === 'correct') {
      sfx.pop();
      pawBurst(c.x, c.y);
      floatPoints($(root, `.slot[data-i="${i}"] .slot-ball`), `+${fmt(r.points)}`);
      setPose('pleased', 1800);
      say(r.time < 3 ? 'Purrty quick' : 'Nice one');
    } else {
      sfx.nope();
      setPose('tilt', 1800);
      say('Next one');
    }
    announce(status === 'correct' ? `Correct. Plus ${r.points} points.` : `Missed. The answer was ${clue.answer}.`);
    showBreak();
  }

  /* ------------------------------------------------------------------- break */
  function resultLine() {
    const i = p.results.length - 1;
    const r = p.results[i];
    const clue = puzzle.clues[i];
    return r.status === 'correct'
      ? `<div class="result-line ok"><span class="pts-pill">+${fmt(r.points)}</span><span>Correct · ${r.time.toFixed(1)}s</span></div>`
      : `<div class="result-line miss"><span class="pts-pill miss">0</span><span>Missed · it was <b>${escapeHTML(clue.answer)}</b></span></div>`;
  }

  function showBreak() {
    stopTimer();
    const n = p.results.length;
    const pounceBtn = (label) => `<button class="btn btn-pounce" id="pounceBtn"><span>${label}</span><span class="pv">${fmt(pounceValue(n))}</span></button>`;
    if (p.phase === 'done') {
      panel.innerHTML = `<div class="card break">${resultLine()}<h2 class="break-title">That's all five</h2>
        <p class="break-sub">Every clue is in. Time to see how it all links.</p>
        <button class="btn btn-primary" id="resultsBtn">See results</button></div>`;
      $(panel, '#resultsBtn').addEventListener('click', () => onResults());
      return;
    }
    if (p.phase === 'final') {
      panel.innerHTML = `<div class="card break">${resultLine()}<h2 class="break-title">Last chance pounce</h2>
        <p class="break-sub">All five clues are out. One last shot at the connect.</p>
        ${pounceBtn('Pounce ·')}
        <button class="btn btn-ghost" id="skipBtn">Skip to results</button></div>`;
      $(panel, '#pounceBtn').addEventListener('click', openPounceBox);
      $(panel, '#skipBtn').addEventListener('click', () => { p = skipFinal(p); save(); onResults(); });
      setPose('crouch');
      return;
    }
    const can = canPounce(p);
    panel.innerHTML = `<div class="card break">${resultLine()}
      <h2 class="break-title">Paws for thought?</h2>
      <p class="break-sub">${can ? 'Know what links them? The earlier you pounce, the more it is worth.' : 'Your pounce is spent. Keep going to finish the set.'}</p>
      ${can ? pounceBtn('Pounce ·') : ''}
      <button class="btn ${can ? 'btn-ghost' : 'btn-primary'}" id="nextBtn">Next clue →</button>
      <div class="break-timer" aria-hidden="true"><div class="bt-bar"><div class="bt-fill" id="btFill"></div></div><span id="btText">Next clue in ${BREAK_SECONDS}s</span></div></div>`;
    if (can) $(panel, '#pounceBtn').addEventListener('click', openPounceBox);
    $(panel, '#nextBtn').addEventListener('click', goNext);
    setPose(basePose());
    runBreakTimer(BREAK_SECONDS);
  }

  function runBreakTimer(seconds) {
    const fill = $(panel, '#btFill');
    const text = $(panel, '#btText');
    breakRemaining = seconds;
    timer = countdown(seconds, (rem) => {
      breakRemaining = rem;
      if (fill) fill.style.transform = `scaleX(${rem / BREAK_SECONDS})`;
      if (text) text.textContent = `Next clue in ${Math.ceil(rem)}s`;
    }, goNext);
  }

  function goNext() {
    if (destroyed || p.phase !== 'break') return;
    stopTimer();
    showQuestion();
  }

  /* ------------------------------------------------------------------ pounce */
  function openPounceBox() {
    if (!canPounce(p)) return;
    stopTimer();
    const n = p.results.length;
    p = openPounce(p);
    save();
    updateChrome();
    pounceOpen = true;
    setPose('crouch');
    pounceDlg.innerHTML = `
      <div class="pounce-box" id="pbBox">
        <div class="pb-cat">${catSVG('crouch')}</div>
        <h2 id="pdTitle">Name the connect</h2>
        <p class="pb-sub">Worth <b>${fmt(pounceValue(n))}</b> · one shot only</p>
        <div class="q-meta"><span class="q-num">Time to pounce</span><span class="timer-num" id="ptnum" aria-hidden="true">${POUNCE_SECONDS.toFixed(1)}</span></div>
        ${strand('pstrand')}
        <form class="answer-form" id="pform" autocomplete="off">
          <input id="pans" type="text" enterkeyhint="go" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Name the connect" placeholder="Name the connect">
          <button class="btn btn-pounce btn-go" type="submit" id="pgo">Pounce</button>
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
    updateChrome();
    if (p.phase === 'break') runBreakTimer(Math.max(3, Math.min(BREAK_SECONDS, breakRemaining)));
    setPose(basePose());
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

  function finishPounce(correct, guess, reason) {
    if (p.phase !== 'pounce') return;
    stopTimer();
    const value = pounceValue(p.results.length);
    p = resolvePounce(p, { correct, guess });
    save();
    updateScore();
    updateChrome();
    if (correct) {
      closePounceDlg();
      celebrate(value);
    } else {
      sfx.cough();
      const box = $(pounceDlg, '#pbBox');
      box.innerHTML = `
        <div class="pb-cat hairball-stage">${catSVG('hairball')}</div>
        <h2 id="pdTitle">Hairball</h2>
        <p class="pb-msg strong" role="status">${reason === 'timeout' ? 'Out of time. ' : ''}Hairball! The connect stays hidden.</p>
        <p class="pb-sub">No connect points, but you can keep answering.</p>
        <button class="btn btn-primary" id="pCont">${p.phase === 'done' ? 'See results' : 'Next clue →'}</button>`;
      $(pounceDlg, '#pCont').addEventListener('click', () => { closePounceDlg(); afterPounce(); });
      if (!pounceDlg.open) pounceDlg.showModal();
    }
  }

  async function leapToKnot() {
    const from = catEl.getBoundingClientRect();
    const to = board.center();
    setPose('leap');
    catEl.classList.add('airborne');
    if (reducedMotion()) {
      await catEl.animate([{ opacity: 1 }, { opacity: 0 }, { opacity: 1 }], { duration: 400 }).finished.catch(() => {});
      catEl.classList.remove('airborne');
      return null;
    }
    const dx = to.x - (from.left + from.width / 2);
    const dy = to.y - (from.top + from.height / 2) - 6;
    const a = catEl.animate(
      [
        { transform: 'translate(0,0) scale(1,1) rotate(0deg)', offset: 0 },
        { transform: 'translate(0,8px) scale(1.15,.82) rotate(0deg)', offset: 0.16 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 70}px) scale(1.3) rotate(-22deg)`, offset: 0.58 },
        { transform: `translate(${dx}px, ${dy}px) scale(1.15) rotate(6deg)`, offset: 1 }
      ],
      { duration: 950, easing: 'cubic-bezier(.35,.75,.4,1)', fill: 'forwards' }
    );
    await a.finished.catch(() => {});
    return a;
  }

  async function celebrate(value) {
    const t = titleFor(p);
    const leap = await leapToKnot();
    setPose('pleased');
    sfx.meow();
    const c = board.center();
    board.unravel(puzzle.connect.answer);
    await new Promise((r) => setTimeout(r, 520));
    confetti(c.x, c.y);
    await new Promise((r) => setTimeout(r, 900));
    if (leap) {
      const cur = getComputedStyle(catEl).transform;
      leap.cancel();
      await catEl.animate(
        [{ transform: cur }, { transform: 'none' }],
        { duration: 450, easing: 'cubic-bezier(.3,1.3,.5,1)' }
      ).finished.catch(() => {});
    }
    catEl.classList.remove('airborne');
    setPose('pleased', 2000);
    if (destroyed) return;
    revealDlg.innerHTML = `
      <div class="reveal-box">
        <div class="rv-cat">${catSVG(t.pose)}</div>
        <p class="kicker">Purrfect!</p>
        <p class="big-pts" id="rvTitle">+${fmt(value)}</p>
        <p class="title-earned">${escapeHTML(t.title)}!</p>
        <p class="rv-connect">${escapeHTML(puzzle.connect.answer)}</p>
        <button class="btn btn-primary" id="rvCont">${p.phase === 'done' ? 'See results' : 'Next clue →'}</button>
      </div>`;
    revealDlg.showModal();
    $(revealDlg, '#rvCont').addEventListener('click', () => { revealDlg.close(); afterPounce(); });
    revealDlg.addEventListener('cancel', (e) => e.preventDefault());
    announce(`Purrfect. Plus ${value} points. ${t.title}.`);
  }

  function afterPounce() {
    if (destroyed) return;
    if (p.phase === 'done') { onResults(); return; }
    if (p.phase === 'break') { showQuestion(); }
  }

  /* -------------------------------------------------------------- top bar UI */
  $(root, '#soundBtn').addEventListener('click', () => { setSound(!isSoundOn()); updateChrome(); });
  $(root, '#homeBtn').addEventListener('click', () => { destroy(); onHome(); });

  /* ------------------------------------------------------------------- start */
  if (p.phase === 'intro' || p.phase === 'question') {
    showQuestion();
  } else {
    // resumed after a reload: sitting at a break (the reload rule already ran)
    setPose(basePose());
    showBreak();
  }

  function destroy() {
    destroyed = true;
    stopTimer();
    clearTimeout(poseTimer);
    if (p.phase === 'question' || p.phase === 'pounce') { p = applyReload(p); save(); }
    document.querySelectorAll('.fx-layer, .float-points').forEach((n) => n.remove());
  }

  return { destroy };
}
