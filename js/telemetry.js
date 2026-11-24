// One anonymous `round` event when a night finishes. Never blocks or breaks the UI: everything is best-effort.
// With CONFIG.statsUrl set it is POSTed to {statsUrl}/rounds; otherwise the last 20 events sit in localStorage 'pounce:outbox'.
import { CONFIG } from './config.js';
import { totals, outcomeFor } from './engine.js';

const OUTBOX = 'pounce:outbox';
const DEVICE = 'pounce:deviceId';
const sentKey = (id) => `pounce:sent:${id}`;

const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16); }));

export function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE);
    if (!id) { id = uuid(); localStorage.setItem(DEVICE, id); }
    return id;
  } catch { return 'unknown'; }
}

/** Build the event from a finished progress object (pure apart from deviceId / clock). */
export function buildRound(p, now = new Date()) {
  const t = totals(p);
  return {
    type: 'round',
    deviceId: deviceId(),
    nightId: p.puzzleId,
    finishedAt: now.toISOString(),
    totalScore: t.total, speedScore: t.speed, pounceScore: t.pounce,
    caught: p.pounce.status === 'correct',
    outcome: outcomeFor(p),
    pouncedAfterClue: p.pounce.afterQ ?? null,
    pounceGuess: p.pounce.guess ?? null,
    clues: p.results.map((r, i) => ({
      index: i + 1, correct: r.status === 'correct', tries: r.tries ?? (r.guess ? 1 : 0),
      seconds: r.time == null ? null : +r.time.toFixed(1), guesses: r.guesses ?? (r.guess ? [r.guess] : [])
    }))
  };
}

/** Record a finished night once (a replay of the results page never sends a second event). */
export function recordRound(p) {
  try {
    if (localStorage.getItem(sentKey(p.puzzleId))) return null;
    const ev = buildRound(p);
    localStorage.setItem(sentKey(p.puzzleId), '1');
    if (CONFIG.statsUrl) {
      fetch(`${CONFIG.statsUrl}/rounds`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ev), keepalive: true }).catch(() => {});
    } else {
      const box = JSON.parse(localStorage.getItem(OUTBOX) || '[]');
      box.push(ev);
      localStorage.setItem(OUTBOX, JSON.stringify(box.slice(-20)));
    }
    return ev;
  } catch { return null; }
}
