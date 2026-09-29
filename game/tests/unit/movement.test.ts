import { describe, expect, it } from 'vitest';
import { stepAlongPath, tileCenter, tryMove, worldToTile } from '../../src/core/movement';
import { gridFromAscii } from './helpers';

describe('stepAlongPath', () => {
  it('avanza speed × tiempo hacia el siguiente punto', () => {
    const step = stepAlongPath({ x: 0, y: 0 }, [{ x: 100, y: 0 }], 50, 1000);
    expect(step.pos).toEqual({ x: 50, y: 0 });
    expect(step.remaining).toEqual([{ x: 100, y: 0 }]);
  });

  it('al llegar exacto quita el punto', () => {
    const step = stepAlongPath({ x: 0, y: 0 }, [{ x: 10, y: 0 }], 10, 1000);
    expect(step.pos).toEqual({ x: 10, y: 0 });
    expect(step.remaining).toEqual([]);
  });

  it('puede pasar varios puntos en un mismo paso', () => {
    const step = stepAlongPath(
      { x: 0, y: 0 },
      [
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 10 },
      ],
      25,
      1000,
    );
    expect(step.pos).toEqual({ x: 15, y: 10 });
    expect(step.remaining).toEqual([{ x: 20, y: 10 }]);
  });

  it('con dt 0 o sin ruta no se mueve', () => {
    expect(stepAlongPath({ x: 3, y: 4 }, [{ x: 9, y: 9 }], 50, 0).pos).toEqual({ x: 3, y: 4 });
    expect(stepAlongPath({ x: 3, y: 4 }, [], 50, 16).pos).toEqual({ x: 3, y: 4 });
  });
});

describe('conversiones tile ↔ mundo', () => {
  it('tileCenter devuelve el centro del tile', () => {
    expect(tileCenter({ x: 2, y: 3 }, 16)).toEqual({ x: 40, y: 56 });
  });
  it('worldToTile redondea hacia abajo', () => {
    expect(worldToTile({ x: 47.9, y: 16 }, 16)).toEqual({ x: 2, y: 1 });
  });
});

describe('tryMove', () => {
  const grid = gridFromAscii([
    '...',
    '.#.',
    '...',
  ]);

  it('se mueve libremente por celdas transitables', () => {
    expect(tryMove(grid, 16, { x: 8, y: 8 }, 16, 0)).toEqual({ x: 24, y: 8 });
  });

  it('no entra en un bloqueo', () => {
    expect(tryMove(grid, 16, { x: 8, y: 24 }, 16, 0)).toEqual({ x: 8, y: 24 });
  });

  it('en diagonal contra un muro desliza por el eje libre', () => {
    // Desde (8,24) hacia la derecha (bloqueado por el muro) y hacia abajo (libre).
    expect(tryMove(grid, 16, { x: 8, y: 24 }, 16, 16)).toEqual({ x: 8, y: 40 });
  });

  it('no sale del mapa', () => {
    expect(tryMove(grid, 16, { x: 8, y: 8 }, -16, 0)).toEqual({ x: 8, y: 8 });
  });
});
