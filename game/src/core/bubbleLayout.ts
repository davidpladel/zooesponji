/** Caja en pantalla: centro (x, y) y tamaño (w, h). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Bounds {
  width: number;
  height: number;
  /** Lo más arriba que puede empezar la caja (por debajo del contador de monedas). */
  minY: number;
}

export function overlaps(a: Rect, b: Rect): boolean {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
}

function overlapArea(a: Rect, b: Rect): number {
  const dx = Math.max(0, (a.w + b.w) / 2 - Math.abs(a.x - b.x));
  const dy = Math.max(0, (a.h + b.h) / 2 - Math.abs(a.y - b.y));
  return dx * dy;
}

function clamp(box: Rect, bounds: Bounds): Rect {
  const x = Math.min(Math.max(box.x, box.w / 2), bounds.width - box.w / 2);
  const y = Math.min(Math.max(box.y, bounds.minY + box.h / 2), bounds.height - box.h / 2);
  return { ...box, x, y };
}

function fits(box: Rect, bounds: Bounds): boolean {
  return box.x - box.w / 2 >= 0 && box.x + box.w / 2 <= bounds.width && box.y - box.h / 2 >= bounds.minY && box.y + box.h / 2 <= bounds.height;
}

/**
 * Dónde poner el globo `box` para que no pise `avoid` (el botón de comprar). Si no chocan, se queda donde está. Si
 * chocan, prueba encima, a la derecha, a la izquierda y debajo del botón, y se queda con el primer sitio que cabe en
 * pantalla; si no cabe ninguno, con el que menos se solapa.
 */
export function placeClear(box: Rect, avoid: Rect | null, bounds: Bounds, gap: number): { x: number; y: number } {
  return placeClearAll(box, avoid ? [avoid] : [], bounds, gap);
}

/** Como `placeClear`, pero sin pisar ninguna de las cajas de `avoid` (p. ej. el botón de comprar y el globo). */
export function placeClearAll(box: Rect, avoid: readonly Rect[], bounds: Bounds, gap: number): { x: number; y: number } {
  const free = (c: Rect) => avoid.every((a) => !overlaps(c, a));
  if (free(box)) return { x: box.x, y: box.y };
  const candidates = avoid.flatMap((a): Rect[] => [
    { ...box, y: a.y - a.h / 2 - gap - box.h / 2 },
    { ...box, x: a.x + a.w / 2 + gap + box.w / 2 },
    { ...box, x: a.x - a.w / 2 - gap - box.w / 2 },
    { ...box, y: a.y + a.h / 2 + gap + box.h / 2 },
  ]);
  const clear = candidates.find((c) => fits(c, bounds) && free(c));
  if (clear) return { x: clear.x, y: clear.y };
  const total = (c: Rect) => avoid.reduce((sum, a) => sum + overlapArea(c, a), 0);
  const best = candidates.map((c) => clamp(c, bounds)).sort((a, b) => total(a) - total(b))[0]!;
  return { x: best.x, y: best.y };
}
