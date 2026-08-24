/**
 * A single character, rendered in its own WebGL context, that turns to face a
 * point on the page.
 *
 * The rig is deliberately subject-agnostic: it springs yaw/pitch/lift/scale
 * toward a target and applies them to whatever Object3D it holds. Swapping the
 * PNG sprite for a loaded OBJ changes `setSubject`'s argument and nothing else.
 *
 * Framing note: the canvas is drawn larger than the 48px slot it sits in
 * (see OVERSCAN) and is pointer-transparent, so the character can lean and
 * scale past its box without being clipped.
 */

import {
  AmbientLight,
  DirectionalLight,
  Group,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';

import { Spring } from './spring.js';
import { ticker } from './ticker.js';

const FOV = 26;
const OVERSCAN = 2; // canvas edge length / slot edge length

// A side closer than this fraction of Reach still requires that much travel,
// so a near edge gives more range without becoming hair-trigger.
const MIN_REACH_FRACTION = 0.45;

export const DEFAULT_CONFIG = {
  maxYaw: 0.26,       // radians at full cursor deflection (~15°)
  maxPitch: 0.28,     // ~16°
  reach: 180,         // px of cursor travel for full deflection (capped per side)
  shift: 0.05,        // world-units of positional parallax
  hoverScale: 1.1,
  curve: 0.195,       // barrel depth of the sprite plane
  stiffness: 90,
  damping: 14,
  ambient: 2.25,
  key: 1.5,           // moving key light, sells the turn
};

export class CharacterView {
  constructor(container, config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.subject = null;
    this.disposed = false;

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'character-canvas';
    container.appendChild(this.canvas);
    this.container = container;

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setClearAlpha(0);

    this.scene = new Scene();
    this.pivot = new Group();
    this.scene.add(this.pivot);

    // Distance chosen so one world unit of subject height fills 1/OVERSCAN of
    // the canvas — i.e. exactly the slot it nominally occupies.
    this.camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
    this.camera.position.z = OVERSCAN / (2 * Math.tan((FOV * Math.PI) / 360));

    this.ambient = new AmbientLight(0xffffff, this.config.ambient);
    this.key = new DirectionalLight(0xffffff, this.config.key);
    this.key.position.set(0, 0, 2);
    this.scene.add(this.ambient, this.key);

    this.yaw = new Spring(this.springOpts());
    this.pitch = new Spring(this.springOpts());
    this.slide = new Spring(this.springOpts());
    this.lift = new Spring(this.springOpts());
    this.grow = new Spring({ ...this.springOpts(), value: 1 });
    this.springs = [this.yaw, this.pitch, this.slide, this.lift, this.grow];

    this.resize();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);

    ticker.add(this);
  }

  springOpts() {
    return { stiffness: this.config.stiffness, damping: this.config.damping };
  }

  setSubject(object3d) {
    if (this.subject) {
      this.pivot.remove(this.subject);
      disposeTree(this.subject);
    }
    this.subject = object3d;
    if (object3d) this.pivot.add(object3d);
    ticker.wake();
  }

  /**
   * The region the cursor can actually travel in — used to keep deflection
   * even on all four sides. Without it the character barely turns toward its
   * near edges.
   */
  setBounds(element) {
    this.boundsEl = element;
  }

  /**
   * Aim at a page-space point. Deflection is measured from the character's own
   * centre rather than from the card's, so it genuinely tracks the cursor
   * instead of just mirroring where the pointer sits within the card.
   *
   * Reach is capped per side by how much room there actually is. The character
   * sits near the card's top-left corner, so a symmetric reach lets the cursor
   * pull a full turn to the right (344px of card) but only a twitch to the
   * left (56px) — it looks like it can't turn that way. Each side instead gets
   * the smaller of `reach` and its own available travel, with a floor so a
   * close edge doesn't make that axis hair-trigger.
   */
  lookAt(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const { reach, maxYaw, maxPitch, shift } = this.config;

    const bounds = this.boundsEl?.getBoundingClientRect();
    const sideReach = (available) =>
      Math.max(reach * MIN_REACH_FRACTION, Math.min(reach, available));

    const dx = clientX - cx;
    const dy = clientY - cy;
    const spanX = bounds ? sideReach(dx < 0 ? cx - bounds.left : bounds.right - cx) : reach;
    const spanY = bounds ? sideReach(dy < 0 ? cy - bounds.top : bounds.bottom - cy) : reach;

    const nx = clamp(dx / spanX, -1, 1);
    const ny = clamp(dy / spanY, -1, 1);

    // Ease the deflection so small cursor moves near the character are gentle
    // and the extremes don't slam into the clamp.
    const ex = ease(nx);
    const ey = ease(ny);

    this.yaw.target = ex * maxYaw;
    this.pitch.target = ey * maxPitch;
    this.slide.target = ex * shift;
    this.lift.target = -ey * shift;
    this.grow.target = this.config.hoverScale;

    this.key.position.set(ex * 2.4, -ey * 2.4, 2);
    ticker.wake();
  }

  rest() {
    this.yaw.target = 0;
    this.pitch.target = 0;
    this.slide.target = 0;
    this.lift.target = 0;
    this.grow.target = 1;
    this.key.position.set(0, 0, 2);
    ticker.wake();
  }

  setConfig(patch) {
    Object.assign(this.config, patch);
    for (const s of this.springs) {
      s.stiffness = this.config.stiffness;
      s.damping = this.config.damping;
    }
    this.ambient.intensity = this.config.ambient;
    this.key.intensity = this.config.key;
    if (patch.curve !== undefined) {
      this.subject?.userData.rebuildCurve?.(patch.curve);
    }
    ticker.wake();
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const size = Math.max(1, Math.round(Math.max(rect.width, rect.height) * OVERSCAN));
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(size, size, false);
    this.camera.aspect = 1;
    this.camera.updateProjectionMatrix();
    ticker.wake();
  }

  /** @returns {boolean} true while still animating. */
  tick(dt) {
    if (this.disposed || !this.subject) return false;

    const moving = this.springs.map((s) => s.step(dt)).some(Boolean);

    this.pivot.rotation.y = this.yaw.value;
    this.pivot.rotation.x = this.pitch.value;
    this.pivot.position.x = this.slide.value;
    this.pivot.position.y = this.lift.value;
    this.pivot.scale.setScalar(this.grow.value);

    this.renderer.render(this.scene, this.camera);
    return moving;
  }

  dispose() {
    this.disposed = true;
    ticker.remove(this);
    this.observer.disconnect();
    if (this.subject) disposeTree(this.subject);
    this.renderer.dispose();
    this.canvas.remove();
  }
}

function disposeTree(root) {
  root.traverse?.((child) => {
    if (!child.isMesh) return;
    child.geometry?.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const m of materials) {
      m?.map?.dispose();
      m?.dispose();
    }
  });
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Smooth, odd, and flat near zero: f(±1) = ±1.
const ease = (t) => {
  const s = Math.sign(t);
  const a = Math.abs(t);
  return s * (a * a * (3 - 2 * a));
};
