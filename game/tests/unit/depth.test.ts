import { describe, expect, it } from 'vitest';
import { DEPTH_BASE, depthForY } from '../../src/core/depth';

describe('depthForY', () => {
  it('más abajo = más delante', () => {
    expect(depthForY(200)).toBeGreaterThan(depthForY(100));
  });
  it('siempre por encima del suelo', () => {
    expect(depthForY(0)).toBe(DEPTH_BASE);
  });
});
