// Home: the city at night. Three WANTED posters on a brick wall; the cat watches from the top.
import { C, moon, skyline, rainHTML } from './pixel.js';
import { catSVG } from './cat.js';
import { thiefSVG } from './thief.js';
import { escapeHTML } from './scene.js';

/**
 * nights: [{ id, state: 'new' | 'caught' | 'away', started?, name?, score?, title?, from? }]
 */
export function homeHTML(nights) {
  const posters = nights.map((n) => {
    const label = `Night ${n.id}`;
    if (n.state === 'caught') {
      return `<button class="poster poster--caught" data-id="${n.id}" aria-label="${label}, caught. ${n.title}, score ${n.score}, from ${n.from}. See results">
        <span class="tape" aria-hidden="true"></span>
        <span class="wanted">WANTED</span>
        <span class="p-art">${thiefSVG('caught', 3)}</span>
        <span class="p-name">${escapeHTML(n.name)}</span>
        <span class="p-night">NIGHT #${n.id}</span>
        <span class="p-meta"><b>${n.score}</b><br>${escapeHTML(n.title)}<br>from ${n.from}</span>
        <span class="stamp" aria-hidden="true">CAUGHT</span>
      </button>`;
    }
    if (n.state === 'away') {
      return `<button class="poster poster--away" data-id="${n.id}" aria-label="${label}, got away. ${n.title}, score ${n.score}. See results">
        <span class="tape" aria-hidden="true"></span>
        <span class="wanted">WANTED</span>
        <span class="p-art">${thiefSVG('stand', 3)}</span>
        <span class="p-name">?</span>
        <span class="p-night">NIGHT #${n.id}</span>
        <span class="p-meta"><b>${n.score}</b><br>${escapeHTML(n.title)}<br>GOT AWAY</span>
      </button>`;
    }
    return `<button class="poster" data-id="${n.id}" aria-label="${label}, unsolved. Reward 5,000. ${n.started ? 'Resume' : 'Play'}">
      <span class="tape" aria-hidden="true"></span>
      <span class="wanted">WANTED</span>
      <span class="p-art">${thiefSVG('stand', 3)}</span>
      <span class="p-name">?</span>
      <span class="p-night">NIGHT #${n.id}</span>
      <span class="p-meta">REWARD:<br><b>5,000</b></span>
      <span class="p-cta">${n.started ? '▸ RESUME' : '▸ PLAY'}</span>
    </button>`;
  }).join('');

  return `
  ${rainHTML()}
  <main class="screen home">
    <div class="home-sky stars-bg"></div>
    <svg class="home-moon" viewBox="0 0 48 48" shape-rendering="crispEdges" aria-hidden="true">${moon(20, 22, 5)}</svg>
    <svg class="skyline-strip" viewBox="0 0 640 80" preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges" aria-hidden="true">${skyline({ w: 640, h: 80, seed: 3, fill: C.roof2, minH: 32, maxH: 72 })}</svg>
    <div class="home-inner">
      <div class="logo-block">
        <h1 class="logo">POUNCE</h1>
        <p class="logo-sub">ONE LEAP A DAY</p>
        <p class="hero-line">Leap before you look.</p>
        <div class="story-intro">
          <p>A masked thief prowls the rooftops every night.</p>
          <p>Your cat is the only one watching.</p>
          <p>Crack the clues. Close the gap. Pounce.</p>
        </div>
      </div>
      <div class="facade">
        <div class="wall-top"><div class="home-cat">${catSVG('crouch', 5)}</div></div>
        <div class="wall">${posters}</div>
        <div class="home-links">
          <button class="link-btn" id="howBtn">How to play</button>
          <p class="foot">A prototype. <a href="#feedback">Tell us what you think</a></p>
        </div>
      </div>
    </div>
  </main>`;
}
