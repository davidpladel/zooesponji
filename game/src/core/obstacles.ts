import { rectContains, type Rect } from './interaction';
import type { Vec } from './movement';
import type { Rng } from './wander';

/** Distancia mínima (px) entre dos animales del mismo recinto. */
export const MIN_GAP = 14;

/** ¿El segmento toca algún rectángulo (bordes incluidos)? Intersección exacta (Liang–Barsky). */
export function segmentHitsRects(from: Vec, to: Vec, rects: readonly Rect[]): boolean {
  return rects.some((r) => segmentHitsRect(from, to, r));
}

function segmentHitsRect(from: Vec, to: Vec, r: Rect): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let t0 = 0;
  let t1 = 1;
  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
    return true;
  };
  return (
    clip(-dx, from.x - r.x) &&
    clip(dx, r.x + r.width - from.x) &&
    clip(-dy, from.y - r.y) &&
    clip(dy, r.y + r.height - from.y)
  );
}

/**
 * Destino de paseo que no cae en un obstáculo, al que se llega en línea recta sin atravesar ninguno
 * y que no queda pegado a `occupied` (posición y destino de los demás animales).
 */
export function pickWanderTarget(
  area: Rect,
  from: Vec,
  obstacles: readonly Rect[],
  rng: Rng,
  margin = 12,
  attempts = 12,
  occupied: readonly Vec[] = [],
): Vec | null {
  for (let i = 0; i < attempts; i++) {
    const p = {
      x: area.x + margin + rng() * (area.width - margin * 2),
      y: area.y + margin + rng() * (area.height - margin * 2),
    };
    if (obstacles.some((r) => rectContains(r, p))) continue;
    if (segmentHitsRects(from, p, obstacles)) continue;
    if (occupied.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < MIN_GAP)) continue;
    return p;
  }
  return null;
}
