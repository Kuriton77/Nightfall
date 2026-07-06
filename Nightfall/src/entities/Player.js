import { PlayerConfig } from '../config/PlayerConfig.js';
import { DashConfig } from '../config/DashConfig.js';
import { Cooldown } from '../core/Cooldown.js';

// The player holds transform + live health + facing + dash state. Effective
// combat/movement stats are injected by ProgressionSystem (recomputed from base
// + upgrades). Dash movement is driven by the Game; the cooldown lives here so
// it resets cleanly per run.

export class Player {
  constructor() {
    this.radius = PlayerConfig.radius;
    this.dashCooldown = new Cooldown(DashConfig.cooldown);
    this.reset();
  }

  reset() {
    this.x = PlayerConfig.startPosition.x;
    this.y = PlayerConfig.startPosition.y;
    this.facingX = 0;
    this.facingY = -1;
    this.invulnTimer = 0;
    this.damageTakenMult = 1; // scaled by difficulty (Game applies at run start)
    this.freeAim = false; // aiming-mode flag read by the renderer

    // Dash state (see Game._updatePlayer / _tryDash).
    this.dashTimer = 0; // remaining active-dash time (>0 = dashing)
    this.dashInvulnTimer = 0; // remaining i-frames granted by the dash
    this.dashDirX = 0;
    this.dashDirY = 0;
    this._dashTrailTimer = 0;
    this.dashCooldown.reset();

    // Effective stats — populated by ProgressionSystem.applyTo(player).
    this.stats = null;
    this.weapon = null;
    this.maxHealth = PlayerConfig.baseStats.maxHealth;
    this.health = this.maxHealth;
    this.active = true;
  }

  get isAlive() {
    return this.health > 0;
  }

  get isDashing() {
    return this.dashTimer > 0;
  }

  takeDamage(amount) {
    // Dash i-frames make the player immune to ALL damage sources (enemies,
    // trees, boss contact/projectiles) because everything routes through here.
    if (this.invulnTimer > 0 || this.dashInvulnTimer > 0) return;
    this.health -= amount * this.damageTakenMult;
    this.invulnTimer = PlayerConfig.invulnerabilityTime;
  }
}
