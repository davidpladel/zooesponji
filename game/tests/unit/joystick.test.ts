import { describe, expect, it } from 'vitest';
import { inJoystickZone, joystickVector, knobOffset } from '../../src/core/joystick';

const O = { x: 0, y: 0 };

describe('joystickVector', () => {
  it('dentro de la zona muerta es cero', () => {
    expect(joystickVector(O, { x: 5, y: 0 }, 60, 0.2)).toEqual({ x: 0, y: 0 });
  });

  it('a medio radio da media potencia', () => {
    const v = joystickVector(O, { x: 30, y: 0 }, 60, 0.2);
    expect(v.x).toBeCloseTo(0.5);
    expect(v.y).toBeCloseTo(0);
  });

  it('más allá del radio se limita a 1', () => {
    const v = joystickVector(O, { x: 0, y: -500 }, 60, 0.2);
    expect(v.y).toBeCloseTo(-1);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1);
  });

  it('en diagonal conserva la dirección', () => {
    const v = joystickVector(O, { x: 60, y: 60 }, 60, 0.2);
    expect(v.x).toBeCloseTo(Math.SQRT1_2);
    expect(v.y).toBeCloseTo(Math.SQRT1_2);
  });
});

describe('knobOffset', () => {
  it('dentro del radio no cambia', () => {
    expect(knobOffset(O, { x: 10, y: -5 }, 60)).toEqual({ x: 10, y: -5 });
  });

  it('fuera se limita al radio', () => {
    expect(knobOffset(O, { x: 120, y: 0 }, 60)).toEqual({ x: 60, y: 0 });
  });
});

describe('inJoystickZone', () => {
  it('abajo a la izquierda sí', () => {
    expect(inJoystickZone({ x: 50, y: 600 }, 1280, 720)).toBe(true);
  });
  it('arriba no', () => {
    expect(inJoystickZone({ x: 50, y: 100 }, 1280, 720)).toBe(false);
  });
  it('a la derecha no', () => {
    expect(inJoystickZone({ x: 900, y: 600 }, 1280, 720)).toBe(false);
  });
});
