import { describe, expect, it } from 'vitest';
import { parseConfig, toBulkBody, toQuery, trackerUrl, type HitContext, type MatomoConfig } from '../../src/core/matomoRequest';

const config: MatomoConfig = {
  url: 'https://stats.example.com',
  siteId: 7,
  dimensions: { version: 1, platform: 2, language: 3, sessions: 4, age: 5 },
};

const context: HitContext = {
  visitorId: '0123456789abcdef',
  rand: 'fedcba9876543210',
  screen: 'mapa',
  version: '2.5.0',
  platform: 'android',
  language: 'es',
  sessions: '2-5',
  age: 'd1',
};

const params = (query: string): Record<string, string> => Object.fromEntries(new URLSearchParams(query.slice(1)));

describe('parseConfig', () => {
  const env = { VITE_MATOMO_URL: 'https://stats.example.com/', VITE_MATOMO_SITE: '7', VITE_MATOMO_DIMS: '1, 2,3,4,5' };

  it('lee dirección, sitio y dimensiones, y quita la barra final', () => {
    expect(parseConfig(env)).toEqual(config);
  });

  it.each([
    ['sin nada', {}],
    ['sin https', { ...env, VITE_MATOMO_URL: 'http://stats.example.com' }],
    ['sitio que no es un número', { ...env, VITE_MATOMO_SITE: 'siete' }],
    ['sitio a cero', { ...env, VITE_MATOMO_SITE: '0' }],
    ['faltan dimensiones', { ...env, VITE_MATOMO_DIMS: '1,2,3,4' }],
    ['dimensión que no es un número', { ...env, VITE_MATOMO_DIMS: '1,2,x,4,5' }],
  ])('devuelve null: %s', (_label, bad) => {
    expect(parseConfig(bad)).toBeNull();
  });
});

describe('trackerUrl', () => {
  it('apunta a matomo.php', () => {
    expect(trackerUrl(config)).toBe('https://stats.example.com/matomo.php');
  });
});

describe('toQuery', () => {
  it('una pantalla lleva su título y la dirección de esa pantalla', () => {
    const query = toQuery({ kind: 'screen', name: 'mapa' }, config, context);
    expect(query.startsWith('?')).toBe(true);
    expect(params(query)).toEqual({
      idsite: '7',
      rec: '1',
      apiv: '1',
      rand: 'fedcba9876543210',
      _id: '0123456789abcdef',
      url: 'https://davidpladel.com/zoo/mapa',
      action_name: 'mapa',
      dimension1: '2.5.0',
      dimension2: 'android',
      dimension3: 'es',
      dimension4: '2-5',
      dimension5: 'd1',
    });
  });

  it('un evento lleva categoría, acción, nombre y valor', () => {
    const p = params(toQuery({ kind: 'event', category: 'progreso', action: 'animal', name: 'cabra', value: 3 }, config, context));
    expect(p.e_c).toBe('progreso');
    expect(p.e_a).toBe('animal');
    expect(p.e_n).toBe('cabra');
    expect(p.e_v).toBe('3');
    expect('action_name' in p).toBe(false);
  });

  it('sin nombre ni valor no se envían vacíos', () => {
    const p = params(toQuery({ kind: 'event', category: 'sesion', action: 'inicio' }, config, context));
    expect('e_n' in p).toBe(false);
    expect('e_v' in p).toBe(false);
  });

  it('nunca lleva identificadores ni datos del dispositivo', () => {
    const p = params(toQuery({ kind: 'event', category: 'sesion', action: 'inicio' }, config, context));
    for (const banned of ['uid', 'cid', 'res', 'urlref', 'ua', 'token_auth']) expect(banned in p, banned).toBe(false);
  });

  it('codifica los caracteres raros', () => {
    const query = toQuery({ kind: 'event', category: 'error', action: 'no-controlado', name: 'a&b=c ñ' }, config, context);
    expect(params(query).e_n).toBe('a&b=c ñ');
  });
});

describe('toBulkBody', () => {
  it('es el JSON de seguimiento por lotes de Matomo, sin token', () => {
    expect(JSON.parse(toBulkBody(['?a=1', '?b=2']))).toEqual({ requests: ['?a=1', '?b=2'] });
  });
});
