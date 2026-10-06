import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PEN_IDS } from '../../src/data/pens';
import { approachTile } from '../../src/core/interaction';
import { findPath, isWalkable } from '../../src/core/pathfinding';
import { buildWalkGrid, isShopDoor, readEnclosures, readGates, readProps, readShop, readSpawn, type TiledMap } from '../../src/core/tiledmap';

const url = new URL('../../public/assets/maps/zoo.tmj', import.meta.url);
const map = JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as TiledMap;
const grid = buildWalkGrid(map);
const spawn = readSpawn(map);
const config = JSON.parse(readFileSync(fileURLToPath(new URL('../../art/art.config.json', import.meta.url)), 'utf8')) as {
  props: Record<string, unknown>;
};
/** Recintos que tiene que haber en el mapa. */
const MAP_PENS = [
  'leon', 'cabra', 'pantera', 'panda',
  'sabana', 'elefantes-africanos', 'elefantes-asiaticos', 'pinguinos', 'ovejas', 'estanque', 'establo',
];
const enclosure = (id: string) => readEnclosures(map).find((e) => e.penId === id)!;

describe('mapa del zoo', () => {
  it('mide 96×60 y el inicio es transitable', () => {
    expect([grid.width, grid.height]).toEqual([96, 60]);
    expect(isWalkable(grid, spawn.x, spawn.y)).toBe(true);
  });

  it('la cuidadora empieza en el camino, a pocas casillas por encima del portón de entrada', () => {
    const gate = readProps(map).find((p) => p.prop === 'park-gate')!;
    const gateInfo = config.props['park-gate'] as { h: number };
    const gateTop = (gate.y - gateInfo.h) / 16; // borde de arriba del portón, en casillas
    const above = gateTop - (spawn.y + 0.5);
    expect(isWalkable(grid, spawn.x, spawn.y)).toBe(true);
    expect(above).toBeGreaterThan(0);
    expect(above).toBeLessThanOrEqual(4);
  });

  it('cada recinto tiene valla y puerta, y se llega andando a la puerta', () => {
    const enclosures = readEnclosures(map);
    const gates = readGates(map);
    expect(enclosures.map((e) => e.penId).sort()).toEqual([...MAP_PENS].sort());
    for (const id of MAP_PENS) {
      const gate = gates.find((g) => g.penId === id);
      expect(gate, id).toBeDefined();
      const approach = approachTile(gate!.tile, enclosure(id), 16, grid);
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

  it('los recintos del mapa son los del juego', () => {
    expect([...MAP_PENS].sort()).toEqual([...PEN_IDS].sort());
  });

  it('cada recinto tiene bioma', () => {
    const biome = (id: string) => enclosure(id).biome;
    expect(MAP_PENS.map(biome)).toEqual([
      'savannah', 'alpine', 'rainforest', 'bamboo',
      'savannah', 'savannah', 'savannah', 'tundra', 'grassland', 'grassland', 'grassland',
    ]);
  });

  it('lo que bloquea deja al menos el 40 % del interior libre (la catarata de la pantera ocupa mucho)', () => {
    const props = readProps(map);
    for (const e of readEnclosures(map)) {
      const inner = { x: e.x + 16, y: e.y + 16, width: e.width - 32, height: e.height - 32 };
      const blocked = props
        .filter((p) => p.block && p.x > inner.x && p.x < inner.x + inner.width && p.y > inner.y && p.y <= inner.y + inner.height)
        .reduce((sum, p) => sum + p.block!.width * p.block!.height, 0);
      expect(blocked, e.penId).toBeLessThanOrEqual(inner.width * inner.height * 0.6);
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
        expect(p.block, `${p.prop} en ${e.penId}`).not.toBeNull();
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

  it('hay decoración en los recintos de siempre, en los nuevos y en el parque', () => {
    const names = new Set(readProps(map).map((p) => p.prop));
    for (const name of ['acacia', 'plateau', 'waterfall', 'bamboo-mid', 'bench', 'lamp', 'sign', 'fountain', 'pond-tundra', 'lake-grassland', 'sunflowers']) {
      expect(names.has(name), name).toBe(true);
    }
  });

  it('el parque de siempre queda en el centro, sin cambios', () => {
    expect(enclosure('leon')).toMatchObject({ x: (9 + 24) * 16, y: (5 + 20) * 16, width: 12 * 16, height: 8 * 16 });
    expect(enclosure('pantera')).toMatchObject({ x: (6 + 24) * 16, y: (19 + 20) * 16, width: 15 * 16, height: 10 * 16 });
    expect(readShop(map)).toMatchObject({ x: (25 + 24) * 16, y: (4 + 20) * 16, door: { x: 27 + 24, y: 9 + 20 } });
    expect(spawn.x).toBe(47);
  });

  it('la sabana es el recinto grande y los elefantes van en dos jaulas con un pasillo de césped', () => {
    expect(enclosure('sabana')).toMatchObject({ width: 22 * 16, height: 12 * 16 });
    const african = enclosure('elefantes-africanos');
    const asian = enclosure('elefantes-asiaticos');
    expect(asian.x - (african.x + african.width)).toBe(2 * 16);
    for (const x of [64, 65]) for (let y = 5; y <= 14; y++) expect(isWalkable(grid, x, y), `(${x},${y})`).toBe(false);
  });

  it('el estanque tiene un lago de 6×6 casillas y deja orilla para pasear', () => {
    const pen = enclosure('estanque');
    const lake = readProps(map).find((p) => p.prop === 'lake-grassland')!;
    expect(lake.block).toMatchObject({ width: 96, height: 96 });
    // Dentro de la valla, con una casilla de césped por arriba y a los lados y cuatro filas de orilla abajo.
    expect(lake.block!.x - pen.x).toBe(2 * 16);
    expect(lake.block!.y - pen.y).toBe(2 * 16);
    expect(pen.y + pen.height - 16 - (lake.block!.y + 96)).toBe(4 * 16);
  });

  it('cada zona nueva tiene su cartel a la entrada', () => {
    const zones = readProps(map).flatMap((p) => (p.zone ? [p.zone] : []));
    expect(zones.sort()).toEqual(['granja', 'polo', 'sabana']);
  });

  it('toda pieza del mapa y todo suelo de bioma están en art.config.json', () => {
    for (const p of readProps(map)) expect(config.props[p.prop], p.prop).toBeDefined();
    for (const e of readEnclosures(map)) expect(config.props[`ground-${e.biome}`], `suelo de ${e.penId}`).toBeDefined();
  });
});
