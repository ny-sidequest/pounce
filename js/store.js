// localStorage wrapper. Keys: pounce:v1:<puzzleId> (progress), pounce:v1:pref:* (preferences).
import { applyReload, hasStarted } from './engine.js';

const PREFIX = 'pounce:';
const key = (id) => `${PREFIX}v1:${id}`;

function safeGet(k) {
  try { return localStorage.getItem(k); } catch { return null; }
}
function safeSet(k, v) {
  try { localStorage.setItem(k, v); } catch { /* private mode etc: play on without saving */ }
}

/** Dev reset: ?reset=1 clears every pounce: key. Not mentioned anywhere in the UI. */
export function maybeReset() {
  const url = new URL(location.href);
  if (url.searchParams.get('reset') !== '1') return;
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
  url.searchParams.delete('reset');
  history.replaceState(null, '', url.pathname + url.search + url.hash);
}

export function loadProgress(id) {
  const raw = safeGet(key(id));
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    return p && p.v === 1 && p.puzzleId === id ? p : null;
  } catch { return null; }
}

export function saveProgress(p) {
  safeSet(key(p.puzzleId), JSON.stringify(p));
}

/** Page load: any puzzle caught mid-question or mid-pounce is penalised (refresh rule). */
export function applyReloadRule(puzzles) {
  for (const pz of puzzles) {
    const p = loadProgress(pz.id);
    if (p && hasStarted(p)) {
      const n = applyReload(p);
      if (n !== p) saveProgress(n);
    }
  }
}

export const getPref = (name, fallback = null) => safeGet(key('pref:' + name)) ?? fallback;
export const setPref = (name, value) => safeSet(key('pref:' + name), String(value));
