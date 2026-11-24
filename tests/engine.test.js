import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as E from '../js/engine.js';

const data = JSON.parse(readFileSync(new URL('../data/puzzles.json', import.meta.url)));

/* helper: play a puzzle through the state machine */
function play(steps) {
  let p = E.startQuestion(E.newProgress(1));
  steps.forEach((s, i) => {
    p = E.resolveQuestion(p, s.q);
    if (s.pounce) {
      p = E.openPounce(p);
      p = E.resolvePounce(p, s.pounce);
    }
    if (i < steps.length - 1) p = E.nextClue(p);
  });
  return p;
}

const worked = () =>
  play([
    { q: { status: 'correct', time: 3.2 } },
    { q: { status: 'correct', time: 6.0 }, pounce: { correct: true } },
    { q: { status: 'correct', time: 1.8 } },
    { q: { status: 'missed' } },
    { q: { status: 'correct', time: 2.4 } }
  ]);

test('speed points follow round(1000 * (1 - t/40))', () => {
  assert.equal(E.speedPoints(1.1), 973);
  assert.equal(E.speedPoints(1.2), 970);
  assert.equal(E.speedPoints(20.0), 500);
  assert.equal(E.speedPoints(0), 1000);
  assert.equal(E.speedPoints(3.2), 920);
});

test('pounce values', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(E.pounceValue), [5000, 4000, 3000, 2000, 1000]);
  assert.equal(E.pounceValue(0), 0);
  assert.equal(E.pounceValue(6), 0);
});

test('worked example totals 7,665', () => {
  const p = worked();
  assert.deepEqual(p.results.map((r) => r.points), [920, 850, 955, 0, 940]);
  assert.deepEqual(E.totals(p), { speed: 3665, pounce: 4000, total: 7665 });
  assert.equal(p.phase, 'done');
});

const scored = (score, status = 'correct') => ({ results: [{ points: score }], pounce: { status, points: 0, afterQ: 1, guess: status === 'wrong' ? 'x' : null } });

test('titles come from the score bands', () => {
  const at = (n) => E.bandForScore(n, true).title;
  assert.equal(at(10000), 'Psychic cat'); assert.equal(at(8500), 'Psychic cat');
  assert.equal(at(8499), 'Alley genius'); assert.equal(at(7000), 'Alley genius');
  assert.equal(at(6999), 'Curious cat'); assert.equal(at(6000), 'Curious cat');
  assert.equal(at(5999), 'Sleepy kitten'); assert.equal(at(5000), 'Sleepy kitten');
  assert.equal(at(4999), 'Stray cat'); assert.equal(at(2000), 'Stray cat');
  assert.equal(at(1999), 'Lost kitten'); assert.equal(at(0), 'Lost kitten');
  assert.equal(E.titleFor(worked()).title, 'Alley genius'); // 7,665
});

test('catch rule: no catch caps the title at Stray cat', () => {
  assert.equal(E.bandForScore(5000, false).title, 'Stray cat');
  assert.equal(E.bandForScore(5000, true).title, 'Sleepy kitten');
  assert.equal(E.bandForScore(9000, false).title, 'Stray cat');
  assert.equal(E.bandForScore(1500, false).title, 'Lost kitten'); // the cap never raises a title
  for (const st of ['wrong', 'none']) assert.equal(E.titleFor(scored(5000, st)).title, 'Stray cat');
  assert.equal(E.titleFor(scored(5000, 'correct')).title, 'Sleepy kitten');
});

test('bands tile 0..10000 with no gaps', () => {
  for (let n = 0; n <= 10000; n += 1) assert.ok(E.bandForScore(n, true).min <= n && n <= E.bandForScore(n, true).max);
});

test('normalize', () => {
  assert.equal(E.normalize('  The  Café!! '), 'cafe');
  assert.equal(E.normalize('R.V.'), 'rv');
  assert.equal(E.normalize('Schrödinger'), 'schrodinger');
  assert.equal(E.normalize('the'), 'the');
});

test('isMatch: exact, alias, near-miss beats typo, typo rules', () => {
  const heis = ['heisenberg', 'werner heisenberg'];
  assert.ok(E.isMatch('Heisenberg', 'Werner Heisenberg', heis, []));
  assert.ok(E.isMatch('heisenburg', 'Werner Heisenberg', heis, [])); // typo, 6+ chars
  assert.ok(!E.isMatch('hybrd', 'Hybrid', ['hybrid'], [])); // 0.83 < 0.85
  assert.ok(E.isMatch('hybrids', 'Hybrid', ['hybrid'], []));
  assert.ok(!E.isMatch('polla', 'Pollo', ['pollo'], ['polla'])); // short target: no typo tolerance
  assert.ok(!E.isMatch('pola', 'Pollo', ['pollo'], [])); // under 6 chars
  assert.ok(!E.isMatch('Aluminum', 'Aluminium', ['aluminium'], ['aluminum'])); // near-miss wins
  assert.ok(!E.isMatch('', 'Iron', ['iron'], []));
  assert.ok(E.isMatch('the Oppenheimer', 'Oppenheimer', [], []));
});

test('judgePounce: close is once only', () => {
  const c = data.puzzles[0].connect;
  assert.equal(E.judgePounce(c, 'breaking bad'), 'correct');
  assert.equal(E.judgePounce(c, 'Breaking Bd'), 'correct');
  assert.equal(E.judgePounce(c, 'Heisenberg'), 'close');
  assert.equal(E.judgePounce(c, 'Heisenberg', true), 'wrong');
  assert.equal(E.judgePounce(c, 'toy story'), 'wrong');
});

test('puzzle data: every answer matches itself and no near-miss does', () => {
  assert.equal(data.puzzles.length, 3);
  for (const pz of data.puzzles) {
    assert.equal(pz.clues.length, 5);
    assert.ok(E.isMatch(pz.connect.answer, pz.connect.answer, pz.connect.aliases));
    for (const cl of pz.clues) {
      assert.ok(E.answerGuess(cl, cl.answer), cl.answer);
      for (const nm of cl.near_misses) assert.ok(!E.answerGuess(cl, nm), `${cl.answer} / ${nm}`);
    }
  }
});

test('state machine: pounce rules', () => {
  let p = E.startQuestion(E.newProgress(2));
  assert.equal(E.openPounce(p), p); // can't pounce mid-question
  p = E.resolveQuestion(p, { status: 'correct', time: 4 });
  assert.equal(p.phase, 'break');
  p = E.openPounce(p);
  assert.equal(p.phase, 'pounce');
  p = E.cancelPounce(p);
  assert.equal(p.phase, 'break');
  p = E.resolvePounce(E.openPounce(p), { correct: true });
  assert.equal(p.pounce.points, 5000);
  assert.equal(E.canPounce(p), false); // one pounce only
  assert.equal(E.openPounce(p), p);
});

test('state machine: final break and last-chance pounce', () => {
  let p = play(Array.from({ length: 5 }, () => ({ q: { status: 'correct', time: 1 } })));
  assert.equal(p.phase, 'final');
  p = E.resolvePounce(E.openPounce(p), { correct: true });
  assert.equal(p.pounce.points, 1000);
  assert.equal(p.phase, 'done');
});

test('refresh rule: running question = timed out, open pounce = wrong', () => {
  let p = E.startQuestion(E.newProgress(1));
  p = E.applyReload(p);
  assert.equal(p.results.length, 1);
  assert.equal(p.results[0].status, 'missed');
  assert.equal(p.results[0].points, 0);
  assert.equal(p.phase, 'break');
  p = E.openPounce(p);
  p = E.applyReload(p);
  assert.equal(p.pounce.status, 'wrong');
  assert.equal(p.phase, 'break');
  assert.equal(E.applyReload(p), p);
});

test('leap distance and gap', () => {
  assert.deepEqual([5000, 4000, 3000, 2000, 1000].map((v) => E.leapMeters(v)), [5, 4, 3, 2, 1]);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(E.gapMeters), [6, 5, 4, 3, 2, 1]);
  assert.equal(E.formatMeters(4), '4.0m');
  // the gap equals the leap available in the break after that many clues
  for (let n = 1; n <= 5; n++) assert.equal(E.gapMeters(n), E.leapMeters(E.pounceValue(n)));
});

test('pounce break is skipped once the pounce is spent', () => {
  let p = E.startQuestion(E.newProgress(1));
  p = E.resolveQuestion(p, { status: 'correct', time: 2 });
  assert.equal(E.skipsBreak(p), false); // pounce still available: show the break
  p = E.resolvePounce(E.openPounce(p), { correct: false });
  assert.equal(E.skipsBreak(p), true); // wrong pounce also skips later breaks
  p = E.resolveQuestion(E.nextClue(p), { status: 'correct', time: 2 });
  assert.equal(E.skipsBreak(p), true);
  assert.equal(E.canPounce(p), false);
  assert.equal(E.nextClue(p).phase, 'question'); // auto-advance works from that state
  // after clue 5 with the pounce spent there is no final break either
  for (let i = 0; i < 3; i++) p = E.resolveQuestion(E.nextClue(p), { status: 'missed' });
  assert.equal(p.results.length, 5);
  assert.equal(p.phase, 'done');
  assert.equal(E.skipsBreak(p), false);
});

/* ---------------------------------------------- the night thief: chase state and gap */

test('gapForState: 5.0 through clue 1, then closes 1.0m per clue, never below 1.0', () => {
  let p = E.startQuestion(E.newProgress(1));
  assert.equal(E.gapForState(p), 5); // before / during clue 1
  const seen = [];
  for (let i = 0; i < 5; i++) {
    p = E.resolveQuestion(p, { status: 'correct', time: 3 });
    seen.push(E.gapForState(p));
    if (i < 4) p = E.nextClue(p);
  }
  // after clues 1..5 (the pounce break after clue n is worth (6-n)*1000, i.e. a (6-n)m leap)
  assert.deepEqual(seen, [5, 4, 3, 2, 1]);
  for (let n = 1; n <= 5; n++) assert.equal(seen[n - 1], E.leapMeters(E.pounceValue(n)));
  assert.equal(E.gapForState(E.skipFinal(p)), null);
});

test('chaseState after a correct pounce, a wrong pounce, a pounce timeout and never pouncing', () => {
  const base = () => E.resolveQuestion(E.startQuestion(E.newProgress(1)), { status: 'correct', time: 3 });
  assert.equal(E.chaseState(E.newProgress(1)), 'chasing');
  assert.equal(E.chaseState(base()), 'chasing');
  const caught = E.resolvePounce(E.openPounce(base()), { correct: true });
  assert.equal(E.chaseState(caught), 'caught');
  assert.equal(E.gapForState(caught), null);
  const wrong = E.resolvePounce(E.openPounce(base()), { correct: false, guess: 'toy story' });
  assert.equal(E.chaseState(wrong), 'on_foot');
  assert.equal(E.gapForState(wrong), null);
  // a timeout is a wrong pounce (the stored format is the same)
  const timedOut = E.applyReload(E.openPounce(base()));
  assert.equal(E.chaseState(timedOut), 'on_foot');
  // never pounced: still chasing until the night is over, then the thief got away
  let p = play(Array.from({ length: 5 }, () => ({ q: { status: 'correct', time: 5 } })));
  assert.equal(E.chaseState(p), 'chasing');
  assert.equal(E.chaseState(E.skipFinal(p)), 'got_away');
  assert.equal(E.gapForState(E.skipFinal(p)), null);
  // stays on foot / caught through the end of the night
  const onFootDone = play(Array.from({ length: 5 }, (_, i) => ({ q: { status: 'correct', time: 5 }, pounce: i === 1 ? { correct: false } : undefined })));
  assert.equal(E.chaseState(onFootDone), 'on_foot');
});


const trailCase = (steps, pounce) => { let p = play(steps); return p; };
const nCorrect = (n, k, correct) => play(Array.from({ length: n }, (_, i) => ({ q: { status: 'correct', time: 5 }, pounce: i + 1 === k ? { correct, guess: correct ? 'x' : 'y' } : undefined })));

test('trail line: all ten cases', () => {
  const caught = (k) => E.trailLine(nCorrect(5, k, true));
  const wrong = (k) => E.trailLine(nCorrect(5, k, false));
  assert.equal(caught(1), '🐈‍⬛⬛⬛⬛⬛🥷');
  assert.equal(caught(2), '🐾🐈‍⬛⬛⬛⬛🥷');
  assert.equal(caught(3), '🐾🐾🐈‍⬛⬛⬛🥷');
  assert.equal(caught(4), '🐾🐾🐾🐈‍⬛⬛🥷');
  assert.equal(caught(5), '🐾🐾🐾🐾🐈‍⬛🥷');
  assert.equal(wrong(1), '🗑️⬛⬛⬛⬛💨');
  assert.equal(wrong(3), '🐾🐾🗑️⬛⬛💨');
  assert.equal(wrong(5), '🐾🐾🐾🐾🗑️💨');
  const timeout = play([{ q: { status: 'correct', time: 5 } }, { q: { status: 'correct', time: 5 }, pounce: { correct: false, guess: null } }, ...Array.from({ length: 3 }, () => ({ q: { status: 'correct', time: 5 } }))]);
  assert.equal(E.trailLine(timeout), '🐾🗑️⬛⬛⬛💨');
  const never = E.skipFinal(play(Array.from({ length: 5 }, () => ({ q: { status: 'correct', time: 5 } }))));
  assert.equal(E.trailLine(never), '🐾🐾🐾🐾🐾💨');
});

test('share text: five lines', () => {
  const p = play([
    { q: { status: 'correct', time: 3.2 } }, { q: { status: 'correct', time: 6 }, pounce: { correct: true } },
    { q: { status: 'correct', time: 1.8 } }, { q: { status: 'missed' } }, { q: { status: 'correct', time: 2.4 } }
  ]);
  assert.equal(E.shareText(p), ['Pounce #1 🐈‍⬛', '7,665/10,000 · Alley genius', '🐾🐈‍⬛⬛⬛⬛🥷', '✅✅✅❌✅', 'ny-sidequest.github.io/pounce'].join('\n'));
  assert.equal(E.shareText(p, 'example.com/p').split('\n')[4], 'example.com/p');
  assert.ok(!E.shareText(p).includes('🥷🏻') && !/[\u{1F3FB}-\u{1F3FF}]/u.test(E.shareText(p)));
});

test('event lines', () => {
  const p = nCorrect(5, 2, true);
  assert.equal(E.eventLine(p), 'Caught the thief · Speed 4,375 + Pounce 4,000');
  const wrong = nCorrect(5, 2, false);
  assert.equal(E.eventLine(wrong), 'Named the wrong thief · Speed 4,375');
  const timeout = { results: [{ points: 100 }], pounce: { status: 'wrong', guess: null, points: 0 } };
  assert.equal(E.eventLine(timeout), 'Froze mid-pounce · Speed 100');
  const never = { results: [{ points: 100 }], pounce: { status: 'none' } };
  assert.equal(E.eventLine(never), 'Never pounced · Speed 100');
});
