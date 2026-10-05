import type { PenSpace } from './flock';
import { rectContains } from './interaction';
import { createGrid, isWalkable, type WalkGrid } from './pathfinding';

/**
 * Rejilla de la cuidadora: los caminos de siempre más el interior de los recintos abiertos.
 * La valla sigue cerrada (se entra por la puerta, que ya es camino) y las rocas, árboles y agua
 * del recinto no se pisan. Los visitantes siguen usando la rejilla original.
 */
export function withPenInteriors(grid: WalkGrid, spaces: readonly PenSpace[], tile: number): WalkGrid {
  const inside = (x: number, y: number): boolean => {
    const center = { x: x * tile + tile / 2, y: y * tile + tile / 2 };
    return spaces.some((s) => rectContains(s.inner, center) && !s.obstacles.some((o) => rectContains(o, center)));
  };
  return createGrid(grid.width, grid.height, (x, y) => isWalkable(grid, x, y) || inside(x, y));
}
