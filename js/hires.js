// Hi-bit rendering helpers.
// Characters are DRAWN at 8x the old unit (smooth ellipses, lines, polygons) in a `Hi` grid, then DOWNSAMPLED
// 4:1 by area coverage into a final grid at 2x the old resolution. Partial coverage becomes an in-between tone,
// so curves read as smooth arcs instead of stairs. Then: form shading (light from the upper-left),
// a 1px moon rim, and crisp details drawn at the final resolution.
import { Grid } from './sprites.js';

export const HI = 8;     // hi-res cells per old unit
export const BLOCK = 4;  // hi-res cells per output pixel  => output = 2 px per old unit

const GLYPHS = {
  '?': ['111', '001', '011', '000', '010'],
  '!': ['1', '1', '1', '0', '1'],
  z: ['111', '001', '010', '100', '111'],
  '*': ['010', '111', '010']
};

/** Same drawing API as Grid, but coordinates are in OLD units and everything is rasterised at HI x. */
export class Hi {
  constructor(w, h) {
    this.f = HI;
    this.w = w;
    this.h = h;
    this.g = new Grid(w * HI, h * HI);
    this.meta = {};
  }
  set(x, y, c) { this.g.rect(Math.round(x * this.f), Math.round(y * this.f), this.f, this.f, c); return this; }
  rect(x, y, w, h, c) { this.g.rect(Math.round(x * this.f), Math.round(y * this.f), Math.round(w * this.f), Math.round(h * this.f), c); return this; }
  ellipse(cx, cy, rx, ry, c) { this.g.ellipse(cx * this.f, cy * this.f, rx * this.f, ry * this.f, c); return this; }
  line(x0, y0, x1, y1, c, w = 1) { this.g.line(x0 * this.f, y0 * this.f, x1 * this.f, y1 * this.f, c, Math.max(1, Math.round(w * this.f))); return this; }
  poly(pts, c) { this.g.poly(pts.map(([x, y]) => [x * this.f, y * this.f]), c); return this; }
  glyph(ch, x, y, c) {
    GLYPHS[ch].forEach((row, j) => [...row].forEach((v, i) => { if (v === '1') this.set(x + i, y + j, c); }));
    return this;
  }
  rim() { return this; } // the rim is applied after downsampling
}

/**
 * Area-coverage downsample. Dominant character of the 4x4 block wins when it covers >= half the block;
 * otherwise partial coverage becomes the anti-alias tone `aa` (so ear tips, backs and tails get a soft edge).
 */
export function downsample(hiGrid, aa = 'a') {
  const g = hiGrid.g;
  const out = new Grid(g.w / BLOCK, g.h / BLOCK);
  for (let by = 0; by < out.h; by++) {
    for (let bx = 0; bx < out.w; bx++) {
      const counts = {};
      let filled = 0;
      for (let j = 0; j < BLOCK; j++) {
        const row = g.d[by * BLOCK + j];
        for (let i = 0; i < BLOCK; i++) {
          const ch = row[bx * BLOCK + i];
          if (ch !== '.') { counts[ch] = (counts[ch] || 0) + 1; filled++; }
        }
      }
      if (!filled) continue;
      let best = null; let bc = 0;
      for (const [ch, n] of Object.entries(counts)) if (n > bc) { best = ch; bc = n; }
      if (filled >= 9) out.d[by][bx] = best;            // mostly covered: the dominant tone
      else if (filled >= 4) out.d[by][bx] = aa;         // an edge pixel: the in-between tone
    }
  }
  return out;
}

/**
 * Form shading for one family of body pixels (light from the upper-left): a smooth ramp inward from the
 * upper-left silhouette edge, e.g. ramp = [[1,'H'],[3,'h'],[6,'b']] (distance in pixels -> tone);
 * anything deeper, and the lower-right side, keeps the base (darkest) tone.
 */
export function shade(g, bodyChars, { base, ramp, shadeCh = null }) {
  const isBody = (x, y) => bodyChars.includes(g.get(x, y));
  const cells = [];
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      if (g.d[y][x] !== base) continue;
      let ul = 0;
      while (ul < 9 && isBody(x - ul - 1, y - ul - 1)) ul++;
      let lr = 0;
      while (lr < 3 && isBody(x + lr + 1, y + lr + 1)) lr++;
      let tone = base;
      if (lr >= 2 || ul >= 1) { for (const [d, t] of ramp) { if (ul <= d) { tone = t; break; } } }
      if (lr <= 1 && ul > 1) tone = shadeCh || base; // the lower-right side stays dark
      cells.push([x, y, tone]);
    }
  }
  cells.forEach(([x, y, t]) => { g.d[y][x] = t; });
  return g;
}

/** Soft glow rings (two tones) on empty pixels around any pixel of `around`. */
export function glowRings(g, around, tone1, tone2, r1 = 2, r2 = 4) {
  const src = [];
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (around.includes(g.d[y][x])) src.push([x, y]);
  const marks = [];
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      if (g.d[y][x] !== '.') continue;
      let dmin = 99;
      for (const [sx, sy] of src) { const d = Math.abs(sx - x) + Math.abs(sy - y); if (d < dmin) { dmin = d; if (d <= 1) break; } }
      if (dmin <= r1) marks.push([x, y, tone1]);
      else if (dmin <= r2) marks.push([x, y, tone2]);
    }
  }
  marks.forEach(([x, y, t]) => { g.d[y][x] = t; });
}
