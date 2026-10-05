import { PNG } from 'pngjs';

export function crop(src: PNG, x: number, y: number, w: number, h: number): PNG {
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(src, out, x, y, w, h, 0, 0);
  return out;
}

/** Deja transparentes las zonas indicadas [x, y, w, h] (en coordenadas de la imagen). */
export function erase(png: PNG, zones: readonly (readonly [number, number, number, number])[]): PNG {
  for (const [zx, zy, zw, zh] of zones) {
    for (let y = zy; y < zy + zh && y < png.height; y++) {
      for (let x = zx; x < zx + zw && x < png.width; x++) png.data[(y * png.width + x) * 4 + 3] = 0;
    }
  }
  return png;
}

export interface Animate {
  /** Distancia horizontal entre fotogramas en la hoja de origen. */
  step: number;
  count: number;
  /** Zona del recorte [x, y, w, h] que cambia; el resto se toma del primer fotograma. */
  area?: readonly [number, number, number, number];
  fps?: number;
}

/** Hoja horizontal de `count` fotogramas, cada uno del tamaño del recorte. */
export function animatedStrip(src: PNG, r: { x: number; y: number; w: number; h: number }, a: Animate): PNG {
  const out = new PNG({ width: r.w * a.count, height: r.h });
  const [ax, ay, aw, ah] = a.area ?? [0, 0, r.w, r.h];
  for (let i = 0; i < a.count; i++) {
    PNG.bitblt(src, out, r.x, r.y, r.w, r.h, i * r.w, 0);
    PNG.bitblt(src, out, r.x + i * a.step + ax, r.y + ay, aw, ah, i * r.w + ax, ay);
  }
  return out;
}

export interface ComposeLayer {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Dónde va dentro de la pieza compuesta. */
  dx: number;
  dy: number;
  /** Si está animada: distancia horizontal entre fotogramas en la hoja de origen. */
  step?: number;
  /** Quitar de esta capa los colores de `clear` (el césped del pack, para que se vea el suelo del recinto). */
  clear?: boolean;
}
export interface Compose {
  frames: number;
  fps?: number;
  clear?: [number, number, number][];
  layers: ComposeLayer[];
}

/** Pieza hecha de varias capas del pack (p. ej. acantilado + estanque + catarata), en hoja de `frames` fotogramas. */
export function composedStrip(src: PNG, w: number, h: number, c: Compose): PNG {
  const out = new PNG({ width: w * c.frames, height: h });
  out.data.fill(0);
  const clear = new Set((c.clear ?? []).map(([r, g, b]) => (r << 16) | (g << 8) | b));
  for (let f = 0; f < c.frames; f++) {
    for (const l of c.layers) {
      const sx = l.x + (l.step ?? 0) * f;
      for (let y = 0; y < l.h; y++) {
        for (let x = 0; x < l.w; x++) {
          const tx = f * w + l.dx + x;
          const ty = l.dy + y;
          if (tx < f * w || tx >= (f + 1) * w || ty < 0 || ty >= h) continue;
          const si = ((l.y + y) * src.width + sx + x) * 4;
          const a = src.data[si + 3]!;
          if (a === 0) continue;
          if (l.clear && clear.has((src.data[si]! << 16) | (src.data[si + 1]! << 8) | src.data[si + 2]!)) continue;
          const ti = (ty * w * c.frames + tx) * 4;
          // Mezcla "por encima" (las sombras del pack son semitransparentes).
          const sa = a / 255;
          const da = out.data[ti + 3]! / 255;
          const oa = sa + da * (1 - sa);
          for (let k = 0; k < 3; k++) {
            out.data[ti + k] = Math.round((src.data[si + k]! * sa + out.data[ti + k]! * da * (1 - sa)) / oa);
          }
          out.data[ti + 3] = Math.round(oa * 255);
        }
      }
    }
  }
  return out;
}

/** Reordena las 4 filas de una hoja 3×4: `order[i]` = fila de origen de la fila i (abajo, izquierda, derecha, arriba). */
export function reorderRows(src: PNG, order: readonly number[]): PNG {
  const h = src.height / order.length;
  const out = new PNG({ width: src.width, height: src.height });
  order.forEach((from, to) => PNG.bitblt(src, out, 0, from * h, src.width, h, 0, to * h));
  return out;
}

/** Personaje `index` (0..7) de una hoja estilo RPG Maker con 4×2 personajes. */
export function characterSheet(src: PNG, index: number): PNG {
  const w = src.width / 4;
  const h = src.height / 2;
  return crop(src, (index % 4) * w, Math.floor(index / 4) * h, w, h);
}

/** Leopardo de las nieves → pantera negra: paleta oscura por luminosidad; ojos claros cálidos → amarillo. */
export function recolorPanther(src: PNG): PNG {
  const out = new PNG({ width: src.width, height: src.height });
  for (let i = 0; i < src.data.length; i += 4) {
    const r = src.data[i]!;
    const g = src.data[i + 1]!;
    const b = src.data[i + 2]!;
    const a = src.data[i + 3]!;
    const light = 0.3 * r + 0.59 * g + 0.11 * b;
    let color: [number, number, number];
    if (r > 180 && g > 150 && b < 120) color = [230, 200, 60];
    else if (light > 200) color = [70, 64, 82];
    else if (light > 150) color = [48, 44, 58];
    else if (light > 100) color = [32, 29, 40];
    else if (light > 60) color = [20, 18, 26];
    else color = [8, 7, 12];
    out.data.set([...color, a], i);
  }
  return out;
}

/** Un retoque sobre una hoja de fotogramas: cambio de colores por zona y/o puntos sueltos. */
export interface SheetEdit {
  /** Color exacto → color nuevo, en hexadecimal (`"f4f3f2": "e8c9a0"`). Solo píxeles opacos. */
  swap?: Record<string, string>;
  /** Píxeles sueltos [x, y, color], relativos al fotograma. */
  dots?: [number, number, string][];
  /** Filas de la hoja a las que se aplica (0 de frente, 1 izquierda, 2 derecha, 3 de espaldas). Todas si falta. */
  rows?: number[];
  /** Columnas (fotogramas del paso: 0, 1, 2) a las que se aplica. Todas si falta. */
  cols?: number[];
  /** Zona del fotograma [x, y, ancho, alto] donde actúa `swap`. Todo el fotograma si falta. */
  area?: [number, number, number, number];
}

function rgb(hex: string): [number, number, number] {
  if (!/^#?[0-9a-fA-F]{6}$/.test(hex)) throw new Error(`Color no válido: ${hex}`);
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Aplica los retoques, en orden, a los fotogramas que indique cada uno. No modifica `src`. */
export function editSheet(src: PNG, edits: readonly SheetEdit[], cols = 3, rows = 4): PNG {
  const out = new PNG({ width: src.width, height: src.height });
  src.data.copy(out.data);
  const fw = src.width / cols;
  const fh = src.height / rows;
  const allRows = Array.from({ length: rows }, (_v, i) => i);
  const allCols = Array.from({ length: cols }, (_v, i) => i);
  for (const edit of edits) {
    const swap = new Map(Object.entries(edit.swap ?? {}).map(([from, to]) => [rgb(from).join(','), rgb(to)] as const));
    const dots = (edit.dots ?? []).map(([x, y, hex]) => [x, y, rgb(hex)] as const);
    const [ax, ay, aw, ah] = edit.area ?? [0, 0, fw, fh];
    for (const row of edit.rows ?? allRows) {
      for (const col of edit.cols ?? allCols) {
        const ox = col * fw;
        const oy = row * fh;
        for (let y = Math.max(0, ay); y < Math.min(fh, ay + ah) && swap.size > 0; y++) {
          for (let x = Math.max(0, ax); x < Math.min(fw, ax + aw); x++) {
            const i = ((oy + y) * out.width + ox + x) * 4;
            if (out.data[i + 3] !== 255) continue;
            const to = swap.get(`${out.data[i]},${out.data[i + 1]},${out.data[i + 2]}`);
            if (to) out.data.set(to, i);
          }
        }
        for (const [x, y, color] of dots) {
          if (x < 0 || y < 0 || x >= fw || y >= fh) continue;
          out.data.set([...color, 255], ((oy + y) * out.width + ox + x) * 4);
        }
      }
    }
  }
  return out;
}

/** Reduce cada fotograma a `size`×`size` (vecino más cercano) y lo apoya abajo en el centro del suyo. */
export function shrinkFrames(src: PNG, size: number, cols = 3, rows = 4): PNG {
  const fw = src.width / cols;
  const fh = src.height / rows;
  if (size >= fw && size >= fh) return src;
  const out = new PNG({ width: src.width, height: src.height });
  out.data.fill(0);
  const dx = Math.floor((fw - size) / 2);
  const dy = fh - size;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const sx = col * fw + Math.floor((x * fw) / size);
          const sy = row * fh + Math.floor((y * fh) / size);
          const si = (sy * src.width + sx) * 4;
          out.data.set(src.data.subarray(si, si + 4), ((row * fh + dy + y) * out.width + col * fw + dx + x) * 4);
        }
      }
    }
  }
  return out;
}

/** Amplía `k` veces sin suavizar (para ver el pixel art en grande). */
export function scaleUp(src: PNG, k: number): PNG {
  const out = new PNG({ width: src.width * k, height: src.height * k });
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const i = (Math.floor(y / k) * src.width + Math.floor(x / k)) * 4;
      out.data.set(src.data.subarray(i, i + 4), (y * out.width + x) * 4);
    }
  }
  return out;
}
