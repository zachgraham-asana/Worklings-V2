/**
 * Render the shape loop to an animated GIF.
 *
 * Frames are drawn with Path2D straight onto a canvas rather than by
 * serialising the live SVG — same path data, but no image decoding per frame
 * and no dependence on what the DOM happens to be showing.
 *
 * Three things carry the output quality:
 *
 * 1. Export resolution is its own setting, not the preview size. A 56px
 *    preview is a fine working size and a terrible deliverable.
 * 2. Frames are supersampled 2x and boxed down, so coverage at the edges is
 *    measured rather than guessed.
 * 3. Edges antialias *only* when matted onto a solid colour. GIF alpha is one
 *    bit — a pixel is fully there or fully gone — so a transparent export
 *    can't have soft edges at any resolution. Matting spends the transparency
 *    to buy a smooth ramp from backing colour to ink.
 *
 * Each frame carries its own local colour table, which is what lets Cycle
 * Color work: one ink per frame means a full 64-step ramp is available for
 * that frame's colour instead of splitting 256 entries across nine.
 */

import { GIFEncoder } from 'gifenc';
import { SHAPES } from './shapes.js';
import { poseAt } from './LoopPlayer.js';
import { colorForShape } from './palette.js';

const VIEWBOX = 32;
const SUPERSAMPLE = 2;
const ALPHA_CUTOFF = 128;
const RAMP_STEPS = 64; // matte gradations between backing and ink

export const DEFAULT_EXPORT = {
  exportSize: 512,
  exportFps: '50',
  exportBg: 'transparent',
};

export async function exportLoopGif(config, { onProgress } = {}) {
  const count = Math.min(config.shapeCount, SHAPES.length);
  const size = Math.round(config.exportSize ?? config.shapeSize);
  const fps = Number(config.exportFps ?? 50);
  const matte = config.exportBg && config.exportBg !== 'transparent'
    ? hexToRgb(config.exportBg)
    : null;

  // Spin adds a quarter-turn per beat, so the shape cycle alone doesn't return
  // to the starting orientation unless the count is a multiple of 4. Run extra
  // cycles until rotation lands back on 360°, otherwise the GIF jumps as it
  // wraps. Every other style loops in exactly one cycle.
  const cycles = config.transition === 'spin' ? 4 / gcd(count, 4) : 1;
  const totalBeats = count * cycles;
  const period = totalBeats * (config.beat / 1000);

  // GIF delays are whole hundredths of a second, so the frame count is derived
  // from the delay rather than the other way round.
  const delayCs = Math.max(2, Math.round(100 / fps));
  const totalFrames = Math.max(2, Math.round((period * 100) / delayCs));

  const hi = size * SUPERSAMPLE;
  const big = document.createElement('canvas');
  big.width = hi;
  big.height = hi;
  const bigCtx = big.getContext('2d');

  const small = document.createElement('canvas');
  small.width = size;
  small.height = size;
  const ctx = small.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const paths = SHAPES.slice(0, count).map((d) => new Path2D(d));
  const gif = GIFEncoder();
  const ramps = new Map();

  for (let frame = 0; frame < totalFrames; frame += 1) {
    // Sample by fraction of the period, never by absolute time. Any rounding
    // in the frame count then stays a rounding of playback speed rather than
    // becoming a gap or overlap at the loop point.
    const elapsed = (frame / totalFrames) * period;
    const turns = Math.floor(elapsed / (config.beat / 1000));
    const t = (elapsed % (config.beat / 1000)) / (config.beat / 1000);
    const pose = poseAt(t, turns % count, turns, config);
    const ink = hexToRgb(colorForShape(pose.index, config.cycleColor));

    bigCtx.clearRect(0, 0, hi, hi);
    bigCtx.save();
    bigCtx.scale((hi / VIEWBOX), (hi / VIEWBOX));
    bigCtx.translate(16, 16 + pose.dy);
    if (pose.rot) bigCtx.rotate((pose.rot * Math.PI) / 180);
    bigCtx.scale(pose.sx, pose.sy);
    bigCtx.translate(-16, -16);
    bigCtx.fillStyle = '#fff'; // colour is applied via the palette, not here
    bigCtx.fill(paths[pose.index]);
    bigCtx.restore();

    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(big, 0, 0, size, size);

    const { data } = ctx.getImageData(0, 0, size, size);
    const indexed = new Uint8Array(size * size);
    let palette;

    if (matte) {
      palette = rampFor(ramps, matte, ink);
      for (let i = 0; i < indexed.length; i += 1) {
        indexed[i] = Math.round((data[i * 4 + 3] / 255) * (RAMP_STEPS - 1));
      }
      gif.writeFrame(indexed, size, size, { palette, delay: delayCs * 10 });
    } else {
      palette = [[255, 255, 255], ink];
      for (let i = 0; i < indexed.length; i += 1) {
        indexed[i] = data[i * 4 + 3] >= ALPHA_CUTOFF ? 1 : 0;
      }
      gif.writeFrame(indexed, size, size, {
        palette,
        delay: delayCs * 10,
        transparent: true,
        transparentIndex: 0,
        dispose: 2, // clear to background, or shapes smear across frames
      });
    }

    onProgress?.((frame + 1) / totalFrames);
    // Yield periodically so a long export doesn't lock the tab.
    if (frame % 4 === 3) await new Promise((r) => setTimeout(r, 0));
  }

  gif.finish();
  return new Blob([gif.bytesView()], { type: 'image/gif' });
}

/** Backing → ink ramp, cached because Cycle Color reuses nine of them. */
function rampFor(cache, bg, ink) {
  const key = ink.join(',');
  let ramp = cache.get(key);
  if (!ramp) {
    ramp = Array.from({ length: RAMP_STEPS }, (_, i) => {
      const k = i / (RAMP_STEPS - 1);
      return [
        Math.round(bg[0] + (ink[0] - bg[0]) * k),
        Math.round(bg[1] + (ink[1] - bg[1]) * k),
        Math.round(bg[2] + (ink[2] - bg[2]) * k),
      ];
    });
    cache.set(key, ramp);
  }
  return ramp;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}
