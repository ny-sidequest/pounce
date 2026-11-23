// A pausable timer (pure: the clock is injected so it can be tested), plus a gate that pauses it
// whenever a sequence or a card is on screen. The question timer must never run during either.

export class PausableTimer {
  constructor(seconds, now = () => performance.now()) {
    this.total = seconds;
    this.now = now;
    this.running = false;
    this.used = 0;      // ms consumed so far
    this.startedAt = 0;
    this.started = false;
  }
  start() {
    if (this.started) return;
    this.started = true;
    this.running = true;
    this.startedAt = this.now();
  }
  pause() {
    if (!this.running) return;
    this.used += this.now() - this.startedAt;
    this.running = false;
  }
  resume() {
    if (!this.started || this.running) return;
    this.running = true;
    this.startedAt = this.now();
  }
  stop() { this.pause(); }
  /** seconds spent actually running (paused time is not counted) */
  elapsed() {
    const live = this.running ? this.now() - this.startedAt : 0;
    return (this.used + live) / 1000;
  }
  remaining() { return Math.max(0, this.total - this.elapsed()); }
  expired() { return this.started && this.remaining() <= 0; }
}

/** Counts open "holds" (sequences, cards). The timer runs only while the count is zero. */
export class TimerGate {
  constructor(timer) { this.timer = timer; this.depth = 0; }
  hold() { if (this.depth++ === 0) this.timer.pause(); }
  release() { if (this.depth > 0 && --this.depth === 0) this.timer.resume(); }
  async during(fn) {
    this.hold();
    try { return await fn(); } finally { this.release(); }
  }
  get busy() { return this.depth > 0; }
}
