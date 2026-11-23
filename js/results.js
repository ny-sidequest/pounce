// Results screen: the title pose on the moonlit roof, the connect in warm light, clue-by-clue lanterns.
import { totals, titleFor, shareText, formatNumber as fmt, MAX_SCORE, leapMeters, gapMeters } from './engine.js';
import { catSVG } from './cat.js';
import { C, rect, moon, stars, rainHTML } from './pixel.js';
import { escapeHTML } from './scene.js';
import { toast, sparkBurst } from './fx.js';

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* ignore */ }
    ta.remove();
    return ok;
  }
}

async function share(text) {
  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.share) {
    try { await navigator.share({ text }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  toast((await copyText(text)) ? 'Copied!' : 'Could not copy. Select the card text instead');
}

const lanternIcon = (lit) =>
  `<svg class="bd-lan" viewBox="0 0 3 5" shape-rendering="crispEdges" aria-hidden="true">${rect(0, 0, 3, 1, C.line)}${rect(0, 1, 3, 3, lit ? C.amber : '#26233F')}${rect(1, 2, 1, 1, lit ? '#FFE9B0' : C.dim)}${rect(0, 4, 3, 1, C.line)}</svg>`;

export function renderResults(root, puzzle, p, { onHome }) {
  const { speed, pounce, total } = totals(p);
  const t = titleFor(p);
  const text = shareText(p);
  const pz = p.pounce;

  const leapLine =
    pz.status === 'correct' ? `Leapt ${leapMeters(pz.points).toFixed(1)} m` :
    pz.status === 'wrong' ? `Fell short at ${gapMeters(pz.afterQ).toFixed(1)} m` : 'No leap';

  const rows = puzzle.clues.map((clue, i) => {
    const r = p.results[i];
    const ok = r.status === 'correct';
    const typed = r.guess ? escapeHTML(r.guess) : 'missed';
    const mark = pz.status !== 'none' && pz.afterQ === i + 1
      ? `<li class="leap-mark ${pz.status === 'correct' ? '' : 'bad'}">
           <span aria-hidden="true">🐾</span><span>Leapt here</span><span aria-hidden="true">${pz.status === 'correct' ? '✅' : '❌'}</span>
           <span class="sr-only">${pz.status === 'correct' ? 'correct, plus ' + fmt(pz.points) + ' points' : 'fell short, no points'}</span>
         </li>` : '';
    return `
      <li class="bd-row ${ok ? 'ok' : 'miss'}">
        ${lanternIcon(ok)}
        <div>
          <p class="bd-q">${escapeHTML(clue.q)}</p>
          <dl class="bd-grid">
            <div><dt>Answer</dt><dd>${escapeHTML(clue.answer)}</dd></div>
            <div><dt>You</dt><dd class="${ok ? '' : 'dim'}">${typed}</dd></div>
            <div><dt>Time</dt><dd>${ok ? r.time.toFixed(1) + 's' : '—'}</dd></div>
            <div><dt>Points</dt><dd class="pts">${fmt(r.points)}</dd></div>
          </dl>
        </div>
      </li>${mark}`;
  }).join('');

  root.innerHTML = `
  ${rainHTML()}
  <section class="screen results">
    <div class="res-scene stars-bg">
      <svg class="res-moon" viewBox="0 0 48 48" shape-rendering="crispEdges" aria-hidden="true">${moon(20, 22, 5)}</svg>
      <div class="res-cat">${catSVG(t.pose, 9)}</div>
    </div>
    <div class="res-roof" aria-hidden="true"></div>
    <div class="res-head">
      <p class="res-kicker">PROWL #${puzzle.id}</p>
      <h1 class="res-title">${escapeHTML(t.title)}</h1>
      <p class="res-score"><span>${fmt(total)}</span><small> / ${fmt(MAX_SCORE)}</small></p>
      <p class="res-split">${leapLine} · Speed ${fmt(speed)} + Pounce ${fmt(pounce)}</p>
    </div>

    <div class="connect-card">
      <svg class="cc-lantern" viewBox="0 0 3 5" shape-rendering="crispEdges" aria-hidden="true">${rect(0, 0, 3, 1, C.line)}${rect(0, 1, 3, 3, C.amber)}${rect(1, 2, 1, 1, '#FFE9B0')}${rect(0, 4, 3, 1, C.line)}</svg>
      <div>
        <p class="cc-label">THE CONNECT</p>
        <h2 class="cc-name">${escapeHTML(puzzle.connect.answer)}</h2>
        <p class="cc-note"><b>How it links:</b> ${escapeHTML(puzzle.connect.link_note)}</p>
      </div>
    </div>

    <h2 class="section-title">CLUE BY CLUE</h2>
    <ol class="breakdown">${rows}</ol>

    <h2 class="section-title">SHARE IT</h2>
    <pre class="share-card" aria-label="Share card preview">${escapeHTML(text)}</pre>
    <div class="res-actions">
      <button class="btn btn-neon" id="shareBtn">SHARE</button>
      <button class="btn" id="homeBtn">HOME</button>
    </div>
  </section>`;

  root.querySelector('#shareBtn').addEventListener('click', () => share(text));
  root.querySelector('#homeBtn').addEventListener('click', onHome);

  if (pz.status === 'correct') {
    requestAnimationFrame(() => {
      const r = root.querySelector('.res-cat').getBoundingClientRect();
      sparkBurst(r.left + r.width / 2, r.top + r.height / 2, { count: 24, spread: 120 });
    });
  }
}
