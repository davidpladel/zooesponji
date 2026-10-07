import { describe, expect, it } from 'vitest';
import { ACTIVITY_KEY } from '../../src/core/activity';
import type { MatomoConfig } from '../../src/core/matomoRequest';
import { defaultSettings, type KeyValueStore, type Settings } from '../../src/core/save';
import { Analytics, QUEUE_LIMIT, SESSION_GAP_MS, getAnalytics, setAnalytics, type AnalyticsDeps } from '../../src/systems/analytics';
import { EventBus, type GameEvents } from '../../src/systems/events';
import { createMemoryStore } from '../../src/systems/storage';

const config: MatomoConfig = {
  url: 'https://stats.example.com',
  siteId: 7,
  dimensions: { version: 1, platform: 2, language: 3, sessions: 4, age: 5 },
  replayHours: 23,
};

type Sent = Record<string, string>;

function setup(overrides: Partial<AnalyticsDeps> = {}) {
  const bodies: { url: string; body: string }[] = [];
  const events = new EventBus<GameEvents>();
  const store = overrides.store ?? createMemoryStore();
  const clock = { time: new Date(2026, 9, 7, 10, 0, 0).getTime() };
  let ids = 0;
  const analytics = new Analytics({
    config,
    store,
    events,
    send: (url, body) => bodies.push({ url, body }),
    now: () => new Date(clock.time),
    randomId: () => (++ids).toString(16).padStart(16, '0'),
    version: '2.5.0',
    platform: 'android',
    language: () => 'es',
    settings: defaultSettings(),
    coins: 0,
    ...overrides,
  });
  /** Todo lo enviado hasta ahora, ya descodificado. */
  const sent = (): Sent[] =>
    bodies.flatMap(({ body }) =>
      (JSON.parse(body) as { requests: string[] }).requests.map((q) => Object.fromEntries(new URLSearchParams(q.slice(1)))),
    );
  /** `categoría/acción` de cada evento enviado. */
  const names = (): string[] => sent().filter((p) => p.e_c).map((p) => `${p.e_c}/${p.e_a}`);
  return { analytics, bodies, events, store, clock, sent, names };
}

const settings = (change: Partial<Settings>): { settings: Settings } => ({ settings: { ...defaultSettings(), ...change } });

describe('Analytics: apagada', () => {
  it('sin configuración no envía ni guarda nada', async () => {
    const t = setup({ config: null });
    await t.analytics.start();
    t.analytics.track({ kind: 'event', category: 'x', action: 'y' });
    t.events.emit('shop-unlocked', {});
    t.analytics.flush();
    expect(t.bodies).toEqual([]);
    expect(await t.store.get(ACTIVITY_KEY)).toBeNull();
  });

  it('con las estadísticas apagadas en Ajustes no envía ni guarda nada', async () => {
    const t = setup({ settings: { ...defaultSettings(), stats: false } });
    await t.analytics.start();
    t.events.emit('shop-unlocked', {});
    t.analytics.screenView('mapa');
    t.analytics.flush();
    expect(t.bodies).toEqual([]);
    expect(await t.store.get(ACTIVITY_KEY)).toBeNull();
  });
});

describe('Analytics: sesión y actividad', () => {
  it('la primera sesión avisa de inicio y de las cuatro banderas', async () => {
    const t = setup();
    await t.analytics.start();
    t.analytics.flush();
    expect(t.bodies[0]?.url).toBe('https://stats.example.com/matomo.php');
    expect(t.names()).toEqual(['sesion/inicio', 'activo/nuevo', 'activo/dia', 'activo/semana', 'activo/mes']);
    const first = t.sent()[0]!;
    expect(first._id).toMatch(/^[0-9a-f]{16}$/);
    expect(first.dimension1).toBe('2.5.0');
    expect(first.dimension2).toBe('android');
    expect(first.dimension3).toBe('es');
    expect(first.dimension4).toBe('1');
    expect(first.dimension5).toBe('d0');
    expect(new Set(t.sent().map((p) => p._id)).size).toBe(1);
  });

  it('la segunda sesión del mismo día solo avisa de inicio, con su tramo', async () => {
    const store = createMemoryStore();
    await setup({ store }).analytics.start();
    const t = setup({ store });
    await t.analytics.start();
    t.analytics.flush();
    expect(t.names()).toEqual(['sesion/inicio']);
    expect(t.sent()[0]?.dimension4).toBe('2-5');
  });

  it('si el almacén falla no hay banderas: mejor no contar que contar de más', async () => {
    const broken: KeyValueStore = {
      get: () => Promise.reject(new Error('sin almacén')),
      set: () => Promise.reject(new Error('sin almacén')),
    };
    const t = setup({ store: broken });
    await t.analytics.start();
    t.analytics.flush();
    expect(t.names()).toEqual(['sesion/inicio']);
  });
});

describe('Analytics: cola y envío', () => {
  it('sin nada en la cola no se envía', async () => {
    const t = setup();
    await t.analytics.start();
    t.analytics.flush();
    t.analytics.flush();
    expect(t.bodies).toHaveLength(1);
  });

  it('la cola tiene tope: se descartan los más viejos', async () => {
    const t = setup();
    await t.analytics.start();
    t.analytics.flush();
    for (let i = 0; i < QUEUE_LIMIT + 10; i++) t.analytics.track({ kind: 'event', category: 'c', action: `a${i}` });
    t.analytics.flush();
    const batch = (JSON.parse(t.bodies[1]!.body) as { requests: string[] }).requests;
    expect(batch).toHaveLength(QUEUE_LIMIT);
    expect(batch[0]).toContain('e_a=a10');
  });

  it('un envío que falla no rompe nada y la cola se vacía', async () => {
    let calls = 0;
    const t = setup({
      send: () => {
        calls++;
        throw new Error('sin red');
      },
    });
    await t.analytics.start();
    expect(() => t.analytics.flush()).not.toThrow();
    t.analytics.flush();
    expect(calls).toBe(1);
  });
});

describe('Analytics: pantallas', () => {
  it('cada pantalla se envía una vez y marca la dirección de lo que viene después', async () => {
    const t = setup();
    await t.analytics.start();
    t.analytics.screenView('mapa');
    t.analytics.screenView('mapa');
    t.events.emit('shop-unlocked', {});
    t.analytics.flush();
    const screens = t.sent().filter((p) => p.action_name);
    expect(screens.map((p) => p.action_name)).toEqual(['mapa']);
    expect(screens[0]?.url).toBe('https://davidpladel.com/zoo/mapa');
    expect(t.sent().at(-1)?.url).toBe('https://davidpladel.com/zoo/mapa');
  });
});

describe('Analytics: eventos del juego', () => {
  it('progreso, comida y libro', async () => {
    const t = setup();
    await t.analytics.start();
    t.analytics.flush();
    t.events.emit('shop-unlocked', {});
    t.events.emit('animal-unlocked', { penId: 'pantera' });
    t.events.emit('animal-added', { penId: 'cabra', count: 3, residentId: 'residente-a' });
    t.events.emit('animal-fed', { penId: 'leon', residentId: 'residente-b', reaction: 'especial' });
    t.events.emit('book-page', { pageId: 'bills' });
    t.analytics.flush();
    const batch = t.sent().slice(-5);
    expect(batch.map((p) => [p.e_c, p.e_a, p.e_n, p.e_v])).toEqual([
      ['progreso', 'tienda-abierta', undefined, undefined],
      ['progreso', 'recinto', 'pantera', undefined],
      ['progreso', 'animal', 'cabra', '3'],
      ['juego', 'comida-especial', 'leon', undefined],
      ['libro', 'pagina', 'bills', undefined],
    ]);
    // El nombre del residente no sale del dispositivo.
    expect(JSON.stringify(batch)).not.toContain('residente-');
  });

  it('las monedas avisan una sola vez por tramo y sesión', async () => {
    const t = setup({ coins: 90 });
    await t.analytics.start();
    t.analytics.flush();
    t.events.emit('coins-changed', { coins: 120 });
    t.events.emit('coins-changed', { coins: 80 });
    t.events.emit('coins-changed', { coins: 130 });
    t.events.emit('coins-changed', { coins: 600 });
    t.analytics.flush();
    const coins = t.sent().filter((p) => p.e_a === 'monedas');
    expect(coins.map((p) => p.e_n)).toEqual(['100', '500']);
  });

  it('los cambios de ajustes se cuentan, uno por ajuste', async () => {
    const t = setup();
    await t.analytics.start();
    t.analytics.flush();
    t.events.emit('settings-changed', settings({ music: false }));
    t.events.emit('settings-changed', settings({ music: false, joystick: true }));
    t.events.emit('settings-changed', settings({ music: false, joystick: true, language: 'en' }));
    t.analytics.flush();
    expect(t.sent().slice(-3).map((p) => [p.e_c, p.e_a, p.e_n])).toEqual([
      ['ajustes', 'musica', 'off'],
      ['ajustes', 'joystick', 'on'],
      ['ajustes', 'idioma', 'en'],
    ]);
  });
});

describe('Analytics: apagar y encender en Ajustes', () => {
  it('al apagar se vacía la cola y no sale nada más', async () => {
    const t = setup();
    await t.analytics.start();
    t.events.emit('settings-changed', settings({ stats: false }));
    t.events.emit('shop-unlocked', {});
    t.analytics.flush();
    expect(t.bodies).toEqual([]);
  });

  it('al encender empieza una sesión nueva', async () => {
    const t = setup({ settings: { ...defaultSettings(), stats: false } });
    await t.analytics.start();
    t.events.emit('settings-changed', settings({ stats: true }));
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    t.analytics.flush();
    expect(t.names()[0]).toBe('sesion/inicio');
    expect(t.names()).toContain('activo/nuevo');
  });
});

describe('Analytics: segundo plano', () => {
  it('al irse envía el fin de sesión con los segundos jugados', async () => {
    const t = setup();
    await t.analytics.start();
    t.analytics.flush();
    t.clock.time += 95_000;
    t.analytics.setBackground(true);
    t.analytics.setBackground(true); // el aviso llega dos veces (Capacitor y navegador)
    const ends = t.sent().filter((p) => p.e_a === 'fin');
    expect(ends).toHaveLength(1);
    expect(ends[0]?.e_v).toBe('95');
  });

  it('una ausencia corta sigue en la misma sesión', async () => {
    const t = setup();
    await t.analytics.start();
    t.analytics.setBackground(true);
    t.clock.time += 60_000;
    t.analytics.setBackground(false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    t.clock.time += 10_000;
    t.analytics.setBackground(true);
    expect(t.names().filter((n) => n === 'sesion/inicio')).toHaveLength(1);
    expect(t.sent().filter((p) => p.e_a === 'fin').at(-1)?.e_v).toBe('10');
  });

  it('tras media hora fuera empieza otra sesión, con otro id y la pantalla actual', async () => {
    const t = setup();
    await t.analytics.start();
    t.analytics.screenView('mapa');
    t.analytics.setBackground(true);
    const firstId = t.sent()[0]!._id;
    t.clock.time += SESSION_GAP_MS;
    t.analytics.setBackground(false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    t.analytics.flush();
    const second = t.sent().filter((p) => p._id !== firstId);
    expect(second.map((p) => p.e_a ?? p.action_name)).toEqual(['inicio', 'mapa']);
    expect(second[0]?.dimension4).toBe('2-5');
  });
});

describe('Analytics: errores', () => {
  it('envía el mensaje sin direcciones, recortado, y lo manda al momento', async () => {
    const t = setup();
    await t.analytics.start();
    t.analytics.flush();
    t.analytics.reportError(new Error(`Fallo en https://localhost/assets/x.js:10 ${'a'.repeat(200)}`));
    const error = t.sent().at(-1)!;
    expect([error.e_c, error.e_a]).toEqual(['error', 'no-controlado']);
    expect(error.e_n).not.toContain('localhost');
    expect(error.e_n!.length).toBeLessThanOrEqual(100);
    expect(error.e_n!.startsWith('Fallo en')).toBe(true);
  });

  it('acepta cualquier cosa lanzada', async () => {
    const t = setup();
    await t.analytics.start();
    t.analytics.reportError(undefined);
    expect(t.sent().at(-1)?.e_n).toBe('undefined');
  });
});

describe('instancia en uso', () => {
  it('se guarda y se recupera', () => {
    expect(getAnalytics()).toBeNull();
    const { analytics } = setup();
    setAnalytics(analytics);
    expect(getAnalytics()).toBe(analytics);
    setAnalytics(null);
  });
});
