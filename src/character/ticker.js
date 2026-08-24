/**
 * One rAF loop for every character on the page, rendering on demand.
 *
 * A gallery of settled cards costs nothing: the loop parks itself as soon as
 * every view reports it has stopped moving, and any interaction calls `wake()`
 * to restart it. Views ask for one extra frame after settling so the final
 * resting pose is always the one on screen.
 */

class Ticker {
  constructor() {
    this.views = new Set();
    this.frame = null;
    this.last = 0;
    this.settleFrames = 0;
  }

  add(view) {
    this.views.add(view);
    this.wake();
  }

  remove(view) {
    this.views.delete(view);
  }

  wake() {
    this.settleFrames = 2;
    if (this.frame === null) {
      this.last = performance.now();
      this.frame = requestAnimationFrame(this.loop);
    }
  }

  loop = (now) => {
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;

    let moving = false;
    for (const view of this.views) {
      if (view.tick(dt)) moving = true;
    }

    if (moving) {
      this.settleFrames = 2;
    } else if (this.settleFrames > 0) {
      this.settleFrames -= 1;
    } else {
      this.frame = null;
      return;
    }

    this.frame = requestAnimationFrame(this.loop);
  };
}

export const ticker = new Ticker();
