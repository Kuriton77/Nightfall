// Single boss entity (one boss at a time, never pooled). Plain data like every
// other entity — behavior lives in BossSystem, rendering reads the state/
// telegraph fields. `isBoss` lets shared damage paths (WeaponSystem -> Game
// death callback) route boss deaths away from the enemy pool.

export class Boss {
  constructor() {
    this.active = false;
    this.isBoss = true;
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.health = 0;
    this.maxHealth = 0;
    this.radius = 0;
    this.speed = 0;
    this.contactDamage = 0;
    this.attackCooldown = 0.8;
    this.attackTimer = 0;
    this.xpValue = 0;
    this.color = '#ffffff';
    this.coreColor = '#000000';
    this.hitFlash = 0;
    this.typeId = null;
    this.name = '';
    this.isFinal = false;
    this.damageMult = 1; // endless scaling + difficulty, applied to all attacks

    // AI state machine (see BossSystem): chase | windup | charge | shockwave.
    this.state = 'chase';
    this.stateTimer = 0;
    this.stateDuration = 0; // total time of the current state (telegraph fade)
    this.specialTimer = 0; // countdown to the next special attack
    this.attackIndex = 0; // round-robin cursor into the def's attack list
    this.pendingAttack = null; // attack id being telegraphed during windup

    // Charge attack.
    this.chargeDirX = 0;
    this.chargeDirY = 0;
    this.chargeLineLen = 0; // telegraph lane length (speed * duration)

    // Shockwave attack.
    this.waveRadius = 0;
    this.waveHit = false;
  }
}
