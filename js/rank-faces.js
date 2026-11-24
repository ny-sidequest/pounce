// The six small cat faces for the rank list (from design/Main.dc.html). `you` swaps the outline to magenta.
const HEAD = 'M8 15 L10 4 L17 11 L23 11 L30 4 L32 15 Q37 22 32 30 Q20 38 8 30 Q3 22 8 15 Z';
const head = (st, d = HEAD) => `<path d="${d}" fill="#0B0A18" stroke="${st}" stroke-width="1.5" stroke-linejoin="round"/>`;

const FACES = {
  psychic: (st) => `${head(st)}<circle cx="15" cy="21" r="3.4" fill="#FFB238"/><circle cx="25" cy="21" r="3.4" fill="#FFB238"/><path d="M15 17.5v7M11.5 21h7M25 17.5v7M21.5 21h7" stroke="#FFF4D6" stroke-width="1" stroke-linecap="round"/><path d="M3 6l2 2M37 6l-2 2M20 0v3" stroke="#FFB238" stroke-width="1.5" stroke-linecap="round"/>`,
  genius: (st) => `${head(st)}<path d="M8 18 H32 V22 Q32 25 28 25 H24 Q21 25 20 21 Q19 25 16 25 H12 Q8 25 8 22 Z" fill="#05040C" stroke="#FFB238" stroke-width="1"/><path d="M11 20l3-1.5" stroke="#FFB238" stroke-width="1.2" stroke-linecap="round"/><path d="M17 30 Q20 32 23 30" stroke="#8E89C2" stroke-width="1.3" fill="none" stroke-linecap="round"/>`,
  curious: (st) => `<g transform="rotate(-14 20 20)">${head(st)}<circle cx="15" cy="21" r="3" fill="#FFB238"/><circle cx="25" cy="21" r="4" fill="#FFB238"/><circle cx="15.6" cy="20.4" r="1" fill="#05040C"/><circle cx="25.8" cy="20.2" r="1.3" fill="#05040C"/></g><path d="M33 5 Q37 5 37 8 Q37 10 35 11 V13" stroke="#FFB238" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="35" cy="16" r="1" fill="#FFB238"/>`,
  sleepy: (st) => `${head(st)}<path d="M12 21 Q15 24 18 21 M22 21 Q25 24 28 21" stroke="#FFB238" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M30 2h5l-5 5h5" stroke="#A9A4D6" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  stray: (st) => `${head(st)}<path d="M29 6 L31 9 L28 10" stroke="#08071A" stroke-width="2" fill="none"/><circle cx="15" cy="21" r="3" fill="#FFB238"/><path d="M21.5 21h7" stroke="#FFB238" stroke-width="2" stroke-linecap="round"/><circle cx="15.5" cy="21" r="1" fill="#05040C"/><path d="M5 24l5 1M5 27l5 0M35 24l-5 1" stroke="#8E89C2" stroke-width="1" stroke-linecap="round"/><path d="M17 30 Q20 28 23 30" stroke="#8E89C2" stroke-width="1.3" fill="none" stroke-linecap="round"/>`,
  lost: (st) => `${head(st, 'M7 15 L8 1 L16 10 L24 10 L32 1 L33 15 Q38 22 33 30 Q20 38 7 30 Q2 22 7 15 Z')}<path d="M3 22l-3-1M3 26l-3 2M37 22l3-1M37 26l3 2" stroke="#8E89C2" stroke-width="1.3" stroke-linecap="round"/><circle cx="15" cy="20" r="4.2" fill="#FFF4D6"/><circle cx="25" cy="20" r="4.2" fill="#FFF4D6"/><circle cx="15" cy="20" r="1.3" fill="#05040C"/><circle cx="25" cy="20" r="1.3" fill="#05040C"/><ellipse cx="20" cy="29" rx="2.2" ry="2.6" fill="#05040C" stroke="#8E89C2" stroke-width="1"/>`
};

export const rankFace = (key, you = false, size = 40) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true">${FACES[key](you ? '#FF2E88' : '#8E89C2')}</svg>`;

/** the small cat head that sits on the YOU marker (magenta outline) */
export const youIcon = () => `<path d="M4 9 L6 0 L11 6 L13 6 L18 0 L20 9 Q24 14 20 20 Q12 26 4 20 Q0 14 4 9 Z" fill="#0B0A18" stroke="#FF2E88" stroke-width="1.5" stroke-linejoin="round"/><circle cx="9" cy="13" r="1.8" fill="#FFB238"/><circle cx="15" cy="13" r="1.8" fill="#FFB238"/>`;
