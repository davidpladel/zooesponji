# Analítica detallada — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Medir con detalle qué gusta del juego (animal, comida, recinto, página, tienda), contar jugadores únicos sin identificador, no perder lo jugado sin conexión y poder leer los datos de Matomo por API.

**Architecture:** Las escenas solo emiten eventos del `bus`. Un `GameTracker` nuevo los traduce a eventos de un catálogo único y lleva el alcance (primera vez hoy / esta semana / en la vida) en una clave aparte del almacén. `Analytics` pasa a tener una cola guardada en el dispositivo que se reenvía con su fecha real (`cdt`). Dos scripts de Node fuera de `game/` leen los informes con un token de solo lectura.

**Tech Stack:** TypeScript, Phaser 3, Vite, Vitest, Playwright, Capacitor Preferences, Node 24 (scripts `.mjs` sin dependencias, `node --test`), API de seguimiento y de informes de Matomo.

**Spec:** `docs/superpowers/specs/2026-10-07-analitica-detallada-design.md`

## Global Constraints

- Nunca se envía ni se guarda un identificador de jugador o de instalación. Nunca `uid`, `cid`, `res`, `urlref`, `ua` ni `token_auth` en el seguimiento.
- Ningún análisis puede depender de segmentos de Matomo: todo cruce viaja en el nombre del evento.
- Ninguna cadena de categoría o acción se escribe fuera de `game/src/core/eventCatalog.ts`. Cada acción es única en todo el catálogo.
- Un residente se nombra siempre con su recinto delante: `cabra/gordi`. Con comida: `cabra/gordi/zanahoria`.
- Medir nunca rompe el juego: todo fallo de red o de almacén se traga.
- Claves de almacén nuevas: `zooesponji_v3_reach` y `zooesponji_v3_stats_queue`. No se toca `SAVE_VERSION` ni la partida.
- El repositorio es público: en código, tests, docs y commits solo aparece `https://stats.example.com`. El token de lectura vive en `tools/matomo/.env.local` (ignorado), sin prefijo `VITE_`.
- Código, comentarios y nombres de test en español, como el resto del proyecto. Comentarios solo donde el porqué no es obvio.
- Todos los comandos `npm` se lanzan desde `game/`. Los `git` y los de `tools/` desde la raíz del repositorio.
- Trabajar en la rama `feat/analitica-detallada` (crearla desde `main` antes de la Task 1).

## Mapa de ficheros

| Fichero | Qué hace |
|---|---|
| `game/src/core/eventCatalog.ts` (nuevo) | Categorías, acciones, tramos y nombres combinados. |
| `game/src/core/activity.ts` | Gana semana de inicio y banderas `vuelve-*`. |
| `game/src/core/reach.ts` (nuevo) | Estado de «ya hecho hoy / esta semana / alguna vez» y pasos del embudo. |
| `game/src/core/hitQueue.ts` (nuevo) | Cola guardable: tope, caducidad, lotes, fecha real. |
| `game/src/core/penNear.ts` (nuevo) | Decide cuándo la cuidadora «visita» un recinto. |
| `game/src/core/matomoRequest.ts` | Gana `replayHours` y `cdtParam`. |
| `game/src/systems/analytics.ts` | Sesión, cola guardada y envío con confirmación. |
| `game/src/systems/analyticsEvents.ts` (nuevo) | `GameTracker`: del `bus` al catálogo. |
| `game/src/systems/analyticsInstall.ts` | Conecta todo. |
| `game/src/systems/events.ts`, `session.ts` | Eventos nuevos del `bus`. |
| Escenas, `Pens.ts`, `platform.ts`, `testHooks.ts` | Emiten los eventos nuevos. |
| `game/scripts/check-dist.mjs` (nuevo) | Falla si la compilación lleva un token. |
| `tools/matomo/` (nuevo) | `lib.mjs`, `pull.mjs`, `resumen.mjs`, `probe.mjs`, `.env.example`, `README.md`. |

---

### Task 1: Catálogo de eventos

**Files:**
- Create: `game/src/core/eventCatalog.ts`
- Test: `game/tests/unit/eventCatalog.test.ts`

**Interfaces:**
- Consumes: `findResident(id)` de `game/src/data/pens.ts` (devuelve `{ penId, resident } | undefined`).
- Produces: `CATALOG`, `Category`, `ActionOf<C>`, `ReachKind`, `ReachScope`, `reachAction(scope, kind)`, `STEPS`, `Step`, `part(...parts)`, `residentName(residentId)`, y los tramos `feedsBucket`, `animalsBucket`, `pagesBucket`, `bookBucket`, `durationBucket`, `coinsBucket`, `pendingBucket`.

- [x] **Step 1: Escribir el test**

```ts
// game/tests/unit/eventCatalog.test.ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CATALOG, STEPS, animalsBucket, bookBucket, coinsBucket, durationBucket, feedsBucket, pagesBucket, part, pendingBucket,
  reachAction, residentName,
} from '../../src/core/eventCatalog';

describe('catálogo de eventos', () => {
  it('ninguna acción se repite, ni dentro de una categoría ni entre dos', () => {
    const all = Object.values(CATALOG).flat();
    expect(new Set(all).size).toBe(all.length);
  });

  it('toda acción está escrita en alguna de las dos specs de analítica', () => {
    const specs = ['2026-10-07-analitica-anonima-matomo-design.md', '2026-10-07-analitica-detallada-design.md']
      .map((name) => readFileSync(new URL(`../../../docs/superpowers/specs/${name}`, import.meta.url), 'utf8'))
      .join('\n');
    for (const action of Object.values(CATALOG).flat()) expect(specs.includes(action), action).toBe(true);
  });

  it('el embudo del catálogo son los pasos, en orden', () => {
    expect(CATALOG.embudo).toEqual(STEPS);
  });

  it('el alcance tiene sus tres ámbitos por tipo', () => {
    expect(reachAction('dia', 'animal')).toBe('dia-animal');
    expect(CATALOG.alcance).toContain(reachAction('vida', 'pantalla'));
  });
});

describe('nombres combinados', () => {
  it('un residente lleva su recinto delante', () => {
    expect(residentName('gordi')).toBe('cabra/gordi');
    expect(part(residentName('gordi'), 'zanahoria')).toBe('cabra/gordi/zanahoria');
  });

  it('un residente desconocido se queda como viene', () => {
    expect(residentName('nadie')).toBe('nadie');
  });
});

describe('tramos, en sus bordes', () => {
  it.each([[0, '0'], [1, '1-2'], [2, '1-2'], [3, '3-5'], [5, '3-5'], [6, '6-10'], [10, '6-10'], [11, '11-20'], [20, '11-20'], [21, '21+']])(
    'comidas %i → %s', (n, label) => expect(feedsBucket(n)).toBe(label));
  it.each([[0, '0'], [1, '1'], [2, '2-3'], [3, '2-3'], [4, '4-6'], [6, '4-6'], [7, '7+']])(
    'animales %i → %s', (n, label) => expect(animalsBucket(n)).toBe(label));
  it.each([[0, '0'], [1, '1'], [2, '2-3'], [3, '2-3'], [4, '4-7'], [7, '4-7'], [8, '8+']])(
    'páginas de una lectura %i → %s', (n, label) => expect(pagesBucket(n)).toBe(label));
  it.each([[0, '0'], [1, '1-5'], [5, '1-5'], [6, '6-15'], [15, '6-15'], [16, '16-30'], [30, '16-30'], [31, '31+']])(
    'páginas del libro %i → %s', (n, label) => expect(bookBucket(n)).toBe(label));
  it.each([[0, '<1m'], [59, '<1m'], [60, '1-3m'], [179, '1-3m'], [180, '3-10m'], [599, '3-10m'], [600, '10-30m'], [1799, '10-30m'], [1800, '30m+']])(
    'duración %i s → %s', (s, label) => expect(durationBucket(s)).toBe(label));
  it.each([[0, '0-19'], [19, '0-19'], [20, '20-49'], [49, '20-49'], [50, '50-149'], [149, '50-149'], [150, '150-399'], [399, '150-399'], [400, '400-899'], [899, '400-899'], [900, '900-1599'], [1599, '900-1599'], [1600, '1600+']])(
    'saldo %i → %s', (coins, label) => expect(coinsBucket(coins)).toBe(label));
  it.each([[0, '<1h'], [3_599_999, '<1h'], [3_600_000, '1-6h'], [21_600_000, '6-24h'], [86_400_000, '1-3d'], [259_200_000, '3-7d'], [604_800_000, '7d+']])(
    'edad de lo pendiente %i ms → %s', (ms, label) => expect(pendingBucket(ms)).toBe(label));
});
```

- [x] **Step 2: Comprobar que falla**

Run: `npx vitest run tests/unit/eventCatalog.test.ts`
Expected: FAIL, no encuentra `../../src/core/eventCatalog`.

- [x] **Step 3: Implementar**

```ts
// game/src/core/eventCatalog.ts
import { findResident } from '../data/pens';

/** Pasos del embudo de inicio. Cada uno se envía una vez en la vida de la instalación. */
export const STEPS = [
  'primer-paso', 'primer-toque-animal', 'primera-ventana', 'primera-comida', 'tienda-abierta',
  'primera-tienda', 'primera-compra', 'primer-libro', 'libro-completo', 'zoo-completo',
] as const;
export type Step = (typeof STEPS)[number];

/**
 * Todo lo que se le cuenta a Matomo, por categoría. Ninguna acción se repite en el catálogo entero:
 * así el informe «acción × nombre» se lee sin segmentos (en modo CNIL los segmentos se redondean).
 */
export const CATALOG = {
  sesion: ['inicio', 'fin', 'rato-comidas', 'rato-animales'],
  activo: ['nuevo', 'dia', 'semana', 'mes', 'vuelve-d1', 'vuelve-d7', 'vuelve-d30'],
  progreso: ['recinto', 'animal', 'monedas'],
  comer: ['toca-animal', 'ventana', 'come', 'rechaza', 'especial', 'fuera', 'ventana-fin', 'ventana-tiempo', 'ventana-vacia'],
  mapa: ['cerca', 'cerca-cerrado', 'toca-cerrado', 'tienda-cerrada', 'control'],
  tienda: ['mira', 'compra', 'sin-monedas', 'tienda-fin', 'tienda-sin-compra'],
  libro: ['abre', 'lee', 'hojea', 'bloqueada', 'indice', 'libro-fin'],
  ajustes: ['musica', 'sonidos', 'joystick', 'idioma', 'privacidad', 'salir-pregunta', 'salir-si', 'salir-no'],
  tiene: ['tiene-recinto', 'tiene-animal', 'tiene-saldo', 'tiene-paginas', 'tiene-ajuste'],
  alcance: [
    'dia-animal', 'semana-animal', 'vida-animal',
    'dia-comida', 'semana-comida', 'vida-comida',
    'dia-recinto', 'semana-recinto', 'vida-recinto',
    'dia-pagina', 'semana-pagina', 'vida-pagina',
    'dia-pantalla', 'semana-pantalla', 'vida-pantalla',
    'vida-especial',
  ],
  embudo: STEPS,
  calidad: ['perdidos', 'pendientes'],
  error: ['no-controlado'],
} as const;

export type Category = keyof typeof CATALOG;
export type ActionOf<C extends Category> = (typeof CATALOG)[C][number];

export type ReachKind = 'animal' | 'comida' | 'recinto' | 'pagina' | 'pantalla';
export type ReachScope = 'dia' | 'semana' | 'vida';

export function reachAction(scope: ReachScope, kind: ReachKind): `${ReachScope}-${ReachKind}` {
  return `${scope}-${kind}`;
}

/** Nombre combinado: el cruce viaja ya hecho. */
export function part(...parts: string[]): string {
  return parts.join('/');
}

/** Un residente se nombra con su recinto delante (`cabra/gordi`): los datos se leen sin el catálogo del juego. */
export function residentName(residentId: string): string {
  const found = findResident(residentId);
  return found ? part(found.penId, residentId) : residentId;
}

type Edges = readonly (readonly [max: number, label: string])[];

function bucket(value: number, edges: Edges, last: string): string {
  for (const [max, label] of edges) if (value <= max) return label;
  return last;
}

/** Comidas dadas en un rato de juego. */
export const feedsBucket = (n: number): string => bucket(n, [[0, '0'], [2, '1-2'], [5, '3-5'], [10, '6-10'], [20, '11-20']], '21+');
/** Animales distintos alimentados en un rato de juego. */
export const animalsBucket = (n: number): string => bucket(n, [[0, '0'], [1, '1'], [3, '2-3'], [6, '4-6']], '7+');
/** Páginas leídas en una apertura del libro. */
export const pagesBucket = (n: number): string => bucket(n, [[0, '0'], [1, '1'], [3, '2-3'], [7, '4-7']], '8+');
/** Páginas del libro leídas en total. */
export const bookBucket = (n: number): string => bucket(n, [[0, '0'], [5, '1-5'], [15, '6-15'], [30, '16-30']], '31+');
export const durationBucket = (seconds: number): string => bucket(seconds, [[59, '<1m'], [179, '1-3m'], [599, '3-10m'], [1799, '10-30m']], '30m+');
/** Alineado con los precios de la tienda: dice qué se puede permitir el jugador. */
export const coinsBucket = (coins: number): string =>
  bucket(coins, [[19, '0-19'], [49, '20-49'], [149, '50-149'], [399, '150-399'], [899, '400-899'], [1599, '900-1599']], '1600+');
const HOUR_MS = 3_600_000;
/** Edad del evento más viejo que esperaba en el dispositivo. */
export const pendingBucket = (ms: number): string =>
  bucket(ms, [[HOUR_MS - 1, '<1h'], [6 * HOUR_MS - 1, '1-6h'], [24 * HOUR_MS - 1, '6-24h'], [72 * HOUR_MS - 1, '1-3d'], [168 * HOUR_MS - 1, '3-7d']], '7d+');
```

- [x] **Step 4: Comprobar que pasa**

Run: `npx vitest run tests/unit/eventCatalog.test.ts && npx tsc --noEmit`
Expected: PASS y sin errores de tipos. Si el test de las specs falla por una acción, corregir la spec (falta en la tabla), no el test.

- [x] **Step 5: Commit**

```bash
git add game/src/core/eventCatalog.ts game/tests/unit/eventCatalog.test.ts
git commit -m "feat: catálogo único de eventos de estadísticas, con tramos"
```

---

### Task 2: Semana de inicio y retención en `activity.ts`

**Files:**
- Modify: `game/src/core/activity.ts`
- Test: `game/tests/unit/activity.test.ts`

**Interfaces:**
- Produces: `ReturnFlag = 'vuelve-d1' | 'vuelve-d7' | 'vuelve-d30'`; `ActivityState.returned?: ReturnFlag[]`; `weekStart(day: string): number` (antes `monday`, privada); `daysBetween(from: string, to: string): number`; `cohortWeek(day: string): string` (`AAAA-Snn`); `nextActivity(prev, today)` devuelve además `returns: ReturnFlag[]`.

- [x] **Step 1: Añadir tests y adaptar los que comparan el resultado entero**

En `game/tests/unit/activity.test.ts`: en los tres `toEqual({ state: …, flags: … })` que comparan el objeto entero (primera vez, mismo día, reloj hacia atrás) añadir `returns: []`. Añadir al import `cohortWeek, daysBetween` y este bloque al final:

```ts
describe('semana de inicio y retención', () => {
  it('la semana de inicio es la semana ISO', () => {
    expect(cohortWeek('2026-10-07')).toBe('2026-S41');
    expect(cohortWeek('2027-01-03')).toBe('2026-S53');
    expect(cohortWeek('2027-01-04')).toBe('2027-S01');
  });

  it('cuenta días entre dos fechas', () => {
    expect(daysBetween('2026-10-07', '2026-10-08')).toBe(1);
    expect(daysBetween('2026-12-31', '2027-01-07')).toBe(7);
  });

  it('volver al día siguiente avisa de d1, una sola vez', () => {
    const first = nextActivity(state('2026-10-07', '2026-10-07', 1), '2026-10-08');
    expect(first.returns).toEqual(['vuelve-d1']);
    expect(first.state.returned).toEqual(['vuelve-d1']);
    expect(nextActivity(first.state, '2026-10-09').returns).toEqual([]);
  });

  it('volver por primera vez a los 40 días avisa de las tres', () => {
    const next = nextActivity(state('2026-10-07', '2026-10-07', 1), '2026-11-16');
    expect(next.returns).toEqual(['vuelve-d1', 'vuelve-d7', 'vuelve-d30']);
  });

  it('el mismo día no hay retorno', () => {
    expect(nextActivity(state('2026-10-07', '2026-10-07', 1), '2026-10-07').returns).toEqual([]);
  });

  it('lee y conserva lo ya avisado, y descarta valores raros', () => {
    const raw = '{"firstDay":"2026-10-01","lastDay":"2026-10-07","sessions":4,"returned":["vuelve-d1","otra"]}';
    expect(parseActivity(raw)?.returned).toEqual(['vuelve-d1']);
  });
});
```

- [x] **Step 2: Comprobar que falla**

Run: `npx vitest run tests/unit/activity.test.ts`
Expected: FAIL (`cohortWeek` no existe, falta `returns`).

- [x] **Step 3: Implementar**

En `game/src/core/activity.ts`:

Sustituir la interfaz `ActivityState` y añadir el tipo:

```ts
export type ReturnFlag = 'vuelve-d1' | 'vuelve-d7' | 'vuelve-d30';

/** Días desde el primero a partir de los cuales una sesión cuenta como «ha vuelto». */
const RETURNS: readonly (readonly [days: number, flag: ReturnFlag])[] = [[1, 'vuelve-d1'], [7, 'vuelve-d7'], [30, 'vuelve-d30']];

export interface ActivityState {
  /** Primer día de juego, `AAAA-MM-DD` en hora local. */
  firstDay: string;
  /** Último día con sesión. */
  lastDay: string;
  sessions: number;
  /** Retornos ya avisados: cada uno se envía una vez en la vida. */
  returned?: ReturnFlag[];
}
```

Renombrar `monday` a `weekStart` y exportarla (actualizar su uso en `nextActivity`). Añadir debajo:

```ts
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

/** Semana ISO del día (`2026-S41`): agrupa a los jugadores que empezaron a la vez. */
export function cohortWeek(day: string): string {
  const thursday = weekStart(day) + 3 * DAY_MS;
  const year = new Date(thursday).getUTCFullYear();
  const week = Math.floor((thursday - Date.UTC(year, 0, 1)) / (7 * DAY_MS)) + 1;
  return `${year}-S${String(week).padStart(2, '0')}`;
}
```

En `parseActivity`, sustituir las dos últimas líneas (la desestructuración sigue igual, añadiendo `returned`):

```ts
  const { firstDay, lastDay, sessions, returned } = value as Record<string, unknown>;
  if (typeof firstDay !== 'string' || !DAY_PATTERN.test(firstDay)) return null;
  if (typeof lastDay !== 'string' || !DAY_PATTERN.test(lastDay)) return null;
  if (typeof sessions !== 'number' || !Number.isInteger(sessions) || sessions < 1) return null;
  const known = Array.isArray(returned) ? RETURNS.map(([, flag]) => flag).filter((flag) => returned.includes(flag)) : [];
  return { firstDay, lastDay, sessions, ...(known.length > 0 ? { returned: known } : {}) };
```

Sustituir `nextActivity` entera:

```ts
export function nextActivity(
  prev: ActivityState | null,
  today: string,
): { state: ActivityState; flags: ActivityFlag[]; returns: ReturnFlag[] } {
  if (!prev) return { state: { firstDay: today, lastDay: today, sessions: 1 }, flags: ['nuevo', 'dia', 'semana', 'mes'], returns: [] };
  const sessions = prev.sessions + 1;
  // Mismo día, o el reloj del móvil ha ido hacia atrás: no cuenta otra vez.
  if (today <= prev.lastDay) return { state: { ...prev, sessions }, flags: [], returns: [] };
  const flags: ActivityFlag[] = ['dia'];
  if (weekStart(today) !== weekStart(prev.lastDay)) flags.push('semana');
  if (today.slice(0, 7) !== prev.lastDay.slice(0, 7)) flags.push('mes');
  const days = daysBetween(prev.firstDay, today);
  const already = prev.returned ?? [];
  const returns = RETURNS.filter(([min, flag]) => days >= min && !already.includes(flag)).map(([, flag]) => flag);
  const returned = [...already, ...returns];
  return {
    state: { firstDay: prev.firstDay, lastDay: today, sessions, ...(returned.length > 0 ? { returned } : {}) },
    flags,
    returns,
  };
}
```

En `ageBucket`, sustituir la primera línea por `const days = daysBetween(firstDay, today);`.

- [x] **Step 4: Comprobar que pasa**

Run: `npx vitest run tests/unit/activity.test.ts tests/unit/analytics.test.ts && npx tsc --noEmit`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add game/src/core/activity.ts game/tests/unit/activity.test.ts
git commit -m "feat: semana de inicio y banderas de retorno (d1, d7, d30) sin identificador"
```

---

### Task 3: Alcance y embudo (`reach.ts`)

**Files:**
- Create: `game/src/core/reach.ts`
- Test: `game/tests/unit/reach.test.ts`

**Interfaces:**
- Consumes: `weekStart` (Task 2); `ReachKind`, `ReachScope`, `Step` (Task 1).
- Produces: `REACH_KEY`; `ReachState { day; week; today: string[]; thisWeek: string[]; ever: string[]; steps: Step[]; playSeconds: number }`; `emptyReach(today)`; `parseReach(raw: string | null): ReachState | null`; `markReach(state, kind, id, today): { state; scopes: ReachScope[] }`; `markEver(state, key): { state; first: boolean }`; `markStep(state, step): { state; first: boolean }`; `addPlay(state, seconds)`; `seedSteps(state, steps)`.

- [x] **Step 1: Escribir el test**

```ts
// game/tests/unit/reach.test.ts
import { describe, expect, it } from 'vitest';
import { addPlay, emptyReach, markEver, markReach, markStep, parseReach, seedSteps } from '../../src/core/reach';

const MON = '2026-10-05';
const TUE = '2026-10-06';
const NEXT_MON = '2026-10-12';

describe('alcance', () => {
  it('la primera vez cuenta para hoy, la semana y la vida', () => {
    expect(markReach(emptyReach(MON), 'animal', 'cabra/gordi', MON).scopes).toEqual(['dia', 'semana', 'vida']);
  });

  it('la segunda vez del mismo día no cuenta', () => {
    const once = markReach(emptyReach(MON), 'animal', 'cabra/gordi', MON).state;
    const again = markReach(once, 'animal', 'cabra/gordi', MON);
    expect(again.scopes).toEqual([]);
    expect(again.state).toBe(once);
  });

  it('al día siguiente de la misma semana solo cuenta para el día', () => {
    const once = markReach(emptyReach(MON), 'animal', 'cabra/gordi', MON).state;
    expect(markReach(once, 'animal', 'cabra/gordi', TUE).scopes).toEqual(['dia']);
  });

  it('el lunes siguiente cuenta para el día y la semana, no para la vida', () => {
    const once = markReach(emptyReach(MON), 'animal', 'cabra/gordi', MON).state;
    expect(markReach(once, 'animal', 'cabra/gordi', NEXT_MON).scopes).toEqual(['dia', 'semana']);
  });

  it('el mismo id en otro tipo es otra cosa', () => {
    const once = markReach(emptyReach(MON), 'recinto', 'cabra', MON).state;
    expect(markReach(once, 'pantalla', 'cabra', MON).scopes).toEqual(['dia', 'semana', 'vida']);
  });

  it('con el reloj hacia atrás no se vacía nada', () => {
    const once = markReach(emptyReach(TUE), 'comida', 'pan', TUE).state;
    expect(markReach(once, 'comida', 'pan', MON).scopes).toEqual([]);
  });
});

describe('una vez en la vida', () => {
  it('markEver avisa solo la primera vez', () => {
    const first = markEver(emptyReach(MON), 'especial:cabra/conejo');
    expect(first.first).toBe(true);
    expect(markEver(first.state, 'especial:cabra/conejo').first).toBe(false);
  });

  it('un paso del embudo se da una sola vez', () => {
    const first = markStep(emptyReach(MON), 'primera-comida');
    expect(first.first).toBe(true);
    expect(markStep(first.state, 'primera-comida').first).toBe(false);
  });

  it('los pasos sembrados ya no avisan', () => {
    const seeded = seedSteps(emptyReach(MON), ['tienda-abierta', 'primera-compra']);
    expect(markStep(seeded, 'tienda-abierta').first).toBe(false);
    expect(markStep(seeded, 'primer-libro').first).toBe(true);
  });

  it('acumula el tiempo de juego', () => {
    expect(addPlay(addPlay(emptyReach(MON), 90), 30).playSeconds).toBe(120);
  });
});

describe('guardado', () => {
  it('se lee lo que se guarda', () => {
    const state = markReach(emptyReach(MON), 'animal', 'cabra/gordi', MON).state;
    expect(parseReach(JSON.stringify(state))).toEqual(state);
  });

  it.each([null, '', 'no es json', '[]', '{"day":"ayer"}', '{"day":"2026-10-05","week":"1","today":[1]}'])(
    'un valor ilegible (%s) es «sin estado»', (raw) => expect(parseReach(raw)).toBeNull());
});
```

- [x] **Step 2: Comprobar que falla**

Run: `npx vitest run tests/unit/reach.test.ts`
Expected: FAIL, no encuentra el módulo.

- [x] **Step 3: Implementar**

```ts
// game/src/core/reach.ts
import { weekStart } from './activity';
import { STEPS, type ReachKind, type ReachScope, type Step } from './eventCatalog';

/**
 * Jugadores únicos sin identificar a nadie: el dispositivo recuerda qué ha hecho hoy, esta semana y
 * alguna vez, y avisa solo la primera. Contar avisos es contar jugadores.
 */
export interface ReachState {
  /** Día al que pertenece `today`, `AAAA-MM-DD` en hora local. */
  day: string;
  /** Lunes de la semana a la que pertenece `thisWeek`. */
  week: string;
  today: string[];
  thisWeek: string[];
  ever: string[];
  /** Pasos del embudo ya dados. */
  steps: Step[];
  /** Segundos de juego en primer plano desde la instalación. */
  playSeconds: number;
}

export const REACH_KEY = 'zooesponji_v3_reach';

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function emptyReach(today: string): ReachState {
  return { day: today, week: String(weekStart(today)), today: [], thisWeek: [], ever: [], steps: [], playSeconds: 0 };
}

function strings(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? (value as string[]) : null;
}

export function parseReach(raw: string | null): ReachState | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const today = strings(v.today);
  const thisWeek = strings(v.thisWeek);
  const ever = strings(v.ever);
  const steps = strings(v.steps);
  if (typeof v.day !== 'string' || !DAY_PATTERN.test(v.day) || typeof v.week !== 'string') return null;
  if (!today || !thisWeek || !ever || !steps) return null;
  if (typeof v.playSeconds !== 'number' || !Number.isFinite(v.playSeconds) || v.playSeconds < 0) return null;
  return {
    day: v.day,
    week: v.week,
    today,
    thisWeek,
    ever,
    steps: STEPS.filter((step) => steps.includes(step)),
    playSeconds: v.playSeconds,
  };
}

/** Día nuevo: se vacía lo de hoy; lunes nuevo: también lo de la semana. Con el reloj hacia atrás, nada. */
function roll(state: ReachState, today: string): ReachState {
  if (today <= state.day) return state;
  const week = String(weekStart(today));
  return { ...state, day: today, week, today: [], thisWeek: week === state.week ? state.thisWeek : [] };
}

export function markReach(state: ReachState, kind: ReachKind, id: string, today: string): { state: ReachState; scopes: ReachScope[] } {
  let next = roll(state, today);
  const key = `${kind}:${id}`;
  const scopes: ReachScope[] = [];
  if (!next.today.includes(key)) {
    scopes.push('dia');
    next = { ...next, today: [...next.today, key] };
  }
  if (!next.thisWeek.includes(key)) {
    scopes.push('semana');
    next = { ...next, thisWeek: [...next.thisWeek, key] };
  }
  if (!next.ever.includes(key)) {
    scopes.push('vida');
    next = { ...next, ever: [...next.ever, key] };
  }
  return { state: next, scopes };
}

export function markEver(state: ReachState, key: string): { state: ReachState; first: boolean } {
  if (state.ever.includes(key)) return { state, first: false };
  return { state: { ...state, ever: [...state.ever, key] }, first: true };
}

export function markStep(state: ReachState, step: Step): { state: ReachState; first: boolean } {
  if (state.steps.includes(step)) return { state, first: false };
  return { state: { ...state, steps: [...state.steps, step] }, first: true };
}

/** Pasos que ya estaban dados antes de empezar a medir: se apuntan sin avisar. */
export function seedSteps(state: ReachState, steps: readonly Step[]): ReachState {
  return { ...state, steps: STEPS.filter((step) => state.steps.includes(step) || steps.includes(step)) };
}

export function addPlay(state: ReachState, seconds: number): ReachState {
  return { ...state, playSeconds: state.playSeconds + Math.max(0, seconds) };
}
```

- [x] **Step 4: Comprobar que pasa**

Run: `npx vitest run tests/unit/reach.test.ts && npx tsc --noEmit`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add game/src/core/reach.ts game/tests/unit/reach.test.ts
git commit -m "feat: alcance diario, semanal y de vida, y pasos del embudo, guardados en el dispositivo"
```

---

### Task 4: Cola guardable con fecha real (`hitQueue.ts`, `matomoRequest.ts`)

**Files:**
- Create: `game/src/core/hitQueue.ts`
- Modify: `game/src/core/matomoRequest.ts`, `game/.env.example`
- Test: `game/tests/unit/hitQueue.test.ts`, `game/tests/unit/matomoRequest.test.ts`, `game/tests/unit/analytics.test.ts` (solo el objeto `config`)

**Interfaces:**
- Produces (matomoRequest): `MatomoConfig.replayHours: number`; `MatomoEnv.VITE_MATOMO_REPLAY_HOURS?: string`; `DEFAULT_REPLAY_HOURS = 23`; `cdtParam(time: number): string`.
- Produces (hitQueue): `QUEUE_KEY`, `QUEUE_LIMIT = 1000`, `BATCH_SIZE = 50`, `CDT_AFTER_MS = 300_000`; `StoredHit { q: string; t: number }`; `QueueState { hits: StoredHit[]; lost: { full: number; expired: number } }`; `emptyQueue()`, `parseQueue(raw)`, `push(state, hit, limit?)`, `expire(state, now, maxAge)`, `takeBatch(state, size?)`, `ack(state, batch)`, `clearLost(state)`, `stamp(hit, now)`, `oldestAge(state, now)`, `maxAgeMs(replayHours)`.

- [x] **Step 1: Tests de `matomoRequest`**

En `game/tests/unit/matomoRequest.test.ts` y en `game/tests/unit/analytics.test.ts`, añadir `replayHours: 23,` al objeto `config`. En `matomoRequest.test.ts`, añadir `cdtParam` al import y, dentro de `describe('parseConfig', …)`:

```ts
  it('sin ventana de reenvío usa 23 horas', () => {
    expect(parseConfig(env)?.replayHours).toBe(23);
  });

  it.each([['167', 167], ['0', 0], ['9999', 720], ['-3', 23], ['mucho', 23], ['', 23]])('ventana de reenvío %s → %i h', (raw, hours) => {
    expect(parseConfig({ ...env, VITE_MATOMO_REPLAY_HOURS: raw })?.replayHours).toBe(hours);
  });
```

Y al final del fichero:

```ts
describe('cdtParam', () => {
  it('da la fecha y hora en UTC, codificada', () => {
    expect(cdtParam(Date.UTC(2026, 9, 7, 8, 5, 9))).toBe('&cdt=2026-10-07%2008%3A05%3A09');
  });
});
```

- [x] **Step 2: Test de `hitQueue`**

```ts
// game/tests/unit/hitQueue.test.ts
import { describe, expect, it } from 'vitest';
import {
  BATCH_SIZE, CDT_AFTER_MS, ack, clearLost, emptyQueue, expire, maxAgeMs, oldestAge, parseQueue, push, stamp, takeBatch,
  type QueueState,
} from '../../src/core/hitQueue';

const T0 = Date.UTC(2026, 9, 7, 10, 0, 0);
const hit = (n: number, t = T0) => ({ q: `?n=${n}`, t });
const filled = (count: number): QueueState => Array.from({ length: count }, (_, i) => hit(i)).reduce((s, h) => push(s, h), emptyQueue());

describe('cola', () => {
  it('guarda en orden', () => {
    expect(filled(3).hits.map((h) => h.q)).toEqual(['?n=0', '?n=1', '?n=2']);
  });

  it('con el tope se descartan los más viejos y se cuentan', () => {
    const state = [hit(0), hit(1), hit(2)].reduce((s, h) => push(s, h, 2), emptyQueue());
    expect(state.hits.map((h) => h.q)).toEqual(['?n=1', '?n=2']);
    expect(state.lost).toEqual({ full: 1, expired: 0 });
  });

  it('lo caducado se descarta y se cuenta; si nada caduca devuelve la misma cola', () => {
    const state = [hit(0, T0 - 5000), hit(1, T0 - 1000)].reduce((s, h) => push(s, h), emptyQueue());
    const next = expire(state, T0, 2000);
    expect(next.hits.map((h) => h.q)).toEqual(['?n=1']);
    expect(next.lost).toEqual({ full: 0, expired: 1 });
    expect(expire(next, T0, 2000)).toBe(next);
  });

  it('un lote son los primeros 50 y confirmarlo los quita', () => {
    const state = filled(BATCH_SIZE + 5);
    const batch = takeBatch(state);
    expect(batch).toHaveLength(BATCH_SIZE);
    expect(ack(state, batch).hits.map((h) => h.q)).toEqual(['?n=50', '?n=51', '?n=52', '?n=53', '?n=54']);
  });

  it('borrar lo perdido deja los eventos', () => {
    const state = clearLost({ hits: [hit(0)], lost: { full: 3, expired: 2 } });
    expect(state).toEqual({ hits: [hit(0)], lost: { full: 0, expired: 0 } });
  });

  it('la edad del más viejo', () => {
    expect(oldestAge(emptyQueue(), T0)).toBeNull();
    expect(oldestAge(push(emptyQueue(), hit(0, T0 - 7000)), T0)).toBe(7000);
  });
});

describe('fecha real', () => {
  it('un evento reciente va sin fecha: usa la hora del servidor', () => {
    expect(stamp(hit(0, T0 - CDT_AFTER_MS), T0)).toBe('?n=0');
  });

  it('pasados cinco minutos lleva su fecha en UTC', () => {
    expect(stamp(hit(0, T0 - CDT_AFTER_MS - 1), T0)).toBe('?n=0&cdt=2026-10-07%2009%3A54%3A59');
  });

  it('con el reloj atrasado (edad negativa) va sin fecha', () => {
    expect(stamp(hit(0, T0 + 60_000), T0)).toBe('?n=0');
  });

  it('la ventana de reenvío nunca es menor que el margen sin fecha', () => {
    expect(maxAgeMs(23)).toBe(23 * 3_600_000);
    expect(maxAgeMs(0)).toBe(CDT_AFTER_MS);
  });
});

describe('guardado', () => {
  it('se lee lo que se guarda', () => {
    const state = { hits: [hit(0), hit(1)], lost: { full: 1, expired: 2 } };
    expect(parseQueue(JSON.stringify(state))).toEqual(state);
  });

  it.each([null, '', 'x', '{}', '{"hits":[{"q":1,"t":2}],"lost":{"full":0,"expired":0}}'])(
    'un valor ilegible (%s) es una cola vacía', (raw) => expect(parseQueue(raw)).toEqual(emptyQueue()));
});
```

- [x] **Step 3: Comprobar que fallan**

Run: `npx vitest run tests/unit/hitQueue.test.ts tests/unit/matomoRequest.test.ts`
Expected: FAIL (módulo y `cdtParam` inexistentes).

- [x] **Step 4: Implementar `matomoRequest`**

En `game/src/core/matomoRequest.ts`:

Añadir a `MatomoConfig`:

```ts
  /** Horas hacia atrás que acepta Matomo una fecha propia sin token (su ventana de `cdt`). */
  replayHours: number;
```

Añadir a `MatomoEnv`:

```ts
  /** Opcional. Por defecto 23: la ventana de Matomo es de 24 horas. */
  VITE_MATOMO_REPLAY_HOURS?: string;
```

Añadir antes de `parseConfig`:

```ts
export const DEFAULT_REPLAY_HOURS = 23;
const MAX_REPLAY_HOURS = 720;

function parseReplayHours(raw: string | undefined): number {
  const hours = Number(raw);
  if (raw === undefined || raw.trim() === '' || !Number.isFinite(hours) || hours < 0) return DEFAULT_REPLAY_HOURS;
  return Math.min(hours, MAX_REPLAY_HOURS);
}

/** Fecha y hora reales de un evento que se envía tarde. Matomo la quiere en UTC. */
export function cdtParam(time: number): string {
  return `&cdt=${encodeURIComponent(new Date(time).toISOString().slice(0, 19).replace('T', ' '))}`;
}
```

En `parseConfig`, sustituir el `return` final por:

```ts
  return { url, siteId, dimensions: { version, platform, language, sessions, age }, replayHours: parseReplayHours(env.VITE_MATOMO_REPLAY_HOURS) };
```

Añadir al final de `game/.env.example`:

```
# Opcional. Horas hacia atrás que acepta el Matomo una fecha sin token. Por defecto 23.
# Solo subirlo (p. ej. 167) si se ha ampliado la ventana en la configuración del servidor.
VITE_MATOMO_REPLAY_HOURS=
```

- [x] **Step 5: Implementar `hitQueue`**

```ts
// game/src/core/hitQueue.ts
import { cdtParam } from './matomoRequest';

/** Un evento listo para enviar y el instante en que ocurrió. */
export interface StoredHit {
  q: string;
  t: number;
}

/** Lo que espera a enviarse y lo que se ha tenido que tirar desde el último envío con éxito. */
export interface QueueState {
  hits: StoredHit[];
  lost: { full: number; expired: number };
}

export const QUEUE_KEY = 'zooesponji_v3_stats_queue';
export const QUEUE_LIMIT = 1000;
export const BATCH_SIZE = 50;
/** Hasta esta edad el evento va sin fecha y usa la hora del servidor, que no depende del reloj del móvil. */
export const CDT_AFTER_MS = 5 * 60 * 1000;

export function emptyQueue(): QueueState {
  return { hits: [], lost: { full: 0, expired: 0 } };
}

const count = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;

export function parseQueue(raw: string | null): QueueState {
  if (!raw) return emptyQueue();
  try {
    const value = JSON.parse(raw) as { hits?: unknown; lost?: { full?: unknown; expired?: unknown } };
    const hits = value.hits;
    const lost = value.lost;
    if (!Array.isArray(hits) || !lost || !count(lost.full) || !count(lost.expired)) return emptyQueue();
    const valid = hits.every((h: unknown) => {
      const hit = h as Partial<StoredHit> | null;
      return typeof hit?.q === 'string' && typeof hit.t === 'number' && Number.isFinite(hit.t);
    });
    if (!valid) return emptyQueue();
    return { hits: (hits as StoredHit[]).map(({ q, t }) => ({ q, t })), lost: { full: lost.full, expired: lost.expired } };
  } catch {
    return emptyQueue();
  }
}

export function push(state: QueueState, hit: StoredHit, limit = QUEUE_LIMIT): QueueState {
  const hits = [...state.hits, hit];
  const over = Math.max(0, hits.length - limit);
  return { hits: over > 0 ? hits.slice(over) : hits, lost: { ...state.lost, full: state.lost.full + over } };
}

/** Matomo no acepta sin token fechas más viejas que su ventana: esos eventos se tiran y se cuentan. */
export function expire(state: QueueState, now: number, maxAge: number): QueueState {
  const hits = state.hits.filter((hit) => now - hit.t <= maxAge);
  const gone = state.hits.length - hits.length;
  return gone === 0 ? state : { hits, lost: { ...state.lost, expired: state.lost.expired + gone } };
}

export function takeBatch(state: QueueState, size = BATCH_SIZE): StoredHit[] {
  return state.hits.slice(0, size);
}

/** Quita un lote ya entregado. Cada consulta lleva un `rand` distinto: sirve de identidad. */
export function ack(state: QueueState, batch: readonly StoredHit[]): QueueState {
  const sent = new Set(batch.map((hit) => hit.q));
  return { ...state, hits: state.hits.filter((hit) => !sent.has(hit.q)) };
}

export function clearLost(state: QueueState): QueueState {
  return { ...state, lost: { full: 0, expired: 0 } };
}

export function stamp(hit: StoredHit, now: number): string {
  return now - hit.t > CDT_AFTER_MS ? hit.q + cdtParam(hit.t) : hit.q;
}

export function oldestAge(state: QueueState, now: number): number | null {
  const first = state.hits[0];
  return first ? Math.max(0, now - first.t) : null;
}

export function maxAgeMs(replayHours: number): number {
  return Math.max(replayHours * 3_600_000, CDT_AFTER_MS);
}
```

- [x] **Step 6: Comprobar que pasa**

Run: `npx vitest run tests/unit/hitQueue.test.ts tests/unit/matomoRequest.test.ts tests/unit/analytics.test.ts && npx tsc --noEmit`
Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add game/src/core/hitQueue.ts game/src/core/matomoRequest.ts game/.env.example game/tests/unit/hitQueue.test.ts game/tests/unit/matomoRequest.test.ts game/tests/unit/analytics.test.ts
git commit -m "feat: cola de eventos guardable, con tope, caducidad y fecha real"
```

---

### Task 5: Visitar un recinto (`penNear.ts`)

**Files:**
- Create: `game/src/core/penNear.ts`
- Test: `game/tests/unit/penNear.test.ts`

**Interfaces:**
- Consumes: `Rect`, `rectContains(rect, point, margin)` de `game/src/core/interaction.ts`; `Vec` de `game/src/core/movement.ts`.
- Produces: `NEAR_MARGIN = 32`, `NEAR_MS = 2000`; `NearState<T extends string> { penId: T | null; ms: number; fired: boolean }`; `noPen<T>()`; `stepNear<T>(state, pens: readonly { id: T; rect: Rect }[], pos: Vec, delta: number): { state: NearState<T>; entered: T | null }`.

- [x] **Step 1: Escribir el test**

```ts
// game/tests/unit/penNear.test.ts
import { describe, expect, it } from 'vitest';
import { NEAR_MARGIN, NEAR_MS, noPen, stepNear, type NearState } from '../../src/core/penNear';

const pens = [
  { id: 'leon', rect: { x: 100, y: 100, width: 80, height: 60 } },
  { id: 'panda', rect: { x: 400, y: 100, width: 80, height: 60 } },
] as const;
type Id = (typeof pens)[number]['id'];
const inside = { x: 120, y: 120 };
const edge = { x: 100 - NEAR_MARGIN, y: 120 };
const far = { x: 300, y: 300 };

function run(steps: { pos: { x: number; y: number }; delta: number }[]): (Id | null)[] {
  let state: NearState<Id> = noPen();
  return steps.map(({ pos, delta }) => {
    const step = stepNear(state, pens, pos, delta);
    state = step.state;
    return step.entered;
  });
}

describe('visitar un recinto', () => {
  it('pasar de largo no cuenta', () => {
    expect(run([{ pos: inside, delta: 16 }, { pos: inside, delta: NEAR_MS - 100 }, { pos: far, delta: 16 }])).toEqual([null, null, null]);
  });

  it('quedarse dos segundos cuenta, una sola vez', () => {
    expect(run([{ pos: inside, delta: 16 }, { pos: inside, delta: NEAR_MS }, { pos: inside, delta: 5000 }])).toEqual([null, 'leon', null]);
  });

  it('el margen de alrededor también es «junto al recinto»', () => {
    expect(run([{ pos: edge, delta: 16 }, { pos: edge, delta: NEAR_MS }])).toEqual([null, 'leon']);
  });

  it('salir y volver es otra visita', () => {
    const visit = [{ pos: inside, delta: 16 }, { pos: inside, delta: NEAR_MS }];
    expect(run([...visit, { pos: far, delta: 16 }, ...visit])).toEqual([null, 'leon', null, null, 'leon']);
  });

  it('cambiar de recinto empieza la cuenta de nuevo', () => {
    const atPanda = { x: 420, y: 120 };
    expect(run([{ pos: inside, delta: 16 }, { pos: inside, delta: 1500 }, { pos: atPanda, delta: 16 }, { pos: atPanda, delta: 1500 }, { pos: atPanda, delta: 600 }]))
      .toEqual([null, null, null, null, 'panda']);
  });
});
```

- [x] **Step 2: Comprobar que falla**

Run: `npx vitest run tests/unit/penNear.test.ts`
Expected: FAIL, no encuentra el módulo.

- [x] **Step 3: Implementar**

```ts
// game/src/core/penNear.ts
import { rectContains, type Rect } from './interaction';
import type { Vec } from './movement';

/** Píxeles alrededor del recinto que cuentan como «junto a él» (2 casillas). */
export const NEAR_MARGIN = 32;
/** Tiempo seguido junto a un recinto para que sea una visita y no un ir de paso. */
export const NEAR_MS = 2000;

export interface NearState<T extends string> {
  penId: T | null;
  ms: number;
  /** Esta visita ya se ha contado: no se repite hasta salir y volver. */
  fired: boolean;
}

export function noPen<T extends string>(): NearState<T> {
  return { penId: null, ms: 0, fired: false };
}

function centerDistance(rect: Rect, pos: Vec): number {
  return Math.hypot(rect.x + rect.width / 2 - pos.x, rect.y + rect.height / 2 - pos.y);
}

export function stepNear<T extends string>(
  state: NearState<T>,
  pens: readonly { id: T; rect: Rect }[],
  pos: Vec,
  delta: number,
): { state: NearState<T>; entered: T | null } {
  // Entre dos recintos pegados gana el de centro más cercano.
  const here = pens
    .filter((pen) => rectContains(pen.rect, pos, NEAR_MARGIN))
    .sort((a, b) => centerDistance(a.rect, pos) - centerDistance(b.rect, pos))[0];
  const at = here?.id ?? null;
  if (at !== state.penId) return { state: { penId: at, ms: 0, fired: false }, entered: null };
  if (at === null || state.fired) return { state, entered: null };
  const ms = state.ms + delta;
  if (ms < NEAR_MS) return { state: { ...state, ms }, entered: null };
  return { state: { penId: at, ms, fired: true }, entered: at };
}
```

- [x] **Step 4: Comprobar que pasa**

Run: `npx vitest run tests/unit/penNear.test.ts && npx tsc --noEmit`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add game/src/core/penNear.ts game/tests/unit/penNear.test.ts
git commit -m "feat: regla de visita a un recinto (dos segundos junto a él)"
```

---

### Task 6: `Analytics` con cola guardada, envío confirmado y avisos a un colaborador

**Files:**
- Modify: `game/src/systems/analytics.ts` (se reescribe entero), `game/src/systems/analyticsInstall.ts`
- Test: `game/tests/unit/analytics.test.ts`

**Interfaces:**
- Consumes: Task 1 (`durationBucket`, `pendingBucket`, `Category`, `ActionOf`), Task 2 (`cohortWeek`, `returns`), Task 4 (todo `hitQueue`, `config.replayHours`).
- Produces:
  - `AnalyticsDeps.send: (url: string, body: string) => Promise<boolean>` (antes devolvía `void`).
  - `Analytics.flush(): Promise<void>` (antes síncrono).
  - `Analytics.active: boolean`.
  - `Analytics.event<C extends Category>(category: C, action: ActionOf<C>, name?: string, value?: number): void` (antes privado y sin tipar).
  - `AnalyticsHooks { sessionStarted(flags: readonly ActivityFlag[]): void; goingBackground(seconds: number): void; resumed(): void; screenShown(name: string): void }` y `Analytics.setHooks(hooks: AnalyticsHooks): void`.
  - Deja de escuchar `shop-unlocked`, `animal-fed` y `book-page` (pasan al `GameTracker`, Task 8). Se elimina la exportación `QUEUE_LIMIT` de este fichero (ahora está en `hitQueue`).

- [x] **Step 1: Adaptar el arnés de los tests**

En `game/tests/unit/analytics.test.ts`:

Cambiar el import de `analytics` (quitar `QUEUE_LIMIT`) y añadir los de la cola:

```ts
import { QUEUE_KEY, QUEUE_LIMIT } from '../../src/core/hitQueue';
import { Analytics, SESSION_GAP_MS, getAnalytics, setAnalytics, type AnalyticsDeps, type AnalyticsHooks } from '../../src/systems/analytics';
```

Sustituir la función `setup` por:

```ts
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
```

En todo el fichero: cada `t.analytics.flush();` pasa a `await t.analytics.flush();`. Tras cada `t.analytics.setBackground(true);` y cada `t.analytics.reportError(...)` cuyo envío se compruebe después, añadir `await settle();`.

- [x] **Step 2: Sustituir los tests que cambian de comportamiento y añadir los nuevos**

Borrar los tests `la cola tiene tope: se descartan los más viejos`, `un envío que falla no rompe nada y la cola se vacía` y `progreso, comida y libro`. En `al irse envía el fin de sesión con los segundos jugados`, comprobar además que el evento `sesion/fin` lleva `e_n` igual al tramo que corresponda a los segundos del test (`<1m`, `1-3m`…). Añadir:

```ts
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

  it('los eventos del juego que siguen aquí: recinto, animal y monedas', async () => {
    const t = setup();
    await t.analytics.start();
    t.events.emit('animal-unlocked', { penId: 'panda' });
    t.events.emit('animal-added', { penId: 'cabra', count: 2, residentId: 'nube' });
    t.events.emit('coins-changed', { coins: 120 });
    await t.analytics.flush();
    expect(t.names()).toEqual(expect.arrayContaining(['progreso/recinto', 'progreso/animal', 'progreso/monedas']));
  });
});
```

- [x] **Step 3: Comprobar que falla**

Run: `npx vitest run tests/unit/analytics.test.ts`
Expected: FAIL (tipos de `send`, `setHooks` inexistente, etc.).

- [x] **Step 4: Reescribir `analytics.ts`**

```ts
// game/src/systems/analytics.ts
import { ACTIVITY_KEY, ageBucket, cohortWeek, dayKey, nextActivity, parseActivity, sessionBucket, type ActivityFlag, type ReturnFlag } from '../core/activity';
import { durationBucket, pendingBucket, type ActionOf, type Category } from '../core/eventCatalog';
import { QUEUE_KEY, ack, clearLost, emptyQueue, expire, maxAgeMs, oldestAge, parseQueue, push, stamp, takeBatch, type QueueState } from '../core/hitQueue';
import { toBulkBody, toQuery, trackerUrl, type Hit, type MatomoConfig } from '../core/matomoRequest';
import type { KeyValueStore, Settings } from '../core/save';
import type { EventBus, GameEvents } from './events';

/** Más de media hora en segundo plano: al volver cuenta como otra sesión. */
export const SESSION_GAP_MS = 30 * 60 * 1000;

const COIN_STEPS = [100, 500, 1000, 5000] as const;
const TOGGLE_ACTIONS = { music: 'musica', sfx: 'sonidos', joystick: 'joystick' } as const;

export interface AnalyticsDeps {
  /** Sin configuración no se mide (desarrollo, tests). */
  config: MatomoConfig | null;
  store: KeyValueStore;
  events: EventBus<GameEvents>;
  /** `true` si el lote salió; `false` si no hay red. Con `no-cors` no se sabe más que eso. */
  send: (url: string, body: string) => Promise<boolean>;
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

/** Quien lleva el detalle del juego (`GameTracker`) se entera por aquí de la vida de la sesión. */
export interface AnalyticsHooks {
  sessionStarted(flags: readonly ActivityFlag[]): void;
  /** Segundos del rato en primer plano que acaba. Llega antes del `sesion / fin`. */
  goingBackground(seconds: number): void;
  resumed(): void;
  screenShown(name: string): void;
}

/**
 * Estadísticas anónimas hacia Matomo: sin cookies y sin identificador guardado. El id de visita se
 * crea al azar en cada sesión. Lo que no se puede enviar espera en el dispositivo y sale después con
 * su fecha real. Medir nunca rompe el juego: todo fallo se traga.
 */
export class Analytics {
  private queue: QueueState = emptyQueue();
  private dirty = false;
  private sending = false;
  private hooks: AnalyticsHooks | null = null;
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

  /** Hay configuración y el jugador no la ha apagado. */
  get active(): boolean {
    return this.deps.config !== null && this.settings.stats;
  }

  setHooks(hooks: AnalyticsHooks): void {
    this.hooks = hooks;
  }

  async start(): Promise<void> {
    if (!this.deps.config) return;
    const { events } = this.deps;
    try {
      this.queue = parseQueue(await this.deps.store.get(QUEUE_KEY));
    } catch {
      this.queue = emptyQueue();
    }
    const waiting = this.queue.hits.length;
    const waitingAge = oldestAge(this.queue, this.deps.now().getTime());
    events.on('settings-changed', ({ settings }) => this.onSettings(settings));
    events.on('coins-changed', ({ coins }) => this.onCoins(coins));
    events.on('animal-unlocked', ({ penId }) => this.event('progreso', 'recinto', penId));
    events.on('animal-added', ({ penId, count }) => this.event('progreso', 'animal', penId, count));
    await this.beginSession();
    if (waiting > 0 && waitingAge !== null) this.event('calidad', 'pendientes', pendingBucket(waitingAge), waiting);
  }

  track(hit: Hit): void {
    const { config } = this.deps;
    if (!config || !this.settings.stats) return;
    const q = toQuery(hit, config, {
      visitorId: this.visitorId,
      rand: this.deps.randomId(),
      screen: this.screen,
      version: this.deps.version,
      platform: this.deps.platform,
      language: this.deps.language(),
      sessions: this.sessions,
      age: this.age,
    });
    this.queue = push(this.queue, { q, t: this.deps.now().getTime() });
    this.dirty = true;
  }

  event<C extends Category>(category: C, action: ActionOf<C>, name?: string, value?: number): void {
    this.track({ kind: 'event', category, action, ...(name !== undefined ? { name } : {}), ...(value !== undefined ? { value } : {}) });
  }

  /** Pantalla nueva. Las escenas se montan de nuevo al girar o redimensionar: la misma no se repite. */
  screenView(name: string): void {
    if (name === this.screen) return;
    this.screen = name;
    this.track({ kind: 'screen', name });
    this.hooks?.screenShown(name);
  }

  /**
   * Guarda la cola y la envía por lotes. Un lote solo se borra cuando ha salido; sin red se queda
   * para la próxima. Si ya hay un envío en marcha, ese mismo recoge lo que se haya añadido.
   */
  async flush(): Promise<void> {
    const { config } = this.deps;
    if (!config || this.sending) return;
    this.sending = true;
    try {
      await this.persist();
      for (;;) {
        const now = this.deps.now().getTime();
        const kept = expire(this.queue, now, maxAgeMs(config.replayHours));
        if (kept !== this.queue) {
          this.queue = kept;
          this.dirty = true;
        }
        const batch = takeBatch(this.queue);
        if (batch.length === 0) break;
        if (!(await this.trySend(trackerUrl(config), toBulkBody(batch.map((hit) => stamp(hit, now)))))) break;
        this.queue = ack(this.queue, batch);
        this.dirty = true;
        this.reportLost();
      }
      await this.persist();
    } finally {
      this.sending = false;
    }
  }

  /** El aviso puede llegar dos veces (Capacitor y navegador): solo cuenta el cambio. */
  setBackground(hidden: boolean): void {
    const now = this.deps.now().getTime();
    if (hidden) {
      if (this.hiddenAt !== null) return;
      this.hiddenAt = now;
      const seconds = Math.round((now - this.startedAt) / 1000);
      if (this.active) this.hooks?.goingBackground(seconds);
      this.event('sesion', 'fin', durationBucket(seconds), seconds);
      void this.flush();
      return;
    }
    if (this.hiddenAt === null) return;
    const away = now - this.hiddenAt;
    this.hiddenAt = null;
    if (away >= SESSION_GAP_MS) {
      void this.beginSession();
      return;
    }
    this.startedAt = now;
    if (this.active) this.hooks?.resumed();
  }

  /** Solo el mensaje, sin traza ni direcciones, y se envía ya: tras un error puede no haber otra ocasión. */
  reportError(error: unknown): void {
    const raw = error instanceof Error ? error.message : String(error);
    const message = raw.replace(/\S+:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 100);
    this.event('error', 'no-controlado', message || 'desconocido');
    void this.flush();
  }

  private async trySend(url: string, body: string): Promise<boolean> {
    try {
      return await this.deps.send(url, body);
    } catch {
      return false;
    }
  }

  private async persist(): Promise<void> {
    if (!this.dirty) return;
    this.dirty = false;
    try {
      await this.deps.store.set(QUEUE_KEY, JSON.stringify(this.queue));
    } catch {
      // Sin almacén la cola vive solo en memoria.
    }
  }

  /** Tras un envío con éxito: cuenta lo que hubo que tirar desde el anterior. */
  private reportLost(): void {
    const { full, expired } = this.queue.lost;
    if (full + expired === 0 || !this.active) return;
    this.queue = clearLost(this.queue);
    if (full > 0) this.event('calidad', 'perdidos', 'cola-llena', full);
    if (expired > 0) this.event('calidad', 'perdidos', 'caducado', expired);
  }

  private async beginSession(): Promise<void> {
    if (!this.active) return;
    const now = this.deps.now();
    this.visitorId = this.deps.randomId();
    this.startedAt = now.getTime();
    this.coinSteps.clear();
    const today = dayKey(now);
    let flags: readonly ActivityFlag[] = [];
    let returns: readonly ReturnFlag[] = [];
    let cohort: string | undefined;
    try {
      const next = nextActivity(parseActivity(await this.deps.store.get(ACTIVITY_KEY)), today);
      await this.deps.store.set(ACTIVITY_KEY, JSON.stringify(next.state));
      this.sessions = sessionBucket(next.state.sessions);
      this.age = ageBucket(next.state.firstDay, today);
      cohort = cohortWeek(next.state.firstDay);
      flags = next.flags;
      returns = next.returns;
    } catch {
      // Sin almacén no se sabe si es nuevo: mejor no contar que contar de más.
    }
    this.event('sesion', 'inicio');
    for (const flag of flags) this.event('activo', flag, flag === 'nuevo' ? cohort : undefined);
    for (const flag of returns) this.event('activo', flag, cohort);
    if (this.screen) this.track({ kind: 'screen', name: this.screen });
    this.hooks?.sessionStarted(flags);
  }

  private onSettings(next: Settings): void {
    const before = this.settings;
    this.settings = next;
    if (!next.stats) {
      this.queue = emptyQueue();
      this.dirty = true;
      void this.persist();
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

Nota para el test `sin configuración no envía ni guarda nada`, que llama a `track({ category: 'x', action: 'y' })`: `track` acepta cualquier `Hit`; solo `event` está tipado con el catálogo.

- [x] **Step 5: Adaptar `analyticsInstall.ts`**

Sustituir la función `send` y la línea del `setInterval`:

```ts
/** Sin cookies (`credentials: 'omit'`) y sin leer la respuesta. `keepalive` deja terminar el envío al salir. */
function send(url: string, body: string): Promise<boolean> {
  return fetch(url, { method: 'POST', body, mode: 'no-cors', keepalive: true, credentials: 'omit' }).then(
    () => true,
    () => false,
  );
}
```

```ts
    setInterval(() => void analytics.flush(), FLUSH_MS);
```

- [x] **Step 6: Comprobar que pasa**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS en todo. Si queda algún test antiguo en rojo por comprobar `bodies` sin esperar, añadirle `await` o `await settle()`; no cambiar el código de `analytics.ts` para acomodarlo.

- [x] **Step 7: Commit**

```bash
git add game/src/systems/analytics.ts game/src/systems/analyticsInstall.ts game/tests/unit/analytics.test.ts
git commit -m "feat: lo jugado sin conexión se guarda y se envía después con su fecha real"
```

---

### Task 7: Eventos nuevos del `bus` y de la sesión

**Files:**
- Modify: `game/src/systems/events.ts`, `game/src/systems/session.ts`
- Test: `game/tests/unit/session.test.ts`

**Interfaces:**
- Produces (en `GameEvents`):

```ts
  /** Se ha dado de comer a un residente: su recinto entero lo celebra. */
  'animal-fed': { penId: PenId; residentId: string; foodId: FoodId; reaction: Reaction; coins: number };
  /** Se ha tocado un animal en el mapa: la cuidadora va hacia él. */
  'animal-tapped': { residentId: string };
  'feed-opened': { residentId: string };
  'feed-closed': { residentId: string };
  /** Una comida arrastrada y soltada fuera del animal. */
  'food-missed': { residentId: string; foodId: FoodId };
  /** La cuidadora lleva un rato junto a un recinto. */
  'pen-near': { penId: PenId; locked: boolean };
  'locked-tap': { penId: PenId };
  /** Se ha pisado la puerta de la tienda sin monedas suficientes para abrirla. */
  'shop-locked': { missing: number };
  'control-used': { mode: ControlMode };
  'shop-opened': Record<string, never>;
  'shop-look': { itemId: string };
  'shop-denied': { itemId: string; missing: number };
  'purchase': { itemId: string; penId: PenId; residentId: string; cost: number };
  'shop-closed': Record<string, never>;
  'book-opened': { pageId: string };
  'book-page-shown': { pageId: string; kind: BookPageKind };
  'book-index': { chapter: string };
  'book-closed': Record<string, never>;
  'legal-opened': Record<string, never>;
  'quit-asked': Record<string, never>;
  'quit-answered': { leave: boolean };
```

  y los tipos `ControlMode = 'toque' | 'joystick' | 'teclado'`, `BookPageKind = 'contenido' | 'bloqueada' | 'paso'`.

- [x] **Step 1: Tests de la sesión**

En `game/tests/unit/session.test.ts`: en los dos tests de `animal-fed`, añadir al objeto esperado `foodId` y `coins` (`{ penId: 'cabra', residentId: 'gordi', foodId: 'carne', reaction: 'rechaza', coins: 0 }` y `{ penId: 'cabra', residentId: 'gordi', foodId: 'piedra', reaction: 'come', coins: 1 }`). Añadir:

```ts
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

  it('una compra que no se puede hacer no avisa', async () => {
    const events = new EventBus<GameEvents>();
    const bought = vi.fn();
    events.on('purchase', bought);
    const session = await Session.load(createMemoryStore(), events);
    expect((await session.buy('pantera')).ok).toBe(false);
    expect(bought).not.toHaveBeenCalled();
  });
});
```

Si `buy('pantera')` exige que la tienda esté abierta y el test falla por eso, ganar antes las monedas que la abren como hacen los demás tests de compra de ese fichero.

- [x] **Step 2: Comprobar que falla**

Run: `npx vitest run tests/unit/session.test.ts`
Expected: FAIL (`purchase` no existe en `GameEvents`, faltan `foodId` y `coins`).

- [x] **Step 3: Implementar**

En `game/src/systems/events.ts`: añadir `import type { FoodId } from '../data/foods';`, exportar los dos tipos nuevos encima de `GameEvents`, sustituir la entrada `'animal-fed'` y añadir el resto de entradas del bloque «Produces» antes de `'settings-changed'`.

En `game/src/systems/session.ts`:

Añadir a los imports: `import { parseExtraItemId } from '../data/shop';` y `type PenId` al import de `../data/pens`.

Sustituir la línea del `emit` en `feed`:

```ts
    this.events.emit('animal-fed', { penId: found.penId, residentId, foodId, reaction: result.reaction, coins: result.coins });
```

Sustituir `buy`:

```ts
  async buy(itemId: string): Promise<PurchaseResult> {
    const before = this.data.state;
    const result = purchase(before, itemId);
    if (!result.ok) return result;
    await this.update(() => result.state);
    const penId = parseExtraItemId(itemId) ?? (itemId as PenId);
    const arrived = PENS[penId]?.residents[result.state.counts[penId] - 1];
    if (arrived) this.events.emit('purchase', { itemId, penId, residentId: arrived.id, cost: before.coins - result.state.coins });
    return result;
  }
```

- [x] **Step 4: Comprobar que pasa**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS. (`WorldScene` usa `residentId` y `reaction` de `animal-fed`: sigue compilando.)

- [x] **Step 5: Commit**

```bash
git add game/src/systems/events.ts game/src/systems/session.ts game/tests/unit/session.test.ts
git commit -m "feat: el bus avisa de la comida dada, de las compras y de lo que pasa en mapa, tienda y libro"
```

---

### Task 8: `GameTracker` — del `bus` al catálogo

**Files:**
- Create: `game/src/systems/analyticsEvents.ts`
- Test: `game/tests/unit/analyticsEvents.test.ts`

**Interfaces:**
- Consumes: Task 1 (catálogo), Task 3 (`reach`), Task 6 (`AnalyticsHooks`), Task 7 (eventos del `bus`); `initialCounts`, `openPens`, `GameState` de `core/economy`; `isBookComplete` de `core/book`; `BOOK_BACK_ID` de `data/book`; `PEN_IDS`, `penCapacity`, `findResident` de `data/pens`; `dayKey` de `core/activity`.
- Produces: `EventSink { readonly active: boolean; event<C extends Category>(category: C, action: ActionOf<C>, name?: string, value?: number): void }` (lo cumple `Analytics`); `TrackerDeps { sink; events; store; now; state; settings; book }`; `class GameTracker implements AnalyticsHooks` con `start(): Promise<void>`; `knownSteps(state, book): Step[]`.

- [x] **Step 1: Escribir el test**

```ts
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
```

- [x] **Step 2: Comprobar que falla**

Run: `npx vitest run tests/unit/analyticsEvents.test.ts`
Expected: FAIL, no encuentra el módulo.

- [x] **Step 3: Implementar**

```ts
// game/src/systems/analyticsEvents.ts
import { dayKey, type ActivityFlag } from '../core/activity';
import { isBookComplete } from '../core/book';
import { initialCounts, openPens, type GameState } from '../core/economy';
import {
  animalsBucket, bookBucket, coinsBucket, feedsBucket, pagesBucket, part, reachAction, residentName,
  type ActionOf, type Category, type ReachKind, type Step,
} from '../core/eventCatalog';
import { REACH_KEY, addPlay, emptyReach, markEver, markReach, markStep, parseReach, seedSteps, type ReachState } from '../core/reach';
import type { BookProgress, KeyValueStore, Settings } from '../core/save';
import { BOOK_BACK_ID } from '../data/book';
import { PEN_IDS, PENS, findResident, penCapacity } from '../data/pens';
import type { AnalyticsHooks } from './analytics';
import type { BookPageKind, EventBus, GameEvents } from './events';

/** Lo que el tracker necesita de `Analytics`. */
export interface EventSink {
  readonly active: boolean;
  event<C extends Category>(category: C, action: ActionOf<C>, name?: string, value?: number): void;
}

export interface TrackerDeps {
  sink: EventSink;
  events: EventBus<GameEvents>;
  store: KeyValueStore;
  now: () => Date;
  state: () => GameState;
  settings: () => Settings;
  book: () => BookProgress;
}

/** Menos de esto en una página es pasar la hoja, no leerla. */
const READ_MS = 1000;
const REACH_SCREENS: readonly string[] = ['tienda', 'libro', 'ajustes'];
const SETTING_LABELS = [['music', 'musica'], ['sfx', 'sonidos'], ['joystick', 'joystick']] as const;

function zooComplete(state: GameState): boolean {
  return PEN_IDS.every((id) => state.counts[id] >= penCapacity(id));
}

/** Pasos del embudo que una partida ya empezada tiene dados: se apuntan sin avisar, para no falsear tiempos. */
export function knownSteps(state: GameState, book: BookProgress): Step[] {
  const initial = initialCounts();
  const bought = PEN_IDS.some((id) => state.counts[id] > initial[id]);
  const steps: Step[] = [];
  if (state.coins > 0 || state.shopUnlocked || bought) steps.push('primer-paso', 'primer-toque-animal', 'primera-ventana', 'primera-comida');
  if (state.shopUnlocked) steps.push('tienda-abierta');
  if (bought) steps.push('primera-tienda', 'primera-compra');
  if (book.seen.length > 0) steps.push('primer-libro');
  if (isBookComplete(state)) steps.push('libro-completo');
  if (zooComplete(state)) steps.push('zoo-completo');
  return steps;
}

/**
 * Traduce lo que pasa en el juego (eventos del bus) a eventos del catálogo, y lleva las cuentas que
 * hacen falta para ello: la ventana de comer abierta, la visita a la tienda, la lectura del libro,
 * el rato de juego y el alcance guardado en el dispositivo.
 */
export class GameTracker implements AnalyticsHooks {
  /** `null` si el almacén ha fallado: sin él no se sabe qué es «primera vez» y no se cuenta. */
  private reach: ReachState | null = null;
  private stretchAt = 0;
  private feeds = 0;
  private readonly fedAnimals = new Set<string>();
  private readonly controls = new Set<string>();
  private feedWindow: { residentId: string; at: number; given: number } | null = null;
  private shop: { at: number; bought: number; looked: Set<string> } | null = null;
  private reading: { at: number; read: Set<string>; page: { id: string; kind: BookPageKind; at: number } | null } | null = null;

  constructor(private readonly deps: TrackerDeps) {}

  async start(): Promise<void> {
    const { events, store } = this.deps;
    this.stretchAt = this.time();
    try {
      const saved = parseReach(await store.get(REACH_KEY));
      this.reach = saved ?? seedSteps(emptyReach(this.today()), knownSteps(this.deps.state(), this.deps.book()));
    } catch {
      this.reach = null;
    }
    const on = <K extends keyof GameEvents>(event: K, handler: (payload: GameEvents[K]) => void): void => {
      events.on(event, (payload) => {
        if (this.deps.sink.active) handler(payload);
      });
    };

    on('animal-tapped', ({ residentId }) => {
      this.send('comer', 'toca-animal', residentName(residentId));
      this.step('primer-toque-animal');
    });
    on('feed-opened', ({ residentId }) => {
      this.feedWindow = { residentId, at: this.time(), given: 0 };
      this.send('comer', 'ventana', residentName(residentId));
      this.step('primera-ventana');
    });
    on('animal-fed', (fed) => this.onFed(fed));
    on('food-missed', ({ residentId, foodId }) => this.send('comer', 'fuera', part(residentName(residentId), foodId)));
    on('feed-closed', () => this.closeFeed());

    on('pen-near', ({ penId, locked }) => {
      this.send('mapa', locked ? 'cerca-cerrado' : 'cerca', penId);
      if (!locked) this.touch('recinto', penId);
    });
    on('locked-tap', ({ penId }) => this.send('mapa', 'toca-cerrado', penId));
    on('shop-locked', ({ missing }) => this.send('mapa', 'tienda-cerrada', undefined, missing));
    on('control-used', ({ mode }) => {
      if (this.controls.has(mode)) return;
      this.controls.add(mode);
      this.send('mapa', 'control', mode);
      this.step('primer-paso');
    });

    on('shop-unlocked', () => this.step('tienda-abierta'));
    on('shop-opened', () => {
      this.shop = { at: this.time(), bought: 0, looked: new Set() };
      this.step('primera-tienda');
    });
    on('shop-look', ({ itemId }) => {
      if (this.shop?.looked.has(itemId)) return;
      this.shop?.looked.add(itemId);
      this.send('tienda', 'mira', itemId);
    });
    on('shop-denied', ({ itemId, missing }) => this.send('tienda', 'sin-monedas', itemId, missing));
    on('purchase', ({ penId, residentId, cost }) => {
      if (this.shop) this.shop.bought += 1;
      this.send('tienda', 'compra', part(penId, residentId), cost);
      this.step('primera-compra');
      if (zooComplete(this.deps.state())) this.step('zoo-completo');
    });
    on('shop-closed', () => {
      const shop = this.shop;
      this.shop = null;
      if (!shop) return;
      this.send('tienda', 'tienda-fin', undefined, this.secondsSince(shop.at));
      if (shop.bought === 0) this.send('tienda', 'tienda-sin-compra');
    });

    on('book-opened', ({ pageId }) => {
      this.reading = { at: this.time(), read: new Set(), page: null };
      this.send('libro', 'abre', pageId);
      this.step('primer-libro');
    });
    on('book-page-shown', ({ pageId, kind }) => this.showPage(pageId, kind));
    on('book-index', ({ chapter }) => this.send('libro', 'indice', chapter));
    on('book-closed', () => {
      this.leavePage();
      const reading = this.reading;
      this.reading = null;
      if (reading) this.send('libro', 'libro-fin', pagesBucket(reading.read.size), this.secondsSince(reading.at));
    });

    on('legal-opened', () => this.send('ajustes', 'privacidad'));
    on('quit-asked', () => this.send('ajustes', 'salir-pregunta'));
    on('quit-answered', ({ leave }) => this.send('ajustes', leave ? 'salir-si' : 'salir-no'));
  }

  // --- Avisos de Analytics ---

  sessionStarted(flags: readonly ActivityFlag[]): void {
    this.stretchAt = this.time();
    this.controls.clear();
    this.feeds = 0;
    this.fedAnimals.clear();
    if (flags.includes('dia')) this.dailyState();
  }

  goingBackground(seconds: number): void {
    if (!this.deps.sink.active) return;
    this.send('sesion', 'rato-comidas', feedsBucket(this.feeds), this.feeds);
    this.send('sesion', 'rato-animales', animalsBucket(this.fedAnimals.size), this.fedAnimals.size);
    this.feeds = 0;
    this.fedAnimals.clear();
    if (this.reach) {
      this.reach = addPlay(this.reach, seconds);
      this.save();
    }
    this.stretchAt = this.time();
  }

  resumed(): void {
    this.stretchAt = this.time();
  }

  screenShown(name: string): void {
    if (this.deps.sink.active && REACH_SCREENS.includes(name)) this.touch('pantalla', name);
  }

  // --- Por dentro ---

  private onFed({ residentId, foodId, reaction, coins }: GameEvents['animal-fed']): void {
    const resident = residentName(residentId);
    this.send('comer', reaction, part(resident, foodId), reaction === 'rechaza' ? undefined : coins);
    if (this.feedWindow) this.feedWindow.given += 1;
    this.feeds += 1;
    this.fedAnimals.add(residentId);
    this.touch('animal', resident);
    this.touch('comida', foodId);
    this.step('primera-comida');
    if (reaction !== 'especial' || !this.reach) return;
    const species = findResident(residentId)?.resident.species;
    if (!species) return;
    const combo = part(species, foodId);
    const { state, first } = markEver(this.reach, `especial:${combo}`);
    if (!first) return;
    this.reach = state;
    this.send('alcance', 'vida-especial', combo);
    this.save();
  }

  private closeFeed(): void {
    const open = this.feedWindow;
    this.feedWindow = null;
    if (!open) return;
    const resident = residentName(open.residentId);
    this.send('comer', 'ventana-fin', resident, open.given);
    this.send('comer', 'ventana-tiempo', resident, this.secondsSince(open.at));
    if (open.given === 0) this.send('comer', 'ventana-vacia', resident);
  }

  private showPage(pageId: string, kind: BookPageKind): void {
    // El libro también se abre sin pasar por la estantería (pruebas): la lectura empieza aquí.
    this.reading ??= { at: this.time(), read: new Set(), page: null };
    if (this.reading.page?.id === pageId) return;
    this.leavePage();
    this.reading.page = { id: pageId, kind, at: this.time() };
    if (kind === 'bloqueada') this.send('libro', 'bloqueada', pageId);
    if (pageId === BOOK_BACK_ID) this.step('libro-completo');
  }

  private leavePage(): void {
    const reading = this.reading;
    const page = reading?.page;
    if (!reading || !page) return;
    reading.page = null;
    if (page.kind !== 'contenido') return;
    const ms = this.time() - page.at;
    if (ms < READ_MS) {
      this.send('libro', 'hojea', page.id);
      return;
    }
    this.send('libro', 'lee', page.id, Math.round(ms / 1000));
    reading.read.add(page.id);
    this.touch('pagina', page.id);
  }

  /** Lo que tiene el jugador hoy: el denominador para comparar cada animal solo entre quienes lo tienen. */
  private dailyState(): void {
    const state = this.deps.state();
    const settings = this.deps.settings();
    for (const penId of openPens(state)) {
      this.send('tiene', 'tiene-recinto', penId, state.counts[penId]);
      // Uno por animal: el quinto de un recinto lo tienen menos jugadores que el primero.
      for (const resident of PENS[penId].residents.slice(0, state.counts[penId])) this.send('tiene', 'tiene-animal', part(penId, resident.id));
    }
    this.send('tiene', 'tiene-saldo', coinsBucket(state.coins));
    this.send('tiene', 'tiene-paginas', bookBucket(this.deps.book().seen.length));
    for (const [key, label] of SETTING_LABELS) this.send('tiene', 'tiene-ajuste', `${label}-${settings[key] ? 'on' : 'off'}`);
  }

  private touch(kind: ReachKind, id: string): void {
    if (!this.reach) return;
    const { state, scopes } = markReach(this.reach, kind, id, this.today());
    if (scopes.length === 0) return;
    this.reach = state;
    for (const scope of scopes) this.send('alcance', reachAction(scope, kind), id);
    this.save();
  }

  private step(step: Step): void {
    if (!this.reach) return;
    const { state, first } = markStep(this.reach, step);
    if (!first) return;
    this.reach = state;
    this.send('embudo', step, undefined, Math.floor((state.playSeconds + this.secondsSince(this.stretchAt)) / 60));
    this.save();
  }

  private save(): void {
    if (this.reach) void this.deps.store.set(REACH_KEY, JSON.stringify(this.reach)).catch(() => {});
  }

  private send<C extends Category>(category: C, action: ActionOf<C>, name?: string, value?: number): void {
    this.deps.sink.event(category, action, name, value);
  }

  private time(): number {
    return this.deps.now().getTime();
  }

  private today(): string {
    return dayKey(this.deps.now());
  }

  private secondsSince(at: number): number {
    return Math.max(0, Math.round((this.time() - at) / 1000));
  }
}
```

- [x] **Step 4: Comprobar que pasa**

Run: `npx vitest run tests/unit/analyticsEvents.test.ts && npx tsc --noEmit`
Expected: PASS. Dos avisos para quien implemente:
- Si `tsc` protesta en `this.send('comer', reaction, …)`, es que `Reaction` (`'come' | 'rechaza' | 'especial'`) ha dejado de coincidir con acciones de `comer` del catálogo: arreglar el catálogo, no forzar el tipo.
- Si `initialState()` no trae `leon` y `cabra` abiertos con un animal cada uno, ajustar los valores esperados del test «el primer rato del día» a lo que traiga, sin tocar el código.

- [x] **Step 5: Commit**

```bash
git add game/src/systems/analyticsEvents.ts game/tests/unit/analyticsEvents.test.ts
git commit -m "feat: GameTracker traduce el juego a eventos detallados, alcance y embudo"
```

---

### Task 9: El mapa y la ventana de comer emiten sus eventos

**Files:**
- Modify: `game/src/world/Pens.ts`, `game/src/scenes/WorldScene.ts`, `game/src/scenes/FeedScene.ts`, `game/src/systems/testHooks.ts`
- Test: `game/tests/e2e/stats.spec.ts` (nuevo)

**Interfaces:**
- Consumes: Task 5 (`noPen`, `stepNear`, `NearState`), Task 7 (eventos del `bus`, `ControlMode`).
- Produces: `Pens.rects(): { id: PenId; rect: Rect }[]`; `window.__ZOO__.busLog(): string[]` (nombres de los eventos del `bus` emitidos, en orden; solo en desarrollo).

- [x] **Step 1: Registro del `bus` para las pruebas**

En `game/src/systems/testHooks.ts`: añadir `import { bus, type GameEvents } from './events';`, añadir a `ZooTestApi`:

```ts
  /** Nombres de los eventos de estadísticas que ha emitido el juego, en orden. */
  busLog(): string[];
```

Dentro de `installTestHooks`, antes de `window.__ZOO__ = {`:

```ts
  const logged: (keyof GameEvents)[] = [
    'animal-tapped', 'feed-opened', 'animal-fed', 'food-missed', 'feed-closed', 'pen-near', 'locked-tap', 'shop-locked',
    'control-used', 'shop-opened', 'shop-look', 'shop-denied', 'purchase', 'shop-closed', 'book-opened', 'book-page-shown',
    'book-index', 'book-closed', 'legal-opened', 'quit-asked', 'quit-answered',
  ];
  const busLog: string[] = [];
  for (const name of logged) bus.on(name, () => busLog.push(name));
```

Y en el objeto: `busLog: () => [...busLog],`.

- [x] **Step 2: Escribir la prueba de juego**

```ts
// game/tests/e2e/stats.spec.ts
import { expect, test, type Page } from '@playwright/test';

async function canvasBox(page: Page) {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('No hay canvas');
  return box;
}

async function startGame(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
  const box = await canvasBox(page);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.62);
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('World'));
}

const log = (page: Page): Promise<string[]> => page.evaluate(() => window.__ZOO__!.busLog());

test('dar de comer deja rastro: visita, ventana, comida, comida fuera y cierre', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.feedResident('bills'));
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Feed'), undefined, { timeout: 30_000 });
  expect(await log(page)).toContain('feed-opened');

  const targets = (await page.evaluate(() => window.__ZOO__!.feedTargets()))!;
  const box = await canvasBox(page);
  const from = (targets.foods as Record<string, { x: number; y: number }>).carne!;
  // Arrastrar y soltar lejos del animal: comida fuera.
  await page.mouse.move(box.x + from.x, box.y + from.y);
  await page.mouse.down();
  await page.mouse.move(box.x + 30, box.y + 30, { steps: 10 });
  await page.mouse.up();
  await expect.poll(() => log(page)).toContain('food-missed');
  // Ahora sí, sobre el animal.
  await page.waitForTimeout(400);
  await page.mouse.move(box.x + from.x, box.y + from.y);
  await page.mouse.down();
  await page.mouse.move(box.x + targets.animal.x, box.y + targets.animal.y, { steps: 12 });
  await page.mouse.up();
  await expect.poll(() => log(page)).toContain('animal-fed');
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.isFeedBusy())).toBe(false);

  await page.keyboard.press('Escape');
  await expect.poll(() => log(page)).toContain('feed-closed');
  // La cuidadora se ha quedado junto al león más de dos segundos.
  await expect.poll(() => log(page), { timeout: 10_000 }).toContain('pen-near');
});

test('tocar un animal y moverse con el dedo deja rastro', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.feedResident('bills'));
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Feed'), undefined, { timeout: 30_000 });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__ZOO__?.activeScenes().includes('Feed'));
  const pos = (await page.evaluate(() => window.__ZOO__!.residentScreenPos('bills')))!;
  const box = await canvasBox(page);
  await page.mouse.click(box.x + pos.x, box.y + pos.y);
  await expect.poll(() => log(page)).toEqual(expect.arrayContaining(['animal-tapped', 'control-used']));
});
```

- [x] **Step 3: Comprobar que falla**

Run: `npx playwright test tests/e2e/stats.spec.ts`
Expected: FAIL (ningún evento en el registro).

- [x] **Step 4: `Pens.rects()`**

En `game/src/world/Pens.ts`, junto a `rectOf`:

```ts
  /** Zona de cada recinto, abierto o no. */
  rects(): { id: PenId; rect: Rect }[] {
    return this.pens.map((pen) => ({ id: pen.id, rect: pen.rect }));
  }
```

- [x] **Step 5: `WorldScene`**

Imports: cambiar `import type { GameState } from '../core/economy';` por `import { isPenOpen, type GameState } from '../core/economy';`; añadir `import { noPen, stepNear, type NearState } from '../core/penNear';`; cambiar el import del bus por `import { bus, type ControlMode } from '../systems/events';`.

Campos nuevos de la clase, junto a `feedTarget`:

```ts
  private near: NearState<PenId> = noPen();
  /** Formas de moverse ya avisadas desde que se montó el mapa. */
  private readonly controlsUsed = new Set<ControlMode>();
```

En `create()`, junto a `this.feedTarget = null;`:

```ts
    this.near = noPen();
    this.controlsUsed.clear();
```

En `update()`, sustituir el cuerpo desde `this.moveKeeper(delta);` hasta el final por:

```ts
    this.moveKeeper(delta);
    const pos = this.keeperPosition();
    this.watchPens(pos, delta);
    if (this.reachResident(pos)) return;

    const state = getSession().state;

    const tile = worldToTile(this.keeper, TILE_SIZE);
    if (this.pens.lockedDoorstep(tile, state)) bus.emit('toast', { text: t('toast.needShop') });
    const doorEvent = this.shop?.onKeeperTile(tile, state) ?? null;
    if (doorEvent === 'open') this.openShop();
    else if (doorEvent === 'locked') {
      bus.emit('shop-locked', { missing: Math.max(0, SHOP_UNLOCK_COINS - state.coins) });
      bus.emit('toast', { text: t('toast.shopLocked', { n: SHOP_UNLOCK_COINS }) });
    }
  }

  /** Avisa cuando la cuidadora lleva un rato junto a un recinto: es una visita, no un ir de paso. */
  private watchPens(pos: Vec, delta: number): void {
    const step = stepNear(this.near, this.pens.rects(), pos, delta);
    this.near = step.state;
    if (step.entered) bus.emit('pen-near', { penId: step.entered, locked: !isPenOpen(getSession().state, step.entered) });
  }

  private usedControl(mode: ControlMode): void {
    if (this.controlsUsed.has(mode)) return;
    this.controlsUsed.add(mode);
    bus.emit('control-used', { mode });
  }
```

Sustituir `inputDirection`:

```ts
  /** Teclado si se está usando; si no, el joystick virtual. */
  private inputDirection(): Vec {
    const c = this.cursors;
    const k = this.wasd;
    if (c && k) {
      const x = (c.right.isDown || k.D.isDown ? 1 : 0) - (c.left.isDown || k.A.isDown ? 1 : 0);
      const y = (c.down.isDown || k.S.isDown ? 1 : 0) - (c.up.isDown || k.W.isDown ? 1 : 0);
      if (x !== 0 || y !== 0) {
        this.usedControl('teclado');
        return { x, y };
      }
    }
    const stick = joystickState.vector;
    if (stick.x !== 0 || stick.y !== 0) this.usedControl('joystick');
    return stick;
  }
```

En `onPointerUp`, sustituir desde `const hit = …` hasta el final del método:

```ts
    const hit = this.pens.residentAt(world, state, TAP_REACH);
    this.usedControl('toque');
    if (hit) {
      bus.emit('animal-tapped', { residentId: hit.residentId });
      this.feedResident(hit.residentId);
      return;
    }
    this.cancelFeedTarget();
    const locked = this.pens.lockedPenAt(world, state);
    if (locked) {
      bus.emit('locked-tap', { penId: locked });
      bus.emit('toast', { text: t('toast.needShop') });
    }
    this.goTo(world);
  }
```

En `openFeed`, antes de `this.scene.pause();`: `bus.emit('feed-opened', { residentId });`

En `openShop`, antes de `this.scene.pause();`: `bus.emit('shop-opened', {});`

- [x] **Step 6: `FeedScene`**

Añadir `import { bus } from '../systems/events';`.

Sustituir `close`:

```ts
  close(): void {
    if (!this.scene.isActive()) return;
    bus.emit('feed-closed', { residentId: this.residentId });
    this.scene.stop();
    this.scene.resume('World');
  }
```

Añadir sobre la clase: 

```ts
/** Un arrastre más corto que esto es un toque sin querer, no una comida soltada fuera. */
const MISS_MIN_DRAG = 24;
```

En `onDragEnd`, sustituir el `else` final:

```ts
    } else {
      if (!this.busy && pointer.getDistance() > MISS_MIN_DRAG) bus.emit('food-missed', { residentId: this.residentId, foodId: id });
      this.returnHome(id, food);
    }
```

- [x] **Step 7: Comprobar que pasa**

Run: `npx tsc --noEmit && npx vitest run && npx playwright test tests/e2e/stats.spec.ts tests/e2e/play.spec.ts`
Expected: PASS.

- [x] **Step 8: Commit**

```bash
git add game/src/world/Pens.ts game/src/scenes/WorldScene.ts game/src/scenes/FeedScene.ts game/src/systems/testHooks.ts game/tests/e2e/stats.spec.ts
git commit -m "feat: el mapa y la ventana de comer avisan de visitas, toques, comidas fuera y cierres"
```

---

### Task 10: Tienda, libro, ajustes y salida emiten sus eventos; se conecta el `GameTracker`

**Files:**
- Modify: `game/src/scenes/ShopScene.ts`, `game/src/scenes/BookScene.ts`, `game/src/scenes/SettingsScene.ts`, `game/src/scenes/QuitScene.ts`, `game/src/systems/platform.ts`, `game/src/systems/analyticsInstall.ts`
- Test: `game/tests/e2e/stats.spec.ts`

**Interfaces:**
- Consumes: Task 6 (`setHooks`), Task 7 (eventos, `BookPageKind`), Task 8 (`GameTracker`).

- [x] **Step 1: Añadir la prueba de juego**

Al final de `game/tests/e2e/stats.spec.ts`:

```ts
test('el libro deja rastro de cada página y del cierre', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.openBook('story'));
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Book'));
  await page.evaluate(() => window.__ZOO__!.bookNext());
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__ZOO__?.activeScenes().includes('Book'));
  const events = await log(page);
  expect(events.filter((name) => name === 'book-page-shown')).toHaveLength(2);
  expect(events).toContain('book-closed');
});

test('abrir la privacidad desde ajustes deja rastro', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.openSettings());
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Settings'));
  const pos = (await page.evaluate(() => window.__ZOO__!.settingsButtonPos('privacy')))!;
  const box = await canvasBox(page);
  await page.mouse.click(box.x + pos.x, box.y + pos.y);
  await expect.poll(() => log(page)).toContain('legal-opened');
});
```

Run: `npx playwright test tests/e2e/stats.spec.ts`
Expected: los dos tests nuevos FAIL.

- [x] **Step 2: `ShopScene`**

En `updateReach`, después de `if (!product) return;`:

```ts
    if (!quiet && product.entry.status === 'buy') bus.emit('shop-look', { itemId: product.entry.id });
```

En `onBuy`, en la rama `else if (result.error === 'not-enough-coins') {`, como primera línea:

```ts
      bus.emit('shop-denied', { itemId: entry.id, missing: Math.max(0, entry.cost - getSession().state.coins) });
```

En `close()`, después de `this.closing = true;`: `bus.emit('shop-closed', {});`

En `openBook()`, antes de `this.scene.launch('Book');`: `bus.emit('book-opened', { pageId: getSession().book.page ?? 'cover' });`

- [x] **Step 3: `BookScene`**

Añadir `import { bus, type BookPageKind } from '../systems/events';`.

En `showPage`, después de `void getSession().setBookPage(page.id);`:

```ts
    const kind: BookPageKind = !isContentPage(page) ? 'paso' : isPageUnlocked(getSession().state, page) ? 'contenido' : 'bloqueada';
    bus.emit('book-page-shown', { pageId: page.id, kind });
```

En `showIndex`, sustituir el `makePressable` de la fila:

```ts
      makePressable(row, (pointer) => {
        if (pointer.getDistance() > SWIPE_PX) return;
        bus.emit('book-index', { chapter });
        this.goTo(chapterPageId(chapter));
      });
```

En `close()`, después de `sfx.play('tap');`: `bus.emit('book-closed', {});`

- [x] **Step 4: Ajustes y salida**

`game/src/scenes/SettingsScene.ts`: añadir `import { bus } from '../systems/events';` y, en `press`, antes de `openLegal();`: `bus.emit('legal-opened', {});`

`game/src/systems/platform.ts`: añadir `import { bus } from './events';` y, en `askQuit`, como primera línea: `bus.emit('quit-asked', {});`

`game/src/scenes/QuitScene.ts`: añadir `import { bus } from '../systems/events';`. En el botón `this.yes`, cambiar `onTap: () => this.onConfirm()` por:

```ts
onTap: () => {
        bus.emit('quit-answered', { leave: true });
        this.onConfirm();
      }
```

En `close()`, después de `if (!this.scene.isActive()) return;`: `bus.emit('quit-answered', { leave: false });`

- [x] **Step 5: Conectar el `GameTracker`**

En `game/src/systems/analyticsInstall.ts`: añadir `import { GameTracker } from './analyticsEvents';`, añadir `Quit: 'salir',` al mapa `SCREENS`, y sustituir desde `const session = getSession();` hasta `await analytics.start();`:

```ts
    const session = getSession();
    const store = createStore();
    const now = (): Date => new Date();
    const analytics = new Analytics({
      config,
      store,
      events: bus,
      send,
      now,
      randomId,
      version: APP_VERSION,
      platform: Capacitor.isNativePlatform() ? 'android' : 'web',
      language: getLanguage,
      settings: session.settings,
      coins: session.state.coins,
    });
    setAnalytics(analytics);
    const tracker = new GameTracker({
      sink: analytics,
      events: bus,
      store,
      now,
      state: () => getSession().state,
      settings: () => getSession().settings,
      book: () => getSession().book,
    });
    analytics.setHooks(tracker);
    for (const [key, name] of Object.entries(SCREENS)) {
      const events = game.scene.getScene(key).events;
      events.on('start', () => analytics.screenView(name));
      events.on('resume', () => analytics.screenView(name));
    }
    setInterval(() => void analytics.flush(), FLUSH_MS);
    // El tracker primero: tiene que estar escuchando cuando empiece la sesión.
    await tracker.start();
    await analytics.start();
```

- [x] **Step 6: Comprobar que pasa**

Run: `npx tsc --noEmit && npx vitest run && npx playwright test`
Expected: PASS en todo (unitarias y todas las pruebas de juego).

- [x] **Step 7: Commit**

```bash
git add game/src/scenes/ShopScene.ts game/src/scenes/BookScene.ts game/src/scenes/SettingsScene.ts game/src/scenes/QuitScene.ts game/src/systems/platform.ts game/src/systems/analyticsInstall.ts game/tests/e2e/stats.spec.ts
git commit -m "feat: tienda, libro, ajustes y salida avisan de lo que pasa; el tracker queda conectado"
```

---

### Task 11: Lectura de los datos por API (`tools/matomo/`)

**Files:**
- Create: `tools/matomo/lib.mjs`, `tools/matomo/lib.test.mjs`, `tools/matomo/config.mjs`, `tools/matomo/pull.mjs`, `tools/matomo/resumen.mjs`, `tools/matomo/probe.mjs`, `tools/matomo/.env.example`, `tools/matomo/README.md`
- Modify: `.gitignore` (raíz), `SECURITY.md`

**Interfaces:**
- Produces (`lib.mjs`): `parseEnv(text)`, `toRows(report)`, `byAction(rows)`, `events(index, action, name?)`, `share(n, d, min?)`, `medianBucket(counts, order)`, `table(headers, rows)`.
- Ficheros que genera: `tools/matomo/data/events.json`, `events-daily.json`, `visits-daily.json`, `resumen.md`.

- [x] **Step 1: Ignorar los datos y documentar el token**

Añadir al final de `.gitignore` (raíz):

```
# Informes descargados de Matomo: nunca al repo público
tools/matomo/data/
```

Comprobar que el fichero del token ya queda ignorado por las reglas `.env.*`:

Run (raíz): `git check-ignore -v tools/matomo/.env.local tools/matomo/data/x.json`
Expected: dos líneas, una por ruta. Si la primera no sale, añadir `tools/matomo/.env.local` al `.gitignore`.

```
# tools/matomo/.env.example
# Copiar a .env.local (ignorado por git) y rellenar. Nunca subir el fichero relleno.
# Dirección del Matomo, sin barra final.
MATOMO_URL=
# Id del sitio del juego.
MATOMO_SITE=
# Token de un usuario con permiso «ver» SOLO sobre ese sitio.
MATOMO_TOKEN=
```

Añadir a `SECURITY.md`, al final de la sección 1:

```markdown
- El token de lectura de Matomo vive solo en `tools/matomo/.env.local`. Nunca lleva prefijo `VITE_`
  (Vite mete en la app todo lo que empieza así) y pertenece a un usuario con permiso «ver» sobre un
  único sitio. Los scripts lo envían en el cuerpo de la petición, nunca en la dirección, y no lo imprimen.
```

- [x] **Step 2: Test de la librería**

```js
// tools/matomo/lib.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { byAction, events, medianBucket, parseEnv, share, table, toRows } from './lib.mjs';

test('parseEnv lee claves, ignora comentarios y quita comillas', () => {
  assert.deepEqual(parseEnv('# nota\nMATOMO_URL=https://stats.example.com/\nMATOMO_SITE="7"\n\nMATOMO_TOKEN=abc=def\n'), {
    MATOMO_URL: 'https://stats.example.com/',
    MATOMO_SITE: '7',
    MATOMO_TOKEN: 'abc=def',
  });
});

test('toRows usa las columnas de acción y nombre si vienen', () => {
  const rows = toRows([{ label: 'x', Events_EventAction: 'come', Events_EventName: 'cabra/gordi/pan', nb_events: 4, nb_visits: 3, sum_event_value: 4, avg_event_value: 1, min_event_value: 1, max_event_value: 1 }]);
  assert.deepEqual(rows, [{ action: 'come', name: 'cabra/gordi/pan', events: 4, visits: 3, sum: 4, avg: 1, min: 1, max: 1 }]);
});

test('toRows, sin esas columnas, parte la etiqueta «acción - nombre»', () => {
  const rows = toRows([{ label: 'ventana-fin - cabra/gordi', nb_events: '2' }, { label: 'primer-paso', nb_events: 5 }]);
  assert.equal(rows[0].action, 'ventana-fin');
  assert.equal(rows[0].name, 'cabra/gordi');
  assert.equal(rows[0].events, 2);
  assert.equal(rows[1].action, 'primer-paso');
  assert.equal(rows[1].name, '');
});

test('toRows aguanta una respuesta que no es una lista', () => {
  assert.deepEqual(toRows({ result: 'error' }), []);
});

test('events suma una acción entera o un nombre concreto', () => {
  const index = byAction(toRows([{ label: 'come - a', nb_events: 3 }, { label: 'come - b', nb_events: 2 }]));
  assert.equal(events(index, 'come'), 5);
  assert.equal(events(index, 'come', 'a'), 3);
  assert.equal(events(index, 'come', 'z'), 0);
  assert.equal(events(index, 'nada'), 0);
});

test('share no concluye con muestra pequeña', () => {
  assert.equal(share(12, 40), '30 % (12 de 40)');
  assert.equal(share(3, 10), 'insuficiente (3 de 10)');
  assert.equal(share(0, 0), 'insuficiente (0 de 0)');
});

test('medianBucket da el tramo donde cae la mitad', () => {
  const order = ['0', '1-2', '3-5', '6-10'];
  assert.equal(medianBucket(new Map([['0', 10], ['1-2', 30], ['3-5', 50], ['6-10', 10]]), order), '3-5');
  assert.equal(medianBucket(new Map([['0', 60], ['1-2', 40]]), order), '0');
  assert.equal(medianBucket(new Map(), order), null);
});

test('table escribe una tabla de Markdown', () => {
  assert.equal(table(['a', 'b'], [['1', '2']]), '| a | b |\n|---|---|\n| 1 | 2 |');
});
```

Run (raíz): `node --test "tools/matomo/*.test.mjs"`
Expected: FAIL, no encuentra `lib.mjs`.

- [x] **Step 3: Implementar la librería**

```js
// tools/matomo/lib.mjs
// Funciones puras para leer los informes de eventos de Matomo. Sin dependencias.

/** Mínimo de jugadores en el denominador para sacar una conclusión. */
export const MIN_SAMPLE = 30;

export function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const cut = trimmed.indexOf('=');
    if (cut < 1) continue;
    out[trimmed.slice(0, cut).trim()] = trimmed.slice(cut + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

/** Informe plano «acción × nombre» de Matomo → filas sencillas. */
export function toRows(report) {
  if (!Array.isArray(report)) return [];
  return report.map((row) => {
    const label = String(row.label ?? '');
    const cut = label.indexOf(' - ');
    return {
      action: String(row.Events_EventAction ?? (cut < 0 ? label : label.slice(0, cut))),
      name: String(row.Events_EventName ?? (cut < 0 ? '' : label.slice(cut + 3))),
      events: Number(row.nb_events ?? 0),
      visits: Number(row.nb_visits ?? 0),
      sum: Number(row.sum_event_value ?? 0),
      avg: Number(row.avg_event_value ?? 0),
      min: Number(row.min_event_value ?? 0),
      max: Number(row.max_event_value ?? 0),
    };
  });
}

/** acción → nombre → fila. */
export function byAction(rows) {
  const index = new Map();
  for (const row of rows) {
    if (!index.has(row.action)) index.set(row.action, new Map());
    index.get(row.action).set(row.name, row);
  }
  return index;
}

/** Veces que ocurrió una acción; con `name`, solo ese nombre. */
export function events(index, action, name) {
  const names = index.get(action);
  if (!names) return 0;
  if (name !== undefined) return names.get(name)?.events ?? 0;
  let total = 0;
  for (const row of names.values()) total += row.events;
  return total;
}

export function share(n, d, min = MIN_SAMPLE) {
  if (d < min) return `insuficiente (${n} de ${d})`;
  return `${Math.round((100 * n) / d)} % (${n} de ${d})`;
}

/** Tramo donde cae la mediana, dados los recuentos por tramo y su orden. `null` sin datos. */
export function medianBucket(counts, order) {
  const total = order.reduce((sum, label) => sum + (counts.get(label) ?? 0), 0);
  if (total === 0) return null;
  let seen = 0;
  for (const label of order) {
    seen += counts.get(label) ?? 0;
    if (seen * 2 >= total) return label;
  }
  return order[order.length - 1];
}

export function table(headers, rows) {
  const line = (cells) => `| ${cells.join(' | ')} |`;
  return [line(headers), `|${headers.map(() => '---').join('|')}|`, ...rows.map(line)].join('\n');
}
```

Run (raíz): `node --test "tools/matomo/*.test.mjs"`
Expected: PASS.

- [x] **Step 4: Configuración con guarda de seguridad**

```js
// tools/matomo/config.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from './lib.mjs';

export const HERE = dirname(fileURLToPath(import.meta.url));
export const DATA = join(HERE, 'data');
const ENV_FILE = join(HERE, '.env.local');

function fail(message) {
  console.error(message);
  process.exit(1);
}

/** Lee la configuración. Se niega a seguir si el fichero del token podría acabar en el repositorio. */
export function loadConfig() {
  if (!existsSync(ENV_FILE)) fail('Falta tools/matomo/.env.local. Copia .env.example y rellénalo.');
  try {
    execFileSync('git', ['check-ignore', '-q', ENV_FILE], { cwd: HERE, stdio: 'ignore' });
  } catch {
    fail('tools/matomo/.env.local NO está ignorado por git. No sigo: el token podría subirse al repositorio.');
  }
  const env = parseEnv(readFileSync(ENV_FILE, 'utf8'));
  const url = (env.MATOMO_URL ?? '').replace(/\/+$/, '');
  const site = env.MATOMO_SITE ?? '';
  const token = env.MATOMO_TOKEN ?? '';
  if (!url.startsWith('https://') || !/^\d+$/.test(site) || token.length < 16) {
    fail('tools/matomo/.env.local está incompleto: hacen falta MATOMO_URL (https), MATOMO_SITE y MATOMO_TOKEN.');
  }
  return { url, site, token };
}

/** Llama a la API de informes. El token va en el cuerpo del POST, nunca en la dirección, y nunca se imprime. */
export async function api(config, method, params = {}) {
  const body = new URLSearchParams({ module: 'API', method, format: 'JSON', idSite: config.site, token_auth: config.token, filter_limit: '-1', ...params });
  const response = await fetch(`${config.url}/index.php`, { method: 'POST', body });
  if (!response.ok) throw new Error(`Matomo respondió ${response.status} a ${method}`);
  const data = await response.json();
  if (data && data.result === 'error') throw new Error(`Matomo rechazó ${method}: ${String(data.message).replaceAll(config.token, '***')}`);
  return data;
}
```

- [x] **Step 5: Descarga**

```js
// tools/matomo/pull.mjs
// Uso: node tools/matomo/pull.mjs [--date=last30]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA, api, loadConfig } from './config.mjs';

const date = process.argv.find((arg) => arg.startsWith('--date='))?.slice(7) ?? 'last30';
if (!/^(last\d{1,3}|\d{4}-\d{2}-\d{2},\d{4}-\d{2}-\d{2})$/.test(date)) {
  console.error('Fecha no válida. Usa --date=last30 o --date=2026-10-01,2026-10-31');
  process.exit(1);
}

const config = loadConfig();
const eventsReport = { secondaryDimension: 'eventName', flat: '1' };
const downloads = [
  ['events.json', 'Events.getAction', { period: 'range', date, ...eventsReport }],
  ['events-daily.json', 'Events.getAction', { period: 'day', date, ...eventsReport }],
  ['visits-daily.json', 'VisitsSummary.get', { period: 'day', date }],
];

mkdirSync(DATA, { recursive: true });
try {
  for (const [file, method, params] of downloads) {
    const data = await api(config, method, params);
    writeFileSync(join(DATA, file), JSON.stringify(data, null, 2));
    console.log(`${file}: ${Array.isArray(data) ? data.length : Object.keys(data).length} filas`);
  }
  writeFileSync(join(DATA, 'meta.json'), JSON.stringify({ date, pulledAt: new Date().toISOString() }, null, 2));
  console.log(`Hecho. Periodo: ${date}. Datos en tools/matomo/data/ (ignorado por git).`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Fallo desconocido');
  process.exit(1);
}
```

- [x] **Step 6: Resumen**

```js
// tools/matomo/resumen.mjs
// Uso: node tools/matomo/resumen.mjs   (después de pull.mjs)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA } from './config.mjs';
import { MIN_SAMPLE, byAction, events, medianBucket, share, table, toRows } from './lib.mjs';

const file = join(DATA, 'events.json');
if (!existsSync(file)) {
  console.error('No hay datos. Lanza antes: node tools/matomo/pull.mjs');
  process.exit(1);
}
const meta = existsSync(join(DATA, 'meta.json')) ? JSON.parse(readFileSync(join(DATA, 'meta.json'), 'utf8')) : {};
const rows = toRows(JSON.parse(readFileSync(file, 'utf8')));
const index = byAction(rows);
const n = (action, name) => events(index, action, name);
const of = (action) => [...(index.get(action)?.values() ?? [])];
const top = (list, key, limit = 20) => [...list].sort((a, b) => b[key] - a[key]).slice(0, limit);
const FEED = ['come', 'rechaza', 'especial'];
const feedsOf = (prefix) => FEED.reduce((sum, action) => sum + of(action).filter((r) => r.name.startsWith(`${prefix}/`)).reduce((s, r) => s + r.events, 0), 0);
const counts = (action) => new Map(of(action).map((r) => [r.name, r.events]));
const median = (action, order) => medianBucket(counts(action), order) ?? 'sin datos';
const avg = (row) => (row ? row.avg.toFixed(1) : '—');

const playerDays = n('dia');
const news = n('nuevo');
const sessions = n('inicio');
const allEvents = rows.reduce((sum, r) => sum + r.events, 0);
const lost = of('perdidos').reduce((sum, r) => sum + r.sum, 0);
const out = [];

out.push(`# Resumen de estadísticas — ${meta.date ?? 'periodo desconocido'}`, '');
out.push(`Las cifras de alcance son «jugadores por día»: un jugador que juega tres días cuenta tres veces. Con menos de ${MIN_SAMPLE} en el denominador se marca «insuficiente» y no se concluye nada.`, '');

out.push('## Muestra', '', table(['Dato', 'Valor'], [
  ['Jugadores nuevos', news],
  ['Jugadores por día (suma)', playerDays],
  ['Sesiones', sessions],
  ['Comidas por sesión (media)', sessions ? (FEED.reduce((s, a) => s + n(a), 0) / sessions).toFixed(1) : '—'],
  ['Comidas por rato de juego (mediana, tramo)', median('rato-comidas', ['0', '1-2', '3-5', '6-10', '11-20', '21+'])],
  ['Animales distintos por rato (mediana, tramo)', median('rato-animales', ['0', '1', '2-3', '4-6', '7+'])],
  ['Duración del rato (mediana, tramo)', median('fin', ['<1m', '1-3m', '3-10m', '10-30m', '30m+'])],
  ['Eventos perdidos (sin red o caducados)', `${lost} frente a ${allEvents} recibidos`],
]), '');

out.push('## Animales: quién gusta más entre quienes lo tienen', '', table(
  ['Animal', 'Le dan de comer (de quienes lo tienen)', 'Comidas', 'Ventanas', 'Ventanas vacías'],
  top(of('tiene-animal').map((r) => ({ name: r.name, owners: r.events, fed: n('dia-animal', r.name), feeds: feedsOf(r.name) })), 'fed', 80)
    .map((a) => [a.name, share(a.fed, a.owners), a.feeds, n('ventana', a.name), n('ventana-vacia', a.name)]),
), '');

out.push('## Comidas: cuáles se usan más', '', table(
  ['Comida', 'La usan (de los jugadores del día)'],
  top(of('dia-comida'), 'events').map((r) => [r.name, share(r.events, playerDays)]),
), '');

out.push('## Combinaciones animal y comida más repetidas', '', table(
  ['Reacción', 'Animal / comida', 'Veces'],
  top(FEED.flatMap((action) => of(action).map((r) => ({ action, ...r }))), 'events', 25).map((r) => [r.action, r.name, r.events]),
), '');

const pens = [...new Set([...of('tiene-recinto'), ...of('cerca-cerrado'), ...of('toca-cerrado')].map((r) => r.name))];
out.push('## Recintos: visitados, alimentados y deseados', '', table(
  ['Recinto', 'Lo visitan (de quienes lo tienen)', 'Comidas', 'Se acercan estando cerrado', 'Lo tocan estando cerrado', 'Intentos sin monedas'],
  pens.map((pen) => [pen, share(n('dia-recinto', pen), n('tiene-recinto', pen)), feedsOf(pen), n('cerca-cerrado', pen), n('toca-cerrado', pen), n('sin-monedas', pen) + n('sin-monedas', `extra-${pen}`)]),
), '');

out.push('## Libro', '', table(['Dato', 'Valor'], [
  ['Abren el libro (de los jugadores del día)', share(n('dia-pantalla', 'libro'), playerDays)],
  ['Aperturas', n('abre')],
  ['Páginas leídas por apertura (mediana, tramo)', median('libro-fin', ['0', '1', '2-3', '4-7', '8+'])],
]), '', table(
  ['Página', 'Leída (veces)', 'Segundos (media)', 'Hojeada', 'Vista bloqueada'],
  top([...new Set([...of('lee'), ...of('hojea'), ...of('bloqueada')].map((r) => r.name))].map((name) => ({ name, events: n('lee', name) })), 'events', 80)
    .map((p) => [p.name, p.events, avg(index.get('lee')?.get(p.name)), n('hojea', p.name), n('bloqueada', p.name)]),
), '');

const drops = FEED.reduce((s, a) => s + n(a), 0) + n('fuera');
out.push('## Tropiezos', '', table(['Dato', 'Valor'], [
  ['Comidas soltadas fuera del animal', share(n('fuera'), drops)],
  ['Ventanas de comer cerradas sin dar nada', share(n('ventana-vacia'), n('ventana'))],
  ['Visitas a la tienda sin comprar', share(n('tienda-sin-compra'), n('tienda-fin'))],
  ['Veces que se pisó la tienda cerrada', n('tienda-cerrada')],
]), '');

const STEPS = ['primer-paso', 'primer-toque-animal', 'primera-ventana', 'primera-comida', 'tienda-abierta', 'primera-tienda', 'primera-compra', 'primer-libro', 'libro-completo', 'zoo-completo'];
out.push('## Embudo de inicio', '', table(
  ['Paso', 'Llegan (de los nuevos)', 'Minutos de juego hasta llegar (media)'],
  STEPS.map((step) => [step, share(n(step), news), avg(index.get(step)?.values().next().value)]),
), '');

out.push('## Retención por semana de inicio', '', table(
  ['Semana', 'Nuevos', 'Vuelven día 1+', 'Vuelven día 7+', 'Vuelven día 30+'],
  of('nuevo').sort((a, b) => a.name.localeCompare(b.name)).map((r) => [r.name, r.events, share(n('vuelve-d1', r.name), r.events), share(n('vuelve-d7', r.name), r.events), share(n('vuelve-d30', r.name), r.events)]),
), '');

writeFileSync(join(DATA, 'resumen.md'), `${out.join('\n')}\n`);
console.log('Resumen escrito en tools/matomo/data/resumen.md');
```

- [x] **Step 7: Sonda para comprobar la fecha real (se usa en la Task 13)**

```js
// tools/matomo/probe.mjs
// Envía cuatro eventos de prueba al seguimiento, igual que la app (lote, sin token), con fechas distintas.
// Uso: node tools/matomo/probe.mjs
import { randomBytes } from 'node:crypto';
import { loadConfig } from './config.mjs';

const config = loadConfig();
const hex = () => randomBytes(8).toString('hex');
const visitor = hex();
const cdt = (hoursAgo) => new Date(Date.now() - hoursAgo * 3_600_000).toISOString().slice(0, 19).replace('T', ' ');
const hit = (name, hoursAgo) => {
  const p = new URLSearchParams({ idsite: config.site, rec: '1', apiv: '1', rand: hex(), _id: visitor, url: 'https://davidpladel.com/zoo/prueba', e_c: 'prueba', e_a: 'sonda', e_n: name });
  if (hoursAgo > 0) p.set('cdt', cdt(hoursAgo));
  return `?${p.toString()}`;
};
const body = (requests) => JSON.stringify({ requests });
const post = async (label, requests) => {
  const response = await fetch(`${config.url}/matomo.php`, { method: 'POST', body: body(requests), headers: { 'Content-Type': 'text/plain' } });
  console.log(`${label}: HTTP ${response.status} — ${(await response.text()).slice(0, 200)}`);
};

await post('Lote 1 (ahora, hace 3 h, hace 20 h)', [hit('ahora', 0), hit('hace-3h', 3), hit('hace-20h', 20)]);
await post('Lote 2 (uno bueno y uno de hace 30 h)', [hit('junto-a-uno-viejo', 0), hit('hace-30h', 30)]);
console.log('Mira en Matomo → Comportamiento → Eventos (categoría «prueba») de hoy y de ayer qué ha llegado y en qué hora.');
```

- [x] **Step 8: README de la carpeta**

```markdown
<!-- tools/matomo/README.md -->
# Lectura de las estadísticas del juego

Scripts de Node sin dependencias para descargar y resumir los informes del Matomo del juego.

## Preparación (una vez)

1. En Matomo, crea un usuario con permiso **ver** solo sobre el sitio del juego y copia su token.
2. Copia `.env.example` a `.env.local` en esta carpeta y rellénalo. Ese fichero está ignorado por git;
   los scripts se niegan a arrancar si no lo está.

## Uso

Desde la raíz del repositorio:

    node tools/matomo/pull.mjs --date=last30
    node tools/matomo/resumen.mjs

El primero descarga los informes a `tools/matomo/data/` (ignorado por git). El segundo escribe
`tools/matomo/data/resumen.md` con las tablas habituales. Toda cifra lleva su tamaño de muestra, y
con menos de 30 en el denominador se marca «insuficiente».

`probe.mjs` envía eventos de prueba con fecha antigua para comprobar la ventana de `cdt` del servidor.

## Cómo leer los datos

- Un animal se nombra con su recinto delante: `cabra/gordi`. Con comida: `cabra/gordi/zanahoria`.
- `dia-…` cuenta jugadores por día; `semana-…`, por semana; `vida-…`, una vez por instalación.
- `tiene-animal` y `tiene-recinto` se envían una vez al día y dicen qué tiene el jugador: son el denominador.
- El catálogo completo está en `game/src/core/eventCatalog.ts` y en
  `docs/superpowers/specs/2026-10-07-analitica-detallada-design.md`.
```

- [x] **Step 9: Comprobar**

Run (raíz): `node --test "tools/matomo/*.test.mjs" && node tools/matomo/pull.mjs`
Expected: los tests PASS; `pull.mjs` termina con el mensaje «Falta tools/matomo/.env.local…» y código 1 (aún no hay token: es lo correcto).

- [x] **Step 10: Commit**

```bash
git add .gitignore SECURITY.md tools/matomo/
git status --short
git commit -m "feat: scripts para leer y resumir las estadísticas por la API de Matomo, con token local de solo lectura"
```

Antes de confirmar, mirar la salida de `git status --short`: no debe aparecer `tools/matomo/.env.local` ni nada de `tools/matomo/data/`.

---

### Task 12: Guarda de la compilación, privacidad y documentación

**Files:**
- Create: `game/scripts/check-dist.mjs`
- Modify: `game/package.json`, `game/public/privacidad.html`, `game/public/privacidad-en.html`, `README.md`, `docs/superpowers/specs/2026-10-07-analitica-anonima-matomo-design.md`, `docs/superpowers/specs/2026-10-07-analitica-detallada-design.md`

- [x] **Step 1: Guarda de la compilación**

```js
// game/scripts/check-dist.mjs
// Falla si la app compilada lleva algo que huela a token de Matomo. Se lanza al final de `npm run build`.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const FORBIDDEN = ['token_auth', 'MATOMO_TOKEN'];
const TEXT = new Set(['.js', '.mjs', '.css', '.html', '.json', '.map', '.txt', '.webmanifest']);

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (TEXT.has(extname(name))) yield path;
  }
}

const found = [];
for (const path of files(DIST)) {
  const text = readFileSync(path, 'utf8');
  for (const word of FORBIDDEN) if (text.includes(word)) found.push(`${path}: ${word}`);
}
if (found.length > 0) {
  console.error(`La compilación contiene texto prohibido:\n${found.join('\n')}`);
  process.exit(1);
}
console.log('check-dist: sin tokens en la compilación.');
```

En `game/package.json`, cambiar el script `build` y añadir `check:dist`:

```json
    "build": "tsc --noEmit && vite build && node scripts/check-dist.mjs",
    "check:dist": "node scripts/check-dist.mjs",
```

Run: `npm run build`
Expected: termina con «check-dist: sin tokens en la compilación.»

Comprobar que la guarda muerde: añadir temporalmente `console.log('token_auth');` al final de `game/src/main.ts`, lanzar `npm run build` (Expected: FAIL con la ruta del fichero), quitar la línea y volver a compilar (Expected: PASS).

- [x] **Step 2: Privacidad en español**

En `game/public/privacidad.html`, sustituir el párrafo del apartado «Estadísticas anónimas» por:

```html
      <p>
        Para saber qué gusta del juego y dónde falla, el juego envía a un servidor propio de davidpladel avisos
        sobre cómo se usa: que se ha abierto, qué pantallas se ven, a qué animal del zoo se da de comer y con qué
        comida, qué recintos se visitan, qué páginas del libro se leen, qué se compra en la tienda del juego y si
        ha habido un error. Son siempre personajes y objetos del juego, nunca datos de quien juega. No usa cookies
        ni ningún número que identifique al dispositivo o a la persona. Para contar cuánta gente juega, el propio
        dispositivo recuerda si ya ha avisado hoy y no vuelve a hacerlo; esa nota no sale de él.
      </p>
      <p>
        Si se juega sin conexión, los avisos esperan guardados en el dispositivo y se envían cuando vuelve la
        conexión; pasados unos días sin poder enviarlos, se borran. La dirección de internet se recorta al llegar
        y solo sirve para saber el país. Los datos no se ceden a nadie, no se usan para publicidad y se borran
        como muy tarde a los 25 meses. Se puede apagar cuando se quiera con el botón «Estadísticas» de Ajustes; al
        apagarlo se borra también lo que estuviera esperando.
      </p>
```

- [x] **Step 3: Privacidad en inglés**

En `game/public/privacidad-en.html`, sustituir el párrafo del apartado «Anonymous statistics» por:

```html
      <p>
        To learn what players enjoy and where the game fails, the game sends notices about how it is used to a
        server owned by davidpladel: that it was opened, which screens are seen, which zoo animal is fed and with
        which food, which enclosures are visited, which pages of the book are read, what is bought in the in-game
        shop, and whether there was an error. These are always characters and objects from the game, never data
        about the player. It uses no cookies and no number that identifies the device or the person. To count how
        many people play, the device itself remembers whether it has already sent today's notice and does not
        send it again; that note never leaves the device.
      </p>
      <p>
        If the game is played offline, the notices wait on the device and are sent when the connection returns;
        after a few days without being able to send them, they are deleted. The internet address is shortened on
        arrival and is only used to know the country. The data is not shared with anyone, is not used for
        advertising and is deleted after 25 months at the latest. You can turn it off at any time with the
        "Stats" button in Settings; turning it off also deletes anything that was waiting.
      </p>
```

En los dos ficheros, poner en «Última actualización» / «Last updated» la fecha del día en que se haga este paso.

Run: `npx vitest run tests/unit/legal.test.ts`
Expected: PASS (los apartados no cambian de número).

- [x] **Step 4: Documentación**

- `README.md`: en la fila «Spec analítica detallada», enlazar también el plan (`docs/superpowers/plans/2026-10-07-analitica-detallada.md`) y cambiar «Diseño (sin plan aún)» por lo que ya esté hecho. Si el README describe qué mide el juego o la carpeta `tools/`, añadir una línea sobre `tools/matomo/`.
- `docs/superpowers/specs/2026-10-07-analitica-detallada-design.md`: actualizar la línea «Estado» con la rama y lo que falte.
- `docs/superpowers/specs/2026-10-07-analitica-anonima-matomo-design.md`: añadir bajo el título una nota: «La tabla de «Qué se mide» y el envío (cola, reintentos) están ampliados en `2026-10-07-analitica-detallada-design.md`.»
- Este plan: marcar las casillas hechas.

- [x] **Step 5: Comprobación completa**

Run: `npx tsc --noEmit && npx vitest run && npx playwright test && npm run build`
Run (raíz): `node --test "tools/matomo/*.test.mjs"`
Expected: todo PASS.

Run (raíz): `git grep -nIiE "token_auth=[0-9a-f]|MATOMO_TOKEN=.+" -- . ':!tools/matomo/.env.example'`
Expected: sin resultados.

- [x] **Step 6: Commit**

```bash
git add game/scripts/check-dist.mjs game/package.json game/public/privacidad.html game/public/privacidad-en.html README.md docs/superpowers/
git commit -m "docs: la privacidad explica el detalle y el juego sin conexión; la compilación se comprueba sin tokens"
```

---

### Task 13: Pasos de David y comprobación contra el Matomo real

Esta tarea no se puede hacer sin David. No se da el trabajo por terminado hasta completarla.

- [ ] **Step 1: Usuario de solo lectura (David)**

En Matomo: Administración → Sistema → Usuarios → Añadir usuario. Darle permiso **Ver** únicamente en el sitio «Zoo Esponji - App» y ninguno en los demás. Entrar con ese usuario → Personal → Seguridad → crear un token de autenticación. Copiar `tools/matomo/.env.example` a `tools/matomo/.env.local` y rellenar las tres líneas.

Run (raíz): `node tools/matomo/pull.mjs --date=last7`
Expected: tres líneas con filas y «Hecho». Si dice que el fichero no está ignorado, parar y avisar.

- [ ] **Step 2: Sonda de fechas (Claude lanza, David mira Matomo)**

Para ver los eventos uno a uno hace falta el registro de visitas, que el modo CNIL apaga. Desactivar el modo CNIL del sitio solo durante esta comprobación y volver a activarlo al acabar.

Run (raíz): `node tools/matomo/probe.mjs`

Anotar en la spec (sección «Comprobar contra el Matomo real») el resultado de cada punto:

1. ¿`hace-3h` y `hace-20h` aparecen en su hora real? (punto 1 de la spec)
2. ¿`hace-20h`, si cae en el día de ayer, aparece en el informe de ayer sin hacer nada? Si no: anotar que hace falta `./console core:invalidate-report-data --dates=AAAA-MM-DD --sites=ID` (punto 2).
3. Lote 2: ¿llegó `junto-a-uno-viejo`? ¿Qué pasó con `hace-30h`: no llegó, o llegó con la hora de ahora? (punto 5)
4. Con el modo CNIL activado de nuevo: `node tools/matomo/pull.mjs --date=last7` y mirar en `events.json` si `nb_events` da cifras exactas (no múltiplos de 10) y si cada fila trae `Events_EventAction` y `Events_EventName` o solo `label` (puntos 3 y 4).

- [ ] **Step 3: Actuar según lo visto**

- Si `hace-30h` **llegó fechado ahora**: es dato falso. Bajar el margen: `DEFAULT_REPLAY_HOURS` de 23 a 20 en `matomoRequest.ts` (y su test) para alejarse del borde.
- Si el lote 2 **se rechazó entero**: mismo ajuste; el descarte por caducidad del cliente ya evita enviar eventos viejos.
- Si **ningún `cdt` funciona** sin token: poner `VITE_MATOMO_REPLAY_HOURS=0` en `game/.env.production.local`. Los eventos de más de 5 minutos se descartarán y se contarán como `caducado`; avisar a David de que lo jugado sin conexión no se recupera y replantear.
- Si la API no trae las columnas de acción y nombre, `toRows` ya parte la etiqueta: comprobar con `node tools/matomo/resumen.mjs` que las tablas salen con nombres correctos.

- [ ] **Step 4: Ampliar la ventana a 7 días (David, opcional y recomendado)**

Solo si el Step 2 confirma que `cdt` funciona. En el servidor, en `config/config.ini.php` del Matomo, dentro de `[Tracker]`:

```ini
tracking_requests_require_authentication_when_custom_timestamp_newer_than = 604800
```

Es un ajuste de toda la instancia. Después, lanzar otra vez `node tools/matomo/probe.mjs` y comprobar que `hace-30h` llega ahora en su hora real. Si es así, poner `VITE_MATOMO_REPLAY_HOURS=167` en `game/.env.production.local` y recompilar.

- [ ] **Step 5: Prueba real en el móvil**

Con una compilación de producción instalada: jugar un minuto con el modo avión puesto (dar de comer a dos animales, abrir la tienda), cerrar la app, esperar 10 minutos, quitar el modo avión y abrir la app. Al día siguiente:

Run (raíz): `node tools/matomo/pull.mjs --date=last7 && node tools/matomo/resumen.mjs`
Expected: en `resumen.md` aparecen las comidas de la prueba, y en `events.json` un evento `pendientes`.

Comprobar además que el `AndroidManifest.xml` final sigue sin `AD_ID` ni permisos nuevos.

- [ ] **Step 6: Cerrar**

Actualizar el estado en las dos specs y en el README, marcar las casillas de este plan, y fusionar la rama.

```bash
git add docs/ README.md game/
git commit -m "docs: analítica detallada comprobada contra el Matomo real"
```


