/** Brand palette used by the loop's Cycle Color mode. */
export const PALETTE = [
  { name: 'Blue', hex: '#0071FF' },
  { name: 'Green', hex: '#0FA042' },
  { name: 'Light Yellow', hex: '#F8F54A' },
  { name: 'Grey', hex: '#808080' },
  { name: 'Magenta', hex: '#F20D83' },
  { name: 'Turquoise', hex: '#009271' },
  { name: 'Purple', hex: '#745BFA' },
  { name: 'Orange', hex: '#FF7A00' },
  { name: 'Fuchsia', hex: '#FD3FFD' },
];

export const INK = '#000000';

/**
 * Colour is a pure function of which shape is showing — never of elapsed time
 * or beat count. That's what keeps a GIF loop seamless when the shape count
 * and the palette length don't divide evenly (12 shapes over 9 colours): the
 * cycle returns to shape 0, so it returns to colour 0 with it.
 */
export function colorForShape(index, cycleColor) {
  return cycleColor ? PALETTE[index % PALETTE.length].hex : INK;
}
