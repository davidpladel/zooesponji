import type { Vec } from './movement';

export const JOYSTICK_RADIUS = 60;
export const JOYSTICK_DEADZONE = 0.2;

export function joystickVector(
  origin: Vec,
  current: Vec,
  radius = JOYSTICK_RADIUS,
  deadzone = JOYSTICK_DEADZONE,
): Vec {
  const dx = current.x - origin.x;
  const dy = current.y - origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance < deadzone * radius) return { x: 0, y: 0 };
  const power = Math.min(distance, radius) / radius;
  return { x: (dx / distance) * power, y: (dy / distance) * power };
}

export function knobOffset(origin: Vec, current: Vec, radius = JOYSTICK_RADIUS): Vec {
  const dx = current.x - origin.x;
  const dy = current.y - origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= radius) return { x: dx, y: dy };
  return { x: (dx / distance) * radius, y: (dy / distance) * radius };
}

/** Zona de la pantalla (abajo a la izquierda) donde un toque maneja el joystick. */
export function inJoystickZone(point: Vec, viewWidth: number, viewHeight: number): boolean {
  return point.x <= viewWidth * 0.4 && point.y >= viewHeight * 0.45;
}
