/**
 * A composited teammate: greyscale body → Hard Light colour → eyes on top.
 *
 * The colour is a plain filled layer with `mix-blend-mode: hard-light`, which
 * is the same operator Figma and Photoshop use, so what renders here matches
 * what was composited in the design file rather than approximating it.
 *
 * Two details that are easy to get wrong:
 *
 * - The colour layer is *masked by the body*, not just stacked on it. A blend
 *   layer covers its whole box, so without the mask the colour would blend
 *   with the artboard everywhere outside the silhouette.
 * - `.teammate` sets `isolation: isolate`, giving the blend its own stacking
 *   context. Without it, hard-light reaches past the component and tints the
 *   artboard behind it.
 *
 * Eyes sit after the colour layer in the DOM, so they paint on top and stay
 * untinted — the colour applies to the body alone.
 */

import { BODY_LABELS, DEFAULT_BODY, DEFAULT_EYES } from './assets.js';
import { DEFAULT_TEAMMATE_COLOR } from './colors.js';
import { BODY_SCALE, EYE_SCALE, eyeOffsetFor } from './layout.js';

export const DEFAULT_TEAMMATE = {
  body: DEFAULT_BODY,
  eyes: DEFAULT_EYES,
  teammateColor: DEFAULT_TEAMMATE_COLOR,
  teammateSize: 240,
};

export class TeammateView {
  constructor(container, config = {}) {
    this.config = { ...DEFAULT_TEAMMATE, ...config };

    this.el = document.createElement('div');
    this.el.className = 'teammate';
    this.el.innerHTML = `
      <div class="tm-body"></div>
      <img class="tm-eyes" alt="" />
    `;
    container.appendChild(this.el);

    this.bodyEl = this.el.querySelector('.tm-body');
    this.eyesEl = this.el.querySelector('.tm-eyes');

    // Driven from layout.js so the CSS preview and the canvas composite in
    // composite.js can't disagree about how the parts are scaled.
    this.el.style.setProperty('--body-scale', `${BODY_SCALE * 100}%`);
    this.el.style.setProperty('--eye-scale', `${EYE_SCALE * 100}%`);

    this.apply(this.config);
  }

  setConfig(patch) {
    Object.assign(this.config, patch);
    this.apply(patch);
  }

  apply(patch) {
    // Two custom properties drive the whole body render — see the CSS.
    if (patch.body !== undefined) {
      this.el.style.setProperty('--body-image', `url("${patch.body}")`);
      // A few bodies carry their mass off-axis and need the eyes moved with it.
      const { x, y } = eyeOffsetFor(BODY_LABELS.get(patch.body));
      this.el.style.setProperty('--eye-x', `${(x * 100).toFixed(4)}%`);
      this.el.style.setProperty('--eye-y', `${(y * 100).toFixed(4)}%`);
    }
    // The `*-background` tokens are already pitched for Hard Light, so the
    // colour goes in as-authored rather than being derived.
    if (patch.teammateColor !== undefined) {
      this.el.style.setProperty('--teammate-color', patch.teammateColor);
    }
    if (patch.eyes !== undefined) {
      const none = patch.eyes === 'none';
      this.eyesEl.hidden = none;
      if (!none) this.eyesEl.src = patch.eyes;
    }
    if (patch.teammateSize !== undefined) {
      this.el.style.width = `${patch.teammateSize}px`;
      this.el.style.height = `${patch.teammateSize}px`;
    }
  }
}
