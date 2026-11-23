// Results header art: one large scene per outcome, drawn from the character sprites (never cropped).
import { C, rect, stars, moon, rng } from './pixel.js';
import { CAT } from './sprite-cat.js';
import { THIEF, MASK } from './sprite-thief.js';
import { svgSprite } from './portraits.js';

const W = 360;
const H = 200;

const sky = () => `<g>${stars(W, 130, 46, 77, 120)}</g><g transform="translate(262 6)">${moon(20, 22, 5)}</g>`;

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

const KINDS = {
  // the cat sits smug on the tied-up thief; the mask lies on the roof beside them
  caught: () => `${sky()}${skylineBack()}
    ${rect(0, 160, W, 40, C.roof1)}${rect(0, 160, W, 5, C.line)}
    ${svgSprite(THIEF, 'tied', 0, 128, 160 - 44 * 2.7, 2.7)}
    ${svgSprite(CAT, 'sit_smug', 0, 122, 160 - 44 * 2.7 + 11 * 2.7 - 22 * 2.7, 2.7)}
    ${svgSprite(MASK, 'still', 0, 244, 148, 4)}`,
  // the cat in the bin; the thief stands on a distant rooftop, never floating in the sky
  away: () => `${sky()}${skylineBack()}
    ${rect(286, 114, 64, 50, C.roof1)}${rect(284, 112, 68, 5, C.line)}${rect(294, 124, 6, 6, C.amber, 'opacity=".5"')}${rect(318, 124, 6, 6, C.amber, 'opacity=".5"')}
    ${svgSprite(THIEF, 'sneak', 0, 303, 112 - 44 * 1.15 + 1, 1.15)}
    ${rect(0, 160, W, 40, C.shadow)}${rect(0, 160, W, 3, C.line)}
    ${rect(30, 178, 22, 3, C.line, 'opacity=".6"')}${rect(250, 178, 22, 3, C.line, 'opacity=".6"')}
    ${svgSprite(CAT, 'bin', 0, 118, 188 - 22 * 3.6, 3.6)}`,
  // never pounced: the cat hides behind a chimney
  scaredy: () => `${sky()}${skylineBack()}
    ${rect(0, 160, W, 40, C.roof1)}${rect(0, 160, W, 5, C.line)}
    ${svgSprite(CAT, 'title_scaredy', 0, 118, 160 - 22 * 3.4, 3.4)}
    ${rect(176, 96, 44, 64, C.roof1)}${rect(170, 90, 56, 8, C.line)}${rect(180, 104, 36, 3, C.roof2)}`
};

export function resultsArt(kind) {
  const label = kind === 'caught' ? 'The cat sits on the tied-up thief' : kind === 'away' ? 'The cat sits in a bin while the thief stands far away on a distant roof' : 'The cat hides behind a chimney';
  return `<svg class="res-art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax meet" shape-rendering="crispEdges" role="img" aria-label="${label}">${(KINDS[kind] || KINDS.scaredy)()}</svg>`;
}
