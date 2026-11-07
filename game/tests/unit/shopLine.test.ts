import { describe, expect, it } from 'vitest';
import { shopkeeperLine } from '../../src/core/shopLine';
import type { ShopEntry } from '../../src/core/shopEntries';
import { LANGUAGES } from '../../src/systems/language';
import { STRINGS } from '../../src/data/strings';

const panda: ShopEntry = { id: 'panda', kind: 'pen', penId: 'panda', species: 'panda', look: 'panda', cost: 100, status: 'buy' };
const luna: ShopEntry = { id: 'luna', kind: 'pet', look: 'luna', cost: 67, status: 'buy' };

describe('lo que dice la tendera al mirar un animal', () => {
  it('si llega el dinero, cuenta algo del animal', () => {
    expect(shopkeeperLine(panda, 100)).toEqual({ key: 'shop.about.panda' });
    expect(shopkeeperLine(luna, 70)).toEqual({ key: 'shop.about.luna' });
  });

  it('si no llega, dice cuántas monedas faltan y cómo se ganan', () => {
    expect(shopkeeperLine(panda, 0)).toEqual({ key: 'shop.needCoinsHow', params: { n: 100 } });
    expect(shopkeeperLine(luna, 60)).toEqual({ key: 'shop.needCoinsHow', params: { n: 7 } });
  });

  it('lo que ya es tuyo o ya no cabe se dice igual que antes', () => {
    expect(shopkeeperLine({ ...panda, status: 'owned' }, 0)).toEqual({ key: 'shop.owned' });
    expect(shopkeeperLine({ ...panda, status: 'full' }, 0)).toEqual({ key: 'shop.full' });
  });

  it('el aviso de monedas que faltan lleva el número en todos los idiomas', () => {
    for (const lang of LANGUAGES) {
      const text = STRINGS[lang]['shop.needCoinsHow'];
      expect(text, lang).toContain('{n}');
    }
  });
});
