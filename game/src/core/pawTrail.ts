import type { Point } from './pathfinding';

export type PawFacing = 'up' | 'down' | 'left' | 'right';

export interface PawStep {
  /** Casilla del camino donde va la huella (una de las de la ruta de la cuidadora). */
  tile: Point;
  /** Hacia dónde anda Luna en esa casilla. */
  facing: PawFacing;
  /** -1 o 1: izquierda o derecha del centro del camino, alternando como huellas de verdad. */
  side: -1 | 1;
}

/** Casillas entre una huella y la siguiente. */
export const PAW_EVERY = 2;

/**
 * Huellas de Luna por la ruta de la cuidadora (`path`, de casilla en casilla, como la da el pathfinding): una cada
 * `every` casillas, sin poner ninguna en la casilla de salida (ahí está la cuidadora) y siempre una en la de llegada.
 */
export function pawSteps(path: readonly Point[], every = PAW_EVERY): PawStep[] {
  const steps: PawStep[] = [];
  if (path.length < 2) return steps;
  const facingAt = (i: number): PawFacing => {
    const a = path[Math.max(0, i - 1)]!;
    const b = path[Math.max(1, i)]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
    return dy >= 0 ? 'down' : 'up';
  };
  for (let i = every; i < path.length; i += every) steps.push({ tile: path[i]!, facing: facingAt(i), side: steps.length % 2 === 0 ? -1 : 1 });
  const last = path.length - 1;
  if (steps.length === 0 || steps[steps.length - 1]!.tile !== path[last]) {
    steps.push({ tile: path[last]!, facing: facingAt(last), side: steps.length % 2 === 0 ? -1 : 1 });
  }
  return steps;
}

/** Gira un dibujo de filas 90° a la derecha (el pixel art girado de 90 en 90 no pierde nada). */
export function rotateRows(rows: readonly string[]): string[] {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const out: string[] = [];
  for (let x = 0; x < w; x++) {
    let row = '';
    for (let y = h - 1; y >= 0; y--) row += rows[y]![x] ?? '.';
    out.push(row);
  }
  return out;
}

/** El dibujo de la huella (que apunta hacia arriba) mirando hacia `facing`. */
export function pawRows(up: readonly string[], facing: PawFacing): string[] {
  const turns = { up: 0, right: 1, down: 2, left: 3 }[facing];
  let rows = [...up];
  for (let i = 0; i < turns; i++) rows = rotateRows(rows);
  return rows;
}
