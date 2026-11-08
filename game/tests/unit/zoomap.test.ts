import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PEN_IDS } from '../../src/data/pens';
import { approachTile } from '../../src/core/interaction';
import { findPath, isWalkable } from '../../src/core/pathfinding';
import { buildWalkGrid, isShopDoor, readEnclosures, readBoard, readGates, readProps, readShop, readSpawn, readWater, withSolidProps, type TiledMap } from '../../src/core/tiledmap';
import { penSpace } from '../../src/core/flock';
import { rectContains } from '../../src/core/interaction';
import { withPenInteriors } from '../../src/core/penGrid';
import { solidOverPath } from '../../src/core/mapCheck';

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

/** Casillas a las que se llega andando desde `from` (claves "x,y"). */
function reachable(g: typeof grid, from: { x: number; y: number }): Set<string> {
  const seen = new Set([`${from.x},${from.y}`]);
  const queue = [from];
  while (queue.length > 0) {
    const p = queue.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const n = { x: p.x + dx, y: p.y + dy };
      const key = `${n.x},${n.y}`;
      if (seen.has(key) || !isWalkable(g, n.x, n.y)) continue;
      seen.add(key);
      queue.push(n);
    }
  }
  return seen;
}

const W = grid.width;
const H = grid.height;
/** Isla de la fuente, en casillas (su `block` coincide con la isla). */
const island = (() => {
  const b = readProps(map).find((p) => p.prop === 'fountain')!.block!;
  return { x0: b.x / 16, y0: b.y / 16, x1: (b.x + b.width) / 16 - 1, y1: (b.y + b.height) / 16 - 1 };
})();
/** Avenida de arriba: la primera fila de camino del borde izquierdo. */
const northRow = (() => {
  for (let y = 0; y < H; y++) if (isWalkable(grid, 3, y)) return y;
  return -1;
})();
/** Fila de abajo del anillo del parque (y del atajo de abajo), justo encima de la entrada. */
const ringBottom = spawn.y - 2;
/** Patas de la U: las columnas de camino entre la sabana y los elefantes. */
const uLegs = (() => {
  const sab = enclosure('sabana');
  const afr = enclosure('elefantes-africanos');
  const legs: number[] = [];
  for (let x = (sab.x + sab.width) / 16; x < afr.x / 16; x++) if (isWalkable(grid, x, 10)) legs.push(x);
  return legs;
})();
const ATAJOS: [string, number, number][] = [
  ['izquierda', 8, northRow], ['izquierda', 3, 25], ['izquierda', 3, ringBottom - 10], ['izquierda', 15, ringBottom],
  ['U', uLegs[0] ?? -1, 10], ['U', uLegs[uLegs.length - 1] ?? -1, 10],
  ['derecha', W - 10, northRow], ['derecha', W - 4, 25], ['derecha', W - 4, ringBottom - 10], ['derecha', W - 16, ringBottom],
];

describe('mapa del zoo', () => {
  it('es más grande que el de 96×60 y el inicio es transitable', () => {
    expect(grid.width).toBeGreaterThan(96);
    expect(grid.height).toBeGreaterThan(60);
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

  it('la puerta de la tienda está bajo la puerta del dibujo (casilla 4 de 5), no bajo el mostrador', () => {
    const shop = readShop(map)!;
    const left = shop.x / 16;
    expect(shop.door.x).toBe(left + 3);
    expect(shop.door.y).toBe((shop.y + shop.height) / 16);
    // Lo que queda bajo el mostrador (casillas 2 y 3) ya no es camino.
    expect(isWalkable(grid, left + 1, shop.door.y)).toBe(false);
    expect(isWalkable(grid, left + 2, shop.door.y)).toBe(false);
    // Y su camino baja derecho hasta la plaza: desde la casilla de debajo de la puerta se llega al inicio.
    expect(findPath(grid, { x: shop.door.x, y: shop.door.y + 1 }, spawn)).not.toBeNull();
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

  it('dentro de un recinto, toda pieza con volumen bloquea salvo lo que se pisa', () => {
    const props = readProps(map);
    for (const e of readEnclosures(map)) {
      const inner = { x: e.x + 16, y: e.y + 16, width: e.width - 32, height: e.height - 32 };
      const inside = props.filter((p) => p.x > inner.x && p.x < inner.x + inner.width && p.y > inner.y && p.y <= inner.y + inner.height);
      for (const p of inside) {
        if (p.flat || p.walk) continue;
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

  it('la tienda sigue pegada a las cabras y la entrada queda debajo de la fuente', () => {
    const shop = readShop(map)!;
    expect(shop.x + shop.width).toBe(enclosure('cabra').x);
    expect(spawn.x).toBeGreaterThanOrEqual(island.x0);
    expect(spawn.x).toBeLessThanOrEqual(island.x1);
  });

  it('la sabana es el recinto grande y los elefantes van en dos jaulas con un pasillo de césped', () => {
    expect(enclosure('sabana')).toMatchObject({ width: 22 * 16, height: 12 * 16 });
    const african = enclosure('elefantes-africanos');
    const asian = enclosure('elefantes-asiaticos');
    expect(asian.x - (african.x + african.width)).toBe(2 * 16);
    const gap = (african.x + african.width) / 16;
    for (const x of [gap, gap + 1])
      for (let y = african.y / 16; y < (african.y + african.height) / 16; y++) expect(isWalkable(grid, x, y), `(${x},${y})`).toBe(false);
  });

  it('el estanque tiene un lago de 6×6 casillas y deja orilla para pasear', () => {
    const pen = enclosure('estanque');
    const lake = readWater(map).find((w) => w.x >= pen.x && w.x < pen.x + pen.width && w.y >= pen.y && w.y < pen.y + pen.height)!;
    expect(lake).toMatchObject({ width: 96, height: 96 });
    // Dentro de la valla, con una casilla de césped por arriba y a los lados y cuatro filas de orilla abajo.
    expect(lake.x - pen.x).toBe(2 * 16);
    expect(lake.y - pen.y).toBe(2 * 16);
    expect(pen.y + pen.height - 16 - (lake.y + 96)).toBe(4 * 16);
  });

  it('cada zona nueva tiene su cartel a la entrada', () => {
    const zones = readProps(map).flatMap((p) => (p.zone ? [p.zone] : []));
    expect(zones.sort()).toEqual(['granja', 'polo', 'sabana']);
  });

  it('toda pieza del mapa y todo suelo de bioma están en art.config.json', () => {
    for (const p of readProps(map)) expect(config.props[p.prop], p.prop).toBeDefined();
    for (const e of readEnclosures(map)) expect(config.props[`ground-${e.biome}`], `suelo de ${e.penId}`).toBeDefined();
  });

  it('la cuidadora no pisa la fuente, pero puede rodearla por la plaza', () => {
    const fountain = readProps(map).find((p) => p.prop === 'fountain')!;
    const solid = withSolidProps(grid, readProps(map), 16);
    const { x, y, width, height } = fountain.block!;
    for (let ty = Math.floor(y / 16); ty <= Math.floor((y + height - 1) / 16); ty++)
      for (let tx = Math.floor(x / 16); tx <= Math.floor((x + width - 1) / 16); tx++) expect(isWalkable(solid, tx, ty)).toBe(false);
    const left = { x: Math.floor(x / 16) - 1, y: Math.floor(y / 16) };
    const right = { x: Math.floor((x + width - 1) / 16) + 1, y: left.y };
    expect(findPath(solid, left, right)).not.toBeNull();
  });

  it('el tablón está junto a la plaza y su casilla se pisa', () => {
    const board = readBoard(map);
    expect(board).not.toBeNull();
    expect(isWalkable(grid, board!.tile.x, board!.tile.y)).toBe(true);
    expect(isWalkable(grid, board!.standTile.x, board!.standTile.y)).toBe(false);
  });

  it('están los atajos del plano de David', () => {
    for (const [name, x, y] of ATAJOS) expect(isWalkable(grid, x, y), `${name} (${x},${y})`).toBe(true);
  });

  it('los atajos acortan de verdad', () => {
    // Antes había que bajar al centro y volver a subir: con los atajos se va casi en línea recta.
    const sideRow = readGates(map).find((g) => g.penId === 'pinguinos')!.tile.y + 2;
    const near = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      expect(findPath(grid, a, b)!.length, `${a.x},${a.y} → ${b.x},${b.y}`).toBeLessThanOrEqual(Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + 8);
    expect(isWalkable(grid, 5, sideRow), 'avenida del polo').toBe(true);
    expect(isWalkable(grid, W - 5, sideRow), 'avenida de la granja').toBe(true);
    near({ x: 12, y: northRow }, { x: 5, y: sideRow });
    near({ x: W - 17, y: northRow }, { x: W - 5, y: sideRow });
    near({ x: 5, y: sideRow + 1 }, spawn);
  });

  it('se llega andando a cualquier casilla de camino desde la entrada (nadie se queda atascado)', () => {
    const solid = withSolidProps(grid, readProps(map), 16);
    const seen = reachable(solid, spawn);
    const lost: string[] = [];
    for (let y = 0; y < solid.height; y++)
      for (let x = 0; x < solid.width; x++) if (isWalkable(solid, x, y) && !seen.has(`${x},${y}`)) lost.push(`(${x},${y})`);
    expect(lost).toEqual([]);
  });

  it('dentro de la U hay un jardín de cerezos y flores rosas que solo decora', () => {
    const flowers = readProps(map).filter((p) => {
      const tx = Math.floor((p.x - 1) / 16);
      const ty = Math.floor((p.y - 1) / 16);
      return tx > uLegs[0]! && tx < uLegs[uLegs.length - 1]! && ty >= 6 && ty < northRow;
    });
    expect(flowers.length).toBeGreaterThanOrEqual(8);
    for (const p of flowers) {
      expect(p.prop).toMatch(/^(cherry-tree|pink-star|pink-flowers)/);
      expect(p.block, p.prop).toBeNull();
      expect(p.solid, p.prop).toBe(false);
    }
  });

  it('ningún atajo entra en un recinto: solo la puerta abre la valla', () => {
    const gates = readGates(map);
    for (const e of readEnclosures(map)) {
      for (let ty = e.y / 16; ty < (e.y + e.height) / 16; ty++)
        for (let tx = e.x / 16; tx < (e.x + e.width) / 16; tx++) {
          const isGate = gates.some((g) => g.penId === e.penId && ty === g.tile.y && (tx === g.tile.x || tx === g.tile.x + 1));
          if (!isGate) expect(isWalkable(grid, tx, ty), `${e.penId} (${tx},${ty})`).toBe(false);
        }
    }
  });

  it('el agua del mapa es zona propia y ningún prop de agua bloquea por su cuenta', () => {
    const waters = readWater(map);
    expect(waters.length).toBeGreaterThanOrEqual(4); // estanque, pingüinos, pantera (cascada + poza)
    for (const p of readProps(map)) if (/^(lake|pond|waterfall)/.test(p.prop)) expect(p.block, p.prop).toBeNull();
  });

  it('en el risco de la pantera la roca se pisa y el agua no', () => {
    const e = enclosure('pantera');
    const space = penSpace(e, readProps(map), 16, readWater(map));
    const open = withPenInteriors(grid, [space], 16);
    // La catarata (7x7): acantilado de 2 casillas a cada lado, cascada (3 de ancho) y poza en medio.
    const fall = readWater(map)
      .filter((w) => w.x >= e.x && w.x < e.x + e.width && w.y >= e.y && w.y < e.y + e.height)
      .sort((a, b) => a.y - b.y);
    expect(fall).toHaveLength(2);
    const cx = fall[0]!.x / 16 + 1;
    const cy = fall[0]!.y / 16 + 2;
    expect(isWalkable(open, cx - 3, cy), 'roca del acantilado izquierdo').toBe(true);
    expect(isWalkable(open, cx + 2, cy - 1), 'roca del acantilado derecho').toBe(true);
    expect(isWalkable(open, cx, cy), 'cascada').toBe(false);
    expect(isWalkable(open, cx, fall[1]!.y / 16 + 1), 'poza').toBe(false);
  });

  it('regla de pisar: el agua y los árboles no, las rocas y las flores sí', () => {
    const NEVER_WALK = /^(acacia|pine|palm|jungle-tree|cherry-tree|tree|log|stump|bamboo|bush|pink-star|fountain)/;
    const ALWAYS_WALK = /^(grass|flowers|sunflowers|rock|plateau|cave|lilypad)/;
    const pens = readEnclosures(map);
    const insideSomePen = (p: { x: number; y: number }) => pens.some((e) => rectContains(e, { x: p.x, y: p.y - 1 }));
    for (const p of readProps(map)) {
      if (NEVER_WALK.test(p.prop) && insideSomePen(p)) expect(p.block, p.prop).not.toBeNull();
      if (ALWAYS_WALK.test(p.prop)) {
        expect(p.walk, p.prop).toBe(true);
        expect(p.block, p.prop).toBeNull();
      }
    }
  });

  it('la plaza deja 4 casillas de camino alrededor de la fuente', () => {
    const solid = withSolidProps(grid, readProps(map), 16);
    for (let x = island.x0; x <= island.x1; x++)
      for (let d = 1; d <= 4; d++) {
        expect(isWalkable(solid, x, island.y0 - d), `arriba (${x},${island.y0 - d})`).toBe(true);
        expect(isWalkable(solid, x, island.y1 + d), `abajo (${x},${island.y1 + d})`).toBe(true);
      }
    for (let y = island.y0; y <= island.y1; y++)
      for (let d = 1; d <= 4; d++) {
        expect(isWalkable(solid, island.x0 - d, y), `izquierda (${island.x0 - d},${y})`).toBe(true);
        expect(isWalkable(solid, island.x1 + d, y), `derecha (${island.x1 + d},${y})`).toBe(true);
      }
  });

  it('la isla de la fuente es del tamaño del dibujo (5x4) y es césped', () => {
    expect([island.x1 - island.x0 + 1, island.y1 - island.y0 + 1]).toEqual([5, 4]);
    for (let y = island.y0; y <= island.y1; y++) for (let x = island.x0; x <= island.x1; x++) expect(isWalkable(grid, x, y)).toBe(false);
  });

  it('la fuente no tapa camino', () => {
    expect(solidOverPath(map)).toEqual([]);
  });

  it('cada recinto mide al menos 14x9 por dentro y la sabana es el mayor', () => {
    const inner = (e: { width: number; height: number }) => (e.width / 16 - 2) * (e.height / 16 - 2);
    for (const e of readEnclosures(map)) {
      expect(e.width / 16 - 2, `${e.penId} ancho`).toBeGreaterThanOrEqual(14);
      expect(e.height / 16 - 2, `${e.penId} alto`).toBeGreaterThanOrEqual(9);
      if (e.penId !== 'sabana') expect(inner(e), e.penId).toBeLessThan(inner(enclosure('sabana')));
    }
  });

  it('los caminos que llegan a la plaza tienen 3 casillas de ancho', () => {
    /** Casillas de camino seguidas en la fila (o columna) `fixed`, empezando por la primera del tramo [from, to]. */
    const run = (horizontal: boolean, fixed: number, from: number, to: number): number => {
      const ok = (i: number) => (horizontal ? isWalkable(grid, i, fixed) : isWalkable(grid, fixed, i));
      let start = from;
      while (start <= to && !ok(start)) start++;
      if (start > to) return 0;
      let end = start;
      while (ok(end + 1)) end++;
      while (ok(start - 1)) start--;
      return end - start + 1;
    };
    expect(run(true, island.y0 - 7, island.x0, island.x1), 'arriba').toBe(3);
    expect(run(true, island.y1 + 7, island.x0, island.x1), 'abajo').toBe(3);
    expect(run(false, island.x0 - 7, island.y0, island.y1), 'izquierda').toBe(3);
    expect(run(false, island.x1 + 7, island.y0, island.y1), 'derecha').toBe(3);
  });

  it('cada puerta de recinto, la de la tienda y el tablón son camino alcanzable desde el inicio', () => {
    const solid = withSolidProps(grid, readProps(map), 16);
    const seen = reachable(solid, spawn);
    for (const g of readGates(map)) expect(seen.has(`${g.tile.x},${g.tile.y}`), `puerta de ${g.penId}`).toBe(true);
    const shop = readShop(map)!;
    expect(seen.has(`${shop.door.x},${shop.door.y}`), 'puerta de la tienda').toBe(true);
    const board = readBoard(map)!;
    expect(seen.has(`${board.tile.x},${board.tile.y}`), 'tablón').toBe(true);
  });

  it('hay farolas por todos los caminos, no solo en la plaza', () => {
    const lamps = readProps(map)
      .filter((p) => p.prop.startsWith('lamp'))
      .map((p) => ({ x: Math.floor((p.x - 1) / 16), y: Math.floor((p.y - 1) / 16) }));
    expect(lamps.length).toBeGreaterThan(20);
    const far: string[] = [];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (!isWalkable(grid, x, y)) continue;
        if (!lamps.some((l) => Math.max(Math.abs(l.x - x), Math.abs(l.y - y)) <= 8)) far.push(`(${x},${y})`);
      }
    expect(far, 'casillas de camino sin farola a 8 casillas').toEqual([]);
  });

  it('las farolas están junto al camino, fuera de los recintos', () => {
    const pens = readEnclosures(map);
    for (const p of readProps(map).filter((q) => q.prop === 'lamp')) {
      const tx = Math.floor((p.x - 1) / 16);
      const ty = Math.floor((p.y - 1) / 16);
      // Pegada al camino o, como las de la entrada (2026-11-08), a una casilla de él.
      const near: number[][] = [];
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) near.push([dx, dy]);
      const nextToPath = near.some(([dx, dy]) => isWalkable(grid, tx + dx!, ty + dy!));
      expect(nextToPath, `farola en (${tx},${ty})`).toBe(true);
      expect(pens.some((e) => rectContains(e, { x: p.x, y: p.y - 1 })), `farola en (${tx},${ty})`).toBe(false);
    }
  });

  it('el pie de cada farola cae entero en el césped, nunca en la tierra del camino', () => {
    // El dibujo mide 32 px y el poste está a la izquierda: su pie ocupa de x-14 a x-4 respecto al punto de apoyo.
    for (const p of readProps(map).filter((q) => q.prop === 'lamp')) {
      const ty = Math.floor((p.y - 1) / 16);
      for (const fx of [p.x - 14, p.x - 4]) {
        const tx = Math.floor(fx / 16);
        expect(isWalkable(grid, tx, ty), `pie de la farola de (${p.x},${p.y}) en la casilla (${tx},${ty})`).toBe(false);
      }
    }
  });

  it('el farol cuelga sobre el camino: volteada si el camino está a la izquierda', () => {
    const lamps = readProps(map).filter((q) => q.prop === 'lamp');
    // Entrada: en la fila de las farolas, el camino del portón es lo único andable a 2 casillas a un lado.
    const entrance = (tx: number, ty: number) =>
      !isWalkable(grid, tx - 1, ty) && !isWalkable(grid, tx + 1, ty) && isWalkable(grid, tx - 2, ty) !== isWalkable(grid, tx + 2, ty) && ty > 66;
    expect(lamps.filter((p) => entrance(Math.floor((p.x - 1) / 16), Math.floor((p.y - 1) / 16)))).toHaveLength(2);
    expect(lamps.some((p) => p.flip)).toBe(true);
    for (const p of lamps) {
      const tx = Math.floor((p.x - 1) / 16);
      const ty = Math.floor((p.y - 1) / 16);
      const pathLeft = isWalkable(grid, tx - 1, ty);
      const pathRight = isWalkable(grid, tx + 1, ty);
      // Las dos de la entrada (2026-11-08) van a una casilla del camino, mirándolo: la de la derecha, volteada.
      if (entrance(tx, ty)) expect(p.flip, `farola de la entrada en (${tx},${ty})`).toBe(isWalkable(grid, tx - 2, ty));
      else expect(p.flip, `farola en (${tx},${ty})`).toBe(pathLeft && !pathRight);
    }
  });

  it('ninguna farola se monta sobre una valla (mide 2x3 casillas desde su pie)', () => {
    const pens = readEnclosures(map);
    for (const p of readProps(map).filter((q) => q.prop === 'lamp')) {
      // Volteada, el brazo ocupa la casilla de la izquierda en vez de la de la derecha.
      const left = (p.x - 16) / 16 - (p.flip ? 1 : 0);
      const bottom = Math.floor((p.y - 1) / 16);
      for (let ty = bottom - 2; ty <= bottom; ty++)
        for (let tx = Math.floor(left); tx <= Math.floor(left) + 1; tx++) {
          const c = { x: tx * 16 + 8, y: ty * 16 + 8 };
          expect(pens.some((e) => rectContains(e, c)), `farola de (${p.x},${p.y}) sobre la valla en (${tx},${ty})`).toBe(false);
        }
    }
  });

  it('junto a un camino de arriba o de abajo: de frente si el camino va debajo, de espaldas si va encima', () => {
    const pens = readEnclosures(map);
    const fronts = readProps(map).filter((q) => q.prop === 'lamp-front' || q.prop === 'lamp-back');
    expect(fronts.filter((p) => p.prop === 'lamp-front').length).toBeGreaterThan(0);
    expect(fronts.filter((p) => p.prop === 'lamp-back').length).toBeGreaterThan(0);
    for (const p of fronts) {
      const tx = Math.floor(p.x / 16);
      const ty = Math.floor((p.y - 1) / 16);
      const where = `${p.prop} en (${tx},${ty})`;
      const below = [1, 2, 3].find((d) => isWalkable(grid, tx, ty + d)) ?? Infinity;
      const above = [1, 2, 3].find((d) => isWalkable(grid, tx, ty - d)) ?? Infinity;
      if (below !== above) expect(p.prop, where).toBe(above < below ? 'lamp-back' : 'lamp-front');
      expect(isWalkable(grid, tx, ty), where).toBe(false);
      // Sin camino a los lados (si lo hubiera, iría la de brazo mirándolo).
      expect(isWalkable(grid, tx - 1, ty) || isWalkable(grid, tx + 1, ty), where).toBe(false);
      for (let y = ty - 2; y <= ty; y++) expect(pens.some((e) => rectContains(e, { x: tx * 16 + 8, y: y * 16 + 8 })), where).toBe(false);
    }
    // Las de brazo tienen el camino a un lado (o, las de la entrada, a 2 casillas).
    for (const p of readProps(map).filter((q) => q.prop === 'lamp')) {
      const tx = Math.floor((p.x - 1) / 16);
      const ty = Math.floor((p.y - 1) / 16);
      const side = [-2, -1, 1, 2].some((d) => isWalkable(grid, tx + d, ty));
      expect(side, `farola de brazo en (${tx},${ty})`).toBe(true);
    }
  });

  it('ninguna farola se monta sobre el muro del zoo', () => {
    for (const p of readProps(map).filter((q) => q.prop === 'lamp')) {
      const left = Math.floor((p.x - 16) / 16);
      const bottom = Math.floor((p.y - 1) / 16);
      expect(left, `farola de (${p.x},${p.y})`).toBeGreaterThanOrEqual(2);
      expect(left + 1, `farola de (${p.x},${p.y})`).toBeLessThanOrEqual(W - 3);
      expect(bottom - 2, `farola de (${p.x},${p.y})`).toBeGreaterThanOrEqual(2);
    }
  });
});

