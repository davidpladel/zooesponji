import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findPath, isWalkable } from '../../src/core/pathfinding';
import {
  buildWalkGrid,
  readDecor,
  readProps,
  readEnclosures,
  readGates,
  readShop,
  readSpawn,
  type TiledMap,
} from '../../src/core/tiledmap';

function loadTestMap(): TiledMap {
  const url = new URL('../../public/assets/maps/test-map.tmj', import.meta.url);
  return JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as TiledMap;
}

function tinyMap(data: number[], objects: TiledMap['layers'][number][] = []): TiledMap {
  return {
    width: 3,
    height: 1,
    tilewidth: 16,
    tileheight: 16,
    tilesets: [
      { firstgid: 1, name: 'ts', tilecount: 2, tiles: [{ id: 1, properties: [{ name: 'walkable', type: 'bool', value: true }] }] },
    ],
    layers: [{ type: 'tilelayer', name: 'suelo', width: 3, height: 1, data }, ...objects],
  };
}

describe('buildWalkGrid', () => {
  it('transitable = tile con walkable: true', () => {
    const grid = buildWalkGrid(tinyMap([1, 2, 0]));
    expect([0, 1, 2].map((x) => isWalkable(grid, x, 0))).toEqual([false, true, false]);
  });

  it('ignora los bits de volteo de Tiled en el gid', () => {
    const flippedH = (2 | 0x80000000) >>> 0;
    const grid = buildWalkGrid(tinyMap([flippedH, 1, 1]));
    expect(isWalkable(grid, 0, 0)).toBe(true);
  });

  it('lanza error si falta la capa "suelo"', () => {
    const map = { ...tinyMap([1, 1, 1]), layers: [] };
    expect(() => buildWalkGrid(map)).toThrow(/suelo/);
  });
});

describe('readSpawn', () => {
  it('lanza error si falta el punto "inicio"', () => {
    expect(() => readSpawn(tinyMap([1, 1, 1]))).toThrow(/inicio/);
  });

  it('readProps lee apoyo, bloqueo y capa plana', () => {
    const map = tinyMap([1, 1, 1], [
      {
        type: 'objectgroup',
        name: 'objetos',
        objects: [
          {
            id: 1, name: 'p', type: 'prop', x: 40, y: 64, width: 0, height: 0,
            properties: [
              { name: 'prop', type: 'string', value: 'pond' },
              { name: 'blocks', type: 'bool', value: true },
              { name: 'flat', type: 'bool', value: true },
              { name: 'z', type: 'int', value: 1 },
              { name: 'blockW', type: 'int', value: 32 },
              { name: 'blockH', type: 'int', value: 16 },
            ],
          },
        ],
      },
    ]);
    expect(readProps(map)).toEqual([
      { prop: 'pond', x: 40, y: 64, flat: true, z: 1, block: { x: 24, y: 48, width: 32, height: 16 }, zone: null },
    ]);
  });

  it('readDecor devuelve lista vacía si no hay decoración', () => {
    expect(readDecor(tinyMap([1, 1, 1]))).toEqual([]);
  });

  it('readShop devuelve null si el mapa no tiene tienda', () => {
    expect(readShop(tinyMap([1, 1, 1]))).toBeNull();
  });
});

describe('mapa de prueba', () => {
  const map = loadTestMap();
  const grid = buildWalkGrid(map);

  it('mide 40×30', () => {
    expect([grid.width, grid.height]).toEqual([40, 30]);
  });

  it('el inicio está sobre un camino', () => {
    const spawn = readSpawn(map);
    expect(spawn).toEqual({ x: 19, y: 15 });
    expect(isWalkable(grid, spawn.x, spawn.y)).toBe(true);
  });

  it('el mapa de prueba tiene exactamente un recinto y una puerta por cada uno de sus 4 recintos', () => {
    const expected = ['cabra', 'leon', 'panda', 'pantera'];
    expect(readEnclosures(map).map((e) => e.penId).sort()).toEqual(expected);
    expect(readGates(map).map((g) => g.penId).sort()).toEqual(expected);
  });

  it('se puede llegar andando desde el inicio a todas las puertas', () => {
    const spawn = readSpawn(map);
    for (const gate of readGates(map)) {
      expect(findPath(grid, spawn, gate.tile), `puerta de ${gate.penId}`).not.toBeNull();
    }
  });

  it('los recintos están en píxeles', () => {
    const leon = readEnclosures(map).find((e) => e.penId === 'leon');
    expect(leon).toEqual({ penId: 'leon', biome: null, x: 80, y: 80, width: 176, height: 112 });
  });

  it('tiene tienda con puerta alcanzable desde el inicio', () => {
    const shop = readShop(map);
    expect(shop).toEqual({ x: 256, y: 80, width: 48, height: 48, door: { x: 18, y: 6 }, doorWidth: 1 });
    expect(isWalkable(grid, 18, 6)).toBe(true);
    expect(isWalkable(grid, 17, 6)).toBe(false);
    expect(findPath(grid, readSpawn(map), shop!.door)).not.toBeNull();
  });
});

describe('readProps: carteles de zona', () => {
  const withProp = (properties: { name: string; type: string; value: unknown }[]): TiledMap => ({
    width: 1, height: 1, tilewidth: 16, tileheight: 16, tilesets: [],
    layers: [{ type: 'objectgroup', name: 'objetos', objects: [{ id: 1, name: 'p', type: 'prop', x: 8, y: 16, width: 0, height: 0, properties }] }],
  });

  it('lee la zona del cartel', () => {
    const map = withProp([{ name: 'prop', type: 'string', value: 'sign-zone' }, { name: 'zone', type: 'string', value: 'polo' }]);
    expect(readProps(map)[0]).toMatchObject({ prop: 'sign-zone', zone: 'polo' });
  });

  it('sin zona, null', () => {
    expect(readProps(withProp([{ name: 'prop', type: 'string', value: 'tree' }]))[0]!.zone).toBeNull();
  });
});
