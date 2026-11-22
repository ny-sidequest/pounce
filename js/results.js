// Results screen: title, score, the revealed connect, clue-by-clue breakdown, share card.
import { totals, titleFor, shareText, formatNumber as fmt, MAX_SCORE } from './engine.js';
import { catSVG, yarnBall, pawSVG } from './cat.js';
import { escapeHTML } from './board.js';
import { toast, confetti } from './fx.js';

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

export function renderResults(root, puzzle, color, p, { onHome }) {
  const { speed, pounce, total } = totals(p);
  const t = titleFor(p);
  const text = shareText(p);
  const pz = p.pounce;

  const rows = puzzle.clues.map((clue, i) => {
    const r = p.results[i];
    const ok = r.status === 'correct';
    const typed = r.guess ? escapeHTML(r.guess) : 'missed';
    const mark = pz.status !== 'none' && pz.afterQ === i + 1
      ? `<li class="pounce-mark ${pz.status === 'correct' ? 'ok' : 'bad'}">
           <span class="pm-paw">${pawSVG('#2B2118')}</span>
           <span>Pounced here</span>
           <span aria-hidden="true">${pz.status === 'correct' ? '✅' : '❌'}</span>
           <span class="sr-only">${pz.status === 'correct' ? 'correct' : 'wrong'}, ${pz.status === 'correct' ? '+' + fmt(pz.points) + ' points' : 'no points'}</span>
         </li>` : '';
    return `
      <li class="bd-row ${ok ? 'ok' : 'miss'}">
        <p class="bd-q"><span class="bd-n">${i + 1}</span>${escapeHTML(clue.q)}</p>
        <dl class="bd-grid">
          <div><dt>Answer</dt><dd>${escapeHTML(clue.answer)}</dd></div>
          <div><dt>You</dt><dd class="${ok ? '' : 'dim'}">${typed}</dd></div>
          <div><dt>Time</dt><dd>${ok ? r.time.toFixed(1) + 's' : '—'}</dd></div>
          <div><dt>Points</dt><dd class="pts">${fmt(r.points)}</dd></div>
        </dl>
      </li>${mark}`;
  }).join('');

  root.innerHTML = `
  <section class="screen results" style="--ball:${color}">
    <div class="res-head card">
      <div class="res-cat">${catSVG(t.pose)}</div>
      <p class="res-kicker">Pounce #${puzzle.id}</p>
      <h1 class="res-title">${escapeHTML(t.title)}</h1>
      <p class="res-score"><span>${fmt(total)}</span><small> / ${fmt(MAX_SCORE)}</small></p>
      <p class="res-split">Speed ${fmt(speed)} + Pounce ${fmt(pounce)}</p>
    </div>

    <div class="connect-card card">
      <div class="cc-knot">${yarnBall('#F2B33D')}</div>
      <div>
        <p class="cc-label">The connect</p>
        <h2 class="cc-name">${escapeHTML(puzzle.connect.answer)}</h2>
        <p class="cc-note"><b>How it links:</b> ${escapeHTML(puzzle.connect.link_note)}</p>
      </div>
    </div>

    <h2 class="section-title"><span class="paw-bullet">${pawSVG('#E8483B')}</span> Clue by clue</h2>
    <ol class="breakdown">${rows}</ol>

    <h2 class="section-title"><span class="paw-bullet">${pawSVG('#E8483B')}</span> Share it</h2>
    <pre class="share-card" aria-label="Share card preview">${escapeHTML(text)}</pre>
    <div class="res-actions">
      <button class="btn btn-pounce" id="shareBtn">Share</button>
      <button class="btn btn-ghost" id="homeBtn">Back home</button>
    </div>
  </section>`;

  root.querySelector('#shareBtn').addEventListener('click', () => share(text));
  root.querySelector('#homeBtn').addEventListener('click', onHome);

  // a little party for a correct pounce
  if (pz.status === 'correct') {
    requestAnimationFrame(() => {
      const r = root.querySelector('.res-cat').getBoundingClientRect();
      confetti(r.left + r.width / 2, r.top + r.height / 2, 30);
    });
  }
}
