// The POUNCE logo (logo A: leaping cat, crescent moon, wordmark, tagline), inline so it can be styled and animated.
// The text is outlined (js/logo-paths.js), so it never depends on a web font. Motion (CSS, off under reduced motion):
// the scarf sways about +-4deg, the wordmark glow breathes, the moon glows. Nothing changes position.
import { WORD_D, TAG_D } from './logo-paths.js';

export function logoHTML({ cls = 'logo-a' } = {}) {
  return `<svg class="${cls}" viewBox="40 20 480 280" role="img" aria-label="Pounce. Leap before you look.">
<defs>
<filter id="lg-glow" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="lg-glow-s" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<mask id="lg-crescent"><rect width="600" height="300" fill="white"/><circle cx="352" cy="72" r="40" fill="black"/></mask>
<g id="lg-catshape">
<path d="M-48 -6 Q-84 -34 -114 -18" fill="none"/><path d="M-40 6 L-94 22 M-46 2 L-100 8" fill="none"/><path d="M44 4 L98 8 M40 8 L92 20" fill="none"/>
<path d="M-52 -2 Q-24 -24 28 -16 Q50 -12 58 0 Q42 16 2 14 Q-40 14 -52 -2 Z"/><circle cx="64" cy="-14" r="15"/><ellipse cx="78" cy="-8" rx="9" ry="6.5"/>
<path d="M52 -24 L56 -44 L66 -28 Z M66 -28 L76 -44 L78 -22 Z"/></g>
</defs>
<circle class="lg-moon" cx="330" cy="90" r="50" fill="#FFB238" mask="url(#lg-crescent)" filter="url(#lg-glow)"/>
<path d="M70 168 Q190 14 410 66" stroke="#FFB238" stroke-width="2.5" stroke-dasharray="2 9" stroke-linecap="round" fill="none" opacity=".75"/>
<g class="lg-hop"><g transform="translate(262 80) rotate(-12)">
<use href="#lg-catshape" fill="#B79BFF" stroke="#B79BFF" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" filter="url(#lg-glow-s)"/>
<use href="#lg-catshape" fill="#08071A" stroke="#08071A" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M68 -16 Q72 -20 76 -16 Q72 -13 68 -16 Z" fill="#FFB238"/>
<path d="M50 -4 Q62 6 76 -2" stroke="#FF2E88" stroke-width="7" stroke-linecap="round" fill="none"/>
<path class="lg-scarf" d="M52 -2 Q34 -30 10 -34 Q-4 -36 -14 -48" stroke="#FF2E88" stroke-width="5" stroke-linecap="round" fill="none"/>
<path d="M84 -8 L98 -12 M84 -6 L98 -4" stroke="#B79BFF" stroke-width="1.2" stroke-linecap="round" opacity=".8"/></g></g>
<path class="lg-word" d="${WORD_D}" fill="#FF2E88" filter="url(#lg-glow)"/>
<path d="${TAG_D}" fill="#FFB238"/></svg>`;
}
