/**
 * Pull a card-accent colour out of the character art itself.
 *
 * The gallery will hold many characters, each its own colour, so hard-coding
 * the hover border to this character's blue would not survive the second card.
 * Instead: bin the opaque pixels by hue, take the most-represented saturated
 * hue, and average it. Near-black (the eyes) and near-white are skipped so the
 * body colour wins.
 */

const FALLBACK = '#2E9FEA';

export function sampleAccent(image, { fallback = FALLBACK } = {}) {
  try {
    const size = 96; // plenty for a colour histogram, cheap to read back
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    const bins = new Array(36).fill(null).map(() => ({ n: 0, r: 0, g: 0, b: 0 }));

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 200) continue; // transparent surround

      const r = data[i], g = data[i + 1], b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const light = (max + min) / 2 / 255;
      const chroma = max - min;
      if (chroma < 40) continue;             // greys, eyes, highlights
      if (light < 0.12 || light > 0.94) continue;

      const hue = rgbToHue(r, g, b, max, chroma);
      const bin = bins[Math.floor(hue / 10) % 36];
      bin.n += 1;
      bin.r += r;
      bin.g += g;
      bin.b += b;
    }

    const best = bins.reduce((a, b) => (b.n > a.n ? b : a), bins[0]);
    if (!best.n) return fallback;

    return toHex(...forUi(best.r / best.n, best.g / best.n, best.b / best.n));
  } catch {
    // Tainted canvas (a cross-origin image) or no 2d context available.
    return fallback;
  }
}

/**
 * Averaging the body pixels keeps the hue but not the punch: art lit from the
 * top-left averages toward its own highlights, and the 3D character comes out
 * around #83c9f8 — a powder blue that all but disappears as a 1px border on
 * white. Hue is the part worth trusting, so keep it and force saturation and
 * lightness into a band that actually reads as a UI accent.
 */
function forUi(r, g, b) {
  const [h, s, l] = rgbToHsl(r, g, b);
  return hslToRgb(h, Math.max(s, 0.55), Math.min(Math.max(l, 0.42), 0.6));
}

function rgbToHsl(r, g, b) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const chroma = max - min;
  if (!chroma) return [0, 0, l];

  const s = chroma / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === rn) h = ((gn - bn) / chroma) % 6;
  else if (max === gn) h = (bn - rn) / chroma + 2;
  else h = (rn - gn) / chroma + 4;
  h *= 60;
  return [h < 0 ? h + 360 : h, s, l];
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] :
    h < 120 ? [x, c, 0] :
    h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] :
    h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function rgbToHue(r, g, b, max, chroma) {
  let h;
  if (max === r) h = ((g - b) / chroma) % 6;
  else if (max === g) h = (b - r) / chroma + 2;
  else h = (r - g) / chroma + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

function toHex(r, g, b) {
  const c = (v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
