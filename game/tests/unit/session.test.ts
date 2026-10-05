import { describe, expect, it, vi } from 'vitest';
import { EventBus, type GameEvents } from '../../src/systems/events';
import { Session, getSession, setSession } from '../../src/systems/session';
import { createMemoryStore } from '../../src/systems/storage';

describe('Session', () => {
  it('sin partida guardada empieza con 0 monedas', async () => {
    const session = await Session.load(createMemoryStore(), new EventBus<GameEvents>());
    expect(session.state.coins).toBe(0);
    expect(session.settings.music).toBe(true);
  });

  it('earnCoins emite coins-changed y guarda', async () => {
    const store = createMemoryStore();
    const events = new EventBus<GameEvents>();
    const handler = vi.fn();
    events.on('coins-changed', handler);

    const session = await Session.load(store, events);
    await session.earnCoins(3);

    expect(handler).toHaveBeenCalledWith({ coins: 3 });
    const reloaded = await Session.load(store, new EventBus<GameEvents>());
    expect(reloaded.state.coins).toBe(3);
  });

  it('update sin cambio de monedas no emite coins-changed', async () => {
    const events = new EventBus<GameEvents>();
    const handler = vi.fn();
    events.on('coins-changed', handler);
    const session = await Session.load(createMemoryStore(), events);
    await session.update((s) => ({ ...s, shopUnlocked: true }));
    expect(handler).not.toHaveBeenCalled();
    expect(session.state.shopUnlocked).toBe(true);
  });
});

describe('Session: dar de comer', () => {
  it('emite animal-fed con la reacción', async () => {
    const events = new EventBus<GameEvents>();
    const fed = vi.fn();
    events.on('animal-fed', fed);
    const session = await Session.load(createMemoryStore(), events);
    await session.feed('gordi', 'carne');
    expect(fed).toHaveBeenCalledWith({ penId: 'cabra', residentId: 'gordi', reaction: 'rechaza' });
  });

  it('dar de comer a un residente avisa de quién es y de su recinto', async () => {
    const events = new EventBus<GameEvents>();
    const fed: GameEvents['animal-fed'][] = [];
    events.on('animal-fed', (e) => fed.push(e));
    const session = await Session.load(createMemoryStore(), events);
    const result = await session.feed('gordi', 'piedra');
    expect(result).toEqual({ reaction: 'come', coins: 1 });
    expect(fed).toEqual([{ penId: 'cabra', residentId: 'gordi', reaction: 'come' }]);
  });

  it('dar de comer a un residente que no existe es un error', async () => {
    const session = await Session.load(createMemoryStore(), new EventBus<GameEvents>());
    await expect(session.feed('nadie', 'piedra')).rejects.toThrow('nadie');
  });
});

describe('Session: animales extra', () => {
  it('comprar otra cabra emite animal-added y no animal-unlocked', async () => {
    const events = new EventBus<GameEvents>();
    const added = vi.fn();
    const unlocked = vi.fn();
    events.on('animal-added', added);
    events.on('animal-unlocked', unlocked);
    const session = await Session.load(createMemoryStore(), events);
    await session.earnCoins(30);
    const result = await session.buy('extra-cabra');
    expect(result.ok).toBe(true);
    expect(added).toHaveBeenCalledWith({ penId: 'cabra', count: 2, residentId: 'nube' });
    expect(unlocked).not.toHaveBeenCalled();
    expect(session.state.coins).toBe(20);
  });
});

describe('Session.saveIfValid', () => {
  it('guarda un estado válido', async () => {
    const store = createMemoryStore();
    const session = await Session.load(store, new EventBus<GameEvents>());
    await session.update((s) => ({ ...s, coins: 7 }));
    expect(await session.saveIfValid()).toBe(true);
  });

  it('no sobrescribe el último guardado con un estado corrupto', async () => {
    const store = createMemoryStore();
    const session = await Session.load(store, new EventBus<GameEvents>());
    await session.earnCoins(5);
    // Estado corrupto en memoria (p. ej. tras un fallo): monedas no válidas.
    (session as unknown as { data: { state: { coins: number } } }).data.state.coins = Number.NaN;
    expect(await session.saveIfValid()).toBe(false);
    const reloaded = await Session.load(store, new EventBus<GameEvents>());
    expect(reloaded.state.coins).toBe(5);
  });
});

describe('getSession / setSession', () => {
  it('getSession devuelve la sesión registrada', async () => {
    const session = await Session.load(createMemoryStore(), new EventBus<GameEvents>());
    setSession(session);
    expect(getSession()).toBe(session);
  });
});

describe('Session: dar de comer, comprar y ajustes', () => {
  async function fresh(store = createMemoryStore()) {
    const events = new EventBus<GameEvents>();
    const session = await Session.load(store, events);
    return { session, events, store };
  }

  it('dar comida que le gusta suma monedas', async () => {
    const { session } = await fresh();
    expect(await session.feed('bills', 'carne')).toEqual({ reaction: 'come', coins: 1 });
    expect(session.state.coins).toBe(1);
  });

  it('comida rechazada no emite coins-changed', async () => {
    const { session, events } = await fresh();
    const handler = vi.fn();
    events.on('coins-changed', handler);
    expect(await session.feed('bills', 'piedra')).toEqual({ reaction: 'rechaza', coins: 0 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('emite shop-unlocked una sola vez al llegar a 20', async () => {
    const { session, events } = await fresh();
    const handler = vi.fn();
    events.on('shop-unlocked', handler);
    await session.earnCoins(19);
    await session.earnCoins(1);
    await session.earnCoins(5);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('no repite shop-unlocked al gastar y volver a juntar 20, ni tras recargar la partida', async () => {
    const { session, events, store } = await fresh();
    const handler = vi.fn();
    events.on('shop-unlocked', handler);
    await session.earnCoins(20);
    expect((await session.buy('extra-cabra')).ok).toBe(true);
    expect(session.state.coins).toBe(10);
    await session.earnCoins(10);
    expect(handler).toHaveBeenCalledTimes(1);

    // Otra compra y se cierra el juego con menos de 20: al volver, la tienda sigue abierta.
    expect((await session.buy('extra-cabra')).ok).toBe(true);
    const reloaded = await fresh(store);
    const again = vi.fn();
    reloaded.events.on('shop-unlocked', again);
    expect(reloaded.session.state).toMatchObject({ coins: 10, shopUnlocked: true });
    await reloaded.session.earnCoins(10);
    expect(again).not.toHaveBeenCalled();
  });

  it('comprar desbloquea el animal y emite animal-unlocked', async () => {
    const { session, events } = await fresh();
    await session.earnCoins(60);
    const handler = vi.fn();
    events.on('animal-unlocked', handler);
    const result = await session.buy('pantera');
    expect(result.ok).toBe(true);
    expect(handler).toHaveBeenCalledWith({ penId: 'pantera' });
    expect(session.state.coins).toBe(10);
  });

  it('comprar sin monedas no cambia nada', async () => {
    const { session } = await fresh();
    await session.earnCoins(20);
    expect(await session.buy('panda')).toEqual({ ok: false, error: 'not-enough-coins' });
    expect(session.state.coins).toBe(20);
  });

  it('updateSettings guarda y emite settings-changed', async () => {
    const { session, events, store } = await fresh();
    const handler = vi.fn();
    events.on('settings-changed', handler);
    await session.updateSettings({ joystick: true });
    expect(handler).toHaveBeenCalledWith({ settings: { music: true, sfx: true, joystick: true } });
    const reloaded = await Session.load(store, new EventBus<GameEvents>());
    expect(reloaded.settings.joystick).toBe(true);
  });
});
