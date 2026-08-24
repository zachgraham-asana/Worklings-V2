/**
 * The gallery card from the Figma spec, plus its hover behaviour:
 * border takes the character's own colour, the card lifts on a soft shadow,
 * and the character turns to follow the cursor for as long as it's over the
 * card.
 *
 * Pointer tracking is bound on the card, not the character, so the character
 * starts following before the cursor reaches it — which is the whole point of
 * a look-at.
 */

import { CharacterView } from '../character/CharacterView.js';
import { EASINGS } from './panel.js';

/**
 * Hover styling is CSS, not WebGL — these land as custom properties on the
 * card and the transition does the rest.
 */
export const DEFAULT_HOVER = {
  cardScale: 1.02,
  glowSize: 32,      // px of blur on the accent-tinted glow
  glowOpacity: 0.24,
  easing: 'ease-out',
  duration: 220,     // ms
};

export class GalleryCard {
  constructor({ title, description, tags = [] }) {
    this.el = document.createElement('article');
    this.el.className = 'gallery-card';
    this.el.tabIndex = 0;

    this.el.innerHTML = `
      <div class="card-head">
        <div class="character-slot"></div>
        <h4 class="card-title"></h4>
      </div>
      <div class="card-body">
        <p class="card-description"></p>
      </div>
      <div class="card-meta">
        <div class="tag-row"></div>
      </div>
    `;

    this.el.querySelector('.card-title').textContent = title;
    this.el.querySelector('.card-description').textContent = description;

    const tagRow = this.el.querySelector('.tag-row');
    for (const tag of tags) {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = tag;
      tagRow.appendChild(span);
    }

    this.slot = this.el.querySelector('.character-slot');
    this.view = new CharacterView(this.slot);
    this.view.setBounds(this.el);

    this.bindPointer();
  }

  bindPointer() {
    // A pointer that leaves via a fast flick can skip `pointerleave` in some
    // browsers; `pointercancel` and the blur path cover that.
    this.el.addEventListener('pointerenter', () => this.el.classList.add('is-hovered'));
    this.el.addEventListener('pointermove', (e) => this.view.lookAt(e.clientX, e.clientY));
    this.el.addEventListener('pointerleave', () => this.release());
    this.el.addEventListener('pointercancel', () => this.release());

    // Keyboard parity: focusing the card gives the same lit state, with the
    // character looking straight out.
    this.el.addEventListener('focus', () => this.el.classList.add('is-hovered'));
    this.el.addEventListener('blur', () => this.release());
  }

  release() {
    this.el.classList.remove('is-hovered');
    this.view.rest();
  }

  /**
   * Drives the hover border; sampled from the art so each card differs.
   * The glow needs the channels separately — `rgba()` can take a variable
   * alpha, where a hex can't.
   */
  setAccent(hex) {
    this.el.style.setProperty('--card-accent', hex);
    this.el.style.setProperty('--card-accent-rgb', hexToRgbTriplet(hex));
  }

  setHoverStyle({ cardScale, glowSize, glowOpacity, easing, duration }) {
    const style = this.el.style;
    style.setProperty('--hover-scale', cardScale);
    style.setProperty('--glow-size', `${glowSize}px`);
    style.setProperty('--glow-opacity', glowOpacity);
    style.setProperty('--hover-ease', EASINGS[easing] ?? EASINGS['ease-out']);
    style.setProperty('--hover-duration', `${duration}ms`);
  }
}

function hexToRgbTriplet(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}
