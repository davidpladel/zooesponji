import { describe, expect, it } from 'vitest';
import { BASE_VIEW_HEIGHT, computeZoom } from '../../src/systems/viewport';

describe('computeZoom', () => {
  it('usa 160 px de mundo visibles en vertical como base', () => {
    expect(BASE_VIEW_HEIGHT).toBe(160);
  });

  it.each([
    [844, 390, 2], // móvil en horizontal
    [1280, 720, 4],
    [1920, 1080, 6],
    [300, 150, 1], // más pequeño que la base: nunca menos de 1
    [0, 0, 1], // tamaño aún no conocido
  ])('%i×%i → zoom %i', (w, h, zoom) => {
    expect(computeZoom(w, h)).toBe(zoom);
  });

  it('siempre devuelve un entero', () => {
    expect(Number.isInteger(computeZoom(1000, 555))).toBe(true);
  });
});
