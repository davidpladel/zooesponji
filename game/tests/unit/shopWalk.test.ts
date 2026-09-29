import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findPath, isWalkable } from '../../src/core/pathfinding';
import { worldToTile } from '../../src/core/movement';
import {
  ENTRY_TARGET,
  approachPoint,
  hintTarget,
  onDoorMat,
  openInteriorGrid,
  productInReach,
  shopWalkGrid,
} from '../../src/core/shopWalk';
import { pedestalFor } from '../../src/core/interiorLayout';
import { buildWalkGrid, readInteriorSpots, type TiledMap } from '../../src/core/tiledmap';
import { gridFromAscii } from './helpers';

function loadShopMap(): TiledMap {
  const url = new URL('../../public/assets/maps/tienda.tmj', import.meta.url);
  return JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as TiledMap;
}

describe('shopWalkGrid', () => {
  it('bloquea las casillas que ocupa cada peana sin tocar la cuadrícula original', () => {
    const base = gridFromAscii(['.....', '.....', '.....', '.....']);
    const grid = shopWalkGrid(base, [{ x: 40, y: 36 }]);
    // Peana de 26x10 px centrada en x=40, de y=34 a y=44: casillas x 1..3, fila 2.
    expect(isWalkable(grid, 1, 2)).toBe(false);
    expect(isWalkable(grid, 2, 2)).toBe(false);
    expect(isWalkable(grid, 3, 2)).toBe(false);
    expect(isWalkable(grid, 2, 1)).toBe(true);
    expect(isWalkable(grid, 2, 3)).toBe(true);
    expect(isWalkable(base, 2, 2)).toBe(true);
  });
});

describe('productInReach', () => {
  const bases = [
    { x: 100, y: 100 },
    { x: 140, y: 100 },
  ];
  it('devuelve la peana más cercana dentro del alcance', () => {
    expect(productInReach({ x: 135, y: 118 }, bases)).toBe(1);
    expect(productInReach({ x: 104, y: 118 }, bases)).toBe(0);
  });
  it('null si ninguna está a mano', () => {
    expect(productInReach({ x: 120, y: 160 }, bases)).toBeNull();
    expect(productInReach({ x: 120, y: 160 }, [])).toBeNull();
  });
});

describe('approachPoint', () => {
  it('prefiere la casilla de debajo de la peana', () => {
    const grid = gridFromAscii(['.....', '.....', '..#..', '.....', '.....']);
    expect(approachPoint(grid, { x: 40, y: 38 })).toEqual({ x: 40, y: 56 });
  });
  it('si debajo no se puede, busca la más cercana transitable', () => {
    const grid = gridFromAscii(['.....', '.....', '..#..', '#####', '#####']);
    const p = approachPoint(grid, { x: 40, y: 38 });
    expect(p).not.toBeNull();
    expect(isWalkable(grid, Math.floor(p!.x / 16), Math.floor(p!.y / 16))).toBe(true);
  });
  it('null si no hay ninguna casilla transitable', () => {
    expect(approachPoint(gridFromAscii(['##', '##']), { x: 8, y: 8 })).toBeNull();
  });
});

describe('hintTarget', () => {
  const entries = [
    { id: 'a', status: 'owned', cost: 5 },
    { id: 'b', status: 'buy', cost: 40 },
    { id: 'c', status: 'buy', cost: 20 },
    { id: 'd', status: 'full', cost: 1 },
  ];
  it('el más barato que se puede comprar', () => {
    expect(hintTarget(entries, 50)).toBe('c');
  });
  it('la puerta si no llega para ninguno', () => {
    expect(hintTarget(entries, 10)).toBe('door');
  });
});

describe('onDoorMat', () => {
  const door = { x: 192, y: 186 };
  it('sí encima del felpudo', () => {
    expect(onDoorMat({ x: 192, y: 184 }, door)).toBe(true);
    expect(onDoorMat({ x: 180, y: 190 }, door)).toBe(true);
  });
  it('no delante de la alfombra ni a un lado', () => {
    expect(onDoorMat(ENTRY_TARGET, door)).toBe(false);
    expect(onDoorMat({ x: 150, y: 184 }, door)).toBe(false);
  });
});

describe('openInteriorGrid', () => {
  it('20x12 con las 4 filas de pared bloqueadas', () => {
    const grid = openInteriorGrid();
    expect([grid.width, grid.height]).toEqual([20, 12]);
    expect(isWalkable(grid, 5, 3)).toBe(false);
    expect(isWalkable(grid, 5, 4)).toBe(true);
  });
});

describe('tienda.tmj en la fase B', () => {
  const map = loadShopMap();
  const spots = readInteriorSpots(map)!;
  const grid = shopWalkGrid(buildWalkGrid(map), spots.pedestals);

  it('las plantas de las esquinas no se pisan', () => {
    expect(isWalkable(grid, 0, 11)).toBe(false);
    expect(isWalkable(grid, 19, 11)).toBe(false);
  });

  it('el paseo de entrada acaba en suelo libre', () => {
    const t = worldToTile(ENTRY_TARGET, 16);
    expect(isWalkable(grid, t.x, t.y)).toBe(true);
  });

  it('con 1 a 5 productos, desde la puerta se llega a cada uno y queda a mano (y es el más cercano)', () => {
    for (let count = 1; count <= 5; count++) {
      const bases = Array.from({ length: count }, (_v, i) => pedestalFor(spots, i, count));
      const g = shopWalkGrid(buildWalkGrid(map), bases);
      bases.forEach((base, index) => {
        const p = approachPoint(g, base);
        expect(p, `${count} productos, nº ${index}`).not.toBeNull();
        expect(findPath(g, spots.doorTile, worldToTile(p!, 16))).not.toBeNull();
        expect(productInReach(p!, bases), `${count} productos, nº ${index}`).toBe(index);
      });
    }
  });
});
