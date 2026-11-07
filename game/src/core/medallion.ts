/**
 * Carteles de recinto con el dibujo del animal (2026-11-07): un medallón redondo sobre un poste. El animal sale del
 * primer fotograma de frente de su hoja; si es grande (león, panda, elefante…) se reduce a escala entera y, si aun
 * así no cabe, se queda la parte de arriba (la cabeza). Nada se sale del círculo.
 */

export interface Pixels {
  width: number;
  height: number;
  /** RGBA, fila a fila. */
  data: Uint8ClampedArray;
}

/** Medidas del cartel (px del mundo). */
export const MEDALLION = {
  /** Diámetro del medallón con su borde. */
  size: 24,
  /** Diámetro de dentro (crema), donde va el animal. */
  inner: 18,
  /** Alto del poste por debajo del medallón. */
  post: 10,
  /** Ancho del poste. */
  postWidth: 4,
} as const;

/** Colores de la maqueta. */
export const MEDALLION_COLORS = {
  outline: '#414040',
  wood: '#946b47',
  cream: '#f4e4c1',
  post: '#7b5039',
} as const;

/** Zona con píxeles que se ven (alfa > 0). Null si el dibujo está vacío. */
export function opaqueBounds(src: Pixels): { x: number; y: number; width: number; height: number } | null {
  let x0 = src.width;
  let y0 = src.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < src.height; y++)
    for (let x = 0; x < src.width; x++) {
      if (src.data[(y * src.width + x) * 4 + 3]! === 0) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  return x1 < 0 ? null : { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/**
 * Escala entera de reducción: la menor que deja el animal como mucho un 30 % más grande que el hueco (lo que
 * sobra se recorta por abajo y por los lados, y queda la cabeza).
 */
export function shrinkFactor(width: number, height: number, inner: number): number {
  let k = 1;
  while (Math.max(width, height) / k > inner * 1.3) k++;
  return k;
}

/**
 * El animal reducido y recortado para el medallón: como mucho `inner` x `inner`, centrado en horizontal y desde
 * arriba. Al reducir, cada bloque de k x k píxeles toma el color que más se repite entre los que se ven (si se ve
 * al menos la mitad del bloque): así no se pierden los contornos como al coger un píxel suelto.
 */
export function medallionAnimal(src: Pixels, inner: number): Pixels {
  const box = opaqueBounds(src);
  if (!box) return { width: 0, height: 0, data: new Uint8ClampedArray(0) };
  const k = shrinkFactor(box.width, box.height, inner);
  const sw = Math.ceil(box.width / k);
  const sh = Math.ceil(box.height / k);
  const width = Math.min(sw, inner);
  const height = Math.min(sh, inner);
  const left = Math.floor((sw - width) / 2);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const counts = new Map<number, number>();
      let seen = 0;
      for (let dy = 0; dy < k; dy++)
        for (let dx = 0; dx < k; dx++) {
          const sx = box.x + (x + left) * k + dx;
          const sy = box.y + y * k + dy;
          if (sx >= box.x + box.width || sy >= box.y + box.height) continue;
          const i = (sy * src.width + sx) * 4;
          if (src.data[i + 3]! === 0) continue;
          seen++;
          const color = (src.data[i]! << 16) | (src.data[i + 1]! << 8) | src.data[i + 2]!;
          counts.set(color, (counts.get(color) ?? 0) + 1);
        }
      if (seen * 2 < k * k) continue;
      let best = 0;
      let bestCount = 0;
      for (const [color, n] of counts) if (n > bestCount) [best, bestCount] = [color, n];
      const o = (y * width + x) * 4;
      data[o] = (best >> 16) & 255;
      data[o + 1] = (best >> 8) & 255;
      data[o + 2] = best & 255;
      data[o + 3] = 255;
    }
  return { width, height, data };
}

/** ¿El píxel (x, y) de un cuadrado de lado `size` cae dentro del círculo inscrito? */
export function inCircle(x: number, y: number, size: number): boolean {
  const r = size / 2;
  return Math.hypot(x + 0.5 - r, y + 0.5 - r) <= r;
}
