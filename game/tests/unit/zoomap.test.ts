import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { approachTile } from '../../src/core/interaction';
import { findPath, isWalkable } from '../../src/core/pathfinding';
import { buildWalkGrid, isShopDoor, readEnclosures, readGates, readProps, readShop, readSpawn, type TiledMap } from '../../src/core/tiledmap';
import { ANIMAL_IDS } from '../../src/data/animals';

const url = new URL('../../public/assets/maps/zoo.tmj', import.meta.url);
const map = JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as TiledMap;
const grid = buildWalkGrid(map);
const spawn = readSpawn(map);

describe('mapa del zoo', () => {
  it('mide 48×35 y el inicio es transitable', () => {
    expect([grid.width, grid.height]).toEqual([48, 35]);
    expect(isWalkable(grid, spawn.x, spawn.y)).toBe(true);
  });

  it('cada animal tiene recinto y puerta, y se llega andando a la puerta', () => {
    const enclosures = readEnclosures(map);
    const gates = readGates(map);
    for (const id of ANIMAL_IDS) {
      const enclosure = enclosures.find((e) => e.animalId === id);
      const gate = gates.find((g) => g.animalId === id);
      expect(enclosure, id).toBeDefined();
      expect(gate, id).toBeDefined();
      const approach = approachTile(gate!.tile, enclosure!, 16, grid);
      expect(approach, `acceso a ${id}`).not.toBeNull();
      expect(findPath(grid, spawn, approach!), `camino a ${id}`).not.toBeNull();
    }
  });

  it('la puerta de la tienda es alcanzable', () => {
    const shop = readShop(map);
    expect(shop).not.toBeNull();
    expect(findPath(grid, spawn, shop!.door)).not.toBeNull();
  });

  it('la puerta de la tienda ocupa las 2 casillas del camino: cualquiera abre', () => {
    const shop = readShop(map)!;
    expect(shop.doorWidth).toBe(2);
    const right = { x: shop.door.x + 1, y: shop.door.y };
    expect(isWalkable(grid, right.x, right.y)).toBe(true);
    expect(isShopDoor(shop, shop.door)).toBe(true);
    expect(isShopDoor(shop, right)).toBe(true);
    expect(isShopDoor(shop, { x: shop.door.x + 2, y: shop.door.y })).toBe(false);
    expect(isShopDoor(shop, { x: shop.door.x, y: shop.door.y + 1 })).toBe(false);
  });

  it('no hay caminos de 1 casilla de ancho (el autotiler necesita 2)', () => {
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (!isWalkable(grid, x, y)) continue;
        const thinH = !isWalkable(grid, x, y - 1) && !isWalkable(grid, x, y + 1);
        const thinV = !isWalkable(grid, x - 1, y) && !isWalkable(grid, x + 1, y);
        expect(thinH, `(${x},${y}) fila de 1 de alto`).toBe(false);
        expect(thinV, `(${x},${y}) columna de 1 de ancho`).toBe(false);
      }
    }
  });

  it('cada recinto tiene bioma', () => {
    expect(readEnclosures(map).map((e) => e.biome).sort()).toEqual(['alpine', 'bamboo', 'rainforest', 'savannah']);
  });

  it('lo que bloquea deja al menos el 40 % del interior libre (la catarata de la pantera ocupa mucho)', () => {
    const props = readProps(map);
    for (const e of readEnclosures(map)) {
      const inner = { x: e.x + 16, y: e.y + 16, width: e.width - 32, height: e.height - 32 };
      const blocked = props
        .filter((p) => p.block && p.x > inner.x && p.x < inner.x + inner.width && p.y > inner.y && p.y <= inner.y + inner.height)
        .reduce((sum, p) => sum + p.block!.width * p.block!.height, 0);
      expect(blocked, e.animalId).toBeLessThanOrEqual(inner.width * inner.height * 0.6);
    }
  });

  it('dentro de un recinto, toda pieza con volumen bloquea salvo hierba y flores', () => {
    const walkable = /^(grass-tall-dry|flowers)/;
    const props = readProps(map);
    for (const e of readEnclosures(map)) {
      const inner = { x: e.x + 16, y: e.y + 16, width: e.width - 32, height: e.height - 32 };
      const inside = props.filter((p) => p.x > inner.x && p.x < inner.x + inner.width && p.y > inner.y && p.y <= inner.y + inner.height);
      for (const p of inside) {
        if (p.flat || walkable.test(p.prop)) continue;
        expect(p.block, `${p.prop} en ${e.animalId}`).not.toBeNull();
      }
    }
  });

  it('los props se apoyan siempre en césped, nunca en caminos', () => {
    for (const p of readProps(map)) {
      if (p.prop === 'park-gate') continue; // el portón de entrada está justo sobre el camino
      const tile = { x: Math.floor((p.x - 1) / 16), y: Math.floor((p.y - 1) / 16) };
      expect(isWalkable(grid, tile.x, tile.y), `${p.prop} en (${tile.x},${tile.y})`).toBe(false);
    }
  });

  it('hay decoración en los cuatro recintos y en el parque', () => {
    const names = new Set(readProps(map).map((p) => p.prop));
    for (const name of ['acacia', 'plateau', 'waterfall', 'bamboo-mid', 'bench', 'lamp', 'sign', 'fountain']) {
      expect(names.has(name), name).toBe(true);
    }
  });
});
