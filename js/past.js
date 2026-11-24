// Past nights: every thief so far, as wanted posters (caught, escaped, unplayed). Tonight's night lives on the home screen.
import { portrait } from './portraits.js';
import { escapeHTML } from './scene.js';
import { CONFIG } from './config.js';
import { rainHTML } from './rain.js';

/**
 * nights: [{ id, state: 'new' | 'caught' | 'away', started?, name?, score?, title?, from? }], newest first
 */
export function pastHTML(nights) {
  const posters = nights.map((n) => {
    const label = `Night ${n.id}`;
    if (n.state === 'caught') {
      return `<button class="poster poster--caught" data-id="${n.id}" aria-label="${label}, caught. The thief was ${escapeHTML(n.name)}. ${n.title}, score ${n.score}, leapt ${n.from}. See results">
        <span class="tape" aria-hidden="true"></span>
        <span class="wanted">WANTED</span>
        <span class="p-art">${portrait('thief', 'unmasked', 118)}</span>
        <span class="p-name fit">${escapeHTML(n.name)}</span>
        <span class="p-night">NIGHT #${n.id}</span>
        <span class="p-meta"><b>${n.score === '0' ? '<span class="z0">0</span>' : n.score}</b> · ${escapeHTML(n.title)}<br>Leapt ${n.from}</span>
        <span class="stamp" aria-hidden="true">CAUGHT</span>
        <span class="p-cta alt">SEE RESULTS</span>
      </button>`;
    }
    if (n.state === 'away') {
      return `<button class="poster poster--away" data-id="${n.id}" aria-label="${label}, got away. ${n.title}, score ${n.score}. See results">
        <span class="tape" aria-hidden="true"></span>
        <span class="wanted">WANTED</span>
        <span class="p-art">${portrait('thief', 'sneak', 118)}</span>
        <span class="p-name">GOT AWAY</span>
        <span class="p-night">NIGHT #${n.id}</span>
        <span class="p-meta"><b>${n.score === '0' ? '<span class="z0">0</span>' : n.score}</b> · ${escapeHTML(n.title)}</span>
        <span class="p-cta alt">SEE RESULTS</span>
      </button>`;
    }
    return `<button class="poster" data-id="${n.id}" aria-label="${label}, unsolved. Reward 5,000. ${n.started ? 'Resume' : 'Play'}">
      <span class="tape" aria-hidden="true"></span>
      <span class="wanted">WANTED</span>
      <span class="p-art">${portrait('thief', 'sneak', 118)}</span>
      <span class="p-name">?</span>
      <span class="p-night">NIGHT #${n.id}</span>
      <span class="p-meta">REWARD <b>5,000</b></span>
      <span class="p-cta">${n.started ? 'RESUME ▸' : 'PLAY ▸'}</span>
    </button>`;
  }).join('');

  return `
  ${rainHTML()}
  <main class="screen past">
    <header class="past-top">
      <button class="sq-btn" id="pastBack" aria-label="Back to home"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></button>
      <div class="past-titles"><h1 class="past-h">PAST NIGHTS</h1><p class="past-sub">Every thief so far.</p></div>
      <span class="past-spacer"></span>
    </header>
    ${nights.length ? `<div class="past-grid">${posters}</div>` : '<p class="past-empty">No past nights yet. Tonight is the first.</p>'}
    <p class="foot past-foot">${CONFIG.launch ? '' : 'Early build. '}<a href="#feedback">Tell us what you think</a>${CONFIG.launch ? '' : '.'}</p>
  </main>`;
}
