import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { STRINGS_ES, hasKey } from '../../src/data/strings';
import { STRINGS_EN } from '../../src/data/strings/en';

const words = (text: string): number => text.trim().split(/\s+/).length;

describe('textos del libro', () => {
  const texts = Object.entries(STRINGS_ES).filter(([key]) => /^book\.page\..+\.text$/.test(key));

  it('hay un texto por cada una de las 49 páginas y la contraportada', () => {
    expect(texts).toHaveLength(50);
  });

  // La página de Mary es de antes de esta regla (21 palabras, aprobada con el libro original).
  it.each(texts.filter(([key]) => key !== 'book.page.mary.text'))('%s tiene 20 palabras como mucho', (_key, text) => {
    expect(words(text)).toBeLessThanOrEqual(20);
  });
});

/** Quita los comentarios para no confundirlos con texto del juego. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

/** Cadenas con dos o más palabras seguidas: eso es una frase para el jugador, no un nombre técnico. */
const PHRASE = /(['"`])((?:(?!\1)[^\\\n])*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,} [A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,}(?:(?!\1)[^\\\n])*)\1/g;

describe('ningún texto visible fuera de strings.ts', () => {
  const files = ['scenes', 'world'].flatMap((dir) => {
    const path = fileURLToPath(new URL(`../../src/${dir}/`, import.meta.url));
    return readdirSync(path)
      .filter((name) => name.endsWith('.ts'))
      .map((name) => [`${dir}/${name}`, readFileSync(path + name, 'utf8')] as const);
  });

  it.each(files)('%s', (_name, source) => {
    const found: string[] = [];
    for (const line of withoutComments(source).split('\n')) {
      // Los mensajes de error son para quien programa; los import, rutas.
      if (/new Error\(|^\s*import |console\./.test(line)) continue;
      for (const match of line.matchAll(PHRASE)) found.push(match[2]!);
    }
    expect(found).toEqual([]);
  });
});

describe('hasKey', () => {
  it('reconoce las claves que existen', () => {
    expect(hasKey('zone.sabana')).toBe(true);
    expect(hasKey('title.name')).toBe(true);
  });

  it('rechaza las que no existen, también las heredadas de Object', () => {
    expect(hasKey('zone.luna')).toBe(false);
    expect(hasKey('toString')).toBe(false);
    expect(hasKey('')).toBe(false);
  });
});

const ES: Record<string, string> = STRINGS_ES;
const EN: Record<string, string> = STRINGS_EN;
const markers = (text: string): string[] => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();
/** De las claves que se piden, las que aún no están en inglés. */
const missing = (keys: string[]): string[] => keys.filter((key) => !(key in EN));

describe('inglés', () => {
  it.each(Object.keys(EN))('%s: existe en español, no está vacío y conserva los marcadores', (key) => {
    expect(ES[key], key).toBeDefined();
    expect(EN[key]!.trim()).not.toBe('');
    expect(markers(EN[key]!)).toEqual(markers(ES[key]!));
  });

  it('«Zoo Esponji» no se traduce', () => {
    expect(EN['title.name']).toBe('Zoo Esponji');
  });

  it('bloque 1: están todos los textos cortos', () => {
    expect(missing(Object.keys(ES).filter((key) => !/^(shop\.about|book\.page)\./.test(key)))).toEqual([]);
  });
});
