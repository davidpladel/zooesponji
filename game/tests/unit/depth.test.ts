import { describe, expect, it } from 'vitest';
import { DEPTH_BASE, FLAT_DEPTH, depthForY, propDepth } from '../../src/core/depth';

describe('depthForY', () => {
  it('más abajo = más delante', () => {
    expect(depthForY(200)).toBeGreaterThan(depthForY(100));
  });
  it('siempre por encima del suelo', () => {
    expect(depthForY(0)).toBe(DEPTH_BASE);
  });
});

describe('propDepth', () => {
  it('lo que se pisa se dibuja por debajo de quien lo pisa', () => {
    expect(propDepth({ flat: false, walk: true, z: 0, y: 500 })).toBeLessThan(depthForY(10));
    expect(propDepth({ flat: false, walk: false, z: 0, y: 500 })).toBe(depthForY(500));
  });
  it('lo plano sigue pegado al suelo y ordenado por z', () => {
    expect(propDepth({ flat: true, walk: false, z: 2, y: 500 })).toBe(FLAT_DEPTH + 2);
  });
});
