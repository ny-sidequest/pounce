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

test('titles', () => {
  assert.equal(E.titleFor(worked()).title, 'Alley genius');
  const names = [1, 2, 3, 4, 5].map((n) => {
    const pr = { pounce: { status: 'correct', afterQ: n } };
    return E.titleFor(pr).title;
  });
  assert.deepEqual(names, ['Psychic cat', 'Alley genius', 'Curious cat', 'Sleepy kitten', 'Cardboard box']);
  assert.equal(E.titleFor({ pounce: { status: 'wrong', afterQ: 2 } }).title, 'Hairball');
  assert.equal(E.titleFor({ pounce: { status: 'none' } }).title, 'Scaredy cat');
});

test('share card matches the worked example exactly', () => {
  assert.equal(
    E.shareText(worked()),
    'Pounce #1 · Alley genius\n✅✅🐾✅⚡❌⚡\n7,665 / 10,000\npounce.io'
  );
});

test('share line: wrong pounce, never pounced, fast threshold', () => {
  let p = play([
    { q: { status: 'correct', time: 2.9 }, pounce: { correct: false } },
    { q: { status: 'correct', time: 3.0 } },
    { q: { status: 'missed' } },
    { q: { status: 'missed' } },
    { q: { status: 'missed' } }
  ]);
  assert.equal(E.shareLine(p), '⚡🐾❌✅❌❌❌');
  p = play(Array.from({ length: 5 }, () => ({ q: { status: 'correct', time: 5 } })));
  p = E.skipFinal(p);
  assert.equal(E.shareLine(p), '✅✅✅✅✅');
  assert.match(E.shareText(p), /Scaredy cat/);
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
