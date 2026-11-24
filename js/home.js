// Home: one scene, one job: start tonight's chase. (The wanted posters live on the Past nights page, js/past.js.)
import { logoHTML } from './logo.js';
import { starsSVG } from './world.js';
import { escapeHTML } from './scene.js';
import { numHTML } from './num.js';

const SOUND_ICON = (on) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/>${on ? '<path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>' : '<path d="M17 9l4 6M21 9l-4 6"/>'}</svg>`;

/** the masked thief with the glowing "?" sack (phone art), feet at (0,0) */
const thiefPhone = (withThief) => `<g transform="translate(330 590)"><circle cx="-14" cy="-16" r="9" fill="#FFB238"/><circle cx="-14" cy="-16" r="16" fill="#FFB238" opacity=".18"/><text x="-14" y="-12" text-anchor="middle" font-family="Audiowide, sans-serif" font-size="10" fill="#6B4A10">?</text>${withThief ? `
<path d="M-10 0 L-4 -36 L14 -36 L20 0 Z" fill="#3B2A6B" stroke="#9D6BFF" stroke-width="1"/><circle cx="5" cy="-42" r="8" fill="#1A1530" stroke="#9D6BFF" stroke-width="1"/><rect x="-2" y="-45" width="14" height="4.5" rx="2" fill="#F4E7C3"/>
<rect x="-9" y="-52" width="28" height="3.5" rx="1.75" fill="#1A1530"/><path d="M-2 -51 Q5 -62 12 -51 Z" fill="#1A1530"/>` : ''}</g>`;

const CITY_PHONE = (withThief) => `<svg class="hm-city hm-city--phone" viewBox="0 480 390 364" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
<path d="M0 620 L0 560 L40 560 L40 530 L84 530 L84 572 L132 572 L132 520 L178 520 L178 556 L226 556 L226 540 L270 540 L270 500 L318 500 L318 548 L390 548 L390 620 Z" fill="#141134"/>
<g fill="#FFB238" opacity=".75"><rect x="52" y="544" width="7" height="9"/><rect x="66" y="544" width="7" height="9" opacity=".4"/><rect x="144" y="534" width="7" height="9"/><rect x="160" y="550" width="7" height="9" opacity=".4"/><rect x="236" y="566" width="7" height="9"/><rect x="284" y="514" width="7" height="9" opacity=".5"/><rect x="300" y="530" width="7" height="9"/></g>
<path d="M0 844 L0 600 L60 600 L60 586 L150 586 L150 610 L250 610 L250 592 L390 592 L390 844 Z" fill="#100D2B"/>
<rect x="0" y="584" width="150" height="4" fill="#34296B"/><rect x="250" y="590" width="140" height="4" fill="#34296B"/>${thiefPhone(withThief)}</svg>`;

/** desktop skyline: the black cat (icon C head: amber eyes, pink scarf) on the left roof, the thief on the right, a faint leap path between */
const CITY_DESK = (state) => `<svg class="hm-city hm-city--desk" viewBox="0 480 1440 420" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
<path d="M226 676 Q720 520 1236 656" stroke="#FFB238" stroke-width="2" stroke-dasharray="2 10" stroke-linecap="round" fill="none" opacity=".35"/>
<path d="M0 760 L0 640 L70 640 L70 600 L150 600 L150 650 L230 650 L230 580 L300 580 L300 630 L380 630 L380 612 L1060 612 L1060 590 L1130 590 L1130 540 L1210 540 L1210 600 L1290 600 L1290 560 L1360 560 L1360 620 L1440 620 L1440 760 Z" fill="#141134"/>
<g fill="#FFB238" opacity=".75"><rect x="90" y="616" width="9" height="11"/><rect x="110" y="616" width="9" height="11" opacity=".4"/><rect x="250" y="598" width="9" height="11"/><rect x="320" y="646" width="9" height="11" opacity=".4"/><rect x="1150" y="560" width="9" height="11"/><rect x="1170" y="580" width="9" height="11" opacity=".4"/><rect x="1310" y="580" width="9" height="11"/><rect x="1080" y="606" width="9" height="11" opacity=".5"/></g>
<path d="M0 900 L0 700 L330 700 L330 718 L1110 718 L1110 690 L1440 690 L1440 900 Z" fill="#100D2B"/>
<rect x="0" y="697" width="330" height="5" fill="#34296B"/><rect x="1110" y="687" width="330" height="5" fill="#34296B"/>
<g transform="translate(190 700)"><path d="M-26 0 Q-30 -30 -20 -40 L-24 -64 L-10 -50 Q0 -53 10 -50 L24 -64 L20 -40 Q30 -30 26 0 Z" fill="#0B0A18" stroke="#9D6BFF" stroke-width="2" stroke-linejoin="round"/>
<path d="M-14 -34 Q-9 -38 -4 -34 Q-9 -31 -14 -34 Z M4 -34 Q9 -38 14 -34 Q9 -31 4 -34 Z" fill="#FFB238"/><path d="M-22 -16 Q0 -6 22 -16 L23 -8 Q0 4 -23 -8 Z" fill="#FF2E88"/><path d="M26 -4 Q52 -2 56 -24" stroke="#0B0A18" stroke-width="7" stroke-linecap="round" fill="none"/></g>
<g transform="translate(${state === 'caught' ? 262 : 1270} ${state === 'caught' ? 700 : 690}) scale(${state === 'caught' ? 1.1 : 1.6})"><circle cx="-14" cy="-16" r="9" fill="#FFB238"/><circle cx="-14" cy="-16" r="16" fill="#FFB238" opacity=".18"/><text x="-14" y="-12" text-anchor="middle" font-family="Audiowide, sans-serif" font-size="10" fill="#6B4A10">?</text>${state === 'caught' ? '' : `
<path d="M-10 0 L-4 -36 L14 -36 L20 0 Z" fill="#3B2A6B" stroke="#9D6BFF" stroke-width="1.2"/><circle cx="5" cy="-42" r="8" fill="#1A1530" stroke="#9D6BFF" stroke-width="1.2"/><rect x="-2" y="-45" width="14" height="4.5" rx="2" fill="#F4E7C3"/>
<rect x="-9" y="-52" width="28" height="3.5" rx="1.75" fill="#1A1530" stroke="#9D6BFF" stroke-width="1.2"/><path d="M-2 -51 Q5 -62 12 -51 Z" fill="#1A1530" stroke="#9D6BFF" stroke-width="1.2"/>`}</g></svg>`;

/**
 * ctx: { night, state: 'new' | 'started' | 'caught' | 'away', score?, title?, leap? ('4.0 m' | null), pct? (null until stats load),
 *        countdown?, soundOn }
 */
export function homeHTML(ctx) {
  const played = ctx.state === 'caught' || ctx.state === 'away';
  const caught = ctx.state === 'caught';
  const eyebrow = played ? `NIGHT #${ctx.night} · ${caught ? 'CAUGHT' : 'ESCAPED'}` : `NIGHT #${ctx.night}`;
  const meta = [ctx.leap ? `Leapt ${ctx.leap}` : '', ctx.pct != null ? `better than ${ctx.pct}%` : ''].filter(Boolean).join(' · ');
  const scoreCard = played ? `<div class="hm-card hm-score">
      <div class="hm-score-n">${numHTML(Number(String(ctx.score).replace(/,/g, '')))}</div>
      <div class="hm-score-t">${escapeHTML(ctx.title)}</div>
      ${meta ? `<div class="hm-score-m" id="hmMeta">${meta}</div>` : '<div class="hm-score-m" id="hmMeta"></div>'}</div>` : '';
  const next = (cls) => played ? `<div class="hm-card hm-next ${cls}"><div class="hm-next-k">NEXT THIEF IN</div><div class="hm-next-n hm-count">${ctx.countdown}</div></div>` : '';
  const primary = played
    ? `<button class="hm-cta hm-cta--ghost" id="resultsBtn">TONIGHT’S RESULTS ▸</button>`
    : `<button class="hm-cta" id="beginBtn">${ctx.state === 'started' ? 'CONTINUE THE CHASE ▸' : 'BEGIN THE CHASE ▸'}</button><p class="hm-hint">5 clues · one pounce · new thief at midnight<span class="hm-enter"> · press Enter to start</span></p>`;
  return `
  <main class="screen home2 home2--${ctx.state}">
    <svg class="hm-stars" viewBox="0 0 640 400" preserveAspectRatio="xMidYMin slice" aria-hidden="true">${starsSVG(0, 0, 640, 400, 46, 5)}</svg>
    ${CITY_PHONE(!caught)}${CITY_DESK(caught ? 'caught' : 'open')}
    <header class="hm-bar">
      <button class="hm-icon hm-help" id="howBtn" aria-label="How to play"><span class="hm-q">?</span><span class="hm-help-t"> How to play</span></button>
      <button class="hm-icon" id="soundBtn" aria-label="${ctx.soundOn ? 'Sound on' : 'Sound off'}" aria-pressed="${ctx.soundOn}">${SOUND_ICON(ctx.soundOn)}</button>
    </header>
    <div class="hm-main">
      <div class="hm-logo">${logoHTML()}</div>
      <p class="hm-eyebrow hm-eyebrow--${ctx.state}">${eyebrow}</p>
      ${played ? '' : '<p class="hm-copy">A masked thief is loose on the rooftops.<br>Only your cat is watching.</p>'}
      ${played ? `<div class="hm-cards">${scoreCard}${next('hm-next--desk')}</div>` : ''}
    </div>
    <div class="hm-foot">
      ${next('hm-next--phone')}
      ${primary}
      <a class="hm-past" href="#past">Past nights →</a>
    </div>
  </main>`;
}
