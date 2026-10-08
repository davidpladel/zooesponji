// game/tests/unit/eventCatalog.test.ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CATALOG, STEPS, animalsBucket, bookBucket, coinsBucket, durationBucket, feedsBucket, pagesBucket, part, pendingBucket,
  reachAction, residentName,
} from '../../src/core/eventCatalog';

describe('catálogo de eventos', () => {
  it('ninguna acción se repite, ni dentro de una categoría ni entre dos', () => {
    const all = Object.values(CATALOG).flat();
    expect(new Set(all).size).toBe(all.length);
  });

  it('toda acción está escrita en alguna de las dos specs de analítica', () => {
    const specs = ['2026-10-07-analitica-anonima-matomo-design.md', '2026-10-07-analitica-detallada-design.md']
      .map((name) => readFileSync(new URL(`../../../docs/superpowers/specs/${name}`, import.meta.url), 'utf8'))
      .join('\n');
    for (const action of Object.values(CATALOG).flat()) expect(specs.includes(action), action).toBe(true);
  });

  it('el embudo del catálogo son los pasos, en orden', () => {
    expect(CATALOG.embudo).toEqual(STEPS);
  });

  it('el alcance tiene sus tres ámbitos por tipo', () => {
    expect(reachAction('dia', 'animal')).toBe('dia-animal');
    expect(CATALOG.alcance).toContain(reachAction('vida', 'pantalla'));
  });
});

describe('nombres combinados', () => {
  it('un residente lleva su recinto delante', () => {
    expect(residentName('gordi')).toBe('cabra/gordi');
    expect(part(residentName('gordi'), 'zanahoria')).toBe('cabra/gordi/zanahoria');
    expect(residentName('sasha')).toBe('leon/sasha');
  });

  it('un residente desconocido se queda como viene', () => {
    expect(residentName('nadie')).toBe('nadie');
  });
});

describe('tramos, en sus bordes', () => {
  it('ningún tramo se llama «0»: Matomo guarda ese nombre como vacío y lo pierde en los informes', () => {
    for (const name of [feedsBucket(0), animalsBucket(0), pagesBucket(0), bookBucket(0), coinsBucket(0), durationBucket(0), pendingBucket(0)]) expect(name).not.toBe('0');
  });

  it.each([[0, 'cero'], [1, '1-2'], [2, '1-2'], [3, '3-5'], [5, '3-5'], [6, '6-10'], [10, '6-10'], [11, '11-20'], [20, '11-20'], [21, '21+']])(
    'comidas %i → %s', (n, label) => expect(feedsBucket(n)).toBe(label));
  it.each([[0, 'cero'], [1, '1'], [2, '2-3'], [3, '2-3'], [4, '4-6'], [6, '4-6'], [7, '7+']])(
    'animales %i → %s', (n, label) => expect(animalsBucket(n)).toBe(label));
  it.each([[0, 'cero'], [1, '1'], [2, '2-3'], [3, '2-3'], [4, '4-7'], [7, '4-7'], [8, '8+']])(
    'páginas de una lectura %i → %s', (n, label) => expect(pagesBucket(n)).toBe(label));
  it.each([[0, 'cero'], [1, '1-5'], [5, '1-5'], [6, '6-15'], [15, '6-15'], [16, '16-30'], [30, '16-30'], [31, '31+']])(
    'páginas del libro %i → %s', (n, label) => expect(bookBucket(n)).toBe(label));
  it.each([[0, '<1m'], [59, '<1m'], [60, '1-3m'], [179, '1-3m'], [180, '3-10m'], [599, '3-10m'], [600, '10-30m'], [1799, '10-30m'], [1800, '30m+']])(
    'duración %i s → %s', (s, label) => expect(durationBucket(s)).toBe(label));
  it.each([[0, '0-19'], [19, '0-19'], [20, '20-49'], [49, '20-49'], [50, '50-149'], [149, '50-149'], [150, '150-399'], [399, '150-399'], [400, '400-899'], [899, '400-899'], [900, '900-1599'], [1599, '900-1599'], [1600, '1600+']])(
    'saldo %i → %s', (coins, label) => expect(coinsBucket(coins)).toBe(label));
  it.each([[0, '<1h'], [3_599_999, '<1h'], [3_600_000, '1-6h'], [21_600_000, '6-24h'], [86_400_000, '1-3d'], [259_200_000, '3-7d'], [604_800_000, '7d+']])(
    'edad de lo pendiente %i ms → %s', (ms, label) => expect(pendingBucket(ms)).toBe(label));
});
