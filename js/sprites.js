// Frame-based sprite system.
//  * A FRAME is an array of strings, one character per pixel, mapped to colours by a palette.
//  * A SPRITE is { id, size:[w,h], palette, anims:{ name:{ fps, loop, frames:[rows,...] } } }.
//  * Frames are drawn to a <canvas> at integer scale (imageSmoothingEnabled = false) and cached as ImageBitmaps.
//  * SpritePlayer plays animations: play(name, {onFrame, onComplete, flip}).
// The Grid class is a tiny raster toolkit used to build frames in code (ellipses, lines, polygons, glyphs).

/* ------------------------------------------------------------------ raster grid */
export class Grid {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.d = Array.from({ length: h }, () => Array(w).fill('.'));
  }
  set(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && x < this.w && y >= 0 && y < this.h) this.d[y][x] = c;
    return this;
  }
  get(x, y) { return x >= 0 && x < this.w && y >= 0 && y < this.h ? this.d[y][x] : '.'; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); return this; }
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / (rx + 0.45);
        const dy = (y - cy) / (ry + 0.45);
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
    }
    return this;
  }
  /** thick line (w x w square brush along the segment) */
  line(x0, y0, x1, y1, c, w = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    const off = Math.floor((w - 1) / 2);
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = y0 + ((y1 - y0) * i) / n;
      for (let a = 0; a < w; a++) for (let b = 0; b < w; b++) this.set(x - off + a, y - off + b, c);
    }
    return this;
  }
  /** filled polygon (even-odd, sampled at pixel centres) */
  poly(pts, c) {
    const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i]; const [xj, yj] = pts[j];
          if ((yi > y + 0.5) !== (yj > y + 0.5) && x + 0.5 < ((xj - xi) * (y + 0.5 - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) this.set(x, y, c);
      }
    }
    return this;
  }
  /** overlay a block of strings ('.' and ' ' are transparent) */
  stamp(rows, x, y) {
    rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.' && ch !== ' ') this.set(x + i, y + j, ch); }));
    return this;
  }
  glyph(ch, x, y, c) { return this.stamp(GLYPHS[ch].map((r) => r.replace(/1/g, c).replace(/0/g, '.')), x, y); }
  /** replace one character with another (for palette swaps like flash frames) */
  replace(from, to) { this.d = this.d.map((r) => r.map((ch) => (ch === from ? to : ch))); return this; }
  /** 1px outer outline around the given body characters: lighter (m) on the moon side (top/left), darker (o) elsewhere */
  rim(bodyChars, light = 'm', dark = 'o') {
    const body = (x, y) => bodyChars.includes(this.get(x, y));
    const out = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.d[y][x] !== '.') continue;
        if (body(x + 1, y) || body(x, y + 1)) out.push([x, y, light]);
        else if (body(x - 1, y) || body(x, y - 1)) out.push([x, y, dark]);
      }
    }
    out.forEach(([x, y, c]) => { this.d[y][x] = c; });
    return this;
  }
  rows() { return this.d.map((r) => r.join('')); }
}

const GLYPHS = {
  '?': ['111', '001', '011', '000', '010'],
  '!': ['1', '1', '1', '0', '1'],
  z: ['111', '001', '010', '100', '111'],
  '*': ['010', '111', '010']
};

/* ------------------------------------------------------------------ rendering */
const frameCache = new Map();

/** Draw a frame (array of strings) to a canvas at integer scale, nearest-neighbour. */
export function renderFrame(rows, palette, scale = 4, flip = false) {
  const h = rows.length;
  const w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = w * scale;
  c.height = h * scale;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const col = palette[rows[y][x]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect((flip ? w - 1 - x : x) * scale, y * scale, scale, scale);
    }
  }
  return c;
}

/** Cached frame as an ImageBitmap (a canvas is returned immediately, swapped for the bitmap once ready). */
export function getFrame(sprite, name, i, scale = 4, flip = false) {
  const key = `${sprite.id}|${name}|${i}|${scale}|${flip ? 1 : 0}`;
  let hit = frameCache.get(key);
  if (!hit) {
    const canvas = renderFrame(sprite.anims[name].frames[i], sprite.palette, scale, flip);
    hit = canvas;
    frameCache.set(key, hit);
    if (typeof createImageBitmap === 'function') createImageBitmap(canvas).then((bm) => frameCache.set(key, bm)).catch(() => {});
  }
  return hit;
}

/* ------------------------------------------------------------------ player */
export class SpritePlayer {
  constructor(canvas, sprite, { scale = 4, flip = false } = {}) {
    this.canvas = canvas;
    this.sprite = sprite;
    this.scale = scale;
    this.flip = flip;
    this.name = null;
    this.index = 0;
    this.raf = 0;
    this.last = 0;
    this.blinkAt = 0;
    this.blinking = false;
    canvas.width = sprite.size[0] * scale;
    canvas.height = sprite.size[1] * scale;
    canvas.style.imageRendering = 'pixelated';
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
  }

  /** play(name, { onFrame(i), onComplete(), flip, holdLast }) */
  play(name, { onFrame, onComplete, flip, from = 0 } = {}) {
    cancelAnimationFrame(this.raf);
    if (flip !== undefined) this.flip = flip;
    this.name = name;
    this.anim = this.sprite.anims[name];
    this.index = from;
    this.onFrame = onFrame;
    this.onComplete = onComplete;
    this.last = performance.now();
    this.blinkAt = performance.now() + 2000 + Math.random() * 2500;
    this.draw();
    if (this.anim.frames.length > 1 || this.sprite.blink) this.raf = requestAnimationFrame((t) => this.tick(t));
    return this;
  }

  stop() { cancelAnimationFrame(this.raf); }

  draw() {
    const { name, index, scale, flip } = this;
    const useBlink = this.blinking && this.sprite.anims[`${name}_blink`];
    const frame = getFrame(this.sprite, useBlink ? `${name}_blink` : name, useBlink ? Math.min(index, this.sprite.anims[`${name}_blink`].frames.length - 1) : index, scale, flip);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(frame, 0, 0);
    this.onFrame?.(index);
  }

  tick(now) {
    const { anim } = this;
    const step = 1000 / anim.fps;
    // an occasional random blink (every ~3s) for animations that have a "<name>_blink" variant
    if (this.sprite.anims[`${this.name}_blink`]) {
      if (!this.blinking && now >= this.blinkAt) { this.blinking = true; this.blinkEnd = now + 140; this.draw(); }
      else if (this.blinking && now >= this.blinkEnd) { this.blinking = false; this.blinkAt = now + 2000 + Math.random() * 2500; this.draw(); }
    }
    if (now - this.last >= step) {
      this.last = now - ((now - this.last) % step);
      const next = this.index + 1;
      if (next >= anim.frames.length) {
        if (anim.loop) this.index = 0;
        else { this.onComplete?.(); this.raf = 0; return; }
      } else this.index = next;
      this.draw();
    }
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }
}

/** Build a sprite from a palette and a map of animation specs ({fps, loop, frames:[Grid|rows]}). */
export function defineSprite(id, size, palette, anims) {
  const out = {};
  for (const [name, a] of Object.entries(anims)) {
    out[name] = { fps: a.fps, loop: a.loop, frames: a.frames.map((f) => (f instanceof Grid ? f.rows() : f)) };
  }
  return { id, size, palette, anims: out, blink: !!out.idle_blink };
}
