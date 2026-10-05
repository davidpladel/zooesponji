import { describe, expect, it } from 'vitest';
import { initialState, type GameState } from '../../src/core/economy';
import { PENS_ON_SALE, shopEntries } from '../../src/core/shopEntries';
import { PENS } from '../../src/data/pens';

const withCounts = (counts: Partial<GameState['counts']>): GameState => ({
  ...initialState(),
  shopUnlocked: true,
  counts: { ...initialState().counts, ...counts },
});

const summary = (state: GameState) => shopEntries(state).map((e) => `${e.id}:${e.status}`);

describe('shopEntries', () => {
  it('al principio: otra cabra y los tres recintos siguientes (el león no tiene extras)', () => {
    expect(summary(withCounts({}))).toEqual(['extra-cabra:buy', 'pantera:buy', 'panda:buy', 'estanque:buy']);
  });

  it('con la pantera comprada, "otra pantera" ocupa su sitio y asoma el recinto siguiente', () => {
    expect(summary(withCounts({ pantera: 1 }))).toEqual(['extra-cabra:buy', 'extra-pantera:buy', 'panda:buy', 'estanque:buy', 'ovejas:buy']);
  });

  it('nunca hay más de 3 recintos por comprar a la vez', () => {
    const pens = (state: GameState) => shopEntries(state).filter((e) => e.kind === 'pen' && e.status === 'buy');
    expect(pens(withCounts({}))).toHaveLength(PENS_ON_SALE);
    expect(pens(withCounts({ pantera: 1, panda: 1, estanque: 1, ovejas: 1, establo: 1, pinguinos: 1 })).map((e) => e.id)).toEqual([
      'sabana', 'elefantes-africanos', 'elefantes-asiaticos',
    ]);
  });

  it('el "otro animal" de un recinto mixto es el siguiente de su lista, con el precio de su especie', () => {
    const next = (count: number) => shopEntries(withCounts({ establo: count })).find((e) => e.id === 'extra-establo');
    expect(next(1)).toMatchObject({ species: 'gallina', look: 'gallina', cost: 30, count: 1, max: 8 });
    expect(next(2)).toMatchObject({ species: 'caballo', look: 'caballo-lucero', cost: 60 });
  });

  it('al llegar al máximo el extra sale como completo', () => {
    const entries = shopEntries(withCounts({ cabra: 5, pantera: 2 }));
    expect(entries.find((e) => e.id === 'extra-cabra')).toMatchObject({ status: 'full', count: 5, max: 5 });
    expect(entries.find((e) => e.id === 'extra-pantera')).toMatchObject({ status: 'full', cost: 20 });
  });

  it('cada artículo dice su recinto y la especie que hay que dibujar', () => {
    const state = { ...initialState(), coins: 0, shopUnlocked: true };
    const entries = shopEntries(state);
    expect(entries.find((e) => e.id === 'pantera')).toMatchObject({ kind: 'pen', penId: 'pantera', species: 'pantera' });
    expect(entries.find((e) => e.id === 'extra-cabra')).toMatchObject({ kind: 'extra', penId: 'cabra', species: 'cabra', count: 1, max: 5 });
  });


  it('cada artículo dice qué aspecto dibujar: el del animal que llegaría', () => {
    const state = { ...initialState(), coins: 0, shopUnlocked: true };
    const entries = shopEntries(state);
    expect(entries.find((e) => e.id === 'pantera')?.look).toBe(PENS.pantera.residents[0]!.look);
    expect(entries.find((e) => e.id === 'extra-cabra')?.look).toBe(PENS.cabra.residents[1]!.look);
  });
});
