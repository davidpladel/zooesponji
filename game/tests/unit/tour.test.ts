import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findPath, isWalkable, type Point, type WalkGrid } from '../../src/core/pathfinding';
import { tourWaypoints } from '../../src/core/tour';
import { buildWalkGrid, readProps, readSpawn, withSolidProps, type TiledMap } from '../../src/core/tiledmap';
import { gridFromAscii } from './helpers';

/** Casillas que pisa quien va de cada punto al siguiente con `findPath`. */
function stepped(grid: WalkGrid, start: Point, points: readonly Point[]): Set<string> {
  const seen = new Set<string>([`${start.x},${start.y}`]);
  let from = start;
  for (const p of points) {
    const path = findPath(grid, from, p);
    expect(path, `de (${from.x},${from.y}) a (${p.x},${p.y})`).not.toBeNull();
    for (const q of path!) seen.add(`${q.x},${q.y}`);
    from = p;
  }
  return seen;
}

/** Todas las casillas pisables a las que se llega desde `start`. */
function reachable(grid: WalkGrid, start: Point): Set<string> {
  const seen = new Set([`${start.x},${start.y}`]);
  const queue = [start];
  while (queue.length > 0) {
    const p = queue.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const n = { x: p.x + dx, y: p.y + dy };
      const k = `${n.x},${n.y}`;
      if (seen.has(k) || !isWalkable(grid, n.x, n.y)) continue;
      seen.add(k);
      queue.push(n);
    }
  }
  return seen;
}

// Anillo con dos ramas que salen de él y una zona suelta a la que no se llega (no hay que pisarla).
const ring = gridFromAscii([
  '...........#..',
  '.#########.#..',
  '.#########.#..',
  '.#########....',
  '.#########.###',
  '...........#..',
  '#####.######..',
  '#####.######..',
]);
const start = { x: 0, y: 0 };

describe('tourWaypoints', () => {
  it('la ruta pisa todas las casillas alcanzables (y ninguna suelta)', () => {
    const points = tourWaypoints(ring, start, 6);
    expect(stepped(ring, start, points)).toEqual(reachable(ring, start));
  });

  it('dos puntos seguidos están a como mucho maxStep casillas', () => {
    let from = start;
    for (const p of tourWaypoints(ring, start, 3)) {
      expect(findPath(ring, from, p)!.length - 1, `(${from.x},${from.y}) → (${p.x},${p.y})`).toBeLessThanOrEqual(3);
      from = p;
    }
  });

  it('con el mapa real, la ruta pisa todo pathGrid', () => {
    const map = JSON.parse(readFileSync(fileURLToPath(new URL('../../public/assets/maps/zoo.tmj', import.meta.url)), 'utf8')) as TiledMap;
    const grid = withSolidProps(buildWalkGrid(map), readProps(map), 16);
    const spawn = readSpawn(map);
    const points = tourWaypoints(grid, spawn, 6);
    const all = reachable(grid, spawn);
    const seen = stepped(grid, spawn, points);
    expect([...all].filter((k) => !seen.has(k))).toEqual([]);
  });

  it('con only, pisa todas las casillas que pide y usa las demás solo para pasar', () => {
    const only = (p: Point) => p.x >= 12;
    const points = tourWaypoints(ring, start, 6, only);
    const seen = stepped(ring, start, points);
    const wanted = [...reachable(ring, start)].filter((k) => only({ x: Number(k.split(',')[0]), y: Number(k.split(',')[1]) }));
    expect(wanted.length).toBeGreaterThan(0);
    expect(wanted.filter((k) => !seen.has(k))).toEqual([]);
    expect(seen.has('0,5'), 'no hace falta ir a la otra punta del anillo').toBe(false);
  });

  it('en una sala abierta avanza a tramos rectos, no casilla a casilla', () => {
    const room = gridFromAscii(Array.from({ length: 12 }, () => '.'.repeat(12)));
    const points = tourWaypoints(room, { x: 0, y: 0 }, 6);
    expect(stepped(room, { x: 0, y: 0 }, points).size).toBe(144);
    expect(points.length).toBeLessThanOrEqual(40);
  });
});

