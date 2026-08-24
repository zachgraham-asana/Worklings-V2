/**
 * Flatten a built teammate to a single canvas, so the 3D card can wear it.
 *
 * This is the same recipe as the DOM preview — greyscale body, Hard Light
 * colour clipped to the body, eyes with their drop shadow on top — but drawn
 * with canvas operators instead of CSS. `globalCompositeOperation` implements
 * the identical Hard Light formula as `mix-blend-mode`, so the two paths agree
 * pixel for pixel rather than merely looking similar.
 *
 * Note the third draw: filling under `hard-light` paints the whole canvas,
 * including where the body is transparent, so a `destination-in` pass with the
 * body clips the colour back to the silhouette. That's what the mask does on
 * the DOM side.
 */

import { BODY_LABELS } from './assets.js';
import { BODY_SCALE, EYE_SCALE, eyeOffsetFor } from './layout.js';

const cache = new Map();

function loadImage(url) {
  if (cache.has(url)) return cache.get(url);
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load teammate part: ${url}`));
    img.src = url;
  });
  cache.set(url, promise);
  return promise;
}

export async function renderTeammate({ body, eyes, teammateColor }, size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Matches CSS `background-size: contain` inside a box of `scale` × artboard.
  const drawContained = (img, scale, offset = { x: 0, y: 0 }) => {
    const box = size * scale;
    const fit = Math.min(box / img.width, box / img.height);
    const w = img.width * fit;
    const h = img.height * fit;
    ctx.drawImage(img, (size - w) / 2 + offset.x * size, (size - h) / 2 + offset.y * size, w, h);
  };

  const bodyImg = await loadImage(body);
  drawContained(bodyImg, BODY_SCALE);

  ctx.globalCompositeOperation = 'hard-light';
  ctx.fillStyle = teammateColor;
  ctx.fillRect(0, 0, size, size);

  ctx.globalCompositeOperation = 'destination-in';
  drawContained(bodyImg, BODY_SCALE);
  ctx.globalCompositeOperation = 'source-over';

  // Straight draw — the eye PNGs carry their own shadow.
  if (eyes && eyes !== 'none') {
    drawContained(await loadImage(eyes), EYE_SCALE, eyeOffsetFor(BODY_LABELS.get(body)));
  }

  return canvas;
}
