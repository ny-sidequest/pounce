// Results: score and curve, cat ranks, the trail. Built from design/Main.dc.html.
// Stats come from js/stats.js (mock today, the backend later): the page renders at once with placeholders, then fills in.
import { totals, titleFor, eventLine, shareText, formatNumber as fmt, leapMeters, BANDS, outcomeFor } from './engine.js';
import { escapeHTML } from './scene.js';
import { toast, sparkBurst } from './fx.js';
import { autoFit } from './fit.js';
import { getNightStats, getPercentile } from './stats.js';
import { rankFace, youIcon } from './rank-faces.js';

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

/** Web Share on phones, clipboard everywhere else (and whenever sharing is cancelled by an error) */
export async function share(text) {
  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.share) {
    try { await navigator.share({ text }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  toast((await copyText(text)) ? 'Copied!' : 'Could not copy. Select the card text instead');
}

const ICON_BACK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
const ICON_SHARE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>';
const ICON_LOCK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFB238" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
const ICON_PAW = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><ellipse cx="12" cy="16" rx="5" ry="4"/><circle cx="5.5" cy="10" r="2.2"/><circle cx="9.5" cy="6" r="2.2"/><circle cx="14.5" cy="6" r="2.2"/><circle cx="18.5" cy="10" r="2.2"/></svg>';

/* ------------------------------------------------------------ the bell curve */
const CW = 342, CBASE = 130, CTOP = 30;

/** smooth density through the histogram bins: returns y(x) for x in 0..CW (SVG units) */
function curveFn(hist) {
  const pts = hist.map((h) => ({ x: ((h.from + h.to) / 2 / 10000) * CW, w: (h.to - h.from + 1) }));
  const dens = hist.map((h, i) => h.count / pts[i].w);
  const max = Math.max(...dens, 1e-9);
  const val = (x) => {
    if (x <= pts[0].x) return dens[0];
    if (x >= pts[pts.length - 1].x) return dens[dens.length - 1];
    let i = 0;
    while (pts[i + 1].x < x) i++;
    const k = (x - pts[i].x) / (pts[i + 1].x - pts[i].x);
    const s = k * k * (3 - 2 * k);
    return dens[i] + (dens[i + 1] - dens[i]) * s;
  };
  return (x) => CBASE - (val(x) / max) * (CBASE - CTOP - 1);
}

function curveSVG(stats, score, label) {
  const youX = Math.max(0, Math.min(CW, (score / 10000) * CW));
  const iconX = Math.max(14, Math.min(CW - 14, youX));
  let line = '';
  let youY = 99;
  if (stats) {
    const y = curveFn(stats.scoreHistogram);
    const pts = [];
    for (let i = 0; i <= 96; i++) { const x = (i / 96) * CW; pts.push(`${x.toFixed(1)},${y(x).toFixed(1)}`); }
    line = pts.join(' L');
    youY = y(youX);
  } else line = `0,${CBASE - 2} L${CW},${CBASE - 2}`;
  const d = `M${line}`;
  return `<svg class="curve${stats ? '' : ' skel'}" viewBox="0 0 ${CW} 176" role="img" aria-label="${label}">
    <defs><clipPath id="left-of-you"><rect x="0" y="0" width="${youX.toFixed(1)}" height="140"/></clipPath></defs>
    <path d="${d} L${CW},${CBASE} L0,${CBASE} Z" fill="#34296B" opacity=".55"/>
    <path d="${d} L${CW},${CBASE} L0,${CBASE} Z" fill="#FFB238" opacity=".28" clip-path="url(#left-of-you)"/>
    <path d="${d}" fill="none" stroke="#FFC860" stroke-width="2.5" stroke-linejoin="round" style="filter: drop-shadow(0 0 4px #FFB238) drop-shadow(0 0 10px rgba(255,178,56,.6))"/>
    <line x1="${youX.toFixed(1)}" y1="${youY.toFixed(1)}" x2="${youX.toFixed(1)}" y2="${CBASE}" stroke="#FF2E88" stroke-width="2.5" style="filter: drop-shadow(0 0 5px #FF2E88)"/>
    <circle cx="${youX.toFixed(1)}" cy="${youY.toFixed(1)}" r="6" fill="#FF2E88" stroke="#08071A" stroke-width="2"/>
    <g transform="translate(${(iconX - 12).toFixed(1)} ${(youY - 41).toFixed(1)})">${youIcon()}</g>
    <line x1="0" y1="${CBASE}" x2="${CW}" y2="${CBASE}" stroke="#3A3570" stroke-width="1"/>
    <g font-family="Inter, sans-serif" font-size="11" fill="#8E89C2"><text x="0" y="148">0</text><text x="85" y="148" text-anchor="middle">2.5k</text><text x="171" y="148" text-anchor="middle">5k</text><text x="${CW}" y="148" text-anchor="end">10k</text></g>
    <text x="${iconX.toFixed(1)}" y="168" text-anchor="middle" font-family="'Exo 2', sans-serif" font-weight="700" font-size="13" fill="#FF2E88">YOU</text></svg>`;
}

/* ---------------------------------------------------------- the lantern chart */
const COLX = (i) => 34 + 58 * i;
const timeY = (t) => 20 + (Math.min(20, Math.max(0, t)) / 20) * 150;

function lanternsSVG(p, stats, label) {
  const pz = p.pounce;
  let g = '';
  p.results.forEach((r, i) => {
    const cx = COLX(i);
    const ok = r.status === 'correct';
    const ty = ok ? timeY(r.time) : 170;
    g += ok
      ? `<line x1="${cx}" y1="17" x2="${cx}" y2="${ty - 12}" stroke="#FFB238" stroke-width="1" opacity=".7"/><circle cx="${cx}" cy="${ty}" r="14" fill="#FFB238" opacity=".18"/><rect x="${cx - 7}" y="${ty - 9}" width="14" height="18" rx="4" fill="#FFB238"/><rect x="${cx - 5}" y="${ty - 12}" width="10" height="4" rx="1" fill="#6B5A2A"/>`
      : `<rect x="${cx - 7}" y="${ty - 9}" width="14" height="18" rx="4" fill="#1C1940" stroke="#4A4580" stroke-width="1.2"/><path d="M${cx - 3.5} ${ty - 3.5}l7 7M${cx + 3.5} ${ty - 3.5}l-7 7" stroke="#8E89C2" stroke-width="1.4" stroke-linecap="round"/>`;
    const c = stats && stats.clues[i];
    if (c) g += `<line x1="${cx - 12}" y1="${timeY(c.medianSeconds).toFixed(1)}" x2="${cx + 12}" y2="${timeY(c.medianSeconds).toFixed(1)}" stroke="#A9A4D6" stroke-width="2.5" stroke-linecap="round"/>`;
    g += `<text x="${cx}" y="196" text-anchor="middle" font-family="'Exo 2', sans-serif" font-weight="600" font-size="13" fill="${ok ? '#F4E7C3' : '#8E89C2'}">${i + 1}</text>`;
  });
  if (pz.status !== 'none' && pz.afterQ) {
    const x = Math.min(CW - 36, COLX(pz.afterQ - 1) + 29);
    const txt = pz.status === 'correct' ? 'pounced ✓' : 'fell short';
    g += `<g transform="translate(${x - 34} 206)"><rect width="68" height="22" rx="11" fill="#2A1D3E" stroke="${pz.status === 'correct' ? '#FF2E88' : '#FF5C7A'}" stroke-width="1.2"/><text x="34" y="15" text-anchor="middle" font-family="'Exo 2', sans-serif" font-weight="600" font-size="11" fill="${pz.status === 'correct' ? '#FF7FB6' : '#FF5C7A'}">${txt}</text></g>`;
  }
  return `<svg class="lanterns" viewBox="0 0 342 232" role="img" aria-label="${label}">
    <path d="M6 14 Q90 24 171 16 T336 14" stroke="#3A3570" stroke-width="1.5" fill="none"/>
    <g stroke="#34296B" stroke-dasharray="2 4" stroke-width="1"><line x1="0" y1="20" x2="342" y2="20"/><line x1="0" y1="95" x2="342" y2="95"/><line x1="0" y1="170" x2="342" y2="170"/></g>
    <g font-family="Inter, sans-serif" font-size="10" fill="#8E89C2"><text x="342" y="32" text-anchor="end">0s</text><text x="342" y="107" text-anchor="end">10s</text><text x="342" y="182" text-anchor="end">20s</text></g>
    ${g}</svg>`;
}

/* ------------------------------------------------------------------ sections */
const dash = '<span aria-hidden="true">–</span>';

function trailLabel(p, stats) {
  return 'Your answer time per clue' + (stats ? " compared with tonight's median. " : '. ') + p.results.map((r, i) => {
    const m = stats && stats.clues[i] ? `, median ${stats.clues[i].medianSeconds.toFixed(1)}` : '';
    return `Clue ${i + 1}: ${r.status === 'correct' ? r.time.toFixed(1) + ' seconds' : 'missed'}${m}.`;
  }).join(' ');
}

function clueCards(puzzle, p, stats) {
  const hardest = stats ? stats.clues.reduce((a, c) => (c.gotItPct < a.gotItPct ? c : a), stats.clues[0]).index : 0;
  const pz = p.pounce;
  const verdict = outcomeFor(p);
  return puzzle.clues.map((clue, i) => {
    const r = p.results[i];
    const ok = r.status === 'correct';
    const c = stats && stats.clues[i];
    let you;
    if (!ok) you = `<div class="stat slow"><small>You</small><b>Missed</b></div>`;
    else if (!c) you = `<div class="stat"><small>You · ${r.time.toFixed(1)}s</small><b>${dash}</b></div>`;
    else {
      const d = r.time - c.medianSeconds;
      you = `<div class="stat ${d < 0 ? 'fast' : 'slow'}"><small>You · ${r.time.toFixed(1)}s</small><b>${Math.abs(d).toFixed(1)}s ${d < 0 ? 'faster' : 'slower'}</b></div>`;
    }
    const foot = !ok && (r.guess || (c && c.index === hardest))
      ? `<p class="cc-foot">${r.guess ? `You guessed "${escapeHTML(String(r.guess).toLowerCase())}"` : 'No answer'}${c && c.index === hardest ? ' · the hardest clue tonight' : ''}</p>` : '';
    const pill = pz.status !== 'none' && pz.afterQ === i + 1
      ? `<div class="pounce-pill${verdict === 'caught' ? '' : ' bad'}">${ICON_PAW}${verdict === 'caught' ? 'You pounced here and caught the thief' : verdict === 'wrong' ? 'You pounced here and picked the wrong cat' : 'You pounced here but time ran out'}</div>` : '';
    return `
      <article class="clue-card${ok ? '' : ' missed'}">
        <div class="cc-top"><span class="cc-n">CLUE ${i + 1}</span><span class="cc-q">${escapeHTML(clue.q)}</span></div>
        <div class="cc-a">${escapeHTML(clue.answer)}</div>
        ${clue.link ? `<p class="cc-link"><b>→ </b>${escapeHTML(clue.link)}</p>` : ''}
        <div class="stats3">
          <div class="stat"><small>Got it</small><b>${c ? c.gotItPct + '%' : dash}</b></div>
          <div class="stat"><small>Median</small><b>${c ? c.medianSeconds.toFixed(1) + 's' : dash}</b></div>
          ${you}
        </div>${foot}
      </article>${pill}`;
  }).join('');
}

function thiefCard(puzzle, stats) {
  const wrong = stats && stats.topWrongGuess;
  return `
    <article class="thief-card">
      <p class="k">THE THIEF WAS…</p>
      <h3 class="n fit">${escapeHTML(puzzle.connect.answer)}</h3>
      <p class="d">${escapeHTML(puzzle.connect.link_note)}</p>
      <div class="stats3" style="grid-template-columns: repeat(2, minmax(0, 1fr))">
        <div class="stat"><small>Caught the thief</small><b>${stats ? stats.caughtPct + '%' : dash}</b></div>
        <div class="stat"><small>Most pounced</small><b>${stats ? 'After clue ' + stats.mostPouncedAfterClue : dash}</b></div>
      </div>
      ${wrong ? `<p class="w">Top wrong guess: "${escapeHTML(wrong.text)}" · ${fmt(wrong.count)} cats</p>` : ''}
    </article>`;
}

function ranksHTML(p, stats) {
  const mine = titleFor(p).key;
  return BANDS.map((b) => {
    const you = b.key === mine;
    return `<div class="rank${you ? ' you' : ''}"${you ? ' aria-current="true"' : ''}>
      ${rankFace(b.key, you)}
      <div class="rank-main">
        <div class="rank-line"><span class="rank-name">${b.title}${you ? ' · you' : ''}</span><span class="rank-range">${fmt(b.min)}–${fmt(b.max)}</span></div>
        <p class="rank-text">${b.line}</p>
      </div>
      <span class="rank-pct">${stats ? stats.bandShares[b.key] + '%' : dash}</span></div>`;
  }).join('');
}

/** opts.shareText overrides the share preview (screenshots only). */
export function renderResults(root, puzzle, p, { onHome, shareText: shareOverride, stats: statsOverride } = {}) {
  const { total } = totals(p);
  const t = titleFor(p);
  const pz = p.pounce;
  const caught = pz.status === 'correct';
  let stats = null;
  let pct = null;
  const textNow = () => shareOverride ?? shareText(p, { betterThanPct: pct });

  const page = document.createElement('div');
  root.innerHTML = '';
  root.appendChild(page);
  page.className = 'screen res';

  function paint() {
    const text = textNow();
    const note = stats && stats.source === 'fallback' ? '<p class="res-played">Live stats unavailable</p>' : '';
    page.innerHTML = `
    <header class="res-top">
      <button class="sq-btn" id="backBtn" aria-label="Back to home">${ICON_BACK}</button>
      <div class="res-night">NIGHT #${puzzle.id}</div>
      <button class="sq-btn" id="shareTop" aria-label="Share result">${ICON_SHARE}</button>
    </header>

    <section class="res-hero" aria-labelledby="score-h">
      <div class="res-score-row">
        <h1 class="res-score" id="score-h">${fmt(total)}</h1>
        ${caught ? `<span class="res-leapt">LEAPT ${leapMeters(pz.points).toFixed(1)} M</span>` : ''}
      </div>
      <div class="res-rank fit">${escapeHTML(t.title)}</div>
      <p class="res-event">${escapeHTML(eventLine(p))}</p>
      ${curveSVG(stats, total, `Tonight's score distribution. Your score of ${fmt(total)}${pct == null ? '' : ` is better than ${pct} percent of players`}.`)}
      <p class="res-better">${pct == null ? `Better than ${dash} of tonight's cats` : `Better than <em>${pct}%</em> of tonight's cats`}</p>
      <p class="res-played">${stats ? `${fmt(stats.players)} cats played so far · final standings at midnight` : 'Loading tonight\'s stats…'}</p>
      ${note}
    </section>

    <section class="sec" aria-labelledby="ranks-h">
      <div class="sec-head"><h2 class="sec-h" id="ranks-h">CAT RANKS</h2><span class="sec-aside">share of tonight's cats</span></div>
      <p class="lock">${ICON_LOCK}Ranks above Stray cat are for cats who caught the thief.</p>
      <div class="ranks">${ranksHTML(p, stats)}</div>
    </section>

    <section class="sec" aria-labelledby="trail-h">
      <div class="sec-head"><h2 class="sec-h" id="trail-h">THE TRAIL</h2><span class="sec-aside">higher = faster</span></div>
      ${lanternsSVG(p, stats, trailLabel(p, stats))}
      <div class="legend"><span><i style="width:10px;height:12px;border-radius:3px;background:var(--amber)"></i>your time</span><span><i style="width:16px;height:3px;border-radius:2px;background:var(--muted)"></i>tonight's median</span></div>
      <div class="clues">${clueCards(puzzle, p, stats)}${thiefCard(puzzle, stats)}</div>
    </section>

    <section class="sec" id="share" aria-labelledby="share-h">
      <h2 class="sec-h" id="share-h">SHARE</h2>
      <pre class="share-card" aria-label="Share card preview">${escapeHTML(text)}</pre>
      <div class="res-actions">
        <button class="btn btn-neon" id="shareBtn">Share</button>
        <button class="btn btn-ghost" id="homeBtn">Home</button>
      </div>
    </section>`;
    page.querySelectorAll('#shareBtn, #shareTop').forEach((b) => b.addEventListener('click', () => share(textNow())));
    page.querySelectorAll('#homeBtn, #backBtn').forEach((b) => b.addEventListener('click', onHome));
    autoFit(page, '.fit', { min: 15 });
  }

  paint();

  // stats arrive later (mock: at once; live: up to 3 s); fill them in without touching the scroll position
  const wanted = statsOverride ? Promise.resolve(statsOverride) : getNightStats(puzzle.id);
  Promise.all([wanted, getPercentile(puzzle.id, total)]).then(([s, pc]) => {
    if (!page.isConnected) return;
    stats = s; pct = pc.betterThanPct;
    paint();
  }).catch(() => { /* the page already shows its placeholders */ });

  if (caught) {
    requestAnimationFrame(() => {
      const r = page.querySelector('.res-score').getBoundingClientRect();
      sparkBurst(r.left + r.width / 2, r.top + r.height / 2, { count: 24, spread: 120 });
    });
  }
}
