import { describe, expect, it } from 'vitest';
import { approachTile, gateAtDoorstep, isDropOnTarget, rectContains } from '../../src/core/interaction';
import { gridFromAscii } from './helpers';

const gates = [
  { animalId: 'leon', tile: { x: 10, y: 11 } },
  { animalId: 'cabra', tile: { x: 29, y: 11 } },
];

describe('gateAtDoorstep', () => {
  it('pisando el camino justo delante de la puerta (de 2 casillas)', () => {
    expect(gateAtDoorstep({ x: 10, y: 12 }, gates)?.animalId).toBe('leon');
    expect(gateAtDoorstep({ x: 11, y: 12 }, gates)?.animalId).toBe('leon');
    expect(gateAtDoorstep({ x: 10, y: 10 }, gates)?.animalId).toBe('leon'); // puerta de un recinto de abajo
  });

  it('null a un lado o más lejos', () => {
    expect(gateAtDoorstep({ x: 12, y: 12 }, gates)).toBeNull();
    expect(gateAtDoorstep({ x: 9, y: 12 }, gates)).toBeNull();
    expect(gateAtDoorstep({ x: 10, y: 13 }, gates)).toBeNull();
    expect(gateAtDoorstep({ x: 10, y: 11 }, gates)).toBeNull();
  });
});

describe('rectContains / isDropOnTarget', () => {
  const rect = { x: 100, y: 100, width: 50, height: 50 };

  it('punto dentro', () => {
    expect(rectContains(rect, { x: 125, y: 125 })).toBe(true);
  });

  it('bordes incluidos', () => {
    expect(rectContains(rect, { x: 150, y: 150 })).toBe(true);
  });

  it('punto fuera', () => {
    expect(rectContains(rect, { x: 90, y: 125 })).toBe(false);
  });

  it('soltar cerca cuenta gracias al margen', () => {
    expect(isDropOnTarget({ x: 90, y: 125 }, rect, 20)).toBe(true);
    expect(isDropOnTarget({ x: 60, y: 125 }, rect, 20)).toBe(false);
  });
});

describe('approachTile', () => {
  // Recinto en tiles (0..2, 0..2) = px (0,0)-(48,48); puerta en (1,2); camino debajo en (1,3).
  const grid = gridFromAscii(['xxx', 'xxx', 'x.x', 'x.x']);
  const rect = { x: 0, y: 0, width: 48, height: 48 };

  it('devuelve la casilla transitable de fuera del recinto', () => {
    expect(approachTile({ x: 1, y: 2 }, rect, 16, grid)).toEqual({ x: 1, y: 3 });
  });

  it('null si no hay salida', () => {
    expect(approachTile({ x: 1, y: 2 }, rect, 16, gridFromAscii(['xxx', 'xxx', 'x.x', 'xxx']))).toBeNull();
  });
});
