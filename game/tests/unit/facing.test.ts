import { describe, expect, it } from 'vitest';
import { facingFromDelta, randomPointInRect } from '../../src/core/facing';

describe('facingFromDelta', () => {
  it.each([
    [1, 0, 'right'],
    [-1, 0, 'left'],
    [0, 1, 'down'],
    [0, -1, 'up'],
    [3, 1, 'right'],
    [1, -3, 'up'],
  ] as const)('(%i,%i) → %s', (dx, dy, facing) => {
    expect(facingFromDelta(dx, dy, 'down')).toBe(facing);
  });

  it('sin movimiento mantiene la orientación', () => {
    expect(facingFromDelta(0, 0, 'left')).toBe('left');
  });
});

describe('randomPointInRect', () => {
  it('queda dentro con el margen', () => {
    const rect = { x: 100, y: 50, width: 60, height: 40 };
    expect(randomPointInRect(rect, () => 0, 10)).toEqual({ x: 110, y: 60 });
    expect(randomPointInRect(rect, () => 0.999999, 10).x).toBeLessThan(150);
  });
});
