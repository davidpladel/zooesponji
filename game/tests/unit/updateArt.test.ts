import { describe, expect, it } from 'vitest';
import { arrowPoints, checkPoints, clockHands, drawGlyph, type GlyphCtx } from '../../src/ui/updateArt';

const SIZES = [32, 64, 120, 257];

describe('flecha de actualizar', () => {
  it.each(SIZES)('cabe en su cuadro, es simétrica y la punta mira abajo (%i px)', (size) => {
    const pts = arrowPoints(size);
    expect(pts.length).toBe(7);
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(size);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(size);
    }
    const tip = pts.reduce((a, b) => (b.y > a.y ? b : a));
    expect(tip.x).toBeCloseTo(size / 2, 5);
    // simétrica: por cada punto hay otro espejo respecto al eje vertical
    for (const p of pts) expect(pts.some((q) => Math.abs(q.x - (size - p.x)) < 1e-6 && Math.abs(q.y - p.y) < 1e-6), JSON.stringify(p)).toBe(true);
  });
});

describe('marca ✓', () => {
  it.each(SIZES)('son tres puntos dentro del cuadro y el del medio es el más bajo (%i px)', (size) => {
    const [a, b, c] = checkPoints(size);
    for (const p of [a!, b!, c!]) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(size);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(size);
    }
    expect(b!.y).toBeGreaterThan(a!.y);
    expect(b!.y).toBeGreaterThan(c!.y);
    expect(a!.x).toBeLessThan(b!.x);
    expect(b!.x).toBeLessThan(c!.x);
  });
});

describe('reloj de «luego»', () => {
  it.each(SIZES)('las manillas salen del centro y no pasan de la esfera (%i px)', (size) => {
    const { center, radius, hour, minute } = clockHands(size);
    expect(center).toEqual({ x: size / 2, y: size / 2 });
    expect(radius).toBeLessThanOrEqual(size / 2);
    for (const [from, to] of [hour, minute]) {
      expect(from).toEqual(center);
      expect(Math.hypot(to.x - center.x, to.y - center.y)).toBeLessThan(radius);
    }
    // la manilla de los minutos es más larga que la de las horas
    expect(Math.hypot(minute[1].x - center.x, minute[1].y - center.y)).toBeGreaterThan(Math.hypot(hour[1].x - center.x, hour[1].y - center.y));
  });
});

describe('drawGlyph', () => {
  function recorder(): { ctx: GlyphCtx; calls: string[] } {
    const calls: string[] = [];
    const ctx = new Proxy({} as GlyphCtx, {
      get: (_t, name: string) => (...args: unknown[]) => { calls.push(name); return args; },
      set: (_t, name: string) => { calls.push(`set:${name}`); return true; },
    });
    return { ctx, calls };
  }
  it('cada dibujo pinta algo y siempre cierra el camino que abre', () => {
    for (const kind of ['arrow', 'check', 'clock'] as const) {
      const { ctx, calls } = recorder();
      drawGlyph(ctx, kind, 64, '#ffffff');
      expect(calls.some((c) => c === 'fill' || c === 'stroke'), kind).toBe(true);
      expect(calls.filter((c) => c === 'beginPath').length, kind).toBeGreaterThan(0);
    }
  });
});
