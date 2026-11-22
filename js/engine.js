// Pounce game engine: pure functions only, no DOM access, so everything here is testable.
//
// NOTE: This is a prototype. Answers live in the client-side JSON and are checked in the
// browser. In production, answer checking, timing and scoring must happen on a server
// (the client would only send guesses and receive verdicts) so they can't be read or faked.

export const QUESTIONS_PER_PUZZLE = 5;
export const QUESTION_SECONDS = 20;
export const BREAK_SECONDS = 10;
export const POUNCE_SECONDS = 30;
export const MAX_ATTEMPTS = 3;
export const FAST_SECONDS = 3.0;
export const MAX_SCORE = 10000;

/* ---------------------------------------------------------------- matching */

/** Lower-case, strip accents and punctuation, collapse spaces, drop a leading "the ". */
export function normalize(input) {
  return String(input ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^the /, '');
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

export function similarity(a, b) {
  const max = Math.max(a.length, b.length);
  return max === 0 ? 1 : 1 - levenshtein(a, b) / max;
}

/**
 * 1. normalise  2. near-miss => reject (beats typo tolerance)
 * 3. exact answer/alias => accept  4. typo tolerance only for targets of 6+ chars (>= 0.85)
 */
export function isMatch(guess, answer, aliases = [], nearMisses = []) {
  const g = normalize(guess);
  if (!g) return false;
  if (nearMisses.some((n) => normalize(n) === g)) return false;
  const targets = [answer, ...aliases].map(normalize).filter(Boolean);
  if (targets.includes(g)) return true;
  return targets.some((t) => t.length >= 6 && similarity(g, t) >= 0.85);
}

export function answerGuess(clue, guess) {
  return isMatch(guess, clue.answer, clue.aliases, clue.near_misses);
}

/** Pounce guess verdict: 'correct' | 'close' (once per puzzle, doesn't use the attempt) | 'wrong'. */
export function judgePounce(connect, guess, closeUsed = false) {
  if (isMatch(guess, connect.answer, connect.aliases)) return 'correct';
  const g = normalize(guess);
  if (!closeUsed && (connect.close_but_no || []).some((c) => normalize(c) === g)) return 'close';
  return 'wrong';
}

/* ----------------------------------------------------------------- scoring */

/** round(1000 * (1 - t/40)) with t at 0.1s precision. Integer maths avoids float drift at .5. */
export function speedPoints(seconds) {
  const tenths = Math.round(Math.max(0, seconds) * 10);
  return Math.max(0, Math.round(1000 - tenths * 2.5));
}

/** Value of a pounce made in the break after question n (1..5). */
export function pounceValue(questionsShown) {
  return questionsShown >= 1 && questionsShown <= 5 ? (6 - questionsShown) * 1000 : 0;
}

export function totals(progress) {
  const speed = progress.results.reduce((s, r) => s + r.points, 0);
  const pounce = progress.pounce.points;
  return { speed, pounce, total: speed + pounce };
}

/* ------------------------------------------------------------------ titles */

const CORRECT_TITLES = [
  { title: 'Psychic cat', pose: 'psychic' },
  { title: 'Alley genius', pose: 'genius' },
  { title: 'Curious cat', pose: 'curious' },
  { title: 'Sleepy kitten', pose: 'sleepy' },
  { title: 'Cardboard box', pose: 'box' }
];

export function titleFor(progress) {
  const p = progress.pounce;
  if (p.status === 'correct') return { ...CORRECT_TITLES[p.afterQ - 1] };
  if (p.status === 'wrong') return { title: 'Hairball', pose: 'hairball' };
  return { title: 'Scaredy cat', pose: 'scaredy' };
}

/* ------------------------------------------------------------- share card */

export function formatNumber(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function resultSymbol(r) {
  if (r.status !== 'correct') return '❌';
  return r.time !== null && r.time < FAST_SECONDS ? '⚡' : '✅';
}

export function shareLine(progress) {
  let line = '';
  progress.results.forEach((r, i) => {
    line += resultSymbol(r);
    if (progress.pounce.status !== 'none' && progress.pounce.afterQ === i + 1) {
      line += '🐾' + (progress.pounce.status === 'correct' ? '✅' : '❌');
    }
  });
  return line;
}

export function shareText(progress, domain = 'pounce.io') {
  const { total } = totals(progress);
  return [
    `Pounce #${progress.puzzleId} · ${titleFor(progress).title}`,
    shareLine(progress),
    `${formatNumber(total)} / ${formatNumber(MAX_SCORE)}`,
    domain
  ].join('\n');
}

/* ----------------------------------------------------------- state machine
 * phase: intro -> question -> break -> question ... -> final -> done
 *        break|final -> pounce -> break|done
 * All transitions return a new progress object and ignore calls made in the wrong phase.
 */

export function newProgress(puzzleId) {
  return {
    v: 1,
    puzzleId,
    phase: 'intro',
    results: [],
    pounce: { status: 'none', afterQ: null, points: 0, guess: null, closeUsed: false }
  };
}

const clone = (p) => JSON.parse(JSON.stringify(p));

export function startQuestion(p) {
  if (p.phase !== 'intro') return p;
  const n = clone(p);
  n.phase = 'question';
  return n;
}

export function resolveQuestion(p, { status, guess = null, time = null, reason = null }) {
  if (p.phase !== 'question') return p;
  const n = clone(p);
  const correct = status === 'correct';
  n.results.push({
    status: correct ? 'correct' : 'missed',
    guess,
    time,
    points: correct ? speedPoints(time) : 0,
    reason
  });
  if (n.results.length < QUESTIONS_PER_PUZZLE) n.phase = 'break';
  else n.phase = n.pounce.status === 'none' ? 'final' : 'done';
  return n;
}

export function nextClue(p) {
  if (p.phase !== 'break' || p.results.length >= QUESTIONS_PER_PUZZLE) return p;
  const n = clone(p);
  n.phase = 'question';
  return n;
}

export function canPounce(p) {
  return (p.phase === 'break' || p.phase === 'final') && p.pounce.status === 'none';
}

export function openPounce(p) {
  if (!canPounce(p)) return p;
  const n = clone(p);
  n.phase = 'pounce';
  return n;
}

export function cancelPounce(p) {
  if (p.phase !== 'pounce') return p;
  const n = clone(p);
  n.phase = n.results.length >= QUESTIONS_PER_PUZZLE ? 'final' : 'break';
  return n;
}

export function noteClose(p) {
  const n = clone(p);
  n.pounce.closeUsed = true;
  return n;
}

export function resolvePounce(p, { correct, guess = null }) {
  if (p.phase !== 'pounce') return p;
  const n = clone(p);
  const shown = n.results.length;
  n.pounce = {
    ...n.pounce,
    status: correct ? 'correct' : 'wrong',
    afterQ: shown,
    points: correct ? pounceValue(shown) : 0,
    guess
  };
  n.phase = shown >= QUESTIONS_PER_PUZZLE ? 'done' : 'break';
  return n;
}

export function skipFinal(p) {
  if (p.phase !== 'final') return p;
  const n = clone(p);
  n.phase = 'done';
  return n;
}

/** Refresh rule: a running question counts as timed out, an open pounce box as a wrong pounce. */
export function applyReload(p) {
  if (p.phase === 'question') return resolveQuestion(p, { status: 'missed', reason: 'reload' });
  if (p.phase === 'pounce') return resolvePounce(p, { correct: false, guess: null });
  return p;
}

export const isComplete = (p) => p.phase === 'done';
export const hasStarted = (p) => p.phase !== 'intro';
