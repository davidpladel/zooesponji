/** Píxeles de mundo que se ven en vertical como máximo (~10 tiles): se ve bien el interior de los recintos. */
export const BASE_VIEW_HEIGHT = 160;

/** Zoom entero de la cámara del mundo para que el pixel art se vea nítido. */
export function computeZoom(viewWidth: number, viewHeight: number, baseHeight = BASE_VIEW_HEIGHT): number {
  if (viewWidth <= 0 || viewHeight <= 0) return 1;
  return Math.max(1, Math.floor(viewHeight / baseHeight));
}
