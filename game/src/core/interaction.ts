import type { Vec } from './movement';
import { isWalkable, type Point, type WalkGrid } from './pathfinding';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GateRef {
  animalId: string;
  tile: Point;
}

/**
 * Puerta de recinto (2 casillas de ancho) justo delante de la que está la cuidadora: en la casilla de
 * arriba o de abajo de cualquiera de sus dos casillas. Ahí se abre la ventana de dar de comer.
 */
export function gateAtDoorstep<T extends GateRef>(keeperTile: Point, gates: readonly T[]): T | null {
  return (
    gates.find(
      (g) =>
        Math.abs(keeperTile.y - g.tile.y) === 1 && (keeperTile.x === g.tile.x || keeperTile.x === g.tile.x + 1),
    ) ?? null
  );
}

export function rectContains(rect: Rect, point: Vec, margin = 0): boolean {
  return (
    point.x >= rect.x - margin &&
    point.x <= rect.x + rect.width + margin &&
    point.y >= rect.y - margin &&
    point.y <= rect.y + rect.height + margin
  );
}

export function isDropOnTarget(drop: Vec, target: Rect, margin: number): boolean {
  return rectContains(target, drop, margin);
}

const NEIGHBOURS: readonly (readonly [number, number])[] = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

/** Casilla transitable junto a la puerta y fuera del recinto: donde se para la cuidadora para dar de comer. */
export function approachTile(gate: Point, enclosure: Rect, tileSize: number, grid: WalkGrid): Point | null {
  for (const [dx, dy] of NEIGHBOURS) {
    const x = gate.x + dx;
    const y = gate.y + dy;
    if (!isWalkable(grid, x, y)) continue;
    const center = { x: x * tileSize + tileSize / 2, y: y * tileSize + tileSize / 2 };
    if (!rectContains(enclosure, center)) return { x, y };
  }
  return null;
}

/** El elemento más cercano a `point` a no más de `radius`, o null. */
export function nearestWithin<T extends Vec>(items: readonly T[], point: Vec, radius: number): T | null {
  let best: T | null = null;
  let bestDistance = radius;
  for (const item of items) {
    const distance = Math.hypot(item.x - point.x, item.y - point.y);
    if (distance <= bestDistance) {
      best = item;
      bestDistance = distance;
    }
  }
  return best;
}
