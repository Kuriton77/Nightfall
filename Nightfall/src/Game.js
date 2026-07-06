import { GameConfig } from './config/GameConfig.js';
import { GameModes, DefaultMode } from './config/GameModeConfig.js';
import { WeaponConfig } from './config/WeaponConfig.js';
import { Difficulties, DefaultDifficulty } from './config/DifficultyConfig.js';
import { BossConfig } from './config/BossConfig.js';
import { BuffConfig } from './config/BuffConfig.js';
import { PickupConfig } from './config/PickupConfig.js';
import { EliteLootConfig } from './config/EliteLootConfig.js';
import { DashConfig } from './config/DashConfig.js';
import { DestructibleConfig } from './config/DestructibleConfig.js';

import { Pool } from './core/Pool.js';
import { SpatialGrid } from './core/SpatialGrid.js';
import { Input } from './core/Input.js';
import { Camera } from './core/Camera.js';
import { GameState } from './core/GameState.js';
import { TAU } from './core/math.js';

import { Player } from './entities/Player.js';
import { Enemy } from './entities/Enemy.js';
import { Projectile } from './entities/Projectile.js';
import { XPGem } from './entities/XPGem.js';
import { WorldItem } from './entities/WorldItem.js';
import { Effect } from './entities/Effect.js';

import { SpawnSystem } from './systems/SpawnSystem.js';
import { EnemySystem } from './systems/EnemySystem.js';
import { WeaponSystem } from './systems/WeaponSystem.js';
import { PickupSystem } from './systems/PickupSystem.js';
import { ProgressionSystem } from './systems/ProgressionSystem.js';
import { UpgradeSystem } from './systems/UpgradeSystem.js';
import { SettingsManager, ResolutionOptions } from './systems/SettingsManager.js';
import { AudioManager } from './systems/AudioManager.js';
import { WorldSystem } from './systems/WorldSystem.js';
import { ItemSystem } from './systems/ItemSystem.js';
import { EffectSystem } from './systems/EffectSystem.js';
import { BossSystem } from './systems/BossSystem.js';
import { BuffSystem } from './systems/BuffSystem.js';

import { Renderer } from './render/Renderer.js';
import { HUD } from './ui/HUD.js';
import { UpgradeScreen } from './ui/UpgradeScreen.js';
import { GameOverScreen } from './ui/GameOverScreen.js';
import { MainMenu } from './ui/MainMenu.js';
import { PauseMenu } from './ui/PauseMenu.js';
import { SettingsPanel } from './ui/SettingsPanel.js';
import { ModeSelect } from './ui/ModeSelect.js';
import { WeaponSelect } from './ui/WeaponSelect.js';
import { DifficultySelect } from './ui/DifficultySelect.js';
import { VictoryScreen } from './ui/VictoryScreen.js';
import { BossHealthBar } from './ui/BossHealthBar.js';
import { DashHUD } from './ui/DashHUD.js';
import { BuffHUD } from './ui/BuffHUD.js';

// Central orchestrator. Owns entities/systems/UI, runs a fixed-timestep loop,
// and drives the top-level state machine (GameState). Only PLAYING advances the
// simulation, so pause / upgrade / game-over / victory freeze everything for free.

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.camera = new Camera(GameConfig.camera.zoom);
    this.input = new Input();

    // Persistence + audio.
    this.settings = new SettingsManager();
    this.audio = new AudioManager(this.settings);

    // Pools pre-sized to performance targets so runs never allocate.
    const perf = GameConfig.performance;
    this.enemyPool = new Pool(() => new Enemy(), (e) => e.reset(), 64);
    this.projectilePool = new Pool(() => new Projectile(), (p) => p.reset(), 64);
    this.gemPool = new Pool(() => new XPGem(), (g) => g.reset(), 64);
    this.itemPool = new Pool(() => new WorldItem(), (it) => it.reset(), 8);
    this.effectPool = new Pool(() => new Effect(), (e) => e.reset(), 64);
    this.bossProjectilePool = new Pool(() => new Projectile(), (p) => p.reset(), 32);

    this.grid = new SpatialGrid(perf.spatialCellSize);
    this.player = new Player();
    this.progression = new ProgressionSystem();

    // Gameplay systems.
    this.spawnSystem = new SpawnSystem(this.enemyPool);
    this.enemySystem = new EnemySystem(this.enemyPool);
    this.weaponSystem = new WeaponSystem(this.projectilePool, this.grid, {
      spawnEffect: (type, x, y) => this.effectSystem.spawn(type, x, y),
      spawnArc: (x, y, angle, radius, half, color) =>
        this.effectSystem.spawnArc(x, y, angle, radius, half, color),
      onDestructibleDestroyed: (d) => this._destroyDestructible(d),
    });
    this.pickupSystem = new PickupSystem(this.gemPool);
    this.upgradeSystem = new UpgradeSystem(this.progression);
    this.worldSystem = new WorldSystem();
    this.effectSystem = new EffectSystem(this.effectPool);
    this.buffSystem = new BuffSystem(); // rage / freeze timed effects
    this.itemSystem = new ItemSystem(this.itemPool, {
      onCollect: (type, x, y) => this._collectItem(type, x, y),
      spawnEffect: (type, x, y) => this.effectSystem.spawn(type, x, y),
    });
    this.bossSystem = new BossSystem(this.bossProjectilePool, {
      spawnEffect: (type, x, y) => this.effectSystem.spawn(type, x, y),
      spawnEffectCustom: (x, y, def) => this.effectSystem.spawnCustom(x, y, def),
      spawnMinion: (typeId, x, y) => this.spawnSystem.spawnAt(typeId, x, y, this.elapsed),
      hideTrees: (x, y, r) => this.worldSystem.hideTreesInRadius(x, y, r),
      restoreTrees: () => this.worldSystem.restoreHiddenTrees(),
      onBossSpawn: (boss) => this._onBossSpawn(boss),
      playSfx: (name) => this.audio.playSfx(name),
    });

    // Presentation.
    this.renderer = new Renderer(canvas, this.camera);
    this.hud = new HUD();
    this.upgradeScreen = new UpgradeScreen();
    this.gameOverScreen = new GameOverScreen();
    this.mainMenu = new MainMenu();
    this.pauseMenu = new PauseMenu();
    this.modeSelect = new ModeSelect();
    this.weaponSelect = new WeaponSelect();
    this.difficultySelect = new DifficultySelect();
    this.victoryScreen = new VictoryScreen();
    this.bossBar = new BossHealthBar();
    this.dashHUD = new DashHUD();
    this.buffHUD = new BuffHUD();
    this.settingsPanel = new SettingsPanel(this.settings, {
      onApply: (key, value) => this._applySetting(key, value),
      onBack: () => this._closeSettings(),
    });

    this._hudEl = document.getElementById('hud');
    this._hintEl = document.getElementById('controls-hint');
    this._quitEl = document.getElementById('quit-screen');

    // Bound callbacks (created once — no per-frame closures).
    this._onEnemyDeath = (enemy) => this._handleEnemyDeath(enemy);
    this._onGemCollect = (x, y) => this.effectSystem.spawn('pickup', x, y);
    this._loop = this._loop.bind(this);
    this._resize = this._resize.bind(this);

    // Renderer view object references pool arrays / live lists directly.
    this._world = {
      player: this.player,
      enemies: this.enemyPool.active,
      projectiles: this.projectilePool.active,
      gems: this.gemPool.active,
      trees: this.worldSystem.activeTrees,
      items: this.itemPool.active,
      effects: this.effectPool.active,
      boss: this.bossSystem.boss,
      bossProjectiles: this.bossProjectilePool.active,
      arena: this.bossSystem.arena,
      frozen: false, // set each render from buffSystem (icy enemy tint)
      rage: false, // set each render from buffSystem (player aura)
    };

    this.state = GameState.MAIN_MENU;
    this._settingsReturn = GameState.MAIN_MENU;

    // Session config.
    this.mode = GameModes[DefaultMode];
    this.weaponId = this.settings.get('weapon');
    this.difficultyId = this.settings.get('difficulty');
    this.difficulty = Difficulties[this.difficultyId] || Difficulties[DefaultDifficulty];
    this._pendingMode = DefaultMode; // mode chosen before difficulty is picked
    this.freeAim = false; // Auto Aim by default; toggled with SPACE
    this.xpCollected = 0;
    this._prevHealth = this.player.health;
    this._pendingVictory = false; // set on final-boss death, resolved end-of-update

    this._bindUI();
    this._bindGlobalEvents();

    // Apply persisted settings that don't require a user gesture.
    this._resize();
    this.settingsPanel.syncFromSettings();

    // Prepare a clean run behind the menu, then open the menu.
    this._initRun();
    this._setState(GameState.MAIN_MENU);
  }

  // ---- Wiring ------------------------------------------------------------

  _bindUI() {
    this.mainMenu.bind({
      onPlay: () => {
        this._openAudio();
        this.audio.playSfx('click');
        this._openModeSelect();
      },
      onWeapons: () => {
        this._openAudio();
        this.audio.playSfx('click');
        this._openWeaponSelect();
      },
      onSettings: () => {
        this._openAudio();
        this.audio.playSfx('click');
        this._openSettings();
      },
      onQuit: () => this._quit(),
    });

    this.pauseMenu.bind({
      onResume: () => {
        this.audio.playSfx('click');
        this.resume();
      },
      onSettings: () => {
        this.audio.playSfx('click');
        this._openSettings();
      },
      onMainMenu: () => {
        this.audio.playSfx('click');
        this.goToMainMenu();
      },
    });

    // Play flow: Mode Select -> Difficulty Select -> Start Run.
    this.modeSelect.onSelect = (modeId) => {
      this.audio.playSfx('click');
      this._pendingMode = modeId;
      this._openDifficultySelect();
    };
    this.modeSelect.onBack = () => {
      this.audio.playSfx('click');
      this._backToMainMenu();
    };

    this.difficultySelect.onSelect = (difficultyId) => {
      this.audio.playSfx('click');
      this.difficultyId = difficultyId;
      this.settings.set('difficulty', difficultyId);
      this.startRun(this._pendingMode, difficultyId);
    };
    this.difficultySelect.onBack = () => {
      this.audio.playSfx('click');
      this.difficultySelect.hide();
      this.modeSelect.show();
    };

    this.weaponSelect.onSelect = (weaponId) => {
      this.audio.playSfx('click');
      this.weaponId = weaponId;
      this.settings.set('weapon', weaponId);
    };
    this.weaponSelect.onBack = () => {
      this.audio.playSfx('click');
      this._backToMainMenu();
    };
  }

  _bindGlobalEvents() {
    window.addEventListener('resize', this._resize);

    window.addEventListener('keydown', (e) => {
      // LEFT/RIGHT SHIFT dashes during play.
      if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') &&
          this.state === GameState.PLAYING) {
        this._tryDash();
        return;
      }
      // SPACE toggles Auto Aim / Free Aim during play.
      if (e.code === 'Space' && this.state === GameState.PLAYING) {
        this.freeAim = !this.freeAim;
        this.audio.playSfx('click');
        return;
      }
      if (e.code !== 'Escape') return;
      if (this.settingsPanel.isOpen) {
        this._closeSettings();
      } else if (this.difficultySelect.isOpen) {
        this.difficultySelect.hide();
        this.modeSelect.show();
      } else if (this.modeSelect.isOpen || this.weaponSelect.isOpen) {
        this._backToMainMenu();
      } else if (this.state === GameState.PLAYING) {
        this.pause();
      } else if (this.state === GameState.PAUSED) {
        this.resume();
      }
    });

    document.addEventListener('fullscreenchange', () => {
      const on = !!document.fullscreenElement;
      this.settings.set('fullscreen', on);
      this.settingsPanel.setFullscreenChecked(on);
      this._resize();
    });
  }

  // ---- Lifecycle ---------------------------------------------------------

  start() {
    this._lastTime = performance.now();
    this._scheduleFrame();
  }

  // Reset a run's world/state without touching the top-level state.
  _initRun() {
    this.enemyPool.clear();
    this.projectilePool.clear();
    this.gemPool.clear();
    this.itemPool.clear();
    this.effectPool.clear();

    this.player.reset();
    this.progression.reset();
    this.progression.setWeapon(this.weaponId);
    this.progression.applyTo(this.player);

    this.spawnSystem.reset();
    this.weaponSystem.reset();
    this.worldSystem.reset();
    this.itemSystem.reset();
    this.bossSystem.reset();
    this.bossBar.hide();
    this.buffSystem.reset();
    this.buffHUD.clear();
    this._pendingVictory = false;

    // Apply the selected difficulty's multipliers to every affected system.
    const mods = this.difficulty.mods;
    this.player.damageTakenMult = mods.damageTakenMult;
    this.spawnSystem.setModifiers(mods);
    this.worldSystem.setDensity(mods.treeDensityMult);
    this.itemSystem.setModifiers(mods);
    this.bossSystem.configure(this.mode, mods);

    this.elapsed = 0;
    this.kills = 0;
    this.xpCollected = 0;
    this._prevHealth = this.player.health;
    this.camera.follow(this.player.x, this.player.y);
    this._resetTiming();
  }

  startRun(modeId, difficultyId) {
    this.mode = GameModes[modeId] || GameModes[DefaultMode];
    if (difficultyId) {
      this.difficultyId = difficultyId;
      this.difficulty = Difficulties[difficultyId] || Difficulties[DefaultDifficulty];
    }
    this.weaponId = this.settings.get('weapon');
    this._openAudio();
    this.audio.startMusic();
    this._initRun();
    this._setState(GameState.PLAYING);
  }

  goToMainMenu() {
    this._initRun();
    this._setState(GameState.MAIN_MENU);
  }

  pause() {
    if (this.state !== GameState.PLAYING) return;
    this._setState(GameState.PAUSED);
  }

  resume() {
    if (this.state !== GameState.PAUSED) return;
    this._setState(GameState.PLAYING);
    this._resetTiming();
  }

  // ---- State machine -----------------------------------------------------

  _setState(state) {
    this._hideAllOverlays();
    this.state = state;

    const inRun = state !== GameState.MAIN_MENU;
    this._setHudVisible(inRun && state !== GameState.VICTORY);
    this._setHintVisible(state === GameState.PLAYING);

    // Overlays needing runtime data (UPGRADE, GAME_OVER, VICTORY) are shown by
    // their callers; simple menus are shown here. Only one is ever visible.
    if (state === GameState.MAIN_MENU) this.mainMenu.show();
    else if (state === GameState.PAUSED) this.pauseMenu.show();
  }

  _hideAllOverlays() {
    this.mainMenu.hide();
    this.pauseMenu.hide();
    this.settingsPanel.hide();
    this.upgradeScreen.hide();
    this.gameOverScreen.hide();
    this.modeSelect.hide();
    this.weaponSelect.hide();
    this.difficultySelect.hide();
    this.victoryScreen.hide();
    if (this._quitEl) this._quitEl.classList.add('hidden');
  }

  _setHudVisible(visible) {
    this._hudEl.classList.toggle('hidden', !visible);
  }

  _setHintVisible(visible) {
    this._hintEl.classList.toggle('hidden', !visible);
  }

  // ---- Menu sub-overlays (within MAIN_MENU) -----------------------------

  _openModeSelect() {
    this.mainMenu.hide();
    this.modeSelect.show();
  }

  _openDifficultySelect() {
    this.modeSelect.hide();
    this.difficultySelect.show(this.difficultyId);
  }

  _openWeaponSelect() {
    this.mainMenu.hide();
    this.weaponSelect.show(this.weaponId);
  }

  _backToMainMenu() {
    this.modeSelect.hide();
    this.weaponSelect.hide();
    this.difficultySelect.hide();
    this.mainMenu.show();
  }

  _openSettings() {
    this._openAudio();
    this.audio.startMusic();
    this._settingsReturn = this.state;
    this.mainMenu.hide();
    this.pauseMenu.hide();
    this.modeSelect.hide();
    this.weaponSelect.hide();
    this.difficultySelect.hide();
    this.settingsPanel.show();
  }

  _closeSettings() {
    this.audio.playSfx('click');
    this.settingsPanel.hide();
    if (this._settingsReturn === GameState.PAUSED) this.pauseMenu.show();
    else this.mainMenu.show();
  }

  _quit() {
    this.audio.playSfx('click');
    // In a packaged desktop build this closes the app. Browsers only allow
    // window.close() on script-opened windows, so fall back to a message.
    window.close();
    this._hideAllOverlays();
    if (this._quitEl) this._quitEl.classList.remove('hidden');
    this._setHudVisible(false);
    this._setHintVisible(false);
  }

  // ---- Settings application ---------------------------------------------

  _openAudio() {
    this.audio.resume();
    this.audio.applyVolumes();
  }

  _applySetting(key, value) {
    switch (key) {
      case 'masterVolume':
      case 'musicVolume':
      case 'sfxVolume':
        this.audio.applyVolumes();
        break;
      case 'resolution':
        this._resize();
        break;
      case 'fullscreen':
        this._applyFullscreen(value);
        break;
      case 'vsync':
        // Honored by _scheduleFrame on the next frame.
        break;
    }
  }

  _applyFullscreen(on) {
    const el = document.getElementById('game-container');
    if (on) {
      if (!document.fullscreenElement && el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      }
    } else if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  _resize() {
    const logicalW = window.innerWidth;
    const logicalH = window.innerHeight;
    const resId = this.settings.get('resolution');
    const res = ResolutionOptions.find((o) => o.id === resId) || ResolutionOptions[0];

    const scale = res.maxHeight
      ? Math.min(1, res.maxHeight / logicalH)
      : Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.max(1, Math.round(logicalW * scale));
    this.canvas.height = Math.max(1, Math.round(logicalH * scale));
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    // The transform includes the camera zoom: the renderer draws in camera
    // (world-view) space, and scale * zoom maps it onto the physical canvas.
    const zoomScale = scale * this.camera.zoom;
    this.renderer.ctx.setTransform(zoomScale, 0, 0, zoomScale, 0, 0);
    this.camera.resize(logicalW, logicalH);
  }

  // ---- Loop --------------------------------------------------------------

  _resetTiming() {
    this._lastTime = performance.now();
    this._accumulator = 0;
  }

  _scheduleFrame() {
    if (this.settings.get('vsync')) {
      requestAnimationFrame(this._loop);
    } else {
      setTimeout(() => this._loop(performance.now()), 0);
    }
  }

  _loop(now) {
    let frameDelta = (now - this._lastTime) / 1000;
    this._lastTime = now;
    if (frameDelta > GameConfig.maxFrameDelta) frameDelta = GameConfig.maxFrameDelta;

    if (this.state === GameState.PLAYING) {
      this._accumulator += frameDelta;
      const step = GameConfig.timeStep;
      while (this._accumulator >= step) {
        this._update(step);
        this._accumulator -= step;
        if (this.state !== GameState.PLAYING) break; // paused/leveled/died/won mid-catchup
      }
    }

    this._render();
    this._scheduleFrame();
  }

  _update(dt) {
    this.elapsed += dt;

    // Timed buffs/status effects tick first so this frame reads current state.
    this.buffSystem.update(dt);
    const frozen = this.buffSystem.has('freeze');

    this._updatePlayer(dt);
    // Environment: hostile trees + solid-tree collision resolution.
    this.worldSystem.update(dt, this.player, this.effectSystem);
    this.worldSystem.resolvePlayerCollision(this.player);

    this.spawnSystem.update(dt, this.elapsed, this.camera);

    const hpBefore = this.player.health;
    this.enemySystem.update(dt, this.player, frozen);
    // Boss fight: scheduling, AI, boss projectiles, and arena confinement
    // (player/boss stay in, outside enemies stay out) — after enemy movement
    // so constraints apply to final positions. Freeze slows the boss (never
    // fully freezes it).
    const bossMove = frozen ? BuffConfig.freeze.bossSlowMult : 1;
    this.bossSystem.update(dt, this.elapsed, this.player, this.enemyPool, bossMove);
    this.camera.follow(this.player.x, this.player.y);

    // Rebuild broad-phase grid from current enemy positions before combat.
    this._rebuildGrid();
    const aim = this._computeAim();
    // Feed active-buff combat multipliers (rage) into the weapon each frame.
    const ws = this.weaponSystem;
    ws.combatMods.damageMult = this.buffSystem.damageMult;
    ws.combatMods.cooldownMult = this.buffSystem.cooldownMult;
    ws.update(dt, this.player, this.enemyPool, this._onEnemyDeath, aim, this.bossSystem.activeBoss);

    const melee = this.player.weapon.kind === 'melee';
    if (ws.firedThisFrame && !melee) this.audio.playThrottled('shoot', 70);
    if (ws.meleeSwingThisFrame) this.audio.playThrottled('sword', 60);
    if (ws.swordThrownThisFrame) this.audio.playSfx('swordThrow');
    if (ws.hitsThisFrame > 0) this.audio.playThrottled('hit', 55);
    if (ws.treeHitsThisFrame > 0) this.audio.playThrottled('treeHit', 80);
    // Sword throw connected: refresh the dash (rewards aggressive play).
    if (ws.swordThrowHitThisFrame) this._resetDash();

    const rawXp = this.pickupSystem.update(dt, this.player, this._onGemCollect);
    if (rawXp > 0) {
      const xp = rawXp * this.difficulty.mods.xpMult; // difficulty XP multiplier
      this.xpCollected += xp;
      this.audio.playThrottled('pickup', 60);
      if (this.progression.addXP(xp)) this._enterLevelUp();
    }

    this.itemSystem.update(dt, this.player);
    this.effectSystem.update(dt);

    // Boss/tree damage is applied via player.takeDamage inside the systems.
    if (this.player.health < hpBefore) this.audio.playThrottled('hurt', 130);

    // Recycle released objects once per frame.
    this.enemyPool.sweep();
    this.projectilePool.sweep();
    this.gemPool.sweep();

    // Victory only ever comes from slaying the final boss (which spawns when
    // the mode's timer target is reached) — never from the timer alone. It
    // takes priority over a same-frame death.
    if (this._pendingVictory) {
      this._pendingVictory = false;
      this._enterVictory();
      return;
    }
    if (!this.player.isAlive) this._enterGameOver();
  }

  _updatePlayer(dt) {
    const player = this.player;
    player.dashCooldown.update(dt);
    if (player.dashInvulnTimer > 0) player.dashInvulnTimer -= dt;

    if (player.dashTimer > 0) {
      // Active dash: locked-direction burst that overrides input; leaves a
      // fading afterimage trail.
      player.dashTimer -= dt;
      player.x += player.dashDirX * DashConfig.speed * dt;
      player.y += player.dashDirY * DashConfig.speed * dt;
      player._dashTrailTimer -= dt;
      if (player._dashTrailTimer <= 0) {
        player._dashTrailTimer = DashConfig.trailInterval;
        this.effectSystem.spawn('dashTrail', player.x, player.y);
      }
    } else {
      const axis = _moveAxis;
      this.input.getMoveAxis(axis);
      const speed = player.stats.moveSpeed;
      player.x += axis.x * speed * dt;
      player.y += axis.y * speed * dt;
    }

    if (player.invulnTimer > 0) player.invulnTimer -= dt;

    // Passive regen scaled by difficulty (0 disables it, e.g. Hardcore).
    const regen = player.stats.healthRegen * this.difficulty.mods.regenMult;
    if (regen > 0 && player.health < player.maxHealth) {
      player.health = Math.min(player.maxHealth, player.health + regen * dt);
    }
  }

  // Begin a dash in the current movement direction (or facing if idle). Grants
  // i-frames covering all damage sources (Player.takeDamage checks them).
  _tryDash() {
    const player = this.player;
    if (!player.dashCooldown.ready || player.dashTimer > 0) return;

    const axis = _moveAxis;
    this.input.getMoveAxis(axis);
    let dx = axis.x;
    let dy = axis.y;
    if (dx === 0 && dy === 0) {
      dx = player.facingX;
      dy = player.facingY;
    }
    const len = Math.hypot(dx, dy) || 1;
    player.dashDirX = dx / len;
    player.dashDirY = dy / len;
    player.dashTimer = DashConfig.duration;
    player.dashInvulnTimer = DashConfig.invulnDuration;
    player._dashTrailTimer = 0;
    player.dashCooldown.trigger();
    this.effectSystem.spawn('dashTrail', player.x, player.y);
    this.audio.playSfx('dash');
  }

  // Instantly refresh the dash (sword-throw reward), with clear feedback.
  _resetDash() {
    this.player.dashCooldown.reset();
    this.effectSystem.spawn('dashReset', this.player.x, this.player.y);
    this.audio.playSfx('dashReset');
  }

  // Build the aim descriptor for the weapon system. Free aim points at the
  // cursor; auto aim leaves targeting to the weapon (nearest enemy).
  _computeAim() {
    const player = this.player;
    player.freeAim = this.freeAim;
    if (!this.freeAim) {
      _aim.free = false;
      return _aim;
    }
    // Mouse is in CSS pixels; divide by zoom to get camera-space (world) units.
    const zoom = this.camera.zoom;
    const worldX = this.input.mouseX / zoom + this.camera.x - this.camera.width * 0.5;
    const worldY = this.input.mouseY / zoom + this.camera.y - this.camera.height * 0.5;
    let dx = worldX - player.x;
    let dy = worldY - player.y;
    if (dx === 0 && dy === 0) {
      dx = player.facingX;
      dy = player.facingY;
    }
    // Update facing continuously so the aim indicator tracks the cursor smoothly.
    const len = Math.hypot(dx, dy) || 1;
    player.facingX = dx / len;
    player.facingY = dy / len;
    _aim.free = true;
    _aim.dirX = dx;
    _aim.dirY = dy;
    return _aim;
  }

  _rebuildGrid() {
    this.grid.clear();
    const enemies = this.enemyPool.active;
    for (let i = 0; i < enemies.length; i++) {
      if (enemies[i].active) this.grid.insert(enemies[i]);
    }
    // Live destructibles share the broad-phase so every weapon can damage them
    // (WeaponSystem tells them apart via `isDestructible`).
    const trees = this.worldSystem.activeTrees;
    for (let i = 0; i < trees.length; i++) {
      const t = trees[i];
      if (t.alive && !t.arenaHidden) this.grid.insert(t);
    }
  }

  _handleEnemyDeath(enemy) {
    // Bosses share the projectile damage pipeline but are not pooled enemies.
    if (enemy.isBoss) {
      this._handleBossDeath(enemy);
      return;
    }
    this.kills++;
    this._spawnGem(enemy.x, enemy.y, enemy.xpValue);
    if (enemy.isElite) this._dropEliteLoot(enemy);
    this.enemyPool.release(enemy);
  }

  // ---- Elite loot (separate from boss rewards) ---------------------------

  _dropEliteLoot(enemy) {
    // Gate bonus loot so dense late-game elites don't flood the field.
    if (Math.random() > EliteLootConfig.dropChance) return;
    const drop = this._rollEliteDrop();
    if (drop === 'xpBurst') {
      const cfg = EliteLootConfig.xpBurst;
      const per = Math.max(1, Math.round((enemy.xpValue * cfg.valueMult) / cfg.gems));
      for (let i = 0; i < cfg.gems; i++) {
        const a = Math.random() * TAU;
        const d = Math.random() * cfg.scatter;
        this._spawnGem(enemy.x + Math.cos(a) * d, enemy.y + Math.sin(a) * d, per);
      }
    } else {
      // Health / magnet / freeze / rage: drop the matching world pickup.
      this.itemSystem.spawnAt(drop, enemy.x, enemy.y);
    }
    this.effectSystem.spawn('elite', enemy.x, enemy.y);
  }

  _rollEliteDrop() {
    const table = EliteLootConfig.table;
    let total = 0;
    for (let i = 0; i < table.length; i++) total += table[i].weight;
    let roll = Math.random() * total;
    for (let i = 0; i < table.length; i++) {
      roll -= table[i].weight;
      if (roll <= 0) return table[i].drop;
    }
    return table[0].drop;
  }

  // ---- Boss fight ----------------------------------------------------------

  _onBossSpawn(boss) {
    this.bossBar.show(boss.name);
    this.audio.playSfx('bossSpawn');
  }

  _handleBossDeath(boss) {
    this.kills++;

    // Rewards: an XP explosion of scattered gems + a guaranteed pickup.
    const rewards = BossConfig.rewards;
    const perGem = Math.max(1, Math.round(boss.xpValue / rewards.gemCount));
    for (let i = 0; i < rewards.gemCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * rewards.gemScatter;
      this._spawnGem(
        boss.x + Math.cos(angle) * dist,
        boss.y + Math.sin(angle) * dist,
        perGem,
      );
    }
    this.itemSystem.spawnAt(rewards.pickupType, boss.x, boss.y);

    // Strong feedback: layered ring blast + a dedicated boss-death sound.
    this.effectSystem.spawn('bossDeath', boss.x, boss.y);
    this.effectSystem.spawn('bomb', boss.x, boss.y);
    this.audio.playSfx('bossDeath');

    const wasFinal = boss.isFinal;
    this.bossSystem.endFight(); // arena disappears; trees stay cleared
    this.bossBar.hide();

    // Timer target met (final boss only spawns at it) + final boss down = win.
    if (wasFinal) this._pendingVictory = true;
  }

  _spawnGem(x, y, value) {
    if (this.gemPool.active.length >= GameConfig.performance.maxGems) return;
    const gem = this.gemPool.acquire();
    gem.x = x;
    gem.y = y;
    gem.value = value;
    gem.magnetized = false;
  }

  // ---- Destructible environment ------------------------------------------

  // Orchestrates a destructible's destruction: hand it to the WorldSystem to
  // remove collision/hostility and schedule regrowth, then spawn the data-driven
  // debris burst + break ring + sound. Type-agnostic — works for any future
  // destructible (rocks, crates, barrels, ore nodes) via DestructibleConfig.
  _destroyDestructible(d) {
    this.worldSystem.markDestroyed(d);
    const def = DestructibleConfig[d.type];
    const specs = def.particles;
    if (specs) {
      for (let i = 0; i < specs.length; i++) this.effectSystem.burst(d.x, d.y, specs[i]);
    }
    this.effectSystem.spawn('treeBreak', d.x, d.y);
    this.audio.playThrottled('treeBreak', 40);
  }

  // ---- World item effects ------------------------------------------------

  // Single dispatch for every pickup type (data-driven from PickupConfig).
  _collectItem(type) {
    switch (type) {
      case 'health': this._collectHealth(PickupConfig.healthValue); break;
      case 'bomb': this._detonateBomb(); break;
      case 'magnet': this._collectMagnet(); break;
      case 'freeze': this._collectFreeze(); break;
      case 'rage': this._collectRage(); break;
    }
  }

  _collectHealth(amount) {
    // Cannot overheal above max HP.
    this.player.health = Math.min(this.player.maxHealth, this.player.health + amount);
    this.effectSystem.spawn('heal', this.player.x, this.player.y);
    this.audio.playSfx('heal');
  }

  // Magnet: pull every active XP gem to the player (PickupSystem flies
  // magnetized gems in). Iterating the active gem list is O(gems) — no spike.
  _collectMagnet() {
    const gems = this.gemPool.active;
    for (let i = 0; i < gems.length; i++) {
      if (gems[i].active) gems[i].magnetized = true;
    }
    this.effectSystem.spawn('magnet', this.player.x, this.player.y);
    this.audio.playSfx('magnet');
  }

  // Freeze: apply the timed freeze status (EnemySystem/BossSystem read it).
  _collectFreeze() {
    this.buffSystem.apply('freeze');
    this.effectSystem.spawn('freeze', this.player.x, this.player.y);
    this.audio.playSfx('freeze');
  }

  // Rage: apply the timed damage/attack-speed buff (WeaponSystem reads it).
  _collectRage() {
    this.buffSystem.apply('rage');
    this.effectSystem.spawn('rage', this.player.x, this.player.y);
    this.audio.playSfx('rage');
  }

  // Instantly kill every active enemy exactly as a normal kill (gems + stats).
  // INVARIANT: the bomb operates ONLY on the enemy pool. It never calls
  // player.takeDamage and never touches trees / world items / effects, so the
  // player, environment, and pickups are always unaffected.
  _detonateBomb() {
    const enemies = this.enemyPool.active;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.active) this._handleEnemyDeath(e);
    }
    this.effectSystem.spawn('bomb', this.player.x, this.player.y);
    this.audio.playSfx('bomb');
  }

  // ---- Upgrade / Game over / Victory ------------------------------------

  _enterLevelUp() {
    this._setState(GameState.UPGRADE);
    this.audio.playSfx('levelup');
    this._showNextUpgradeChoice();
  }

  _showNextUpgradeChoice() {
    const choices = this.upgradeSystem.rollChoices(3);
    if (choices.length === 0) {
      this.progression.pendingLevelUps = 0;
      this._resumeFromLevelUp();
      return;
    }
    this.upgradeScreen.show(choices, this.progression, (id) => {
      this.audio.playSfx('click');
      this.progression.applyUpgrade(id);
      this.progression.applyTo(this.player);
      this.progression.pendingLevelUps--;
      if (this.progression.pendingLevelUps > 0) this._showNextUpgradeChoice();
      else this._resumeFromLevelUp();
    });
  }

  _resumeFromLevelUp() {
    this._setState(GameState.PLAYING);
    this._resetTiming();
  }

  _enterGameOver() {
    this._setState(GameState.GAME_OVER);
    this.bossBar.hide();
    this.audio.playSfx('death');
    this.gameOverScreen.show(
      {
        elapsed: this.elapsed,
        level: this.progression.level,
        kills: this.kills,
        difficulty: this.difficulty.name,
      },
      () => this.startRun(this.mode.id, this.difficultyId),
    );
  }

  _enterVictory() {
    this._setState(GameState.VICTORY);
    this.audio.playSfx('victory');
    this.victoryScreen.show(
      {
        elapsed: this.elapsed,
        level: this.progression.level,
        kills: this.kills,
        xp: Math.round(this.xpCollected),
        weapon: WeaponConfig.weapons[this.weaponId].name,
        mode: this.mode.name,
        difficulty: this.difficulty.name,
      },
      {
        onPlayAgain: () => {
          this.audio.playSfx('click');
          this.startRun(this.mode.id, this.difficultyId);
        },
        onMainMenu: () => {
          this.audio.playSfx('click');
          this.goToMainMenu();
        },
      },
    );
  }

  _render() {
    this._world.frozen = this.buffSystem.has('freeze');
    this._world.rage = this.buffSystem.has('rage');
    this.renderer.render(this._world);
    this.hud.update({
      player: this.player,
      progression: this.progression,
      elapsed: this.elapsed,
      kills: this.kills,
      difficulty: this.difficulty.name,
      freeAim: this.freeAim,
    });
    this.dashHUD.update(this.player);
    this.buffHUD.update(this.buffSystem.list());
    const boss = this.bossSystem.boss;
    if (boss.active) this.bossBar.update(boss.health, boss.maxHealth);
  }
}

// Module-scope scratch to avoid per-frame allocation.
const _moveAxis = { x: 0, y: 0 };
const _aim = { free: false, dirX: 0, dirY: 0 };
