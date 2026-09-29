import { describe, expect, it } from 'vitest';
import { pickWanderTarget, segmentHitsRects } from '../../src/core/obstacles';

const pond = { x: 40, y: 0, width: 20, height: 100 };

describe('segmentHitsRects', () => {
  it('detecta cruzar un obstáculo', () => {
    expect(segmentHitsRects({ x: 0, y: 50 }, { x: 100, y: 50 }, [pond])).toBe(true);
  });
  it('libre si no lo cruza', () => {
    expect(segmentHitsRects({ x: 0, y: 50 }, { x: 30, y: 50 }, [pond])).toBe(false);
  });
});

describe('pickWanderTarget', () => {
  const area = { x: 0, y: 0, width: 100, height: 100 };

  it('nunca devuelve un punto dentro de un obstáculo ni tras él', () => {
    let seed = 1;
    const rng = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    let found = 0;
    for (let i = 0; i < 50; i++) {
      const p = pickWanderTarget(area, { x: 10, y: 50 }, [pond], rng);
      if (!p) continue;
      found++;
      expect(p.x < 40 || p.x > 60).toBe(true);
      expect(segmentHitsRects({ x: 10, y: 50 }, p, [pond])).toBe(false);
    }
    expect(found).toBeGreaterThan(0);
  });

  it('null si todo está bloqueado', () => {
    expect(pickWanderTarget(area, { x: 50, y: 50 }, [area], () => 0.5)).toBeNull();
  });
});

describe('segmentHitsRects (exacto)', () => {
  it('detecta rozar la esquina de un obstáculo', () => {
    const rock = { x: 10, y: 10, width: 16, height: 16 };
    expect(segmentHitsRects({ x: 27, y: 25 }, { x: 24, y: 28 }, [rock])).toBe(true);
    expect(segmentHitsRects({ x: 28, y: 25 }, { x: 28, y: 0 }, [rock])).toBe(false);
  });
});
