import { describe, expect, it } from 'vitest';
import { ACTIVITY_KEY } from '../../src/core/activity';
import { QUEUE_KEY, QUEUE_LIMIT } from '../../src/core/hitQueue';
import type { MatomoConfig } from '../../src/core/matomoRequest';
import { defaultSettings, type KeyValueStore, type Settings } from '../../src/core/save';
import { Analytics, SESSION_GAP_MS, getAnalytics, setAnalytics, type AnalyticsDeps, type AnalyticsHooks } from '../../src/systems/analytics';
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
  /** Con `ok: false` no hay red: el envío falla y nada llega. */
  const net = { ok: true };
  let ids = 0;
  const analytics = new Analytics({
    config,
    store,
    events,
    send: async (url, body) => {
      if (!net.ok) return false;
      bodies.push({ url, body });
      return true;
    },
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
  return { analytics, bodies, events, store, clock, net, sent, names };
}

/** Deja terminar los envíos lanzados sin esperar (segundo plano, errores). */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const settings = (change: Partial<Settings>): { settings: Settings } => ({ settings: { ...defaultSettings(), ...change } });

describe('Analytics: apagada', () => {
  it('sin configuración no envía ni guarda nada', async () => {
    const t = setup({ config: null });
    await t.analytics.start();
    t.analytics.track({ kind: 'event', category: 'x', action: 'y' });
    t.events.emit('animal-unlocked', { penId: 'panda' });
    await t.analytics.flush();
    expect(t.bodies).toEqual([]);
    expect(await t.store.get(ACTIVITY_KEY)).toBeNull();
  });

  it('con las estadísticas apagadas en Ajustes no envía ni guarda nada', async () => {
    const t = setup({ settings: { ...defaultSettings(), stats: false } });
    await t.analytics.start();
    t.events.emit('animal-unlocked', { penId: 'panda' });
    t.analytics.screenView('mapa');
    await t.analytics.flush();
    expect(t.bodies).toEqual([]);
    expect(await t.store.get(ACTIVITY_KEY)).toBeNull();
  });

  it('con las estadísticas apagadas no sale lo que quedó guardado y se borra', async () => {
    const store = createMemoryStore();
    const first = setup({ store });
    await first.analytics.start();
    first.net.ok = false;
    await first.analytics.flush();
    expect(JSON.parse((await store.get(QUEUE_KEY))!).hits.length).toBeGreaterThan(0);

    const second = setup({ store, settings: { ...defaultSettings(), stats: false } });
    await second.analytics.start();
    await second.analytics.flush();
    expect(second.bodies).toEqual([]);
    expect(JSON.parse((await store.get(QUEUE_KEY))!).hits).toEqual([]);
  });
});

describe('Analytics: sesión y actividad', () => {
  it('la primera sesión avisa de inicio y de las cuatro banderas', async () => {
    const t = setup();
    await t.analytics.start();
    await t.analytics.flush();
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
    await t.analytics.flush();
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
    await t.analytics.flush();
    expect(t.names()).toEqual(['sesion/inicio']);
  });
});

describe('Analytics: cola y envío', () => {
  it('sin nada en la cola no se envía', async () => {
    const t = setup();
    await t.analytics.start();
    await t.analytics.flush();
    await t.analytics.flush();
    expect(t.bodies).toHaveLength(1);
  });
});

describe('Analytics: pantallas', () => {
  it('cada pantalla se envía una vez y marca la dirección de lo que viene después', async () => {
    const t = setup();
    await t.analytics.start();
    t.analytics.screenView('mapa');
    t.analytics.screenView('mapa');
    t.events.emit('animal-unlocked', { penId: 'panda' });
    await t.analytics.flush();
    const screens = t.sent().filter((p) => p.action_name);
    expect(screens.map((p) => p.action_name)).toEqual(['mapa']);
    expect(screens[0]?.url).toBe('https://davidpladel.com/zoo/mapa');
    expect(t.sent().at(-1)?.url).toBe('https://davidpladel.com/zoo/mapa');
  });
});

describe('Analytics: eventos del juego', () => {

  it('las monedas avisan una sola vez por tramo y sesión', async () => {
    const t = setup({ coins: 90 });
    await t.analytics.start();
    await t.analytics.flush();
    t.events.emit('coins-changed', { coins: 120 });
    t.events.emit('coins-changed', { coins: 80 });
    t.events.emit('coins-changed', { coins: 130 });
    t.events.emit('coins-changed', { coins: 600 });
    await t.analytics.flush();
    const coins = t.sent().filter((p) => p.e_a === 'monedas');
    expect(coins.map((p) => p.e_n)).toEqual(['100', '500']);
  });

  it('los cambios de ajustes se cuentan, uno por ajuste', async () => {
    const t = setup();
    await t.analytics.start();
    await t.analytics.flush();
    t.events.emit('settings-changed', settings({ music: false }));
    t.events.emit('settings-changed', settings({ music: false, joystick: true }));
    t.events.emit('settings-changed', settings({ music: false, joystick: true, language: 'en' }));
    await t.analytics.flush();
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
    t.events.emit('animal-unlocked', { penId: 'panda' });
    await t.analytics.flush();
    expect(t.bodies).toEqual([]);
  });

  it('al encender empieza una sesión nueva', async () => {
    const t = setup({ settings: { ...defaultSettings(), stats: false } });
    await t.analytics.start();
    t.events.emit('settings-changed', settings({ stats: true }));
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await t.analytics.flush();
    expect(t.names()[0]).toBe('sesion/inicio');
    expect(t.names()).toContain('activo/nuevo');
  });
});

describe('Analytics: segundo plano', () => {
  it('al irse envía el fin de sesión con los segundos jugados', async () => {
    const t = setup();
    await t.analytics.start();
    await t.analytics.flush();
    t.clock.time += 95_000;
    t.analytics.setBackground(true);
    t.analytics.setBackground(true); // el aviso llega dos veces (Capacitor y navegador)
    await settle();
    const ends = t.sent().filter((p) => p.e_a === 'fin');
    expect(ends).toHaveLength(1);
    expect(ends[0]?.e_v).toBe('95');
    expect(ends[0]?.e_n).toBe('1-3m'); // 95 s
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
    await settle();
    expect(t.names().filter((n) => n === 'sesion/inicio')).toHaveLength(1);
    expect(t.sent().filter((p) => p.e_a === 'fin').at(-1)?.e_v).toBe('10');
  });

  it('tras media hora fuera empieza otra sesión, con otro id y la pantalla actual', async () => {
    const t = setup();
    await t.analytics.start();
    t.analytics.screenView('mapa');
    t.analytics.setBackground(true);
    await settle();
    const firstId = t.sent()[0]!._id;
    t.clock.time += SESSION_GAP_MS;
    t.analytics.setBackground(false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await t.analytics.flush();
    const second = t.sent().filter((p) => p._id !== firstId);
    expect(second.map((p) => p.e_a ?? p.action_name)).toEqual(['inicio', 'mapa']);
    expect(second[0]?.dimension4).toBe('2-5');
  });
});

describe('Analytics: jugar al cruzar la medianoche', () => {
  it('volver tras una ausencia corta pero en otro día empieza otra sesión, con su aviso del día', async () => {
    const t = setup();
    t.clock.time = new Date(2026, 9, 7, 23, 50, 0).getTime();
    await t.analytics.start();
    t.clock.time = new Date(2026, 9, 7, 23, 55, 0).getTime();
    t.analytics.setBackground(true);
    t.clock.time = new Date(2026, 9, 8, 0, 5, 0).getTime();
    t.analytics.setBackground(false);
    await settle();
    await t.analytics.flush();
    expect(t.names().filter((n) => n === 'sesion/inicio')).toHaveLength(2);
    expect(t.names().filter((n) => n === 'activo/dia')).toHaveLength(2);
    expect(new Set(t.sent().map((p) => p._id)).size).toBe(2);
  });
});

describe('Analytics: arranque y envío en curso', () => {
  it('un error antes de leer la cola guardada no la pisa: sale lo que esperaba y sale el error', async () => {
    const store = createMemoryStore();
    const first = setup({ store });
    await first.analytics.start();
    first.net.ok = false;
    await first.analytics.flush();
    const waiting = JSON.parse((await store.get(QUEUE_KEY))!).hits.length;
    expect(waiting).toBeGreaterThan(0);

    const second = setup({ store });
    second.analytics.reportError(new Error('nada más abrir'));
    await second.analytics.flush();
    await settle();
    expect(second.bodies).toEqual([]);
    expect(JSON.parse((await store.get(QUEUE_KEY))!).hits).toHaveLength(waiting);
    await second.analytics.start();
    await settle();
    expect(second.sent().filter((p) => p.e_a === 'inicio')).toHaveLength(2);
    expect(second.sent().filter((p) => p.e_a === 'nuevo')).toHaveLength(1);
    expect(second.sent().some((p) => p.e_c === 'error' && p.e_n === 'nada más abrir')).toBe(true);
  });

  it('con un envío colgado, irse a segundo plano guarda igualmente el fin de sesión', async () => {
    const pending: ((ok: boolean) => void)[] = [];
    const t = setup({ send: () => new Promise<boolean>((resolve) => pending.push(resolve)) });
    await t.analytics.start();
    const first = t.analytics.flush();
    await settle();
    expect(pending).toHaveLength(1);
    t.clock.time += 40_000;
    t.analytics.setBackground(true);
    await settle();
    expect(pending).toHaveLength(1);
    expect(await t.store.get(QUEUE_KEY)).toContain('e_a=fin');
    pending[0]!(false);
    await first;
  });

  it('irse a segundo plano antes de empezar la sesión no mide ni avisa', async () => {
    const t = setup();
    const calls: string[] = [];
    t.analytics.setHooks({
      sessionStarted: () => calls.push('sesion'),
      goingBackground: (s) => calls.push(`fuera:${s}`),
      resumed: () => calls.push('vuelve'),
      screenShown: () => calls.push('pantalla'),
    });
    t.analytics.setBackground(true);
    t.analytics.setBackground(false);
    await settle();
    await t.analytics.flush();
    expect(t.bodies).toEqual([]);
    expect(calls).toEqual(['vuelve']);
  });

  it('lo apuntado antes de terminar de leer la cola guardada no se pierde', async () => {
    const t = setup();
    const started = t.analytics.start();
    t.analytics.reportError(new Error('antes de arrancar'));
    await started;
    await settle();
    await t.analytics.flush();
    expect(t.sent().some((p) => p.e_c === 'error' && p.e_n === 'antes de arrancar')).toBe(true);
  });

  it('lo apuntado mientras se guarda al final de un envío también se guarda', async () => {
    const real = createMemoryStore();
    let writes = 0;
    let release: () => void = () => {};
    const store: KeyValueStore = {
      get: (key) => real.get(key),
      set: async (key, value) => {
        if (key === QUEUE_KEY) {
          writes += 1;
          if (writes === 2) await new Promise<void>((resolve) => (release = resolve));
        }
        await real.set(key, value);
      },
    };
    const t = setup({ store });
    await t.analytics.start();
    const flushing = t.analytics.flush();
    await settle();
    expect(writes).toBe(2); // el guardado final está en marcha
    t.analytics.track({ kind: 'event', category: 'x', action: 'tarde' });
    release();
    await flushing;
    expect(JSON.parse((await real.get(QUEUE_KEY))!).hits.map((h: { q: string }) => h.q).join('|')).toContain('tarde');
  });

  it('con un envío en curso otro flush no envía y lo apuntado sale una sola vez', async () => {
    const pending: { body: string; resolve: (ok: boolean) => void }[] = [];
    const t = setup({ send: (_url, body) => new Promise<boolean>((resolve) => pending.push({ body, resolve })) });
    await t.analytics.start();
    const first = t.analytics.flush();
    await settle();
    expect(pending).toHaveLength(1);
    await t.analytics.flush();
    expect(pending).toHaveLength(1);
    t.analytics.track({ kind: 'event', category: 'x', action: 'durante' });
    pending[0]!.resolve(true);
    await settle();
    expect(pending).toHaveLength(2);
    pending[1]!.resolve(true);
    await first;
    expect(pending.filter((p) => p.body.includes('e_a=durante'))).toHaveLength(1);
    expect(pending.map((p) => p.body).join('').split('e_a=durante').length - 1).toBe(1);
  });
});

describe('Analytics: errores', () => {
  it('envía el mensaje sin direcciones, recortado, y lo manda al momento', async () => {
    const t = setup();
    await t.analytics.start();
    await t.analytics.flush();
    t.analytics.reportError(new Error(`Fallo en https://localhost/assets/x.js:10 ${'a'.repeat(200)}`));
    await settle();
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
    await settle();
    expect(t.sent().at(-1)?.e_n).toBe('undefined');
  });
});

describe('Analytics: sin conexión', () => {
  it('sin red los eventos se quedan guardados y salen después con su fecha real', async () => {
    const t = setup();
    // `cdt` va en UTC: se calcula del reloj del test para no depender de la zona horaria de la máquina.
    const startedUtc = new Date(t.clock.time).toISOString().slice(0, 19).replace('T', ' ');
    await t.analytics.start();
    t.net.ok = false;
    await t.analytics.flush();
    expect(t.bodies).toEqual([]);
    expect(await t.store.get(QUEUE_KEY)).toContain('sesion');

    t.clock.time += 2 * 3_600_000;
    t.net.ok = true;
    await t.analytics.flush();
    const start = t.sent().find((p) => p.e_a === 'inicio');
    expect(start?.cdt).toBe(startedUtc);
    expect(JSON.parse((await t.store.get(QUEUE_KEY))!).hits).toEqual([]);
  });

  it('lo enviado al momento va sin fecha', async () => {
    const t = setup();
    await t.analytics.start();
    await t.analytics.flush();
    expect(t.sent().every((p) => p.cdt === undefined)).toBe(true);
  });

  it('lo que quedó de otra vez que se abrió el juego se envía y se avisa de cuánto esperaba', async () => {
    const store = createMemoryStore();
    const first = setup({ store });
    await first.analytics.start();
    first.net.ok = false;
    await first.analytics.flush();

    const second = setup({ store });
    second.clock.time += 3 * 3_600_000;
    await second.analytics.start();
    await second.analytics.flush();
    const pending = second.sent().find((p) => p.e_a === 'pendientes');
    expect(pending?.e_n).toBe('1-6h');
    expect(Number(pending?.e_v)).toBeGreaterThan(0);
    expect(second.sent().filter((p) => p.e_a === 'inicio')).toHaveLength(2);
  });

  it('lo caducado se tira y se cuenta en el siguiente envío', async () => {
    const t = setup();
    await t.analytics.start();
    t.net.ok = false;
    await t.analytics.flush();
    t.clock.time += 30 * 3_600_000;
    t.analytics.track({ kind: 'event', category: 'x', action: 'y' });
    t.net.ok = true;
    await t.analytics.flush();
    const lost = t.sent().find((p) => p.e_a === 'perdidos');
    expect(lost?.e_n).toBe('caducado');
    expect(Number(lost?.e_v)).toBeGreaterThan(0);
    expect(t.sent().some((p) => p.e_a === 'inicio')).toBe(false);
  });

  it('con la cola llena se tiran los más viejos y se cuenta', async () => {
    const t = setup();
    await t.analytics.start();
    await t.analytics.flush();
    for (let i = 0; i < QUEUE_LIMIT + 3; i += 1) t.analytics.track({ kind: 'event', category: 'x', action: String(i) });
    await t.analytics.flush();
    const lost = t.sent().find((p) => p.e_a === 'perdidos');
    expect(lost?.e_n).toBe('cola-llena');
    expect(lost?.e_v).toBe('3');
    expect(t.sent().some((p) => p.e_a === '0')).toBe(false);
  });

  it('un envío que lanza no rompe nada y no pierde la cola', async () => {
    const t = setup({ send: () => Promise.reject(new Error('sin red')) });
    await t.analytics.start();
    await expect(t.analytics.flush()).resolves.toBeUndefined();
    expect(JSON.parse((await t.store.get(QUEUE_KEY))!).hits.length).toBeGreaterThan(0);
  });

  it('al apagar las estadísticas se borra también lo guardado', async () => {
    const t = setup();
    await t.analytics.start();
    t.net.ok = false;
    await t.analytics.flush();
    t.events.emit('settings-changed', settings({ stats: false }));
    await settle();
    expect(JSON.parse((await t.store.get(QUEUE_KEY))!).hits).toEqual([]);
  });
});

describe('Analytics: retención y colaborador', () => {
  it('el nuevo lleva su semana de inicio', async () => {
    const t = setup();
    await t.analytics.start();
    await t.analytics.flush();
    expect(t.sent().find((p) => p.e_a === 'nuevo')?.e_n).toBe('2026-S41');
  });

  it('volver al día siguiente avisa de d1 con la semana de inicio', async () => {
    const store = createMemoryStore();
    const first = setup({ store });
    await first.analytics.start();
    await first.analytics.flush();
    const second = setup({ store });
    second.clock.time += 24 * 3_600_000;
    await second.analytics.start();
    await second.analytics.flush();
    expect(second.sent().find((p) => p.e_a === 'vuelve-d1')?.e_n).toBe('2026-S41');
  });

  it('avisa al colaborador de sesión, pantallas y segundo plano', async () => {
    const t = setup();
    const calls: string[] = [];
    const hooks: AnalyticsHooks = {
      sessionStarted: (flags) => calls.push(`sesion:${flags.join(',')}`),
      goingBackground: (seconds) => calls.push(`fuera:${seconds}`),
      resumed: () => calls.push('vuelve'),
      screenShown: (name) => calls.push(`pantalla:${name}`),
    };
    t.analytics.setHooks(hooks);
    await t.analytics.start();
    t.analytics.screenView('tienda');
    t.clock.time += 20_000;
    t.analytics.setBackground(true);
    t.clock.time += 5_000;
    t.analytics.setBackground(false);
    await settle();
    expect(calls).toEqual(['sesion:nuevo,dia,semana,mes', 'pantalla:tienda', 'fuera:20', 'vuelve']);
  });

  it('un colaborador que lanza no rompe el juego', async () => {
    const t = setup();
    const boom = (): never => {
      throw new Error('fallo del colaborador');
    };
    t.analytics.setHooks({ sessionStarted: boom, goingBackground: boom, resumed: boom, screenShown: boom });
    await expect(t.analytics.start()).resolves.toBeUndefined();
    expect(() => t.analytics.screenView('mapa')).not.toThrow();
    expect(() => t.analytics.setBackground(true)).not.toThrow();
    expect(() => t.analytics.setBackground(false)).not.toThrow();
    await settle();
  });

  it('los eventos del juego que siguen aquí: recinto, animal y monedas', async () => {
    const t = setup();
    await t.analytics.start();
    t.events.emit('animal-unlocked', { penId: 'panda' });
    t.events.emit('animal-added', { penId: 'cabra', count: 2, residentId: 'nube' });
    t.events.emit('coins-changed', { coins: 120 });
    await t.analytics.flush();
    expect(t.names()).toEqual(expect.arrayContaining(['progreso/recinto', 'progreso/animal', 'progreso/monedas']));
    expect(JSON.stringify(t.sent())).not.toContain('nube');
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
