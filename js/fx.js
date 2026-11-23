// Visual effects: pixel sparks, floating points, toast.
export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const COLORS = ['#FFB238', '#FF4F9A', '#F4E7C3', '#FFB238'];

function layer() {
  const el = document.createElement('div');
  el.className = 'fx-layer';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  return el;
}

/** Square pixel sparks bursting from a client point. */
export function sparkBurst(x, y, { count = 28, spread = 150, colors = COLORS } = {}) {
  if (reducedMotion()) return;
  const l = layer();
  const jobs = [];
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.className = 'spark';
    const size = Math.random() > 0.7 ? 8 : 4;
    s.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${colors[i % colors.length]}`;
    l.appendChild(s);
    const ang = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * spread;
    const dx = Math.round((Math.cos(ang) * dist) / 4) * 4;
    const dy = Math.round((Math.sin(ang) * dist - 40) / 4) * 4;
    jobs.push(s.animate(
      [{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${dx}px,${dy}px)`, opacity: 1, offset: 0.5 }, { transform: `translate(${dx}px,${dy + 60}px)`, opacity: 0 }],
      { duration: 700 + Math.random() * 400, easing: 'steps(8)', fill: 'forwards' }
    ).finished);
  }
  Promise.allSettled(jobs).then(() => l.remove());
}

let toastTimer;
export function toast(message, ms = 2400) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

/** Floating "+785" rising from a client rect, kept fully inside `bounds` (never clipped at the edges). */
export function floatPoints(rect, text, bounds = null) {
  const el = document.createElement('div');
  el.className = 'float-points';
  el.textContent = text;
  document.body.appendChild(el);
  const half = el.offsetWidth / 2 + 4;
  let x = rect.left + rect.width / 2;
  let y = rect.top + rect.height / 2;
  const b = bounds || { left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight };
  x = Math.max(b.left + half, Math.min(b.right - half, x));
  y = Math.max(b.top + el.offsetHeight + 56, Math.min(b.bottom - 8, y)); // room to rise 48px
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  const a = el.animate(
    reducedMotion()
      ? [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }]
      : [{ transform: 'translate(-50%,0)', opacity: 0 }, { transform: 'translate(-50%,-16px)', opacity: 1, offset: 0.2 }, { transform: 'translate(-50%,-32px)', opacity: 1, offset: 0.7 }, { transform: 'translate(-50%,-48px)', opacity: 0 }],
    { duration: 1200, easing: 'steps(8)', fill: 'forwards' }
  );
  a.finished.then(() => el.remove(), () => el.remove());
}
