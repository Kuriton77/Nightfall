// Keyboard + pointer input. Tracks held keys, exposes a normalized WASD move
// axis, and the latest mouse position in screen (CSS-pixel) coordinates for
// free-aim.

export class Input {
  constructor(target = window) {
    this.keys = new Set();
    // Seed the mouse at screen center so free-aim has a sane direction before
    // the first mousemove.
    this.mouseX = window.innerWidth * 0.5;
    this.mouseY = window.innerHeight * 0.5;

    this._onDown = (e) => {
      this.keys.add(e.code);
      // Prevent arrow keys / space from scrolling the page during play.
      if (MOVEMENT_CODES.has(e.code)) e.preventDefault();
    };
    this._onUp = (e) => this.keys.delete(e.code);
    this._onBlur = () => this.keys.clear();
    this._onMove = (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    };
    target.addEventListener('keydown', this._onDown);
    target.addEventListener('keyup', this._onUp);
    window.addEventListener('blur', this._onBlur);
    window.addEventListener('mousemove', this._onMove);
  }

  isDown(code) {
    return this.keys.has(code);
  }

  // Writes a normalized direction into `out` ({x, y}). Zero when idle.
  getMoveAxis(out) {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      y *= inv;
    }
    out.x = x;
    out.y = y;
    return out;
  }

  clear() {
    this.keys.clear();
  }
}

const MOVEMENT_CODES = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
]);
