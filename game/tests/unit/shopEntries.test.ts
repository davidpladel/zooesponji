import { describe, expect, it } from 'vitest';
import { initialState, type GameState } from '../../src/core/economy';
import { shopEntries } from '../../src/core/shopEntries';

const withCounts = (counts: Partial<GameState['counts']>): GameState => ({
  ...initialState(),
  shopUnlocked: true,
  counts: { ...initialState().counts, ...counts },
});

const summary = (state: GameState) => shopEntries(state).map((e) => `${e.id}:${e.status}`);

describe('shopEntries', () => {
  it('al principio: otra cabra y los dos recintos (el león no tiene extras)', () => {
    expect(summary(withCounts({}))).toEqual(['extra-cabra:buy', 'pantera:buy', 'panda:buy']);
  });

  it('con la pantera comprada aparece "otra pantera"', () => {
    expect(summary(withCounts({ pantera: 1 }))).toEqual([
      'extra-cabra:buy',
      'pantera:owned',
      'extra-pantera:buy',
      'panda:buy',
    ]);
  });

  it('al llegar al máximo el extra sale como completo', () => {
    const entries = shopEntries(withCounts({ cabra: 5, pantera: 2 }));
    expect(entries.find((e) => e.id === 'extra-cabra')).toMatchObject({ status: 'full', count: 5, max: 5 });
    expect(entries.find((e) => e.id === 'extra-pantera')).toMatchObject({ status: 'full', cost: 20 });
  });
});
