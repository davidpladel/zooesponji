import type { Rect } from './interaction';
import type { Vec } from './movement';
import type { Rng } from './wander';

export type Facing = 'down' | 'left' | 'right' | 'up';

export function facingFromDelta(dx: number, dy: number, previous: Facing): Facing {
  if (dx === 0 && dy === 0) return previous;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

export function randomPointInRect(rect: Rect, rng: Rng, margin = 0): Vec {
  return {
    x: rect.x + margin + rng() * (rect.width - margin * 2),
    y: rect.y + margin + rng() * (rect.height - margin * 2),
  };
}
