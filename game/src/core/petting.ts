import { rectContains, type Rect } from './interaction';
import type { Vec } from './movement';

/** Visitantes que caben a la vez dentro de la granja de contacto. */
export const MAX_VISITORS_INSIDE = 3;

/** Un visitante: dónde está y a dónde va (null si está parado). */
export interface Stroller {
  pos: Vec;
  goal: Vec | null;
}

/** ¿Cabe un visitante más? Cuentan los que están dentro y los que ya van hacia dentro. */
export function roomInside(visitors: readonly Stroller[], area: Rect, max = MAX_VISITORS_INSIDE): boolean {
  const busy = visitors.filter((v) => rectContains(area, v.pos) || (v.goal !== null && rectContains(area, v.goal))).length;
  return busy < max;
}
