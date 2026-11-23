// Fixed-size header art for the results screen (one scene per outcome).
import { C, rect, stars, moon, rng } from './pixel.js';
import { catParts } from './cat.js';
import { thiefParts, maskParts } from './thief.js';

const W = 360;
const H = 150;

function sky() {
  return `<g>${stars(W, 110, 40, 77, 100)}</g><g transform="translate(250 14)">${moon(20, 22, 5)}</g>`;
}

function skylineBack(fill = C.roof2) {
  const r = rng(9);
  let out = '';
  let x = 0;
  while (x < W) {
    const w = (5 + Math.floor(r() * 6)) * 4;
    const h = 20 + Math.floor(r() * 5) * 4;
    out += rect(x, H - h, w, h, fill);
    x += w + (r() < 0.4 ? 4 : 0);
  }
  return out;
}

const at = (x, y, s, inner) => `<g transform="translate(${x} ${y}) scale(${s})">${inner}</g>`;

const KINDS = {
  // the cat sits on the unmasked thief; the mask lies on the roof beside them
  caught: () => `${sky()}${skylineBack()}
    ${rect(0, 118, W, 32, C.roof1)}${rect(0, 118, W, 4, C.line)}
    ${at(168, 118 - 12 * 4, 4, thiefParts('caught'))}
    ${at(172, 118 - 12 * 4 - 8 * 4 + 8, 4, catParts('proud'))}
    ${at(272, 118 - 16, 2, maskParts())}
    ${rect(96, 104, 4, 14, C.line)}${rect(88, 108, 20, 2, C.line)}`,
  // the cat in the bin; the thief's silhouette far away on the horizon
  away: () => `${sky()}${skylineBack()}
    ${rect(310, 92, 40, 28, C.roof2)}${at(322, 92 - 19 * 1.5 + 2, 1.5, thiefParts('run1'))}
    ${rect(0, 118, W, 32, C.shadow)}${rect(0, 118, W, 2, C.line)}
    ${rect(40, 126, 16, 2, C.line, 'opacity=".6"')}${rect(200, 126, 16, 2, C.line, 'opacity=".6"')}
    ${rect(60, 100, 34, 18, '#2E2C52')}${rect(48, 96, 24, 4, '#403D6E')}
    ${at(148, 118 - 10 * 4 + 14, 4, catParts('bin'))}
    ${rect(246, 106, 24, 12, '#2E2C52')}${rect(250, 98, 18, 10, '#403D6E')}`,
  // never pounced: the cat hides behind a chimney
  scaredy: () => `${sky()}${skylineBack()}
    ${rect(0, 118, W, 32, C.roof1)}${rect(0, 118, W, 4, C.line)}
    ${at(180, 118 - 10 * 4 + 4, 4, catParts('scaredy'))}
    ${rect(196, 70, 28, 48, C.roof1)}${rect(192, 66, 36, 6, C.line)}${rect(198, 74, 24, 2, C.roof2)}
    ${rect(310, 100, 4, 18, C.line)}`
};

export function resultsArt(kind) {
  return `<svg class="res-art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges" role="img" aria-label="${
    kind === 'caught' ? 'The cat sits on the unmasked thief' : kind === 'away' ? 'The cat sits in a bin while the thief escapes' : 'The cat hides behind a chimney'
  }">${(KINDS[kind] || KINDS.scaredy)()}</svg>`;
}
