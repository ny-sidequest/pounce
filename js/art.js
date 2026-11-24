// Results header art: one large vector scene per outcome, drawn from the same rigs as the game (never cropped).
import { COL, starsSVG, skylineLayer, moonSVG, windowSVG, rng } from './world.js';
import { portrait, caughtPair } from './portraits.js';
import { maskShape } from './rig-thief.js';
import { el } from './svgx.js';

const W = 360;
const H = 200;

const sky = () => `<rect width="${W}" height="${H}" fill="url(#sky)"/>${starsSVG(0, 0, W, 130, 60, 77)}<g transform="translate(300 34)">${moonSVG(16)}</g>
  ${skylineLayer({ x0: -20, x1: W + 20, base: 168, seed: 9, fill: '#322C63', opacity: 0.75, minH: 36, maxH: 84, minW: 24, maxW: 44, rim: true })}
  ${skylineLayer({ x0: -20, x1: W + 20, base: 172, seed: 31, fill: '#252052', opacity: 0.95, minH: 20, maxH: 56, minW: 20, maxW: 40, windows: 0.1 })}`;
const nest = (svg, x, y) => svg.replace('<svg ', `<svg x="${x}" y="${y}" overflow="visible" `);
const roof = (y) => `<rect x="0" y="${y}" width="${W}" height="${H - y}" fill="url(#gBld)"/><rect x="0" y="${y}" width="${W}" height="4" fill="#3E3874"/><rect x="0" y="${y}" width="${W}" height="1.4" fill="#8F89D0" opacity=".7"/>`;
const maskOnRoof = (x, y, s) => { const t = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); const g = maskShape(t, { transform: `translate(${x} ${y}) rotate(-8) scale(${s})` }); return g.outerHTML; };

const KINDS = {
  // the cat sits smug on the tied-up thief; the mask lies on the roof beside them
  caught: () => `${sky()}${roof(166)}${nest(caughtPair(150), 98, 24)}${maskOnRoof(262, 160, 1.3)}`,
  // the cat in the bin; the thief stands on a distant rooftop, never floating in the sky
  away: () => {
    const r = rng(4); let wins = '';
    for (let y = 126; y < 150; y += 14) for (let x = 296; x < 340; x += 16) wins += windowSVG(x, y, 8, 9, r, 0.7);
    return `${sky()}
    <rect x="286" y="112" width="64" height="60" rx="2" fill="url(#gBld)"/><rect x="286" y="112" width="64" height="4" rx="2" fill="#3E3874"/>${wins}
    ${nest(portrait('thief', 'sneak', 52), 304, 62)}
    <rect x="0" y="168" width="${W}" height="${H - 168}" fill="url(#gGround)"/><rect x="0" y="168" width="${W}" height="2.4" fill="#4A4488"/>
    <ellipse cx="90" cy="186" rx="40" ry="5" fill="#FF4F9A" opacity=".18"/>
    ${nest(portrait('cat', 'title_bin', 100), 112, 78)}`;
  },
  // never pounced: the cat hides behind a chimney
  scaredy: () => `${sky()}${roof(166)}
    ${nest(portrait('cat', 'title_scaredy', 96), 108, 76)}
    <rect x="176" y="96" width="46" height="72" rx="3" fill="#1B1838"/><rect x="170" y="90" width="58" height="9" rx="3" fill="#3E3874"/><rect x="180" y="106" width="38" height="3" rx="1.5" fill="#2A2552"/>`
};

export function resultsArt(kind) {
  const label = kind === 'caught' ? 'The cat sits on the tied-up thief' : kind === 'away' ? 'The cat sits in a bin while the thief stands far away on a distant roof' : 'The cat hides behind a chimney';
  return `<svg class="res-art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax meet" role="img" aria-label="${label}">${(KINDS[kind] || KINDS.scaredy)()}</svg>`;
}
