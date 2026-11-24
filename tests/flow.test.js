import test from 'node:test';
import assert from 'node:assert/strict';
import { createFlow, canGo, timerRuns, wantsKeyboard, MODES } from '../js/flow.js';

test('the loop question -> story -> decision -> ready -> question is legal', () => {
  const seen = [];
  const f = createFlow((m, prev) => seen.push([prev, m]));
  for (const m of ['question', 'story', 'decision', 'ready', 'question']) f.go(m);
  assert.deepEqual(seen.map((s) => s[1]), ['question', 'story', 'decision', 'ready', 'question']);
});

test('creeping closer goes straight from decision to question; a question never jumps to decision or ready', () => {
  assert.ok(canGo('decision', 'question'));
  assert.ok(!canGo('question', 'decision'));
  assert.ok(!canGo('question', 'ready'));
  assert.ok(!canGo('ready', 'story'));
  assert.throws(() => { const f = createFlow(); f.go('question'); f.go('decision'); });
  assert.throws(() => createFlow().go('nope'));
});

test('the clue timer runs only in question mode, and not while hidden or held by a sequence', () => {
  for (const m of MODES) {
    assert.equal(timerRuns({ mode: m }), m === 'question');
    assert.equal(timerRuns({ mode: m, hidden: true }), false);
    assert.equal(timerRuns({ mode: m, busy: true }), false);
  }
  assert.equal(timerRuns({ mode: 'question', hidden: false, busy: false }), true);
});

test('only question mode wants the keyboard', () => {
  assert.deepEqual(MODES.filter(wantsKeyboard), ['question']);
});
