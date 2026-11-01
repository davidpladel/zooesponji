import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { retouch } from '../../scripts/art/looks.ts';

const solid = (w: number, h: number, rgba: [number, number, number, number]): PNG => {
  const png = new PNG({ width: w, height: h });
  for (let i = 0; i < png.data.length; i += 4) png.data.set(rgba, i);
  return png;
};
const pixel = (png: PNG, x: number, y: number): number[] => [...png.data.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 4)];

describe('retouch (retoques encima de una hoja, también de un dibujo terminado)', () => {
  it('cambia los colores y luego reduce cada fotograma', () => {
    // Hoja 3×4 de fotogramas de 4×4 en negro 414040: las manchas del panda.
    const out = retouch(solid(12, 16, [0x41, 0x40, 0x40, 255]), { edits: [{ swap: { '414040': '9a9a9a' } }], shrink: 2 });
    expect(pixel(out, 1, 2)).toEqual([0x9a, 0x9a, 0x9a, 255]);
    expect(pixel(out, 0, 0)[3]).toBe(0);
  });

  it('sin retoques devuelve la hoja igual', () => {
    const src = solid(12, 16, [1, 2, 3, 255]);
    expect([...retouch(src, {}).data]).toEqual([...src.data]);
  });

  it('encima de un dibujo terminado reduce primero, así el gris no ensucia el blanco', () => {
    // Fotogramas de 4×4: columna 0 negra, resto blanca. Reducido a 2, gana lo oscuro; luego el negro pasa a gris.
    const src = solid(12, 16, [0xf4, 0xf3, 0xf2, 255]);
    for (let y = 0; y < 16; y++) for (const x of [0, 4, 8]) src.data.set([0x41, 0x40, 0x40, 255], (y * 12 + x) * 4);
    const out = retouch(src, { edits: [{ swap: { '414040': '9a9a9a' } }], shrink: 2 }, true);
    expect(pixel(out, 1, 2)).toEqual([0x9a, 0x9a, 0x9a, 255]);
    expect(pixel(out, 2, 2)).toEqual([0xf4, 0xf3, 0xf2, 255]);
  });
});
