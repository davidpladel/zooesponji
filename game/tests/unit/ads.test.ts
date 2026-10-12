import { describe, expect, it } from 'vitest';
import { ADS_KEY, type AdPacingState, type AdSlot } from '../../src/core/adPacing';
import { initialState, type GameState } from '../../src/core/economy';
import type { KeyValueStore } from '../../src/core/save';
import { Ads, type AdProvider } from '../../src/systems/ads';
import { EventBus, type GameEvents } from '../../src/systems/events';
import { createMemoryStore } from '../../src/systems/storage';

const AD_EVENTS = ['ad-offered', 'ad-accepted', 'ad-declined', 'ad-watched', 'ad-cut', 'ad-failed', 'ad-empty'] as const;
const MIN = 60_000;
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function setup(opts: { slots?: AdSlot[]; store?: KeyValueStore; provider?: Partial<AdProvider>; state?: GameState } = {}) {
  const events = new EventBus<GameEvents>();
  const log: string[] = [];
  for (const name of AD_EVENTS) events.on(name, () => log.push(name));
  const clock = { time: new Date(2026, 9, 12, 10, 0, 0).getTime() };
  const calls = { load: [] as AdSlot[], show: [] as AdSlot[], sound: [] as boolean[], coins: [] as number[] };
  const answers = { load: true, show: { shown: true, rewarded: true } };
  const game = { state: opts.state ?? initialState() };
  const provider: AdProvider = {
    load: async (slot) => {
      calls.load.push(slot);
      return answers.load;
    },
    show: async (slot) => {
      calls.show.push(slot);
      return answers.show;
    },
    ...opts.provider,
  };
  const store = opts.store ?? createMemoryStore();
  const ads = new Ads({
    provider,
    slots: opts.slots ?? ['tienda', 'pausa'],
    store,
    events,
    now: () => new Date(clock.time),
    state: () => game.state,
    earnCoins: async (amount) => {
      calls.coins.push(amount);
    },
    pauseSound: (paused) => calls.sound.push(paused),
  });
  /** Pasan segundos de juego y se espera a que terminen las cargas pedidas. */
  const play = async (seconds: number): Promise<void> => {
    ads.tick(seconds);
    await ads.settled();
  };
  const saved = async (): Promise<AdPacingState | null> => {
    const raw = await store.get(ADS_KEY);
    return raw === null ? null : (JSON.parse(raw) as AdPacingState);
  };
  return { ads, events, log, clock, calls, answers, game, store, play, saved };
}

describe('Ads: cuándo pide un anuncio', () => {
  it('sin huecos configurados no pide ni ofrece nada', async () => {
    const t = setup({ slots: [] });
    await t.ads.start();
    await t.play(5000);
    expect(t.calls.load).toEqual([]);
    expect(t.ads.canOffer('tienda')).toBe(false);
    expect(t.log).toEqual([]);
  });

  it('un hueco sin configurar no existe aunque el otro sí', async () => {
    const t = setup({ slots: ['tienda'] });
    await t.ads.start();
    await t.play(5000);
    expect(t.calls.load).toEqual(['tienda']);
    expect(t.ads.canOffer('pausa')).toBe(false);
    expect(t.log).toEqual([]);
  });

  it('no carga hasta que falta un minuto o menos', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(239);
    expect(t.calls.load).toEqual([]);
    await t.play(1);
    expect(t.calls.load).toEqual(['tienda']);
    expect(t.ads.canOffer('tienda')).toBe(false);
    await t.play(60);
    expect(t.calls.load).toEqual(['tienda']);
    expect(t.ads.canOffer('tienda')).toBe(true);
  });

  it('una partida corta no pide ningún anuncio', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(200);
    expect(t.calls.load).toEqual([]);
  });

  it('si la carga falla, vuelve a probar a los 2 minutos', async () => {
    const t = setup();
    t.answers.load = false;
    await t.ads.start();
    await t.play(300);
    expect(t.calls.load).toEqual(['tienda']);
    t.clock.time += 2 * MIN - 1000;
    await t.play(1);
    expect(t.calls.load).toEqual(['tienda']);
    t.answers.load = true;
    t.clock.time += 1000;
    await t.play(1);
    expect(t.calls.load).toEqual(['tienda', 'tienda']);
    expect(t.ads.canOffer('tienda')).toBe(true);
  });

  it('un anuncio cargado hace más de 50 minutos se vuelve a pedir', async () => {
    const t = setup({ slots: ['tienda'] });
    await t.ads.start();
    await t.play(300);
    t.clock.time += 50 * MIN;
    expect(t.ads.isReady('tienda')).toBe(false);
    await t.play(1);
    expect(t.calls.load).toEqual(['tienda', 'tienda']);
    expect(t.ads.canOffer('tienda')).toBe(true);
  });

  it('sin anuncio listo no ofrece y avisa una sola vez', async () => {
    const t = setup({ slots: ['tienda'] });
    t.answers.load = false;
    await t.ads.start();
    await t.play(300);
    expect(t.ads.canOffer('tienda')).toBe(false);
    expect(t.ads.canOffer('tienda')).toBe(false);
    expect(t.log).toEqual(['ad-empty']);
  });

  it('si las reglas no lo permiten, que no haya anuncio no es noticia', async () => {
    const t = setup();
    t.answers.load = false;
    await t.ads.start();
    await t.play(100);
    expect(t.ads.canOffer('tienda')).toBe(false);
    expect(t.log).toEqual([]);
  });
});

describe('Ads: el panel', () => {
  it('visto entero: paga, cuenta y avisa', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(300);
    expect(t.ads.canOffer('tienda')).toBe(true);
    expect(t.ads.offer('tienda')).toBe(10);
    expect(await t.ads.accept('tienda')).toBe('visto');
    expect(t.calls.show).toEqual(['tienda']);
    expect(t.calls.coins).toEqual([10]);
    expect(t.calls.sound).toEqual([true, false]);
    expect(t.log).toEqual(['ad-offered', 'ad-accepted', 'ad-watched']);
    expect(await t.saved()).toEqual({ sinceLast: 0, day: '2026-10-12', shown: 1 });
    expect(t.ads.canOffer('tienda')).toBe(false);
  });

  it('los avisos llevan el premio y el saldo que había al saltar el panel', async () => {
    const t = setup({ state: { ...initialState(), coins: 37 } });
    const seen: unknown[] = [];
    t.events.on('ad-offered', (payload) => seen.push(payload));
    t.events.on('ad-watched', (payload) => seen.push(payload));
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    t.game.state = { ...t.game.state, coins: 999 };
    await t.ads.accept('tienda');
    expect(seen).toEqual([{ slot: 'tienda', coins: 10, balance: 37 }, { slot: 'tienda', coins: 10, balance: 37 }]);
  });

  it('el premio se fija al abrir el panel aunque el zoo cambie antes de cobrar', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(300);
    expect(t.ads.offer('tienda')).toBe(10);
    const counts = { ...t.game.state.counts, pantera: 1, panda: 1, estanque: 1 };
    t.game.state = { ...t.game.state, counts };
    await t.ads.accept('tienda');
    expect(t.calls.coins).toEqual([10]);
  });

  it('cerrado antes de tiempo: no paga, pero cuenta en el día', async () => {
    const t = setup();
    t.answers.show = { shown: true, rewarded: false };
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    expect(await t.ads.accept('tienda')).toBe('cortado');
    expect(t.calls.coins).toEqual([]);
    expect(t.log).toEqual(['ad-offered', 'ad-accepted', 'ad-cut']);
    expect(await t.saved()).toEqual({ sinceLast: 0, day: '2026-10-12', shown: 1 });
  });

  it('no se pudo enseñar: no paga ni cuenta en el día, pero empieza la espera', async () => {
    const t = setup();
    t.answers.show = { shown: false, rewarded: false };
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    expect(await t.ads.accept('tienda')).toBe('fallo');
    expect(t.calls.coins).toEqual([]);
    expect(t.calls.sound).toEqual([true, false]);
    expect(t.log).toEqual(['ad-offered', 'ad-accepted', 'ad-failed']);
    expect(await t.saved()).toEqual({ sinceLast: 0, day: '2026-10-12', shown: 0 });
    expect(t.ads.canOffer('tienda')).toBe(false);
  });

  it('un premio sin anuncio enseñado no se paga', async () => {
    const t = setup();
    t.answers.show = { shown: false, rewarded: true };
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    expect(await t.ads.accept('tienda')).toBe('fallo');
    expect(t.calls.coins).toEqual([]);
  });

  it('la X: ni anuncio ni monedas, y empieza la espera', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    t.ads.decline('tienda');
    expect(t.calls.show).toEqual([]);
    expect(t.log).toEqual(['ad-offered', 'ad-declined']);
    expect(await t.saved()).toEqual({ sinceLast: 0, day: '2026-10-12', shown: 0 });
    expect(t.ads.canOffer('tienda')).toBe(false);
  });

  it('tras la espera vuelve a pedir un anuncio y a ofrecerlo', async () => {
    const t = setup({ slots: ['tienda'] });
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    await t.ads.accept('tienda');
    await t.play(839);
    expect(t.calls.load).toEqual(['tienda']);
    await t.play(1);
    expect(t.calls.load).toEqual(['tienda', 'tienda']);
    await t.play(60);
    expect(t.ads.canOffer('tienda')).toBe(true);
  });

  it('doble toque: un solo anuncio y un solo resultado', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    const first = t.ads.accept('tienda');
    const second = t.ads.accept('tienda');
    t.ads.decline('tienda');
    expect(await second).toBe('fallo');
    expect(await first).toBe('visto');
    expect(t.calls.show).toEqual(['tienda']);
    expect(t.calls.coins).toEqual([10]);
    expect(t.log).toEqual(['ad-offered', 'ad-accepted', 'ad-watched']);
    expect((await t.saved())?.shown).toBe(1);
  });

  it('la X dos veces cuenta una', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    t.ads.decline('tienda');
    t.ads.decline('tienda');
    expect(t.log).toEqual(['ad-offered', 'ad-declined']);
  });

  it('aceptar o rechazar sin panel abierto no hace nada', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(300);
    t.ads.decline('tienda');
    expect(await t.ads.accept('tienda')).toBe('fallo');
    expect(t.calls.show).toEqual([]);
    expect(t.log).toEqual([]);
    expect(t.ads.canOffer('tienda')).toBe(true);
  });

  it('con un panel abierto no se ofrece otro', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(900);
    t.ads.offer('tienda');
    expect(t.ads.canOffer('pausa')).toBe(false);
  });

  it('mientras se ve el anuncio no corre el tiempo de juego', async () => {
    let finish: (result: { shown: boolean; rewarded: boolean }) => void = () => {};
    const t = setup({ provider: { show: () => new Promise((resolve) => (finish = resolve)) } });
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    const pending = t.ads.accept('tienda');
    expect(t.ads.showing).toBe(true);
    t.ads.tick(500);
    finish({ shown: true, rewarded: true });
    await pending;
    expect(t.ads.showing).toBe(false);
    await t.play(899);
    expect(t.ads.canOffer('tienda')).toBe(false);
  });
});

describe('Ads: la pausa y la partida', () => {
  it('la pausa salta una vez por partida', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(900);
    expect(t.ads.canOffer('pausa')).toBe(true);
    t.ads.offer('pausa');
    t.ads.decline('pausa');
    await t.play(900);
    expect(t.ads.canOffer('pausa')).toBe(false);
    expect(t.ads.canOffer('tienda')).toBe(true);
  });

  it('la pausa no salta si en la partida ya se ha visto un anuncio', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    await t.ads.accept('tienda');
    await t.play(900);
    expect(t.ads.canOffer('pausa')).toBe(false);
  });

  it('tras 30 minutos en segundo plano empieza otra partida', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    await t.ads.accept('tienda');
    await t.play(900);
    expect(t.ads.canOffer('pausa')).toBe(false);
    t.ads.setBackground(true);
    t.clock.time += 30 * MIN;
    t.ads.setBackground(false);
    await t.play(899);
    expect(t.ads.canOffer('pausa')).toBe(false);
    await t.play(1);
    expect(t.ads.canOffer('pausa')).toBe(true);
  });

  it('con 29 minutos en segundo plano sigue la misma partida', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(900);
    t.ads.offer('pausa');
    t.ads.decline('pausa');
    t.ads.setBackground(true);
    t.clock.time += 29 * MIN;
    t.ads.setBackground(false);
    await t.play(900);
    expect(t.ads.canOffer('pausa')).toBe(false);
  });

  it('al ir a segundo plano se guarda la espera', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    t.ads.decline('tienda');
    await t.play(10);
    t.ads.setBackground(true);
    await settle();
    expect((await t.saved())?.sinceLast).toBe(10);
  });

  it('la espera se guarda cada 30 segundos de juego', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    t.ads.decline('tienda');
    await t.play(29);
    await settle();
    expect((await t.saved())?.sinceLast).toBe(0);
    await t.play(1);
    await settle();
    expect((await t.saved())?.sinceLast).toBe(30);
  });

  it('respeta lo guardado: con 4 anuncios hoy no ofrece más', async () => {
    const store = createMemoryStore({ [ADS_KEY]: JSON.stringify({ sinceLast: 5000, day: '2026-10-12', shown: 4 }) });
    const t = setup({ store });
    await t.ads.start();
    await t.play(900);
    expect(t.calls.load).toEqual([]);
    expect(t.ads.canOffer('tienda')).toBe(false);
  });

  it('al día siguiente vuelve a ofrecer', async () => {
    const store = createMemoryStore({ [ADS_KEY]: JSON.stringify({ sinceLast: 5000, day: '2026-10-12', shown: 4 }) });
    const t = setup({ store });
    await t.ads.start();
    t.clock.time += 24 * 60 * MIN;
    await t.play(300);
    expect(t.ads.canOffer('tienda')).toBe(true);
  });
});

describe('Ads: nunca rompe el juego', () => {
  it('si el almacén falla al leer, no se ofrece nada en la partida', async () => {
    const store: KeyValueStore = {
      get: async () => {
        throw new Error('almacén roto');
      },
      set: async () => {},
    };
    const t = setup({ store });
    await t.ads.start();
    await t.play(900);
    expect(t.calls.load).toEqual([]);
    expect(t.ads.canOffer('tienda')).toBe(false);
    expect(t.log).toEqual([]);
  });

  it('si el almacén falla al escribir, no se ofrece nada más en la partida', async () => {
    const store: KeyValueStore = {
      get: async () => null,
      set: async () => {
        throw new Error('almacén roto');
      },
    };
    const t = setup({ store });
    await t.ads.start();
    await t.play(30);
    await settle();
    await t.play(300);
    expect(t.ads.canOffer('tienda')).toBe(false);
  });

  it('un proveedor que lanza al cargar o al enseñar acaba en «no hay anuncio»', async () => {
    const loads = setup({ provider: { load: () => Promise.reject(new Error('sin red')) } });
    await loads.ads.start();
    await loads.play(300);
    expect(loads.ads.canOffer('tienda')).toBe(false);

    const shows = setup({
      provider: {
        show: () => {
          throw new Error('SDK roto');
        },
      },
    });
    await shows.ads.start();
    await shows.play(300);
    shows.ads.offer('tienda');
    expect(await shows.ads.accept('tienda')).toBe('fallo');
    expect(shows.calls.sound).toEqual([true, false]);
    expect(shows.calls.coins).toEqual([]);
  });

  it('un oyente del bus que lanza no rompe el panel', async () => {
    const t = setup();
    t.events.on('ad-offered', () => {
      throw new Error('oyente roto');
    });
    t.events.on('ad-watched', () => {
      throw new Error('oyente roto');
    });
    await t.ads.start();
    await t.play(300);
    expect(t.ads.offer('tienda')).toBe(10);
    expect(await t.ads.accept('tienda')).toBe('visto');
    expect(t.calls.coins).toEqual([10]);
  });

  it('si falla el pago, el anuncio visto se cuenta igual y no lanza', async () => {
    const t = setup();
    const ads = new Ads({
      provider: { load: async () => true, show: async () => ({ shown: true, rewarded: true }) },
      slots: ['tienda'],
      store: t.store,
      events: t.events,
      now: () => new Date(t.clock.time),
      state: () => t.game.state,
      earnCoins: () => Promise.reject(new Error('no se pudo guardar')),
      pauseSound: () => {},
    });
    await ads.start();
    ads.tick(300);
    await ads.settled();
    ads.offer('tienda');
    expect(await ads.accept('tienda')).toBe('visto');
  });
});
