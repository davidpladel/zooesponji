import { describe, expect, it } from 'vitest';
import { FALLBACK_SPOTS, interiorLayout, pedestalFor, toScreen } from '../../src/core/interiorLayout';

describe('interiorLayout', () => {
  it('escala entera cuando llega a 2 y centra', () => {
    expect(interiorLayout(1280, 720, 320, 192)).toEqual({ scale: 3, offsetX: 160, offsetY: 72 });
  });

  it('pantallas bajas: escala fraccionaria para verse entero', () => {
    const l = interiorLayout(800, 360, 320, 192);
    expect(l.scale).toBeCloseTo(1.875);
    expect(l.offsetY).toBeCloseTo(0);
  });

  it('toScreen aplica escala y offset', () => {
    expect(toScreen({ scale: 2, offsetX: 10, offsetY: 20 }, { x: 5, y: 6 })).toEqual({ x: 20, y: 32 });
  });
});

describe('pedestalFor', () => {
  const xs = (count: number) => Array.from({ length: count }, (_v, i) => pedestalFor(FALLBACK_SPOTS, i, count).x);

  it('con 5 productos, uno por peana', () => {
    expect(pedestalFor(FALLBACK_SPOTS, 0, 5)).toEqual(FALLBACK_SPOTS.pedestals[0]);
    expect(xs(5)).toEqual([112, 152, 192, 232, 272]);
  });

  it('con menos productos, centrados en el arco', () => {
    expect(xs(1)).toEqual([192]);
    expect(xs(3)).toEqual([152, 192, 232]);
    expect(xs(4)).toEqual([132, 172, 212, 252]);
  });

  it('si hay más productos que peanas, los que sobran van en fila delante', () => {
    expect(pedestalFor(FALLBACK_SPOTS, 7, 8).y).toBe(172);
  });
});
