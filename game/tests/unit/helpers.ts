import { createGrid, type WalkGrid } from '../../src/core/pathfinding';

/** '.' = transitable; cualquier otro carácter = bloqueado. Todas las filas deben medir igual. */
export function gridFromAscii(rows: string[]): WalkGrid {
  const width = rows[0]?.length ?? 0;
  return createGrid(width, rows.length, (x, y) => rows[y]?.[x] === '.');
}
