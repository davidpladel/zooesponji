import type { PropInfo } from './tiledmap';

/** Profundidad a partir de la cual se ordena por Y (suelo y vallas quedan por debajo). */
export const DEPTH_BASE = 100;

/** Piezas pegadas al suelo (agua, meseta, lo que se pisa): encima del suelo, debajo de todo lo que se ordena por Y. */
export const FLAT_DEPTH = 10;

/** Lo que está más abajo en pantalla se dibuja delante (el animal pasa por detrás de un árbol). */
export function depthForY(y: number): number {
  return DEPTH_BASE + y;
}

/**
 * Profundidad de un prop: lo plano y lo que se pisa (hierba, rocas, meseta) queda siempre por debajo de
 * la cuidadora, Luna, los animales y los visitantes; lo demás se ordena por su base.
 */
export function propDepth(p: Pick<PropInfo, 'flat' | 'walk' | 'z' | 'y'>): number {
  return p.flat || p.walk ? FLAT_DEPTH + p.z : depthForY(p.y);
}
