import { describe, expect, it } from 'vitest';
import { waterAt } from '../../src/core/water';
import type { WaterInfo } from '../../src/core/tiledmap';

describe('waterAt', () => {
  it('waterAt dice en qué charca está un punto', () => {
    const ws: WaterInfo[] = [
      { kind: 'agua', x: 0, y: 0, width: 32, height: 32 },
      { kind: 'barro', x: 64, y: 0, width: 16, height: 16 },
    ];
    expect(waterAt(ws, { x: 10, y: 10 })?.kind).toBe('agua');
    expect(waterAt(ws, { x: 70, y: 5 })?.kind).toBe('barro');
    expect(waterAt(ws, { x: 40, y: 40 })).toBeNull();
  });
});
