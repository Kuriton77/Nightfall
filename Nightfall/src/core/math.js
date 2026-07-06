// Small, allocation-free math helpers shared across systems.

export const TAU = Math.PI * 2;

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export function length(x, y) {
  return Math.hypot(x, y);
}

export function lengthSq(x, y) {
  return x * x + y * y;
}

export function distanceSq(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Move `current` toward `target` by at most `maxDelta`.
export function moveToward(current, target, maxDelta) {
  const diff = target - current;
  if (Math.abs(diff) <= maxDelta) return target;
  return current + Math.sign(diff) * maxDelta;
}

export function randRange(min, max) {
  return min + Math.random() * (max - min);
}
