// A tiny code-driven animation runtime: one rAF loop per Runtime, tweens with easing, hit-stop, pause when the tab is hidden.
// Everything that moves in the rigs / scenes runs on this, with transforms only (no layout).
export const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rad = (d) => (d * Math.PI) / 180;

export const EASE = {
  linear: (k) => k,
  outQuad: (k) => 1 - (1 - k) * (1 - k),
  inQuad: (k) => k * k,
  outCubic: (k) => 1 - Math.pow(1 - k, 3),
  inCubic: (k) => k * k * k,
  inOutCubic: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  inOutSine: (k) => -(Math.cos(Math.PI * k) - 1) / 2,
  outBack: (k) => { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  outElastic: (k) => (k === 0 ? 0 : k === 1 ? 1 : Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1)
};

export class Runtime {
  constructor() {
    this.t = 0; this.scale = 1; this.hold = 0; this.paused = false; this.dead = false;
    this.tweens = new Set(); this.tickers = new Set(); this.holdWaiters = [];
    this.raf = 0; this.last = 0; this.running = false;
    this._vis = () => { if (document.hidden) this._stop(); else if (this.tweens.size || this.tickers.size) this._start(); };
    document.addEventListener('visibilitychange', this._vis);
  }
  _start() {
    if (this.running || this.dead || document.hidden || this.paused) return;
    this.running = true; this.last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(50, now - this.last) * this.scale; this.last = now;
      this.step(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }
  _stop() { this.running = false; cancelAnimationFrame(this.raf); }
  /** advance by dt ms (also used for deterministic stepping in tests / strips) */
  step(dt) {
    if (this.hold > 0) {                         // hit-stop: everything freezes for a moment
      this.hold -= dt;
      if (this.hold <= 0) { this.hold = 0; this.holdWaiters.splice(0).forEach((r) => r()); }
      for (const f of this.tickers) f(0, this.t, true);
      return;
    }
    this.t += dt;
    for (const tw of [...this.tweens]) tw.step();
    for (const f of this.tickers) f(dt, this.t, false);
  }
  /** called every frame with (dt, t, held) */
  every(fn) { this.tickers.add(fn); this._start(); return () => this.tickers.delete(fn); }
  wait(ms) {
    if (reducedMotion()) ms = Math.min(ms, 30);
    return new Promise((res) => { const t0 = this.t; const tw = { step: () => { if (this.t - t0 >= ms) { this.tweens.delete(tw); res(); } }, res }; this.tweens.add(tw); this._start(); });
  }
  /** run fn(easedK, rawK) for ms; resolves at the end. Under reduced motion it jumps to the end state. */
  run(ms, ease, fn) {
    if (reducedMotion()) { fn(1, 1); return Promise.resolve(); }
    return new Promise((res) => {
      const t0 = this.t; const e = EASE[ease] || EASE.linear;
      const tw = { step: () => { const k = clamp((this.t - t0) / ms, 0, 1); fn(e(k), k); if (k >= 1) { this.tweens.delete(tw); res(); } }, res };
      this.tweens.add(tw); fn(0, 0); this._start();
    });
  }
  tween(obj, to, ms, ease = 'outCubic') {
    const from = {}; for (const k in to) from[k] = obj[k];
    return this.run(ms, ease, (e) => { for (const key in to) obj[key] = lerp(from[key], to[key], e); });
  }
  hitStop(ms) { if (reducedMotion()) return Promise.resolve(); this.hold = ms; this._start(); return new Promise((r) => this.holdWaiters.push(r)); }
  cancelTweens() { for (const tw of this.tweens) tw.res?.(); this.tweens.clear(); this.holdWaiters.splice(0).forEach((r) => r()); this.hold = 0; }
  pause() { this.paused = true; this._stop(); }
  resume() { this.paused = false; if (this.tweens.size || this.tickers.size) this._start(); }
  destroy() { this.dead = true; this._stop(); this.cancelTweens(); this.tickers.clear(); document.removeEventListener('visibilitychange', this._vis); }
}
