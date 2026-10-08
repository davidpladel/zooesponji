import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { rectContains } from '../../src/core/interaction';
import { MIN_GAP, pickWanderTarget } from '../../src/core/obstacles';
import { BODY_RADIUS, fleeTarget, followTarget, gapBetween, penSpace, spreadPositions, stepRoamer, type Roamer } from '../../src/core/flock';
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
    // Los fallos se apuntan y se comprueban al final: 45 000 `expect` dentro del bucle eran casi todo
    // el tiempo de la prueba y, con la máquina cargada, la pasaban del tope de 5 s.
    const failures: string[] = [];
    for (let step = 0; step < 3000; step++) {
      herd = herd.map((_r, i) => {
        const next = stepRoamer(herd[i]!, herd.filter((_o, j) => j !== i), space, 50, rng);
        if (next.pos.x !== herd[i]!.pos.x || next.pos.y !== herd[i]!.pos.y) moved++;
        herd[i] = next;
        return next;
      });
      for (const [i, r] of herd.entries()) {
        if (space.obstacles.some((o) => rectContains(o, r.pos))) failures.push(`paso ${step}: la cabra ${i} pisa un obstáculo`);
        for (let j = i + 1; j < herd.length; j++) {
          const d = distance(r.pos, herd[j]!.pos);
          if (!(d >= MIN_GAP - 1e-9)) failures.push(`paso ${step}: las cabras ${i} y ${j} están a ${d}`);
        }
      }
    }
    expect(failures.slice(0, 5)).toEqual([]);
    expect(moved).toBeGreaterThan(500);
  });
});

describe('animales grandes', () => {
  const space = { inner: { x: 0, y: 0, width: 200, height: 120 }, obstacles: [] };

  it('la separación entre dos animales es la suma de sus radios; sin radio, la de siempre', () => {
    expect(gapBetween({}, {})).toBe(MIN_GAP);
    expect(gapBetween({ radius: 18 }, { radius: 18 })).toBe(36);
    expect(gapBetween({ radius: 18 }, {})).toBe(18 + BODY_RADIUS);
  });

  it('dos elefantes que van uno hacia el otro se paran antes de pisarse', () => {
    const rng = seeded(5);
    let a: Roamer = { pos: { x: 40, y: 60 }, target: { x: 160, y: 60 }, rest: 0, radius: 18 };
    let b: Roamer = { pos: { x: 160, y: 60 }, target: { x: 40, y: 60 }, rest: 0, radius: 18 };
    for (let step = 0; step < 400; step++) {
      a = stepRoamer(a, [b], space, 50, rng);
      b = stepRoamer(b, [a], space, 50, rng);
      expect(distance(a.pos, b.pos)).toBeGreaterThanOrEqual(36 - 1e-9);
    }
  });

  it('un animal grande no elige destinos pegados a la valla', () => {
    const rng = seeded(9);
    let r: Roamer = { pos: { x: 100, y: 60 }, target: null, rest: 0, radius: 18 };
    for (let step = 0; step < 2000; step++) {
      r = stepRoamer(r, [], space, 50, rng);
      if (!r.target) continue;
      expect(r.target.x).toBeGreaterThanOrEqual(18);
      expect(r.target.x).toBeLessThanOrEqual(200 - 18);
      expect(r.target.y).toBeGreaterThanOrEqual(18);
      expect(r.target.y).toBeLessThanOrEqual(120 - 18);
    }
  });

  it('spreadPositions separa más si se le pide', () => {
    const points = spreadPositions(space, 2, seeded(3), 18, 54);
    expect(points).toHaveLength(2);
    expect(distance(points[0]!, points[1]!)).toBeGreaterThanOrEqual(36);
  });
});

describe('ovejas de la granja de contacto', () => {
  const space = { inner: { x: 0, y: 0, width: 160, height: 120 }, obstacles: [{ x: 100, y: 40, width: 20, height: 20 }] };

  it('se aparta en dirección contraria a quien pasa', () => {
    expect(fleeTarget({ x: 60, y: 60 }, { x: 50, y: 60 }, space)).toEqual({ x: 80, y: 60 });
  });

  it('no se sale del recinto para apartarse (los animales no cruzan la valla ni la puerta)', () => {
    expect(fleeTarget({ x: 12, y: 60 }, { x: 22, y: 60 }, space)).toBeNull();
    expect(fleeTarget({ x: 80, y: 110 }, { x: 80, y: 100 }, space)).toBeNull();
  });

  it('no se aparta hacia una roca', () => {
    expect(fleeTarget({ x: 90, y: 50 }, { x: 80, y: 50 }, space)).toBeNull();
  });

  it('se acerca a alguien quedándose a un paso', () => {
    expect(followTarget({ x: 20, y: 80 }, { x: 80, y: 80 }, space, 20)).toEqual({ x: 60, y: 80 });
  });

  it('si ya está al lado, no se mueve', () => {
    expect(followTarget({ x: 70, y: 80 }, { x: 80, y: 80 }, space, 20)).toBeNull();
  });

  it('no atraviesa una roca para acercarse', () => {
    expect(followTarget({ x: 80, y: 50 }, { x: 150, y: 50 }, space, 20)).toBeNull();
  });
});
