import test from 'node:test';
import assert from 'node:assert/strict';
import { PausableTimer, TimerGate } from '../js/timer.js';

function clock() {
  let t = 0;
  return { now: () => t, tick: (ms) => { t += ms; } };
}

test('timer counts only while running', () => {
  const c = clock();
  const tm = new PausableTimer(20, c.now);
  assert.equal(tm.elapsed(), 0);
  tm.start();
  c.tick(3000);
  assert.equal(tm.elapsed(), 3);
  tm.pause();
  c.tick(10000);
  assert.equal(tm.elapsed(), 3);
  tm.resume();
  c.tick(2500);
  assert.equal(tm.elapsed(), 5.5);
  assert.equal(tm.remaining(), 14.5);
});

test('the question timer does not run during a sequence or a card', async () => {
  const c = clock();
  const tm = new PausableTimer(20, c.now);
  const gate = new TimerGate(tm);
  tm.start();
  c.tick(1000);
  // a sequence plays for 3.5 s of wall-clock time
  await gate.during(async () => { assert.equal(gate.busy, true); c.tick(3500); });
  assert.equal(gate.busy, false);
  assert.equal(tm.elapsed(), 1, 'sequence time must not count');
  // a card is shown (nested holds) for 8 s
  gate.hold(); gate.hold();
  c.tick(4000);
  gate.release();
  c.tick(4000); // still held by the outer hold
  assert.equal(tm.elapsed(), 1, 'card time must not count');
  gate.release();
  c.tick(2000);
  assert.equal(tm.elapsed(), 3);
});

test('the timer only starts when started, and expires on time', () => {
  const c = clock();
  const tm = new PausableTimer(20, c.now);
  c.tick(5000); // clue not visible yet
  assert.equal(tm.elapsed(), 0);
  assert.equal(tm.expired(), false);
  tm.start();
  c.tick(20000);
  assert.equal(tm.expired(), true);
});
