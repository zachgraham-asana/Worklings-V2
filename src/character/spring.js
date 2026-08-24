/**
 * Damped spring, integrated in fixed substeps so a dropped frame can't make it
 * explode. Slightly underdamped by default: the character overshoots a touch
 * when it snaps to the cursor, which is what makes it read as a physical head
 * turn rather than a CSS transition.
 */

const SUBSTEP = 1 / 120;
const REST_VALUE = 0.0002;
const REST_VELOCITY = 0.0015;

export class Spring {
  constructor({ stiffness = 90, damping = 14, value = 0 } = {}) {
    this.stiffness = stiffness;
    this.damping = damping;
    this.value = value;
    this.target = value;
    this.velocity = 0;
  }

  set(value) {
    this.value = value;
    this.target = value;
    this.velocity = 0;
  }

  /** @returns {boolean} true while still moving. */
  step(dt) {
    let remaining = Math.min(dt, 0.1);
    while (remaining > 0) {
      const h = Math.min(SUBSTEP, remaining);
      const accel =
        this.stiffness * (this.target - this.value) - this.damping * this.velocity;
      this.velocity += accel * h;
      this.value += this.velocity * h;
      remaining -= h;
    }

    if (
      Math.abs(this.target - this.value) < REST_VALUE &&
      Math.abs(this.velocity) < REST_VELOCITY
    ) {
      this.value = this.target;
      this.velocity = 0;
      return false;
    }
    return true;
  }
}
