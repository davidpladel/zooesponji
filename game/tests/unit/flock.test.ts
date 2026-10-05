import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { rectContains } from '../../src/core/interaction';
import { MIN_GAP, pickWanderTarget } from '../../src/core/obstacles';
import { penSpace, spreadPositions, stepRoamer, type Roamer } from '../../src/core/flock';
import { readEnclosures, readProps, type TiledMap } from '../../src/core/tiledmap';

const url = new URL('../../public/assets/maps/zoo.tmj', import.meta.url);
const map = JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as TiledMap;

function seeded(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('pickWanderTarget con otros animales', () => {
  it('descarta destinos pegados a los puntos ocupados', () => {
    const area = { x: 0, y: 0, width: 100, height: 100 };
    const rng = seeded(3);
    const occupied = [{ x: 50, y: 50 }];
    for (let i = 0; i < 40; i++) {
      const p = pickWanderTarget(area, { x: 10, y: 10 }, [], rng, 8, 12, occupied);
      if (p) expect(distance(p, occupied[0]!)).toBeGreaterThanOrEqual(MIN_GAP);
    }
  });
});

describe('cinco cabras en su recinto', () => {
  const enclosure = readEnclosures(map).find((e) => e.penId === 'cabra')!;
  const space = penSpace(enclosure, readProps(map), 16);

  it('las posiciones iniciales no se solapan ni caen en obstáculos', () => {
    const points = spreadPositions(space, 5, seeded(7));
    expect(points).toHaveLength(5);
    for (const [i, p] of points.entries()) {
      expect(space.obstacles.some((r) => rectContains(r, p))).toBe(false);
      for (const q of points.slice(i + 1)) expect(distance(p, q)).toBeGreaterThanOrEqual(MIN_GAP);
    }
  });

  it('tras muchos pasos, ningún par está a menos de MIN_GAP y ninguna pisa un obstáculo', () => {
    const rng = seeded(11);
    let herd: Roamer[] = spreadPositions(space, 5, rng).map((pos) => ({ pos, target: null, rest: 0 }));
    let moved = 0;
    for (let step = 0; step < 3000; step++) {
      herd = herd.map((_r, i) => {
        const next = stepRoamer(herd[i]!, herd.filter((_o, j) => j !== i), space, 50, rng);
        if (next.pos.x !== herd[i]!.pos.x || next.pos.y !== herd[i]!.pos.y) moved++;
        herd[i] = next;
        return next;
      });
      for (const [i, r] of herd.entries()) {
        expect(space.obstacles.some((o) => rectContains(o, r.pos))).toBe(false);
        for (const other of herd.slice(i + 1)) expect(distance(r.pos, other.pos)).toBeGreaterThanOrEqual(MIN_GAP - 1e-9);
      }
    }
    expect(moved).toBeGreaterThan(500);
  });
});
