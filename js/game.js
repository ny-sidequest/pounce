// Night screen controller: one night's chase, from the first clue to the end of the night.
// Story: the cat creeps across the rooftops after a masked thief. Clues bring it closer; pouncing is the leap.
import {
  QUESTION_SECONDS, BREAK_SECONDS, POUNCE_SECONDS, MAX_ATTEMPTS, QUESTIONS_PER_PUZZLE,
  answerGuess, judgePounce, pounceValue, totals, titleFor, formatNumber as fmt,
  leapMeters, formatMeters, skipsBreak, chaseState, gapForState,
  startQuestion, resolveQuestion, nextClue, canPounce, openPounce, cancelPounce, noteClose,
  resolvePounce, skipFinal, applyReload
} from './engine.js';
import { createScene, escapeHTML } from './scene.js';
import { rainHTML } from './pixel.js';
import { sparkBurst, floatPoints, reducedMotion, toast } from './fx.js';
import { sfx, isSoundOn, setSound } from './audio.js';
import { saveProgress } from './store.js';

const $ = (root, sel) => root.querySelector(sel);
const HEADS_UP = 'Heads up: the remaining clues are general knowledge, not about the thief.';
const m1 = (g) => `${g.toFixed(1)} m`;

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
      <button class="icon-btn" id="homeBtn" aria-label="Back to home">‹</button>
      <h1 class="pz-name">NIGHT #${puzzle.id}</h1>
      <button class="icon-btn" id="soundBtn"></button>
    </div>
    <header class="hud">
      <div class="hud-box hud-leap" id="leapBox"><span class="lab" id="leapLab">GAP</span><span class="val" id="leapVal"></span></div>
      <ol class="pips" id="pips" aria-label="Progress"></ol>
      <div class="hud-box hud-score"><span class="lab">SCORE</span><span class="val" id="score">0</span></div>
    </header>
    <div id="sceneHost" style="display:contents"></div>
    <div class="panel" id="panel" aria-live="polite"></div>
    <div class="sr-only" id="live" aria-live="polite"></div>
  </section>
  <dialog class="modal pounce-dlg" id="pounceDlg" aria-labelledby="pdTitle"></dialog>`;

  const panel = $(root, '#panel');
  const live = $(root, '#live');
  const pounceDlg = $(root, '#pounceDlg');
  const scene = createScene($(root, '#sceneHost'));

  const save = () => saveProgress(p);
  const announce = (t) => { live.textContent = ''; setTimeout(() => (live.textContent = t), 30); };
  const stopTimer = () => { if (timer) { timer.stop(); timer = null; } };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const chase = () => chaseState(p);
  const correctCount = () => p.results.filter((r) => r.status === 'correct').length;
  /** how many clues the cat has resolved since it fell, i.e. its steps along the street */
  const footStep = () => Math.max(0, p.results.length - (p.pounce.afterQ ?? 0));

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

  /** The cat's resting pose for the current state. */
  const basePose = () => (chase() === 'caught' ? 'proud' : canPounce(p) && (p.phase === 'break' || p.phase === 'final') ? 'wiggle' : 'crouch');

  /* -------------------------------------------------------- restore the world */
  p.results.forEach((r, i) => scene.lightLamp(i, puzzle.clues[i].answer, r.status !== 'correct', false));
  scene.setLight(correctCount());
  {
    const st = chase();
    if (st === 'caught') scene.showCaught(puzzle.connect.answer);
    else if (st === 'on_foot') scene.showOnFoot(footStep());
    else if (st === 'got_away') { scene.setCatRoof(4); scene.setThief('gone'); }
    else scene.setCatRoof(5 - gapForState(p));
  }
  updateScore(false);
  updateHud();

  /** After a clue resolves, the cat moves: a hop along the roofs, or a step along the street. */
  function moveCat() {
    const st = chase();
    if (st === 'chasing') {
      const idx = 5 - gapForState(p);
      if (idx !== scene.getRoof()) scene.hopTo(idx);
    } else if (st === 'on_foot') scene.walkTo(footStep());
  }

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
    scene.setPose(basePose());
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
    scene.lightLamp(i, clue.answer, missed); // missed: the lamp stays dark, but the answer is shown
    scene.setLight(correctCount());
    moveCat();
    updateScore();
    updateHud();
    if (!missed) {
      sfx.purr();
      const lr = scene.lampRect(i);
      sparkBurst(lr.left + lr.width / 2, lr.top + lr.height / 2, { count: 14, spread: 60 });
      floatPoints(lr, `+${fmt(r.points)}`);
    } else sfx.nope();
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

  /** End of the night: Case closed, or It got away. */
  function showEnd() {
    panel.style.visibility = '';
    stopTimer();
    const caught = chase() === 'caught';
    panel.innerHTML = `<div class="break">${p.results.length ? resultLine() : ''}
      <h2 class="break-title">${caught ? 'Case closed.' : 'It got away... this time.'}</h2>
      <button class="btn btn-amber" id="resultsBtn">SEE RESULTS ▸</button></div>`;
    $(panel, '#resultsBtn').addEventListener('click', () => onResults());
    scene.setPose(basePose());
    updateHud();
  }

  function showBreak() {
    panel.style.visibility = '';
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
      scene.setPose('wiggle');
      return;
    }
    if (skipsBreak(p)) {
      // the pounce is spent: show the result for a moment, then carry on
      panel.innerHTML = `<div class="break">${resultLine()}</div>`;
      skipTimer = setTimeout(() => !destroyed && goNext(), 1200);
      return;
    }
    panel.innerHTML = `<div class="break">${resultLine()}
      <h2 class="break-title">The thief is ${m1(gapForState(p))} away. Leap now, or creep closer?</h2>
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

  /** After clue 5, the player lets the thief go: it slips away and the night ends. */
  async function letItGo() {
    p = skipFinal(p);
    save();
    panel.style.visibility = 'hidden';
    updateHud();
    await scene.runThief();
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
    scene.setPose('wiggle');
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
    panel.style.visibility = 'hidden'; // no stale buttons behind the leap
    closePounceDlg();
    updateScore();
    if (correct) await catchThief(value);
    else await fallShort(n, reason);
  }

  /** Correct pounce: leap, land on the thief, the mask comes off. */
  async function catchThief(value) {
    const t = titleFor(p);
    sfx.mrrp();
    await scene.leapCatch(puzzle.connect.answer);
    if (destroyed) return;
    updateHud();
    const tr = scene.thiefRect();
    sparkBurst(tr.left + tr.width / 2, tr.top + tr.height / 3, { count: 40, spread: 170 });
    floatPoints(tr, `+${fmt(value)}`);
    toast(`Caught from ${formatMeters(leapMeters(value))}! ${t.title}.`);
    announce(`Caught from ${formatMeters(leapMeters(value))}. Plus ${value} points. ${t.title}. The thief was ${puzzle.connect.answer}.`);
    await wait(reducedMotion() ? 300 : 1400);
    if (destroyed) return;
    panel.style.visibility = '';
    if (p.phase === 'done') { showEnd(); return; }
    // one-line note before the next clue
    panel.innerHTML = `<div class="break"><p class="heads-up">${HEADS_UP}</p><button class="btn btn-amber" id="huBtn">GOT IT ▸</button></div>`;
    const go = () => { clearTimeout(skipTimer); if (!destroyed && p.phase === 'break') showQuestion(); };
    $(panel, '#huBtn').addEventListener('click', go);
    skipTimer = setTimeout(go, 3600);
  }

  /** Wrong pounce or timeout: fall short, crash into the bins; the thief escapes. */
  async function fallShort(n, reason) {
    scene.onClatter(() => sfx.clatter());
    await scene.leapFail();
    if (destroyed) return;
    updateHud();
    const prefix = reason === 'timeout' ? 'Out of time. ' : '';
    toast('CLATTER! The thief got away.');
    announce(`CLATTER! ${prefix}You fell short at ${m1(leapMeters(pounceValue(n)))}. The thief got away.`);
    panel.style.visibility = '';
    panel.innerHTML = `<div class="break">
      <h2 class="break-title">CLATTER! The thief got away.</h2>
      <p class="break-sub">${prefix}You fell short at ${m1(leapMeters(pounceValue(n)))}. The mask stays on.</p>
      <button class="btn btn-amber" id="climbBtn">Climb out →</button></div>`;
    $(panel, '#climbBtn').addEventListener('click', async () => {
      panel.style.visibility = 'hidden';
      await scene.walkTo(0, true); // the cat climbs out and follows on foot, down in the street
      if (destroyed) return;
      panel.style.visibility = '';
      if (p.phase === 'done') showEnd();
      else showQuestion();
    });
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
    scene.destroy();
    if (p.phase === 'question' || p.phase === 'pounce') { p = applyReload(p); save(); }
    document.querySelectorAll('.fx-layer, .float-points').forEach((n) => n.remove());
  }

  return { destroy };
}
