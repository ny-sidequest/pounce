// Results: the case file. Large header scene, the unmasking card, stacked trail rows, the share card.
import { totals, titleFor, shareText, formatNumber as fmt, MAX_SCORE, leapMeters, gapMeters } from './engine.js';
import { rainHTML } from './rain.js';
import { resultsArt } from './art.js';
import { portrait } from './portraits.js';
import { escapeHTML } from './scene.js';
import { toast, sparkBurst } from './fx.js';
import { autoFit } from './fit.js';

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

const lampIcon = (lit) =>
  `<svg class="bd-lan" viewBox="0 0 12 16" aria-hidden="true"><path d="M2 6 Q2 2 6 2 Q10 2 10 6Z" fill="#3A3666"/><path d="M2.6 6 L9.4 6 L8.6 12.5 Q6 14 3.4 12.5 Z" fill="${lit ? '#FFB238' : '#26233F'}" stroke="${lit ? '#B87A1C' : '#5E5A8A'}" stroke-width=".7"/><ellipse cx="6" cy="9.5" rx="1.2" ry="2" fill="${lit ? '#FFE9B0' : '#5E5A8A'}"/></svg>`;

/** opts.shareText overrides the share preview (screenshots only). */
export function renderResults(root, puzzle, p, { onHome, shareText: shareOverride } = {}) {
  const { speed, pounce, total } = totals(p);
  const t = titleFor(p);
  const text = shareOverride ?? shareText(p);
  const pz = p.pounce;
  const caught = pz.status === 'correct';
  const kind = caught ? 'caught' : pz.status === 'wrong' ? 'away' : 'scaredy';

  // two lines on purpose, short enough not to wrap on a phone
  const line1 = caught
    ? `Caught from ${leapMeters(pz.points).toFixed(1)} m`
    : pz.status === 'wrong' ? `Got away · fell short at ${gapMeters(pz.afterQ).toFixed(1)} m` : 'Got away · never leapt';
  const line2 = caught ? `Speed ${fmt(speed)} · Pounce ${fmt(pounce)}` : `Speed ${fmt(speed)}`;

  const rows = puzzle.clues.map((clue, i) => {
    const r = p.results[i];
    const ok = r.status === 'correct';
    const youLine = ok
      ? `You: ${escapeHTML(r.guess || '')} · ${r.time.toFixed(1)} s · +${fmt(r.points)}`
      : `You: ${r.guess ? escapeHTML(r.guess) : 'missed'} · +0`;
    const mark = pz.status !== 'none' && pz.afterQ === i + 1
      ? `<li class="leap-mark ${caught ? '' : 'bad'}">
           <span aria-hidden="true">🐾</span><span>Pounced here · ${caught ? 'Caught' : 'Fell short'}</span><span aria-hidden="true">${caught ? '✅' : '❌'}</span>
           <span class="sr-only">${caught ? 'caught the thief, plus ' + fmt(pz.points) + ' points' : 'fell short, no points'}</span>
         </li>` : '';
    return `
      <li class="bd-row ${ok ? 'ok' : 'miss'}">
        ${lampIcon(ok)}
        <div class="bd-main">
          <p class="bd-q">${escapeHTML(clue.q)}</p>
          <p class="bd-a fit">${escapeHTML(clue.answer)}</p>
          <p class="bd-you">${youLine}</p>
        </div>
      </li>${mark}`;
  }).join('');

  root.innerHTML = `
  ${rainHTML()}
  <section class="screen results">
    <div class="res-scene">${resultsArt(kind)}</div>
    <div class="res-body">
      <div class="res-head">
        <p class="res-kicker">NIGHT #${puzzle.id}</p>
        <h1 class="res-title">${escapeHTML(t.title)}</h1>
        <p class="res-score"><span>${fmt(total)}</span><small> / ${fmt(MAX_SCORE)}</small></p>
        <p class="res-split">${line1}</p>
        <p class="res-split">${line2}</p>
      </div>

      <div class="connect-card">
        <div class="cc-face" aria-hidden="true">${portrait('thief', 'unmasked', 118)}</div>
        <div class="cc-text">
          <p class="cc-label">THE THIEF WAS…</p>
          <h2 class="cc-name fit">${escapeHTML(puzzle.connect.answer)}</h2>
          <p class="cc-note"><b>How it links:</b> ${escapeHTML(puzzle.connect.link_note)}</p>
        </div>
      </div>

      <h2 class="section-title">THE TRAIL</h2>
      <ol class="breakdown">${rows}</ol>

      <h2 class="section-title">SHARE IT</h2>
      <pre class="share-card" aria-label="Share card preview">${escapeHTML(text)}</pre>
      <div class="res-actions">
        <button class="btn btn-neon" id="shareBtn">SHARE</button>
        <button class="btn" id="homeBtn">HOME</button>
      </div>
    </div>
  </section>`;

  root.querySelector('#shareBtn').addEventListener('click', () => share(text));
  root.querySelector('#homeBtn').addEventListener('click', onHome);
  autoFit(root, '.fit', { min: 14 });

  if (caught) {
    requestAnimationFrame(() => {
      const r = root.querySelector('.res-scene').getBoundingClientRect();
      sparkBurst(r.left + r.width / 2, r.top + r.height / 2, { count: 24, spread: 120 });
    });
  }
}
