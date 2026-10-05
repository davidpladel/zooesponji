import { describe, expect, it } from 'vitest';
import { addCoins, penCount, buyExtra, initialState, isPenOpen, purchase, openPens, type GameState } from '../../src/core/economy';
import { PENS } from '../../src/data/pens';

function withCoins(coins: number, extra: Partial<GameState> = {}): GameState {
  return { ...initialState(), coins, shopUnlocked: coins >= 20, ...extra };
}

describe('initialState', () => {
  it('empieza con 0 monedas, león y cabra, y tienda cerrada', () => {
    expect(initialState()).toEqual({
      coins: 0,
      counts: { leon: 1, cabra: 1, pantera: 0, panda: 0, estanque: 0, ovejas: 0, establo: 0, pinguinos: 0, sabana: 0, 'elefantes-africanos': 0, 'elefantes-asiaticos': 0 },
      shopUnlocked: false,
    });
  });
});

describe('addCoins', () => {
  it('suma monedas', () => {
    expect(addCoins(addCoins(initialState(), 1), 2).coins).toBe(3);
  });

  it('abre la tienda justo al alcanzar 20', () => {
    expect(addCoins(withCoins(18), 1).shopUnlocked).toBe(false);
    expect(addCoins(withCoins(19), 1).shopUnlocked).toBe(true);
  });

  it('no modifica el estado original', () => {
    const state = initialState();
    addCoins(state, 5);
    expect(state.coins).toBe(0);
  });

  it.each([-1, 1.5, Number.NaN])('rechaza cantidades no válidas (%s)', (amount) => {
    expect(() => addCoins(initialState(), amount)).toThrow();
  });
});

describe('isPenOpen', () => {
  it('un recinto está abierto si tiene al menos un animal', () => {
    expect(isPenOpen(initialState(), 'leon')).toBe(true);
    expect(isPenOpen(initialState(), 'panda')).toBe(false);
    expect(openPens(initialState())).toEqual(['leon', 'cabra']);
  });
});

describe('purchase', () => {
  it('compra la pantera: descuenta 50 y la desbloquea', () => {
    const result = purchase(withCoins(60), 'pantera');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.coins).toBe(10);
    expect(penCount(result.state, 'pantera')).toBe(1);
  });

  it('la tienda sigue abierta después de gastar por debajo de 20', () => {
    const result = purchase(withCoins(60), 'pantera');
    expect(result.ok && result.state.shopUnlocked).toBe(true);
  });

  it('falla si no hay monedas suficientes', () => {
    expect(purchase(withCoins(99), 'panda')).toEqual({ ok: false, error: 'not-enough-coins' });
  });

  it('falla si la tienda está cerrada', () => {
    expect(purchase(withCoins(60, { shopUnlocked: false }), 'pantera')).toEqual({
      ok: false,
      error: 'shop-locked',
    });
  });

  it('falla si ya lo tienes', () => {
    const owned = withCoins(200, { counts: { ...initialState().counts, pantera: 1 } });
    expect(purchase(owned, 'pantera')).toEqual({ ok: false, error: 'already-owned' });
  });

  it('falla con un producto desconocido', () => {
    expect(purchase(withCoins(200), 'delfines')).toEqual({ ok: false, error: 'unknown-item' });
  });

  it('no modifica el estado original', () => {
    const state = withCoins(60);
    purchase(state, 'pantera');
    expect(state.coins).toBe(60);
    expect(openPens(state)).toEqual(['leon', 'cabra']);
  });
});

describe('buyExtra', () => {
  it('compra otra cabra por 10 monedas', () => {
    const result = buyExtra(withCoins(25), 'cabra');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.coins).toBe(15);
    expect(penCount(result.state, 'cabra')).toBe(2);
  });

  it('no deja pasar del máximo (5 cabras)', () => {
    const full = withCoins(100, { counts: { ...initialState().counts, cabra: 5 } });
    expect(buyExtra(full, 'cabra')).toEqual({ ok: false, error: 'pen-full' });
  });

  it('el león no tiene extras', () => {
    expect(buyExtra(withCoins(100), 'leon')).toEqual({ ok: false, error: 'pen-full' });
  });

  it('con el recinto cerrado no se puede', () => {
    expect(buyExtra(withCoins(100), 'pantera')).toEqual({ ok: false, error: 'pen-closed' });
  });

  it('la segunda pantera cuesta 20', () => {
    const open = withCoins(19, { shopUnlocked: true, counts: { ...initialState().counts, pantera: 1 } });
    expect(buyExtra(open, 'pantera')).toEqual({ ok: false, error: 'not-enough-coins' });
    const result = buyExtra({ ...open, coins: 20 }, 'pantera');
    expect(result.ok && result.state.coins).toBe(0);
  });

  it('falla si la tienda está cerrada', () => {
    expect(buyExtra(withCoins(50, { shopUnlocked: false }), 'cabra')).toEqual({ ok: false, error: 'shop-locked' });
  });
});

describe('comprar por recinto', () => {
  const rich = (): GameState => ({ ...initialState(), coins: 1000, shopUnlocked: true });

  it('comprar un recinto trae solo su primer residente', () => {
    const result = purchase(rich(), 'pantera');
    expect(result.ok && result.state.counts.pantera).toBe(1);
  });

  it('el extra cuesta lo que marca la especie del siguiente residente', () => {
    const result = buyExtra(rich(), 'cabra');
    expect(result.ok && result.state.coins).toBe(1000 - 10);
    expect(result.ok && result.state.counts.cabra).toBe(2);
  });

  it('un recinto lleno no admite más', () => {
    const full = { ...rich(), counts: { ...rich().counts, cabra: PENS.cabra.residents.length } };
    expect(buyExtra(full, 'cabra')).toEqual({ ok: false, error: 'pen-full' });
    expect(buyExtra(rich(), 'leon')).toEqual({ ok: false, error: 'pen-full' });
  });

  it('comprar un recinto mixto trae solo su primer animal, y cada extra cuesta lo de su especie', () => {
    let state: GameState = { ...initialState(), coins: 1000, shopUnlocked: true };
    const buy = (item: string) => {
      const result = purchase(state, item);
      if (!result.ok) throw new Error(result.error);
      state = result.state;
    };
    buy('establo');
    expect([state.counts.establo, state.coins]).toEqual([1, 600]);
    buy('extra-establo'); // Pepa, gallina: 30
    buy('extra-establo'); // Lucero, caballo: 60
    expect([state.counts.establo, state.coins]).toEqual([3, 510]);
  });
});
