import { describe, expect, it } from 'vitest';
import { MAX_VISITORS_INSIDE, roomInside, type Stroller } from '../../src/core/petting';

const area = { x: 100, y: 100, width: 80, height: 60 };
const inside = { x: 120, y: 120 };
const outside = { x: 10, y: 10 };
const stroller = (pos: { x: number; y: number }, goal: { x: number; y: number } | null = null): Stroller => ({ pos, goal });

describe('aforo de la granja de contacto', () => {
  it('caben 3 visitantes', () => {
    expect(MAX_VISITORS_INSIDE).toBe(3);
  });

  it('con sitio, puede entrar uno más', () => {
    expect(roomInside([stroller(inside), stroller(inside), stroller(outside)], area)).toBe(true);
  });

  it('con 3 dentro no entra nadie más', () => {
    expect(roomInside([stroller(inside), stroller(inside), stroller(inside), stroller(outside)], area)).toBe(false);
  });

  it('cuentan también los que ya van hacia dentro', () => {
    expect(roomInside([stroller(inside), stroller(inside), stroller(outside, inside)], area)).toBe(false);
  });

  it('el que está dentro y va hacia fuera sigue contando hasta que sale', () => {
    expect(roomInside([stroller(inside, outside), stroller(inside), stroller(inside)], area)).toBe(false);
  });
});
