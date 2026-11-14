/**
 * A tiny 5×7 pixel font, like the dot-matrix look of the Doto typeface.
 * Each glyph is 7 rows of 5 characters; '#' is a lit pixel.
 * Only uppercase letters, digits and a few symbols are included.
 */
const GLYPHS = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};

export const GLYPH_WIDTH = 5;
export const GLYPH_HEIGHT = 7;
const LETTER_GAP = 1;
const LINE_GAP = 3;

/**
 * Turn lines of text into a list of lit pixels.
 *
 * lines: e.g. [{ text: 'ILYAS ', color: 'w' }, …] per line, so different words
 *        can have different colours.
 * Returns { pixels: [{ x, y, color }], width, height } with y = 0 at the top.
 */
export function layoutPixelText(lines) {
  const pixels = [];
  let widest = 0;

  lines.forEach((segments, lineIndex) => {
    const top = lineIndex * (GLYPH_HEIGHT + LINE_GAP);
    let cursorX = 0;
    for (const { text, color } of segments) {
      for (const character of text.toUpperCase()) {
        const glyph = GLYPHS[character] ?? GLYPHS[' '];
        glyph.forEach((row, rowIndex) => {
          [...row].forEach((cell, columnIndex) => {
            if (cell === '#') pixels.push({ x: cursorX + columnIndex, y: top + rowIndex, color });
          });
        });
        cursorX += GLYPH_WIDTH + LETTER_GAP;
      }
    }
    widest = Math.max(widest, cursorX - LETTER_GAP);
  });

  const height = lines.length * GLYPH_HEIGHT + (lines.length - 1) * LINE_GAP;
  return { pixels, width: widest, height };
}
