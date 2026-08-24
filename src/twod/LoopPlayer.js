/**
 * Flat 2D shape loop: one shape sits, squashes, then pops back out as the next
 * shape — so the bounce reads as the thing that produces the change.
 *
 * These paths have wildly different node counts, so a true path morph isn't
 * available. The swap is instant instead, hidden inside the bounce: it happens
 * at maximum compression, the one frame where the silhouette is least legible.
 * The eye reads continuous motion rather than a cut.
 *
 * One beat, in normalised time:
 *   0    → 0.18  wind up
 *   0.18          *swap to the next shape*
 *   0.18 → 0.62  release — easeOutBack past the target, then settle
 *   0.62 → 1     hold
 *
 * All three transition styles share that timeline and a single `wind` value
 * (0 at rest, 1 fully wound, negative while overshooting). Only what `wind`
 * drives differs:
 *
 *   squash  wide-and-short with a downward dip, overshooting into a stretch
 *   scale   uniform shrink about the centre, overshooting into a pop
 *   spin    a quarter-turn per beat with a slight shrink for weight
 *
 * Spin also swaps later — halfway through the rotation rather than at the
 * start of it, so the turn reveals the new shape instead of just carrying it.
 */

import { SHAPES } from './shapes.js';
import { colorForShape } from './palette.js';
import { ticker } from '../character/ticker.js';

const SQUASH_END = 0.18;
const RELEASE_END = 0.62;
const DIP = 3.2; // viewBox units the shape sinks while compressed

export const DEFAULT_LOOP = {
  shapeCount: 12,
  beat: 400,             // ms per shape
  transition: 'squash',  // squash | scale | spin
  squash: 0.24,          // deformation depth at full wind-up
  overshoot: 1.25,       // easeOutBack tension
  shapeSize: 56,         // rendered px
  cycleColor: false,     // step through the brand palette as shapes change
};

export class LoopPlayer {
  constructor(container, config = {}) {
    this.config = { ...DEFAULT_LOOP, ...config };
    this.elapsed = 0;
    this.beatIndex = 0;
    this.turns = 0;
    this.running = false;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 32 32');
    svg.classList.add('loop-svg');

    this.group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.path.setAttribute('fill', '#000');
    this.group.appendChild(this.path);
    svg.appendChild(this.group);
    container.appendChild(svg);

    this.svg = svg;
    this.renderedIndex = -1;
    this.applySize();
  }

  get shapeCount() {
    return Math.min(this.config.shapeCount, SHAPES.length);
  }

  applySize() {
    const px = `${this.config.shapeSize}px`;
    this.svg.style.width = px;
    this.svg.style.height = px;
  }

  setConfig(patch) {
    Object.assign(this.config, patch);
    if (patch.shapeSize !== undefined) this.applySize();
    if (patch.shapeCount !== undefined) {
      // Keep the cycle inside the new range rather than waiting for it to lap.
      this.beatIndex %= this.shapeCount;
    }
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

  /** @returns {boolean} always true — a loop never settles. */
  tick(dt) {
    const beatSeconds = this.config.beat / 1000;
    this.elapsed += dt;
    while (this.elapsed >= beatSeconds) {
      this.elapsed -= beatSeconds;
      this.beatIndex = (this.beatIndex + 1) % this.shapeCount;
      this.turns += 1;
    }

    this.apply(poseAt(this.elapsed / beatSeconds, this.beatIndex, this.turns, this.config));
    return true;
  }

  apply(pose) {
    if (pose.index !== this.renderedIndex) {
      this.path.setAttribute('d', SHAPES[pose.index]);
      this.renderedIndex = pose.index;
    }
    const fill = colorForShape(pose.index, this.config.cycleColor);
    if (fill !== this.renderedFill) {
      this.path.setAttribute('fill', fill);
      this.renderedFill = fill;
    }
    this.group.setAttribute('transform', poseTransform(pose));
  }

  dispose() {
    this.stop();
    this.svg.remove();
  }
}

/**
 * The whole animation as a pure function of time, so the live player and the
 * GIF exporter can't drift apart — the exporter samples this at fixed
 * intervals instead of re-deriving the motion.
 *
 * @param t      0..1 within the current beat
 * @param beat   which shape the beat started on
 * @param turns  quarter-turns elapsed; unbounded so spin never snaps back
 */
export function poseAt(t, beat, turns, config) {
  const { squash: amount, overshoot, transition } = config;
  const count = Math.min(config.shapeCount, SHAPES.length);

  // `wind`: 0 at rest, 1 fully wound, negative while overshooting past rest.
  let wind;
  let release;
  if (t < SQUASH_END) {
    wind = easeInQuad(t / SQUASH_END);
    release = 0;
  } else if (t < RELEASE_END) {
    release = easeOutBack((t - SQUASH_END) / (RELEASE_END - SQUASH_END), overshoot);
    wind = 1 - release;
  } else {
    wind = 0;
    release = 1;
  }

  // Spin reveals the new shape mid-turn; the others swap at peak deformation.
  const swapped =
    transition === 'spin' ? release >= 0.5 : t >= SQUASH_END;
  const index = (beat + (swapped ? 1 : 0)) % count;

  if (transition === 'scale') {
    const s = 1 - amount * wind;
    return { index, sx: s, sy: s, dy: 0, rot: 0 };
  }

  if (transition === 'spin') {
    const s = 1 - amount * 0.5 * wind;
    return { index, sx: s, sy: s, dy: 0, rot: (turns + release) * 90 };
  }

  return {
    index,
    sx: 1 + amount * wind,
    sy: 1 - amount * wind,
    dy: DIP * wind,
    rot: 0,
  };
}

export function poseTransform({ sx, sy, dy, rot }) {
  const parts = [`translate(16 ${(16 + dy).toFixed(3)})`];
  if (rot) parts.push(`rotate(${rot.toFixed(3)})`);
  parts.push(`scale(${sx.toFixed(4)} ${sy.toFixed(4)})`, 'translate(-16 -16)');
  return parts.join(' ');
}

const easeInQuad = (p) => p * p;
const easeOutBack = (p, s) => 1 + (s + 1) * (p - 1) ** 3 + s * (p - 1) ** 2;
