// The vector night world: smooth buildings with lit windows (curtains, silhouettes), parallax skylines, neon, moon, street.
// Pure string builders (no DOM), shared by the game scene, the home skyline and the results art.
export const COL = { night: '#08071A', sky: '#120F2B', roof1: '#1C1A35', roof2: '#232042', line: '#3A3666', dim: '#5E5A8A', muted: '#8B86B8', moon: '#F4E7C3', amber: '#FFB238', neon: '#FF2E88', shadow: '#05040C' };

export function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}
const f = (n) => +n.toFixed(1);

/** twinkling stars over a w x h area (world units) */
export function starsSVG(x0, y0, w, h, count, seed) {
  const r = rng(seed); let out = '';
  for (let i = 0; i < count; i++) {
    const tw = r() > 0.55;
    out += `<circle cx="${f(x0 + r() * w)}" cy="${f(y0 + r() * h)}" r="${(0.5 + r() * 1.1).toFixed(2)}" fill="#F4E7C3" opacity="${(0.3 + r() * 0.5).toFixed(2)}"${tw ? ` class="tw" style="animation-delay:${(r() * 6).toFixed(1)}s;animation-duration:${(3 + r() * 4).toFixed(1)}s"` : ''}/>`;
  }
  return out;
}

/** a single window: dark, warm lit, with a curtain, or with a silhouette */
export function windowSVG(x, y, w, h, r, lit = 0.5) {
  const k = r();
  if (k > lit) return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.4" fill="#0F0D24"/><rect x="${x - 1}" y="${y + h}" width="${w + 2}" height="1.4" rx=".7" fill="#4A4488"/>`;
  const flick = r() < 0.3;
  let out = `<g${flick ? ` class="win flick" style="animation-delay:${(r() * 9).toFixed(1)}s"` : ''}><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.4" fill="#FFB84A" opacity=".88"/>`;
  const v = r();
  if (v < 0.35) out += `<path d="M${x} ${y} L${f(x + w * 0.55)} ${y} L${x} ${f(y + h * 0.85)} Z" fill="#E86C8C" opacity=".75"/>`;
  else if (v < 0.65) out += `<circle cx="${f(x + w * 0.62)}" cy="${f(y + h * 0.42)}" r="${f(w * 0.17)}" fill="#2A1608"/><rect x="${f(x + w * 0.42)}" y="${f(y + h * 0.56)}" width="${f(w * 0.4)}" height="${f(h * 0.44)}" rx="${f(w * 0.17)}" fill="#2A1608"/>`;
  out += `</g><rect x="${x - 1}" y="${y + h}" width="${w + 2}" height="1.4" rx=".7" fill="#4A4488"/>`;
  return out;
}

/** a parallax skyline layer of rounded buildings, bottom edge at `base` */
export function skylineLayer({ x0, x1, base, seed, fill, opacity = 1, minH = 40, maxH = 110, minW = 22, maxW = 46, windows = 0, rim = false }) {
  const r = rng(seed); let x = x0; let out = '';
  while (x < x1) {
    const w = minW + r() * (maxW - minW); const h = minH + r() * (maxH - minH);
    out += `<rect x="${f(x)}" y="${f(base - h)}" width="${f(w)}" height="${f(h + 300)}" rx="2.5" fill="${fill}" opacity="${opacity}"/>`;
    if (rim) out += `<rect x="${f(x + 1)}" y="${f(base - h)}" width="${f(w - 2)}" height="1.2" rx=".6" fill="#8F89D0" opacity=".35"/>`;
    const k = r();
    if (k < 0.3) out += `<rect x="${f(x + w * 0.2)}" y="${f(base - h - 7)}" width="${f(w * 0.22)}" height="8" rx="1.5" fill="${fill}" opacity="${opacity}"/>`;
    else if (k < 0.45) out += `<rect x="${f(x + w * 0.5)}" y="${f(base - h - 18)}" width="1.6" height="19" fill="${fill}" opacity="${opacity}"/><rect x="${f(x + w * 0.5 - 5)}" y="${f(base - h - 12)}" width="12" height="1.6" fill="${fill}" opacity="${opacity}"/>`;
    if (windows) for (let wy = base - h + 8; wy < base - 8; wy += 12) for (let wx = x + 5; wx < x + w - 8; wx += 9) if (r() < windows) out += `<rect x="${f(wx)}" y="${f(wy)}" width="4" height="5" rx="1" fill="#FFB238" opacity=".5"/>`;
    x += w + 2 + r() * 5;
  }
  return out;
}

/** the crescent moon with a soft glow and two crater tones (centred on 0,0; radius ~R) */
export function moonSVG(R = 22) {
  const s = R / 36;
  return `<g transform="scale(${s})"><circle r="92" fill="url(#gMoonGlow)"/><path d="M12 -34 A36 36 0 1 0 12 34 A29 29 0 1 1 12 -34 Z" fill="#F4E7C3"/><circle cx="-14" cy="-8" r="5" fill="#E2D3A8"/><circle cx="-22" cy="12" r="3.4" fill="#E2D3A8"/><circle cx="-6" cy="20" r="2.4" fill="#D6C593"/><path d="M-22 -22 A33 33 0 0 0 -30 8" fill="none" stroke="#FFF8E0" stroke-width="1.2" stroke-linecap="round" opacity=".6"/></g>`;
}

/** the neon OPEN sign: dark plate, glowing pink tube outline and a pixel-font word. (x,y) = top-left, 56 x 22 units */
export function neonSignSVG(x, y) {
  return `<g class="neon" transform="translate(${x} ${y})">
    <rect x="-2" y="-2" width="60" height="26" rx="6" fill="#08070F" stroke="#3E3874" stroke-width="1.2"/>
    <rect x="1" y="1" width="54" height="20" rx="4.5" fill="none" stroke="#FF2E88" stroke-width="1.6" filter="url(#glow)" opacity=".95"/>
    <text x="28" y="17" text-anchor="middle" font-family="Audiowide, sans-serif" font-size="12.5" letter-spacing=".5" fill="#FF9CC8" filter="url(#glow)">OPEN</text></g>`;
}

/** a bin with handles, a dent and a lid; origin = top-left of the body */
export function binSVG(w = 28) {
  return `<path d="M0 10 L${w} 10 L${w - 3} 40 L3 40 Z" fill="url(#gBin)" stroke="#C7C2F0" stroke-opacity=".5" stroke-width="1" stroke-linejoin="round"/>
    ${[w * 0.25, w * 0.5, w * 0.75].map((x) => `<line x1="${x}" y1="15" x2="${x * 0.97 + 0.5}" y2="36" stroke="#2E2B58" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>`).join('')}
    <path d="M6 24 q3 3 7 1" fill="none" stroke="#2E2B58" stroke-width="1.4" stroke-linecap="round"/>
    <g class="lid"><path d="M-3 10 Q-3 4 3 4 L${w - 3} 4 Q${w + 3} 4 ${w + 3} 10 Z" fill="#9C97CC" stroke="#E6E2FF" stroke-opacity=".55" stroke-width="1"/><rect x="${w / 2 - 5}" y="0" width="10" height="4" rx="2" fill="#B3AEE0"/></g>`;
}

/** a hanging lantern, drawn smooth: cap, glass, flame core (viewBox 0 0 28 44) */
export const LAMP_SVG = `<svg viewBox="0 0 28 44" aria-hidden="true">
  <circle class="halo" cx="14" cy="26" r="20" fill="url(#gHalo)"/>
  <line x1="14" y1="0" x2="14" y2="8" class="l-chain" stroke-width="1.6" stroke-linecap="round"/>
  <path class="l-cap" d="M6 14 Q6 7 14 7 Q22 7 22 14 Z"/>
  <path class="glass" d="M7 14 L21 14 L19.5 33 Q14 36 8.5 33 Z" stroke-width="1.2" stroke-linejoin="round"/>
  <path class="shine" d="M10 16 L11.5 31" stroke="#fff" stroke-opacity=".35" stroke-width="1.2" stroke-linecap="round" fill="none"/>
  <ellipse class="core" cx="14" cy="26" rx="2.6" ry="4.2"/>
  <path class="l-cap" d="M8 34 L20 34 L18.5 38 L9.5 38 Z"/></svg>`;
