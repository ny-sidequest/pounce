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

/** The six cat ranks, best first. A title comes only from the final score (and the catch rule below). */
export const BANDS = [
  { key: 'psychic', title: 'Psychic cat', min: 8500, max: 10000, pose: 'psychic', line: 'Knew who it was before the moon was up.' },
  { key: 'genius', title: 'Alley genius', min: 7000, max: 8499, pose: 'cool', line: 'Quick paws, bold leap. The rooftops are yours tonight.' },
  { key: 'curious', title: 'Curious cat', min: 6000, max: 6999, pose: 'tilt', line: 'Sniffed out the trail and kept your nerve.' },
  { key: 'sleepy', title: 'Sleepy kitten', min: 5000, max: 5999, pose: 'sleepy', line: 'Got there in the end. Mostly awake.' },
  { key: 'stray', title: 'Stray cat', min: 2000, max: 4999, pose: 'bin', line: 'Wandered the rooftops and picked up a few clues. The thief can wait.' },
  { key: 'lost', title: 'Lost kitten', min: 0, max: 1999, pose: 'scaredy', line: 'The night got the better of you. Tomorrow you leap.' }
];
const STRAY = BANDS.findIndex((b) => b.key === 'stray');

/**
 * Band for a score. Catch rule: a cat that did not catch the thief (wrong pounce, timeout or never pounced)
 * is capped at Stray cat, whatever the score. Speed alone tops out at 5,000, which would otherwise reach Sleepy kitten.
 */
export function bandForScore(score, caught) {
  const i = BANDS.findIndex((b) => score >= b.min);
  const idx = Math.max(0, i < 0 ? BANDS.length - 1 : i);
  return BANDS[!caught && idx < STRAY ? STRAY : idx];
}

export function titleFor(progress) {
  const caught = progress.pounce.status === 'correct';
  return { ...bandForScore(totals(progress).total, caught) };
}

/** 'caught' | 'wrong' | 'timeout' | 'never'. A pounce box that ran out (or was cut by a reload) has no guess. */
export function outcomeFor(progress) {
  const p = progress.pounce;
  if (p.status === 'correct') return 'caught';
  if (p.status === 'wrong') return p.guess ? 'wrong' : 'timeout';
  return 'never';
}

/** The line under the score saying what happened. */
export function eventLine(progress) {
  const o = outcomeFor(progress);
  if (o === 'caught') { const t = totals(progress); return `Caught the thief · Speed ${formatNumber(t.speed)} + Pounce ${formatNumber(t.pounce)}`; }
  return o === 'wrong' ? 'Pounced on the wrong cat' : o === 'timeout' ? 'The thief slipped away' : 'Never leapt';
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

/** Leap distance in metres is display only: pounce value / 1000. */
export const leapMeters = (value) => value / 1000;

/** Gap to the connect, shown in metres. Always equals the leap you could make right now (6.0 before clue 1). */
export const gapMeters = (resolved) => Math.max(1, 6 - resolved);

export const formatMeters = (m) => m.toFixed(1) + 'm';

/* ------------------------------------------------------------ the chase (derived) */

/**
 * Where the story is, derived from the stored state (the saved format is unchanged):
 * 'chasing' (no pounce yet), 'caught' (correct pounce), 'on_foot' (wrong pounce or timeout),
 * 'got_away' (never pounced and the night is over).
 */
export function chaseState(progress) {
  const st = progress.pounce.status;
  if (st === 'correct') return 'caught';
  if (st === 'wrong') return 'on_foot';
  return progress.phase === 'done' ? 'got_away' : 'chasing';
}

/**
 * Metres between the cat and the thief: 5.0 before and during clue 1, then 5.0 - (resolved - 1),
 * never below 1.0. null once the chase is over (caught, on foot, got away).
 * It always equals the leap the pounce available right now is worth.
 */
export function gapForState(progress) {
  if (chaseState(progress) !== 'chasing') return null;
  const resolved = progress.results.length;
  return Math.max(1, 5 - Math.max(0, resolved - 1));
}

/** Third line of the share card. */
export function leapLine(progress) {
  const { total } = totals(progress);
  const pz = progress.pounce;
  const head =
    pz.status === 'correct' ? `Caught the thief from ${formatMeters(leapMeters(pz.points))}` :
    pz.status === 'wrong' ? 'The thief got away' : 'Never leapt';
  return `${head} · ${formatNumber(total)}`;
}

/** opts.betterThanPct adds the "Better than X% of cats" line (omitted while stats are unknown). */
export function shareText(progress, opts = {}) {
  const { domain = 'pounce.io', betterThanPct = null } = typeof opts === 'string' ? { domain: opts } : opts;
  return [
    `Pounce · Night #${progress.puzzleId} · ${titleFor(progress).title}`,
    shareLine(progress),
    leapLine(progress),
    ...(betterThanPct == null ? [] : [`Better than ${betterThanPct}% of cats`]),
    `Who's under the mask? → ${domain}`
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

export function resolveQuestion(p, { status, guess = null, time = null, reason = null, tries = null, guesses = null }) {
  if (p.phase !== 'question') return p;
  const n = clone(p);
  const correct = status === 'correct';
  n.results.push({
    status: correct ? 'correct' : 'missed',
    guess,
    time,
    points: correct ? speedPoints(time) : 0,
    reason,
    ...(tries !== null ? { tries } : {}),
    ...(guesses ? { guesses } : {})
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

/** Once the pounce is spent there is no pounce break: show the result briefly and go straight on. */
export const skipsBreak = (p) => p.phase === 'break' && p.pounce.status !== 'none';

export const isComplete = (p) => p.phase === 'done';
export const hasStarted = (p) => p.phase !== 'intro';
