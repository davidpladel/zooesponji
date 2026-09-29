import { describe, expect, it } from 'vitest';
import { pickRandom, planWander, walkableTiles } from '../../src/core/wander';
import { gridFromAscii } from './helpers';

function sequence(values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)]!;
}

const grid = gridFromAscii([
  '...',
  '#.#',
  '...',
]);

describe('walkableTiles', () => {
  it('lista las celdas transitables por filas', () => {
    expect(walkableTiles(grid)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ]);
  });
});

describe('pickRandom', () => {
  it('usa el rng para elegir', () => {
    expect(pickRandom(['a', 'b', 'c'], () => 0)).toBe('a');
    expect(pickRandom(['a', 'b', 'c'], () => 0.99)).toBe('c');
  });
  it('lista vacía → undefined', () => {
    expect(pickRandom([], () => 0.5)).toBeUndefined();
  });
});

describe('planWander', () => {
  const tiles = walkableTiles(grid);

  it('devuelve una ruta hasta el destino elegido', () => {
    const path = planWander(grid, { x: 0, y: 0 }, tiles, () => 0.99);
    expect(path?.[0]).toEqual({ x: 0, y: 0 });
    expect(path?.[path.length - 1]).toEqual({ x: 2, y: 2 });
    expect(path).toHaveLength(5);
  });

  it('si sale su propia casilla, vuelve a elegir', () => {
    const path = planWander(grid, { x: 0, y: 0 }, tiles, sequence([0, 0.99]));
    expect(path?.[path.length - 1]).toEqual({ x: 2, y: 2 });
  });

  it('null si no hay a dónde ir', () => {
    expect(planWander(grid, { x: 0, y: 0 }, [{ x: 0, y: 0 }], () => 0)).toBeNull();
  });
});
