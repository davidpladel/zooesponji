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

export function planWander(
  grid: WalkGrid,
  from: Point,
  tiles: readonly Point[],
  rng: Rng,
  attempts = 5,
): Point[] | null {
  for (let i = 0; i < attempts; i++) {
    const goal = pickRandom(tiles, rng);
    if (!goal) return null;
    if (goal.x === from.x && goal.y === from.y) continue;
    const path = findPath(grid, from, goal);
    if (path) return path;
  }
  return null;
}
