/**
 * Autotiles en formato RPG Maker "A2": cada terreno ocupa un bloque de 2×3 tiles (32×48 px),
 * que se trata como una rejilla de 4×6 cuartos de 8 px:
 * - filas 0–1, columnas 2–3: esquinas interiores;
 * - filas 2–5: rejilla 4×4 con esquinas exteriores, bordes y centro.
 * Cada casilla se compone con 4 cuartos elegidos según sus vecinas.
 */
export type Quarter = readonly [col: number, row: number];
/** Cuartos en orden: arriba-izquierda, arriba-derecha, abajo-izquierda, abajo-derecha. */
export type Quarters = readonly [Quarter, Quarter, Quarter, Quarter];

type Probe = (x: number, y: number) => boolean;

const QUADRANTS = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
] as const;

export function a2Quarters(same: Probe, x: number, y: number): Quarters | null {
  if (!same(x, y)) return null;
  const quarters = QUADRANTS.map(([qx, qy]): Quarter => {
    const dx = qx === 0 ? -1 : 1;
    const dy = qy === 0 ? -1 : 1;
    const horizontal = same(x + dx, y);
    const vertical = same(x, y + dy);
    const diagonal = same(x + dx, y + dy);
    if (horizontal && vertical && !diagonal) return [2 + qx, qy];
    const col = horizontal ? (qx === 0 ? 1 : 2) : qx === 0 ? 0 : 3;
    const row = vertical ? (qy === 0 ? 1 : 2) : qy === 0 ? 0 : 3;
    return [col, 2 + row];
  });
  return quarters as unknown as Quarters;
}

export function quartersKey(quarters: Quarters): string {
  return quarters.map(([c, r]) => `${c}.${r}`).join('|');
}
