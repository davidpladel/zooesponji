import { describe, expect, it } from 'vitest';
import { pickQuietGoal, pickRandom, planWander, walkableTiles } from '../../src/core/wander';
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

describe('pickQuietGoal', () => {
  it('de las casillas sacadas, elige la que tiene menos gente cerca', () => {
    const crowded = { x: 0, y: 0 };
    const quiet = { x: 20, y: 0 };
    const people = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
    expect(pickQuietGoal([crowded, quiet], people, sequence([0, 0.99]), 2)).toEqual(quiet);
  });

  it('sin casillas, undefined', () => {
    expect(pickQuietGoal([], [], Math.random)).toBeUndefined();
  });

  it('sin gente, se queda con la primera sacada', () => {
    expect(pickQuietGoal([{ x: 3, y: 3 }, { x: 9, y: 9 }], [], sequence([0.99, 0]), 2)).toEqual({ x: 9, y: 9 });
  });

  it('planWander con gente va a la casilla más tranquila', () => {
    const corridor = gridFromAscii(['...............']);
    const tiles = walkableTiles(corridor);
    // Gente en la punta izquierda: de (0,0) y (14,0) sacadas, elige la lejana.
    const path = planWander(corridor, { x: 7, y: 0 }, tiles, sequence([0, 0.99]), 1, [{ x: 0, y: 0 }, { x: 1, y: 0 }]);
    expect(path?.[path.length - 1]).toEqual({ x: 14, y: 0 });
  });
});
