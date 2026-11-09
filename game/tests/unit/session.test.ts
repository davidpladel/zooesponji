import { describe, expect, it, vi } from 'vitest';
import { STARTING_COINS } from '../../src/core/economy';
import { EventBus, type GameEvents } from '../../src/systems/events';
import { Session, getSession, setSession } from '../../src/systems/session';
import { createMemoryStore } from '../../src/systems/storage';

describe('Session', () => {
  it('sin partida guardada empieza con las monedas de inicio', async () => {
    const session = await Session.load(createMemoryStore(), new EventBus<GameEvents>());
    expect(session.state.coins).toBe(STARTING_COINS);
    expect(session.settings.music).toBe(true);
  });

  it('earnCoins emite coins-changed y guarda', async () => {
    const store = createMemoryStore();
    const events = new EventBus<GameEvents>();
    const handler = vi.fn();
    events.on('coins-changed', handler);

    const session = await Session.load(store, events);
    await session.earnCoins(3);

    expect(handler).toHaveBeenCalledWith({ coins: STARTING_COINS + 3 });
    const reloaded = await Session.load(store, new EventBus<GameEvents>());
    expect(reloaded.state.coins).toBe(STARTING_COINS + 3);
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
    expect(fed).toHaveBeenCalledWith({ penId: 'cabra', residentId: 'gordi', foodId: 'carne', reaction: 'rechaza', coins: 0 });
  });

  it('dar de comer a un residente avisa de quién es y de su recinto', async () => {
    const events = new EventBus<GameEvents>();
    const fed: GameEvents['animal-fed'][] = [];
    events.on('animal-fed', (e) => fed.push(e));
    const session = await Session.load(createMemoryStore(), events);
    const result = await session.feed('gordi', 'piedra');
    expect(result).toEqual({ reaction: 'come', coins: 1 });
    expect(fed).toEqual([{ penId: 'cabra', residentId: 'gordi', foodId: 'piedra', reaction: 'come', coins: 1 }]);
  });

  it('dar de comer a un residente que no existe es un error', async () => {
    const session = await Session.load(createMemoryStore(), new EventBus<GameEvents>());
    await expect(session.feed('nadie', 'piedra')).rejects.toThrow('nadie');
  });
});

describe('Session: compras', () => {
  it('comprar un recinto avisa de qué se ha comprado, quién llega y cuánto ha costado', async () => {
    const events = new EventBus<GameEvents>();
    const bought: GameEvents['purchase'][] = [];
    events.on('purchase', (e) => bought.push(e));
    const session = await Session.load(createMemoryStore(), events);
    await session.earnCoins(60);
    expect((await session.buy('pantera')).ok).toBe(true);
    expect(bought).toEqual([{ itemId: 'pantera', penId: 'pantera', residentId: 'noche', cost: 50 }]);
  });

  it('comprar un animal extra avisa de su recinto, de quién llega (el segundo) y de lo que ha costado', async () => {
    const events = new EventBus<GameEvents>();
    const bought: GameEvents['purchase'][] = [];
    events.on('purchase', (e) => bought.push(e));
    const session = await Session.load(createMemoryStore(), events);
    await session.earnCoins(30);
    expect((await session.buy('extra-cabra')).ok).toBe(true);
    expect(bought).toEqual([{ itemId: 'extra-cabra', penId: 'cabra', residentId: 'nube', cost: 10 }]);
  });

  it('una compra que no se puede hacer no avisa', async () => {
    const events = new EventBus<GameEvents>();
    const bought = vi.fn();
    events.on('purchase', bought);
    const session = await Session.load(createMemoryStore(), events);
    expect((await session.buy('pantera')).ok).toBe(false);
    expect(bought).not.toHaveBeenCalled();
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
    expect(session.state.coins).toBe(STARTING_COINS + 20);
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
    expect(reloaded.state.coins).toBe(STARTING_COINS + 5);
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
    expect(session.state.coins).toBe(STARTING_COINS + 1);
  });

  it('comida rechazada no emite coins-changed', async () => {
    const { session, events } = await fresh();
    const handler = vi.fn();
    events.on('coins-changed', handler);
    expect(await session.feed('bills', 'piedra')).toEqual({ reaction: 'rechaza', coins: 0 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('la tienda está abierta desde el principio: no hay aviso de tienda abierta', async () => {
    const { session, events, store } = await fresh();
    const handler = vi.fn();
    events.on('shop-unlocked', handler);
    expect(session.state.shopUnlocked).toBe(true);
    await session.earnCoins(25);
    expect(handler).not.toHaveBeenCalled();
    expect((await fresh(store)).session.state.shopUnlocked).toBe(true);
  });

  it('comprar desbloquea el animal y emite animal-unlocked', async () => {
    const { session, events } = await fresh();
    await session.earnCoins(60);
    const handler = vi.fn();
    events.on('animal-unlocked', handler);
    const result = await session.buy('pantera');
    expect(result.ok).toBe(true);
    expect(handler).toHaveBeenCalledWith({ penId: 'pantera' });
    expect(session.state.coins).toBe(STARTING_COINS + 10);
  });

  it('comprar sin monedas no cambia nada', async () => {
    const { session } = await fresh();
    await session.earnCoins(20);
    expect(await session.buy('panda')).toEqual({ ok: false, error: 'not-enough-coins' });
    expect(session.state.coins).toBe(STARTING_COINS + 20);
  });

  it('updateSettings guarda y emite settings-changed', async () => {
    const { session, events, store } = await fresh();
    const handler = vi.fn();
    events.on('settings-changed', handler);
    await session.updateSettings({ joystick: true });
    expect(handler).toHaveBeenCalledWith({ settings: { music: true, sfx: true, joystick: true, stats: true } });
    const reloaded = await Session.load(store, new EventBus<GameEvents>());
    expect(reloaded.settings.joystick).toBe(true);
  });

  it('el idioma elegido se guarda y se recupera al volver a cargar', async () => {
    const { session, store } = await fresh();
    expect(session.settings.language).toBeUndefined();
    await session.updateSettings({ language: 'en' });
    expect(session.settings.language).toBe('en');
    const again = await Session.load(store, new EventBus<GameEvents>());
    expect(again.settings.language).toBe('en');
  });
});

describe('Session: libro', () => {
  it('setBookPage emite book-page solo cuando cambia de página', async () => {
    const events = new EventBus<GameEvents>();
    const handler = vi.fn();
    events.on('book-page', handler);
    const session = await Session.load(createMemoryStore(), events);

    await session.setBookPage('bills');
    await session.setBookPage('bills');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ pageId: 'bills' });
  });
});

describe('Session: tienda, libro y tutorial', () => {
  it('countShopVisit cuenta cada entrada al momento y la guarda', async () => {
    const store = createMemoryStore();
    const session = await Session.load(store, new EventBus<GameEvents>());
    void session.countShopVisit();
    expect(session.shop.visits).toBe(1);
    await session.countShopVisit();
    expect((await Session.load(store, new EventBus<GameEvents>())).shop.visits).toBe(2);
  });

  it('countClinicVisit cuenta cada entrada en la clínica al momento y la guarda', async () => {
    const store = createMemoryStore();
    const session = await Session.load(store, new EventBus<GameEvents>());
    void session.countClinicVisit();
    expect(session.clinicVisits.visits).toBe(1);
    await session.countClinicVisit();
    expect((await Session.load(store, new EventBus<GameEvents>())).clinicVisits.visits).toBe(2);
  });

  it('markBookOpened y markTutorialOffered se guardan y la segunda vez no escriben', async () => {
    const store = createMemoryStore();
    const session = await Session.load(store, new EventBus<GameEvents>());
    await session.markBookOpened();
    await session.markTutorialOffered();
    const reloaded = await Session.load(store, new EventBus<GameEvents>());
    expect(reloaded.book.opened).toBe(true);
    expect(reloaded.tutorial.offered).toBe(true);
    const set = vi.spyOn(store, 'set');
    await session.markBookOpened();
    await session.markTutorialOffered();
    expect(set).not.toHaveBeenCalled();
  });
});

describe('Session: Luna', () => {
  it('comprar a Luna avisa con pet-bought y no con purchase', async () => {
    const events = new EventBus<GameEvents>();
    const pet = vi.fn();
    const bought = vi.fn();
    events.on('pet-bought', pet);
    events.on('purchase', bought);
    const session = await Session.load(createMemoryStore(), events);
    await session.earnCoins(80);
    const result = await session.buy('luna');
    expect(result.ok).toBe(true);
    expect(session.state.luna).toBe(true);
    expect(pet).toHaveBeenCalledWith({ petId: 'luna', cost: 67 });
    expect(bought).not.toHaveBeenCalled();
  });
});

describe('Session: suciedad y enfermedades', () => {
  it('empieza todo limpio y sano', async () => {
    const session = await Session.load(createMemoryStore(), new EventBus<GameEvents>());
    expect(session.care).toEqual({ dirty: [], sick: [], muddy: [] });
  });

  it('setCare guarda y avisa con care-changed', async () => {
    const store = createMemoryStore();
    const events = new EventBus<GameEvents>();
    const handler = vi.fn();
    events.on('care-changed', handler);
    const session = await Session.load(store, events);
    await session.update((s) => ({ ...s, counts: { ...s.counts, cerdos: 2 } }));
    await session.setCare({ dirty: ['rosita'], sick: [], muddy: ['cerdos'] });
    expect(handler).toHaveBeenCalledTimes(1);
    const reloaded = await Session.load(store, new EventBus<GameEvents>());
    expect(reloaded.care).toEqual({ dirty: ['rosita'], sick: [], muddy: ['cerdos'] });
  });
});

describe('Session: limpiar', () => {
  async function dirtyPig(events = new EventBus<GameEvents>()) {
    const store = createMemoryStore();
    const session = await Session.load(store, events);
    await session.update((s) => ({ ...s, counts: { ...s.counts, cerdos: 2 } }));
    await session.setCare({ dirty: ['rosita', 'morrito'], sick: [], muddy: ['cerdos'] });
    return { session, store };
  }

  it('limpiar paga lo que da comer, lo deja limpio y avisa con animal-cleaned', async () => {
    const events = new EventBus<GameEvents>();
    const cleaned = vi.fn();
    events.on('animal-cleaned', cleaned);
    const { session } = await dirtyPig(events);
    const before = session.state.coins;
    expect(await session.cleanAnimal('rosita')).toBe(4);
    expect(session.state.coins).toBe(before + 4);
    expect(session.care).toEqual({ dirty: ['morrito'], sick: [], muddy: ['cerdos'] });
    expect(cleaned).toHaveBeenCalledWith({ penId: 'cerdos', residentId: 'rosita', coins: 4 });
  });

  it('el último sucio deja el charco limpio (avisa con puddle-clean), y limpiar a uno limpio no paga dos veces', async () => {
    const events = new EventBus<GameEvents>();
    const clear = vi.fn();
    events.on('puddle-clean', clear);
    const { session } = await dirtyPig(events);
    await session.cleanAnimal('rosita');
    expect(clear).not.toHaveBeenCalled();
    await session.cleanAnimal('morrito');
    expect(session.care.muddy).toEqual([]);
    expect(clear).toHaveBeenCalledWith({ penId: 'cerdos' });
    const coins = session.state.coins;
    expect(await session.cleanAnimal('morrito')).toBe(0);
    expect(session.state.coins).toBe(coins);
  });
});

describe('Session: comprar la clínica', () => {
  it('avisa con building-bought y no con purchase', async () => {
    const events = new EventBus<GameEvents>();
    const building = vi.fn();
    const purchase = vi.fn();
    events.on('building-bought', building);
    events.on('purchase', purchase);
    const session = await Session.load(createMemoryStore(), events);
    await session.earnCoins(700);
    expect((await session.buy('clinic')).ok).toBe(true);
    expect(building).toHaveBeenCalledWith({ buildingId: 'clinica', cost: 650 });
    expect(purchase).not.toHaveBeenCalled();
  });
});

describe('Session: curar', () => {
  it('curar paga lo que da comer, lo quita de enfermos y avisa con animal-cured; el otro sigue malito', async () => {
    const events = new EventBus<GameEvents>();
    const cured = vi.fn();
    events.on('animal-cured', cured);
    const session = await Session.load(createMemoryStore(), events);
    await session.update((s) => ({ ...s, clinic: true, counts: { ...s.counts, cerdos: 1, 'elefantes-africanos': 1 } }));
    await session.setCare({ dirty: [], sick: ['tembo', 'rosita'], muddy: [] });
    const before = session.state.coins;
    expect(await session.cureAnimal('tembo')).toBe(10);
    expect(session.state.coins).toBe(before + 10);
    expect(session.care.sick).toEqual(['rosita']);
    expect(cured).toHaveBeenCalledWith({ penId: 'elefantes-africanos', residentId: 'tembo', coins: 10 });
    expect(await session.cureAnimal('tembo')).toBe(0);
    expect(session.state.coins).toBe(before + 10);
  });
});
