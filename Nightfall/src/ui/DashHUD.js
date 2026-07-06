// Dash cooldown indicator (bottom-left, near the health bar). Shows a filling
// bar that reaches full + "DASH READY" when available, and "DASH" while on
// cooldown. Reads the player's Cooldown directly.

export class DashHUD {
  constructor(root = document) {
    this.wrap = root.getElementById('dash-wrap');
    this.fill = root.getElementById('dash-fill');
    this.label = root.getElementById('dash-label');
    this._ready = null;
  }

  update(player) {
    const cd = player.dashCooldown;
    this.fill.style.width = cd.fraction * 100 + '%';
    const ready = cd.ready;
    if (ready !== this._ready) {
      this._ready = ready;
      this.wrap.classList.toggle('ready', ready);
      this.label.textContent = ready ? 'DASH READY' : 'DASH';
    }
  }
}
