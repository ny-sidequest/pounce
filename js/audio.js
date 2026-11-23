// Tiny synthesized sounds (Web Audio): rain ambience, purr, mrrp, bin clatter. Off by default.
import { getPref, setPref } from './store.js';

let ctx = null;
let enabled = getPref('sound', 'off') === 'on';
let rain = null;

export const isSoundOn = () => enabled;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noiseBuffer(c, secs) {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * secs), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function startRain() {
  const c = ac();
  if (!c || rain) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 2);
  src.loop = true;
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1800;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 7000;
  const g = c.createGain();
  g.gain.value = 0.018;
  src.connect(hp).connect(lp).connect(g).connect(c.destination);
  src.start();
  rain = { src, g };
}

function stopRain() {
  if (rain) { try { rain.src.stop(); } catch { /* already stopped */ } rain = null; }
}

export function setSound(on) {
  enabled = on;
  setPref('sound', on ? 'on' : 'off');
  if (on) { ac(); startRain(); sfx.purr(); } else stopRain();
}

/** Call from a user gesture on load if sound was left on, so the rain can start. */
export function resumeAmbience() {
  if (enabled) startRain();
}

function tone({ type = 'sine', from, to = from, dur = 0.15, gain = 0.1, at = 0, filter, tremolo }) {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let node = osc;
  if (filter) {
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = filter;
    f.Q.value = 3;
    osc.connect(f);
    node = f;
  }
  if (tremolo) {
    const lfo = c.createOscillator();
    const lg = c.createGain();
    lfo.frequency.value = tremolo;
    lg.gain.value = gain * 0.8;
    lfo.connect(lg).connect(g.gain);
    lfo.start(t0);
    lfo.stop(t0 + dur + 0.02);
  }
  node.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function burst({ dur = 0.1, gain = 0.15, at = 0, freq = 2400, type = 'bandpass' }) {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, dur);
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = 4;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t0);
}

export const sfx = {
  purr() { tone({ type: 'sawtooth', from: 48, to: 44, dur: 0.7, gain: 0.07, filter: 140, tremolo: 24 }); },
  mrrp() {
    tone({ type: 'triangle', from: 300, to: 520, dur: 0.1, gain: 0.12 });
    tone({ type: 'triangle', from: 520, to: 760, dur: 0.12, gain: 0.1, at: 0.09 });
  },
  nope() { tone({ type: 'square', from: 180, to: 120, dur: 0.14, gain: 0.04 }); },
  clatter() {
    for (let i = 0; i < 7; i++) burst({ dur: 0.12, gain: 0.2, at: i * 0.09, freq: 1200 + Math.random() * 3200 });
    tone({ type: 'square', from: 220, to: 70, dur: 0.5, gain: 0.05, at: 0.05 });
  }
};
