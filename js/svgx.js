// Small SVG helpers shared by the rigs and the world.
export const NS = 'http://www.w3.org/2000/svg';
export const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
export const rng = (seed) => { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
/** a tapered capsule (a limb segment) from (x0,y0) to (x1,y1) */
export function capsule(x0, y0, x1, y1, w0, w1) {
  const dx = x1 - x0; const dy = y1 - y0; const l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l; const ny = dx / l;
  const f = (n) => n.toFixed(2);
  const a = [x0 + nx * w0, y0 + ny * w0]; const b = [x1 + nx * w1, y1 + ny * w1];
  const c = [x1 - nx * w1, y1 - ny * w1]; const d = [x0 - nx * w0, y0 - ny * w0];
  return `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}A${f(w1)} ${f(w1)} 0 0 0 ${f(c[0])} ${f(c[1])}L${f(d[0])} ${f(d[1])}A${f(w0)} ${f(w0)} 0 0 0 ${f(a[0])} ${f(a[1])}Z`;
}
/** points along a chain of segments from `base`, with absolute angles (deg) */
export function chain(base, angles, lens) {
  const pts = [base];
  let [x, y] = base;
  angles.forEach((a, i) => { x += Math.cos((a * Math.PI) / 180) * lens[i]; y += Math.sin((a * Math.PI) / 180) * lens[i]; pts.push([x, y]); });
  return pts;
}
