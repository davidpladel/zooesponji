import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { animatedStrip, characterSheet, reorderRows, crop, erase, recolorPanther, editSheet, scaleUp, shrinkFrames } from '../../scripts/art/pngTools.ts';

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

describe('editSheet', () => {
  // Hoja 3×4 de fotogramas de 2×2 px, toda blanca.
  const sheet = () => solid(6, 8, [244, 243, 242, 255]);

  it('cambia un color exacto en todos los fotogramas', () => {
    const out = editSheet(sheet(), [{ swap: { f4f3f2: 'e8c9a0' } }]);
    expect(pixel(out, 0, 0)).toEqual([232, 201, 160, 255]);
    expect(pixel(out, 5, 7)).toEqual([232, 201, 160, 255]);
  });

  it('no toca el original ni los colores que no están en la tabla', () => {
    const src = sheet();
    src.data.set([65, 64, 64, 255], 0);
    const out = editSheet(src, [{ swap: { f4f3f2: '000000' } }]);
    expect(pixel(out, 0, 0)).toEqual([65, 64, 64, 255]);
    expect(pixel(src, 1, 0)).toEqual([244, 243, 242, 255]);
  });

  it('respeta la zona: lo de fuera se queda igual (calcetines)', () => {
    const out = editSheet(sheet(), [{ swap: { f4f3f2: 'b8824e' }, area: [0, 0, 2, 1] }]);
    expect(pixel(out, 0, 0)).toEqual([184, 130, 78, 255]);
    expect(pixel(out, 0, 1)).toEqual([244, 243, 242, 255]);
    // Segundo fotograma de la tercera fila: misma zona relativa.
    expect(pixel(out, 2, 4)).toEqual([184, 130, 78, 255]);
    expect(pixel(out, 2, 5)).toEqual([244, 243, 242, 255]);
  });

  it('respeta las filas indicadas', () => {
    const out = editSheet(sheet(), [{ swap: { f4f3f2: '000000' }, rows: [3] }]);
    expect(pixel(out, 0, 0)).toEqual([244, 243, 242, 255]);
    expect(pixel(out, 0, 6)).toEqual([0, 0, 0, 255]);
  });

  it('no cambia píxeles transparentes o semitransparentes (la sombra)', () => {
    const src = sheet();
    src.data.set([244, 243, 242, 43], 0);
    expect(pixel(editSheet(src, [{ swap: { f4f3f2: '000000' } }]), 0, 0)).toEqual([244, 243, 242, 43]);
  });

  it('pinta puntos sueltos en los 3 fotogramas de la fila', () => {
    const out = editSheet(sheet(), [{ dots: [[1, 1, 'f2c230']], rows: [0] }]);
    expect(pixel(out, 1, 1)).toEqual([242, 194, 48, 255]);
    expect(pixel(out, 3, 1)).toEqual([242, 194, 48, 255]);
    expect(pixel(out, 5, 1)).toEqual([242, 194, 48, 255]);
    expect(pixel(out, 1, 3)).toEqual([244, 243, 242, 255]);
  });

  it('respeta las columnas indicadas (un fotograma concreto del paso)', () => {
    const out = editSheet(sheet(), [{ dots: [[0, 0, 'f2c230']], rows: [0], cols: [1] }]);
    expect(pixel(out, 2, 0)).toEqual([242, 194, 48, 255]);
    expect(pixel(out, 0, 0)).toEqual([244, 243, 242, 255]);
    expect(pixel(out, 4, 0)).toEqual([244, 243, 242, 255]);
  });

  it('avisa de un color mal escrito', () => {
    expect(() => editSheet(sheet(), [{ swap: { f4f3f2: 'rojo' } }])).toThrow('rojo');
  });
});

describe('shrinkFrames', () => {
  it('reduce cada fotograma y lo apoya abajo en el centro, sin cambiar el tamaño de la hoja', () => {
    // Hoja 3×4 de fotogramas de 4×4, toda negra opaca.
    const out = shrinkFrames(solid(12, 16, [0, 0, 0, 255]), 2);
    expect([out.width, out.height]).toEqual([12, 16]);
    // Primer fotograma: el dibujo ocupa x 1..2, y 2..3.
    expect(pixel(out, 0, 3)[3]).toBe(0);
    expect(pixel(out, 1, 1)[3]).toBe(0);
    expect(pixel(out, 1, 2)).toEqual([0, 0, 0, 255]);
    expect(pixel(out, 2, 3)).toEqual([0, 0, 0, 255]);
    expect(pixel(out, 3, 3)[3]).toBe(0);
    // Último fotograma (columna 2, fila 3): misma colocación.
    expect(pixel(out, 9, 15)).toEqual([0, 0, 0, 255]);
    expect(pixel(out, 8, 15)[3]).toBe(0);
  });

  it('con el tamaño del fotograma no cambia nada', () => {
    const src = solid(12, 16, [9, 9, 9, 255]);
    expect([...shrinkFrames(src, 4).data]).toEqual([...src.data]);
  });
});

describe('scaleUp', () => {
  it('amplía sin suavizar', () => {
    const src = solid(2, 1, [0, 0, 0, 255]);
    src.data.set([255, 0, 0, 255], 4);
    const out = scaleUp(src, 3);
    expect([out.width, out.height]).toEqual([6, 3]);
    expect(pixel(out, 2, 2)).toEqual([0, 0, 0, 255]);
    expect(pixel(out, 3, 0)).toEqual([255, 0, 0, 255]);
  });
});
