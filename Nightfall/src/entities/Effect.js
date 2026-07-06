// Pooled visual effect. Default shape is an expanding, fading ring (pickups,
// tree attacks, bomb/boss blasts). `shape: 'arc'` reuses the same pool for
// sword-swing swipes (arc sector centered on `angle`, half-width `spread`);
// `shape: 'particle'` reuses it for moving debris (leaves / wood / future
// fragments) that drift via vx/vy and shrink from r0 to rMax. Purely cosmetic.

export class Effect {
  constructor() {
    this.active = false;
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.age = 0;
    this.life = 0.4;
    this.r0 = 0; // start radius
    this.rMax = 0; // end radius
    this.width = 2; // stroke width
    this.color = '#ffffff';
    this.shape = 'ring'; // 'ring' | 'arc' | 'particle'
    this.angle = 0; // arc center angle (radians)
    this.spread = 0; // arc half-width (radians)
    this.vx = 0; // particle velocity (px/sec)
    this.vy = 0;
  }
}
