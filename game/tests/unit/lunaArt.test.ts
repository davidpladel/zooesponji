import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { lunaSheet } from '../../scripts/make-luna.ts';

const file = PNG.sync.read(readFileSync(fileURLToPath(new URL('../../art/luna.png', import.meta.url))));
const at = (png: PNG, x: number, y: number) => [...png.data.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 4)];

describe('dibujo de Luna', () => {
  it('es una hoja de 3×4 fotogramas de 16×16, igual a la que dibuja el script', () => {
    expect([file.width, file.height]).toEqual([48, 64]);
    expect([...file.data]).toEqual([...lunaSheet().data]);
  });

  it('cada fotograma tiene dibujo', () => {
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 3; col++) {
        let opaque = 0;
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (at(file, col * 16 + x, row * 16 + y)[3] === 255) opaque++;
        expect(opaque, `${row},${col}`).toBeGreaterThan(40);
      }
  });

  it('de frente se ve la mancha blanca del pecho', () => {
    let white = 0;
    for (let y = 7; y <= 12; y++) for (let x = 0; x < 16; x++) if (at(file, 16 + x, y).join() === '244,243,242,255') white++;
    expect(white).toBeGreaterThanOrEqual(3);
  });

  it('es negra: casi todo lo opaco es oscuro', () => {
    let dark = 0;
    let opaque = 0;
    for (let i = 0; i < file.data.length; i += 4) {
      if (file.data[i + 3] !== 255) continue;
      opaque++;
      if (file.data[i]! * 0.3 + file.data[i + 1]! * 0.6 + file.data[i + 2]! * 0.1 < 80) dark++;
    }
    expect(dark / opaque).toBeGreaterThan(0.8);
  });
});
