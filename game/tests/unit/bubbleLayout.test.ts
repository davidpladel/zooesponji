import { describe, expect, it } from 'vitest';
import { overlaps, placeClear, placeClearAll, type Rect } from '../../src/core/bubbleLayout';

const inside = (r: Rect, b: { width: number; height: number; minY: number }) =>
  r.x - r.w / 2 >= 0 && r.x + r.w / 2 <= b.width && r.y - r.h / 2 >= b.minY && r.y + r.h / 2 <= b.height;

describe('placeClear: el globo del tendero no choca con el botón de comprar', () => {
  const bounds = { width: 1280, height: 720, minY: 80 };

  it('sin choque o sin botón se queda donde estaba', () => {
    const box = { x: 300, y: 200, w: 200, h: 60 };
    expect(placeClear(box, null, bounds, 4)).toEqual({ x: 300, y: 200 });
    expect(placeClear(box, { x: 900, y: 500, w: 180, h: 40 }, bounds, 4)).toEqual({ x: 300, y: 200 });
  });

  it('si choca, se aparta sin solaparse y dentro de la pantalla', () => {
    const box = { x: 500, y: 300, w: 220, h: 70 };
    const avoid = { x: 520, y: 310, w: 180, h: 44 };
    const at = placeClear(box, avoid, bounds, 4);
    const placed = { ...box, ...at };
    expect(overlaps(placed, avoid)).toBe(false);
    expect(inside(placed, bounds)).toBe(true);
  });

  it('sin sitio por arriba (pegado al contador de monedas) se va a un lado', () => {
    const box = { x: 500, y: 130, w: 220, h: 70 };
    const avoid = { x: 500, y: 130, w: 180, h: 44 };
    const at = placeClear(box, avoid, bounds, 4);
    const placed = { ...box, ...at };
    expect(overlaps(placed, avoid)).toBe(false);
    expect(inside(placed, bounds)).toBe(true);
  });

  it('pantalla baja apaisada (740×340) con un globo grande: sigue dentro', () => {
    const low = { width: 740, height: 340, minY: 72 };
    const box = { x: 380, y: 160, w: 260, h: 110 };
    const avoid = { x: 370, y: 170, w: 176, h: 40 };
    const at = placeClear(box, avoid, low, 4);
    const placed = { ...box, ...at };
    expect(inside(placed, low)).toBe(true);
    expect(overlaps(placed, avoid)).toBe(false);
  });
});

describe('placeClearAll: el aviso de página nueva esquiva el botón de comprar y el globo a la vez', () => {
  it('sin choques se queda; con dos cajas encima, se va a un sitio libre de ambas y dentro', () => {
    const low = { width: 740, height: 340, minY: 80 };
    const toast = { x: 560, y: 112, w: 300, h: 40 };
    expect(placeClearAll(toast, [], low, 4)).toEqual({ x: 560, y: 112 });
    const buy = { x: 600, y: 120, w: 176, h: 44 };
    const keeper = { x: 470, y: 180, w: 220, h: 60 };
    const placed = { ...toast, ...placeClearAll(toast, [buy, keeper], low, 4) };
    expect(overlaps(placed, buy)).toBe(false);
    expect(overlaps(placed, keeper)).toBe(false);
    expect(inside(placed, low)).toBe(true);
  });
});
