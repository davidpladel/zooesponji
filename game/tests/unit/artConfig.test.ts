import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FOOD_IDS } from '../../src/data/foods';
import { allLooks } from '../../src/data/pens';

interface Look {
  zip: string;
  file: string;
  edits?: { swap?: Record<string, string>; dots?: [number, number, string][]; rows?: number[]; area?: number[] }[];
}
const config = JSON.parse(readFileSync(new URL('../../art/art.config.json', import.meta.url), 'utf8')) as {
  zips: Record<string, string>;
  animals: Record<string, Look>;
  foods: Record<string, unknown>;
  props: Record<string, Record<string, unknown> & { edits?: { swap?: Record<string, string> }[] }>;
};
const HEX = /^[0-9a-f]{6}$/;

describe('configuración de arte: aspectos', () => {
  it.each(allLooks())('el aspecto %s está en art.config.json y su zip existe', (look) => {
    const entry = config.animals[look];
    expect(entry).toBeDefined();
    expect(config.zips[entry!.zip]).toBeTruthy();
  });

  it('los retoques usan colores bien escritos, filas 0–3 y zonas de 4 números', () => {
    for (const [look, entry] of Object.entries(config.animals)) {
      for (const edit of entry.edits ?? []) {
        for (const [from, to] of Object.entries(edit.swap ?? {})) {
          expect(HEX.test(from), `${look}: ${from}`).toBe(true);
          expect(HEX.test(to), `${look}: ${to}`).toBe(true);
        }
        for (const [, , color] of edit.dots ?? []) expect(HEX.test(color), `${look}: ${color}`).toBe(true);
        for (const row of edit.rows ?? []) expect([0, 1, 2, 3]).toContain(row);
        if (edit.area) expect(edit.area).toHaveLength(4);
      }
    }
  });
});

describe('configuración de arte: comidas', () => {
  it.each(FOOD_IDS)('la comida %s tiene icono en art.config.json', (id) => {
    expect(config.foods[id]).toBeDefined();
  });
});

describe('configuración de arte: charcos de barro', () => {
  /** Los azules del agua animada del pack (relleno, orilla oscura, onda y brillo). */
  const WATER_BLUES = ['85c9d6', '56b1c3', 'a4dde8', 'c8e7fb'];

  it.each([['pond-grassland'], ['water-savannah']])('%s tiene su versión de barro: la misma charca animada con los azules cambiados', (name) => {
    const water = config.props[name];
    const mud = config.props[`${name}-mud`];
    expect(water).toBeDefined();
    expect(mud).toBeDefined();
    const { edits, ...rest } = mud!;
    expect(rest).toEqual(water);
    const swap = Object.assign({}, ...(edits ?? []).map((e) => e.swap ?? {})) as Record<string, string>;
    for (const blue of WATER_BLUES) {
      expect(HEX.test(swap[blue] ?? ''), `${name}-mud: falta cambiar ${blue}`).toBe(true);
      expect(WATER_BLUES).not.toContain(swap[blue]);
    }
  });
});
