import { describe, expect, it } from 'vitest';
import { findPath, findPathOrNearest, isWalkable, type Point } from '../../src/core/pathfinding';
import { gridFromAscii } from './helpers';

function expectContiguous(path: Point[]): void {
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)).toBe(1);
  }
}

describe('isWalkable', () => {
  const grid = gridFromAscii(['.#', '..']);
  it('lee las celdas', () => {
    expect(isWalkable(grid, 0, 0)).toBe(true);
    expect(isWalkable(grid, 1, 0)).toBe(false);
  });
  it('fuera del mapa es no transitable', () => {
    expect(isWalkable(grid, -1, 0)).toBe(false);
    expect(isWalkable(grid, 2, 0)).toBe(false);
    expect(isWalkable(grid, 0, 2)).toBe(false);
  });
});

describe('findPath', () => {
  it('línea recta', () => {
    const grid = gridFromAscii(['.....']);
    expect(findPath(grid, { x: 0, y: 0 }, { x: 4, y: 0 })).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
    ]);
  });

  it('rodea un muro por el camino más corto', () => {
    const grid = gridFromAscii([
      '.....',
      '.###.',
      '.....',
    ]);
    const path = findPath(grid, { x: 0, y: 1 }, { x: 4, y: 1 });
    expect(path).not.toBeNull();
    expect(path!.length).toBe(7); // 6 pasos
    expectContiguous(path!);
    expect(path![0]).toEqual({ x: 0, y: 1 });
    expect(path![path!.length - 1]).toEqual({ x: 4, y: 1 });
  });

  it('origen igual a destino', () => {
    const grid = gridFromAscii(['..']);
    expect(findPath(grid, { x: 1, y: 0 }, { x: 1, y: 0 })).toEqual([{ x: 1, y: 0 }]);
  });

  it('null si el destino está aislado', () => {
    const grid = gridFromAscii(['.#.']);
    expect(findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
  });

  it('null si el destino no es transitable', () => {
    const grid = gridFromAscii(['.#']);
    expect(findPath(grid, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
  });
});

describe('findPathOrNearest', () => {
  it('si se puede llegar, es igual que findPath', () => {
    const grid = gridFromAscii(['...']);
    expect(findPathOrNearest(grid, { x: 0, y: 0 }, { x: 2, y: 0 })).toEqual(
      findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 }),
    );
  });

  it('destino en un muro: va a la celda alcanzable más cercana', () => {
    const grid = gridFromAscii([
      '.....',
      '##.##',
      '##.##',
    ]);
    const path = findPathOrNearest(grid, { x: 0, y: 0 }, { x: 3, y: 2 });
    expect(path![path!.length - 1]).toEqual({ x: 2, y: 2 });
    expectContiguous(path!);
  });

  it('destino fuera del mapa: se acerca todo lo posible', () => {
    const grid = gridFromAscii(['...']);
    const path = findPathOrNearest(grid, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(path![path!.length - 1]).toEqual({ x: 2, y: 0 });
  });

  it('null si el origen no es transitable', () => {
    const grid = gridFromAscii(['#.']);
    expect(findPathOrNearest(grid, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
  });
});
