// Global engine/tuning constants. Everything here is data — no logic.

export const GameConfig = {
  // Fixed simulation step (seconds). Rendering interpolates via rAF.
  timeStep: 1 / 60,
  maxFrameDelta: 0.1, // clamp to avoid spiral-of-death after tab stalls

  performance: {
    maxEnemies: 400,
    maxProjectiles: 500,
    maxGems: 800,
    spatialCellSize: 96, // ~ a few enemy diameters
  },

  world: {
    backgroundGrid: 80, // px spacing of the reference grid
  },

  // Camera framing. zoom > 1 pulls the camera closer (less world visible) for
  // a tighter, more intense view. Wired through Camera.setZoom(), so exposing
  // it as a user setting later is a one-line hookup.
  camera: {
    zoom: 1.2, // ~17% less visible area per axis
  },

  // Atmospheric edge fog: a radial gradient overlay that darkens the screen
  // edges so enemies emerge from darkness. Purely visual.
  fog: {
    innerRadiusFrac: 0.42, // fraction of min(view w,h) that stays fully clear
    alpha: 0.85, // darkness at the far corners
  },

  colors: {
    background: '#0e0e16',
    grid: '#1b1b2b',
    player: '#4de1c1',
    playerOutline: '#0e0e16',
    projectile: '#ffd166',
    projectileGlow: 'rgba(255, 209, 102, 0.35)',
    enemy: '#e05a5a',
    enemyHit: '#ffffff',
    gem: '#5ad1ff',
    gemGlow: 'rgba(90, 209, 255, 0.35)',

    // Environment.
    treeTrunk: '#5a3f2a',
    treeFoliage: '#3f7d4f',
    treeFoliageActive: '#d1573f',
    treeHit: '#ffffff',
    treeRange: 'rgba(209, 87, 63, 0.14)',

    // World items.
    healthPack: '#e0483f',
    healthCross: '#ffffff',
    bombLight: '#f2f2f2',
    bombDark: '#141414',

    // Effects (rings/flashes).
    effectPickup: 'rgba(90, 209, 255, 0.9)',
    effectHeal: 'rgba(90, 220, 120, 0.95)',
    effectTree: 'rgba(224, 90, 90, 0.85)',
    effectBomb: 'rgba(255, 255, 255, 0.95)',
    effectItem: 'rgba(255, 209, 102, 0.9)',
    effectBossSpawn: 'rgba(180, 77, 240, 0.95)',
    effectBossDeath: 'rgba(255, 209, 102, 0.95)',
    effectSummon: 'rgba(180, 77, 240, 0.9)',
    effectShockwave: 'rgba(180, 77, 240, 0.9)',

    // Elite enemies.
    eliteAura: 'rgba(255, 209, 102, 0.22)',
    eliteOutline: '#ffd166',

    // Dash / sword / buff combat feedback.
    effectDash: 'rgba(77, 225, 193, 0.6)',
    effectDashReset: 'rgba(255, 209, 102, 0.95)',
    effectSword: 'rgba(220, 235, 255, 0.9)',
    effectSwordHit: 'rgba(255, 255, 255, 0.95)',
    effectMagnet: 'rgba(90, 209, 255, 0.9)',
    effectFreeze: 'rgba(160, 230, 255, 0.85)',
    effectRage: 'rgba(255, 122, 63, 0.9)',
    effectElite: 'rgba(255, 209, 102, 0.9)',
    effectTreeBreak: 'rgba(180, 130, 70, 0.85)',
    swordArc: 'rgba(220, 235, 255, 0.9)',
    swordBlade: '#dbe4ff',
    swordEdge: '#ffffff',
    swordHilt: '#8a5a2a',
    rageAura: 'rgba(255, 122, 63, 0.28)',
    frozenBody: '#7db8e8',
    frozenEdge: 'rgba(200, 240, 255, 0.9)',

    // New world pickups.
    pickupMagnet: '#5ad1ff',
    pickupMagnetPole: '#e0483f',
    pickupFreeze: '#9fe4ff',
    pickupRage: '#ff7a3f',

    // Boss fight.
    bossProjectile: '#ff5c8a',
    bossWarning: '#ff5c5c',
    bossTelegraph: 'rgba(255, 92, 92, 0.16)',
    arenaWall: '#9b5cff',
    arenaGlow: 'rgba(155, 92, 255, 0.18)',

    // Edge fog base color (RGB triplet used in the gradient).
    fog: '6, 6, 12',
  },
};
