// game/tests/unit/analyticsEvents.test.ts
import { describe, expect, it } from 'vitest';
import { initialState, type GameState } from '../../src/core/economy';
import { REACH_KEY } from '../../src/core/reach';
import { defaultBook, defaultSettings, type KeyValueStore } from '../../src/core/save';
import { GameTracker, knownSteps } from '../../src/systems/analyticsEvents';
import { EventBus, type GameEvents } from '../../src/systems/events';
import { createMemoryStore } from '../../src/systems/storage';

function setup(opts: { state?: GameState; store?: KeyValueStore; active?: boolean } = {}) {
  const events = new EventBus<GameEvents>();
  const store = opts.store ?? createMemoryStore();
  const clock = { time: new Date(2026, 9, 7, 10, 0, 0).getTime() };
  const sent: string[] = [];
  const values = new Map<string, number | undefined>();
  const sink = {
    active: opts.active ?? true,
    event(category: string, action: string, name?: string, value?: number): void {
      const key = [category, action, ...(name === undefined ? [] : [name])].join(' | ');
      sent.push(key);
      values.set(key, value);
    },
  };
  const state = opts.state ?? initialState();
  const tracker = new GameTracker({
    sink,
    events,
    store,
    now: () => new Date(clock.time),
    state: () => state,
    settings: defaultSettings,
    book: defaultBook,
  });
  const fed = (residentId: string, foodId: GameEvents['animal-fed']['foodId'], reaction: GameEvents['animal-fed']['reaction'], coins: number) =>
    events.emit('animal-fed', { penId: 'cabra', residentId, foodId, reaction, coins });
  return { tracker, events, store, clock, sent, values, fed };
}

describe('GameTracker: comer', () => {
  it('una ventana con comidas cuenta cada comida, el total y el tiempo', async () => {
    const t = setup();
    await t.tracker.start();
    t.events.emit('animal-tapped', { residentId: 'gordi' });
    t.events.emit('feed-opened', { residentId: 'gordi' });
    t.fed('gordi', 'zanahoria', 'come', 1);
    t.fed('gordi', 'carne', 'rechaza', 0);
    t.events.emit('food-missed', { residentId: 'gordi', foodId: 'lechuga' });
    t.clock.time += 12_000;
    t.events.emit('feed-closed', { residentId: 'gordi' });

    expect(t.sent).toEqual(expect.arrayContaining([
      'comer | toca-animal | cabra/gordi',
      'comer | ventana | cabra/gordi',
      'comer | come | cabra/gordi/zanahoria',
      'comer | rechaza | cabra/gordi/carne',
      'comer | fuera | cabra/gordi/lechuga',
      'comer | ventana-fin | cabra/gordi',
      'comer | ventana-tiempo | cabra/gordi',
    ]));
    expect(t.values.get('comer | come | cabra/gordi/zanahoria')).toBe(1);
    expect(t.values.get('comer | rechaza | cabra/gordi/carne')).toBeUndefined();
    expect(t.values.get('comer | ventana-fin | cabra/gordi')).toBe(2);
    expect(t.values.get('comer | ventana-tiempo | cabra/gordi')).toBe(12);
    expect(t.sent).not.toContain('comer | ventana-vacia | cabra/gordi');
  });

  it('cerrar sin dar nada es una ventana vacía', async () => {
    const t = setup();
    await t.tracker.start();
    t.events.emit('feed-opened', { residentId: 'bills' });
    t.events.emit('feed-closed', { residentId: 'bills' });
    expect(t.sent).toContain('comer | ventana-vacia | leon/bills');
    expect(t.values.get('comer | ventana-fin | leon/bills')).toBe(0);
  });

  it('la reacción especial se descubre una vez por especie y comida', async () => {
    const t = setup();
    await t.tracker.start();
    t.fed('gordi', 'conejo', 'especial', 2);
    t.fed('gordi', 'conejo', 'especial', 2);
    expect(t.sent.filter((k) => k === 'alcance | vida-especial | cabra/conejo')).toHaveLength(1);
  });
});

describe('GameTracker: alcance y embudo', () => {
  it('la primera comida del día a un animal cuenta una vez; al día siguiente, otra vez para el día', async () => {
    const t = setup();
    await t.tracker.start();
    t.fed('gordi', 'zanahoria', 'come', 1);
    t.fed('gordi', 'zanahoria', 'come', 1);
    expect(t.sent.filter((k) => k === 'alcance | dia-animal | cabra/gordi')).toHaveLength(1);
    expect(t.sent).toEqual(expect.arrayContaining([
      'alcance | semana-animal | cabra/gordi', 'alcance | vida-animal | cabra/gordi',
      'alcance | dia-comida | zanahoria', 'embudo | primera-comida',
    ]));
    t.clock.time += 24 * 3_600_000;
    t.fed('gordi', 'zanahoria', 'come', 1);
    expect(t.sent.filter((k) => k === 'alcance | dia-animal | cabra/gordi')).toHaveLength(2);
    expect(t.sent.filter((k) => k === 'alcance | vida-animal | cabra/gordi')).toHaveLength(1);
    expect(t.sent.filter((k) => k === 'embudo | primera-comida')).toHaveLength(1);
  });

  it('el paso del embudo lleva los minutos de juego acumulados', async () => {
    const t = setup();
    await t.tracker.start();
    t.tracker.sessionStarted([]);
    t.clock.time += 100_000;
    t.tracker.goingBackground(100);
    t.tracker.resumed();
    t.clock.time += 50_000;
    t.fed('gordi', 'zanahoria', 'come', 1);
    expect(t.values.get('embudo | primera-comida')).toBe(2);
  });

  it('lo guardado se recuerda al volver a abrir', async () => {
    const store = createMemoryStore();
    const first = setup({ store });
    await first.tracker.start();
    first.fed('gordi', 'zanahoria', 'come', 1);
    await Promise.resolve();
    expect(await store.get(REACH_KEY)).toContain('animal:cabra/gordi');

    const second = setup({ store });
    await second.tracker.start();
    second.fed('gordi', 'zanahoria', 'come', 1);
    expect(second.sent).not.toContain('alcance | dia-animal | cabra/gordi');
    expect(second.sent).toContain('comer | come | cabra/gordi/zanahoria');
  });

  it('si el almacén falla no hay alcance ni embudo, pero sí el detalle', async () => {
    const store: KeyValueStore = { get: () => Promise.reject(new Error('roto')), set: () => Promise.resolve() };
    const t = setup({ store });
    await t.tracker.start();
    t.fed('gordi', 'zanahoria', 'come', 1);
    expect(t.sent).toEqual(['comer | come | cabra/gordi/zanahoria']);
  });

  it('en una partida que ya iba avanzada, los pasos ya dados no se avisan', async () => {
    const state: GameState = { ...initialState(), coins: 30, shopUnlocked: true };
    expect(knownSteps(state, defaultBook())).toEqual(['primer-paso', 'primer-toque-animal', 'primera-ventana', 'primera-comida', 'tienda-abierta']);
    const t = setup({ state });
    await t.tracker.start();
    t.fed('gordi', 'zanahoria', 'come', 1);
    t.events.emit('shop-unlocked', {});
    expect(t.sent.some((k) => k.startsWith('embudo'))).toBe(false);
  });

  it('una partida nueva no tiene pasos dados', () => {
    expect(knownSteps(initialState(), defaultBook())).toEqual([]);
  });
});

describe('GameTracker: mapa', () => {
  it('visitas, recintos cerrados, puerta de la tienda y forma de moverse', async () => {
    const t = setup();
    await t.tracker.start();
    t.events.emit('pen-near', { penId: 'leon', locked: false });
    t.events.emit('pen-near', { penId: 'panda', locked: true });
    t.events.emit('locked-tap', { penId: 'panda' });
    t.events.emit('shop-locked', { missing: 14 });
    t.events.emit('control-used', { mode: 'toque' });
    t.events.emit('control-used', { mode: 'toque' });
    expect(t.sent).toEqual(expect.arrayContaining([
      'mapa | cerca | leon', 'alcance | dia-recinto | leon', 'mapa | cerca-cerrado | panda',
      'mapa | toca-cerrado | panda', 'mapa | tienda-cerrada', 'mapa | control | toque', 'embudo | primer-paso',
    ]));
    expect(t.sent).not.toContain('alcance | dia-recinto | panda');
    expect(t.values.get('mapa | tienda-cerrada')).toBe(14);
    expect(t.sent.filter((k) => k === 'mapa | control | toque')).toHaveLength(1);
  });
});

describe('GameTracker: tienda', () => {
  it('mirar, no llegar, comprar y salir', async () => {
    const t = setup();
    await t.tracker.start();
    t.events.emit('shop-opened', {});
    t.events.emit('shop-look', { itemId: 'pantera' });
    t.events.emit('shop-look', { itemId: 'pantera' });
    t.events.emit('shop-denied', { itemId: 'panda', missing: 40 });
    t.events.emit('purchase', { itemId: 'pantera', penId: 'pantera', residentId: 'noche', cost: 50 });
    t.clock.time += 30_000;
    t.events.emit('shop-closed', {});
    expect(t.sent.filter((k) => k === 'tienda | mira | pantera')).toHaveLength(1);
    expect(t.values.get('tienda | sin-monedas | panda')).toBe(40);
    expect(t.values.get('tienda | compra | pantera/noche')).toBe(50);
    expect(t.values.get('tienda | tienda-fin')).toBe(30);
    expect(t.sent).toEqual(expect.arrayContaining(['embudo | primera-tienda', 'embudo | primera-compra']));
    expect(t.sent).not.toContain('tienda | tienda-sin-compra');
  });

  it('salir sin comprar', async () => {
    const t = setup();
    await t.tracker.start();
    t.events.emit('shop-opened', {});
    t.events.emit('shop-closed', {});
    expect(t.sent).toContain('tienda | tienda-sin-compra');
  });
});

describe('GameTracker: libro', () => {
  it('leer, hojear, páginas bloqueadas y cierre', async () => {
    const t = setup();
    await t.tracker.start();
    t.events.emit('book-opened', { pageId: 'cover' });
    t.events.emit('book-page-shown', { pageId: 'index', kind: 'paso' });
    t.events.emit('book-index', { chapter: 'centro' });
    t.events.emit('book-page-shown', { pageId: 'bills', kind: 'contenido' });
    // La misma página otra vez (al girar el móvil la escena se monta de nuevo): no cuenta.
    t.events.emit('book-page-shown', { pageId: 'bills', kind: 'contenido' });
    t.clock.time += 5_400;
    t.events.emit('book-page-shown', { pageId: 'sasha', kind: 'contenido' });
    t.clock.time += 400;
    t.events.emit('book-page-shown', { pageId: 'noche', kind: 'bloqueada' });
    t.clock.time += 3_000;
    t.events.emit('book-closed', {});

    expect(t.sent).toEqual(expect.arrayContaining([
      'libro | abre | cover', 'libro | indice | centro', 'libro | lee | bills', 'libro | hojea | sasha',
      'libro | bloqueada | noche', 'libro | libro-fin | 1', 'alcance | dia-pagina | bills', 'embudo | primer-libro',
    ]));
    expect(t.values.get('libro | lee | bills')).toBe(5);
    expect(t.values.get('libro | libro-fin | 1')).toBe(9);
    expect(t.sent).not.toContain('libro | lee | noche');
    expect(t.sent).not.toContain('alcance | dia-pagina | sasha');
  });
});

describe('GameTracker: sesión', () => {
  it('el primer rato del día cuenta lo que tiene el jugador', async () => {
    const t = setup({ state: { ...initialState(), coins: 60 } });
    await t.tracker.start();
    t.tracker.sessionStarted(['dia']);
    expect(t.sent).toEqual(expect.arrayContaining([
      'tiene | tiene-recinto | leon', 'tiene | tiene-recinto | cabra', 'tiene | tiene-animal | leon/bills',
      'tiene | tiene-animal | cabra/gordi', 'tiene | tiene-saldo | 50-149',
      'tiene | tiene-paginas | 0', 'tiene | tiene-ajuste | musica-on', 'tiene | tiene-ajuste | sonidos-on',
    ]));
    expect(t.values.get('tiene | tiene-recinto | cabra')).toBe(1);
    expect(t.sent.some((k) => k.startsWith('tiene | tiene-recinto | panda'))).toBe(false);
    expect(t.sent).not.toContain('tiene | tiene-animal | cabra/nube');
  });

  it('una sesión que no es la primera del día no lo repite', async () => {
    const t = setup();
    await t.tracker.start();
    t.tracker.sessionStarted([]);
    expect(t.sent).toEqual([]);
  });

  it('al irse resume el rato: comidas y animales distintos', async () => {
    const t = setup();
    await t.tracker.start();
    t.tracker.sessionStarted([]);
    t.fed('gordi', 'zanahoria', 'come', 1);
    t.fed('gordi', 'lechuga', 'come', 1);
    t.fed('bills', 'carne', 'come', 1);
    t.tracker.goingBackground(40);
    expect(t.values.get('sesion | rato-comidas | 3-5')).toBe(3);
    expect(t.values.get('sesion | rato-animales | 2-3')).toBe(2);
    t.tracker.resumed();
    t.tracker.goingBackground(5);
    expect(t.values.get('sesion | rato-comidas | 0')).toBe(0);
  });

  it('las pantallas de tienda, libro y ajustes cuentan para el alcance; el mapa no', async () => {
    const t = setup();
    await t.tracker.start();
    t.tracker.screenShown('mapa');
    t.tracker.screenShown('libro');
    expect(t.sent).toEqual(['alcance | dia-pantalla | libro', 'alcance | semana-pantalla | libro', 'alcance | vida-pantalla | libro']);
  });

  it('apagada no cuenta ni guarda nada', async () => {
    const t = setup({ active: false });
    await t.tracker.start();
    t.fed('gordi', 'zanahoria', 'come', 1);
    t.tracker.goingBackground(10);
    t.tracker.screenShown('libro');
    await Promise.resolve();
    expect(t.sent).toEqual([]);
    expect(await t.store.get(REACH_KEY)).toBeNull();
  });
});

describe('GameTracker: ajustes y salida', () => {
  it('privacidad y la pregunta de salir', async () => {
    const t = setup();
    await t.tracker.start();
    t.events.emit('legal-opened', {});
    t.events.emit('quit-asked', {});
    t.events.emit('quit-answered', { leave: false });
    t.events.emit('quit-answered', { leave: true });
    expect(t.sent).toEqual(['ajustes | privacidad', 'ajustes | salir-pregunta', 'ajustes | salir-no', 'ajustes | salir-si']);
  });
});
