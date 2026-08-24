/**
 * "Workling Thinking" — the Pill from Figma: a Workling, its name, and an
 * "is working" status, with the Workling pulsing to show it's processing.
 *
 * The Workling itself is a `TeammateView`, so it's always whatever's built in
 * the Workling Builder — same body, colour, eyes.
 *
 * Two things worth knowing about how the pulse is driven:
 *
 * - Size is a pure function of phase, not a spring. A spring can't express
 *   "no easing" — zero damping oscillates forever — and the controls here are
 *   meant to bottom out at 0. See `shaped()` for the curve.
 * - Only the Workling scales, via `transform` inside a fixed-size slot. The
 *   slot reserves room for the largest the Workling gets, so the pill and its
 *   text never move. Animating width/height instead would reflow the row every
 *   frame and make the text jitter.
 *
 * The pill border reads `--card-accent`, the same root-level property the 3D
 * card's hover border uses — sampled from whatever Workling is built, so the
 * chrome picks up the character's colour without extra wiring.
 */

import { ticker } from '../character/ticker.js';
import { TeammateView } from './TeammateView.js';

export const DEFAULT_PULSE = {
  thinkingMaxSize: 32,      // px — the large end of the pulse
  thinkingMinSize: 24,      // px — the small end (labelled "Min Scale")
  thinkingSpeed: 830,       // ms per half-cycle; a full pulse is 2x this
  thinkingBounce: 0,        // overshoot past the target; 0 = none
  thinkingEaseUp: 0.15,     // 0 = linear, 1 = fully eased, on the way up
  thinkingEaseDown: 0.65,   // and on the way down
  thinkingBorderAnimate: true, // off = a plain solid ring in the accent colour
  thinkingBorderSpeed: 2000,   // ms for the border marquee to travel once round
};

/**
 * One half-cycle's progress curve, shaped by two independent controls that
 * both mean "none" at 0.
 *
 * `backOut` is the standard easeOutBack. Its tension term is the bounce, and
 * at tension 0 it collapses to easeOutCubic — a clean ease with no overshoot —
 * which is exactly what "no bounce" should mean. `ease` then blends that
 * against a straight line, so 0 is genuinely linear.
 *
 * Both endpoints stay exact at any setting (f(0) = 0, f(1) = 1), so the loop
 * can't drift or leave a seam where the direction flips.
 */
function shaped(p, ease, bounce) {
  const backOut = 1 + (bounce + 1) * (p - 1) ** 3 + bounce * (p - 1) ** 2;
  return p + (backOut - p) * ease;
}

export class PulseView {
  constructor(container, config = {}) {
    this.config = { ...DEFAULT_PULSE, ...config };
    this.elapsed = 0;
    this.goingUp = true;
    this.angle = 0; // marquee position, degrees clockwise from the top

    this.el = document.createElement('div');
    this.el.className = 'pulse-pill';
    this.el.innerHTML = `
      <span class="pulse-slot"></span>
      <span class="pulse-name">Campaign Strategist</span>
      <span class="pulse-status">is working</span>
    `;
    container.appendChild(this.el);

    this.slot = this.el.querySelector('.pulse-slot');

    // No body/eyes/colour override: TeammateView's own defaults are the same
    // DEFAULT_TEAMMATE the builder starts on, so the two begin in sync with no
    // hand-off, and main.js forwards every builder change from then on.
    this.teammateView = new TeammateView(this.slot);

    this.running = false;
    this.layoutSlot();
    this.applyBorderMode();
    this.draw(this.config.thinkingMaxSize);
  }

  start() {
    if (this.running) return;
    this.running = true;
    ticker.add(this);
  }

  stop() {
    this.running = false;
    ticker.remove(this);
  }

  /**
   * Sized off both ends, so a Min above Max still fits rather than spilling
   * over the name.
   */
  layoutSlot() {
    this.slotSize = Math.max(
      this.config.thinkingMaxSize,
      this.config.thinkingMinSize,
      1
    );
    this.slot.style.width = `${this.slotSize}px`;
    this.slot.style.height = `${this.slotSize}px`;
    this.teammateView.setConfig({ teammateSize: this.slotSize });
  }

  setConfig(patch) {
    Object.assign(this.config, patch);

    // Visual identity mirrors the Workling Builder, forwarded here the same
    // way it's forwarded to the 3D card.
    if ('body' in patch || 'eyes' in patch || 'teammateColor' in patch) {
      this.teammateView.setConfig(patch);
    }
    if ('thinkingMaxSize' in patch || 'thinkingMinSize' in patch) {
      this.layoutSlot();
    }
    if ('thinkingBorderAnimate' in patch) this.applyBorderMode();
    // Repaint at the current phase so a slider moved while paused still shows.
    if (!this.running) this.draw(this.sizeAtPhase());
  }

  sizeAtPhase() {
    const { thinkingMaxSize, thinkingMinSize, thinkingBounce, thinkingSpeed } = this.config;
    const half = Math.max(thinkingSpeed, 1) / 1000;
    const p = Math.min(this.elapsed / half, 1);
    const from = this.goingUp ? thinkingMinSize : thinkingMaxSize;
    const to = this.goingUp ? thinkingMaxSize : thinkingMinSize;
    const ease = this.goingUp ? this.config.thinkingEaseUp : this.config.thinkingEaseDown;
    return from + (to - from) * shaped(p, ease, thinkingBounce);
  }

  /** @returns {boolean} always true — a pulse never settles. */
  tick(dt) {
    const half = Math.max(this.config.thinkingSpeed, 1) / 1000;
    this.elapsed += dt;
    while (this.elapsed >= half) {
      this.elapsed -= half;
      this.goingUp = !this.goingUp;
    }

    // Marquee runs on its own clock, independent of the pulse — the two are
    // deliberately allowed to drift against each other rather than locking.
    if (this.config.thinkingBorderAnimate) {
      const revolution = Math.max(this.config.thinkingBorderSpeed, 1) / 1000;
      this.angle = (this.angle + (dt / revolution) * 360) % 360;
      this.el.style.setProperty('--marquee-angle', `${this.angle.toFixed(2)}deg`);
    }

    this.draw(this.sizeAtPhase());
    return true;
  }

  applyBorderMode() {
    this.el.classList.toggle('is-static', !this.config.thinkingBorderAnimate);
  }

  draw(size) {
    // Overshoot past the slot is intentional — that's the bounce. The pill's
    // padding gives it room without pushing the text.
    const scale = size / (this.slotSize || 1);
    this.teammateView.el.style.transform = `scale(${scale.toFixed(4)})`;
  }

  dispose() {
    this.stop();
    this.el.remove();
  }
}
