import { isWalkable, type WalkGrid } from './pathfinding';
import { buildWalkGrid, readProps, withSolidProps, type TiledMap } from './tiledmap';

const key = (x: number, y: number): string => `${x},${y}`;

function walkableKeys(grid: WalkGrid): string[] {
  const keys: string[] = [];
  for (let y = 0; y < grid.height; y++) for (let x = 0; x < grid.width; x++) if (isWalkable(grid, x, y)) keys.push(key(x, y));
  return keys;
}

/** Casillas de camino que pisan la cuidadora y los visitantes (`pathGrid` del juego), "x,y" por filas. */
export function pathTiles(map: TiledMap): string[] {
  return walkableKeys(withSolidProps(buildWalkGrid(map), readProps(map), map.tilewidth));
}

/** Casillas de camino que cierra el `block` de un prop sólido (la fuente): camino pintado que no se puede pisar. */
export function solidOverPath(map: TiledMap): { prop: string; tile: string }[] {
  const ground = buildWalkGrid(map);
  const result: { prop: string; tile: string }[] = [];
  for (const p of readProps(map)) {
    if (!p.solid) continue;
    const closed = new Set(walkableKeys(withSolidProps(ground, [p], map.tilewidth)));
    for (const k of walkableKeys(ground)) if (!closed.has(k)) result.push({ prop: p.prop, tile: k });
  }
  return result;
}
