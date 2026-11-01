import { findPath, isWalkable, type Point, type WalkGrid } from './pathfinding';

export type Rng = () => number;

export function walkableTiles(grid: WalkGrid): Point[] {
  const tiles: Point[] = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (isWalkable(grid, x, y)) tiles.push({ x, y });
    }
  }
  return tiles;
}

export function pickRandom<T>(items: readonly T[], rng: Rng): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(rng() * items.length)];
}

/**
 * Destino de paseo: de unas cuantas casillas al azar, la que tiene menos gente a `radius` casillas o menos.
 * Así, si una zona se llena, los visitantes se van a otra (la U de arriba, por ejemplo).
 */
export function pickQuietGoal(tiles: readonly Point[], people: readonly Point[], rng: Rng, samples = 4, radius = 6): Point | undefined {
  let best: Point | undefined;
  let bestCount = Infinity;
  for (let i = 0; i < samples; i++) {
    const tile = pickRandom(tiles, rng);
    if (!tile) return undefined;
    const count = people.filter((p) => Math.max(Math.abs(p.x - tile.x), Math.abs(p.y - tile.y)) <= radius).length;
    if (count < bestCount) {
      best = tile;
      bestCount = count;
    }
  }
  return best;
}

/** Con `people`, cada intento elige un destino tranquilo (`pickQuietGoal`). */
export function planWander(
  grid: WalkGrid,
  from: Point,
  tiles: readonly Point[],
  rng: Rng,
  attempts = 5,
  people: readonly Point[] = [],
): Point[] | null {
  for (let i = 0; i < attempts; i++) {
    const goal = people.length > 0 ? pickQuietGoal(tiles, people, rng) : pickRandom(tiles, rng);
    if (!goal) return null;
    if (goal.x === from.x && goal.y === from.y) continue;
    const path = findPath(grid, from, goal);
    if (path) return path;
  }
  return null;
}
