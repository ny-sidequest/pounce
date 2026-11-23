// Results: the case file. Header art by outcome, the unmasking card, the trail, the share card.
import { totals, titleFor, shareText, formatNumber as fmt, MAX_SCORE, leapMeters, gapMeters } from './engine.js';
import { C, rect, rainHTML, glyph } from './pixel.js';
import { resultsArt } from './art.js';
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

const lampIcon = (lit) =>
  `<svg class="bd-lan" viewBox="0 0 3 5" shape-rendering="crispEdges" aria-hidden="true">${rect(0, 0, 3, 1, C.line)}${rect(0, 1, 3, 3, lit ? C.amber : '#26233F')}${rect(1, 2, 1, 1, lit ? '#FFE9B0' : C.dim)}${rect(0, 4, 3, 1, C.line)}</svg>`;

/** opts.shareText overrides the share preview (storyboard only). */
export function renderResults(root, puzzle, p, { onHome, shareText: shareOverride } = {}) {
  const { speed, pounce, total } = totals(p);
  const t = titleFor(p);
  const text = shareOverride ?? shareText(p);
  const pz = p.pounce;
  const caught = pz.status === 'correct';
  const kind = caught ? 'caught' : pz.status === 'wrong' ? 'away' : 'scaredy';

  const status = caught
    ? `Caught from ${leapMeters(pz.points).toFixed(1)} m · Speed ${fmt(speed)} + Pounce ${fmt(pounce)}`
    : pz.status === 'wrong'
      ? `Got away · Fell short at ${gapMeters(pz.afterQ).toFixed(1)} m · Speed ${fmt(speed)}`
      : `Got away · Never leapt · Speed ${fmt(speed)}`;

  const rows = puzzle.clues.map((clue, i) => {
    const r = p.results[i];
    const ok = r.status === 'correct';
    const typed = r.guess ? escapeHTML(r.guess) : 'missed';
    const mark = pz.status !== 'none' && pz.afterQ === i + 1
      ? `<li class="leap-mark ${caught ? '' : 'bad'}">
           <span aria-hidden="true">🐾</span><span>Pounced here · ${caught ? 'Caught' : 'Fell short'}</span><span aria-hidden="true">${caught ? '✅' : '❌'}</span>
           <span class="sr-only">${caught ? 'caught the thief, plus ' + fmt(pz.points) + ' points' : 'fell short, no points'}</span>
         </li>` : '';
    return `
      <li class="bd-row ${ok ? 'ok' : 'miss'}">
        ${lampIcon(ok)}
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
    <div class="res-scene">${resultsArt(kind)}</div>
    <div class="res-head">
      <p class="res-kicker">NIGHT #${puzzle.id}</p>
      <h1 class="res-title">${escapeHTML(t.title)}</h1>
      <p class="res-score"><span>${fmt(total)}</span><small> / ${fmt(MAX_SCORE)}</small></p>
      <p class="res-split">${status}</p>
    </div>

    <div class="connect-card">
      <div class="cc-mask" aria-hidden="true"><svg viewBox="0 0 8 10" shape-rendering="crispEdges">${rect(1, 0, 6, 8, '#CFC8E8')}${rect(2, 2, 1, 1, C.shadow)}${rect(5, 2, 1, 1, C.shadow)}${glyph('?', 2.5, 4, 1, C.amber)}</svg></div>
      <div>
        <p class="cc-label">THE THIEF WAS…</p>
        <h2 class="cc-name">${escapeHTML(puzzle.connect.answer)}</h2>
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
  </section>`;

  root.querySelector('#shareBtn').addEventListener('click', () => share(text));
  root.querySelector('#homeBtn').addEventListener('click', onHome);

  if (caught) {
    requestAnimationFrame(() => {
      const r = root.querySelector('.res-scene').getBoundingClientRect();
      sparkBurst(r.left + r.width / 2, r.top + r.height / 2, { count: 24, spread: 120 });
    });
  }
}
