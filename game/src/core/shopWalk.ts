import { tileCenter, type Vec } from './movement';
import { createGrid, isWalkable, type Point, type WalkGrid } from './pathfinding';

/** Tiles del interior de la tienda (px). */
const T = 16;

/** Distancia (px de interior) de los pies del cuidador a la base de una peana para "tenerla a mano". */
export const PEDESTAL_REACH = 32;

/** Donde acaba el paseo de entrada: delante de la alfombra. */
export const ENTRY_TARGET: Vec = { x: 192, y: 170 };

/** Hueco que ocupa cada peana en el suelo (px), respecto a su base. */
const PEDESTAL_HALF_W = 13;
const PEDESTAL_TOP = -2;
const PEDESTAL_BOTTOM = 8;

/** Copia de la cuadrícula con las casillas de las peanas bloqueadas (dependen de cuántos productos hay). */
export function shopWalkGrid(base: WalkGrid, bases: readonly Point[]): WalkGrid {
  const cells = new Uint8Array(base.cells);
  for (const p of bases) {
    const x0 = Math.floor((p.x - PEDESTAL_HALF_W) / T);
    const x1 = Math.floor((p.x + PEDESTAL_HALF_W) / T);
    const y0 = Math.floor((p.y + PEDESTAL_TOP) / T);
    const y1 = Math.floor((p.y + PEDESTAL_BOTTOM) / T);
    for (let y = Math.max(0, y0); y <= Math.min(base.height - 1, y1); y++)
      for (let x = Math.max(0, x0); x <= Math.min(base.width - 1, x1); x++) cells[y * base.width + x] = 0;
  }
  return { width: base.width, height: base.height, cells };
}

/** Índice de la peana más cercana a los pies del cuidador dentro del alcance, o null. */
export function productInReach(feet: Vec, bases: readonly Point[], reach = PEDESTAL_REACH): number | null {
  let best: number | null = null;
  let bestDistance = reach;
  bases.forEach((p, index) => {
    const distance = Math.hypot(p.x - feet.x, p.y - feet.y);
    if (distance <= bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

/**
 * Dónde se para el cuidador para comprar: la casilla libre más cercana a la de debajo de la peana,
 * de entre las que la dejan a mano (si ninguna, la más cercana sin más).
 */
export function approachPoint(grid: WalkGrid, base: Point, reach = PEDESTAL_REACH): Vec | null {
  const wanted = { x: base.x, y: base.y + T };
  let best: Vec | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (!isWalkable(grid, x, y)) continue;
      const c = tileCenter({ x, y }, T);
      const inReach = Math.hypot(c.x - base.x, c.y - base.y) <= reach;
      const score = Math.hypot(c.x - wanted.x, c.y - wanted.y) + (inReach ? 0 : 10_000);
      if (score < bestScore) {
        best = c;
        bestScore = score;
      }
    }
  }
  return best;
}

/** A dónde señala la pista: el animal más barato que se puede comprar, o la puerta. */
export function hintTarget(entries: readonly { id: string; status: string; cost: number }[], coins: number): string {
  let best: { id: string; cost: number } | null = null;
  for (const e of entries) if (e.status === 'buy' && e.cost <= coins && (!best || e.cost < best.cost)) best = e;
  return best?.id ?? 'door';
}

/** ¿Los pies del cuidador pisan el felpudo de salida? */
export function onDoorMat(feet: Vec, door: Point): boolean {
  return Math.abs(feet.x - door.x) <= 16 && feet.y >= door.y - 12;
}

/** Si falta tienda.tmj: suelo libre de 20x12 con las 4 filas de pared bloqueadas. */
export function openInteriorGrid(): WalkGrid {
  return createGrid(20, 12, (_x, y) => y >= 4);
}
