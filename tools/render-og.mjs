// Renders assets/og-image.png (1200 x 630) for link previews: the night sky, logo A centred, the cat on the left roof, the thief on the right roof.
// Usage: node tools/render-og.mjs   (needs `npm i -D @resvg/resvg-js`; run tools/outline-logo.mjs first). The PNG is committed.
import { readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const logo = readFileSync('assets/logo.svg', 'utf8');
const logoInner = logo.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/id="glow"/g, 'id="lgglow"').replace(/url\(#glow\)/g, 'url(#lgglow)');
const stars = [[90,60,1.6],[210,120,1.2],[130,250,1.3],[1060,50,1.6],[1130,170,1.2],[980,230,1.3],[60,330,1],[1160,300,1.3],[400,40,1],[820,36,1.1]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#F4E7C3" opacity=".7"/>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A1446"/><stop offset=".65" stop-color="#0B0920"/><stop offset="1" stop-color="#08071A"/></linearGradient>
<radialGradient id="halo" cx=".5" cy=".4" r=".5"><stop offset="0" stop-color="#FF2E88" stop-opacity=".14"/><stop offset="1" stop-color="#FF2E88" stop-opacity="0"/></radialGradient></defs>
<rect width="1200" height="630" fill="url(#sky)"/><rect width="1200" height="630" fill="url(#halo)"/>${stars}
<svg x="320" y="40" width="560" height="327" viewBox="40 20 480 280" overflow="visible">${logoInner}</svg>
<svg x="0" y="280" width="1200" height="350" viewBox="0 480 1440 420" preserveAspectRatio="xMidYMax meet">
<path d="M226 676 Q720 520 1236 656" stroke="#FFB238" stroke-width="2" stroke-dasharray="2 10" stroke-linecap="round" fill="none" opacity=".35"/>
<path d="M0 760 L0 640 L70 640 L70 600 L150 600 L150 650 L230 650 L230 580 L300 580 L300 630 L380 630 L380 612 L1060 612 L1060 590 L1130 590 L1130 540 L1210 540 L1210 600 L1290 600 L1290 560 L1360 560 L1360 620 L1440 620 L1440 760 Z" fill="#141134"/>
<g fill="#FFB238" opacity=".75"><rect x="90" y="616" width="9" height="11"/><rect x="250" y="598" width="9" height="11"/><rect x="1150" y="560" width="9" height="11"/><rect x="1310" y="580" width="9" height="11"/></g>
<path d="M0 900 L0 700 L330 700 L330 718 L1110 718 L1110 690 L1440 690 L1440 900 Z" fill="#100D2B"/><rect x="0" y="697" width="330" height="5" fill="#34296B"/><rect x="1110" y="687" width="330" height="5" fill="#34296B"/>
<g transform="translate(190 700)"><path d="M-26 0 Q-30 -30 -20 -40 L-24 -64 L-10 -50 Q0 -53 10 -50 L24 -64 L20 -40 Q30 -30 26 0 Z" fill="#0B0A18" stroke="#9D6BFF" stroke-width="2" stroke-linejoin="round"/>
<path d="M-14 -34 Q-9 -38 -4 -34 Q-9 -31 -14 -34 Z M4 -34 Q9 -38 14 -34 Q9 -31 4 -34 Z" fill="#FFB238"/><path d="M-22 -16 Q0 -6 22 -16 L23 -8 Q0 4 -23 -8 Z" fill="#FF2E88"/><path d="M26 -4 Q52 -2 56 -24" stroke="#0B0A18" stroke-width="7" stroke-linecap="round" fill="none"/></g>
<g transform="translate(1270 690) scale(1.6)"><circle cx="-14" cy="-16" r="9" fill="#FFB238"/><circle cx="-14" cy="-16" r="16" fill="#FFB238" opacity=".18"/>
<path d="M-10 0 L-4 -36 L14 -36 L20 0 Z" fill="#3B2A6B" stroke="#9D6BFF" stroke-width="1.2"/><circle cx="5" cy="-42" r="8" fill="#1A1530" stroke="#9D6BFF" stroke-width="1.2"/><rect x="-2" y="-45" width="14" height="4.5" rx="2" fill="#F4E7C3"/>
<rect x="-9" y="-52" width="28" height="3.5" rx="1.75" fill="#1A1530" stroke="#9D6BFF" stroke-width="1.2"/><path d="M-2 -51 Q5 -62 12 -51 Z" fill="#1A1530" stroke="#9D6BFF" stroke-width="1.2"/></g></svg></svg>`;
writeFileSync('assets/og-image.png', new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng());
console.log('wrote assets/og-image.png');
