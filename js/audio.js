// Tiny synthesized sounds (Web Audio). Off by default; the toggle lives in the top bar.
import { getPref, setPref } from './store.js';

let ctx = null;
let enabled = getPref('sound', 'off') === 'on';

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

export function setSound(on) {
  enabled = on;
  setPref('sound', on ? 'on' : 'off');
  if (on) { ac(); sfx.pop(); }
}

function tone({ type = 'sine', from, to = from, dur = 0.15, gain = 0.15, at = 0, filter }) {
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
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
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
  node.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.12, gain = 0.12, at = 0, freq = 400 }) {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + at;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t0);
}

export const sfx = {
  pop() {
    tone({ from: 520, to: 880, dur: 0.1, gain: 0.12 });
    tone({ from: 880, to: 1320, dur: 0.1, gain: 0.08, at: 0.07 });
  },
  nope() { tone({ type: 'triangle', from: 220, to: 150, dur: 0.18, gain: 0.1 }); },
  meow() {
    tone({ type: 'sawtooth', from: 520, to: 880, dur: 0.18, gain: 0.07, filter: 1100 });
    tone({ type: 'sawtooth', from: 880, to: 420, dur: 0.38, gain: 0.07, at: 0.16, filter: 900 });
  },
  cough() {
    for (let i = 0; i < 3; i++) noise({ dur: 0.1, gain: 0.18, at: i * 0.16, freq: 500 });
    tone({ type: 'square', from: 160, to: 90, dur: 0.25, gain: 0.05, at: 0.5 });
  }
};
