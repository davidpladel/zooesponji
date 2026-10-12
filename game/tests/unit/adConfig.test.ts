import { describe, expect, it } from 'vitest';
import { TEST_UNITS, configuredSlots, parseAdConfig } from '../../src/core/adConfig';

const REWARDED = 'ca-app-pub-1234567890123456/1111111111';
const INTERSTITIAL = 'ca-app-pub-1234567890123456/2222222222';

describe('configuración de la publicidad', () => {
  it('sin nada configurado no hay publicidad', () => {
    expect(parseAdConfig({}, false)).toBeNull();
    expect(parseAdConfig({ VITE_ADMOB_REWARDED: '', VITE_ADMOB_REWARDED_INTERSTITIAL: '  ' }, false)).toBeNull();
  });

  it('con los dos bloques hay dos huecos', () => {
    const config = parseAdConfig({ VITE_ADMOB_REWARDED: REWARDED, VITE_ADMOB_REWARDED_INTERSTITIAL: ` ${INTERSTITIAL} ` }, false);
    expect(config).toEqual({ units: { tienda: REWARDED, pausa: INTERSTITIAL }, testing: false });
    expect(configuredSlots(config!)).toEqual(['tienda', 'pausa']);
  });

  it('si falta un bloque, ese hueco no existe', () => {
    expect(configuredSlots(parseAdConfig({ VITE_ADMOB_REWARDED: REWARDED }, false)!)).toEqual(['tienda']);
    expect(configuredSlots(parseAdConfig({ VITE_ADMOB_REWARDED_INTERSTITIAL: INTERSTITIAL }, false)!)).toEqual(['pausa']);
  });

  it.each(['ca-app-pub-123/456', 'ca-app-pub-1234567890123456~1111111111', 'cualquier cosa'])('un bloque mal escrito (%s) no cuenta', (unit) => {
    expect(parseAdConfig({ VITE_ADMOB_REWARDED: unit }, false)).toBeNull();
  });

  it('en desarrollo se piden los anuncios de prueba de Google, haya o no configuración', () => {
    expect(parseAdConfig({}, true)).toEqual({ units: TEST_UNITS, testing: true });
    expect(parseAdConfig({ VITE_ADMOB_REWARDED: REWARDED }, true)).toEqual({ units: TEST_UNITS, testing: true });
  });

  it('en producción, VITE_ADMOB_TESTING=1 también pide los de prueba', () => {
    expect(parseAdConfig({ VITE_ADMOB_REWARDED: REWARDED, VITE_ADMOB_TESTING: '1' }, false)).toEqual({ units: TEST_UNITS, testing: true });
    expect(parseAdConfig({ VITE_ADMOB_REWARDED: REWARDED, VITE_ADMOB_TESTING: '0' }, false)?.testing).toBe(false);
  });
});
