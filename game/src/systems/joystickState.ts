import type { Vec } from '../core/movement';

/** Dirección actual del joystick virtual (magnitud 0..1). La escribe el HUD y la lee el mundo. */
export const joystickState: { vector: Vec } = { vector: { x: 0, y: 0 } };
