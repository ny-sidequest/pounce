// Which night is "tonight", and when the next thief arrives. Pure functions (the clock and config are injected) so they are tested.

/** the calendar date (YYYY-MM-DD) of `now` in time zone `tz` */
export function dateInTz(now, tz = 'UTC') {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const g = (t) => p.find((x) => x.type === t).value;
  return `${g('year')}-${g('month')}-${g('day')}`;
}

const dayIndex = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 86400000); };

/** days since launchDate (in tz) plus 1: launch day is night 1 */
export const nightNumber = (now, { launchDate, rolloverTz = 'UTC' }) => dayIndex(dateInTz(now, rolloverTz)) - dayIndex(launchDate) + 1;

/**
 * Tonight's puzzle id. `ids` are the ids that exist. Before launch (number < 1) it is the first puzzle; past the last puzzle it is the
 * latest one that exists. devAllNights ignores the date: tonight is the latest puzzle.
 */
export function tonightId(ids, now, cfg) {
  const sorted = [...ids].sort((a, b) => a - b);
  if (!sorted.length) return null;
  if (cfg.devAllNights) return sorted[sorted.length - 1];
  const n = nightNumber(now, cfg);
  if (n < 1) return sorted[0];
  return sorted.includes(n) ? n : sorted[sorted.length - 1];
}

/** milliseconds until the next midnight in tz (the rollover) */
export function msToRollover(now, tz = 'UTC') {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const g = (t) => Number(p.find((x) => x.type === t).value);
  const sinceMidnight = (g('hour') * 3600 + g('minute') * 60 + g('second')) * 1000 + now.getUTCMilliseconds();
  return 86400000 - sinceMidnight;
}

/** HH:MM:SS (never negative) */
export function formatCountdown(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}
