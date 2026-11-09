import { describe, expect, it } from 'vitest';
import { emptyCare, feedOutcome, insidePuddle, pickTapScene, puddleSpot } from '../../src/core/care';

describe('el charco en el mundo', () => {
  const puddle = { x: 100, y: 50, rx: 30, ry: 10 };

  it('el centro y el borde están dentro; fuera, no', () => {
    expect(insidePuddle({ x: 100, y: 50 }, puddle)).toBe(true);
    expect(insidePuddle({ x: 130, y: 50 }, puddle)).toBe(true);
    expect(insidePuddle({ x: 100, y: 60 }, puddle)).toBe(true);
    expect(insidePuddle({ x: 125, y: 58 }, puddle)).toBe(false);
    expect(insidePuddle({ x: 200, y: 50 }, puddle)).toBe(false);
  });
});

describe('tocar un animal', () => {
  const care = { ...emptyCare(), dirty: ['rosita', 'tembo'], sick: ['tembo'] };

  it('sucio abre la limpieza; enfermo (aunque esté sucio) o limpio, la comida', () => {
    expect(pickTapScene(care, 'rosita')).toBe('clean');
    expect(pickTapScene(care, 'tembo')).toBe('feed');
    expect(pickTapScene(care, 'bills')).toBe('feed');
  });

  it('a un enfermo, la comida le da «¡puaj!»; a los demás, lo de siempre', () => {
    expect(feedOutcome(care, 'tembo')).toBe('sick-refuse');
    expect(feedOutcome(care, 'rosita')).toBe('normal');
  });
});

describe('dónde va el charco', () => {
  const inner = { x: 0, y: 0, width: 200, height: 120 };

  it('en un recinto vacío, en el centro', () => {
    expect(puddleSpot({ inner, obstacles: [] }, 30, 12)).toEqual({ x: 100, y: 60 });
  });

  it('no pisa ningún adorno y no se sale del recinto', () => {
    const rock = { x: 80, y: 40, width: 40, height: 40 };
    const at = puddleSpot({ inner, obstacles: [rock] }, 30, 12)!;
    const box = { x: at.x - 30, y: at.y - 12, width: 60, height: 24 };
    const overlaps = box.x < rock.x + rock.width && rock.x < box.x + box.width && box.y < rock.y + rock.height && rock.y < box.y + box.height;
    expect(overlaps).toBe(false);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(200);
    expect(box.y + box.height).toBeLessThanOrEqual(120);
  });

  it('si no cabe en ningún sitio, null', () => {
    expect(puddleSpot({ inner, obstacles: [inner] }, 30, 12)).toBeNull();
  });
});
