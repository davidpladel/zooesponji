import { rectContains } from './interaction';
import type { Vec } from './movement';
import type { WaterInfo } from './tiledmap';

/** La zona de agua (o barro) en la que está `point`, o null. */
export function waterAt(waters: readonly WaterInfo[], point: Vec): WaterInfo | null {
  return waters.find((w) => rectContains(w, point)) ?? null;
}
