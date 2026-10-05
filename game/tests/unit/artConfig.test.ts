import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { allLooks } from '../../src/data/pens';

interface Look {
  zip: string;
  file: string;
  edits?: { swap?: Record<string, string>; dots?: [number, number, string][]; rows?: number[]; area?: number[] }[];
}
const config = JSON.parse(readFileSync(new URL('../../art/art.config.json', import.meta.url), 'utf8')) as {
  zips: Record<string, string>;
  animals: Record<string, Look>;
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
