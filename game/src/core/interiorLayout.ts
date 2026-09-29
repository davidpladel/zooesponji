import type { Point } from './pathfinding';
import type { InteriorSpots } from './tiledmap';

export interface InteriorLayout {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/** Escala entera (nítida) si cabe a ×2 o más; si no, fraccionaria para que se vea entero. Centrado. */
export function interiorLayout(screenW: number, screenH: number, mapW: number, mapH: number): InteriorLayout {
  const fit = Math.min(screenW / mapW, screenH / mapH);
  const scale = fit >= 2 ? Math.floor(fit) : fit;
  return { scale, offsetX: (screenW - mapW * scale) / 2, offsetY: (screenH - mapH * scale) / 2 };
}

export function toScreen(layout: InteriorLayout, p: Point): Point {
  return { x: layout.offsetX + p.x * layout.scale, y: layout.offsetY + p.y * layout.scale };
}

/** Si falta tienda.tmj: tendero, puerta y peanas en fila, sin decoración. */
export const FALLBACK_SPOTS: InteriorSpots = {
  shopkeeper: { x: 48, y: 92 },
  pedestals: [112, 152, 192, 232, 272].map((x) => ({ x, y: 116 })),
  door: { x: 192, y: 186 },
  doorTile: { x: 12, y: 11 },
  decos: [],
};

/**
 * Sitio del producto `index` de `count`: repartidos por el arco de peanas y centrados
 * (con 4 caen entre peanas). Si hay más productos que peanas, los que sobran van en fila
 * delante del mostrador (hoy no pasa: máx. 5).
 */
export function pedestalFor(spots: InteriorSpots, index: number, count: number): Point {
  const arc = spots.pedestals;
  if (count > arc.length || arc.length === 0) {
    const p = arc[index];
    return p ?? { x: 40 + (index - arc.length) * 36, y: 172 };
  }
  const last = arc.length - 1;
  const step = count > 1 ? Math.min(1, last / (count - 1)) : 0;
  const u = last / 2 + (index - (count - 1) / 2) * step;
  const a = arc[Math.floor(u)]!;
  const b = arc[Math.ceil(u)]!;
  const f = u - Math.floor(u);
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}
