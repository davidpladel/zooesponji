import { describe, expect, it } from 'vitest';
import { clinicButtonVisible, gearVisible } from '../../src/core/hud';

describe('engranaje de ajustes', () => {
  it('se ve andando por el zoo', () => {
    expect(gearVisible(['World', 'Hud'])).toBe(true);
  });

  it.each(['Shop', 'Book', 'Board', 'Feed', 'Settings', 'Quit'])('no se ve con %s abierta', (overlay) => {
    expect(gearVisible(['World', 'Hud', overlay])).toBe(false);
  });

  it('no se ve si el mundo no está en marcha', () => {
    expect(gearVisible(['Hud'])).toBe(false);
    expect(gearVisible(['Hud', 'Shop'])).toBe(false);
  });

  it('con el aviso de aprender a jugar abierto, el engranaje no se ve; con el tutorial en marcha, sí', () => {
    expect(gearVisible(['World', 'Hud', 'TutorialOffer'])).toBe(false);
    expect(gearVisible(['World', 'Hud', 'Tutorial'])).toBe(true);
  });
});

describe('botón de la clínica (debajo del de la tienda)', () => {
  it('sale andando por el zoo después de la primera vez que se entra en la clínica', () => {
    expect(clinicButtonVisible(['World', 'Hud'], { visits: 1 })).toBe(true);
  });

  it('antes de entrar nunca en la clínica no sale', () => {
    expect(clinicButtonVisible(['World', 'Hud'], { visits: 0 })).toBe(false);
  });

  it('se esconde con una ventana abierta, como la tienda', () => {
    expect(clinicButtonVisible(['World', 'Hud', 'Shop'], { visits: 2 })).toBe(false);
    expect(clinicButtonVisible(['Hud'], { visits: 2 })).toBe(false);
  });
});
