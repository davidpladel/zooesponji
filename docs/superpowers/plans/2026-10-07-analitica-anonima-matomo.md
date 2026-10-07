# Analítica anónima con Matomo: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El juego envía eventos anónimos al Matomo de David (activos por día, semana y mes, pantallas, progreso, errores) sin cookies ni identificadores, con un interruptor en Ajustes para apagarlo.

**Architecture:** Dos módulos puros en `core/` (banderas de actividad y construcción de la petición) y una clase `Analytics` en `systems/` con todas las dependencias inyectadas, que escucha el `bus` de eventos y envía por lotes a `matomo.php`. Un instalador la conecta al juego real. Sin configuración (`.env.production.local`, fuera del repositorio) no hace nada, así que en desarrollo y en los tests queda apagada.

**Tech Stack:** TypeScript estricto, Vite (variables `VITE_*`), Vitest, Playwright, Phaser 4, Capacitor. Ninguna dependencia nueva.

**Spec:** `docs/superpowers/specs/2026-10-07-analitica-anonima-matomo-design.md`

## Global Constraints

- Rama `feat/analitica-matomo`. Todos los comandos se lanzan desde `game/`.
- Ninguna dependencia nueva en `package.json`. Ningún SDK.
- Nunca se envía `uid`, `cid`, `res`, `urlref`, `ua` ni `token_auth`. Nunca se guarda un identificador en el dispositivo.
- `SAVE_VERSION` se queda en `2`.
- El repositorio es público: la dirección de Matomo, el id del sitio y los ids de las dimensiones **no se escriben en ningún archivo con seguimiento de git** (ni código, ni tests, ni docs, ni mensajes de commit). Los tests usan `https://stats.example.com`.
- Medir nunca rompe el juego: todo fallo de almacén o de red se traga.
- Los eventos llevan ids (recinto, página, reacción), nunca nombres de residentes ni textos visibles.
- Comentarios y mensajes de commit en español, con el estilo del repo (`feat:`, `fix:`, `docs:`, `test:`).
- Cada tarea termina con `npm run typecheck` y `npm test` en verde.

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `src/core/activity.ts` (nuevo) | Banderas de «primera vez» y tramos. Puro. |
| `src/core/matomoRequest.ts` (nuevo) | Configuración y cadena de consulta de Matomo. Puro. |
| `src/systems/analytics.ts` (nuevo) | Clase `Analytics`: cola, sesión, escucha del `bus`. Sin Phaser. |
| `src/systems/analyticsInstall.ts` (nuevo) | Dependencias reales, pantallas, temporizador. |
| `src/core/save.ts` | Ajuste `stats`. |
| `src/systems/events.ts`, `src/systems/session.ts` | Evento `book-page`. |
| `src/systems/platform.ts`, `src/systems/errors.ts`, `src/scenes/PreloadScene.ts` | Enganches. |
| `src/scenes/SettingsScene.ts`, `src/ui/icons.ts`, `scripts/make-ui-assets.mjs`, `src/data/strings/*.ts`, `src/systems/testHooks.ts` | Ficha «Estadísticas». |
| `public/privacidad.html`, `public/privacidad-en.html`, `README.md`, specs | Textos. |
| `.env.production.local` (nuevo, **fuera de git**) | Dirección de Matomo, sitio y dimensiones. |
| `.env.example` (nuevo), `.gitignore` | Plantilla sin valores reales y regla para no subir los `.env` locales. |

---

### Task 1: Ajuste `stats` en el guardado

**Files:**
- Modify: `src/core/save.ts`
- Test: `tests/unit/save.test.ts`, `tests/unit/session.test.ts`

**Interfaces:**
- Produces: `Settings.stats: boolean` (por defecto `true`); `ToggleKey = 'music' | 'sfx' | 'joystick' | 'stats'`.

- [ ] **Step 1: Escribir los tests que fallan**

Añadir al final de `tests/unit/save.test.ts`:

```ts
describe('ajuste de estadísticas', () => {
  const withStats = (stats: unknown) => ({ ...defaultSave(), settings: { ...defaultSave().settings, stats } });

  it('por defecto están encendidas', () => {
    expect(defaultSave().settings.stats).toBe(true);
  });

  it('un guardado antiguo sin el ajuste las deja encendidas', () => {
    const old = { version: 2, state: { coins: 0, counts: {}, shopUnlocked: false }, settings: { music: false } };
    expect(parseSave(old)?.settings.stats).toBe(true);
  });

  it('se respeta el apagado', () => {
    expect(parseSave(withStats(false))?.settings.stats).toBe(false);
  });

  it('un valor que no es sí o no cuenta como encendido', () => {
    expect(parseSave(withStats('no'))?.settings.stats).toBe(true);
  });
});
```

- [ ] **Step 2: Comprobar que fallan**

Run: `npx vitest run tests/unit/save.test.ts`
Expected: FAIL en los cuatro tests nuevos (`stats` es `undefined`).

- [ ] **Step 3: Implementar**

En `src/core/save.ts`:

```ts
export interface Settings {
  music: boolean;
  sfx: boolean;
  joystick: boolean;
  /** Estadísticas anónimas. Apagarlas es la forma de oponerse a la medición. */
  stats: boolean;
  /** Idioma elegido en Ajustes. Ausente = automático: el del móvil. */
  language?: Language;
}

/** Los ajustes que son un interruptor de sí o no. */
export type ToggleKey = 'music' | 'sfx' | 'joystick' | 'stats';
```

```ts
export function defaultSettings(): Settings {
  return { music: true, sfx: true, joystick: false, stats: true };
}
```

En `parseSave`, la línea de `settings` pasa a ser:

```ts
    settings: {
      music: bool('music'),
      sfx: bool('sfx'),
      joystick: bool('joystick'),
      stats: bool('stats'),
      ...(language ? { language } : {}),
    },
```

- [ ] **Step 4: Actualizar las expectativas antiguas que comparan los ajustes enteros**

En `tests/unit/save.test.ts`:

- Test «migra un guardado v1 real»: en el objeto esperado, `settings: { music: true, sfx: false, joystick: false, stats: true },`.
- Test «rellena ajustes que falten»: `expect(parsed?.settings).toEqual({ music: false, sfx: true, joystick: false, stats: true });`.
- Test «una partida de la 2.2.0 se lee igual»: la última línea pasa a `expect(parseSave(old)).toEqual({ ...old, settings: { ...old.settings, stats: true } });`.

En `tests/unit/session.test.ts`, test «updateSettings guarda y emite settings-changed»:

```ts
    expect(handler).toHaveBeenCalledWith({ settings: { music: true, sfx: true, joystick: true, stats: true } });
```

- [ ] **Step 5: Comprobar que todo pasa**

Run: `npm run typecheck && npm test`
Expected: PASS, sin fallos.

- [ ] **Step 6: Commit**

```bash
git add src/core/save.ts tests/unit/save.test.ts tests/unit/session.test.ts
git commit -m "feat: ajuste de estadísticas en el guardado, encendido por defecto"
```

---

### Task 2: Banderas de actividad (`core/activity.ts`)

**Files:**
- Create: `src/core/activity.ts`
- Test: `tests/unit/activity.test.ts`

**Interfaces:**
- Produces:
  - `ACTIVITY_KEY = 'zooesponji_v3_activity'`
  - `interface ActivityState { firstDay: string; lastDay: string; sessions: number }`
  - `type ActivityFlag = 'nuevo' | 'dia' | 'semana' | 'mes'`
  - `dayKey(date: Date): string`
  - `parseActivity(raw: string | null): ActivityState | null`
  - `nextActivity(prev: ActivityState | null, today: string): { state: ActivityState; flags: ActivityFlag[] }`
  - `sessionBucket(sessions: number): string`
  - `ageBucket(firstDay: string, today: string): string`

- [ ] **Step 1: Escribir los tests que fallan**

`tests/unit/activity.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ageBucket, dayKey, nextActivity, parseActivity, sessionBucket, type ActivityState } from '../../src/core/activity';

const state = (firstDay: string, lastDay: string, sessions: number): ActivityState => ({ firstDay, lastDay, sessions });

describe('dayKey', () => {
  it('da el día en hora local, con ceros', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(dayKey(new Date(2026, 9, 17, 0, 0))).toBe('2026-10-17');
  });
});

describe('nextActivity', () => {
  it('la primera vez enciende las cuatro banderas', () => {
    expect(nextActivity(null, '2026-10-07')).toEqual({
      state: state('2026-10-07', '2026-10-07', 1),
      flags: ['nuevo', 'dia', 'semana', 'mes'],
    });
  });

  it('otra sesión el mismo día solo suma la sesión', () => {
    expect(nextActivity(state('2026-10-07', '2026-10-07', 1), '2026-10-07')).toEqual({
      state: state('2026-10-07', '2026-10-07', 2),
      flags: [],
    });
  });

  it('al día siguiente, en la misma semana y mes: solo día', () => {
    // 7-oct-2026 es miércoles; el 8 es jueves.
    expect(nextActivity(state('2026-10-07', '2026-10-07', 3), '2026-10-08').flags).toEqual(['dia']);
  });

  it('el lunes siguiente: día y semana', () => {
    expect(nextActivity(state('2026-10-07', '2026-10-11', 3), '2026-10-12').flags).toEqual(['dia', 'semana']);
  });

  it('domingo y lunes anterior son la misma semana', () => {
    expect(nextActivity(state('2026-10-05', '2026-10-05', 1), '2026-10-11').flags).toEqual(['dia']);
  });

  it('cambio de mes dentro de la misma semana: día y mes', () => {
    // 30-sep-2026 es miércoles; 1-oct es jueves.
    expect(nextActivity(state('2026-09-30', '2026-09-30', 1), '2026-10-01').flags).toEqual(['dia', 'mes']);
  });

  it('cambio de año: día, semana y mes', () => {
    expect(nextActivity(state('2026-12-20', '2026-12-20', 1), '2027-01-04').flags).toEqual(['dia', 'semana', 'mes']);
  });

  it('con el reloj hacia atrás no hay banderas y el último día no retrocede', () => {
    expect(nextActivity(state('2026-10-01', '2026-10-07', 4), '2026-10-03')).toEqual({
      state: state('2026-10-01', '2026-10-07', 5),
      flags: [],
    });
  });
});

describe('parseActivity', () => {
  it('lee un estado válido', () => {
    expect(parseActivity('{"firstDay":"2026-10-01","lastDay":"2026-10-07","sessions":4}')).toEqual(state('2026-10-01', '2026-10-07', 4));
  });

  it.each([
    ['nada guardado', null],
    ['no es JSON', '{'],
    ['no es un objeto', '3'],
    ['día mal escrito', '{"firstDay":"ayer","lastDay":"2026-10-07","sessions":4}'],
    ['sesiones no enteras', '{"firstDay":"2026-10-01","lastDay":"2026-10-07","sessions":1.5}'],
    ['sesiones a cero', '{"firstDay":"2026-10-01","lastDay":"2026-10-07","sessions":0}'],
  ])('devuelve null: %s', (_label, raw) => {
    expect(parseActivity(raw)).toBeNull();
  });
});

describe('tramos', () => {
  it.each([
    [1, '1'],
    [2, '2-5'],
    [5, '2-5'],
    [6, '6-20'],
    [20, '6-20'],
    [21, '21+'],
  ])('sesión %i → %s', (n, bucket) => {
    expect(sessionBucket(n)).toBe(bucket);
  });

  it.each([
    ['2026-10-07', 'd0'],
    ['2026-10-08', 'd1'],
    ['2026-10-09', 'd2-6'],
    ['2026-10-13', 'd2-6'],
    ['2026-10-14', 'd7-29'],
    ['2026-11-05', 'd7-29'],
    ['2026-11-06', 'd30+'],
    ['2026-10-01', 'd0'],
  ])('primer día 7-oct, hoy %s → %s', (today, bucket) => {
    expect(ageBucket('2026-10-07', today)).toBe(bucket);
  });
});
```

- [ ] **Step 2: Comprobar que fallan**

Run: `npx vitest run tests/unit/activity.test.ts`
Expected: FAIL, no existe `src/core/activity.ts`.

- [ ] **Step 3: Implementar**

`src/core/activity.ts`:

```ts
/**
 * Usuarios activos sin identificar a nadie: el dispositivo sabe si hoy es su primera sesión del día,
 * de la semana o del mes, y lo avisa con una bandera. Contar banderas es contar jugadores.
 */
export interface ActivityState {
  /** Primer día de juego, `AAAA-MM-DD` en hora local. */
  firstDay: string;
  /** Último día con sesión. */
  lastDay: string;
  sessions: number;
}

export type ActivityFlag = 'nuevo' | 'dia' | 'semana' | 'mes';

export const ACTIVITY_KEY = 'zooesponji_v3_activity';

const DAY_MS = 86_400_000;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function dayKey(date: Date): string {
  const two = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

function toUtc(day: string): number {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

/** El lunes de la semana de ese día: dos días son de la misma semana si comparten lunes. */
function monday(day: string): number {
  const time = toUtc(day);
  const sinceMonday = (new Date(time).getUTCDay() + 6) % 7;
  return time - sinceMonday * DAY_MS;
}

export function parseActivity(raw: string | null): ActivityState | null {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const { firstDay, lastDay, sessions } = value as Record<string, unknown>;
  if (typeof firstDay !== 'string' || !DAY_PATTERN.test(firstDay)) return null;
  if (typeof lastDay !== 'string' || !DAY_PATTERN.test(lastDay)) return null;
  if (typeof sessions !== 'number' || !Number.isInteger(sessions) || sessions < 1) return null;
  return { firstDay, lastDay, sessions };
}

export function nextActivity(prev: ActivityState | null, today: string): { state: ActivityState; flags: ActivityFlag[] } {
  if (!prev) return { state: { firstDay: today, lastDay: today, sessions: 1 }, flags: ['nuevo', 'dia', 'semana', 'mes'] };
  const sessions = prev.sessions + 1;
  // Mismo día, o el reloj del móvil ha ido hacia atrás: no cuenta otra vez.
  if (today <= prev.lastDay) return { state: { ...prev, sessions }, flags: [] };
  const flags: ActivityFlag[] = ['dia'];
  if (monday(today) !== monday(prev.lastDay)) flags.push('semana');
  if (today.slice(0, 7) !== prev.lastDay.slice(0, 7)) flags.push('mes');
  return { state: { firstDay: prev.firstDay, lastDay: today, sessions }, flags };
}

/** Tramos en vez de números exactos: no distinguen a un jugador de otro. */
export function sessionBucket(sessions: number): string {
  if (sessions <= 1) return '1';
  if (sessions <= 5) return '2-5';
  if (sessions <= 20) return '6-20';
  return '21+';
}

export function ageBucket(firstDay: string, today: string): string {
  const days = Math.round((toUtc(today) - toUtc(firstDay)) / DAY_MS);
  if (days <= 0) return 'd0';
  if (days === 1) return 'd1';
  if (days <= 6) return 'd2-6';
  if (days <= 29) return 'd7-29';
  return 'd30+';
}
```

- [ ] **Step 4: Comprobar que pasan**

Run: `npx vitest run tests/unit/activity.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/activity.ts tests/unit/activity.test.ts
git commit -m "feat: banderas de actividad para contar jugadores sin identificarlos"
```

---

### Task 3: Petición a Matomo (`core/matomoRequest.ts`)

**Files:**
- Create: `src/core/matomoRequest.ts`
- Test: `tests/unit/matomoRequest.test.ts`

**Interfaces:**
- Produces:
  - `type Hit = { kind: 'screen'; name: string } | { kind: 'event'; category: string; action: string; name?: string; value?: number }`
  - `interface DimensionIds { version: number; platform: number; language: number; sessions: number; age: number }`
  - `interface MatomoConfig { url: string; siteId: number; dimensions: DimensionIds }`
  - `interface MatomoEnv { VITE_MATOMO_URL?: string; VITE_MATOMO_SITE?: string; VITE_MATOMO_DIMS?: string }`
  - `interface HitContext { visitorId: string; rand: string; screen: string; version: string; platform: 'android' | 'web'; language: string; sessions: string; age: string }`
  - `parseConfig(env: MatomoEnv): MatomoConfig | null`
  - `trackerUrl(config: MatomoConfig): string`
  - `toQuery(hit: Hit, config: MatomoConfig, context: HitContext): string`
  - `toBulkBody(queries: readonly string[]): string`

- [ ] **Step 1: Escribir los tests que fallan**

`tests/unit/matomoRequest.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseConfig, toBulkBody, toQuery, trackerUrl, type HitContext, type MatomoConfig } from '../../src/core/matomoRequest';

const config: MatomoConfig = {
  url: 'https://stats.example.com',
  siteId: 7,
  dimensions: { version: 1, platform: 2, language: 3, sessions: 4, age: 5 },
};

const context: HitContext = {
  visitorId: '0123456789abcdef',
  rand: 'fedcba9876543210',
  screen: 'mapa',
  version: '2.5.0',
  platform: 'android',
  language: 'es',
  sessions: '2-5',
  age: 'd1',
};

const params = (query: string): Record<string, string> => Object.fromEntries(new URLSearchParams(query.slice(1)));

describe('parseConfig', () => {
  const env = { VITE_MATOMO_URL: 'https://stats.example.com/', VITE_MATOMO_SITE: '7', VITE_MATOMO_DIMS: '1, 2,3,4,5' };

  it('lee dirección, sitio y dimensiones, y quita la barra final', () => {
    expect(parseConfig(env)).toEqual(config);
  });

  it.each([
    ['sin nada', {}],
    ['sin https', { ...env, VITE_MATOMO_URL: 'http://stats.example.com' }],
    ['sitio que no es un número', { ...env, VITE_MATOMO_SITE: 'siete' }],
    ['sitio a cero', { ...env, VITE_MATOMO_SITE: '0' }],
    ['faltan dimensiones', { ...env, VITE_MATOMO_DIMS: '1,2,3,4' }],
    ['dimensión que no es un número', { ...env, VITE_MATOMO_DIMS: '1,2,x,4,5' }],
  ])('devuelve null: %s', (_label, bad) => {
    expect(parseConfig(bad)).toBeNull();
  });
});

describe('trackerUrl', () => {
  it('apunta a matomo.php', () => {
    expect(trackerUrl(config)).toBe('https://stats.example.com/matomo.php');
  });
});

describe('toQuery', () => {
  it('una pantalla lleva su título y la dirección de esa pantalla', () => {
    const query = toQuery({ kind: 'screen', name: 'mapa' }, config, context);
    expect(query.startsWith('?')).toBe(true);
    expect(params(query)).toEqual({
      idsite: '7',
      rec: '1',
      apiv: '1',
      rand: 'fedcba9876543210',
      _id: '0123456789abcdef',
      url: 'https://davidpladel.com/zoo/mapa',
      action_name: 'mapa',
      dimension1: '2.5.0',
      dimension2: 'android',
      dimension3: 'es',
      dimension4: '2-5',
      dimension5: 'd1',
    });
  });

  it('un evento lleva categoría, acción, nombre y valor', () => {
    const p = params(toQuery({ kind: 'event', category: 'progreso', action: 'animal', name: 'cabra', value: 3 }, config, context));
    expect(p.e_c).toBe('progreso');
    expect(p.e_a).toBe('animal');
    expect(p.e_n).toBe('cabra');
    expect(p.e_v).toBe('3');
    expect('action_name' in p).toBe(false);
  });

  it('sin nombre ni valor no se envían vacíos', () => {
    const p = params(toQuery({ kind: 'event', category: 'sesion', action: 'inicio' }, config, context));
    expect('e_n' in p).toBe(false);
    expect('e_v' in p).toBe(false);
  });

  it('nunca lleva identificadores ni datos del dispositivo', () => {
    const p = params(toQuery({ kind: 'event', category: 'sesion', action: 'inicio' }, config, context));
    for (const banned of ['uid', 'cid', 'res', 'urlref', 'ua', 'token_auth']) expect(banned in p, banned).toBe(false);
  });

  it('codifica los caracteres raros', () => {
    const query = toQuery({ kind: 'event', category: 'error', action: 'no-controlado', name: 'a&b=c ñ' }, config, context);
    expect(params(query).e_n).toBe('a&b=c ñ');
  });
});

describe('toBulkBody', () => {
  it('es el JSON de seguimiento por lotes de Matomo, sin token', () => {
    expect(JSON.parse(toBulkBody(['?a=1', '?b=2']))).toEqual({ requests: ['?a=1', '?b=2'] });
  });
});
```

- [ ] **Step 2: Comprobar que fallan**

Run: `npx vitest run tests/unit/matomoRequest.test.ts`
Expected: FAIL, no existe el módulo.

- [ ] **Step 3: Implementar**

`src/core/matomoRequest.ts`:

```ts
/** Lo que se le cuenta a Matomo: una pantalla o un evento. Solo ids, nunca nombres ni textos del juego. */
export type Hit =
  | { kind: 'screen'; name: string }
  | { kind: 'event'; category: string; action: string; name?: string; value?: number };

/** Ids de las dimensiones personalizadas (de visita) creadas en el sitio de Matomo. */
export interface DimensionIds {
  version: number;
  platform: number;
  language: number;
  sessions: number;
  age: number;
}

export interface MatomoConfig {
  /** Dirección de Matomo, sin barra final. */
  url: string;
  siteId: number;
  dimensions: DimensionIds;
}

export interface MatomoEnv {
  VITE_MATOMO_URL?: string;
  VITE_MATOMO_SITE?: string;
  /** Cinco ids separados por comas: versión, plataforma, idioma, sesión, antigüedad. */
  VITE_MATOMO_DIMS?: string;
}

export interface HitContext {
  /** 16 hexadecimales al azar, nuevos en cada sesión: agrupan la visita y no identifican a nadie. */
  visitorId: string;
  rand: string;
  /** Pantalla en la que está el jugador. */
  screen: string;
  version: string;
  platform: 'android' | 'web';
  language: string;
  sessions: string;
  age: string;
}

/** Matomo pide una dirección por acción: la de la web del juego más la pantalla. */
const BASE_URL = 'https://davidpladel.com/zoo/';

/** Sin configuración completa y válida no se mide (desarrollo, tests). */
export function parseConfig(env: MatomoEnv): MatomoConfig | null {
  const url = (env.VITE_MATOMO_URL ?? '').trim().replace(/\/+$/, '');
  const siteId = Number(env.VITE_MATOMO_SITE);
  const dims = (env.VITE_MATOMO_DIMS ?? '').split(',').map((x) => Number(x.trim()));
  const valid = (n: number): boolean => Number.isInteger(n) && n > 0;
  if (!url.startsWith('https://') || !valid(siteId) || dims.length !== 5 || !dims.every(valid)) return null;
  const [version, platform, language, sessions, age] = dims as [number, number, number, number, number];
  return { url, siteId, dimensions: { version, platform, language, sessions, age } };
}

export function trackerUrl(config: MatomoConfig): string {
  return `${config.url}/matomo.php`;
}

/** Cadena de consulta de la API de seguimiento de Matomo para una pantalla o un evento. */
export function toQuery(hit: Hit, config: MatomoConfig, context: HitContext): string {
  const p = new URLSearchParams({
    idsite: String(config.siteId),
    rec: '1',
    apiv: '1',
    rand: context.rand,
    _id: context.visitorId,
    url: BASE_URL + context.screen,
  });
  if (hit.kind === 'screen') {
    p.set('action_name', hit.name);
  } else {
    p.set('e_c', hit.category);
    p.set('e_a', hit.action);
    if (hit.name !== undefined) p.set('e_n', hit.name);
    if (hit.value !== undefined) p.set('e_v', String(hit.value));
  }
  const d = config.dimensions;
  p.set(`dimension${d.version}`, context.version);
  p.set(`dimension${d.platform}`, context.platform);
  p.set(`dimension${d.language}`, context.language);
  p.set(`dimension${d.sessions}`, context.sessions);
  p.set(`dimension${d.age}`, context.age);
  return `?${p.toString()}`;
}

/** Cuerpo del seguimiento por lotes. Sin `token_auth`: no se usa ningún parámetro que lo pida. */
export function toBulkBody(queries: readonly string[]): string {
  return JSON.stringify({ requests: queries });
}
```

- [ ] **Step 4: Comprobar que pasan**

Run: `npx vitest run tests/unit/matomoRequest.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/matomoRequest.ts tests/unit/matomoRequest.test.ts
git commit -m "feat: construcción de las peticiones a Matomo, sin identificadores"
```

---

### Task 4: Evento `book-page` en el `bus`

**Files:**
- Modify: `src/systems/events.ts`, `src/systems/session.ts`
- Test: `tests/unit/session.test.ts`

**Interfaces:**
- Produces: `GameEvents['book-page']: { pageId: string }`, emitido por `Session.setBookPage` cuando la página cambia.

- [ ] **Step 1: Escribir el test que falla**

Añadir al final de `tests/unit/session.test.ts`:

```ts
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
```

- [ ] **Step 2: Comprobar que falla**

Run: `npx vitest run tests/unit/session.test.ts`
Expected: FAIL (error de tipos en `'book-page'` o `handler` sin llamadas).

- [ ] **Step 3: Implementar**

En `src/systems/events.ts`, dentro de `GameEvents`, antes de `'settings-changed'`:

```ts
  /** El libro se ha abierto por otra página. */
  'book-page': { pageId: string };
```

En `src/systems/session.ts`:

```ts
  /** Página donde se ha quedado el libro. */
  async setBookPage(id: string): Promise<void> {
    if (this.data.book.page === id) return;
    this.data = { ...this.data, book: { ...this.data.book, page: id } };
    this.events.emit('book-page', { pageId: id });
    await writeSave(this.store, this.data);
  }
```

- [ ] **Step 4: Comprobar que pasa**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/systems/events.ts src/systems/session.ts tests/unit/session.test.ts
git commit -m "feat: el libro avisa por el bus cuando cambia de página"
```

---

### Task 5: Clase `Analytics`

**Files:**
- Create: `src/systems/analytics.ts`
- Test: `tests/unit/analytics.test.ts`

**Interfaces:**
- Consumes: Task 1 (`Settings.stats`), Task 2 (todo `activity.ts`), Task 3 (`toQuery`, `toBulkBody`, `trackerUrl`, `Hit`, `MatomoConfig`), Task 4 (`book-page`).
- Produces:
  - `QUEUE_LIMIT = 50`, `SESSION_GAP_MS = 1_800_000`
  - `interface AnalyticsDeps { config: MatomoConfig | null; store: KeyValueStore; events: EventBus<GameEvents>; send: (url: string, body: string) => void; now: () => Date; randomId: () => string; version: string; platform: 'android' | 'web'; language: () => string; settings: Settings; coins: number }`
  - `class Analytics { constructor(deps: AnalyticsDeps); start(): Promise<void>; track(hit: Hit): void; screenView(name: string): void; flush(): void; setBackground(hidden: boolean): void; reportError(error: unknown): void }`
  - `setAnalytics(analytics: Analytics | null): void`, `getAnalytics(): Analytics | null`

- [ ] **Step 1: Escribir los tests que fallan**

`tests/unit/analytics.test.ts`:

```ts
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
```

- [ ] **Step 2: Comprobar que fallan**

Run: `npx vitest run tests/unit/analytics.test.ts`
Expected: FAIL, no existe `src/systems/analytics.ts`.

- [ ] **Step 3: Implementar**

`src/systems/analytics.ts`:

```ts
import { ACTIVITY_KEY, ageBucket, dayKey, nextActivity, parseActivity, sessionBucket, type ActivityFlag } from '../core/activity';
import { toBulkBody, toQuery, trackerUrl, type Hit, type MatomoConfig } from '../core/matomoRequest';
import type { KeyValueStore, Settings } from '../core/save';
import type { EventBus, GameEvents } from './events';

export const QUEUE_LIMIT = 50;
/** Más de media hora en segundo plano: al volver cuenta como otra sesión. */
export const SESSION_GAP_MS = 30 * 60 * 1000;

const COIN_STEPS = [100, 500, 1000, 5000] as const;
const TOGGLE_ACTIONS = { music: 'musica', sfx: 'sonidos', joystick: 'joystick' } as const;

export interface AnalyticsDeps {
  /** Sin configuración no se mide (desarrollo, tests). */
  config: MatomoConfig | null;
  store: KeyValueStore;
  events: EventBus<GameEvents>;
  send: (url: string, body: string) => void;
  now: () => Date;
  /** 16 hexadecimales al azar. */
  randomId: () => string;
  version: string;
  platform: 'android' | 'web';
  language: () => string;
  /** Ajustes y monedas al arrancar; después se siguen por el bus. */
  settings: Settings;
  coins: number;
}

/**
 * Estadísticas anónimas hacia Matomo: sin cookies y sin identificador guardado. El id de visita se
 * crea al azar en cada sesión y vive solo en memoria. Medir nunca rompe el juego: todo fallo se traga.
 */
export class Analytics {
  private queue: string[] = [];
  private visitorId = '';
  private screen = '';
  private sessions = '1';
  private age = 'd0';
  private settings: Settings;
  private coins: number;
  private readonly coinSteps = new Set<number>();
  private startedAt = 0;
  private hiddenAt: number | null = null;

  constructor(private readonly deps: AnalyticsDeps) {
    this.settings = deps.settings;
    this.coins = deps.coins;
  }

  async start(): Promise<void> {
    if (!this.deps.config) return;
    const { events } = this.deps;
    events.on('settings-changed', ({ settings }) => this.onSettings(settings));
    events.on('coins-changed', ({ coins }) => this.onCoins(coins));
    events.on('shop-unlocked', () => this.event('progreso', 'tienda-abierta'));
    events.on('animal-unlocked', ({ penId }) => this.event('progreso', 'recinto', penId));
    events.on('animal-added', ({ penId, count }) => this.event('progreso', 'animal', penId, count));
    events.on('animal-fed', ({ penId, reaction }) => this.event('juego', `comida-${reaction}`, penId));
    events.on('book-page', ({ pageId }) => this.event('libro', 'pagina', pageId));
    await this.beginSession();
  }

  track(hit: Hit): void {
    const { config } = this.deps;
    if (!config || !this.settings.stats) return;
    this.queue.push(
      toQuery(hit, config, {
        visitorId: this.visitorId,
        rand: this.deps.randomId(),
        screen: this.screen,
        version: this.deps.version,
        platform: this.deps.platform,
        language: this.deps.language(),
        sessions: this.sessions,
        age: this.age,
      }),
    );
    if (this.queue.length > QUEUE_LIMIT) this.queue.shift();
  }

  /** Pantalla nueva. Las escenas se montan de nuevo al girar o redimensionar: la misma no se repite. */
  screenView(name: string): void {
    if (name === this.screen) return;
    this.screen = name;
    this.track({ kind: 'screen', name });
  }

  flush(): void {
    const { config } = this.deps;
    if (!config || this.queue.length === 0) return;
    const body = toBulkBody(this.queue);
    this.queue = [];
    try {
      this.deps.send(trackerUrl(config), body);
    } catch {
      // Sin red o sin permiso: el lote se pierde.
    }
  }

  /** El aviso puede llegar dos veces (Capacitor y navegador): solo cuenta el cambio. */
  setBackground(hidden: boolean): void {
    const now = this.deps.now().getTime();
    if (hidden) {
      if (this.hiddenAt !== null) return;
      this.hiddenAt = now;
      this.event('sesion', 'fin', undefined, Math.round((now - this.startedAt) / 1000));
      this.flush();
      return;
    }
    if (this.hiddenAt === null) return;
    const away = now - this.hiddenAt;
    this.hiddenAt = null;
    if (away >= SESSION_GAP_MS) void this.beginSession();
    else this.startedAt = now;
  }

  /** Solo el mensaje, sin traza ni direcciones, y se envía ya: tras un error puede no haber otra ocasión. */
  reportError(error: unknown): void {
    const raw = error instanceof Error ? error.message : String(error);
    const message = raw.replace(/\S+:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 100);
    this.event('error', 'no-controlado', message || 'desconocido');
    this.flush();
  }

  private event(category: string, action: string, name?: string, value?: number): void {
    this.track({ kind: 'event', category, action, ...(name !== undefined ? { name } : {}), ...(value !== undefined ? { value } : {}) });
  }

  private async beginSession(): Promise<void> {
    if (!this.deps.config || !this.settings.stats) return;
    const now = this.deps.now();
    this.visitorId = this.deps.randomId();
    this.startedAt = now.getTime();
    this.coinSteps.clear();
    const today = dayKey(now);
    let flags: readonly ActivityFlag[] = [];
    try {
      const next = nextActivity(parseActivity(await this.deps.store.get(ACTIVITY_KEY)), today);
      await this.deps.store.set(ACTIVITY_KEY, JSON.stringify(next.state));
      this.sessions = sessionBucket(next.state.sessions);
      this.age = ageBucket(next.state.firstDay, today);
      flags = next.flags;
    } catch {
      // Sin almacén no se sabe si es nuevo: mejor no contar que contar de más.
    }
    this.event('sesion', 'inicio');
    for (const flag of flags) this.event('activo', flag);
    if (this.screen) this.track({ kind: 'screen', name: this.screen });
  }

  private onSettings(next: Settings): void {
    const before = this.settings;
    this.settings = next;
    if (!next.stats) {
      this.queue = [];
      return;
    }
    if (!before.stats) {
      void this.beginSession();
      return;
    }
    for (const key of ['music', 'sfx', 'joystick'] as const) {
      if (next[key] !== before[key]) this.event('ajustes', TOGGLE_ACTIONS[key], next[key] ? 'on' : 'off');
    }
    if (next.language && next.language !== before.language) this.event('ajustes', 'idioma', next.language);
  }

  private onCoins(coins: number): void {
    for (const step of COIN_STEPS) {
      if (this.coins < step && coins >= step && !this.coinSteps.has(step)) {
        this.coinSteps.add(step);
        this.event('progreso', 'monedas', String(step));
      }
    }
    this.coins = coins;
  }
}

let current: Analytics | null = null;

export function setAnalytics(analytics: Analytics | null): void {
  current = analytics;
}

/** `null` mientras no se haya instalado (o si no hay configuración). */
export function getAnalytics(): Analytics | null {
  return current;
}
```

- [ ] **Step 4: Comprobar que pasan**

Run: `npx vitest run tests/unit/analytics.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/systems/analytics.ts tests/unit/analytics.test.ts
git commit -m "feat: estadísticas anónimas: cola, sesión y eventos del juego"
```

---

### Task 6: Conectar la analítica al juego

**Files:**
- Create: `src/systems/analyticsInstall.ts`
- Modify: `src/scenes/PreloadScene.ts` (método `startSession`), `src/systems/platform.ts` (método `setBackground`), `src/systems/errors.ts` (función `handle`)

**Interfaces:**
- Consumes: Task 5 (`Analytics`, `setAnalytics`, `getAnalytics`), Task 3 (`parseConfig`, `MatomoEnv`).
- Produces: `installAnalytics(game: Phaser.Game): Promise<void>` (nunca lanza).

No lleva test unitario propio: es el pegamento con Phaser, `fetch` y Capacitor. Se cubre con el typecheck, las pruebas de juego existentes (que comprueban que nada se rompe sin configuración) y la comprobación a mano de la Task 9.

- [ ] **Step 1: Crear el instalador**

`src/systems/analyticsInstall.ts`:

```ts
import { Capacitor } from '@capacitor/core';
import type * as Phaser from 'phaser';
import { parseConfig, type MatomoEnv } from '../core/matomoRequest';
import { APP_VERSION } from '../core/version';
import { Analytics, setAnalytics } from './analytics';
import { createStore } from './createStore';
import { bus } from './events';
import { getLanguage } from './language';
import { getSession } from './session';

const FLUSH_MS = 10_000;

/** Escena de Phaser → nombre de pantalla en Matomo. */
const SCREENS: Record<string, string> = {
  Title: 'titulo',
  World: 'mapa',
  Shop: 'tienda',
  Book: 'libro',
  Feed: 'comer',
  Settings: 'ajustes',
};

function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Sin cookies (`credentials: 'omit'`) y sin leer la respuesta. `keepalive` deja terminar el envío al salir. */
function send(url: string, body: string): void {
  void fetch(url, { method: 'POST', body, mode: 'no-cors', keepalive: true, credentials: 'omit' }).catch(() => {});
}

/** Arranca las estadísticas anónimas. Sin configuración (desarrollo, tests) no hace nada. Nunca lanza. */
export async function installAnalytics(game: Phaser.Game): Promise<void> {
  try {
    const config = parseConfig(import.meta.env as MatomoEnv);
    if (!config) return;
    const session = getSession();
    const analytics = new Analytics({
      config,
      store: createStore(),
      events: bus,
      send,
      now: () => new Date(),
      randomId,
      version: APP_VERSION,
      platform: Capacitor.isNativePlatform() ? 'android' : 'web',
      language: getLanguage,
      settings: session.settings,
      coins: session.state.coins,
    });
    setAnalytics(analytics);
    for (const [key, name] of Object.entries(SCREENS)) {
      const events = game.scene.getScene(key).events;
      events.on('start', () => analytics.screenView(name));
      events.on('resume', () => analytics.screenView(name));
    }
    setInterval(() => analytics.flush(), FLUSH_MS);
    await analytics.start();
  } catch {
    // Medir nunca impide jugar.
  }
}
```

- [ ] **Step 2: Arrancarla al cargar la sesión**

En `src/scenes/PreloadScene.ts`, añadir el import `import { installAnalytics } from '../systems/analyticsInstall';` y dejar `startSession` así:

```ts
  private async startSession(): Promise<void> {
    const session = await Session.load(createStore());
    setSession(session);
    // El idioma elegido en Ajustes; si no hay ninguno, el del móvil.
    setLanguage(resolveLanguage(session.settings.language, deviceLanguages()));
    // Antes del título, para que su pantalla ya se cuente.
    await installAnalytics(this.game);
    this.scene.start('Title');
  }
```

- [ ] **Step 3: Avisar del segundo plano**

En `src/systems/platform.ts`, añadir el import `import { getAnalytics } from './analytics';` y en `setBackground`, justo después de `sfx.setPaused('background', hidden);`:

```ts
    getAnalytics()?.setBackground(hidden);
```

- [ ] **Step 4: Avisar de los errores**

En `src/systems/errors.ts`, añadir el import `import { getAnalytics } from './analytics';` y dejar el principio de `handle` así:

```ts
async function handle(error: unknown): Promise<void> {
  console.error('[ZooEsponji] Error no controlado:', error);
  // A las estadísticas anónimas solo va un mensaje corto, sin traza.
  getAnalytics()?.reportError(error);
```

(Se quita el comentario antiguo «Solo en el dispositivo: sin envío remoto».)

- [ ] **Step 5: Comprobar**

Run: `npm run typecheck && npm test && npm run test:e2e`
Expected: PASS. Las pruebas de juego corren sin configuración, así que la analítica está apagada y el juego se comporta igual que antes.

- [ ] **Step 6: Commit**

```bash
git add src/systems/analyticsInstall.ts src/scenes/PreloadScene.ts src/systems/platform.ts src/systems/errors.ts
git commit -m "feat: las estadísticas anónimas se conectan al juego (pantallas, segundo plano, errores)"
```

---

### Task 7: Ficha «Estadísticas» en Ajustes

**Files:**
- Modify: `scripts/make-ui-assets.mjs`, `src/ui/icons.ts`, `src/scenes/SettingsScene.ts`, `src/data/strings/es.ts`, `src/data/strings/en.ts`, `src/systems/testHooks.ts`
- Create (generado): `public/assets/ui/icons/chart.svg`
- Test: `tests/e2e/polish.spec.ts`

**Interfaces:**
- Consumes: Task 1 (`ToggleKey` con `'stats'`).
- Produces: `window.__ZOO__.settingsTogglePos('stats')`.

- [ ] **Step 1: Escribir la prueba de juego que falla**

Añadir a `tests/e2e/polish.spec.ts`, después del test «menú ⚙️: apagar el sonido y ver los créditos»:

```ts
test('menú ⚙️: las estadísticas anónimas se pueden apagar y se quedan apagadas', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.openSettings());
  await page.waitForFunction(() => window.__ZOO__!.settingsTogglePos('stats') !== null);
  expect(await page.evaluate(() => window.__ZOO__!.settings().stats)).toBe(true);

  await tap(page, await page.evaluate(() => window.__ZOO__!.settingsTogglePos('stats')));
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.settings().stats)).toBe(false);

  await page.reload();
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
  expect(await page.evaluate(() => window.__ZOO__!.settings().stats)).toBe(false);
});
```

- [ ] **Step 2: Comprobar que falla**

Run: `npx playwright test tests/e2e/polish.spec.ts -g "estadísticas"`
Expected: FAIL (error de tipos en `'stats'` o tiempo agotado esperando la ficha).

- [ ] **Step 3: Icono nuevo**

En `scripts/make-ui-assets.mjs`, dentro de `ICONS`, después de `heart: 'heart',`:

```js
  chart: 'chart-bar',
```

En `src/ui/icons.ts`:

```ts
export const ICONS = ['play', 'close', 'music', 'volume', 'joystick', 'gear', 'lock', 'shield', 'door', 'left', 'right', 'heart', 'chart'] as const;
```

Run: `npm run make:ui-assets`
Expected: aparece `public/assets/ui/icons/chart.svg`. Con `git status --short public/assets/ui` solo debe salir ese archivo como nuevo; si el script ha tocado otros, descartar esos cambios con `git checkout -- <archivo>`.

- [ ] **Step 4: Textos**

En `src/data/strings/es.ts`, después de `'settings.joystick': 'Joystick',`:

```ts
  'settings.stats': 'Estadísticas',
```

En `src/data/strings/en.ts`, después de `'settings.joystick': 'Joystick',`:

```ts
  'settings.stats': 'Stats',
```

- [ ] **Step 5: Ficha en el menú**

En `src/scenes/SettingsScene.ts`:

```ts
const TOGGLES: readonly { key: ToggleKey; icon: IconName; label: StringKey }[] = [
  { key: 'music', icon: 'music', label: 'settings.music' },
  { key: 'sfx', icon: 'volume', label: 'settings.sfx' },
  { key: 'joystick', icon: 'joystick', label: 'settings.joystick' },
  { key: 'stats', icon: 'chart', label: 'settings.stats' },
];
```

El comentario de la clase pasa a `Menú de ajustes: música, sonido, joystick, estadísticas, idioma, privacidad, salir y créditos.` y el de la fila a `// Cinco fichas en fila: los cuatro interruptores y el idioma.`

- [ ] **Step 6: Gancho de pruebas**

En `src/systems/testHooks.ts`, cambiar el import de tipos a `import type { Settings, ToggleKey } from '../core/save';` y la línea de la interfaz a:

```ts
  settingsTogglePos(key: ToggleKey): Vec | null;
```

- [ ] **Step 7: Comprobar**

Run: `npm run typecheck && npm test && npm run test:e2e`
Expected: PASS. Mirar además el menú de Ajustes en `npm run dev` a 1280×720 y con la ventana estrecha (unos 700×360): las cinco fichas caben y las etiquetas no se pisan. Si «Estadísticas» se pisa con las vecinas, acortar el texto español a «Datos» y volver a lanzar `npm test`.

- [ ] **Step 8: Commit**

```bash
git add scripts/make-ui-assets.mjs src/ui/icons.ts public/assets/ui/icons/chart.svg src/scenes/SettingsScene.ts src/data/strings/es.ts src/data/strings/en.ts src/systems/testHooks.ts tests/e2e/polish.spec.ts
git commit -m "feat: ficha de estadísticas en Ajustes para apagar la medición anónima"
```

---

### Task 8: Privacidad y documentación

**Files:**
- Modify: `public/privacidad.html`, `public/privacidad-en.html`, `tests/unit/legal.test.ts`, `../README.md`, `../docs/superpowers/specs/2026-09-27-motor-phaser-v3-design.md`, `../docs/superpowers/specs/2026-09-27-v3-hito-6a-pulido-design.md`

- [ ] **Step 1: Actualizar el test de estructura**

En `tests/unit/legal.test.ts`, test «la página en inglés tiene la misma estructura que la española»: `expect(count(en, 'h2')).toBe(9);`. Y añadir dentro del mismo `describe`:

```ts
  it('explica las estadísticas anónimas y cómo apagarlas, en los dos idiomas', () => {
    const es = main(read(legalPage('es')));
    const en = main(read(legalPage('en')));
    expect(es).toContain('Estadísticas anónimas');
    expect(es).toContain('Ajustes');
    expect(es).not.toContain('Tampoco lleva');
    expect(en).toContain('Anonymous statistics');
    expect(en).toContain('Settings');
    expect(en).not.toContain('measurement or tracking tools either');
  });
```

Run: `npx vitest run tests/unit/legal.test.ts`
Expected: FAIL.

- [ ] **Step 2: Página en español**

En `public/privacidad.html`:

- Fecha: `<p><strong>Última actualización: 7 de octubre de 2026</strong></p>`
- «En pocas palabras» queda así:

```html
      <h2>En pocas palabras</h2>
      <p>
        Zoo Esponji es un juego para niños y <strong>no recoge datos personales</strong>. No hay que registrarse ni
        escribir el nombre, y el juego no tiene anuncios, compras, chat ni redes sociales. Solo cuenta, de forma
        anónima, cuánto se juega; se puede apagar en Ajustes.
      </p>
```

- «Qué guarda el juego» queda así:

```html
      <h2>Qué guarda el juego</h2>
      <p>
        La partida: las monedas, los animales y recintos conseguidos, las páginas del libro y los ajustes (música,
        sonidos, joystick, estadísticas e idioma). También el primer y el último día de juego y cuántas veces se ha
        abierto. Todo se guarda <strong>en tu propio dispositivo</strong> y se borra al desinstalar el juego o al
        borrar sus datos.
      </p>
```

- Apartado nuevo, justo después de «Qué guarda el juego»:

```html
      <h2>Estadísticas anónimas</h2>
      <p>
        Para saber si el juego gusta y dónde falla, el juego envía a un servidor propio de davidpladel avisos como
        «se ha abierto el juego», «se ha visto esta pantalla», «se ha dado de comer en este recinto» o «ha habido un
        error». No usa cookies ni ningún número que identifique al dispositivo o a quien juega, y no envía nombres.
        La dirección de internet se recorta al llegar y solo sirve para saber el país. Los datos no se ceden a nadie,
        no se usan para publicidad y se borran como muy tarde a los 25 meses. Se puede apagar cuando se quiera con el
        botón «Estadísticas» de Ajustes.
      </p>
```

- «Niños», segunda frase: `No pedimos ni guardamos información que identifique a menores.`
- «Tus derechos», primera frase: `Como el juego no recoge datos personales, no tenemos datos tuyos que consultar, corregir o borrar; las estadísticas anónimas se apagan en Ajustes.` (el resto del párrafo no cambia).
- «Cambios en esta página»: `Si el juego cambia y pasa a recoger algún dato más, esta página se actualizará antes, explicando qué se recoge y para qué.`

- [ ] **Step 3: Página en inglés**

En `public/privacidad-en.html`, los mismos cambios y en el mismo orden:

- `<p><strong>Last updated: 7 October 2026</strong></p>`

```html
      <h2>In a nutshell</h2>
      <p>
        Zoo Esponji is a game for children and it <strong>does not collect personal data</strong>. There is no sign-up
        and no need to type a name, and the game has no ads, purchases, chat or social networks. It only counts,
        anonymously, how much the game is played; you can turn that off in Settings.
      </p>
```

```html
      <h2>What the game saves</h2>
      <p>
        Your game: the coins, the animals and enclosures you have unlocked, the pages of the book and the settings
        (music, sounds, joystick, stats and language). Also the first and the last day you played and how many times
        the game has been opened. Everything is saved <strong>on your own device</strong> and is deleted when you
        uninstall the game or clear its data.
      </p>

      <h2>Anonymous statistics</h2>
      <p>
        To learn whether the game is fun and where it fails, the game sends notices to a server owned by davidpladel,
        such as "the game was opened", "this screen was seen", "an animal was fed in this enclosure" or "there was an
        error". It uses no cookies and no number that identifies the device or the player, and it sends no names. The
        internet address is shortened on arrival and is only used to know the country. The data is not shared with
        anyone, is not used for advertising and is deleted after 25 months at the latest. You can turn it off at any
        time with the "Stats" button in Settings.
      </p>
```

- En el apartado de niños, la frase equivalente a «No pedimos ni guardamos información de menores» pasa a: `We do not ask for or keep any information that identifies children.`
- En el apartado de derechos, la primera frase pasa a: `As the game does not collect personal data, we hold no data of yours to consult, correct or delete; the anonymous statistics can be turned off in Settings.`
- En el último apartado: `If the game changes and starts collecting any further data, this page will be updated first, explaining what is collected and why.`

Los dos archivos deben tener el mismo número de `<h2>` (9), `<p>` y `<strong>`.

- [ ] **Step 4: Comprobar**

Run: `npx vitest run tests/unit/legal.test.ts`
Expected: PASS.

- [ ] **Step 5: README y specs**

En `../README.md`:

- Línea 11: `sin textos largos, sin perder y sin anuncios.` no cambia.
- La línea de Families Policy pasa a:

```markdown
- **Google Play (Families Policy):** sin anuncios, sin permiso `AD_ID`, sin enlaces externos y sin SDK de terceros. Estadísticas anónimas hacia un Matomo propio (sin cookies ni identificadores; se apagan en Ajustes).
```

- En la descripción del menú ⚙️, añadir «estadísticas anónimas» a la lista de ajustes.
- En la tabla de documentos, después de la fila de idiomas:

```markdown
| [Spec](docs/superpowers/specs/2026-10-07-analitica-anonima-matomo-design.md) y [plan analítica](docs/superpowers/plans/2026-10-07-analitica-anonima-matomo.md) | Estadísticas anónimas con Matomo: usuarios activos sin identificadores, eventos y ficha en Ajustes |
```

En `../docs/superpowers/specs/2026-09-27-motor-phaser-v3-design.md`, apartado «Móvil y política de familias», debajo de la línea de «Ningún SDK de analítica…»:

```markdown
  - Desde el 7-oct-2026 hay estadísticas anónimas con código propio hacia un Matomo propio, sin SDK ni
    identificadores: ver `2026-10-07-analitica-anonima-matomo-design.md`.
```

En `../docs/superpowers/specs/2026-09-27-v3-hito-6a-pulido-design.md`, debajo de «No añadir SDKs (analítica, Firebase, crash reporting remoto…). Los errores se quedan en el dispositivo.»:

```markdown
  (Cambiado el 7-oct-2026: sigue sin SDK, pero hay estadísticas anónimas propias y de los errores sale un
  mensaje corto. Ver `2026-10-07-analitica-anonima-matomo-design.md`.)
```

- [ ] **Step 6: Comprobar y commit**

Run: `npm test`
Expected: PASS.

```bash
git add public/privacidad.html public/privacidad-en.html tests/unit/legal.test.ts ../README.md ../docs/superpowers/specs
git commit -m "docs: la privacidad y el README explican las estadísticas anónimas"
```

---

### Task 9: Matomo real, configuración y comprobación a mano

Esta tarea necesita a David. Los pasos 1 a 3 los hace él; el resto, quien ejecute el plan.

- [ ] **Step 1 (David): crear el sitio en Matomo**

1. Entra en Matomo y pulsa la rueda dentada (arriba a la derecha).
2. Menú izquierdo: **Sitios de internet → Administrar**.
3. Pulsa **Agregar un nuevo sitio** y elige **Sitio web**.
4. Nombre: `Zoo Esponji`. URL: `https://davidpladel.com/zoo`. Zona horaria: Madrid. Comercio electrónico: no. La URL es solo una etiqueta: la app de Android no la visita, pero Matomo pide una y el juego marca cada pantalla como `https://davidpladel.com/zoo/<pantalla>`.
5. Guarda y apunta el **ID** que le da Matomo al sitio.

- [ ] **Step 2 (David): crear las cinco dimensiones**

1. Rueda dentada → **Sitios de internet → Dimensiones personalizadas**.
2. Arriba, elige el sitio **Zoo Esponji** (las dimensiones son de cada sitio).
3. En el bloque de dimensiones de **Visita**, pulsa para configurar una nueva, ponle nombre, deja marcada la casilla **Activo** y pulsa **Crear**. Repite hasta tener estas cinco, en este orden:
   - `Version`
   - `Plataforma`
   - `Idioma`
   - `Tramo de sesion`
   - `Antiguedad`
4. Apunta el **ID** que Matomo le pone a cada una (sale en la lista).

- [ ] **Step 3 (David): pasar los datos**

Dile a Claude: la dirección de tu Matomo (la que sale en el navegador, hasta la primera barra), el ID del sitio y los cinco ID de las dimensiones en el orden de arriba. **No actives todavía el modo CNIL**: apaga el registro de visitas, que hace falta para la comprobación del paso 6.

- [ ] **Step 4: Escribir la configuración, fuera de git**

Añadir a `.gitignore` (el de `game/`):

```
.env*.local
```

Crear `.env.example` (este sí se sube, sin valores reales):

```
# Copiar a .env.production.local y rellenar. Ese archivo no se sube al repositorio.
VITE_MATOMO_URL=
VITE_MATOMO_SITE=
# Cinco ids separados por comas: versión, plataforma, idioma, sesión, antigüedad.
VITE_MATOMO_DIMS=
```

Crear `.env.production.local` con los valores de David, en el mismo formato. Comprobar que git no lo ve:

Run: `git status --short`
Expected: salen `.gitignore` y `.env.example`; **no** sale `.env.production.local`.

Avisar a David de que guarde una copia de ese archivo (por ejemplo en el repositorio privado `zooesponji-private`): si se pierde, la compilación sigue funcionando pero no mide nada.

- [ ] **Step 5: Compilar y abrir la compilación de producción**

Run: `npm run build`
Expected: compila sin errores.

Abrir con la herramienta de vista previa (`npm run preview`), jugar un minuto: pulsar jugar, abrir Ajustes, apagar y encender la música, dar de comer a un animal. En la pestaña de red deben verse peticiones `POST` a `…/matomo.php` cada 10 segundos como mucho, con un cuerpo `{"requests":[…]}`.

- [ ] **Step 6: Comprobar que Matomo las acepta**

En Matomo, con el sitio **Zoo Esponji** elegido: **Visitantes → Registro de visitas**. Debe salir una visita de hoy con las pantallas (`titulo`, `mapa`, `ajustes`) y los eventos (`sesion / inicio`, `activo / nuevo`, `ajustes / musica`, `juego / comida-…`), y con las cinco dimensiones rellenas.

- Si no llega nada: la petición `no-cors` con cuerpo `text/plain` no ha sido aceptada. Cambiar `send` en `src/systems/analyticsInstall.ts` para lanzar una petición `GET` por evento (`fetch(url + query, { mode: 'no-cors', keepalive: true, credentials: 'omit' })`) y `Analytics.flush` para pasarle la lista de consultas en vez del cuerpo por lotes; adaptar los tests de `analytics.test.ts`; repetir los pasos 5 y 6.
- Si llega pero cada evento sale como una visita distinta: revisar que `_id` viaja en todas las peticiones y es el mismo dentro de la sesión.

- [ ] **Step 7 (David): activar el modo CNIL en el sitio del juego**

1. Rueda dentada → **Privacidad → Cumplimiento**.
2. En el desplegable, elige **Zoo Esponji**.
3. Baja hasta **Reforzar ajustes que ayuden a alinear la exención de consentimiento con la CNIL siempre que sea posible**.
4. Marca **Garantizar el cumplimiento siempre que sea posible** y pulsa **Guardar**.
5. Vuelve a mirar la tabla: todo debe salir «conforme», salvo **Opc ext** (la opción de exclusión), que Matomo no puede comprobar: en el juego es el botón «Estadísticas» de Ajustes.

A partir de aquí el registro de visitas de ese sitio deja de estar disponible; los números se miran en **Comportamiento → Eventos** y en los informes de las dimensiones. Tu web davidpladel.com no cambia.

- [ ] **Step 8: Comprobar tras el modo CNIL**

Repetir el paso 5 y mirar en Matomo **Comportamiento → Eventos** del día: los eventos siguen llegando.

- [ ] **Step 9: Android**

Run: `npx cap sync android`
Después comprobar el manifiesto final:

Run: `grep -n "uses-permission" android/app/src/main/AndroidManifest.xml`
Expected: solo `android.permission.INTERNET`. Ni `AD_ID` ni ubicación.

David prueba la app en el móvil (comandos en PowerShell, en ventana aparte) y se repite la comprobación del paso 8: debe aparecer `android` en la dimensión `Plataforma`.

- [ ] **Step 10: Commit**

```bash
git add .gitignore .env.example
git commit -m "feat: plantilla de configuración de Matomo; los valores reales quedan fuera del repositorio"
```

- [ ] **Step 11 (David): Seguridad de los datos en Play Console**

Antes de subir a Play la versión que mide, en **Contenido de la aplicación → Seguridad de los datos**:

1. «¿Tu app recoge o comparte alguno de los tipos de datos de usuario requeridos?»: **Sí**.
2. «¿Se cifran en tránsito?»: **Sí** (va por https).
3. «¿Pueden los usuarios pedir que se borren sus datos?»: **No** (no hay datos ligados a una persona que borrar).
4. Tipos de datos, los tres como **recogidos**, **no compartidos**, **no tratados de forma efímera**, **opcionales** (se apagan en Ajustes) y con la finalidad **Analíticas**:
   - **Ubicación → Ubicación aproximada** (el país sale de la dirección de internet recortada).
   - **Actividad en la app → Interacciones con la app**.
   - **Información y rendimiento de la app → Diagnóstico**.
5. La URL de la política de privacidad no cambia; comprobar que la página publicada ya es la nueva.

- [ ] **Step 12: Cerrar la documentación**

Marcar la spec como implementada (línea «Estado») y actualizar el apartado de estado del `README.md` con la versión en la que sale.

```bash
git add ../README.md ../docs/superpowers/specs/2026-10-07-analitica-anonima-matomo-design.md
git commit -m "docs: estadísticas anónimas terminadas y comprobadas contra Matomo"
```
