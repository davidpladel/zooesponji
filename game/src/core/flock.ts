import { rectContains, type Rect } from './interaction';
import type { Vec } from './movement';
import { MIN_GAP, pickWanderTarget, segmentHitsRects } from './obstacles';
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
  /** Radio del cuerpo (px). Sin él, `BODY_RADIUS`. */
  radius?: number;
}

/** Radio de un animal de 16 px: dos de ellos se separan MIN_GAP. */
export const BODY_RADIUS = MIN_GAP / 2;

/** Distancia mínima entre dos animales: la suma de sus radios. */
export function gapBetween(a: Pick<Roamer, 'radius'>, b: Pick<Roamer, 'radius'>): number {
  return (a.radius ?? BODY_RADIUS) + (b.radius ?? BODY_RADIUS);
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
export function spreadPositions(space: PenSpace, n: number, rng: Rng, margin = 8, gap = MIN_GAP * 1.5): Vec[] {
  const { inner, obstacles } = space;
  const points: Vec[] = [];
  for (let g = gap; points.length < n && g > 0; g -= 2) {
    for (let attempt = 0; attempt < 200 && points.length < n; attempt++) {
      const p = {
        x: inner.x + margin + rng() * (inner.width - margin * 2),
        y: inner.y + margin + rng() * (inner.height - margin * 2),
      };
      if (obstacles.some((r) => rectContains(r, p, 2)) || tooClose(p, points, g)) continue;
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
    const margin = Math.max(8, roamer.radius ?? 0);
    const target = pickWanderTarget(space.inner, pos, space.obstacles, rng, margin, 12, occupied);
    return { ...roamer, target, rest: target ? 0 : 1000 };
  }

  const dx = roamer.target.x - pos.x;
  const dy = roamer.target.y - pos.y;
  const distance = Math.hypot(dx, dy);
  const step = (speed * delta) / 1000;
  const next = distance <= step ? roamer.target : { x: pos.x + (dx / distance) * step, y: pos.y + (dy / distance) * step };

  const blocked = others.some((o) => {
    const after = Math.hypot(o.pos.x - next.x, o.pos.y - next.y);
    return after < gapBetween(roamer, o) && after < Math.hypot(o.pos.x - pos.x, o.pos.y - pos.y);
  });
  if (blocked) return { ...roamer, target: null, rest: 400 + rng() * 800 };
  if (next === roamer.target) return { ...roamer, pos: next, target: null, rest: 1000 + rng() * 2000 };
  return { ...roamer, pos: next };
}

/** ¿Se puede estar en `p`? Dentro del recinto, a `margin` de la valla y fuera de los obstáculos. */
function freeSpot(p: Vec, space: PenSpace, margin: number): boolean {
  const { inner, obstacles } = space;
  return (
    p.x >= inner.x + margin &&
    p.x <= inner.x + inner.width - margin &&
    p.y >= inner.y + margin &&
    p.y <= inner.y + inner.height - margin &&
    !obstacles.some((r) => rectContains(r, p))
  );
}

function reachable(pos: Vec, p: Vec, space: PenSpace, margin: number): Vec | null {
  return freeSpot(p, space, margin) && !segmentHitsRects(pos, p, space.obstacles) ? p : null;
}

/** Destino para apartarse de `from`: `distance` px en dirección contraria. Null si ahí no se puede estar. */
export function fleeTarget(pos: Vec, from: Vec, space: PenSpace, distance = 20, margin = 8): Vec | null {
  const dx = pos.x - from.x;
  const dy = pos.y - from.y;
  const d = Math.hypot(dx, dy);
  if (d === 0) return null;
  return reachable(pos, { x: pos.x + (dx / d) * distance, y: pos.y + (dy / d) * distance }, space, margin);
}

/** Destino para acercarse a `to` quedándose a `keep` px. Null si ya está al lado o no hay paso. */
export function followTarget(pos: Vec, to: Vec, space: PenSpace, keep = 20, margin = 8): Vec | null {
  const dx = to.x - pos.x;
  const dy = to.y - pos.y;
  const d = Math.hypot(dx, dy);
  if (d <= keep) return null;
  return reachable(pos, { x: pos.x + (dx / d) * (d - keep), y: pos.y + (dy / d) * (d - keep) }, space, margin);
}
