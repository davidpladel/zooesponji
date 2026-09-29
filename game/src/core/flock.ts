import { rectContains, type Rect } from './interaction';
import type { Vec } from './movement';
import { MIN_GAP, pickWanderTarget } from './obstacles';
import type { EnclosureInfo, PropInfo } from './tiledmap';
import type { Rng } from './wander';

/** Interior de un recinto (sin la valla) y zonas que no se pueden pisar. */
export interface PenSpace {
  inner: Rect;
  obstacles: Rect[];
}

/** Un animal que pasea: posición, destino (o null si descansa) y ms de descanso restantes. */
export interface Roamer {
  pos: Vec;
  target: Vec | null;
  rest: number;
}

export const ROAM_SPEED = 14;

export function penSpace(enclosure: Rect, props: readonly PropInfo[] | readonly Pick<PropInfo, 'x' | 'y' | 'block'>[], tile: number): PenSpace {
  const inner = {
    x: enclosure.x + tile,
    y: enclosure.y + tile,
    width: enclosure.width - 2 * tile,
    height: enclosure.height - 2 * tile,
  };
  const obstacles = props
    .filter((p) => p.block !== null && rectContains(inner, { x: p.x, y: p.y - 1 }))
    .map((p) => p.block!);
  return { inner, obstacles };
}

export function tooClose(p: Vec, others: readonly Vec[], gap = MIN_GAP): boolean {
  return others.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < gap);
}

/** `n` puntos del recinto separados entre sí y fuera de los obstáculos (si no caben, se relaja la separación). */
export function spreadPositions(space: PenSpace, n: number, rng: Rng, margin = 8): Vec[] {
  const { inner, obstacles } = space;
  const points: Vec[] = [];
  for (let gap = MIN_GAP * 1.5; points.length < n && gap > 0; gap -= 2) {
    for (let attempt = 0; attempt < 200 && points.length < n; attempt++) {
      const p = {
        x: inner.x + margin + rng() * (inner.width - margin * 2),
        y: inner.y + margin + rng() * (inner.height - margin * 2),
      };
      if (obstacles.some((r) => rectContains(r, p, 2)) || tooClose(p, points, gap)) continue;
      points.push(p);
    }
  }
  return points;
}

/**
 * Un paso de paseo. Si el siguiente punto se acerca a menos de MIN_GAP de otro animal, se detiene,
 * descansa un poco y luego elige otro destino (alejarse de alguien que ya está cerca sí se permite).
 */
export function stepRoamer(
  roamer: Roamer,
  others: readonly Roamer[],
  space: PenSpace,
  delta: number,
  rng: Rng,
  speed = ROAM_SPEED,
): Roamer {
  const { pos } = roamer;
  if (!roamer.target) {
    const rest = roamer.rest - delta;
    if (rest > 0) return { ...roamer, rest };
    const occupied = others.flatMap((o) => (o.target ? [o.pos, o.target] : [o.pos]));
    const target = pickWanderTarget(space.inner, pos, space.obstacles, rng, 8, 12, occupied);
    return { pos, target, rest: target ? 0 : 1000 };
  }

  const dx = roamer.target.x - pos.x;
  const dy = roamer.target.y - pos.y;
  const distance = Math.hypot(dx, dy);
  const step = (speed * delta) / 1000;
  const next = distance <= step ? roamer.target : { x: pos.x + (dx / distance) * step, y: pos.y + (dy / distance) * step };

  const blocked = others.some((o) => {
    const after = Math.hypot(o.pos.x - next.x, o.pos.y - next.y);
    return after < MIN_GAP && after < Math.hypot(o.pos.x - pos.x, o.pos.y - pos.y);
  });
  if (blocked) return { pos, target: null, rest: 400 + rng() * 800 };
  if (next === roamer.target) return { pos: next, target: null, rest: 1000 + rng() * 2000 };
  return { ...roamer, pos: next };
}
