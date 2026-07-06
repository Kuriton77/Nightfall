// Camera that keeps the player centered and converts world <-> screen space.
// `zoom` > 1 pulls the view closer: width/height are the WORLD-visible
// dimensions (logical viewport / zoom), and the renderer's canvas transform
// scales camera space back up to fill the screen. All world-space consumers
// (spawning, culling, rendering) automatically respect the zoom because they
// read width/height/viewRadius.

export class Camera {
  constructor(zoom = 1) {
    this.x = 0;
    this.y = 0;
    this.zoom = zoom || 1;
    this.logicalWidth = 0; // CSS-pixel viewport (pre-zoom)
    this.logicalHeight = 0;
    this.width = 0; // world units visible horizontally
    this.height = 0;
  }

  resize(width, height) {
    this.logicalWidth = width;
    this.logicalHeight = height;
    this._recompute();
  }

  // Zoom-setting hook (ready for a future user setting) — callers must re-apply
  // the canvas transform after changing it (see Game._resize).
  setZoom(zoom) {
    this.zoom = zoom || 1;
    this._recompute();
  }

  _recompute() {
    this.width = this.logicalWidth / this.zoom;
    this.height = this.logicalHeight / this.zoom;
  }

  follow(targetX, targetY) {
    this.x = targetX;
    this.y = targetY;
  }

  worldToScreenX(worldX) {
    return worldX - this.x + this.width * 0.5;
  }

  worldToScreenY(worldY) {
    return worldY - this.y + this.height * 0.5;
  }

  // Half of the on-screen diagonal (world units); used to spawn just outside
  // the view.
  get viewRadius() {
    return Math.hypot(this.width, this.height) * 0.5;
  }
}
