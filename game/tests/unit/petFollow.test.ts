import { describe, expect, it } from 'vitest';
import { PET_GAP, PET_SNAP, followTrail, recordTrail } from '../../src/core/petFollow';
import type { Vec } from '../../src/core/movement';

/** Rastro en L: 60 px a la derecha y 40 hacia abajo, un punto cada 4 px. */
function lTrail(): Vec[] {
  const points: Vec[] = [];
  for (let x = 4; x <= 60; x += 4) points.push({ x, y: 0 });
  for (let y = 4; y <= 40; y += 4) points.push({ x: 60, y });
  return points;
}

const along = (trail: readonly Vec[], from: Vec): number => {
  if (trail.length === 0) return 0;
  let d = Math.hypot(trail[0]!.x - from.x, trail[0]!.y - from.y);
  for (let i = 1; i < trail.length; i++) d += Math.hypot(trail[i]!.x - trail[i - 1]!.x, trail[i]!.y - trail[i - 1]!.y);
  return d;
};

describe('Luna sigue el rastro de la cuidadora', () => {
  it('se para a PET_GAP del final, por el camino de la cuidadora (sin atajar por el césped)', () => {
    let pet: Vec = { x: 0, y: 0 };
    let trail = lTrail();
    let moving = true;
    for (let i = 0; i < 400; i++) {
      const step = followTrail(pet, trail, 16);
      pet = step.pos;
      trail = step.trail;
      moving = step.moving;
      // Siempre sobre la L: o en la fila de arriba o en la columna de la derecha.
      expect(Math.abs(pet.y) < 0.01 || Math.abs(pet.x - 60) < 0.01, `(${pet.x},${pet.y})`).toBe(true);
    }
    expect(moving).toBe(false);
    expect(along(trail, pet)).toBeCloseTo(PET_GAP, 0);
  });

  it('sin rastro se queda quieta', () => {
    expect(followTrail({ x: 5, y: 5 }, [], 16)).toEqual({ pos: { x: 5, y: 5 }, trail: [], moving: false });
  });

  it('con la cuidadora dentro de un recinto no se apunta nada: Luna espera en la puerta', () => {
    const trail = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
    expect(recordTrail(trail, { x: 30, y: 0 }, false)).toBe(trail);
  });

  it('solo apunta pasos de 4 px o más, y como mucho 256 puntos', () => {
    expect(recordTrail([{ x: 0, y: 0 }], { x: 2, y: 0 }, true)).toHaveLength(1);
    expect(recordTrail([{ x: 0, y: 0 }], { x: 4, y: 0 }, true)).toHaveLength(2);
    let trail: Vec[] = [];
    for (let i = 0; i < 300; i++) trail = recordTrail(trail, { x: i * 5, y: 0 }, true);
    expect(trail).toHaveLength(256);
    expect(trail[trail.length - 1]).toEqual({ x: 299 * 5, y: 0 });
  });

  it('si está muy lejos (el mundo se ha vuelto a montar), aparece junto a la cuidadora', () => {
    const trail = [{ x: 400, y: 0 }, { x: 420, y: 0 }, { x: 440, y: 0 }];
    const step = followTrail({ x: 0, y: 0 }, trail, 16);
    expect(PET_SNAP).toBeLessThan(440);
    expect(along(step.trail, step.pos)).toBeCloseTo(PET_GAP, 0);
  });
});
