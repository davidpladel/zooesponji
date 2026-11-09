import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { penSpace, spreadPositions } from '../../src/core/flock';
import { rectContains } from '../../src/core/interaction';
import { penGridFor } from './penHelpers';
import { isWalkable } from '../../src/core/pathfinding';
import { PEN_IDS, PENS, penCapacity, type PenId } from '../../src/data/pens';
import { readEnclosures, readGates, readProps, readWater, type PropInfo, type TiledMap } from '../../src/core/tiledmap';

const map = JSON.parse(readFileSync(fileURLToPath(new URL('../../public/assets/maps/zoo.tmj', import.meta.url)), 'utf8')) as TiledMap;
const art = JSON.parse(readFileSync(fileURLToPath(new URL('../../art/art.config.json', import.meta.url)), 'utf8')) as {
  props: Record<string, { w: number; h: number }>;
};
const T = 16;
const props = readProps(map);
const waters = readWater(map);

/** Piezas mínimas del paisaje de cada especie (diseño del 2026-11-06, bloque 3). */
const PAISAJE: Record<PenId, RegExp[]> = {
  leon: [/^acacia$/, /^rock-savannah-big$/, /^grass-tall-dry/, /^log-savannah$/],
  cabra: [/^plateau$/, /^cave$/, /^(rock-grey|boulder-alpine)/, /^pine/, /^flowers-alpine/],
  pantera: [/^waterfall$/, /^jungle-tree-vines$/, /^rock-moss/, /^fern$/, /^flowers-red$/],
  panda: [/^bamboo-big$/, /^bamboo-mid$/, /^bamboo-small$/, /^(log|stump)/, /^rock-moss/, /^pond/],
  estanque: [/^lake-grassland$/, /^lilypad/, /^(cattails|reeds)$/, /^rock-wetland$/],
  ovejas: [/^daisies$/, /^sunflowers$/, /^rock-grassland/, /^tree-grassland$/],
  cerdos: [/^trough$/, /^barrel$/, /^(hay|pumpkin)/],
  establo: [/^shelter$/, /^trough$/, /^barrel$/, /^pumpkin$/, /^scarecrow$/],
  pinguinos: [/^pond-tundra$/, /^ice-floe$/, /^ice-waterfall$/, /^rock-snow/, /^pine-snow/],
  sabana: [/^acacia$/, /^water-savannah$/, /^grass-tall-dry/, /^rock-savannah/],
  'elefantes-africanos': [/^water-savannah$/, /^rock-savannah-big$/, /^acacia$/, /^log-savannah$/],
  'elefantes-asiaticos': [/^(pond|water-savannah)/, /^(palm|palm-leaning)$/, /^bamboo/, /^jungle-tree/, /^rock-moss/],
};

const enclosure = (id: PenId) => readEnclosures(map).find((e) => e.penId === id)!;
const innerOf = (id: PenId) => {
  const e = enclosure(id);
  return { x: e.x + T, y: e.y + T, width: e.width - 2 * T, height: e.height - 2 * T };
};
/** Props cuyo punto de apoyo está dentro del recinto (valla incluida). */
const propsIn = (id: PenId): PropInfo[] => props.filter((p) => rectContains(enclosure(id), { x: p.x, y: p.y - 1 }));
/** Casillas de la puerta y las dos de dentro que hay delante de ella. */
function gateFront(id: PenId): { gate: { x: number; y: number }[]; inside: { x: number; y: number }[] } {
  const g = readGates(map).find((q) => q.penId === id)!.tile;
  const e = enclosure(id);
  const dy = g.y === e.y / T ? 1 : -1;
  const gate = [g, { x: g.x + 1, y: g.y }];
  return { gate, inside: gate.map((t) => ({ x: t.x, y: t.y + dy })) };
}

function seeded(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

describe('recintos', () => {
  it.each(PEN_IDS)('%s tiene su paisaje', (id) => {
    const names = propsIn(id).map((p) => p.prop);
    for (const re of PAISAJE[id]) expect(names.some((n) => re.test(n)), `${id}: falta ${re}`).toBe(true);
  });

  it.each(PEN_IDS)('%s: la puerta y las casillas de dentro junto a ella quedan libres', (id) => {
    const { inside } = gateFront(id);
    const grid = penGridFor(map, id);
    for (const t of inside) {
      expect(isWalkable(grid, t.x, t.y), `${id} (${t.x},${t.y})`).toBe(true);
      const onIt = propsIn(id).filter((p) => Math.floor((p.x - 1) / T) === t.x && Math.floor((p.y - 1) / T) === t.y);
      expect(onIt.map((p) => p.prop), `${id} (${t.x},${t.y})`).toEqual([]);
    }
  });

  it.each(PEN_IDS)('%s: desde la puerta se llega a todo el interior que no es agua ni obstáculo', (id) => {
    const space = penSpace(enclosure(id), props, T, waters);
    const grid = penGridFor(map, id);
    const start = gateFront(id).inside[0]!;
    const seen = new Set([`${start.x},${start.y}`]);
    const queue = [start];
    while (queue.length > 0) {
      const p = queue.shift()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const n = { x: p.x + dx, y: p.y + dy };
        const key = `${n.x},${n.y}`;
        if (seen.has(key) || !isWalkable(grid, n.x, n.y)) continue;
        seen.add(key);
        queue.push(n);
      }
    }
    const lost: string[] = [];
    const { inner } = space;
    for (let ty = inner.y / T; ty < (inner.y + inner.height) / T; ty++)
      for (let tx = inner.x / T; tx < (inner.x + inner.width) / T; tx++) {
        const c = { x: tx * T + T / 2, y: ty * T + T / 2 };
        if (space.obstacles.some((o) => rectContains(o, c))) continue;
        if (!seen.has(`${tx},${ty}`)) lost.push(`(${tx},${ty})`);
      }
    expect(lost, `${id}: casillas a las que no se llega`).toEqual([]);
  });

  it.each(PEN_IDS)('%s: caben todos sus animales separados', (id) => {
    const space = penSpace(enclosure(id), props, T, waters);
    const n = penCapacity(id) + (PENS[id].companion ? 1 : 0);
    expect(spreadPositions(space, n, seeded(7), 8, 24).length).toBe(n);
  });

  it.each(PEN_IDS)('%s: ningún adorno se sale del recinto ni pisa la valla', (id) => {
    const inner = innerOf(id);
    for (const p of propsIn(id)) {
      const info = art.props[p.prop]!;
      const where = `${p.prop} en (${p.x},${p.y})`;
      expect(rectContains(inner, { x: p.x, y: p.y - 1 }), `${where}: apoyado en la valla`).toBe(true);
      expect(p.x - info.w / 2, `${where}: se sale por la izquierda`).toBeGreaterThanOrEqual(inner.x);
      expect(p.x + info.w / 2, `${where}: se sale por la derecha`).toBeLessThanOrEqual(inner.x + inner.width);
      if (p.flat) expect(p.y - info.h, `${where}: se sale por arriba`).toBeGreaterThanOrEqual(inner.y);
    }
  });
});
