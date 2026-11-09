import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BUBBLE_SIZE, CLINIC_ICON, PAW, SHOP_ICON, bubbleRows, edgeHint, pixelsOf } from '../../src/core/guideArt';
import { MEDALLION, inCircle, medallionAnimal, opaqueBounds, shrinkFactor, type Pixels } from '../../src/core/medallion';
import { findPath } from '../../src/core/pathfinding';
import { pawRows, pawSteps, rotateRows } from '../../src/core/pawTrail';
import { buildWalkGrid, readShop, readSpawn, type TiledMap } from '../../src/core/tiledmap';

describe('dibujos de la guía a la tienda', () => {
  it('la tiendita, la huella y los bocadillos solo usan colores de la paleta', () => {
    for (const rows of [SHOP_ICON, PAW, bubbleRows(null), bubbleRows('up'), bubbleRows('left')]) {
      expect(() => pixelsOf(rows)).not.toThrow();
    }
  });

  it('la cruz del botón de la clínica: colores de la paleta, roja por dentro y del alto de la tiendita', () => {
    expect(() => pixelsOf(CLINIC_ICON)).not.toThrow();
    expect(CLINIC_ICON).toHaveLength(SHOP_ICON.length);
    const middle = CLINIC_ICON[Math.floor(CLINIC_ICON.length / 2)]!;
    expect(middle[Math.floor(middle.length / 2)]).toBe('l');
  });

  it('el bocadillo sin colita es un círculo; con colita llega al borde de su lado', () => {
    const plain = bubbleRows(null);
    expect(plain).toHaveLength(BUBBLE_SIZE);
    expect(plain[0]).toMatch(/^\.+$/);
    const touches = { up: (r: string[]) => r[0]!, down: (r: string[]) => r[BUBBLE_SIZE - 1]!, left: (r: string[]) => r.map((row) => row[0]).join(''), right: (r: string[]) => r.map((row) => row[BUBBLE_SIZE - 1]).join('') };
    for (const side of ['up', 'down', 'left', 'right'] as const) {
      expect(touches[side](bubbleRows(side)), side).toMatch(/b/);
      expect(touches[side](plain), side).not.toMatch(/b/);
    }
  });

  it('la colita de abajo es la de arriba al revés (se dibuja cada lado, no se gira la imagen)', () => {
    expect(bubbleRows('down').slice(0, 6)).toEqual(bubbleRows(null).slice(0, 6));
    expect(bubbleRows('up').slice(BUBBLE_SIZE - 6)).toEqual(bubbleRows(null).slice(BUBBLE_SIZE - 6));
  });

  it('bocadillo del borde: nada si el sitio se ve; si no, en el borde más cercano apuntando hacia él', () => {
    expect(edgeHint({ x: 300, y: 200 }, 640, 360, 44)).toBeNull();
    expect(edgeHint({ x: 900, y: 200 }, 640, 360, 44)).toEqual({ side: 'right', x: 596, y: 200 });
    expect(edgeHint({ x: 300, y: -500 }, 640, 360, 44)).toEqual({ side: 'up', x: 300, y: 44 });
    expect(edgeHint({ x: -10, y: 900 }, 640, 360, 44)!.side).toBe('down');
    expect(edgeHint({ x: -400, y: 380 }, 640, 360, 44)!.side).toBe('left');
  });
});

describe('huellas de Luna', () => {
  const map = JSON.parse(readFileSync(fileURLToPath(new URL('../../public/assets/maps/zoo.tmj', import.meta.url)), 'utf8')) as TiledMap;

  it('van por la ruta de la cuidadora hasta la puerta de la tienda, cada 2 casillas, alternando lados', () => {
    const grid = buildWalkGrid(map);
    const door = readShop(map)!.door;
    const path = findPath(grid, readSpawn(map), door)!;
    expect(path).not.toBeNull();
    const steps = pawSteps(path);
    const onPath = new Set(path.map((p) => `${p.x},${p.y}`));
    for (const s of steps) expect(onPath.has(`${s.tile.x},${s.tile.y}`)).toBe(true);
    expect(steps.at(-1)!.tile).toEqual(door);
    expect(steps[0]!.tile).not.toEqual(path[0]);
    expect(steps.length).toBeGreaterThanOrEqual(Math.floor((path.length - 1) / 2));
    for (let i = 1; i < steps.length; i++) expect(steps[i]!.side).toBe(-steps[i - 1]!.side);
  });

  it('miran hacia donde se anda', () => {
    const path = [{ x: 0, y: 5 }, { x: 0, y: 4 }, { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 }];
    expect(pawSteps(path).map((s) => s.facing)).toEqual(['up', 'right']);
    expect(pawSteps([{ x: 0, y: 0 }])).toEqual([]);
  });

  it('girar la huella de 90 en 90 no pierde píxeles', () => {
    const count = (rows: readonly string[]) => rows.join('').replace(/\./g, '').length;
    for (const f of ['up', 'right', 'down', 'left'] as const) expect(count(pawRows(PAW, f))).toBe(count(PAW));
    expect(rotateRows(rotateRows(rotateRows(rotateRows(PAW))))).toEqual([...PAW]);
    expect(pawRows(PAW, 'down')[0]).toBe([...PAW[PAW.length - 1]!].reverse().join(''));
  });
});

describe('carteles con medallón', () => {
  /** Dibujo de prueba: un rectángulo opaco de w x h dentro de un lienzo de `size`. */
  const block = (size: number, w: number, h: number, x0 = 0, y0 = 0): Pixels => {
    const data = new Uint8ClampedArray(size * size * 4);
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) data.set([200, 100, 50, 255], (y * size + x) * 4);
    return { width: size, height: size, data };
  };

  it('el animal pequeño va entero y a tamaño real', () => {
    const src = block(16, 12, 14, 2, 1);
    expect(opaqueBounds(src)).toEqual({ x: 2, y: 1, width: 12, height: 14 });
    const out = medallionAnimal(src, MEDALLION.inner);
    expect([out.width, out.height]).toEqual([12, 14]);
  });

  it('los grandes se reducen a escala entera y lo que sobra se recorta: nunca más grande que el hueco', () => {
    expect(shrinkFactor(22, 22, 18)).toBe(1);
    expect(shrinkFactor(40, 44, 18)).toBe(2);
    for (const [size, w, h] of [[24, 24, 24], [32, 30, 26], [48, 46, 44]] as const) {
      const out = medallionAnimal(block(size, w, h), MEDALLION.inner);
      expect(out.width).toBeLessThanOrEqual(MEDALLION.inner);
      expect(out.height).toBeLessThanOrEqual(MEDALLION.inner);
      expect(out.width).toBeGreaterThan(0);
    }
  });

  it('al recortar se queda la parte de arriba (la cabeza)', () => {
    // Columna roja arriba y azul abajo, 22 de alto (no hace falta reducirla): sobran 4 por abajo.
    const size = 24;
    const data = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < 22; y++) for (let x = 8; x < 16; x++) data.set(y < 12 ? [255, 0, 0, 255] : [0, 0, 255, 255], (y * size + x) * 4);
    const out = medallionAnimal({ width: size, height: size, data }, 18);
    expect(out.height).toBe(18);
    expect([...out.data.slice(0, 4)]).toEqual([255, 0, 0, 255]);
    expect([...out.data.slice(-4)]).toEqual([0, 0, 255, 255]);
  });

  it('el círculo', () => {
    expect(inCircle(12, 12, 24)).toBe(true);
    expect(inCircle(0, 0, 24)).toBe(false);
  });
});
