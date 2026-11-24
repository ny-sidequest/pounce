// Light rain: ~40 thin diagonal streaks, pure CSS motion.
import { rng } from './world.js';

export function rainHTML(count = 40, seed = 7) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < count; i++) {
    out += `<i style="left:${(r() * 100).toFixed(1)}%;animation-delay:-${(r() * 6).toFixed(2)}s;animation-duration:${(2.6 + r() * 2.4).toFixed(2)}s"></i>`;
  }
  return `<div class="rain" aria-hidden="true">${out}</div>`;
}
