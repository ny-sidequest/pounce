// Results header art: one large scene per outcome (no thumbnails).
import { C, rect, stars, moon, rng } from './pixel.js';
import { catParts } from './cat.js';
import { thiefParts, maskPiece } from './thief.js';

const W = 360;
const H = 200;

function sky() {
  return `<g>${stars(W, 130, 46, 77, 120)}</g><g transform="translate(262 6)">${moon(20, 22, 5)}</g>`;
}

function skylineBack() {
  const r = rng(9);
  let out = '';
  let x = -20;
  while (x < W + 20) {
    const w = (5 + Math.floor(r() * 6)) * 4;
    const h = 36 + Math.floor(r() * 9) * 4;
    out += rect(x, 160 - h, w, h, C.roof2);
    x += w + (r() < 0.4 ? 4 : 0);
  }
  return out;
}

const at = (x, y, s, inner) => `<g transform="translate(${x} ${y}) scale(${s})">${inner}</g>`;

const KINDS = {
  // the cat sits on the unmasked thief; the mask lies on the roof beside them
  caught: () => `${sky()}${skylineBack()}
    ${rect(0, 160, W, 40, C.roof1)}${rect(0, 160, W, 5, C.line)}
    ${at(124, 160 - 14 * 6, 6, thiefParts('caught'))}
    ${at(120, 160 - 14 * 6 - 8 * 5 + 10, 5, catParts('proud'))}
    ${at(236, 160 - 16, 4, maskPiece())}
    ${rect(40, 130, 6, 30, C.line)}${rect(28, 138, 30, 3, C.line)}`,
  // the cat in the bin; the thief's silhouette far away on the horizon
  away: () => `${sky()}${skylineBack()}
    ${rect(296, 112, 52, 48, C.roof2)}${at(310, 112 - 22 * 2.4 + 2, 2.4, thiefParts('run1'))}
    ${rect(0, 160, W, 40, C.shadow)}${rect(0, 160, W, 3, C.line)}
    ${rect(30, 176, 22, 3, C.line, 'opacity=".6"')}${rect(250, 176, 22, 3, C.line, 'opacity=".6"')}
    ${rect(40, 134, 40, 26, '#2E2C52')}${rect(34, 128, 52, 6, '#403D6E')}
    ${at(130, 196 - 10 * 6, 6, catParts('bin'))}
    ${rect(258, 140, 34, 20, '#2E2C52')}${rect(262, 130, 26, 10, '#403D6E')}`,
  // never pounced: the cat hides behind a chimney
  scaredy: () => `${sky()}${skylineBack()}
    ${rect(0, 160, W, 40, C.roof1)}${rect(0, 160, W, 5, C.line)}
    ${at(120, 160 - 10 * 6 + 6, 6, catParts('scaredy'))}
    ${rect(158, 84, 44, 76, C.roof1)}${rect(152, 78, 56, 8, C.line)}${rect(162, 92, 36, 3, C.roof2)}
    ${rect(300, 130, 6, 30, C.line)}${rect(288, 140, 30, 3, C.line)}`
};

export function resultsArt(kind) {
  const label = kind === 'caught' ? 'The cat sits on the unmasked thief' : kind === 'away' ? 'The cat sits in a bin while the thief escapes' : 'The cat hides behind a chimney';
  return `<svg class="res-art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges" role="img" aria-label="${label}">${(KINDS[kind] || KINDS.scaredy)()}</svg>`;
}
