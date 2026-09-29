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
