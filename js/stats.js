// The crowd-stats seam. The UI only ever calls these two async functions; the backend plugs in via CONFIG.statsUrl.
// Shapes are documented in docs/data-contract.md. With no statsUrl the data is mock: believable, seeded per night.
import { CONFIG } from './config.js';
import { BANDS } from './engine.js';

const TIMEOUT_MS = 3000;
const rng = (seed) => { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };

const MOCK_WRONG = { 1: 'Better Call Saul', 2: 'Evanescence', 3: 'Iron Man' };

/** A normal curve around 5,500 in 500-point bins, scaled to `players` cats. Deterministic per night. */
function mockHistogram(nightId, players) {
  const r = rng(nightId * 7919 + 13);
  const mean = 5500 + (r() - 0.5) * 500, sd = 1900 + r() * 300;
  const bins = Array.from({ length: 20 }, (_, i) => {
    const mid = i * 500 + 250;
    return Math.exp(-0.5 * ((mid - mean) / sd) ** 2) * (0.96 + r() * 0.08);
  });
  const sum = bins.reduce((a, b) => a + b, 0);
  return bins.map((w, i) => ({ from: i * 500, to: i === 19 ? 10000 : i * 500 + 499, count: Math.round((w / sum) * players) }));
}

/** whole-number shares that add up to 100 (largest remainder) */
function shares(counts) {
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  const raw = counts.map((c) => (c / total) * 100);
  const out = raw.map(Math.floor);
  let left = 100 - out.reduce((a, b) => a + b, 0);
  raw.map((v, i) => [v - out[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left-- > 0) out[i]++; });
  return out;
}

export function mockNightStats(nightId) {
  const r = rng(nightId * 104729 + 5);
  const players = 900 + Math.floor(r() * 900);
  const scoreHistogram = mockHistogram(nightId, players);
  const counts = BANDS.map((b) => scoreHistogram.filter((h) => h.from >= b.min && h.from <= b.max).reduce((a, h) => a + h.count, 0));
  const pct = shares(counts);
  const bandShares = Object.fromEntries(BANDS.map((b, i) => [b.key, pct[i]]));
  const clues = Array.from({ length: 5 }, (_, i) => ({
    index: i + 1,
    gotItPct: Math.round(96 - i * 7 - r() * 18),
    medianSeconds: +(2 + i * 1.3 + r() * 3.4).toFixed(1)
  }));
  return {
    players: scoreHistogram.reduce((a, h) => a + h.count, 0),
    scoreHistogram, bandShares,
    caughtPct: Math.round(52 + r() * 24),
    mostPouncedAfterClue: 2 + Math.floor(r() * 2),
    topWrongGuess: { text: MOCK_WRONG[nightId] || 'No clue', count: 90 + Math.floor(r() * 160) },
    clues
  };
}

export function mockPercentile(nightId, score) {
  const h = mockNightStats(nightId).scoreHistogram;
  const total = h.reduce((a, b) => a + b.count, 0) || 1;
  let below = 0;
  for (const b of h) {
    if (score >= b.to) below += b.count;
    else if (score >= b.from) below += b.count * ((score - b.from) / (b.to - b.from + 1));
  }
  return { betterThanPct: Math.max(0, Math.min(99, Math.round((below / total) * 100))) };
}

async function getJSON(url) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally { clearTimeout(timer); }
}

/** @returns the contract shape plus `source`: 'mock' (no backend yet), 'live', or 'fallback' (backend failed, mock shown) */
export async function getNightStats(nightId) {
  if (!CONFIG.statsUrl) return { ...mockNightStats(nightId), source: 'mock' };
  try { return { ...(await getJSON(`${CONFIG.statsUrl}/nights/${nightId}/stats`)), source: 'live' }; }
  catch { return { ...mockNightStats(nightId), source: 'fallback' }; }
}

/** @returns { betterThanPct } */
export async function getPercentile(nightId, score) {
  if (!CONFIG.statsUrl) return mockPercentile(nightId, score);
  try { return await getJSON(`${CONFIG.statsUrl}/nights/${nightId}/percentile?score=${encodeURIComponent(score)}`); }
  catch { return mockPercentile(nightId, score); }
}
