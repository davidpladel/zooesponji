import { describe, expect, it } from 'vitest';
import { initialState, type GameState } from '../../src/core/economy';
import { SHOP_SLOTS, shopEntries } from '../../src/core/shopEntries';
import { PENS } from '../../src/data/pens';

const withCounts = (counts: Partial<GameState['counts']>): GameState => ({
  ...initialState(),
  shopUnlocked: true,
  counts: { ...initialState().counts, ...counts },
});

const summary = (state: GameState) => shopEntries(state).map((e) => `${e.id}:${e.status}`);

describe('shopEntries', () => {
  it('al principio: los cinco más baratos, de menor a mayor precio', () => {
    expect(shopEntries(withCounts({})).map((e) => `${e.id}:${e.cost}`)).toEqual([
      'extra-cabra:10', 'pantera:50', 'panda:100', 'estanque:150', 'ovejas:250',
    ]);
  });

  it('nunca hay más de 5 artículos', () => {
    const all = { pantera: 1, panda: 1, estanque: 1, ovejas: 1, establo: 1, pinguinos: 1, sabana: 1, 'elefantes-africanos': 1, 'elefantes-asiaticos': 1 };
    expect(shopEntries(withCounts(all))).toHaveLength(SHOP_SLOTS);
  });

  it('al comprar un recinto, su "otro animal" entra por su precio y lo caro espera', () => {
    expect(summary(withCounts({ pantera: 1 }))).toEqual(['extra-cabra:buy', 'extra-pantera:buy', 'panda:buy', 'estanque:buy', 'ovejas:buy']);
  });

  it('a igual precio manda el orden de los recintos', () => {
    // Otro pato (30) y otra gallina del establo (30): primero el estanque.
    const ids = shopEntries(withCounts({ cabra: 5, pantera: 2, panda: 2, estanque: 1, establo: 1 })).map((e) => e.id);
    expect(ids.slice(0, 2)).toEqual(['extra-estanque', 'extra-establo']);
  });

  it('lo completo no ocupa sitio mientras haya 5 cosas que comprar', () => {
    expect(summary(withCounts({ cabra: 5, pantera: 2 }))).not.toContain('extra-cabra:full');
  });

  it('cuando quedan menos de 5 cosas que comprar, lo completo rellena los huecos como AGOTADO', () => {
    const done = { cabra: 5, pantera: 2, panda: 2, estanque: 5, ovejas: 5, establo: 8, pinguinos: 5, sabana: 8, 'elefantes-africanos': 2, 'elefantes-asiaticos': 1 };
    expect(summary(withCounts(done))).toEqual(['extra-elefantes-asiaticos:buy', 'extra-cabra:full', 'extra-pantera:full', 'extra-panda:full', 'extra-estanque:full']);
    const cabra = shopEntries(withCounts(done)).find((e) => e.id === 'extra-cabra');
    expect(cabra).toMatchObject({ status: 'full', count: 5, max: 5, cost: 10 });
  });

  it('el "otro animal" de un recinto mixto es el siguiente de su lista, con el precio de su especie', () => {
    const next = (count: number) =>
      shopEntries(withCounts({ cabra: 5, pantera: 2, panda: 2, establo: count })).find((e) => e.id === 'extra-establo');
    expect(next(1)).toMatchObject({ species: 'gallina', look: 'gallina', cost: 30, count: 1, max: 8 });
    expect(next(2)).toMatchObject({ species: 'caballo', look: 'caballo-lucero', cost: 60 });
  });

  it('cada artículo dice su recinto y la especie que hay que dibujar', () => {
    const entries = shopEntries(withCounts({}));
    expect(entries.find((e) => e.id === 'pantera')).toMatchObject({ kind: 'pen', penId: 'pantera', species: 'pantera' });
    expect(entries.find((e) => e.id === 'extra-cabra')).toMatchObject({ kind: 'extra', penId: 'cabra', species: 'cabra', count: 1, max: 5 });
  });

  it('cada artículo dice qué aspecto dibujar: el del animal que llegaría', () => {
    const entries = shopEntries(withCounts({}));
    expect(entries.find((e) => e.id === 'pantera')?.look).toBe(PENS.pantera.residents[0]!.look);
    expect(entries.find((e) => e.id === 'extra-cabra')?.look).toBe(PENS.cabra.residents[1]!.look);
  });
});
