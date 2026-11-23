// The POUNCE wordmark, hand-drawn as pixels so the C is clearly open (no G).
// Moon-cream letters with a hard magenta offset shadow.
const GLYPHS = {
  P: ['1111.', '1...1', '1...1', '1111.', '1....', '1....', '1....'],
  O: ['.111.', '1...1', '1...1', '1...1', '1...1', '1...1', '.111.'],
  U: ['1...1', '1...1', '1...1', '1...1', '1...1', '1...1', '.111.'],
  N: ['1...1', '11..1', '11..1', '1.1.1', '1..11', '1..11', '1...1'],
  C: ['.111.', '1...1', '1....', '1....', '1....', '1...1', '.111.'],
  E: ['11111', '1....', '1....', '1111.', '1....', '1....', '11111']
};

export function logoSVG({ cls = 'logo-svg' } = {}) {
  const word = 'POUNCE';
  const cell = 6;
  const gap = 1; // cells between letters
  const sh = 3;  // shadow offset (units)
  const rects = (fill, dx, dy) => {
    let out = '';
    word.split('').forEach((ch, li) => {
      const ox = li * (5 + gap) * cell;
      GLYPHS[ch].forEach((row, y) => {
        for (let x = 0; x < 5; x++) if (row[x] === '1') out += `<rect x="${ox + x * cell + dx}" y="${y * cell + dy}" width="${cell}" height="${cell}" fill="${fill}"/>`;
      });
    });
    return out;
  };
  const w = word.length * 5 * cell + (word.length - 1) * gap * cell;
  const h = 7 * cell;
  return `<svg class="${cls}" viewBox="0 0 ${w + sh} ${h + sh}" shape-rendering="crispEdges" role="img" aria-label="POUNCE">
    ${rects('#FF4F9A', sh, sh)}${rects('#F4E7C3', 0, 0)}</svg>`;
}
