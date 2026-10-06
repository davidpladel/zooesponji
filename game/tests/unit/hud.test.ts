import { describe, expect, it } from 'vitest';
import { gearVisible } from '../../src/core/hud';

describe('engranaje de ajustes', () => {
  it('se ve andando por el zoo', () => {
    expect(gearVisible(['World', 'Hud'])).toBe(true);
  });

  it.each(['Shop', 'Book', 'Feed', 'Settings', 'Quit'])('no se ve con %s abierta', (overlay) => {
    expect(gearVisible(['World', 'Hud', overlay])).toBe(false);
  });

  it('no se ve si el mundo no está en marcha', () => {
    expect(gearVisible(['Hud'])).toBe(false);
    expect(gearVisible(['Hud', 'Shop'])).toBe(false);
  });
});
