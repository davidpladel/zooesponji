import { isWalkable, type Point, type WalkGrid } from './pathfinding';

export interface Vec {
  x: number;
  y: number;
}

export interface PathStep {
  pos: Vec;
  remaining: Vec[];
}

export function stepAlongPath(pos: Vec, waypoints: readonly Vec[], speed: number, dtMs: number): PathStep {
  let budget = (speed * dtMs) / 1000;
  let x = pos.x;
  let y = pos.y;
  let index = 0;

  while (index < waypoints.length && budget > 0) {
    const target = waypoints[index]!;
    const dx = target.x - x;
    const dy = target.y - y;
    const distance = Math.hypot(dx, dy);
    if (distance <= budget) {
      x = target.x;
      y = target.y;
      budget -= distance;
      index++;
    } else {
      x += (dx / distance) * budget;
      y += (dy / distance) * budget;
      budget = 0;
    }
  }
  return { pos: { x, y }, remaining: waypoints.slice(index) };
}

export function tileCenter(tile: Point, tileSize: number): Vec {
  return { x: tile.x * tileSize + tileSize / 2, y: tile.y * tileSize + tileSize / 2 };
}

export function worldToTile(pos: Vec, tileSize: number): Point {
  return { x: Math.floor(pos.x / tileSize), y: Math.floor(pos.y / tileSize) };
}

export function tryMove(grid: WalkGrid, tileSize: number, pos: Vec, dx: number, dy: number): Vec {
  let x = pos.x;
  let y = pos.y;
  if (isWalkable(grid, Math.floor((x + dx) / tileSize), Math.floor(y / tileSize))) x += dx;
  if (isWalkable(grid, Math.floor(x / tileSize), Math.floor((y + dy) / tileSize))) y += dy;
  return { x, y };
}
