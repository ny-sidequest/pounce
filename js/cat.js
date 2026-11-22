// Inline-SVG art: the tabby mascot (many poses), yarn balls and paw prints.
// Flat sticker style, thick ink outline. No image files.

const INK = '#2B2118';
const ORANGE = '#F29A3D';
const ORANGE_D = '#D9761F';
const CREAM = '#FFE9C7';
const PINK = '#F4A6A0';
const MOUTH = '#6A2B25';
const O = `stroke="${INK}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"`;
const L = `fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"`;

/* ------------------------------------------------------------------ eyes */
const E = {
  smug: `<g class="cat-eyes">
      <ellipse cx="54" cy="59" rx="5.5" ry="6.5" fill="${INK}"/><ellipse cx="86" cy="59" rx="5.5" ry="6.5" fill="${INK}"/>
      <circle cx="52.5" cy="56.5" r="1.9" fill="#fff"/><circle cx="84.5" cy="56.5" r="1.9" fill="#fff"/>
      <path d="M46 52.5h16M78 52.5h16" ${L}/></g>`,
  wide: `<g class="cat-eyes">
      <ellipse cx="54" cy="58" rx="7.5" ry="8.5" fill="#fff" ${O} stroke-width="3"/><ellipse cx="86" cy="58" rx="7.5" ry="8.5" fill="#fff" ${O} stroke-width="3"/>
      <circle cx="55" cy="59" r="4.6" fill="${INK}"/><circle cx="87" cy="59" r="4.6" fill="${INK}"/>
      <circle cx="53.4" cy="57" r="1.6" fill="#fff"/><circle cx="85.4" cy="57" r="1.6" fill="#fff"/></g>`,
  happy: `<path d="M47 61q7-10 14 0M79 61q7-10 14 0" ${L} stroke-width="3.8"/>`,
  closed: `<path d="M47 59q7 5 14 0M79 59q7 5 14 0" ${L} stroke-width="3.8"/>`,
  glow: `<circle class="glow-halo" cx="54" cy="58" r="14" fill="#FFF176" opacity=".55"/><circle class="glow-halo" cx="86" cy="58" r="14" fill="#FFF176" opacity=".55"/>
      <circle cx="54" cy="58" r="8" fill="#FFF59D" ${O} stroke-width="3"/><circle cx="86" cy="58" r="8" fill="#FFF59D" ${O} stroke-width="3"/>
      <ellipse cx="54" cy="58" rx="2" ry="6" fill="${INK}"/><ellipse cx="86" cy="58" rx="2" ry="6" fill="${INK}"/>`,
  shades: `<rect x="43" y="50" width="23" height="15" rx="6" fill="${INK}"/><rect x="74" y="50" width="23" height="15" rx="6" fill="${INK}"/>
      <path d="M66 55h8M43 54l-7-3M97 54l7-3" ${L} stroke-width="2.6"/>
      <path d="M48 55l5-2M79 55l5-2" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>`,
  x: `<path d="M48 53l11 11M59 53L48 64M81 53l11 11M92 53L81 64" ${L} stroke-width="3.4"/>`,
  sleepy: `<path d="M47 60q7 4 14 0M79 60q7 4 14 0" ${L} stroke-width="3.8"/>`
};

/* ----------------------------------------------------------------- mouths */
const M = {
  smirk: `<path d="M70 72v3.5q-5 5-11 1M70 75.5q7 6 14-1" ${L} stroke-width="2.8"/>`,
  smile: `<path d="M70 72v3q-6 5-11 0M70 75q6 5 11 0" ${L} stroke-width="2.8"/>`,
  open: `<path d="M58 75q12 14 24 0z" fill="${MOUTH}" ${O} stroke-width="2.8"/><path d="M64 82q6-5 12 0q-6 4-12 0z" fill="${PINK}"/>`,
  yawn: `<ellipse cx="70" cy="82" rx="8.5" ry="11" fill="${MOUTH}" ${O} stroke-width="2.8"/><ellipse cx="70" cy="87" rx="5" ry="4.2" fill="${PINK}"/>`,
  o: `<ellipse cx="70" cy="78" rx="3.2" ry="4" fill="${MOUTH}"/>`,
  worry: `<path d="M70 72v3M60 82q10-8 20 0" ${L} stroke-width="2.8"/>`,
  hairball: `<ellipse cx="70" cy="80" rx="9" ry="7" fill="${MOUTH}" ${O} stroke-width="2.6"/>
      <g class="hairball-bit"><circle cx="70" cy="88" r="9" fill="#8B7A66" ${O} stroke-width="2.6"/>
      <path d="M63 86q4-3 6 1M70 92q5-5 9-1M66 91q3 0 4-2" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/></g>`
};

/* ----------------------------------------------------------------- extras */
const star = (x, y, s = 1) =>
  `<path d="M${x} ${y - 7 * s}l${1.8 * s} ${5.2 * s} ${5.2 * s} ${1.8 * s}-${5.2 * s} ${1.8 * s}-${1.8 * s} ${5.2 * s}-${1.8 * s}-${5.2 * s}-${5.2 * s}-${1.8 * s} ${5.2 * s}-${1.8 * s}z" fill="#F2B33D" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;

const X = {
  sparkles: `<g class="sparkle">${star(22, 28, 1.1)}${star(120, 22, 0.9)}${star(124, 56, 0.7)}</g>`,
  stars: `<g class="sparkle">${star(24, 22, 1)}${star(118, 18, 1.2)}${star(128, 52, 0.7)}${star(14, 56, 0.7)}</g>`,
  zzz: `<g class="zzz" font-family="Fredoka, sans-serif" font-weight="600" fill="${INK}"><text x="112" y="34" font-size="18">z</text><text x="122" y="20" font-size="13">z</text></g>`,
  sweat: `<path d="M110 40q-6 9 0 13q6-4 0-13z" fill="#9AD0F0" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>`,
  question: `<text x="112" y="32" font-family="Fredoka, sans-serif" font-weight="600" font-size="24" fill="${INK}">?</text>`,
  blush: `<ellipse cx="44" cy="70" rx="6" ry="3.6" fill="${PINK}" opacity=".85"/><ellipse cx="96" cy="70" rx="6" ry="3.6" fill="${PINK}" opacity=".85"/>`,
  box: `<g><path d="M14 98h112l-8 36H22z" fill="#D2A06A" ${O}/><path d="M14 98l18 10h76l18-10" fill="#E6BC88" ${O}/>
      <path d="M60 116h20" ${L} stroke-width="2.6"/><rect x="48" y="120" width="44" height="7" rx="2" fill="#F3E3C7" stroke="${INK}" stroke-width="2"/></g>`,
  yarnHide: `<g><circle cx="70" cy="116" r="38" fill="#7BAE7F" ${O}/>
      <g fill="none" stroke="rgba(255,255,255,.5)" stroke-width="3.4" stroke-linecap="round"><path d="M40 100q30-16 62 2M36 114q34-18 70 4M42 130q30-14 58 0"/></g>
      <g fill="none" stroke="rgba(0,0,0,.18)" stroke-width="3" stroke-linecap="round"><path d="M52 84q18 24 6 52M82 82q22 24 6 54"/></g>
      <ellipse cx="50" cy="80" rx="9" ry="6.5" fill="${CREAM}" ${O} stroke-width="3"/><ellipse cx="90" cy="80" rx="9" ry="6.5" fill="${CREAM}" ${O} stroke-width="3"/></g>`
};

/* ------------------------------------------------------------------ poses */
// body: 'sit' | 'crouch' | 'leap' | 'hide' | 'box'
const POSES = {
  idle: { eyes: 'smug', mouth: 'smirk', body: 'sit', blink: true },
  crouch: { eyes: 'wide', mouth: 'smirk', body: 'crouch' },
  leap: { eyes: 'wide', mouth: 'open', body: 'leap' },
  pleased: { eyes: 'happy', mouth: 'smile', body: 'sit', extra: 'blush' },
  tilt: { eyes: 'wide', mouth: 'o', body: 'sit', head: 'rotate(-13 70 78)', extra: 'question' },
  psychic: { eyes: 'glow', mouth: 'smirk', body: 'sit', extra: 'stars' },
  genius: { eyes: 'shades', mouth: 'smirk', body: 'sit' },
  curious: { eyes: 'wide', mouth: 'o', body: 'sit', head: 'rotate(-12 70 78)', extra: 'sparkles' },
  sleepy: { eyes: 'sleepy', mouth: 'yawn', body: 'sit', extra: 'zzz' },
  box: { eyes: 'smug', mouth: 'smile', body: 'box', blink: true },
  hairball: { eyes: 'x', mouth: 'hairball', body: 'sit', extra: 'sweat' },
  scaredy: { eyes: 'wide', mouth: null, body: 'hide', extra: 'sweat' }
};

export const POSE_NAMES = Object.keys(POSES);

function tail(up) {
  const d = up ? 'M102 108C130 112 138 78 122 58' : 'M102 112C128 118 138 98 128 84';
  return `<g class="cat-tail"><path d="${d}" fill="none" stroke="${INK}" stroke-width="14" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="${ORANGE}" stroke-width="7" stroke-linecap="round"/>
    <path d="${up ? 'M124 62l-3 6M128 70l-4 4' : 'M128 86l-4 4'}" ${L} stroke-width="2.4" opacity=".0"/></g>`;
}

function bodyParts(kind) {
  const stripes = (dy = 0) =>
    `<path d="M34 ${98 + dy}q9 2 11 10M106 ${98 + dy}q-9 2-11 10" ${L} stroke-width="2.8"/>`;
  if (kind === 'crouch') {
    return `<g class="cat-rear"><ellipse cx="74" cy="112" rx="42" ry="20" fill="${ORANGE}" ${O}/>${stripes(8)}
      <ellipse cx="106" cy="118" rx="12" ry="9" fill="${ORANGE_D}" ${O} stroke-width="3"/></g>
      <ellipse cx="44" cy="127" rx="13" ry="7" fill="${CREAM}" ${O} stroke-width="3"/><ellipse cx="68" cy="129" rx="13" ry="7" fill="${CREAM}" ${O} stroke-width="3"/>`;
  }
  if (kind === 'leap') {
    return `<ellipse cx="66" cy="102" rx="42" ry="22" fill="${ORANGE}" ${O} transform="rotate(-8 66 102)"/>${stripes(2)}
      <ellipse cx="116" cy="84" rx="13" ry="7" fill="${CREAM}" ${O} stroke-width="3" transform="rotate(-25 116 84)"/>
      <ellipse cx="112" cy="104" rx="13" ry="7" fill="${CREAM}" ${O} stroke-width="3" transform="rotate(10 112 104)"/>
      <ellipse cx="20" cy="112" rx="13" ry="7" fill="${CREAM}" ${O} stroke-width="3" transform="rotate(-15 20 112)"/>`;
  }
  return `<ellipse cx="70" cy="104" rx="37" ry="27" fill="${ORANGE}" ${O}/>${stripes()}
    <ellipse cx="53" cy="128" rx="12" ry="7" fill="${CREAM}" ${O} stroke-width="3"/><ellipse cx="87" cy="128" rx="12" ry="7" fill="${CREAM}" ${O} stroke-width="3"/>`;
}

function head(pose, cfg, headY = 0) {
  const t = [headY ? `translate(0 ${headY})` : '', cfg.head || ''].filter(Boolean).join(' ');
  return `<g class="cat-head"${t ? ` transform="${t}"` : ''}>
    <path d="M37 50L31 13l33 19z" fill="${ORANGE}" ${O}/><path d="M103 50l6-37-33 19z" fill="${ORANGE}" ${O}/>
    <path d="M40 40l-3-16 15 9z" fill="${PINK}"/><path d="M100 40l3-16-15 9z" fill="${PINK}"/>
    <ellipse cx="70" cy="62" rx="39" ry="32" fill="${ORANGE}" ${O}/>
    <path d="M70 31v9M60 33l2 7M80 33l-2 7" ${L} stroke-width="2.8"/>
    <path d="M32 62h6M33 70l6-1M102 62h6M101 69l6 1" ${L} stroke-width="2.6"/>
    <ellipse cx="70" cy="73" rx="16" ry="11" fill="${CREAM}"/>
    ${cfg.extra === 'blush' ? X.blush : ''}
    ${E[cfg.eyes]}
    <path d="M65 66h10l-5 6z" fill="${PINK}" ${O} stroke-width="2.4"/>
    ${cfg.mouth ? M[cfg.mouth] : ''}
    <path d="M52 74l-22-5M52 78l-22 5M88 74l22-5M88 78l22 5" ${L} stroke-width="1.8" opacity=".55"/>
  </g>`;
}

export function catSVG(pose = 'idle', extraClass = '') {
  const cfg = POSES[pose] || POSES.idle;
  const kind = cfg.body;
  const headY = kind === 'crouch' ? 14 : kind === 'leap' ? -4 : kind === 'box' ? 4 : 0;
  const sideExtra = cfg.extra && cfg.extra !== 'blush' ? X[cfg.extra] : '';
  let inner;
  if (kind === 'box') inner = `${tail(true)}${bodyParts('sit')}${head(pose, cfg, headY)}${X.box}`;
  else if (kind === 'hide') inner = `${head(pose, cfg, -6)}${X.yarnHide}`;
  else inner = `${tail(kind !== 'leap')}${bodyParts(kind)}${head(pose, cfg, headY)}`;
  return `<svg class="cat cat--${pose} ${cfg.blink ? 'cat--blink' : ''} ${extraClass}" viewBox="0 0 140 140" aria-hidden="true" focusable="false">${inner}${sideExtra}</svg>`;
}

/* -------------------------------------------------------------- yarn & paw */
let uid = 0;

/** A ball of yarn in `color`, ink outline, with strands and a loose end. */
export function yarnBall(color, cls = '') {
  const id = `yb${uid++}`;
  return `<svg class="yarn ${cls}" viewBox="0 0 72 72" aria-hidden="true" focusable="false">
    <defs><clipPath id="${id}"><circle cx="34" cy="34" r="28"/></clipPath></defs>
    <path d="M52 56q14 4 12 14" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
    <path d="M52 56q14 4 12 14" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="34" cy="34" r="28" fill="${color}"/>
    <g clip-path="url(#${id})" fill="none" stroke-linecap="round">
      <g stroke="rgba(255,255,255,.5)" stroke-width="3"><path d="M2 22Q34 6 66 24"/><path d="M0 38Q32 18 68 40"/><path d="M4 54Q36 30 64 54"/></g>
      <g stroke="rgba(0,0,0,.2)" stroke-width="3"><path d="M12 6Q44 40 22 64"/><path d="M34 2Q64 30 40 66"/></g>
    </g>
    <circle cx="34" cy="34" r="28" fill="none" stroke="${INK}" stroke-width="3.5"/>
  </svg>`;
}

export function pawSVG(color = INK) {
  return `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="${color}">
    <ellipse cx="12" cy="16" rx="5.4" ry="4.6"/><ellipse cx="5" cy="10.5" rx="2.3" ry="3"/><ellipse cx="9.5" cy="6" rx="2.3" ry="3"/>
    <ellipse cx="14.5" cy="6" rx="2.3" ry="3"/><ellipse cx="19" cy="10.5" rx="2.3" ry="3"/></svg>`;
}
