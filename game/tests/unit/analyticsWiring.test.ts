import { describe, expect, it } from 'vitest';
import { ACTIVITY_KEY } from '../../src/core/activity';
import { initialState } from '../../src/core/economy';
import { QUEUE_KEY } from '../../src/core/hitQueue';
import type { MatomoConfig } from '../../src/core/matomoRequest';
import { REACH_KEY } from '../../src/core/reach';
import { defaultBook, defaultSettings, type Settings } from '../../src/core/save';
import { Analytics, SESSION_GAP_MS } from '../../src/systems/analytics';
import { GameTracker } from '../../src/systems/analyticsEvents';
import { EventBus, type GameEvents } from '../../src/systems/events';
import { createMemoryStore } from '../../src/systems/storage';

const config: MatomoConfig = {
  url: 'https://stats.example.com',
  siteId: 7,
  dimensions: { version: 1, platform: 2, language: 3, sessions: 4, age: 5 },
  replayHours: 23,
};

type Sent = Record<string, string>;

/** Las dos piezas de verdad, enchufadas como en `analyticsInstall.ts`: solo son falsos el almacén, el reloj y el envío. */
async function wire(change: Partial<Settings> = {}) {
  const bodies: string[] = [];
  const events = new EventBus<GameEvents>();
  const store = createMemoryStore();
  const clock = { time: new Date(2026, 9, 7, 10, 0, 0).getTime() };
  const now = (): Date => new Date(clock.time);
  const settings: Settings = { ...defaultSettings(), ...change };
  let ids = 0;
  const analytics = new Analytics({
    config,
    store,
    events,
    send: async (_url, body) => {
      bodies.push(body);
      return true;
    },
    now,
    randomId: () => (++ids).toString(16).padStart(16, '0'),
    version: '2.5.0',
    platform: 'android',
    language: () => 'es',
    settings,
    coins: 0,
  });
  const tracker = new GameTracker({ sink: analytics, events, store, now, state: initialState, settings: () => settings, book: defaultBook });
  analytics.setHooks(tracker);
  await tracker.start();
  await analytics.start();
  const sent = (): Sent[] =>
    bodies.flatMap((body) => (JSON.parse(body) as { requests: string[] }).requests.map((q) => Object.fromEntries(new URLSearchParams(q.slice(1)))));
  const feed = (): void => events.emit('animal-fed', { penId: 'cabra', residentId: 'gordi', foodId: 'zanahoria', reaction: 'come', coins: 1 });
  return { analytics, events, store, clock, bodies, sent, feed };
}

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('Analytics y GameTracker enchufados', () => {
  it('con las estadísticas apagadas no se envía, no se cuenta y no se guarda nada', async () => {
    const t = await wire({ stats: false });
    t.analytics.screenView('mapa');
    t.feed();
    t.clock.time += 30_000;
    t.analytics.setBackground(true);
    await settle();
    await t.analytics.flush();
    expect(t.bodies).toEqual([]);
    expect(await t.store.get(REACH_KEY)).toBeNull();
    expect(await t.store.get(ACTIVITY_KEY)).toBeNull();
    const queue = await t.store.get(QUEUE_KEY);
    expect(queue === null ? [] : JSON.parse(queue).hits).toEqual([]);
  });

  it('la primera sesión del día cuenta lo que se tiene una vez; la segunda del mismo día, no', async () => {
    const t = await wire();
    await t.analytics.flush();
    const daily = (): Sent[] => t.sent().filter((p) => p.e_c === 'tiene');
    expect(daily().filter((p) => p.e_a === 'tiene-saldo')).toHaveLength(1);
    expect(daily().filter((p) => p.e_a === 'tiene-animal' && p.e_n === 'cabra/gordi')).toHaveLength(1);
    const first = daily().length;

    t.analytics.setBackground(true);
    t.clock.time += SESSION_GAP_MS;
    t.analytics.setBackground(false);
    await settle();
    await t.analytics.flush();
    expect(t.sent().filter((p) => p.e_a === 'inicio')).toHaveLength(2);
    expect(daily()).toHaveLength(first);
  });

  it('una comida da su detalle y el alcance del día, en la misma visita', async () => {
    const t = await wire();
    t.feed();
    await t.analytics.flush();
    const eaten = t.sent().find((p) => p.e_c === 'comer' && p.e_a === 'come');
    const reach = t.sent().find((p) => p.e_a === 'dia-animal');
    expect(eaten?.e_n).toBe('cabra/gordi/zanahoria');
    expect(reach?.e_n).toBe('cabra/gordi');
    expect(eaten?._id).toMatch(/^[0-9a-f]{16}$/);
    expect(reach?._id).toBe(eaten?._id);
  });
});
