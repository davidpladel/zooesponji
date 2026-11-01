import type { Vec } from './movement';

/** Rastro (px) que Luna deja entre ella y la cuidadora. */
export const PET_GAP = 20;
/** Algo más rápida que la cuidadora (64 px/s): si se queda atrás, alcanza. */
export const PET_SPEED = 80;
/** Más lejos que esto (el mundo se ha vuelto a montar), aparece junto a la cuidadora. */
export const PET_SNAP = 160;
/** Distancia mínima entre dos puntos del rastro. */
const TRAIL_STEP = 4;
const TRAIL_MAX = 256;

const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Apunta la posición de la cuidadora si se ha movido lo bastante y está en un camino. Dentro de un
 * recinto no se apunta nada: Luna se queda esperando en la puerta.
 */
export function recordTrail(trail: readonly Vec[], keeper: Vec, onPath: boolean): Vec[] {
  if (!onPath) return trail as Vec[];
  const last = trail[trail.length - 1];
  if (last && dist(last, keeper) < TRAIL_STEP) return trail as Vec[];
  const next = [...trail, { x: keeper.x, y: keeper.y }];
  return next.length > TRAIL_MAX ? next.slice(next.length - TRAIL_MAX) : next;
}

/** Punto del rastro que queda a `gap` px de su final (o el primero, si es más corto). */
function pointBack(trail: readonly Vec[], gap: number): { pos: Vec; index: number } {
  let left = gap;
  for (let i = trail.length - 1; i > 0; i--) {
    const a = trail[i]!;
    const b = trail[i - 1]!;
    const d = dist(a, b);
    if (d >= left) {
      const f = d === 0 ? 0 : left / d;
      return { pos: { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }, index: i };
    }
    left -= d;
  }
  return { pos: { ...trail[0]! }, index: 0 };
}

/**
 * Luna avanza por el rastro (nunca en línea recta por el césped) hasta quedarse a `PET_GAP` de su
 * final. Los puntos que alcanza salen del rastro.
 */
export function followTrail(pet: Vec, trail: readonly Vec[], deltaMs: number): { pos: Vec; trail: Vec[]; moving: boolean } {
  if (trail.length === 0) return { pos: pet, trail: [], moving: false };
  if (dist(pet, trail[trail.length - 1]!) > PET_SNAP) {
    const back = pointBack(trail, PET_GAP);
    return { pos: back.pos, trail: trail.slice(back.index), moving: false };
  }
  let remaining = dist(pet, trail[0]!);
  for (let i = 1; i < trail.length; i++) remaining += dist(trail[i - 1]!, trail[i]!);
  if (remaining <= PET_GAP) return { pos: pet, trail: [...trail], moving: false };

  let budget = Math.min((PET_SPEED * deltaMs) / 1000, remaining - PET_GAP);
  let pos = pet;
  let rest = [...trail];
  while (budget > 0 && rest.length > 0) {
    const target = rest[0]!;
    const d = dist(pos, target);
    if (d <= budget) {
      pos = { ...target };
      budget -= d;
      rest = rest.slice(1);
      continue;
    }
    pos = { x: pos.x + ((target.x - pos.x) / d) * budget, y: pos.y + ((target.y - pos.y) / d) * budget };
    budget = 0;
  }
  return { pos, trail: rest, moving: true };
}
