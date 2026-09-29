import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findPath } from '../../src/core/pathfinding';
import { buildWalkGrid, readInteriorSpots, wallRows, type TiledMap } from '../../src/core/tiledmap';

function loadShopMap(): TiledMap {
  const url = new URL('../../public/assets/maps/tienda.tmj', import.meta.url);
  return JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as TiledMap;
}

describe('tienda.tmj', () => {
  const map = loadShopMap();
  const spots = readInteriorSpots(map)!;

  it('mide 20x12 con 4 filas de pared', () => {
    expect([map.width, map.height]).toEqual([20, 12]);
    expect(wallRows(map)).toBe(4);
  });

  it('tiene tendero, puerta y 5 peanas ordenadas de izquierda a derecha', () => {
    expect(spots).not.toBeNull();
    expect(spots.pedestals).toHaveLength(5);
    const xs = spots.pedestals.map((p) => p.x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
  });

  it('se puede andar de la puerta al frente del mostrador (fase B)', () => {
    const grid = buildWalkGrid(map);
    expect(findPath(grid, spots.doorTile, { x: 3, y: 7 })).not.toBeNull();
  });

  it('las decos llevan pieza y la alfombra va plana en el suelo', () => {
    expect(spots.decos.length).toBeGreaterThan(10);
    expect(spots.decos.every((d) => d.piece.length > 0)).toBe(true);
    expect(spots.decos.find((d) => d.piece === 'rug')?.flat).toBe(true);
  });
});

describe('readInteriorSpots', () => {
  it('devuelve null sin tendero', () => {
    const map: TiledMap = { width: 1, height: 1, tilewidth: 16, tileheight: 16, tilesets: [], layers: [] };
    expect(readInteriorSpots(map)).toBeNull();
  });
});
