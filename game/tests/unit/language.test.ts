import { afterEach, describe, expect, it, vi } from 'vitest';
import { LANGUAGES, type Language, detectLanguage, getLanguage, isLanguage, isRtl, nextLanguage, resolveLanguage, setLanguage } from '../../src/systems/language';

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
    [['fr'], 'fr'],
    [['fr-CA'], 'fr'],
    [['pt-BR'], 'pt-BR'],
    [['pt'], 'pt-BR'], // portugués sin región: el de Brasil
    [['pt-AO'], 'pt-BR'],
    [['pt-PT'], 'pt-PT'],
    [['pt_pt'], 'pt-PT'],
    [['it-IT'], 'it'],
    [['ru-RU'], 'ru'],
    [['ar-SA'], 'ar'],
    [['ar-EG'], 'ar'],
    [['hi-IN'], 'hi'],
    [['zh-CN'], 'zh'],
    [['zh-Hans-CN'], 'zh'],
    [['ja-JP'], 'ja'],
    [['de-DE'], 'en'], // no lo tenemos: inglés
    [['ko-KR'], 'en'],
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

  it('nextLanguage recorre todos y vuelve al primero', () => {
    const seen: Language[] = [LANGUAGES[0]];
    while (seen.length < LANGUAGES.length) seen.push(nextLanguage(seen.at(-1)!));
    expect(seen).toEqual([...LANGUAGES]);
    expect(nextLanguage(LANGUAGES.at(-1)!)).toBe(LANGUAGES[0]);
  });

  it('isLanguage solo acepta los del juego', () => {
    expect(isLanguage('pt-PT')).toBe(true);
    expect(isLanguage('pt')).toBe(false);
    expect(isLanguage('de')).toBe(false);
    expect(isLanguage(3)).toBe(false);
  });

  it('solo el árabe va de derecha a izquierda', () => {
    expect(LANGUAGES.filter(isRtl)).toEqual(['ar']);
  });
});
