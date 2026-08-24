/**
 * Teammate body colours — the `*-background` tokens.
 *
 * Deliberately separate from the brand palette in `twod/palette.js`. These are
 * already pitched light enough to sit on top of a greyscale body in Hard Light
 * and come out looking like the art; the brand colours are saturated identity
 * colours that would blend far darker. Two sets, two jobs.
 *
 * `indigo` is what the reference character in Figma uses, hence the default.
 */

export const TEAMMATE_COLORS = [
  { token: 'background', label: 'Background', hex: '#C5C5C5' },
  { token: 'red-background', label: 'Red', hex: '#FF878A' },
  { token: 'orange-background', label: 'Orange', hex: '#FEA06A' },
  { token: 'yellow-orange-background', label: 'Yellow Orange', hex: '#F7BD51' },
  { token: 'yellow-background', label: 'Yellow', hex: '#F6D861' },
  { token: 'yellow-green-background', label: 'Yellow Green', hex: '#C3E684' },
  { token: 'green-background', label: 'Green', hex: '#85D7A2' },
  { token: 'blue-green-background', label: 'Blue Green', hex: '#77D3E9' },
  { token: 'aqua-background', label: 'Aqua', hex: '#A1E7DD' },
  { token: 'blue-background', label: 'Blue', hex: '#79ABFF' },
  { token: 'indigo-background', label: 'Indigo', hex: '#B8ACFF' },
  { token: 'purple-background', label: 'Purple', hex: '#E39EF2' },
  { token: 'magenta-background', label: 'Magenta', hex: '#FAAEE9' },
  { token: 'hot-pink-background', label: 'Hot Pink', hex: '#FF95C9' },
  { token: 'pink-background', label: 'Pink', hex: '#FFAFC1' },
  { token: 'cool-gray-background', label: 'Cool Gray', hex: '#AAAAAA' },
];

export const DEFAULT_TEAMMATE_COLOR = '#B8ACFF'; // indigo-background
