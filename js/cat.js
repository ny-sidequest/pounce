// The pixel cat: a black silhouette with amber eyes, side-on, facing right.
// Sprites are lists of rects in cell units. Each is drawn twice (a thin rim, then the fill)
// so the silhouette reads against dark rooftops.
import { C, rect, glyph } from './pixel.js';

const BOX = '#7A4E2A', BOX_HI = '#A06A38', BIN = '#4A4870', BIN_HI = '#6B6896', PEEL = '#F2D13D', PEEL_D = '#B8962A';

const shape = (list, fill = C.shadow) =>
  list.map(([x, y, w, h]) => rect(x - 0.5, y - 0.5, w + 1, h + 1, C.line)).join('') +
  list.map(([x, y, w, h]) => rect(x, y, w, h, fill)).join('');

const eyes = (list, fill = C.amber) => `<g class="c-eyes">${list.map(([x, y, w, h]) => rect(x, y, w, h, fill)).join('')}</g>`;

// base crouched body (16 x 8 cells)
const CROUCH = {
  tail: [[0, 3, 1, 3], [0, 5, 2, 1]],
  rear: [[1, 4, 3, 3]],
  body: [[2, 5, 8, 2], [2, 7, 2, 1], [8, 7, 3, 1]],
  head: [[10, 3, 5, 3], [10, 1, 1, 2], [14, 1, 1, 2]]
};

function crouchParts({ eyeMarkup, headT = '', extra = '' } = {}) {
  return `<g class="c-tail">${shape(CROUCH.tail)}</g>
    <g class="c-rear">${shape(CROUCH.rear)}</g>
    ${shape(CROUCH.body)}
    <g class="c-head"${headT ? ` transform="${headT}"` : ''}>${shape(CROUCH.head)}${eyeMarkup ?? eyes([[11, 4, 1, 1], [13, 4, 1, 1]])}</g>${extra}`;
}

const POSES = {
  crouch: { w: 16, h: 8, draw: () => crouchParts() },
  wiggle: { w: 16, h: 8, draw: () => crouchParts({ eyeMarkup: eyes([[11, 4, 1, 1], [13, 4, 1, 1]]) }) },
  land: { w: 16, h: 8, draw: () => crouchParts() },
  leap: {
    w: 19, h: 8,
    draw: () => `<g class="c-tail">${shape([[0, 2, 3, 1]])}</g>
      ${shape([[3, 3, 9, 2], [2, 3, 2, 3], [0, 5, 4, 1], [13, 5, 5, 1]])}
      <g class="c-head">${shape([[12, 2, 5, 3], [12, 0, 1, 2], [16, 0, 1, 2]])}${eyes([[13, 3, 1, 1], [15, 3, 1, 1]])}</g>`
  },
  fall: {
    w: 19, h: 8,
    draw: () => `<g class="c-tail">${shape([[0, 1, 3, 1], [0, 2, 1, 2]])}</g>
      ${shape([[3, 3, 9, 2], [2, 2, 2, 3], [0, 4, 4, 1], [13, 1, 5, 1]])}
      <g class="c-head">${shape([[12, 2, 5, 3], [12, 0, 1, 2], [16, 0, 1, 2]])}${eyes([[13, 2, 2, 2], [15, 2, 1, 2]])}</g>`
  },
  // ---- title poses ----
  psychic: {
    w: 16, h: 9,
    draw: () => crouchParts({
      eyeMarkup: `<g class="c-halo">${rect(9.5, 2.5, 6, 4, C.amber, 'opacity=".16"')}${rect(10.5, 3, 4, 3, C.amber, 'opacity=".2"')}</g>
        <g class="c-eyes">${rect(11, 3.5, 1, 2, C.amber)}${rect(13, 3.5, 1, 2, C.amber)}</g>`,
      extra: `<g class="c-spark">${rect(15, 0, 1, 1, C.amber)}${rect(7, 0, 1, 1, C.moon)}${rect(3, 1, 1, 1, C.amber)}</g>`
    })
  },
  genius: {
    w: 16, h: 8,
    draw: () => crouchParts({
      eyeMarkup: `${rect(10.5, 3.6, 2, 1.2, C.muted)}${rect(12.8, 3.6, 2, 1.2, C.muted)}${rect(12.5, 3.9, 0.5, 0.5, C.muted)}${rect(11, 3.6, 0.5, 0.5, C.moon)}${rect(13.3, 3.6, 0.5, 0.5, C.moon)}`
    })
  },
  curious: {
    w: 16, h: 9,
    draw: () => crouchParts({
      headT: 'rotate(-16 11 5.5)',
      eyeMarkup: eyes([[11, 4, 1, 2], [13, 4, 1, 2]]),
      extra: `<g class="c-spark">${glyph('?', 12.5, -3, 1, C.amber)}</g>`
    })
  },
  sleepy: {
    w: 16, h: 9,
    draw: () => crouchParts({
      eyeMarkup: `${rect(11, 4.4, 1.2, 0.5, C.moon)}${rect(13, 4.4, 1.2, 0.5, C.moon)}`,
      extra: `<g class="c-z">${glyph('z', 13, -3, 0.6, C.amber)}${glyph('z', 16, -5, 0.45, C.amber)}</g>`
    })
  },
  box: {
    w: 16, h: 9,
    draw: () => `<g class="c-tail">${shape([[1, 3, 1, 3]])}</g>
      <g class="c-head">${shape([[6, 1, 5, 4], [6, -1, 1, 2], [10, -1, 1, 2]])}${eyes([[7, 2, 1, 1], [9, 2, 1, 1]])}</g>
      ${rect(1, 4, 14, 5, BOX)}${rect(1, 4, 14, 1, BOX_HI)}${rect(1, 8, 14, 1, '#5A3A1E')}${rect(7, 4, 2, 5, '#C9A56A')}${rect(0, 3, 4, 1, BOX_HI)}${rect(12, 3, 4, 1, BOX_HI)}`
  },
  bin: {
    w: 16, h: 10,
    draw: () => `<g class="c-head">${shape([[5, 1, 5, 4], [5, -1, 1, 2], [9, -1, 1, 2]])}${eyes([[6, 2, 1, 1], [8, 2, 1, 1]])}
        ${rect(5, 0, 5, 1, PEEL)}${rect(9, -1, 3, 1, PEEL)}${rect(11, 0, 1, 2, PEEL)}${rect(5, 1, 1, 1, PEEL_D)}${rect(11, 2, 1, 1, PEEL_D)}</g>
      ${rect(2, 5, 11, 5, BIN)}${rect(2, 5, 11, 1, BIN_HI)}${rect(2, 9, 11, 1, C.line)}${rect(4, 6, 1, 4, C.line)}${rect(7, 6, 1, 4, C.line)}${rect(10, 6, 1, 4, C.line)}${rect(1, 4, 13, 1, BIN_HI)}${rect(12, 3, 3, 1, BIN_HI)}`
  },
  scaredy: {
    w: 16, h: 10,
    draw: () => `<g class="c-tail">${shape([[0, 2, 2, 5], [0, 1, 1, 1]])}</g>
      ${shape([[2, 4, 9, 4], [3, 3, 7, 1], [4, 2, 5, 1], [2, 8, 2, 2], [9, 8, 2, 2]])}
      ${shape([[4, 1, 1, 1], [6, 1, 1, 1], [8, 1, 1, 1], [3, 2, 1, 1], [9, 2, 1, 1]])}
      <g class="c-head">${shape([[10, 5, 5, 4], [10, 3, 1, 2], [14, 3, 1, 2]])}${eyes([[11, 6, 1, 2], [13, 6, 1, 2]])}</g>`
  }
};

export const POSE_NAMES = Object.keys(POSES);

/** Inner markup in cell units (wrap in an element scaled by the cell size). */
export function catParts(pose) {
  return (POSES[pose] || POSES.crouch).draw();
}
export const catSize = (pose) => {
  const p = POSES[pose] || POSES.crouch;
  return { w: p.w, h: p.h };
};

/** Standalone cat <svg>; px is the size of one cell in CSS px. */
export function catSVG(pose = 'crouch', px = 6, cls = '') {
  const { w, h } = catSize(pose);
  const top = -6;
  return `<svg class="cat cat--${pose} ${cls}" viewBox="-1 ${top} ${w + 2} ${h - top + 1}" width="${(w + 2) * px}" height="${(h - top + 1) * px}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${catParts(pose)}</svg>`;
}
