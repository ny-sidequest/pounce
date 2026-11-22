// The yarn board: 5 clue slots in an arc, a mystery knot, and red threads between them.
import { yarnBall } from './cat.js';
import { reducedMotion } from './fx.js';

const W = 360;
const H = 240;
const SLOTS = [[36, 72], [108, 44], [180, 32], [252, 44], [324, 72]];
const KNOT = [180, 182];
const NS = 'http://www.w3.org/2000/svg';
const pct = (v, total) => (v / total) * 100 + '%';

function threadPath([x0, y0], [x1, y1], i) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const a = 9 * (i % 2 ? 1 : -1) * (i === 2 ? 0.6 : 1); // slight wobble, alternating
  const c1 = [x0 + dx * 0.33 + nx * a, y0 + dy * 0.33 + ny * a];
  const c2 = [x0 + dx * 0.66 - nx * a, y0 + dy * 0.66 - ny * a];
  return `M${x0} ${y0} C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${x1} ${y1}`;
}

function spiralPath() {
  let d = '';
  for (let t = 0; t <= Math.PI * 7; t += 0.25) {
    const r = 4 + t * 1.85;
    d += (d ? 'L' : 'M') + (Math.cos(t) * r).toFixed(1) + ' ' + (Math.sin(t) * r).toFixed(1);
  }
  return d;
}

export function createBoard(host, color) {
  host.innerHTML = `
    <svg class="board-threads" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"></svg>
    ${SLOTS.map(([x, y], i) => `
      <div class="slot" data-i="${i}" style="left:${pct(x, W)};top:${pct(y, H)}">
        <div class="slot-ball empty" aria-hidden="true"><span>${i + 1}</span></div>
        <div class="slot-label"><span class="sr-only">Clue ${i + 1}: not answered yet</span></div>
      </div>`).join('')}
    <div class="knot" style="left:${pct(KNOT[0], W)};top:${pct(KNOT[1], H)}">
      <svg class="spiral" viewBox="-50 -50 100 100" aria-hidden="true"><path d="${spiralPath()}"/></svg>
      <div class="knot-ball" aria-hidden="true">${yarnBall('#F2B33D', 'knot-yarn')}<span class="knot-q">?</span></div>
      <div class="knot-reveal" hidden></div>
      <span class="sr-only knot-sr">The connect is hidden</span>
    </div>`;

  const svg = host.querySelector('.board-threads');
  const knot = host.querySelector('.knot');
  const reveal = host.querySelector('.knot-reveal');
  const spiral = host.querySelector('.spiral path');
  const ball = host.querySelector('.knot-ball');
  const spiralLen = spiral.getTotalLength ? spiral.getTotalLength() : 600;
  spiral.style.strokeDasharray = spiralLen;
  spiral.style.strokeDashoffset = spiralLen;

  function addThread(i, animate) {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', threadPath(SLOTS[i], KNOT, i));
    path.setAttribute('class', 'thread');
    svg.appendChild(path);
    const len = path.getTotalLength();
    path.style.strokeDasharray = len;
    if (animate && !reducedMotion()) {
      path.style.strokeDashoffset = len;
      path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], {
        duration: 750, delay: 200, easing: 'cubic-bezier(.4,.1,.2,1)', fill: 'forwards'
      });
    } else if (animate) {
      path.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'backwards' });
      path.style.strokeDashoffset = 0;
    } else {
      path.style.strokeDashoffset = 0;
    }
  }

  function fillSlot(i, answer, { missed = false, animate = true } = {}) {
    const slot = host.querySelector(`.slot[data-i="${i}"]`);
    const b = slot.querySelector('.slot-ball');
    b.className = 'slot-ball filled' + (missed ? ' missed' : '');
    b.innerHTML = yarnBall(color);
    const label = slot.querySelector('.slot-label');
    label.className = 'slot-label filled' + (missed ? ' missed' : '');
    label.innerHTML = `<span class="sr-only">Clue ${i + 1}${missed ? ' (missed)' : ''}: </span>${escapeHTML(answer)}`;
    if (animate) {
      b.animate(
        reducedMotion()
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [{ transform: 'scale(.3) rotate(-90deg)' }, { transform: 'scale(1.18) rotate(8deg)', offset: 0.6 }, { transform: 'scale(1) rotate(0)' }],
        { duration: 420, easing: 'cubic-bezier(.3,1.5,.5,1)' }
      );
    }
    addThread(i, animate);
  }

  function setRevealed(text) {
    knot.classList.add('revealed');
    reveal.hidden = false;
    reveal.textContent = text;
    knot.querySelector('.knot-sr').textContent = 'The connect is ' + text;
    ball.style.visibility = 'hidden';
  }

  /** Hero animation: the knot unwinds into a spiral of thread and the connect appears. */
  async function unravel(text) {
    knot.querySelector('.knot-sr').textContent = 'The connect is ' + text;
    if (reducedMotion()) {
      setRevealed(text);
      reveal.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 });
      return;
    }
    knot.classList.add('unravelling');
    const shake = knot.animate(
      [{ transform: 'translate(-50%,-50%) rotate(0)' }, { transform: 'translate(-50%,-50%) rotate(-8deg) scale(1.08)' },
       { transform: 'translate(-50%,-50%) rotate(8deg) scale(1.08)' }, { transform: 'translate(-50%,-50%) rotate(0)' }],
      { duration: 280, iterations: 1 }
    );
    await shake.finished.catch(() => {});
    spiral.getAnimations().forEach((a) => a.cancel());
    spiral.style.opacity = 1;
    const draw = spiral.animate([{ strokeDashoffset: spiralLen }, { strokeDashoffset: 0 }],
      { duration: 800, easing: 'cubic-bezier(.3,.6,.3,1)', fill: 'forwards' });
    ball.animate(
      [{ transform: 'rotate(0) scale(1)', opacity: 1 }, { transform: 'rotate(-420deg) scale(.15)', opacity: 0 }],
      { duration: 800, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' }
    );
    await new Promise((r) => setTimeout(r, 520));
    reveal.hidden = false;
    reveal.textContent = text;
    reveal.animate(
      [{ transform: 'translate(-50%,-50%) scale(.2) rotate(-12deg)', opacity: 0 },
       { transform: 'translate(-50%,-50%) scale(1.18) rotate(3deg)', opacity: 1, offset: 0.65 },
       { transform: 'translate(-50%,-50%) scale(1) rotate(0)', opacity: 1 }],
      { duration: 560, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'backwards' }
    );
    await draw.finished.catch(() => {});
    spiral.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, fill: 'forwards' });
    setRevealed(text);
    knot.classList.remove('unravelling');
  }

  function center() {
    const r = knot.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, rect: r };
  }

  function slotCenter(i) {
    const r = host.querySelector(`.slot[data-i="${i}"] .slot-ball`).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  return { fillSlot, setRevealed, unravel, center, slotCenter, knot };
}

export function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
