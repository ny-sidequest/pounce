// Pixel-art building blocks. Everything is <rect>s on a 4px grid, flat colours, crispEdges. No images.

export const C = {
  night: '#0B0A1A', sky: '#120F2B', roof1: '#1C1A35', roof2: '#232042', line: '#3A3666',
  dim: '#5E5A8A', muted: '#8B86B8', moon: '#F4E7C3', amber: '#FFB238', neon: '#FF4F9A', shadow: '#05040C'
};

export function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

export const rect = (x, y, w, h, fill, attrs = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${attrs ? ' ' + attrs : ''}/>`;

/** 3x5 pixel font for the few glyphs drawn as art (sign, '?', z). */
const FONT = {
  O: ['111', '101', '101', '101', '111'], P: ['111', '101', '111', '100', '100'],
  E: ['111', '100', '110', '100', '111'], N: ['101', '111', '111', '101', '101'],
  '?': ['111', '001', '011', '000', '010'], z: ['111', '001', '010', '100', '111']
};

export function glyph(ch, x, y, cell, fill, attrs = '') {
  let out = '';
  FONT[ch].forEach((row, j) => {
    for (let i = 0; i < 3; i++) if (row[i] === '1') out += rect(x + i * cell, y + j * cell, cell, cell, fill, attrs);
  });
  return out;
}

export function stars(w, h, count, seed, maxY = h) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = Math.floor(r() * (w / 2)) * 2;
    const y = Math.floor(r() * (maxY / 2)) * 2;
    const size = r() > 0.82 ? 2 : 1;
    const tw = r() > 0.6;
    out += rect(x, y, size, size, C.moon, `opacity="${(0.35 + r() * 0.5).toFixed(2)}"${tw ? ` class="tw" style="animation-delay:${(r() * 6).toFixed(1)}s;animation-duration:${(3 + r() * 4).toFixed(1)}s"` : ''}`);
  }
  return out;
}

/** Crescent moon built from row spans: big circle minus an offset circle. R in cells. */
export function moon(cx, cy, R, cell = 4) {
  let out = '';
  const ox = R * 0.55, oy = -R * 0.25, ir = R * 0.92;
  for (let j = -R; j <= R; j++) {
    const half = Math.floor(Math.sqrt(R * R - j * j));
    let x1 = half;
    const dy = j - oy;
    const ih = ir * ir - dy * dy;
    if (ih > 0) x1 = Math.min(x1, Math.floor(ox - Math.sqrt(ih)));
    if (x1 >= -half) out += rect(cx + -half * cell, cy + j * cell, (x1 + half + 1) * cell, cell, C.moon);
  }
  return out;
}

export function neonSign(x, y) {
  const cell = 4;
  let out = rect(x - 4, y - 4, 4 * 16 + 4, 5 * cell + 8, C.shadow) + rect(x - 4, y - 4, 4 * 16 + 4, 2, C.line);
  'OPEN'.split('').forEach((ch, i) => { out += glyph(ch, x + i * 16, y, cell, C.neon); });
  return `<g class="neon">${out}</g>`;
}

/**
 * A skyline strip: buildings with chimneys, water tanks, antennae and flickering windows.
 * Returns markup in a w x h user space; buildings sit on the bottom edge.
 */
export function skyline({ w, h, seed, fill, minH = 24, maxH = 64, windows = 0.5, detail = true, from = 0, to = w }) {
  const r = rng(seed);
  let x = from;
  let out = '';
  while (x < to) {
    const bw = (6 + Math.floor(r() * 8)) * 4;
    const bh = (Math.floor(minH / 4) + Math.floor(r() * ((maxH - minH) / 4 + 1))) * 4;
    const top = h - bh;
    out += rect(x, top, bw, bh, fill);
    if (detail) {
      const k = r();
      if (k < 0.3) out += rect(x + 8, top - 8, 8, 8, fill); // chimney
      else if (k < 0.5) out += rect(x + 4, top - 8, 2, 8, fill) + rect(x + bw - 6, top - 8, 2, 8, fill) + rect(x + 2, top - 20, bw - 4, 12, fill) + rect(x + 6, top - 24, bw - 12, 4, fill); // water tank
      else if (k < 0.65) out += rect(x + bw / 2, top - 20, 2, 20, fill) + rect(x + bw / 2 - 6, top - 14, 14, 2, fill); // antenna
    }
    for (let wy = top + 8; wy < h - 8; wy += 12) {
      for (let wx = x + 6; wx < x + bw - 6; wx += 10) {
        if (r() < windows * 0.14) {
          const flick = r() < 0.4;
          out += rect(wx, wy, 4, 4, C.amber, `opacity=".5" class="win${flick ? ' flick' : ''}"${flick ? ` style="animation-delay:${(r() * 9).toFixed(1)}s;animation-duration:${(5 + r() * 9).toFixed(1)}s"` : ''}`);
        }
      }
    }
    x += bw + (r() < 0.4 ? 4 : 0);
  }
  return out;
}

/** Light rain: ~40 thin diagonal streaks, pure CSS motion. */
export function rainHTML(count = 40, seed = 7) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < count; i++) {
    out += `<i style="left:${(r() * 100).toFixed(1)}%;animation-delay:-${(r() * 6).toFixed(2)}s;animation-duration:${(2.6 + r() * 2.4).toFixed(2)}s"></i>`;
  }
  return `<div class="rain" aria-hidden="true">${out}</div>`;
}
