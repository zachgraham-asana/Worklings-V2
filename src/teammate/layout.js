/**
 * How the exported parts sit in the teammate box.
 *
 * Taken from the `Workling 122` reference frame: a 120px box holding the body
 * at 120px (100%) and the eye plate at 60px, both centred. Stored as ratios,
 * not pixels, so the reference frame can be reauthored at any size without
 * these needing to change.
 *
 * Single source of truth: the DOM preview reads these through CSS custom
 * properties, the canvas composite reads them directly. Two copies is how the
 * builder and the 3D card would quietly drift apart.
 */

/**
 * Bodies render 1:1 — no per-asset fitting.
 *
 * Each export is already calibrated to sit correctly at full size, and their
 * artwork heights vary on purpose: Cloud fills 0.958 of its canvas, Arrow Head
 * 0.766, because a wide shape reads shorter at the same optical weight.
 * Normalising them to a common bounding-box height (an earlier version did)
 * undoes that judgment and makes the flat shapes look oversized.
 */
export const BODY_SCALE = 1;

/** Eye plate size, as a fraction of the teammate box. Constant across bodies. */
export const EYE_SCALE = 0.5; // 60/120

/**
 * Per-body eye placement, as a fraction of the box offset from dead centre.
 *
 * Most bodies are symmetrical enough to take eyes in the middle. These aren't:
 * their mass sits off-axis, so centred eyes land on the wrong lobe. Measured
 * from the `Workling 121/122/123` frames — a 120px box with a 60px plate, so
 * centre is 30,30 and the offset is (placed − 30) / 120.
 *
 * Keyed by the body's menu label, which matches the Figma component's variant
 * name. Anything absent gets centred eyes.
 */
export const EYE_OFFSETS = {
  'Two Squares': { x: -0.15, y: -0.158333 },   // 12,11
  'Worm Boi': { x: -0.116667, y: -0.108333 },  // 16,17
  Kettlebell: { x: 0, y: 0.125 },              // 30,45
};

const CENTRED = { x: 0, y: 0 };

export function eyeOffsetFor(bodyLabel) {
  return EYE_OFFSETS[bodyLabel] ?? CENTRED;
}

// Eye shadows are baked into the eye PNGs, so nothing here draws one. They
// scale with the plate for free, which a CSS filter had to be told to do.
