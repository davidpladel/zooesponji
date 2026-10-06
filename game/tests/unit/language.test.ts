import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectLanguage, getLanguage, otherLanguage, resolveLanguage, setLanguage } from '../../src/systems/language';

describe('detectLanguage', () => {
  it.each([
    [['es'], 'es'],
    [['es-ES'], 'es'],
    [['es-MX', 'en-US'], 'es'],
    [['es-AR'], 'es'],
    [['ES'], 'es'],
    [['Es_419'], 'es'],
    [['en-US'], 'en'],
    [['en-US', 'es-ES'], 'en'], // solo cuenta el primero
    [['fr'], 'en'],
    [['eu-ES'], 'en'], // euskera: la región no cuenta
    [['est'], 'en'], // empieza por "es" pero no es español
    [[], 'en'],
  ] as const)('%j → %s', (languages, expected) => {
    expect(detectLanguage(languages)).toBe(expected);
  });

  it('sin lista devuelve inglés', () => {
    expect(detectLanguage(undefined)).toBe('en');
  });
});

describe('resolveLanguage', () => {
  it('el idioma guardado manda sobre el del móvil', () => {
    expect(resolveLanguage('en', ['es-ES'])).toBe('en');
    expect(resolveLanguage('es', ['en-US'])).toBe('es');
  });

  it('sin idioma guardado se detecta', () => {
    expect(resolveLanguage(undefined, ['es-MX'])).toBe('es');
    expect(resolveLanguage(undefined, ['de'])).toBe('en');
  });
});

describe('idioma activo', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('setLanguage cambia lo que devuelve getLanguage', () => {
    setLanguage('en');
    expect(getLanguage()).toBe('en');
    setLanguage('es');
    expect(getLanguage()).toBe('es');
  });

  it('setLanguage actualiza <html lang> si hay documento', () => {
    const documentElement = { lang: '' };
    vi.stubGlobal('document', { documentElement });
    setLanguage('en');
    expect(documentElement.lang).toBe('en');
  });

  it('otherLanguage alterna entre los dos', () => {
    expect(otherLanguage('es')).toBe('en');
    expect(otherLanguage('en')).toBe('es');
  });
});
