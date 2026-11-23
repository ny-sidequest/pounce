// The thief: a tall figure in a long coat with the collar up and a wide-brimmed hat.
// A dark face with a pale mask band across the eyes (two eye-holes). A sack over one shoulder.
// The "?" floats above the hat as a small amber glyph. Nothing like the cat, nothing like a bird.
// Sprites are in cell units (12 wide); draw them inside an element scaled by the cell size.
import { C, rect, glyph } from './pixel.js';

export const MASK = '#CFC8E8';
const SACK = '#6B4A2A';
const SKIN = '#D9C9B0';

const shape = (list, fill = C.shadow) =>
  list.map(([x, y, w, h]) => rect(x - 0.5, y - 0.5, w + 1, h + 1, C.line)).join('') +
  list.map(([x, y, w, h]) => rect(x, y, w, h, fill)).join('');

const hat = (dx = 0, dy = 0) =>
  shape([[3 + dx, 0 + dy, 6, 3], [0 + dx, 3 + dy, 12, 1]]) + rect(3 + dx, 2 + dy, 6, 1, C.line);

/** the pale mask band across the eyes, with two eye-holes that sometimes glance back */
const maskBand = () =>
  `${rect(4, 5, 4, 2, MASK)}<g class="th-eyes">${rect(4.55, 5.35, 0.9, 1.1, C.shadow)}${rect(6.55, 5.35, 0.9, 1.1, C.shadow)}</g>`;

/** the floating "?" above the hat */
const qmark = (y = -8) =>
  `<g class="th-q">${glyph('?', 4.5, y, 1, C.amber)}</g>`;

const body = (legs) =>
  shape([[1, 9, 10, 3], [2, 12, 8, 7], [1, 16, 10, 4], [0, 19, 12, 2], [0, 10, 2, 8], [10, 10, 2, 8]]) + legs;

const POSES = {
  stand: {
    w: 12, h: 22,
    draw: () => `<g class="th-body">${body(shape([[3, 21, 2, 1], [7, 21, 2, 1]]))}
      ${shape([[9, 5, 3, 5]], SACK)}${rect(8, 9, 1, 4, SACK)}${rect(10, 4, 1, 1, SACK)}</g>
      <g class="th-head">${shape([[4, 4, 4, 5]])}${shape([[2, 5, 2, 6], [8, 5, 2, 6]])}${hat()}${maskBand()}</g>${qmark()}`
  },
  run1: {
    w: 12, h: 22,
    draw: () => `<g class="th-body">${shape([[2, 9, 9, 3], [2, 12, 8, 6], [1, 15, 9, 4], [0, 10, 2, 6], [10, 9, 2, 7]])}
      ${shape([[0, 19, 3, 3], [8, 18, 3, 3]])}${shape([[9, 5, 3, 5]], SACK)}</g>
      <g class="th-head" transform="translate(1 0)">${shape([[4, 4, 4, 5]])}${shape([[2, 5, 2, 6], [8, 5, 2, 6]])}${hat()}${maskBand()}</g>`
  },
  run2: {
    w: 12, h: 22,
    draw: () => `<g class="th-body">${shape([[2, 9, 9, 3], [2, 12, 8, 6], [1, 15, 9, 4], [0, 10, 2, 6], [10, 9, 2, 7]])}
      ${shape([[3, 19, 3, 3], [6, 19, 3, 3]])}${shape([[9, 6, 3, 5]], SACK)}</g>
      <g class="th-head" transform="translate(1 0)">${shape([[4, 4, 4, 5]])}${shape([[2, 5, 2, 6], [8, 5, 2, 6]])}${hat()}${maskBand()}</g>`
  },
  // sitting, unmasked and tied up with yarn; the hat is knocked askew
  caught: {
    w: 14, h: 14,
    draw: () => `${shape([[2, 7, 9, 7], [0, 8, 2, 5], [11, 8, 2, 5]])}
      ${shape([[10, 5, 3, 5]], SACK)}
      ${shape([[4, 3, 5, 5]], SKIN)}${rect(5, 4.6, 1, 1, C.shadow)}${rect(7, 4.6, 1, 1, C.shadow)}${rect(5.4, 6.4, 2.2, 0.7, C.shadow)}
      ${shape([[3, 0, 6, 2], [1, 2, 11, 1]])}
      ${rect(2, 9, 9, 1, C.neon)}${rect(2, 11, 9, 1, C.neon)}${rect(6, 9, 1, 3, C.neon)}${rect(11, 11, 2, 1, C.neon)}`
  }
};

export const thiefSize = (pose) => { const p = POSES[pose] || POSES.stand; return { w: p.w, h: p.h }; };
export const thiefParts = (pose = 'stand') => (POSES[pose] || POSES.stand).draw();

/** the loose mask on its own (for the flip-off animation and for lying on the roof) */
export const maskPiece = () =>
  `${shape([[0, 0, 6, 3]], MASK)}${rect(1, 1, 1.2, 1, C.shadow)}${rect(3.8, 1, 1.2, 1, C.shadow)}`;

/** Standalone thief <svg>; px is the size of one cell in CSS px. */
export function thiefSVG(pose = 'stand', px = 4, cls = '') {
  const { w, h } = thiefSize(pose);
  const top = pose === 'stand' ? -9 : -1;
  return `<svg class="thief thief--${pose} ${cls}" viewBox="-1 ${top} ${w + 2} ${h - top + 1}" width="${(w + 2) * px}" height="${(h - top + 1) * px}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${thiefParts(pose)}</svg>`;
}

/**
 * Head-and-shoulders portrait for posters and the unmasking card.
 * masked: pale mask band on a dark face. unmasked: a plain pale face.
 */
export function portraitSVG({ masked = true, px = 6, mark = masked } = {}) {
  const face = masked
    ? `${shape([[4, 5, 4, 5]])}${maskBand().replace('class="th-eyes"', 'class="th-eyes-static"')}`
    : `${shape([[4, 5, 4, 5]], SKIN)}${rect(4.7, 6.2, 0.9, 1, C.shadow)}${rect(6.4, 6.2, 0.9, 1, C.shadow)}${rect(5, 8.2, 2, 0.6, C.shadow)}`;
  const top = mark ? -8 : 0;
  return `<svg class="portrait" viewBox="-1 ${top - 1} 14 ${16 - top + 1}" width="${14 * px}" height="${(16 - top + 1) * px}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">
    ${shape([[0, 12, 12, 4], [2, 6, 2, 7], [8, 6, 2, 7]])}
    ${shape([[9, 6, 3, 6]], SACK)}
    ${face}
    ${hat(0, 1)}
    ${mark ? qmark(-8 + 1) : ''}
  </svg>`;
}
