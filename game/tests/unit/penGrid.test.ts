import { describe, expect, it } from 'vitest';
import { withPenInteriors } from '../../src/core/penGrid';
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
});
