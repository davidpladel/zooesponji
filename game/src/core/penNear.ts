import { rectContains, type Rect } from './interaction';
import type { Vec } from './movement';

/** Píxeles alrededor del recinto que cuentan como «junto a él» (2 casillas). */
export const NEAR_MARGIN = 32;
/** Tiempo seguido junto a un recinto para que sea una visita y no un ir de paso. */
export const NEAR_MS = 2000;

export interface NearState<T extends string> {
  penId: T | null;
  ms: number;
  /** Esta visita ya se ha contado: no se repite hasta salir y volver. */
  fired: boolean;
}

export function noPen<T extends string>(): NearState<T> {
  return { penId: null, ms: 0, fired: false };
}

function centerDistance(rect: Rect, pos: Vec): number {
  return Math.hypot(rect.x + rect.width / 2 - pos.x, rect.y + rect.height / 2 - pos.y);
}

export function stepNear<T extends string>(
  state: NearState<T>,
  pens: readonly { id: T; rect: Rect }[],
  pos: Vec,
  delta: number,
): { state: NearState<T>; entered: T | null } {
  // Entre dos recintos pegados gana el de centro más cercano.
  const here = pens
    .filter((pen) => rectContains(pen.rect, pos, NEAR_MARGIN))
    .sort((a, b) => centerDistance(a.rect, pos) - centerDistance(b.rect, pos))[0];
  const at = here?.id ?? null;
  if (at !== state.penId) return { state: { penId: at, ms: 0, fired: false }, entered: null };
  if (at === null || state.fired) return { state, entered: null };
  const ms = state.ms + delta;
  if (ms < NEAR_MS) return { state: { ...state, ms }, entered: null };
  return { state: { penId: at, ms, fired: true }, entered: at };
}
