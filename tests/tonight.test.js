import test from 'node:test';
import assert from 'node:assert/strict';
import { nightNumber, tonightId, msToRollover, formatCountdown, dateInTz } from '../js/tonight.js';

const cfg = { launchDate: '2026-12-01', rolloverTz: 'UTC' };
const at = (iso) => new Date(iso);

test('tonight number: launch day is night 1, then one per day', () => {
  assert.equal(nightNumber(at('2026-12-01T00:00:00Z'), cfg), 1);
  assert.equal(nightNumber(at('2026-12-01T23:59:59Z'), cfg), 1);
  assert.equal(nightNumber(at('2026-12-02T00:00:00Z'), cfg), 2);
  assert.equal(nightNumber(at('2026-12-04T12:00:00Z'), cfg), 4);
});

test('rollover boundary follows the configured time zone', () => {
  const ny = { ...cfg, rolloverTz: 'America/New_York' };
  assert.equal(nightNumber(at('2026-12-02T04:59:59Z'), ny), 1); // still Dec 1 in New York
  assert.equal(nightNumber(at('2026-12-02T05:00:00Z'), ny), 2);
  assert.equal(dateInTz(at('2026-12-02T04:59:59Z'), 'America/New_York'), '2026-12-01');
});

test('tonight id: exact, before launch, past the last puzzle, devAllNights', () => {
  const ids = [1, 2, 3];
  assert.equal(tonightId(ids, at('2026-12-02T10:00:00Z'), cfg), 2);
  assert.equal(tonightId(ids, at('2026-11-20T10:00:00Z'), cfg), 1);            // before launch: the first puzzle
  assert.equal(tonightId(ids, at('2026-12-10T10:00:00Z'), cfg), 3);            // no puzzle 10: the latest that exists
  assert.equal(tonightId(ids, at('2026-12-01T10:00:00Z'), { ...cfg, devAllNights: true }), 3);
  assert.equal(tonightId([], at('2026-12-01T10:00:00Z'), cfg), null);
});

test('countdown to the rollover', () => {
  assert.equal(msToRollover(at('2026-12-01T23:59:30Z')), 30000);
  assert.equal(msToRollover(at('2026-12-02T00:00:00Z')), 86400000);
  assert.equal(formatCountdown(30000), '00:00:30');
  assert.equal(formatCountdown(5 * 3600000 + 12 * 60000 + 33000), '05:12:33');
  assert.equal(formatCountdown(-5), '00:00:00');
  assert.equal(msToRollover(at('2026-12-02T04:59:30Z'), 'America/New_York'), 30000);
});
