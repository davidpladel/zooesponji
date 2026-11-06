import { describe, expect, it } from 'vitest';
import { withPenInteriors } from '../../src/core/penGrid';
import { penSpace } from '../../src/core/flock';
import { findPath, isWalkable } from '../../src/core/pathfinding';
import { gridFromAscii } from './helpers';

const T = 16;
// Recinto de 5x4 casillas en (1,0): valla '#', puerta '.' en (3,3), camino debajo.
const base = gridFromAscii([
  '#######',
  '#######',
  '#######',
  '###.###',
  '.......',
]);
// Interior: casillas (2..4, 1..2).
const space = { inner: { x: 2 * T, y: 1 * T, width: 3 * T, height: 2 * T }, obstacles: [] };

describe('withPenInteriors', () => {
  it('abre el interior del recinto y deja la valla cerrada', () => {
    const grid = withPenInteriors(base, [space], T);
    expect(isWalkable(grid, 2, 1)).toBe(true);
    expect(isWalkable(grid, 4, 2)).toBe(true);
    expect(isWalkable(grid, 1, 1)).toBe(false);
    expect(isWalkable(grid, 2, 0)).toBe(false);
    expect(isWalkable(grid, 5, 2)).toBe(false);
  });

  it('se puede entrar desde el camino por la puerta', () => {
    const grid = withPenInteriors(base, [space], T);
    expect(findPath(grid, { x: 0, y: 4 }, { x: 2, y: 1 })).not.toBeNull();
  });

  it('una roca dentro no se pisa', () => {
    const rock = { x: 3 * T, y: 1 * T, width: T, height: T };
    const grid = withPenInteriors(base, [{ ...space, obstacles: [rock] }], T);
    expect(isWalkable(grid, 3, 1)).toBe(false);
    expect(isWalkable(grid, 3, 2)).toBe(true);
  });

  it('sin recintos abiertos la rejilla no cambia', () => {
    expect(withPenInteriors(base, [], T).cells).toEqual(base.cells);
  });

  it('una roca dentro de un recinto abierto no corta el paso de la cuidadora', () => {
    // Recinto de 6x6 casillas (interior 4x4) con una roca pisable (sin block) en el centro.
    const open6 = gridFromAscii(['######', '######', '######', '######', '######', '##..##', '......']);
    const rock = { x: 3 * T, y: 3 * T, block: null };
    const s = penSpace({ x: 0, y: 0, width: 6 * T, height: 6 * T }, [rock], T);
    const grid = withPenInteriors(open6, [s], T);
    expect(isWalkable(grid, 2, 2)).toBe(true);
    expect(findPath(grid, { x: 0, y: 6 }, { x: 2, y: 2 })).not.toBeNull();
  });
});

