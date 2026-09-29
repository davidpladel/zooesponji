import { describe, expect, it } from 'vitest';
import { a2Quarters, quartersKey } from '../../src/core/autotile';

/** '#' = mismo terreno, cualquier otro = no. */
function probe(rows: string[]) {
  return (x: number, y: number) => rows[y]?.[x] === '#';
}

// Cuartos de 8 px dentro de un autotile A2 (4 columnas × 6 filas de cuartos):
// filas 0–1: vista previa (col 0–1) y esquinas interiores (col 2–3);
// filas 2–5: rejilla 4×4 con esquinas exteriores, bordes y centro.
describe('a2Quarters', () => {
  const block = probe([
    '.....',
    '.###.',
    '.###.',
    '.###.',
    '.....',
  ]);

  it('fuera del terreno → null', () => {
    expect(a2Quarters(block, 0, 0)).toBeNull();
  });

  it('esquina NO: esquina exterior arriba-izq., bordes y centro', () => {
    // [arriba-izq, arriba-der, abajo-izq, abajo-der]
    expect(a2Quarters(block, 1, 1)).toEqual([
      [0, 2],
      [2, 2],
      [0, 4],
      [2, 4],
    ]);
  });

  it('centro rodeado: los 4 cuartos del centro', () => {
    expect(a2Quarters(block, 2, 2)).toEqual([
      [1, 3],
      [2, 3],
      [1, 4],
      [2, 4],
    ]);
  });

  it('borde E: cuartos del lado derecho', () => {
    expect(a2Quarters(block, 3, 2)).toEqual([
      [1, 3],
      [3, 3],
      [1, 4],
      [3, 4],
    ]);
  });

  it('esquinas interiores de un cruce salen de la zona de esquinas interiores', () => {
    const cross = probe([
      '..##..',
      '..##..',
      '######',
      '######',
      '..##..',
      '..##..',
    ]);
    // (2,2): falta césped solo en la diagonal NO → cuarto arriba-izq. = esquina interior.
    expect(a2Quarters(cross, 2, 2)?.[0]).toEqual([2, 0]);
    // (3,3): falta la diagonal SE → cuarto abajo-der. = esquina interior.
    expect(a2Quarters(cross, 3, 3)?.[3]).toEqual([3, 1]);
  });

  it('casilla aislada: las 4 esquinas exteriores', () => {
    expect(a2Quarters(probe(['#']), 0, 0)).toEqual([
      [0, 2],
      [3, 2],
      [0, 5],
      [3, 5],
    ]);
  });
});

describe('quartersKey', () => {
  it('es estable y distingue combinaciones', () => {
    const a = quartersKey([[0, 2], [2, 2], [0, 4], [2, 4]]);
    expect(a).toBe('0.2|2.2|0.4|2.4');
    expect(quartersKey([[1, 3], [2, 3], [1, 4], [2, 4]])).not.toBe(a);
  });
});
