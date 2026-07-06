import { GameConfig } from '../config/GameConfig.js';

// Draws the world in camera space onto a 2D canvas. Stateless w.r.t. game
// logic; it only reads entity data. Kept flat and branch-light for throughput.

export class Renderer {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = camera;
    this._now = 0; // per-frame timestamp for cosmetic pulses
    this._frozen = false; // world freeze active (icy enemy tint)
    this._rage = false; // rage buff active (player aura)
    // Edge-fog gradient, cached until the view size changes.
    this._fogGradient = null;
    this._fogW = 0;
    this._fogH = 0;
  }

  clear() {
    // Fill in logical (camera) space so the resolution-scale transform applied
    // to the context is respected. Camera dimensions are the logical viewport.
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(0, 0, this.camera.width, this.camera.height);
  }

  get colors() {
    return GameConfig.colors;
  }

  drawBackground() {
    const { ctx, camera } = this;
    const spacing = GameConfig.world.backgroundGrid;
    const w = camera.width;
    const h = camera.height;
    // World-space bounds of the current view.
    const left = camera.x - w * 0.5;
    const top = camera.y - h * 0.5;
    const startX = Math.floor(left / spacing) * spacing;
    const startY = Math.floor(top / spacing) * spacing;

    ctx.strokeStyle = this.colors.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = startX; x < left + w; x += spacing) {
      const sx = camera.worldToScreenX(x);
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, h);
    }
    for (let y = startY; y < top + h; y += spacing) {
      const sy = camera.worldToScreenY(y);
      ctx.moveTo(0, sy);
      ctx.lineTo(w, sy);
    }
    ctx.stroke();
  }

  drawGems(gems) {
    const { ctx, camera } = this;
    ctx.fillStyle = this.colors.gem;
    for (let i = 0; i < gems.length; i++) {
      const g = gems[i];
      if (!g.active) continue;
      const sx = camera.worldToScreenX(g.x);
      const sy = camera.worldToScreenY(g.y);
      // Small diamond.
      ctx.beginPath();
      ctx.moveTo(sx, sy - g.radius);
      ctx.lineTo(sx + g.radius, sy);
      ctx.lineTo(sx, sy + g.radius);
      ctx.lineTo(sx - g.radius, sy);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawEnemies(enemies) {
    const { ctx, camera } = this;
    const c = this.colors;
    const hitColor = c.enemyHit;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.active) continue;
      const sx = camera.worldToScreenX(e.x);
      const sy = camera.worldToScreenY(e.y);
      // Cull off-screen enemies (with margin) to save fills.
      if (sx < -40 || sy < -40 || sx > camera.width + 40 || sy > camera.height + 40) {
        continue;
      }

      // Elite indicator: pulsing gold aura under the body + outline over it.
      if (e.isElite) {
        ctx.globalAlpha = 0.7 + 0.3 * Math.sin(this._now * 0.008 + e.x * 0.01);
        ctx.fillStyle = c.eliteAura;
        ctx.beginPath();
        ctx.arc(sx, sy, e.radius * 1.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Frozen enemies render in an icy body color with a bright rim.
      ctx.fillStyle = e.hitFlash > 0 ? hitColor : this._frozen ? c.frozenBody : e.color;
      ctx.beginPath();
      ctx.arc(sx, sy, e.radius, 0, Math.PI * 2);
      ctx.fill();

      if (this._frozen) {
        ctx.strokeStyle = c.frozenEdge;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, e.radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (e.isElite) {
        ctx.strokeStyle = c.eliteOutline;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(sx, sy, e.radius + 1, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  drawProjectiles(projectiles) {
    const { ctx, camera } = this;
    const c = this.colors;
    for (let i = 0; i < projectiles.length; i++) {
      const p = projectiles[i];
      if (!p.active) continue;
      const sx = camera.worldToScreenX(p.x);
      const sy = camera.worldToScreenY(p.y);
      if (p.kind === 'sword') {
        this._drawSwordBlade(sx, sy, p);
      } else {
        ctx.fillStyle = c.projectile;
        ctx.beginPath();
        ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Thrown sword: a spinning blade with a bright edge + hilt.
  _drawSwordBlade(sx, sy, p) {
    const ctx = this.ctx;
    const c = this.colors;
    const len = 20 + p.size * 2.4;
    const w = 3 + p.size * 0.5;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(p.angle + p.spin);
    // Blade body.
    ctx.fillStyle = c.swordBlade;
    ctx.fillRect(-len * 0.4, -w * 0.5, len * 0.85, w);
    // Point.
    ctx.beginPath();
    ctx.moveTo(len * 0.45, 0);
    ctx.lineTo(len * 0.45 - 7, -w);
    ctx.lineTo(len * 0.45 - 7, w);
    ctx.closePath();
    ctx.fill();
    // Bright edge highlight.
    ctx.fillStyle = c.swordEdge;
    ctx.fillRect(-len * 0.4, -w * 0.5, len * 0.85, w * 0.28);
    // Hilt + guard.
    ctx.fillStyle = c.swordHilt;
    ctx.fillRect(-len * 0.5, -w * 0.4, len * 0.12, w * 0.8);
    ctx.fillRect(-len * 0.4, -w * 1.1, w * 0.7, w * 2.2);
    ctx.restore();
  }

  drawTrees(trees) {
    const { ctx, camera } = this;
    const c = this.colors;
    for (let i = 0; i < trees.length; i++) {
      const t = trees[i];
      // Destroyed or arena-hidden objects aren't drawn (debris conveys the break).
      if (!t.alive || t.arenaHidden) continue;

      let sx = camera.worldToScreenX(t.x);
      let sy = camera.worldToScreenY(t.y);
      if (sx < -80 || sy < -80 || sx > camera.width + 80 || sy > camera.height + 80) {
        continue;
      }

      // Brief shake on hit (deterministic per-frame jitter).
      if (t.shake > 0) {
        const s = t.shake * 40;
        sx += (Math.random() * 2 - 1) * s * 0.06;
        sy += (Math.random() * 2 - 1) * s * 0.06;
      }

      const scale = t.growScale; // 1 normally; <1 while regrowing
      const radius = t.radius * scale;

      // Faint danger zone when hostile (clear visual feedback).
      if (t.active) {
        ctx.fillStyle = c.treeRange;
        ctx.beginPath();
        ctx.arc(sx, sy, t.radius * 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Trunk.
      ctx.fillStyle = c.treeTrunk;
      ctx.fillRect(sx - 4 * scale, sy, 8 * scale, t.radius * scale);

      // Foliage.
      const foliage = t.hitFlash > 0 ? c.treeHit : t.active ? c.treeFoliageActive : c.treeFoliage;
      ctx.fillStyle = foliage;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawItems(items) {
    const { ctx, camera } = this;
    const c = this.colors;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.active) continue;
      const sx = camera.worldToScreenX(it.x);
      const sy = camera.worldToScreenY(it.y);
      const r = it.radius;
      const blink = 0.55 + 0.45 * Math.sin(it.age * 8);

      switch (it.type) {
        case 'health':
          ctx.globalAlpha = blink;
          ctx.fillStyle = c.healthPack;
          this._roundRect(sx - r, sy - r, r * 2, r * 2, 5);
          ctx.fill();
          ctx.fillStyle = c.healthCross;
          ctx.fillRect(sx - 2, sy - r * 0.6, 4, r * 1.2);
          ctx.fillRect(sx - r * 0.6, sy - 2, r * 1.2, 4);
          ctx.globalAlpha = 1;
          break;
        case 'bomb': {
          const light = Math.sin(it.age * 8) > 0;
          ctx.fillStyle = light ? c.bombLight : c.bombDark;
          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = light ? c.bombDark : c.bombLight;
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.fillStyle = light ? c.bombDark : c.bombLight;
          ctx.beginPath();
          ctx.arc(sx, sy - r, 3, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'magnet':
          this._drawMagnet(sx, sy, r, blink);
          break;
        case 'freeze':
          this._drawSnowflake(sx, sy, r, blink);
          break;
        case 'rage':
          this._drawFlame(sx, sy, r, it.age, blink);
          break;
      }
    }
  }

  // Horseshoe magnet with red poles — instantly recognizable.
  _drawMagnet(sx, sy, r, blink) {
    const ctx = this.ctx;
    const c = this.colors;
    ctx.globalAlpha = blink;
    ctx.lineWidth = r * 0.55;
    ctx.strokeStyle = c.pickupMagnet;
    ctx.beginPath();
    ctx.arc(sx, sy - r * 0.15, r * 0.72, Math.PI, 0); // U-shaped body (open bottom)
    ctx.stroke();
    // Red pole tips at the two open ends.
    const poleY = sy - r * 0.15;
    const px = r * 0.72;
    ctx.fillStyle = c.pickupMagnetPole;
    ctx.fillRect(sx - px - r * 0.27, poleY, r * 0.55, r * 0.5);
    ctx.fillRect(sx + px - r * 0.28, poleY, r * 0.55, r * 0.5);
    ctx.globalAlpha = 1;
  }

  // Six-spoke snowflake in ice blue.
  _drawSnowflake(sx, sy, r, blink) {
    const ctx = this.ctx;
    ctx.globalAlpha = blink;
    ctx.strokeStyle = this.colors.pickupFreeze;
    ctx.lineWidth = 2.5;
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI) / 3;
      const dx = Math.cos(a) * r;
      const dy = Math.sin(a) * r;
      ctx.beginPath();
      ctx.moveTo(sx - dx, sy - dy);
      ctx.lineTo(sx + dx, sy + dy);
      ctx.stroke();
    }
    // Small barbs on each spoke tip.
    ctx.lineWidth = 2;
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      const tx = sx + Math.cos(a) * r;
      const ty = sy + Math.sin(a) * r;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx - Math.cos(a - 0.5) * r * 0.35, ty - Math.sin(a - 0.5) * r * 0.35);
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx - Math.cos(a + 0.5) * r * 0.35, ty - Math.sin(a + 0.5) * r * 0.35);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Flickering flame — orange teardrop with a lighter core.
  _drawFlame(sx, sy, r, age, blink) {
    const ctx = this.ctx;
    const c = this.colors;
    const flick = 1 + 0.12 * Math.sin(age * 18);
    ctx.globalAlpha = blink;
    ctx.fillStyle = c.pickupRage;
    ctx.beginPath();
    ctx.moveTo(sx, sy - r * 1.1 * flick);
    ctx.quadraticCurveTo(sx + r, sy - r * 0.1, sx + r * 0.7, sy + r * 0.5);
    ctx.quadraticCurveTo(sx + r * 0.5, sy + r, sx, sy + r);
    ctx.quadraticCurveTo(sx - r * 0.5, sy + r, sx - r * 0.7, sy + r * 0.5);
    ctx.quadraticCurveTo(sx - r, sy - r * 0.1, sx, sy - r * 1.1 * flick);
    ctx.fill();
    // Inner glow.
    ctx.fillStyle = c.effectDashReset;
    ctx.beginPath();
    ctx.arc(sx, sy + r * 0.25, r * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  drawEffects(effects) {
    const { ctx, camera } = this;
    for (let i = 0; i < effects.length; i++) {
      const e = effects[i];
      if (!e.active) continue;
      const t = e.life > 0 ? e.age / e.life : 1;
      const r = e.r0 + (e.rMax - e.r0) * t;
      const sx = camera.worldToScreenX(e.x);
      const sy = camera.worldToScreenY(e.y);
      ctx.globalAlpha = Math.max(0, 1 - t);
      if (e.shape === 'particle') {
        // Drifting debris fragment: a small filled dot shrinking out.
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.5, r), 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.strokeStyle = e.color;
      ctx.lineWidth = e.width;
      ctx.beginPath();
      if (e.shape === 'arc') {
        // Sword swipe: an arc sector that sweeps slightly as it fades.
        const a = e.angle + (t - 0.5) * e.spread * 0.6;
        ctx.arc(sx, sy, r, a - e.spread, a + e.spread);
      } else {
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Circular energy barrier confining the boss fight: a soft outer glow ring
  // plus a pulsing main wall. Drawn under all entities.
  drawArena(arena) {
    if (!arena || !arena.active) return;
    const { ctx, camera } = this;
    const c = this.colors;
    const sx = camera.worldToScreenX(arena.x);
    const sy = camera.worldToScreenY(arena.y);
    const pulse = 0.6 + 0.4 * Math.sin(this._now * 0.004);

    ctx.strokeStyle = c.arenaGlow;
    ctx.lineWidth = 22;
    ctx.globalAlpha = 0.5 + 0.5 * pulse;
    ctx.beginPath();
    ctx.arc(sx, sy, arena.radius + 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = c.arenaWall;
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.55 + 0.35 * pulse;
    ctx.beginPath();
    ctx.arc(sx, sy, arena.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  drawBoss(boss) {
    if (!boss || !boss.active) return;
    const { ctx, camera } = this;
    const c = this.colors;
    const sx = camera.worldToScreenX(boss.x);
    const sy = camera.worldToScreenY(boss.y);

    // Attack telegraphs (under the body).
    if (boss.state === 'windup') {
      const t = boss.stateDuration > 0 ? 1 - boss.stateTimer / boss.stateDuration : 1;
      if (boss.pendingAttack === 'charge' && boss.chargeLineLen > 0) {
        // Danger lane along the locked charge path.
        ctx.strokeStyle = c.bossTelegraph;
        ctx.lineWidth = boss.radius * 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(
          sx + boss.chargeDirX * boss.chargeLineLen,
          sy + boss.chargeDirY * boss.chargeLineLen,
        );
        ctx.stroke();
        ctx.lineCap = 'butt';
      }
      // Tightening warning ring that intensifies as the attack launches.
      ctx.globalAlpha = 0.25 + 0.55 * t;
      ctx.strokeStyle = c.bossWarning;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, boss.radius * (1.8 - 0.5 * t), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Soft glow in the boss's own color.
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = boss.color;
    ctx.beginPath();
    ctx.arc(sx, sy, boss.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Body + dark core + outline.
    ctx.fillStyle = boss.hitFlash > 0 ? c.enemyHit : boss.color;
    ctx.beginPath();
    ctx.arc(sx, sy, boss.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = boss.coreColor;
    ctx.beginPath();
    ctx.arc(sx, sy, boss.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx, sy, boss.radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawBossProjectiles(projectiles) {
    const { ctx, camera } = this;
    ctx.fillStyle = this.colors.bossProjectile;
    for (let i = 0; i < projectiles.length; i++) {
      const p = projectiles[i];
      if (!p.active) continue;
      ctx.beginPath();
      ctx.arc(camera.worldToScreenX(p.x), camera.worldToScreenY(p.y), p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Atmospheric edge fog: radial gradient from a clear center to dark edges so
  // enemies emerge from darkness. Cosmetic only; drawn last, under the DOM HUD.
  drawFog() {
    const { ctx, camera } = this;
    const w = camera.width;
    const h = camera.height;
    if (w !== this._fogW || h !== this._fogH) {
      this._fogW = w;
      this._fogH = h;
      const cfg = GameConfig.fog;
      const rgb = this.colors.fog;
      const inner = Math.min(w, h) * cfg.innerRadiusFrac;
      const outer = Math.hypot(w, h) * 0.5;
      const g = ctx.createRadialGradient(w * 0.5, h * 0.5, inner, w * 0.5, h * 0.5, outer);
      g.addColorStop(0, `rgba(${rgb}, 0)`);
      g.addColorStop(0.6, `rgba(${rgb}, ${cfg.alpha * 0.35})`);
      g.addColorStop(1, `rgba(${rgb}, ${cfg.alpha})`);
      this._fogGradient = g;
    }
    ctx.fillStyle = this._fogGradient;
    ctx.fillRect(0, 0, w, h);
  }

  _roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  drawPlayer(player) {
    const { ctx, camera } = this;
    const c = this.colors;
    const sx = camera.worldToScreenX(player.x);
    const sy = camera.worldToScreenY(player.y);

    // Rage aura: pulsing orange halo while the buff is active.
    if (this._rage) {
      const pulse = 0.6 + 0.4 * Math.sin(this._now * 0.012);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = c.rageAura;
      ctx.beginPath();
      ctx.arc(sx, sy, player.radius * 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Dash: bright cyan burst ring while dashing (clear i-frame feedback).
    if (player.isDashing) {
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = c.player;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(sx, sy, player.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = c.player;
    ctx.beginPath();
    ctx.arc(sx, sy, player.radius, 0, Math.PI * 2);
    ctx.fill();

    // Facing indicator.
    ctx.strokeStyle = this.colors.playerOutline;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(
      sx + player.facingX * player.radius,
      sy + player.facingY * player.radius,
    );
    ctx.stroke();

    // Free-aim indicator: an extended barrel + arrow tip pointing at the cursor.
    if (player.freeAim) {
      const fx = player.facingX;
      const fy = player.facingY;
      const tipDist = player.radius + 20;
      const tx = sx + fx * tipDist;
      const ty = sy + fy * tipDist;
      ctx.strokeStyle = this.colors.player;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx + fx * player.radius, sy + fy * player.radius);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      // Arrow head (perpendicular offset).
      const px = -fy;
      const py = fx;
      ctx.fillStyle = this.colors.player;
      ctx.beginPath();
      ctx.moveTo(tx + fx * 7, ty + fy * 7);
      ctx.lineTo(tx + px * 5, ty + py * 5);
      ctx.lineTo(tx - px * 5, ty - py * 5);
      ctx.closePath();
      ctx.fill();
    }

    // Blink while invulnerable.
    if (player.invulnTimer > 0 && Math.floor(player.invulnTimer * 20) % 2 === 0) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = this.colors.enemyHit;
      ctx.beginPath();
      ctx.arc(sx, sy, player.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  render(world) {
    this._now = performance.now();
    this._frozen = !!world.frozen;
    this._rage = !!world.rage;
    this.clear();
    this.drawBackground();
    this.drawArena(world.arena);
    this.drawTrees(world.trees);
    this.drawItems(world.items);
    this.drawGems(world.gems);
    this.drawProjectiles(world.projectiles);
    this.drawBossProjectiles(world.bossProjectiles);
    this.drawEnemies(world.enemies);
    this.drawBoss(world.boss);
    this.drawPlayer(world.player);
    this.drawEffects(world.effects);
    this.drawFog();
  }
}
