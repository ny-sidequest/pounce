// The thief: a pixel silhouette of a person, nothing like the cat.
// Long coat, wide-brimmed hat, a pale mask with two eye-holes (and the "?" on it), a sack over one shoulder.
// Sprites are in cell units (12 wide); draw them inside an element scaled by the cell size.
import { C, rect, glyph } from './pixel.js';

export const MASK = '#CFC8E8';
const SACK = '#5A3E24';

const shape = (list, fill = C.shadow) =>
  list.map(([x, y, w, h]) => rect(x - 0.5, y - 0.5, w + 1, h + 1, C.line)).join('') +
  list.map(([x, y, w, h]) => rect(x, y, w, h, fill)).join('');

const hat = (dx = 0, dy = 0) => shape([[3 + dx, 0 + dy, 6, 3], [0 + dx, 3 + dy, 12, 1]]) + rect(3 + dx, 2 + dy, 6, 1, C.line);

/** the mask on the face: pale plate, two dark eye-holes (which glance), the question mark */
export const maskParts = () =>
  `${rect(3, 4, 6, 8, MASK)}
   <g class="th-eyes">${rect(4, 5, 1, 1, C.shadow)}${rect(7, 5, 1, 1, C.shadow)}</g>
   ${glyph('?', 4.5, 7, 1, C.amber)}`;

const coat = (legs) => {
  const body = shape([[2, 12, 8, 6], [1, 14, 10, 4], [0, 12, 2, 5], [10, 12, 2, 5]]);
  return body + legs;
};

const POSES = {
  stand: {
    w: 12, h: 19,
    draw: () => `<g class="th-body">${coat(shape([[3, 18, 2, 1], [7, 18, 2, 1]]))}
      ${shape([[9, 8, 3, 5]], SACK)}${rect(8, 11, 1, 3, SACK)}</g>
      <g class="th-head">${shape([[3, 4, 6, 8]])}${hat()}${maskParts()}</g>`
  },
  run1: {
    w: 12, h: 19,
    draw: () => `<g class="th-body">${shape([[2, 12, 8, 5], [1, 14, 9, 3], [0, 12, 2, 4], [9, 11, 3, 4]])}
      ${shape([[1, 17, 3, 2], [8, 16, 3, 2]])}${shape([[9, 7, 3, 5]], SACK)}</g>
      <g class="th-head" transform="translate(1 0)">${shape([[3, 4, 6, 8]])}${hat()}${maskParts()}</g>`
  },
  run2: {
    w: 12, h: 19,
    draw: () => `<g class="th-body">${shape([[2, 12, 8, 5], [1, 14, 9, 3], [0, 12, 2, 4], [9, 11, 3, 4]])}
      ${shape([[3, 17, 3, 2], [6, 17, 3, 2]])}${shape([[9, 8, 3, 5]], SACK)}</g>
      <g class="th-head" transform="translate(1 0)">${shape([[3, 4, 6, 8]])}${hat()}${maskParts()}</g>`
  },
  // sitting, unmasked and tied up with yarn; hat knocked askew
  caught: {
    w: 14, h: 12,
    draw: () => `${shape([[2, 5, 9, 7], [0, 7, 2, 4], [11, 7, 2, 4]])}
      ${shape([[9, 3, 3, 4]], SACK)}
      ${shape([[3, 0, 7, 6]], '#CFC8E8')}${rect(5, 2, 1, 1, C.shadow)}${rect(8, 2, 1, 1, C.shadow)}${rect(5, 4, 3, 1, C.shadow)}
      ${shape([[2, 0, 6, 2], [0, 2, 10, 1]])}
      ${rect(2, 7, 9, 1, C.neon)}${rect(2, 9, 9, 1, C.neon)}${rect(6, 7, 1, 3, C.neon)}${rect(11, 9, 2, 1, C.neon)}`
  }
};

export const thiefSize = (pose) => { const p = POSES[pose] || POSES.stand; return { w: p.w, h: p.h }; };
export const thiefParts = (pose = 'stand') => (POSES[pose] || POSES.stand).draw();

/** Standalone thief <svg>; px is the size of one cell in CSS px. */
export function thiefSVG(pose = 'stand', px = 4, cls = '') {
  const { w, h } = thiefSize(pose);
  return `<svg class="thief thief--${pose} ${cls}" viewBox="-1 -1 ${w + 2} ${h + 2}" width="${(w + 2) * px}" height="${(h + 2) * px}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${thiefParts(pose)}</svg>`;
}
