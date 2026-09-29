/** Profundidad a partir de la cual se ordena por Y (suelo y vallas quedan por debajo). */
export const DEPTH_BASE = 100;

/** Lo que está más abajo en pantalla se dibuja delante (el animal pasa por detrás de un árbol). */
export function depthForY(y: number): number {
  return DEPTH_BASE + y;
}
