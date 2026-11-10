import { describe, expect, it } from 'vitest';
import { testGiftAmount, testGiftKey } from '../../src/core/testGift';

const never = () => false;

describe('monedas de regalo para probar en el móvil', () => {
  it('en una versión de prueba se regalan una vez', () => {
    expect(testGiftAmount({ VITE_ADMOB_TESTING: '1', VITE_REGALO_PRUEBA: '8000' }, never)).toBe(8000);
    const given = new Set([testGiftKey(8000)]);
    expect(testGiftAmount({ VITE_ADMOB_TESTING: '1', VITE_REGALO_PRUEBA: '8000' }, (k) => given.has(k))).toBe(0);
  });

  it('nunca en la versión de Play (sin anuncios de prueba)', () => {
    expect(testGiftAmount({ VITE_REGALO_PRUEBA: '8000' }, never)).toBe(0);
    expect(testGiftAmount({ VITE_ADMOB_TESTING: '0', VITE_REGALO_PRUEBA: '8000' }, never)).toBe(0);
  });

  it('sin cantidad, o con una cantidad rara o negativa, no hay regalo (nunca quita monedas)', () => {
    for (const value of [undefined, '', 'mucho', '-500', '0', '2.5']) {
      expect(testGiftAmount({ VITE_ADMOB_TESTING: '1', VITE_REGALO_PRUEBA: value }, never)).toBe(0);
    }
  });
});
