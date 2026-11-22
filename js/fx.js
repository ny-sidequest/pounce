// Visual effects: yarn confetti, paw-print bursts, toast.
import { pawSVG } from './cat.js';

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const COLORS = ['#E8483B', '#F2B33D', '#7BAE7F', '#5B7DB1', '#F29A3D'];

function layer() {
  const el = document.createElement('div');
  el.className = 'fx-layer';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  return el;
}

/** Yarn-piece confetti from a point (client coordinates). */
export function confetti(x, y, count = 42) {
  if (reducedMotion()) return;
  const l = layer();
  const anims = [];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('span');
    piece.className = 'yarn-bit';
    const c = COLORS[i % COLORS.length];
    piece.style.background = c;
    piece.style.left = x + 'px';
    piece.style.top = y + 'px';
    piece.style.width = 10 + Math.random() * 12 + 'px';
    l.appendChild(piece);
    const ang = Math.random() * Math.PI * 2;
    const dist = 70 + Math.random() * 150;
    const dx = Math.cos(ang) * dist;
    const dy = Math.sin(ang) * dist - 60;
    const rot = (Math.random() - 0.5) * 900;
    anims.push(piece.animate(
      [
        { transform: 'translate(-50%,-50%) rotate(0deg) scale(.4)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${rot / 2}deg) scale(1)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx * 1.15}px, ${dy + 140}px) rotate(${rot}deg) scale(.9)`, opacity: 0 }
      ],
      { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' }
    ).finished);
  }
  Promise.allSettled(anims).then(() => l.remove());
}

/** Small paw-print burst around a point. */
export function pawBurst(x, y, color = '#2B2118') {
  if (reducedMotion()) return;
  const l = layer();
  const n = 6;
  const anims = [];
  for (let i = 0; i < n; i++) {
    const paw = document.createElement('span');
    paw.className = 'paw-bit';
    paw.innerHTML = pawSVG(color);
    paw.style.left = x + 'px';
    paw.style.top = y + 'px';
    l.appendChild(paw);
    const ang = (i / n) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 38 + Math.random() * 28;
    anims.push(paw.animate(
      [
        { transform: 'translate(-50%,-50%) scale(.2)', opacity: 0 },
        { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist}px)) scale(1) rotate(${Math.cos(ang) * 30}deg)`, opacity: 1, offset: 0.4 },
        { transform: `translate(calc(-50% + ${Math.cos(ang) * dist * 1.2}px), calc(-50% + ${Math.sin(ang) * dist * 1.2}px)) scale(.9)`, opacity: 0 }
      ],
      { duration: 700, easing: 'cubic-bezier(.2,.9,.3,1.3)', fill: 'forwards' }
    ).finished);
  }
  Promise.allSettled(anims).then(() => l.remove());
}

let toastTimer;
export function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

/** Floating "+973" pill rising from an element. */
export function floatPoints(anchor, text) {
  const r = anchor.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'float-points';
  el.textContent = text;
  el.style.left = r.left + r.width / 2 + 'px';
  el.style.top = r.top + r.height / 2 + 'px';
  document.body.appendChild(el);
  const a = el.animate(
    reducedMotion()
      ? [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }]
      : [
          { transform: 'translate(-50%,-30%) scale(.4)', opacity: 0 },
          { transform: 'translate(-50%,-90%) scale(1.25)', opacity: 1, offset: 0.25 },
          { transform: 'translate(-50%,-110%) scale(1)', opacity: 1, offset: 0.75 },
          { transform: 'translate(-50%,-170%) scale(1)', opacity: 0 }
        ],
    { duration: 1300, easing: 'cubic-bezier(.2,.9,.3,1.2)', fill: 'forwards' }
  );
  a.finished.then(() => el.remove(), () => el.remove());
}
