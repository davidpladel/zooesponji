import { describe, expect, it } from 'vitest';
import { wrapLines } from '../../src/ui/wrap';

/** Cada carácter mide 1. */
const measure = (s: string) => [...s].length;

describe('wrapLines', () => {
  it('corta por espacios en idiomas latinos', () => {
    expect(wrapLines('hola qué tal estás', 8, measure)).toEqual(['hola qué', 'tal', 'estás']);
  });

  it('corta el chino entre caracteres sin desbordar', () => {
    const lines = wrapLines('我是 Mary。我给动物喂食，为它们找个家。', 8, measure);
    expect(lines.every((l) => measure(l) <= 8)).toBe(true);
    expect(lines.join('').replace(/ /g, '')).toBe('我是Mary。我给动物喂食，为它们找个家。');
  });

  it('la puntuación no empieza una línea', () => {
    const lines = wrapLines('我给动物喂食。好', 6, measure);
    expect(lines.some((l) => l.startsWith('。'))).toBe(false);
  });

  it('respeta los saltos de línea', () => {
    expect(wrapLines('a\nb', 10, measure)).toEqual(['a', 'b']);
  });
});
