import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { animatedStrip, characterSheet, reorderRows, crop, erase, recolorPanther } from '../../scripts/art/pngTools.ts';

function solid(width: number, height: number, rgba: [number, number, number, number]): PNG {
  const png = new PNG({ width, height });
  for (let i = 0; i < png.data.length; i += 4) png.data.set(rgba, i);
  return png;
}

function pixel(png: PNG, x: number, y: number): number[] {
  const i = (y * png.width + x) * 4;
  return [...png.data.subarray(i, i + 4)];
}

describe('crop', () => {
  it('recorta la zona pedida', () => {
    const src = solid(4, 4, [0, 0, 0, 255]);
    src.data.set([255, 0, 0, 255], (2 * 4 + 3) * 4); // (3,2) rojo
    const out = crop(src, 2, 1, 2, 2);
    expect([out.width, out.height]).toEqual([2, 2]);
    expect(pixel(out, 1, 1)).toEqual([255, 0, 0, 255]);
  });
});

describe('erase', () => {
  it('deja transparente solo la zona indicada', () => {
    const png = erase(solid(4, 4, [9, 9, 9, 255]), [[2, 2, 2, 2]]);
    expect(pixel(png, 3, 3)[3]).toBe(0);
    expect(pixel(png, 1, 1)[3]).toBe(255);
  });
});

describe('characterSheet', () => {
  it('saca el personaje N de una hoja 4×2', () => {
    const src = solid(8, 4, [0, 0, 0, 255]);
    src.data.set([0, 255, 0, 255], (2 * 8 + 6) * 4); // esquina del personaje 7 (col 3, fila 1)
    const out = characterSheet(src, 7);
    expect([out.width, out.height]).toEqual([2, 2]);
    expect(pixel(out, 0, 0)).toEqual([0, 255, 0, 255]);
  });
});

describe('recolorPanther', () => {
  it('oscurece los píxeles claros y respeta la transparencia', () => {
    const src = solid(2, 1, [240, 240, 240, 255]);
    src.data.set([0, 0, 0, 0], 4); // segundo píxel transparente
    const out = recolorPanther(src);
    const [r, g, b, a] = pixel(out, 0, 0);
    expect(r! + g! + b!).toBeLessThan(240);
    expect(a).toBe(255);
    expect(pixel(out, 1, 0)[3]).toBe(0);
  });
});

describe('animatedStrip', () => {
  it('monta los fotogramas en horizontal, cada uno del tamaño del recorte', () => {
    const src = solid(12, 2, [0, 0, 0, 255]);
    for (const [x, c] of [[0, 10], [4, 20], [8, 30]] as const) src.data.set([c, 0, 0, 255], (0 * 12 + x) * 4);
    const out = animatedStrip(src, { x: 0, y: 0, w: 3, h: 2 }, { step: 4, count: 3 });
    expect([out.width, out.height]).toEqual([9, 2]);
    expect([pixel(out, 0, 0)[0], pixel(out, 3, 0)[0], pixel(out, 6, 0)[0]]).toEqual([10, 20, 30]);
  });

  it('con area, solo anima esa zona y el resto queda del primer fotograma', () => {
    const src = solid(8, 1, [0, 0, 0, 255]);
    src.data.set([99, 0, 0, 255], 0); // (0,0): fuera del área, solo en el fotograma 0
    src.data.set([50, 0, 0, 255], 5 * 4); // (5,0) = (1,0) del fotograma 1
    const out = animatedStrip(src, { x: 0, y: 0, w: 2, h: 1 }, { step: 4, count: 2, area: [1, 0, 1, 1] });
    expect(pixel(out, 2, 0)[0]).toBe(99);
    expect(pixel(out, 3, 0)[0]).toBe(50);
  });
});

describe('reorderRows', () => {
  it('intercambia la fila de frente y la de espaldas', () => {
    const src = solid(1, 4, [0, 0, 0, 255]);
    [10, 20, 30, 40].forEach((v, y) => src.data.set([v, 0, 0, 255], y * 4));
    const out = reorderRows(src, [3, 1, 2, 0]);
    expect([0, 1, 2, 3].map((y) => pixel(out, 0, y)[0])).toEqual([40, 20, 30, 10]);
  });
});
