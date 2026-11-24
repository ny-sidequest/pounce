// Home: the city at night. Three WANTED posters on a rooftop wall; the cat watches from the top.
import { rainHTML } from './rain.js';
import { portrait } from './portraits.js';
import { skylineLayer, moonSVG, starsSVG } from './world.js';
import { logoHTML } from './logo.js';
import { escapeHTML } from './scene.js';

/**
 * nights: [{ id, state: 'new' | 'caught' | 'away', started?, name?, score?, title?, from? }]
 */
export function homeHTML(nights) {
  const posters = nights.map((n) => {
    const label = `Night ${n.id}`;
    if (n.state === 'caught') {
      return `<button class="poster poster--caught" data-id="${n.id}" aria-label="${label}, caught. The thief was ${escapeHTML(n.name)}. ${n.title}, score ${n.score}, from ${n.from}. See results">
        <span class="tape" aria-hidden="true"></span>
        <span class="wanted">WANTED</span>
        <span class="p-art">${portrait('thief', 'unmasked', 118)}</span>
        <span class="p-name fit">${escapeHTML(n.name)}</span>
        <span class="p-night">NIGHT #${n.id}</span>
        <span class="p-meta"><b>${n.score}</b> · ${escapeHTML(n.title)}<br>from ${n.from}</span>
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
        <span class="p-meta"><b>${n.score}</b> · ${escapeHTML(n.title)}</span>
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
      <span class="p-cta">${n.started ? '▸ RESUME' : '▸ PLAY'}</span>
    </button>`;
  }).join('');

  return `
  ${rainHTML()}
  <main class="screen home">
    <svg class="home-sky" viewBox="0 0 640 400" preserveAspectRatio="xMidYMin slice" aria-hidden="true"><rect width="640" height="400" fill="url(#sky)"/>${starsSVG(0, 0, 640, 260, 70, 5)}</svg>
    <svg class="skyline-strip" viewBox="0 0 640 80" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${skylineLayer({ x0: -20, x1: 660, base: 80, seed: 3, fill: '#322C63', opacity: 0.75, minH: 28, maxH: 68, minW: 24, maxW: 48, rim: true })}${skylineLayer({ x0: -20, x1: 660, base: 84, seed: 17, fill: '#252052', opacity: 1, minH: 14, maxH: 46, minW: 20, maxW: 40, windows: 0.1 })}</svg>
    <div class="home-inner">
      <div class="logo-block">
        ${logoHTML()}
        <p class="logo-sub">Leap before you look</p>
        <div class="story-intro">
          <p>A masked thief prowls the rooftops.</p>
          <p>Only your cat is watching.</p>
          <p>Crack the clues. Close the gap. Pounce.</p>
        </div>
      </div>
      <div class="facade">
        <div class="wall-top"><div class="home-cat"><svg id="homeCat" aria-hidden="true"></svg></div><svg class="home-moon" viewBox="-60 -60 120 120" aria-hidden="true">${moonSVG(26)}</svg></div>
        <div class="wall">${posters}</div>
        <div class="home-links">
          <button class="link-btn" id="howBtn">How to play</button>
          <p class="foot">A prototype. <a href="#feedback">Tell us what you think</a></p>
        </div>
      </div>
    </div>
  </main>`;
}
