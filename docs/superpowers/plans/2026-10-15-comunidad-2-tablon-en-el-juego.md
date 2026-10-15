# Comunidad 2: el tablón en el juego — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Llevar al juego el tablón de la plaza (votación con dibujos, tarro de ideas, muro de ideas hechas y tarjeta con el QR), el aviso de votación nueva y los carteles «Idea de …» junto a los recintos, leyendo el servidor de comunidad del plan 1. Versión **2.7.0**.

**Architecture:** Lógica pura en `src/core/community.ts` (validar la respuesta de `estado.php`, fase de la votación, días que quedan, tramo del tarro, qué hay sin ver). Un sistema con dependencias inyectadas, `src/systems/community.ts` (pide al servidor, guarda la última respuesta válida y la memoria del aparato en la clave `zooesponji_v3_community`, envía el voto, nunca lanza), montado desde `src/systems/communityInstall.ts` solo si hay `VITE_COMMUNITY_URL`. Encima, Phaser: `src/world/Board.ts` (tablón y carteles en el mapa), `src/scenes/BoardScene.ts` (pantalla del tablón) y `src/scenes/PollNoticeScene.ts` (aviso).

**Tech Stack:** TypeScript 5.9, Phaser 4.2.1, Vite 8, Vitest 5, Playwright 1.63, Capacitor 8 (Android). Servidor ya hecho (PHP 8, plan 1).

**Spec:** `docs/superpowers/specs/2026-10-12-comunidad-design.md` (secciones 4 a 9, Pruebas y Riesgos). La forma exacta de la respuesta de `estado.php` está en `docs/superpowers/plans/2026-10-12-comunidad-1-servidor-y-web.md`, tarea de `Estado::construir`.

## Global Constraints

- El juego sigue declarado solo para niños: **no recoge ningún texto ni ningún nombre**. Lo único que sale del aparato es `{ votacion, opcion, anterior? }` hacia `voto.php`.
- El juego **no abre el navegador**: el QR es una imagen, la dirección de las condiciones va escrita, no es un enlace.
- **Nunca lanza:** cualquier fallo de red, del almacén o de una respuesta mal formada acaba en «sin conexión» o en «no hay tablón». Si el servidor se cae, el juego funciona igual que hoy.
- Sin `VITE_COMMUNITY_URL` (en `game/.env.production.local`): no hay tablón, ni aviso, ni carteles, ni peticiones.
- Peticiones con `credentials: 'omit'`, sin cookies ni identificadores. `estado.php` es `GET`; `voto.php` es `POST` con `Content-Type: application/json`.
- Clave de almacén propia `zooesponji_v3_community`; **no se toca `SAVE_VERSION`**.
- Un voto por votación y aparato, que se puede cambiar mientras está abierta; solo se anota si el servidor responde bien.
- Textos del servidor: siempre como texto de Phaser (nunca HTML); títulos recortados a 30 caracteres y `ideaDe` a 15.
- Dibujos solo de `${VITE_COMMUNITY_URL}/dibujos/<nombre>` con `<nombre>` que cumpla `^[a-z0-9-]+\.png$`; si falla, dibujo de reserva.
- Los números son siempre los reales: sin cuentas atrás falsas ni mensajes de escasez. Las barras del reparto no llevan números.
- Tarro por tramos: 0, 1–9, 10–49, 50–199, 200 o más.
- Matomo: categoría `tablon` con `tablon-abre`, `tablon-aviso`, `tablon-vota` (nombre `votación/opción`), `tablon-qr`, `tablon-sin-red`; la escena `Board` se cuenta como pantalla `tablon`.
- Versión 2.7.0: `game/package.json` y `versionName` en `game/android/app/build.gradle`; `versionCode` 8.
- Comentarios y textos en español, como el resto del código; mensajes de commit en el estilo del repo (`feat(juego): …`, `docs: …`).

## Review Focus

1. **La respuesta llega cuando el mapa ya está pintado** (el arranque no espera al servidor, o la red es lenta): el tablón, la estrellita, los carteles y el aviso deben aparecer al llegar, sin reiniciar el mapa. → prueba en la tarea 9 («la respuesta tarda y el tablón aparece después»).
2. **`recinto` que no existe en el juego** (el ejemplo de la spec dice `pinguino` y el recinto se llama `pinguinos`): no debe romper ni pintar un cartel en (0,0); se ignora. → prueba en la tarea 1 (`ideaSigns`).
3. **Votar justo cuando la votación cierra** (el servidor responde 409 `cerrada`): no se anota el voto, se refresca el estado y la pantalla pasa a «cerrada», sin quedarse bloqueada. → prueba en la tarea 2.
4. **El panel del anuncio y el aviso de votación a la vez** al volver de la tienda: nunca dos paneles; el aviso espera a la siguiente vuelta al mapa. → prueba en la tarea 9.
5. **Cambiar de idioma o girar el móvil con el tablón abierto**: la escena se vuelve a montar en el idioma nuevo sin perder la opción marcada ni enviar nada. → prueba en la tarea 9 (cambio de tamaño con tarjeta marcada).

---

## Mapa de archivos

| Archivo | Qué hace |
|---|---|
| `game/src/core/community.ts` (nuevo) | Tipos, validación de `estado.php`, fase, días, tarro, sin ver, carteles, memoria del aparato. Puro. |
| `game/src/systems/community.ts` (nuevo) | Clase `Community`: red, almacén, voto, marcas de visto. `getCommunity()`/`setCommunity()`. |
| `game/src/systems/communityInstall.ts` (nuevo) | Lee `VITE_COMMUNITY_URL` y monta `Community` con `fetch` y el almacén de verdad. |
| `game/src/systems/events.ts` | Eventos `community-updated`, `board-opened`, `board-voted`, `board-qr`, `board-offline`, `poll-notice`. |
| `game/src/core/tiledmap.ts` | `readBoard(map)`. |
| `game/scripts/make-zoo-map.mjs` + `public/assets/maps/zoo.tmj` | Objeto `tablon` junto a la fuente. |
| `game/src/world/Board.ts` (nuevo) | Tablón dibujado, estrellita, toque, pisada, carteles «Idea de …». |
| `game/src/scenes/BoardScene.ts` (nuevo) | Pantalla del tablón. |
| `game/src/scenes/PollNoticeScene.ts` (nuevo) | Aviso de votación nueva. |
| `game/src/scenes/WorldScene.ts`, `ShopScene.ts`, `PreloadScene.ts`, `main.ts` | Montaje y enganches. |
| `game/src/core/hud.ts`, `game/src/systems/platform.ts`, `game/src/scenes/SettingsScene.ts` | El tablón cuenta como ventana (engranaje, botón atrás, cambio de idioma). |
| `game/src/data/strings/es.ts`, `en.ts` | Textos. |
| `game/src/core/eventCatalog.ts`, `game/src/systems/analyticsEvents.ts`, `analyticsInstall.ts` | Estadísticas. |
| `game/src/systems/testHooks.ts` | API de pruebas. |
| `game/public/privacidad.html`, `privacidad-en.html`, `web/paginas/privacidad.html` (+ la inglesa si existe) | Textos legales. |
| `game/.env.example` | `VITE_COMMUNITY_URL`. |
| Tests: `tests/unit/community.test.ts`, `tests/unit/communitySystem.test.ts`, `tests/unit/board.test.ts`, `tests/e2e/board.spec.ts` | Pruebas. |

Todas las órdenes `npm` se lanzan desde `game/`.

---

### Task 1: Lógica pura de la comunidad (`core/community.ts`)

**Files:**
- Create: `game/src/core/community.ts`
- Test: `game/tests/unit/community.test.ts`

**Interfaces:**
- Consumes: `PEN_IDS`, `type PenId` de `game/src/data/pens.ts`; `type Language` de `game/src/systems/language.ts`.
- Produces:
  - `type Localized = { es: string; en: string }`
  - `interface PollOption { id: string; titulo: Localized; dibujo: string | null; ideaDe: string | null }`
  - `interface Poll { id: string; abre: string; cierra: string; abierta: boolean; ganadora: string | null; opciones: PollOption[]; reparto: Record<string, number> }`
  - `interface WallEntry { titulo: Localized; dibujo: string | null; ideaDe: string | null; estado: 'elegida' | 'hecha'; recinto: string | null }`
  - `interface CommunityStatus { hoy: string; ideas: number; votacion: Poll | null; muro: WallEntry[] }`
  - `parseStatus(raw: unknown): CommunityStatus | null`
  - `type PollPhase = 'none' | 'open' | 'voted' | 'closed'`
  - `pollPhase(status: CommunityStatus, memory: CommunityMemory): PollPhase`
  - `daysLeft(status: CommunityStatus): number`
  - `jarTier(ideas: number): 0 | 1 | 2 | 3 | 4`
  - `interface CommunityMemory { voted: Record<string, string>; noticed: string | null; winnerSeen: string | null; wallSeen: string | null; hinted: boolean; last: CommunityStatus | null }`
  - `COMMUNITY_KEY = 'zooesponji_v3_community'`
  - `emptyMemory(): CommunityMemory`, `parseMemory(raw: string | null): CommunityMemory`
  - `wallKey(entry: WallEntry): string`
  - `hasUnseen(status: CommunityStatus, memory: CommunityMemory): boolean`
  - `shouldNotify(status: CommunityStatus, memory: CommunityMemory): boolean`
  - `ideaSigns(status: CommunityStatus): { penId: PenId; name: string }[]`
  - `localized(text: Localized, lang: Language): string`
  - `drawingName(name: unknown): string | null`

- [ ] **Step 1: Escribir las pruebas que fallan**

`game/tests/unit/community.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  daysLeft, drawingName, emptyMemory, hasUnseen, ideaSigns, jarTier, localized, parseMemory, parseStatus, pollPhase,
  shouldNotify, wallKey, type CommunityStatus,
} from '../../src/core/community';

const raw = () => ({
  hoy: '2026-11-03',
  ideas: 127,
  votacion: {
    id: '2026-11-a', abre: '2026-11-01', cierra: '2026-11-15', ganadora: null, abierta: true,
    opciones: [
      { id: 'delfines', titulo: { es: 'Delfines', en: 'Dolphins' }, dibujo: 'delfines.png', ideaDe: 'Lucía' },
      { id: 'koalas', titulo: { es: 'Koalas', en: 'Koalas' }, dibujo: 'koalas.png' },
    ],
    reparto: { delfines: 65, koalas: 35 },
  },
  muro: [{ titulo: { es: 'Pingüinos', en: 'Penguins' }, dibujo: 'pinguinos.png', ideaDe: 'Adrián', estado: 'hecha', recinto: 'pinguinos' }],
});

const status = (patch: (r: ReturnType<typeof raw>) => unknown = (r) => r): CommunityStatus => parseStatus(patch(raw()))!;

describe('parseStatus', () => {
  it('acepta la respuesta del servidor', () => {
    const s = status();
    expect(s.ideas).toBe(127);
    expect(s.votacion?.opciones.map((o) => o.id)).toEqual(['delfines', 'koalas']);
    expect(s.votacion?.opciones[1]?.ideaDe).toBeNull();
    expect(s.muro[0]?.recinto).toBe('pinguinos');
  });

  it('sin votación', () => {
    expect(status((r) => ({ ...r, votacion: null })).votacion).toBeNull();
  });

  it('rechaza lo que no tiene forma de respuesta', () => {
    for (const bad of [null, 'x', [], {}, { ...raw(), hoy: 'ayer' }, { ...raw(), ideas: -1 }, { ...raw(), muro: 'x' }]) {
      expect(parseStatus(bad)).toBeNull();
    }
  });

  it('una votación rota se queda en «sin votación» y no tira el muro', () => {
    const s = status((r) => ({ ...r, votacion: { ...r.votacion, opciones: [r.votacion.opciones[0]] } }));
    expect(s.votacion).toBeNull();
    expect(s.muro).toHaveLength(1);
  });

  it('recorta títulos a 30 y nombres a 15, y descarta dibujos con rutas', () => {
    const s = status((r) => ({
      ...r,
      muro: [{ ...r.muro[0], titulo: { es: 'A'.repeat(50), en: 'B' }, ideaDe: 'Maximiliano Alejandro', dibujo: '../x.png' }],
    }));
    expect(s.muro[0]?.titulo.es).toHaveLength(30);
    expect(s.muro[0]?.ideaDe).toBe('Maximiliano Ale');
    expect(s.muro[0]?.dibujo).toBeNull();
  });

  it('descarta entradas del muro mal formadas y se queda con las buenas', () => {
    const s = status((r) => ({ ...r, muro: [{ estado: 'hecha' }, r.muro[0], { ...r.muro[0], estado: 'rara' }] }));
    expect(s.muro).toHaveLength(1);
  });

  it('el reparto se lee solo de opciones que existen, entre 0 y 100', () => {
    const s = status((r) => ({ ...r, votacion: { ...r.votacion, reparto: { delfines: 140, vieja: 50 } } }));
    expect(s.votacion?.reparto).toEqual({ delfines: 100, koalas: 0 });
  });
});

describe('fase de la votación', () => {
  it('abierta, votada, cerrada y sin votación', () => {
    const memory = emptyMemory();
    expect(pollPhase(status(), memory)).toBe('open');
    expect(pollPhase(status(), { ...memory, voted: { '2026-11-a': 'koalas' } })).toBe('voted');
    expect(pollPhase(status((r) => ({ ...r, votacion: { ...r.votacion, abierta: false } })), memory)).toBe('closed');
    expect(pollPhase(status((r) => ({ ...r, votacion: null })), memory)).toBe('none');
  });

  it('un voto de otra votación no cuenta', () => {
    expect(pollPhase(status(), { ...emptyMemory(), voted: { '2026-10-a': 'koalas' } })).toBe('open');
  });

  it('días que quedan, contando hoy; el último día queda 1', () => {
    expect(daysLeft(status())).toBe(13);
    expect(daysLeft(status((r) => ({ ...r, hoy: '2026-11-15' })))).toBe(1);
    expect(daysLeft(status((r) => ({ ...r, hoy: '2026-11-20' })))).toBe(0);
    expect(daysLeft(status((r) => ({ ...r, votacion: null })))).toBe(0);
  });

  it('el cambio de mes también cuenta bien', () => {
    expect(daysLeft(status((r) => ({ ...r, hoy: '2026-10-31', votacion: { ...r.votacion, cierra: '2026-11-02' } })))).toBe(3);
  });
});

describe('tarro de ideas', () => {
  it('tramos 0, 1-9, 10-49, 50-199, 200+', () => {
    expect([0, 1, 9, 10, 49, 50, 199, 200, 5000].map(jarTier)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });
});

describe('qué hay sin ver', () => {
  it('votación abierta sin votar', () => {
    expect(hasUnseen(status(), { ...emptyMemory(), wallSeen: wallKey(status().muro[0]!) })).toBe(true);
  });

  it('nada nuevo', () => {
    const s = status();
    expect(hasUnseen(s, { ...emptyMemory(), voted: { '2026-11-a': 'delfines' }, wallSeen: wallKey(s.muro[0]!) })).toBe(false);
  });

  it('ganadora nueva', () => {
    const s = status((r) => ({ ...r, votacion: { ...r.votacion, abierta: false, ganadora: 'delfines' }, muro: [] }));
    expect(hasUnseen(s, emptyMemory())).toBe(true);
    expect(hasUnseen(s, { ...emptyMemory(), winnerSeen: '2026-11-a' })).toBe(false);
  });

  it('entrada nueva en el muro', () => {
    const s = status((r) => ({ ...r, votacion: null }));
    expect(hasUnseen(s, emptyMemory())).toBe(true);
    expect(hasUnseen(s, { ...emptyMemory(), wallSeen: wallKey(s.muro[0]!) })).toBe(false);
  });

  it('el aviso salta una vez por votación abierta y no si ya se votó', () => {
    const s = status();
    expect(shouldNotify(s, emptyMemory())).toBe(true);
    expect(shouldNotify(s, { ...emptyMemory(), noticed: '2026-11-a' })).toBe(false);
    expect(shouldNotify(s, { ...emptyMemory(), voted: { '2026-11-a': 'koalas' } })).toBe(false);
    expect(shouldNotify(status((r) => ({ ...r, votacion: { ...r.votacion, abierta: false } })), emptyMemory())).toBe(false);
  });
});

describe('carteles de idea hecha', () => {
  it('solo las hechas, con nombre y con un recinto que existe', () => {
    const s = status((r) => ({
      ...r,
      muro: [
        r.muro[0],
        { ...r.muro[0], recinto: 'pinguino' },
        { ...r.muro[0], estado: 'elegida', recinto: 'leon' },
        { ...r.muro[0], ideaDe: undefined, recinto: 'leon' },
      ],
    }));
    expect(ideaSigns(s)).toEqual([{ penId: 'pinguinos', name: 'Adrián' }]);
  });

  it('un cartel por recinto: el más nuevo', () => {
    const s = status((r) => ({ ...r, muro: [{ ...r.muro[0], ideaDe: 'Nuevo' }, r.muro[0]] }));
    expect(ideaSigns(s)).toEqual([{ penId: 'pinguinos', name: 'Nuevo' }]);
  });
});

describe('memoria del aparato', () => {
  it('vacía si no hay nada o está rota', () => {
    expect(parseMemory(null)).toEqual(emptyMemory());
    expect(parseMemory('{rota')).toEqual(emptyMemory());
    expect(parseMemory('[]')).toEqual(emptyMemory());
  });

  it('se lee lo guardado y se limpia lo raro', () => {
    const saved = JSON.stringify({ voted: { '2026-11-a': 'koalas', mal: 3 }, noticed: '2026-11-a', winnerSeen: 7, wallSeen: 'x', hinted: true, last: raw() });
    const m = parseMemory(saved);
    expect(m.voted).toEqual({ '2026-11-a': 'koalas' });
    expect(m.noticed).toBe('2026-11-a');
    expect(m.winnerSeen).toBeNull();
    expect(m.hinted).toBe(true);
    expect(m.last?.ideas).toBe(127);
  });
});

describe('ayudas', () => {
  it('texto en el idioma del juego', () => {
    expect(localized({ es: 'Delfines', en: 'Dolphins' }, 'en')).toBe('Dolphins');
  });

  it('nombres de dibujo', () => {
    expect(drawingName('delfines-2.png')).toBe('delfines-2.png');
    for (const bad of ['../a.png', 'a/b.png', 'A.png', 'a.jpg', '', 3, null]) expect(drawingName(bad)).toBeNull();
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run tests/unit/community.test.ts`
Expected: FAIL, «Failed to resolve import "../../src/core/community"».

- [ ] **Step 3: Implementar**

`game/src/core/community.ts`:

```ts
import { PEN_IDS, type PenId } from '../data/pens';
import type { Language } from '../systems/language';

/**
 * El tablón de la comunidad: lo que dice el servidor (`estado.php`) y lo que recuerda el aparato.
 * Todo lo que llega de fuera se trata como hostil: se valida, se recorta y lo raro se descarta.
 */

export type Localized = { es: string; en: string };

export interface PollOption {
  id: string;
  titulo: Localized;
  dibujo: string | null;
  ideaDe: string | null;
}

export interface Poll {
  id: string;
  abre: string;
  cierra: string;
  abierta: boolean;
  ganadora: string | null;
  opciones: PollOption[];
  /** Porcentaje (0-100) por opción. Sin totales. */
  reparto: Record<string, number>;
}

export interface WallEntry {
  titulo: Localized;
  dibujo: string | null;
  ideaDe: string | null;
  estado: 'elegida' | 'hecha';
  recinto: string | null;
}

export interface CommunityStatus {
  /** Día de hoy en España, según el servidor (no el reloj del móvil). */
  hoy: string;
  ideas: number;
  votacion: Poll | null;
  muro: WallEntry[];
}

export const MAX_TITLE = 30;
export const MAX_NAME = 15;
const MAX_WALL = 30;
const ID = /^[a-z0-9-]{1,40}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const DRAWING = /^[a-z0-9-]+\.png$/;

type Loose = Record<string, unknown>;
const isObject = (v: unknown): v is Loose => typeof v === 'object' && v !== null && !Array.isArray(v);
const isId = (v: unknown): v is string => typeof v === 'string' && ID.test(v);
const isDay = (v: unknown): v is string => typeof v === 'string' && DAY.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

function clip(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = Array.from(value.trim()).slice(0, max).join('');
  return text === '' ? null : text;
}

export function drawingName(name: unknown): string | null {
  return typeof name === 'string' && DRAWING.test(name) ? name : null;
}

function readLocalized(value: unknown): Localized | null {
  if (!isObject(value)) return null;
  const es = clip(value.es, MAX_TITLE);
  const en = clip(value.en, MAX_TITLE);
  return es && en ? { es, en } : null;
}

function readOption(value: unknown): PollOption | null {
  if (!isObject(value) || !isId(value.id)) return null;
  const titulo = readLocalized(value.titulo);
  if (!titulo) return null;
  return { id: value.id, titulo, dibujo: drawingName(value.dibujo), ideaDe: clip(value.ideaDe, MAX_NAME) };
}

function readPoll(value: unknown): Poll | null {
  if (!isObject(value) || !isId(value.id) || !isDay(value.abre) || !isDay(value.cierra)) return null;
  if (typeof value.abierta !== 'boolean' || !Array.isArray(value.opciones)) return null;
  const opciones = value.opciones.map(readOption);
  if (opciones.length < 2 || opciones.length > 4 || opciones.some((o) => o === null)) return null;
  const options = opciones as PollOption[];
  const ids = options.map((o) => o.id);
  if (new Set(ids).size !== ids.length) return null;
  const ganadora = isId(value.ganadora) && ids.includes(value.ganadora) ? value.ganadora : null;
  const rawShare = isObject(value.reparto) ? value.reparto : {};
  const reparto: Record<string, number> = {};
  for (const id of ids) {
    const n = rawShare[id];
    reparto[id] = typeof n === 'number' && Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0;
  }
  return { id: value.id, abre: value.abre, cierra: value.cierra, abierta: value.abierta, ganadora, opciones: options, reparto };
}

function readWallEntry(value: unknown): WallEntry | null {
  if (!isObject(value)) return null;
  const titulo = readLocalized(value.titulo);
  if (!titulo || (value.estado !== 'elegida' && value.estado !== 'hecha')) return null;
  return {
    titulo,
    dibujo: drawingName(value.dibujo),
    ideaDe: clip(value.ideaDe, MAX_NAME),
    estado: value.estado,
    recinto: isId(value.recinto) ? value.recinto : null,
  };
}

/** `null`: no es una respuesta del servidor. Una votación rota se queda en «sin votación». */
export function parseStatus(raw: unknown): CommunityStatus | null {
  if (!isObject(raw) || !isDay(raw.hoy) || !Array.isArray(raw.muro)) return null;
  const ideas = raw.ideas;
  if (typeof ideas !== 'number' || !Number.isInteger(ideas) || ideas < 0) return null;
  const muro = raw.muro.slice(0, MAX_WALL).map(readWallEntry).filter((e): e is WallEntry => e !== null);
  return { hoy: raw.hoy, ideas, votacion: readPoll(raw.votacion), muro };
}

// --- Memoria del aparato ---

export const COMMUNITY_KEY = 'zooesponji_v3_community';

/** Lo que recuerda el aparato. Ids, nunca textos escritos por personas (salvo la copia de la última respuesta). */
export interface CommunityMemory {
  /** Votación → opción votada desde este aparato. */
  voted: Record<string, string>;
  /** Última votación de la que saltó el aviso. */
  noticed: string | null;
  /** Última votación cuya ganadora se ha visto en el tablón. */
  winnerSeen: string | null;
  /** Entrada más nueva del muro ya vista (`wallKey`). */
  wallSeen: string | null;
  /** El tendero ya habló del tablón. */
  hinted: boolean;
  /** Última respuesta válida del servidor, para enseñarla sin conexión. */
  last: CommunityStatus | null;
}

export function emptyMemory(): CommunityMemory {
  return { voted: {}, noticed: null, winnerSeen: null, wallSeen: null, hinted: false, last: null };
}

export function parseMemory(raw: string | null): CommunityMemory {
  const memory = emptyMemory();
  if (!raw) return memory;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return memory;
  }
  if (!isObject(value)) return memory;
  if (isObject(value.voted)) {
    for (const [poll, option] of Object.entries(value.voted)) if (isId(poll) && isId(option)) memory.voted[poll] = option;
  }
  memory.noticed = isId(value.noticed) ? value.noticed : null;
  memory.winnerSeen = isId(value.winnerSeen) ? value.winnerSeen : null;
  memory.wallSeen = typeof value.wallSeen === 'string' ? value.wallSeen.slice(0, 200) : null;
  memory.hinted = value.hinted === true;
  memory.last = parseStatus(value.last);
  return memory;
}

// --- Cuentas ---

export type PollPhase = 'none' | 'open' | 'voted' | 'closed';

export function pollPhase(status: CommunityStatus, memory: CommunityMemory): PollPhase {
  const poll = status.votacion;
  if (!poll) return 'none';
  if (!poll.abierta) return 'closed';
  return memory.voted[poll.id] ? 'voted' : 'open';
}

const dayNumber = (day: string): number => Math.round(Date.parse(`${day}T00:00:00Z`) / 86_400_000);

/** Días que quedan para votar contando hoy (el último día, 1). 0 si no hay votación abierta. */
export function daysLeft(status: CommunityStatus): number {
  const poll = status.votacion;
  if (!poll) return 0;
  return Math.max(0, dayNumber(poll.cierra) - dayNumber(status.hoy) + 1);
}

export function jarTier(ideas: number): 0 | 1 | 2 | 3 | 4 {
  if (ideas <= 0) return 0;
  if (ideas < 10) return 1;
  if (ideas < 50) return 2;
  if (ideas < 200) return 3;
  return 4;
}

/** Huella de una entrada del muro: cambia si cambia el título o el estado (elegida → hecha). */
export function wallKey(entry: WallEntry): string {
  return `${entry.titulo.es}|${entry.estado}`;
}

/** ¿Brilla la estrellita? Votación abierta sin votar, ganadora nueva o entrada nueva en el muro. */
export function hasUnseen(status: CommunityStatus, memory: CommunityMemory): boolean {
  const poll = status.votacion;
  if (poll && pollPhase(status, memory) === 'open') return true;
  if (poll && poll.ganadora && memory.winnerSeen !== poll.id) return true;
  const newest = status.muro[0];
  return newest !== undefined && memory.wallSeen !== wallKey(newest);
}

/** El aviso salta una vez por votación, si está abierta y no se ha votado. */
export function shouldNotify(status: CommunityStatus, memory: CommunityMemory): boolean {
  const poll = status.votacion;
  return poll !== null && pollPhase(status, memory) === 'open' && memory.noticed !== poll.id;
}

const PENS: ReadonlySet<string> = new Set(PEN_IDS);

/** Carteles «Idea de …»: ideas hechas, con nombre y con un recinto del juego. Uno por recinto, el más nuevo. */
export function ideaSigns(status: CommunityStatus): { penId: PenId; name: string }[] {
  const signs: { penId: PenId; name: string }[] = [];
  for (const entry of status.muro) {
    if (entry.estado !== 'hecha' || !entry.ideaDe || !entry.recinto || !PENS.has(entry.recinto)) continue;
    if (signs.some((s) => s.penId === entry.recinto)) continue;
    signs.push({ penId: entry.recinto as PenId, name: entry.ideaDe });
  }
  return signs;
}

export function localized(text: Localized, lang: Language): string {
  return text[lang];
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run tests/unit/community.test.ts`
Expected: PASS (todas).

- [ ] **Step 5: Commit**

```bash
git add game/src/core/community.ts game/tests/unit/community.test.ts
git commit -m "feat(juego): lógica pura del tablón de la comunidad"
```

---

### Task 2: Sistema de la comunidad (`systems/community.ts`)

**Files:**
- Create: `game/src/systems/community.ts`
- Modify: `game/src/systems/events.ts` (añadir eventos a `GameEvents`)
- Test: `game/tests/unit/communitySystem.test.ts`

**Interfaces:**
- Consumes: todo lo de la tarea 1; `KeyValueStore` de `game/src/core/save.ts`; `createMemoryStore` de `game/src/systems/storage.ts`; `EventBus`, `GameEvents` de `events.ts`.
- Produces:
  - `type FetchLike = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string; credentials?: 'omit'; cache?: 'no-store'; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>`
  - `interface CommunityDeps { baseUrl: string; fetch: FetchLike; store: KeyValueStore; events: EventBus<GameEvents> }`
  - `class Community` con:
    - `start(): Promise<void>` — lee la memoria y pide el estado (no espera a la red más de lo que tarde `refresh`).
    - `refresh(): Promise<boolean>` — `true` si el servidor respondió bien; emite `community-updated` siempre que termina.
    - `get status(): CommunityStatus | null` — la última respuesta válida (de la red o la guardada).
    - `get online(): boolean` — la última petición fue bien.
    - `get memory(): Readonly<CommunityMemory>`
    - `phase(): PollPhase` (`'none'` sin estado)
    - `vote(optionId: string): Promise<'ok' | 'closed' | 'offline'>`
    - `unseen(): boolean`, `notify(): boolean`
    - `markBoardSeen(): void`, `markNoticed(): void`, `markHinted(): void`
    - `drawingUrl(name: string | null): string | null`
  - `setCommunity(c: Community | null): void`, `getCommunity(): Community | null`
  - Eventos nuevos en `GameEvents`: `'community-updated': Record<string, never>`, `'board-opened': { phase: string }`, `'board-voted': { poll: string; option: string; changed: boolean }`, `'board-qr': Record<string, never>`, `'board-offline': Record<string, never>`, `'poll-notice': { poll: string }`.

- [ ] **Step 1: Añadir los eventos**

En `game/src/systems/events.ts`, dentro de `interface GameEvents`, al final:

```ts
  /** Comunidad: llegó (o falló) la respuesta del servidor; el tablón y los carteles se ponen al día. */
  'community-updated': Record<string, never>;
  /** Se abre el tablón. `phase`: la de la votación al abrir. */
  'board-opened': { phase: string };
  /** Voto aceptado por el servidor. `changed`: era un cambio de voto. */
  'board-voted': { poll: string; option: string; changed: boolean };
  /** Se ha visto la tarjeta con el QR. */
  'board-qr': Record<string, never>;
  /** El tablón se abrió sin conexión. */
  'board-offline': Record<string, never>;
  /** Ha saltado el aviso de votación nueva. */
  'poll-notice': { poll: string };
```

- [ ] **Step 2: Escribir las pruebas que fallan**

`game/tests/unit/communitySystem.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { COMMUNITY_KEY } from '../../src/core/community';
import { Community, type FetchLike } from '../../src/systems/community';
import { EventBus, type GameEvents } from '../../src/systems/events';
import { createMemoryStore } from '../../src/systems/storage';

const STATUS = {
  hoy: '2026-11-03', ideas: 12,
  votacion: {
    id: '2026-11-a', abre: '2026-11-01', cierra: '2026-11-15', ganadora: null, abierta: true,
    opciones: [
      { id: 'delfines', titulo: { es: 'Delfines', en: 'Dolphins' }, dibujo: 'delfines.png' },
      { id: 'koalas', titulo: { es: 'Koalas', en: 'Koalas' }, dibujo: null },
    ],
    reparto: { delfines: 50, koalas: 50 },
  },
  muro: [],
};

interface Call { url: string; method: string; body: unknown }

/** Red falsa: cada ruta responde lo que se le diga; `null` = sin conexión. */
function fakeNet(routes: Record<string, () => { status: number; body: unknown } | null>) {
  const calls: Call[] = [];
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(init.body) : null });
    const path = url.replace('https://api.test', '');
    const answer = routes[path]?.() ?? null;
    if (!answer) throw new TypeError('Failed to fetch');
    return { ok: answer.status >= 200 && answer.status < 300, status: answer.status, json: async () => answer.body };
  };
  return { fetch, calls };
}

function make(routes: Record<string, () => { status: number; body: unknown } | null>, initial: Record<string, string> = {}) {
  const net = fakeNet(routes);
  const store = createMemoryStore(initial);
  const events = new EventBus<GameEvents>();
  const updates: number[] = [];
  events.on('community-updated', () => updates.push(1));
  const community = new Community({ baseUrl: 'https://api.test', fetch: net.fetch, store, events });
  return { community, net, store, events, updates };
}

const ok = (body: unknown = STATUS) => () => ({ status: 200, body });

describe('Community', () => {
  it('pide el estado al arrancar y avisa', async () => {
    const { community, net, updates } = make({ '/estado.php': ok() });
    await community.start();
    expect(net.calls[0]).toMatchObject({ url: 'https://api.test/estado.php', method: 'GET' });
    expect(community.online).toBe(true);
    expect(community.phase()).toBe('open');
    expect(updates).toHaveLength(1);
  });

  it('sin conexión y sin nada guardado: no hay estado y no lanza', async () => {
    const { community, updates } = make({});
    await community.start();
    expect(community.status).toBeNull();
    expect(community.online).toBe(false);
    expect(community.phase()).toBe('none');
    expect(updates).toHaveLength(1);
  });

  it('sin conexión enseña lo último guardado', async () => {
    const saved = JSON.stringify({ last: STATUS });
    const { community } = make({}, { [COMMUNITY_KEY]: saved });
    await community.start();
    expect(community.online).toBe(false);
    expect(community.status?.ideas).toBe(12);
  });

  it('una respuesta mal formada es «sin conexión» y no pisa lo guardado', async () => {
    const { community } = make({ '/estado.php': ok({ hoy: 'nada' }) }, { [COMMUNITY_KEY]: JSON.stringify({ last: STATUS }) });
    await community.start();
    expect(community.online).toBe(false);
    expect(community.status?.ideas).toBe(12);
  });

  it('guarda la última respuesta válida', async () => {
    const { community, store } = make({ '/estado.php': ok() });
    await community.start();
    expect(JSON.parse((await store.get(COMMUNITY_KEY))!).last.ideas).toBe(12);
  });

  it('vota, anota el voto y pone el reparto nuevo', async () => {
    const { community, net, store, events } = make({
      '/estado.php': ok(),
      '/voto.php': ok({ ok: true, reparto: { delfines: 65, koalas: 35 } }),
    });
    const voted: GameEvents['board-voted'][] = [];
    events.on('board-voted', (e) => voted.push(e));
    await community.start();
    expect(await community.vote('delfines')).toBe('ok');
    expect(net.calls[1]).toMatchObject({ method: 'POST', body: { votacion: '2026-11-a', opcion: 'delfines' } });
    expect(community.phase()).toBe('voted');
    expect(community.status?.votacion?.reparto).toEqual({ delfines: 65, koalas: 35 });
    expect(JSON.parse((await store.get(COMMUNITY_KEY))!).voted).toEqual({ '2026-11-a': 'delfines' });
    expect(voted).toEqual([{ poll: '2026-11-a', option: 'delfines', changed: false }]);
  });

  it('cambiar el voto envía la opción anterior', async () => {
    const { community, net } = make({ '/estado.php': ok(), '/voto.php': ok({ ok: true, reparto: {} }) });
    await community.start();
    await community.vote('delfines');
    await community.vote('koalas');
    expect(net.calls[2]?.body).toEqual({ votacion: '2026-11-a', opcion: 'koalas', anterior: 'delfines' });
    expect(community.memory.voted['2026-11-a']).toBe('koalas');
  });

  it('votar lo mismo otra vez no envía nada (no suma dos veces)', async () => {
    const { community, net } = make({ '/estado.php': ok(), '/voto.php': ok({ ok: true, reparto: {} }) });
    await community.start();
    await community.vote('delfines');
    expect(await community.vote('delfines')).toBe('ok');
    expect(net.calls.filter((c) => c.url.endsWith('/voto.php'))).toHaveLength(1);
  });

  it('dos toques seguidos mientras se envía: un solo voto', async () => {
    const { community, net } = make({ '/estado.php': ok(), '/voto.php': ok({ ok: true, reparto: {} }) });
    await community.start();
    await Promise.all([community.vote('delfines'), community.vote('delfines')]);
    expect(net.calls.filter((c) => c.url.endsWith('/voto.php'))).toHaveLength(1);
  });

  it('voto rechazado por cierre: no se anota y se refresca el estado', async () => {
    let closed = false;
    const { community } = make({
      '/estado.php': () => ({ status: 200, body: closed ? { ...STATUS, votacion: { ...STATUS.votacion, abierta: false } } : STATUS }),
      '/voto.php': () => {
        closed = true;
        return { status: 409, body: { error: 'cerrada' } };
      },
    });
    await community.start();
    expect(await community.vote('delfines')).toBe('closed');
    expect(community.memory.voted).toEqual({});
    expect(community.phase()).toBe('closed');
  });

  it('voto sin conexión: no se anota', async () => {
    const { community } = make({ '/estado.php': ok() });
    await community.start();
    expect(await community.vote('delfines')).toBe('offline');
    expect(community.memory.voted).toEqual({});
  });

  it('una opción que no existe no se envía', async () => {
    const { community, net } = make({ '/estado.php': ok(), '/voto.php': ok({ ok: true, reparto: {} }) });
    await community.start();
    expect(await community.vote('jirafas')).toBe('closed');
    expect(net.calls).toHaveLength(1);
  });

  it('marcas de visto: aviso, ganadora, muro y tendero', async () => {
    const { community, store } = make({ '/estado.php': ok() });
    await community.start();
    expect(community.notify()).toBe(true);
    community.markNoticed();
    expect(community.notify()).toBe(false);
    community.markHinted();
    await Promise.resolve();
    const saved = JSON.parse((await store.get(COMMUNITY_KEY))!);
    expect(saved.noticed).toBe('2026-11-a');
    expect(saved.hinted).toBe(true);
  });

  it('el almacén roto no impide nada', async () => {
    const net = fakeNet({ '/estado.php': ok(), '/voto.php': ok({ ok: true, reparto: {} }) });
    const store = { get: async () => { throw new Error('roto'); }, set: async () => { throw new Error('roto'); } };
    const community = new Community({ baseUrl: 'https://api.test', fetch: net.fetch, store, events: new EventBus<GameEvents>() });
    await community.start();
    expect(community.phase()).toBe('open');
    expect(await community.vote('delfines')).toBe('ok');
  });

  it('dirección de los dibujos: solo nombres válidos', () => {
    const { community } = make({});
    expect(community.drawingUrl('delfines.png')).toBe('https://api.test/dibujos/delfines.png');
    expect(community.drawingUrl('../x.png')).toBeNull();
    expect(community.drawingUrl(null)).toBeNull();
  });
});
```

- [ ] **Step 3: Ejecutar y ver que falla**

Run: `npx vitest run tests/unit/communitySystem.test.ts`
Expected: FAIL, «Failed to resolve import "../../src/systems/community"».

- [ ] **Step 4: Implementar**

`game/src/systems/community.ts`:

```ts
import {
  COMMUNITY_KEY, drawingName, emptyMemory, hasUnseen, parseMemory, parseStatus, pollPhase, shouldNotify, wallKey,
  type CommunityMemory, type CommunityStatus, type PollPhase,
} from '../core/community';
import type { KeyValueStore } from '../core/save';
import type { EventBus, GameEvents } from './events';

export type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string; credentials?: 'omit'; cache?: 'no-store'; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export interface CommunityDeps {
  /** Sin barra al final, p. ej. `https://api.zooesponji.com`. */
  baseUrl: string;
  fetch: FetchLike;
  store: KeyValueStore;
  events: EventBus<GameEvents>;
}

/** Más que esto esperando al servidor es «sin conexión». */
const TIMEOUT_MS = 8000;

/**
 * El tablón de la comunidad: pide el estado, recuerda qué se ha votado y visto, y envía el voto.
 * Nunca lanza: todo fallo acaba en «sin conexión». Sin red, el juego sigue igual.
 */
export class Community {
  private last: CommunityStatus | null = null;
  private mem: CommunityMemory = emptyMemory();
  private ok = false;
  private voting: Promise<'ok' | 'closed' | 'offline'> | null = null;

  constructor(private readonly deps: CommunityDeps) {}

  async start(): Promise<void> {
    try {
      this.mem = parseMemory(await this.deps.store.get(COMMUNITY_KEY));
    } catch {
      this.mem = emptyMemory();
    }
    this.last = this.mem.last;
    await this.refresh();
  }

  get status(): CommunityStatus | null {
    return this.last;
  }

  get online(): boolean {
    return this.ok;
  }

  get memory(): Readonly<CommunityMemory> {
    return this.mem;
  }

  phase(): PollPhase {
    return this.last ? pollPhase(this.last, this.mem) : 'none';
  }

  unseen(): boolean {
    return this.last !== null && hasUnseen(this.last, this.mem);
  }

  notify(): boolean {
    return this.last !== null && shouldNotify(this.last, this.mem);
  }

  async refresh(): Promise<boolean> {
    try {
      const status = parseStatus(await this.request('/estado.php'));
      this.ok = status !== null;
      if (status) {
        this.last = status;
        this.mem.last = status;
        this.persist();
      }
    } catch {
      this.ok = false;
    }
    this.emit('community-updated', {});
    return this.ok;
  }

  /** Vota (o cambia el voto). Solo se anota si el servidor responde bien. */
  vote(optionId: string): Promise<'ok' | 'closed' | 'offline'> {
    this.voting ??= this.send(optionId).finally(() => {
      this.voting = null;
    });
    return this.voting;
  }

  markBoardSeen(): void {
    const status = this.last;
    if (!status) return;
    if (status.votacion?.ganadora) this.mem.winnerSeen = status.votacion.id;
    const newest = status.muro[0];
    if (newest) this.mem.wallSeen = wallKey(newest);
    this.persist();
  }

  markNoticed(): void {
    const poll = this.last?.votacion;
    if (!poll) return;
    this.mem.noticed = poll.id;
    this.persist();
  }

  markHinted(): void {
    this.mem.hinted = true;
    this.persist();
  }

  drawingUrl(name: string | null): string | null {
    const file = drawingName(name);
    return file ? `${this.deps.baseUrl}/dibujos/${file}` : null;
  }

  // --- Por dentro ---

  private async send(optionId: string): Promise<'ok' | 'closed' | 'offline'> {
    const poll = this.last?.votacion;
    if (!poll || !poll.abierta || !poll.opciones.some((o) => o.id === optionId)) return 'closed';
    const previous = this.mem.voted[poll.id] ?? null;
    if (previous === optionId) return 'ok';
    const body: Record<string, string> = { votacion: poll.id, opcion: optionId };
    if (previous) body.anterior = previous;
    let answer: { ok: boolean; status: number; json(): Promise<unknown> };
    try {
      answer = await this.fetchWithTimeout('/voto.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      this.ok = false;
      return 'offline';
    }
    if (!answer.ok) {
      // 409: la votación ya está cerrada (o es otra). Se pone al día y no se anota nada.
      if (answer.status === 409 || answer.status === 400) {
        await this.refresh();
        return 'closed';
      }
      return 'offline';
    }
    this.ok = true;
    this.mem.voted[poll.id] = optionId;
    try {
      const data = (await answer.json()) as { reparto?: unknown };
      const share = data && typeof data.reparto === 'object' && data.reparto !== null ? (data.reparto as Record<string, unknown>) : {};
      for (const option of poll.opciones) {
        const n = share[option.id];
        if (typeof n === 'number' && Number.isFinite(n)) poll.reparto[option.id] = Math.min(100, Math.max(0, Math.round(n)));
      }
    } catch {
      // El voto ya cuenta; el reparto se pondrá al día en la siguiente petición.
    }
    this.mem.last = this.last;
    this.persist();
    this.emit('board-voted', { poll: poll.id, option: optionId, changed: previous !== null });
    return 'ok';
  }

  private async request(path: string): Promise<unknown> {
    const answer = await this.fetchWithTimeout(path, { method: 'GET', cache: 'no-store' });
    if (!answer.ok) throw new Error(`HTTP ${answer.status}`);
    return answer.json();
  }

  private async fetchWithTimeout(path: string, init: { method: string; headers?: Record<string, string>; body?: string; cache?: 'no-store' }) {
    const controller = typeof AbortController === 'undefined' ? null : new AbortController();
    const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;
    try {
      return await this.deps.fetch(`${this.deps.baseUrl}${path}`, { ...init, credentials: 'omit', signal: controller?.signal });
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private persist(): void {
    try {
      void this.deps.store.set(COMMUNITY_KEY, JSON.stringify(this.mem)).catch(() => undefined);
    } catch {
      // Sin memoria antes que un error: lo peor es que el aviso vuelva a salir.
    }
  }

  private emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    try {
      this.deps.events.emit(event, payload);
    } catch {
      // Un oyente roto no rompe el tablón.
    }
  }
}

let current: Community | null = null;

export function setCommunity(community: Community | null): void {
  current = community;
}

/** `null` sin configuración o antes de arrancar: no hay tablón. */
export function getCommunity(): Community | null {
  return current;
}
```

- [ ] **Step 5: Ejecutar y ver que pasa**

Run: `npx vitest run tests/unit/communitySystem.test.ts tests/unit/community.test.ts && npm run typecheck`
Expected: PASS y sin errores de tipos.

- [ ] **Step 6: Commit**

```bash
git add game/src/systems/community.ts game/src/systems/events.ts game/tests/unit/communitySystem.test.ts
git commit -m "feat(juego): sistema de la comunidad (estado, voto y memoria del aparato)"
```

---

### Task 3: Montaje, configuración y textos

**Files:**
- Create: `game/src/systems/communityInstall.ts`
- Modify: `game/src/scenes/PreloadScene.ts:84-96`, `game/.env.example`, `game/src/data/strings/es.ts`, `game/src/data/strings/en.ts`
- Test: `game/tests/unit/strings.test.ts` (ya comprueba que es/en tienen las mismas claves; no hace falta tocarlo)

**Interfaces:**
- Consumes: `Community`, `setCommunity` (tarea 2); `createStore` de `createStore.ts`; `bus`.
- Produces:
  - `communityUrl(env: { VITE_COMMUNITY_URL?: string }): string | null` — solo `https://…` (o `http://localhost…`/`http://127.0.0.1…` en desarrollo), sin barra final.
  - `startCommunity(baseUrl: string): Promise<Community>` — monta y arranca (lo usan también las pruebas).
  - `installCommunity(): Promise<void>` — nunca lanza; sin configuración no hace nada.
  - Claves de texto (ver Step 4).

- [ ] **Step 1: Prueba de `communityUrl`**

Añade al final de `game/tests/unit/communitySystem.test.ts`:

```ts
import { communityUrl } from '../../src/systems/communityInstall';

describe('communityUrl', () => {
  it('https sin barra final; nada si falta o no es una dirección segura', () => {
    expect(communityUrl({ VITE_COMMUNITY_URL: 'https://api.zooesponji.com/' })).toBe('https://api.zooesponji.com');
    expect(communityUrl({ VITE_COMMUNITY_URL: ' https://api.zooesponji.com ' })).toBe('https://api.zooesponji.com');
    expect(communityUrl({ VITE_COMMUNITY_URL: 'http://api.zooesponji.com' })).toBeNull();
    expect(communityUrl({ VITE_COMMUNITY_URL: 'http://localhost:8080' })).toBe('http://localhost:8080');
    expect(communityUrl({ VITE_COMMUNITY_URL: '' })).toBeNull();
    expect(communityUrl({})).toBeNull();
  });
});
```

(Mueve el `import` arriba con los demás.) `communityInstall.ts` importa `@capacitor/core` a través de `createStore`: si Vitest se queja al importarlo, pon `communityUrl` en `game/src/core/community.ts` en vez de en `communityInstall.ts` y cambia el import de la prueba; el resto del plan llama a `communityUrl` desde `communityInstall.ts`, que la reexporta.

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run tests/unit/communitySystem.test.ts`
Expected: FAIL, no existe `communityInstall`.

- [ ] **Step 3: Implementar el montaje**

`game/src/systems/communityInstall.ts`:

```ts
import { Community, setCommunity } from './community';
import { createStore } from './createStore';
import { bus } from './events';

/** La dirección del servidor de comunidad. Solo HTTPS (o localhost para probar). */
export function communityUrl(env: { VITE_COMMUNITY_URL?: string }): string | null {
  const url = (env.VITE_COMMUNITY_URL ?? '').trim().replace(/\/+$/, '');
  if (/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(url)) return url;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url)) return url;
  return null;
}

/** Monta el tablón contra un servidor. Las pruebas lo llaman con uno falso. */
export async function startCommunity(baseUrl: string): Promise<Community> {
  const community = new Community({
    baseUrl,
    fetch: (url, init) => fetch(url, init),
    store: createStore(),
    events: bus,
  });
  setCommunity(community);
  await community.start();
  return community;
}

/** Sin `VITE_COMMUNITY_URL` no hay tablón. No espera a la red: el juego arranca igual. Nunca lanza. */
export async function installCommunity(): Promise<void> {
  try {
    const url = communityUrl(import.meta.env as { VITE_COMMUNITY_URL?: string });
    if (!url) return;
    void startCommunity(url).catch(() => setCommunity(null));
  } catch {
    // El tablón nunca impide jugar.
  }
}
```

Nota: `setCommunity` se llama antes de `start()` para que el mapa ya sepa que hay tablón; mientras llega la respuesta, `status` es la guardada (o `null`, y entonces el tablón no se pinta hasta `community-updated`).

En `game/src/scenes/PreloadScene.ts`, importa `installCommunity` y llámalo en `startSession()` justo después de `await installAds(this.game);`:

```ts
    // Después de las estadísticas: los avisos del tablón ya tienen quien los escuche. No espera a la red.
    await installCommunity();
```

En `game/.env.example`, al final:

```
# Tablón de la comunidad (votaciones). Dirección del servidor, sin barra al final: https://api.zooesponji.com
# Si falta, el juego no tiene tablón.
VITE_COMMUNITY_URL=
```

Y añade la misma línea con el valor real a `game/.env.production.local` (no se sube): `VITE_COMMUNITY_URL=https://api.zooesponji.com`.

- [ ] **Step 4: Textos**

En `game/src/data/strings/es.ts`, junto a los de `ad.*`:

```ts
  'board.label': 'Tablón',
  'board.title': '¡Tablón del zoo!',
  'board.pollTitle': '¿Qué traemos al zoo?',
  'board.ideaOf': 'idea de {name}',
  'board.daysLeft': 'quedan {n} días',
  'board.lastDay': '¡último día!',
  'board.change': 'Cambiar',
  'board.winner': '¡Ha ganado!',
  'board.closed': '¡Votación cerrada! Pronto sabremos cuál gana',
  'board.noPoll': 'Pronto habrá votación',
  'board.jar': '¡Ya han llegado {n} ideas!',
  'board.jarOne': '¡Ya ha llegado 1 idea!',
  'board.jarEmpty': '¡Aún no hay ideas! ¿La primera es tuya?',
  'board.wallTitle': 'Ideas de los jugadores',
  'board.chosen': 'Elegida',
  'board.done': '¡Ya en el zoo!',
  'board.ideaCard': '¿Tienes una idea?',
  'board.showAdult': 'Enséñaselo a un mayor',
  'board.terms': 'Condiciones: zooesponji.com/ideas/condiciones',
  'board.version': 'Versión {v}',
  'board.offline': 'Sin internet no se puede votar',
  'board.voteFailed': 'No se ha podido votar. Prueba luego',
  'board.thanks': '¡Gracias por votar!',
  'board.sign': 'Idea de {name}',
  'shop.boardHint': '¡En la plaza hay un tablón! Puedes votar…',
```

En `game/src/data/strings/en.ts`, las mismas claves:

```ts
  'board.label': 'Board',
  'board.title': 'Zoo board!',
  'board.pollTitle': 'What should we bring to the zoo?',
  'board.ideaOf': "{name}'s idea",
  'board.daysLeft': '{n} days left',
  'board.lastDay': 'last day!',
  'board.change': 'Change',
  'board.winner': 'The winner!',
  'board.closed': 'Voting is closed! The winner is coming soon',
  'board.noPoll': 'A vote is coming soon',
  'board.jar': '{n} ideas have arrived!',
  'board.jarOne': '1 idea has arrived!',
  'board.jarEmpty': 'No ideas yet! Will yours be the first?',
  'board.wallTitle': "Players' ideas",
  'board.chosen': 'Chosen',
  'board.done': 'Now in the zoo!',
  'board.ideaCard': 'Got an idea?',
  'board.showAdult': 'Show this to a grown-up',
  'board.terms': 'Terms: zooesponji.com/ideas/en/terms',
  'board.version': 'Version {v}',
  'board.offline': 'You need the internet to vote',
  'board.voteFailed': "Couldn't vote. Try again later",
  'board.thanks': 'Thanks for voting!',
  'board.sign': "{name}'s idea",
  'shop.boardHint': 'There is a board in the square! You can vote…',
```

Antes de dar por buenas las dos direcciones de condiciones, comprueba las de verdad: `curl -sI https://www.zooesponji.com/ideas/condiciones` y `curl -sI https://www.zooesponji.com/ideas/en/terms` (si la inglesa se llama de otra forma, mira `web/` y usa la ruta real; se escribe sin `https://www.`).

- [ ] **Step 5: Ejecutar pruebas y tipos**

Run: `npx vitest run && npm run typecheck`
Expected: PASS (incluida `strings.test.ts`, que compara claves de es y en).

- [ ] **Step 6: Commit**

```bash
git add game/src/systems/communityInstall.ts game/src/scenes/PreloadScene.ts game/.env.example game/src/data/strings/es.ts game/src/data/strings/en.ts game/tests/unit/communitySystem.test.ts
git commit -m "feat(juego): montaje del tablón con VITE_COMMUNITY_URL y sus textos"
```

---

### Task 4: El tablón en el mapa (mapa, `Board.ts`, carteles, tendero)

**Files:**
- Modify: `game/scripts/make-zoo-map.mjs` (después de la tienda, ~línea 101), `game/public/assets/maps/zoo.tmj` (regenerado), `game/src/core/tiledmap.ts`, `game/src/scenes/WorldScene.ts`, `game/src/scenes/ShopScene.ts:197-205`
- Create: `game/src/world/Board.ts`
- Test: `game/tests/unit/board.test.ts`, `game/tests/unit/zoomap.test.ts` (ampliar)

**Interfaces:**
- Consumes: `getCommunity()` (tarea 2), `ideaSigns`, `t('board.label')`, `t('board.sign')`, `t('shop.boardHint')`; `readEnclosures`, `readGates` de `tiledmap.ts`; `depthForY` de `core/depth.ts`.
- Produces:
  - `interface BoardInfo { tile: Point; standTile: Point }` — `tile`: casilla del camino que se pisa para abrirlo; `standTile`: casilla (de césped) donde se dibuja el tablón, justo encima.
  - `readBoard(map: TiledMap): BoardInfo | null` (objeto de tipo `tablon`).
  - `isBoardTile(board: BoardInfo, tile: Point): boolean`
  - `class Board` (en `world/Board.ts`): `constructor(scene, info, enclosures, gates)`, `sync(): void`, `onKeeperTile(tile: Point): boolean` (true solo al llegar), `hit(world: Vec): boolean`, `get visible(): boolean`, `sparkling(): boolean`, `signCount(): number`.
  - En `WorldScene`: `boardTile(): Point | null`, `boardScreenPos(): Vec | null`, `boardSparkling(): boolean`, `ideaSignCount(): number`, `openBoard(): void`.

- [ ] **Step 1: Pruebas que fallan**

`game/tests/unit/board.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isBoardTile, readBoard, type TiledMap } from '../../src/core/tiledmap';

const map = (objects: unknown[]): TiledMap =>
  ({ width: 4, height: 4, tilewidth: 16, tileheight: 16, layers: [{ type: 'objectgroup', name: 'objetos', objects }] }) as unknown as TiledMap;

describe('readBoard', () => {
  it('lee la casilla que se pisa y la de encima, donde está el tablón', () => {
    const info = readBoard(map([{ id: 1, name: 'tablon', type: 'tablon', x: 32, y: 48, width: 16, height: 16, rotation: 0, visible: true }]));
    expect(info).toEqual({ tile: { x: 2, y: 3 }, standTile: { x: 2, y: 2 } });
    expect(isBoardTile(info!, { x: 2, y: 3 })).toBe(true);
    expect(isBoardTile(info!, { x: 2, y: 2 })).toBe(false);
  });

  it('sin objeto, no hay tablón', () => {
    expect(readBoard(map([]))).toBeNull();
  });
});
```

Antes de escribirla, abre `game/tests/unit/tiledmap.test.ts` y copia de ahí cómo se monta un `TiledMap` mínimo y cómo se llama la capa de objetos (la función interna `objectsOf` de `tiledmap.ts` dice qué capa lee); ajusta `map()` para que coincida.

En `game/tests/unit/zoomap.test.ts`, añade (siguiendo cómo ese archivo ya carga `zoo.tmj`):

```ts
it('el tablón está junto a la plaza y su casilla se pisa', () => {
  const board = readBoard(zoo);
  expect(board).not.toBeNull();
  const grid = buildWalkGrid(zoo);
  expect(isWalkable(grid, board!.tile.x, board!.tile.y)).toBe(true);
  expect(isWalkable(grid, board!.standTile.x, board!.standTile.y)).toBe(false);
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run tests/unit/board.test.ts tests/unit/zoomap.test.ts`
Expected: FAIL, `readBoard` no existe.

- [ ] **Step 3: Mapa y lectura**

En `game/scripts/make-zoo-map.mjs`, justo después de las dos líneas de la tienda (`puerta-tienda`):

```js
// Tablón de la comunidad: en la esquina de arriba a la izquierda de la plaza, junto a la fuente. El objeto marca
// la casilla del camino que se pisa para abrirlo; el tablón se dibuja en el césped de encima.
objects.push({ id: nextId++, name: 'tablon', type: 'tablon', x: (20 + OX) * T, y: (13 + OY) * T, width: T, height: T, rotation: 0, visible: true });
```

Regenera: `npm run make:zoo-map`.

En `game/src/core/tiledmap.ts`, después de `readShop`:

```ts
export interface BoardInfo {
  /** Casilla del camino que se pisa para abrir el tablón. */
  tile: Point;
  /** Casilla donde se dibuja el tablón, justo encima. */
  standTile: Point;
}

export function isBoardTile(board: BoardInfo, tile: Point): boolean {
  return tile.x === board.tile.x && tile.y === board.tile.y;
}

export function readBoard(map: TiledMap): BoardInfo | null {
  const object = objectsOf(map).find((o) => objectKind(o) === 'tablon');
  if (!object) return null;
  const tile = { x: Math.floor(object.x / map.tilewidth), y: Math.floor(object.y / map.tileheight) };
  return { tile, standTile: { x: tile.x, y: tile.y - 1 } };
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run tests/unit/board.test.ts tests/unit/zoomap.test.ts`
Expected: PASS. Si la casilla de encima no es césped (no pisable) o choca con el árbol de `pat('tree', 21, 11)`, mueve el objeto a otra esquina libre de la plaza (por ejemplo `x: 27 + OX` no vale: es el camino de la tienda; prueba `(20, 20)` con el tablón debajo y `standTile` en `y + 1`) y ajusta `readBoard` y la prueba a la vez.

- [ ] **Step 5: `world/Board.ts`**

```ts
import * as Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import { ideaSigns } from '../core/community';
import { depthForY } from '../core/depth';
import type { Vec } from '../core/movement';
import type { Point } from '../core/pathfinding';
import { isBoardTile, type BoardInfo, type EnclosureInfo, type GateInfo } from '../core/tiledmap';
import { t } from '../data/strings';
import { getCommunity } from '../systems/community';

const LABEL_STYLE = { fontFamily: 'sans-serif', fontSize: '9px', color: '#ffffff', stroke: '#000000', strokeThickness: 2 };
/** Alrededor del tablón, un toque cuenta como tocarlo (px de mundo). */
const HIT = 14;

/**
 * El tablón de anuncios de la plaza: se abre al pisar la casilla de delante, como la puerta de la tienda.
 * Brilla una estrellita cuando hay algo sin ver. También pone los carteles «Idea de …» junto a los recintos.
 * Sin tablón configurado no se ve nada.
 */
export class Board {
  private readonly group: Phaser.GameObjects.Container;
  private readonly star: Phaser.GameObjects.Text;
  private readonly starTween: Phaser.Tweens.Tween;
  private signs: Phaser.GameObjects.Text[] = [];
  private atBoard = false;
  private readonly center: Vec;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly info: BoardInfo,
    private readonly enclosures: readonly EnclosureInfo[],
    private readonly gates: readonly GateInfo[],
  ) {
    const x = info.standTile.x * TILE_SIZE + TILE_SIZE / 2;
    const base = (info.standTile.y + 1) * TILE_SIZE;
    this.center = { x, y: base - 10 };
    const art = scene.add.graphics();
    // Dos postes y un tablero de madera con dos papeles clavados.
    art.fillStyle(0x6b4423).fillRect(-9, -6, 3, 6).fillRect(6, -6, 3, 6);
    art.fillStyle(0x8b5a2b).fillRoundedRect(-12, -22, 24, 17, 2);
    art.lineStyle(1, 0x4a2c12).strokeRoundedRect(-12, -22, 24, 17, 2);
    art.fillStyle(0xfff6d8).fillRect(-9, -19, 8, 10);
    art.fillStyle(0xd8f0ff).fillRect(1, -18, 8, 9);
    art.fillStyle(0xe03c31).fillCircle(-5, -19, 1).fillCircle(5, -18, 1);
    const label = scene.add.text(0, -30, t('board.label'), LABEL_STYLE).setOrigin(0.5).setResolution(4);
    this.star = scene.add.text(14, -30, '⭐', { fontSize: '10px' }).setOrigin(0.5).setResolution(4);
    this.group = scene.add.container(x, base, [art, label, this.star]).setDepth(depthForY(base));
    this.starTween = scene.tweens.add({ targets: this.star, scale: 1.4, alpha: 0.5, duration: 600, yoyo: true, repeat: -1 });
    this.sync();
  }

  get visible(): boolean {
    return this.group.visible;
  }

  /** Pone al día el tablón, la estrellita y los carteles con lo último del servidor. */
  sync(): void {
    const community = getCommunity();
    const status = community?.status ?? null;
    this.group.setVisible(status !== null);
    const sparkle = community?.unseen() ?? false;
    this.star.setVisible(sparkle);
    if (sparkle) this.starTween.resume();
    else this.starTween.pause();
    for (const sign of this.signs) sign.destroy();
    this.signs = [];
    if (!status) return;
    for (const { penId, name } of ideaSigns(status)) {
      const gate = this.gates.find((g) => g.penId === penId);
      const pen = this.enclosures.find((e) => e.penId === penId);
      if (!gate || !pen) continue;
      // A la derecha de la puerta, por fuera de la valla.
      const gx = (gate.tile.x + 2) * TILE_SIZE + 4;
      const gy = gate.tile.y * TILE_SIZE + TILE_SIZE / 2;
      const sign = this.scene.add
        .text(gx, gy, t('board.sign', { name }), { ...LABEL_STYLE, fontSize: '8px', backgroundColor: '#5a3210cc', padding: { x: 3, y: 1 } })
        .setOrigin(0, 0.5)
        .setResolution(4)
        .setDepth(10000);
      this.signs.push(sign);
    }
  }

  /** `true` solo al llegar a la casilla de delante; no se repite hasta salir de ella. */
  onKeeperTile(tile: Point): boolean {
    if (!this.visible || !isBoardTile(this.info, tile)) {
      this.atBoard = false;
      return false;
    }
    if (this.atBoard) return false;
    this.atBoard = true;
    return true;
  }

  /** ¿El toque ha caído sobre el tablón? */
  hit(world: Vec): boolean {
    return this.visible && Math.abs(world.x - this.center.x) <= HIT && Math.abs(world.y - this.center.y) <= HIT;
  }

  sparkling(): boolean {
    return this.visible && this.star.visible;
  }

  signCount(): number {
    return this.signs.length;
  }
}
```

Comprueba antes los nombres reales de los campos de `GateInfo` y `EnclosureInfo` en `tiledmap.ts:59-80` (aquí se usan `gate.tile` y `penId`); si se llaman de otra forma, ajústalo.

- [ ] **Step 6: Enganchar en `WorldScene`**

En `game/src/scenes/WorldScene.ts`:

1. Imports: `import { readBoard } from '../core/tiledmap'` (añadir a la lista que ya importa de ahí), `import { Board } from '../world/Board';`, `import { getCommunity } from '../systems/community';`.
2. Campo: `private board: Board | null = null;`
3. En `create()`, después de crear `this.shop`:

```ts
    const boardInfo = readBoard(mapData);
    this.board = boardInfo ? new Board(this, boardInfo, readEnclosures(mapData), readGates(mapData)) : null;
```

4. Junto a los otros `bus.on` de `create()`:

```ts
    const offCommunity = bus.on('community-updated', () => this.board?.sync());
```

y `offCommunity();` en el `SHUTDOWN`.

5. En `update()`, después del bloque de la puerta de la tienda:

```ts
    if (this.board?.onKeeperTile(tile)) this.openBoard();
```

6. En `onPointerUp`, justo antes de `this.cancelFeedTarget();` (después del `if (hit) {…}`):

```ts
    if (this.board?.hit(world)) {
      this.cancelFeedTarget();
      const at = this.board.info.tile;
      this.goToTile(at.x, at.y);
      return;
    }
```

7. Métodos nuevos:

```ts
  /** Abre el tablón: el mundo queda en pausa debajo. */
  openBoard(): void {
    if (!getCommunity() || this.scene.isActive('Board')) return;
    this.stopWalking();
    sfx.play('tap');
    this.scene.pause();
    this.scene.launch('Board');
  }

  boardTile(): Point | null {
    return this.board?.visible ? this.board.info.tile : null;
  }

  boardScreenPos(): Vec | null {
    return this.board?.visible ? this.tileToScreen(this.board.info.standTile) : null;
  }

  boardSparkling(): boolean {
    return this.board?.sparkling() ?? false;
  }

  ideaSignCount(): number {
    return this.board?.signCount() ?? 0;
  }
```

8. En `onResume`, `this.board?.sync();` al final (lo visto en el tablón apaga la estrellita).

- [ ] **Step 7: El tendero lo menciona una vez**

En `game/src/scenes/ShopScene.ts`, el bloque de la pista del libro (líneas ~197-205) pasa a ser:

```ts
    // La primera vez, el tendero cuenta el secreto del libro (después del saludo). Otra visita, el tablón.
    const community = getCommunity();
    const hint = !getSession().book.hinted
      ? { text: t('shop.bookHint'), mark: () => void getSession().markBookHinted() }
      : community?.status && !community.memory.hinted
        ? { text: t('shop.boardHint'), mark: () => community.markHinted() }
        : null;
    if (hint) {
      this.time.delayedCall(2900, () => {
        // Si ya está hablando de un animal, no le pisa: lo contará otra vez que entre.
        if (this.closing || this.activeId || this.busy) return;
        this.shopkeeper.say(hint.text, 3200);
        hint.mark();
      });
    }
```

con `import { getCommunity } from '../systems/community';`.

- [ ] **Step 8: Comprobar a ojo**

Run: `npm run typecheck && npx vitest run`
Expected: PASS.

Luego, con el juego en marcha (`preview_start` del servidor de desarrollo) y la API de pruebas de la tarea 7 aún sin hacer, en la consola: `await (await import('/src/systems/communityInstall.ts')).startCommunity('https://api.zooesponji.com')` y ve andando a la plaza. Captura de pantalla: el tablón se ve en el césped junto a la fuente, no lo tapa el árbol ni la farola, y pisando la casilla de delante se intenta abrir (fallará hasta la tarea 5 porque la escena `Board` no existe: es lo esperado; quita la línea del `launch` si molesta y vuelve a ponerla).

- [ ] **Step 9: Commit**

```bash
git add game/scripts/make-zoo-map.mjs game/public/assets/maps/zoo.tmj game/src/core/tiledmap.ts game/src/world/Board.ts game/src/scenes/WorldScene.ts game/src/scenes/ShopScene.ts game/tests/unit/board.test.ts game/tests/unit/zoomap.test.ts
git commit -m "feat(juego): tablón en la plaza, carteles de idea hecha y pista del tendero"
```

---

### Task 5: Pantalla del tablón (`BoardScene.ts`)

**Files:**
- Create: `game/src/scenes/BoardScene.ts`
- Modify: `game/src/main.ts` (lista de escenas), `game/src/core/hud.ts`, `game/src/systems/platform.ts:80-110`, `game/src/scenes/SettingsScene.ts:27`, `game/src/scenes/PreloadScene.ts` (cargar el QR)
- Test: `game/tests/unit/hud.test.ts`, `game/tests/unit/back.test.ts` (ampliar si cubren las listas)

**Interfaces:**
- Consumes: `getCommunity()`, `Community.phase/vote/markBoardSeen/drawingUrl/status/online/memory`; `daysLeft`, `jarTier`, `localized`; `getLanguage()`; `APP_VERSION`; widgets de `src/ui/widgets.ts` (`addVeil`, `addPanel`, `addRibbonTitle`, `addPillButton`, `addCloseBadge`, `addTile`, `restartOnResize`); `addUiText`; `textStyle`, `UI`.
- Produces:
  - `interface BoardSceneData { picked?: string | null; zone?: 'poll' | 'wall' | 'idea' }`
  - `class BoardScene` (clave `'Board'`) con API de pruebas: `zone(): 'poll' | 'wall' | 'idea'`, `zonePos(z): Vec | null`, `optionPos(id: string): Vec | null`, `confirmPos(): Vec | null`, `changePos(): Vec | null`, `pollView(): 'cards' | 'bars' | 'winner' | 'closed' | 'none' | 'offline'`, `picked(): string | null`, `jarText(): string | null`, `close(): void`.

Diseño (spec 5): una pantalla con el cartel arriba y **tres pestañas grandes con dibujo** abajo del cartel (🗳️ votación, 🫙 tarro y muro, 💡 «¿Tienes una idea?»). Se abre por la votación. Se elige así, en vez de meter las tres zonas a la vez, porque en un móvil apaisado no caben con tarjetas grandes.

- Zona **votación**, según `pollView()`:
  - `cards` (fase `open`, o `voted` tras tocar «Cambiar»): de 2 a 4 tarjetas en fila (`addTile`), cada una con dibujo (imagen del servidor o 🖼️ de reserva), título (`localized`) y «idea de Lucía» si hay `ideaDe`. Tocar marca (borde amarillo y un poco más grande). Botón verde redondo con icono `play`… no: con ✓ (texto «✓» en `label`, ya que no hay icono de ✓) que solo se ve con una marcada. Al tocarlo: `await community.vote(id)` → `ok`: sonido `coin`, aviso `board.thanks`, pasa a `bars`; `closed`: se vuelve a montar (verá `closed`/`winner`); `offline`: aviso `board.voteFailed` y sigue en `cards`.
  - `bars` (fase `voted`): una barra por opción con su dibujo pequeño, anchura proporcional a `reparto[id]` (mínimo 4 px para que se vea), la votada con borde y un ✓; debajo «⏳ quedan N días» (`board.daysLeft`, o `board.lastDay` si queda 1) y botón azul «Cambiar».
  - `winner` (fase `closed` con `ganadora`): la ganadora en grande con `board.winner`, y confeti (partículas sencillas: 30 rectángulos de colores con `tweens` cayendo; sin `ParticleEmitter` si complica). Al mostrarla, `markBoardSeen()`.
  - `closed` (fase `closed` sin ganadora): barras sin «Cambiar» y el texto `board.closed`.
  - `none`: dibujo 🗳️ grande y `board.noPoll`.
  - `offline` (sin `status`): 📡 grande y `board.offline`. Con `status` guardado pero `online === false`, se enseña lo guardado y además una tira arriba con 📡 `board.offline`; las tarjetas no dejan votar (el botón ✓ no aparece).
- Zona **tarro y muro**: a la izquierda el tarro (🫙 grande) con bombillas 💡 dibujadas dentro según `jarTier` (0, 1, 3, 6 o 10 bombillas) y el texto `board.jar`/`jarOne`/`jarEmpty` con el número real. A la derecha `board.wallTitle` y hasta 4 entradas del muro: dibujo, título, nombre y sello (`board.chosen` en azul o `board.done` en verde). Al abrir esta zona, `markBoardSeen()`.
- Zona **idea**: la imagen del QR (`qr-ideas` o `qr-ideas-en` según `getLanguage()`), cuadrada y grande (lo más que quepa, mínimo 160 px para que el móvil del adulto la lea), `board.ideaCard`, `board.showAdult`, `board.version` con `APP_VERSION` y `board.terms` en pequeño. Al abrirla, `bus.emit('board-qr', {})`.

- [ ] **Step 1: Cargar el QR**

En `PreloadScene.preload()`, después de `this.load.image('logo', …)`:

```ts
    this.load.image('qr-ideas', withVersion('assets/ui/qr-ideas.png'));
    this.load.image('qr-ideas-en', withVersion('assets/ui/qr-ideas-en.png'));
```

Y en `create()`, junto a `smoothIcons(this)`: el QR debe verse nítido, sin suavizado al escalar. Como el juego va con `pixelArt: true`, el filtro por defecto ya es «más cercano»: no hagas nada más, solo comprueba en el paso 6 que se ve nítido.

- [ ] **Step 2: Escribir `BoardScene.ts`**

```ts
import * as Phaser from 'phaser';
import { daysLeft, jarTier, localized, type PollOption } from '../core/community';
import type { Vec } from '../core/movement';
import { APP_VERSION } from '../core/version';
import { t } from '../data/strings';
import { sfx } from '../systems/audio';
import { getCommunity } from '../systems/community';
import { bus } from '../systems/events';
import { getLanguage } from '../systems/language';
import { addUiText } from '../ui/text';
import { UI, textStyle } from '../ui/theme';
import { addCloseBadge, addPanel, addPillButton, addRibbonTitle, addTile, addVeil, restartOnResize } from '../ui/widgets';

export type BoardZone = 'poll' | 'wall' | 'idea';
export type PollView = 'cards' | 'bars' | 'winner' | 'closed' | 'none' | 'offline';

export interface BoardSceneData {
  /** Opción marcada sin confirmar (se conserva al girar el móvil o cambiar de idioma). */
  picked?: string | null;
  zone?: BoardZone;
  /** Se tocó «Cambiar»: se vuelven a ver las tarjetas. */
  changing?: boolean;
}

const JAR_BULBS = [0, 1, 3, 6, 10] as const;
const MAX_WALL_SHOWN = 4;

/** El tablón: votación con dibujos, tarro de ideas, muro y tarjeta del QR. No depende de leer. */
export class BoardScene extends Phaser.Scene {
  private zoneKey: BoardZone = 'poll';
  private pickedId: string | null = null;
  private changing = false;
  private busy = false;
  private view: PollView = 'none';
  private tabs = new Map<BoardZone, Phaser.GameObjects.Container>();
  private cards = new Map<string, Phaser.GameObjects.Container>();
  private confirm: Phaser.GameObjects.Container | null = null;
  private change: Phaser.GameObjects.Container | null = null;
  private jar: Phaser.GameObjects.Text | null = null;
  private body!: Phaser.Geom.Rectangle;
  private opened = false;

  constructor() {
    super('Board');
  }

  init(data: BoardSceneData = {}): void {
    this.opened = data.zone === undefined && data.picked === undefined && data.changing === undefined;
    this.zoneKey = data.zone ?? 'poll';
    this.pickedId = data.picked ?? null;
    this.changing = data.changing ?? false;
    this.busy = false;
    this.tabs = new Map();
    this.cards = new Map();
    this.confirm = null;
    this.change = null;
    this.jar = null;
  }

  create(): void {
    const community = getCommunity();
    if (!community) {
      this.finish();
      return;
    }
    sfx.setPaused('menu', true);
    const { width, height } = this.scale;
    addVeil(this);
    const panelW = Math.min(width * 0.9, 980);
    const panelH = height * 0.86;
    const panelY = height * 0.54;
    addPanel(this, width / 2, panelY, panelW, panelH);
    const panel = new Phaser.Geom.Rectangle(width / 2 - panelW / 2, panelY - panelH / 2, panelW, panelH);
    addRibbonTitle(this, width / 2, panel.y, panelW * 0.6, Phaser.Math.Clamp(height * 0.13, 40, 76), t('board.title'));
    const badge = Phaser.Math.Clamp(height * 0.13, 44, 64);
    addCloseBadge(this, panel.right - badge * 0.35, panel.y + badge * 0.35, () => this.close(), badge);

    // Pestañas con dibujo, sin texto.
    const tabH = Phaser.Math.Clamp(height * 0.12, 44, 72);
    const tabY = panel.y + tabH * 1.05;
    const zones: [BoardZone, string][] = [['poll', '🗳️'], ['wall', '🫙'], ['idea', '💡']];
    zones.forEach(([zone, emoji], i) => {
      const x = width / 2 + (i - 1) * tabH * 1.6;
      const tab = addPillButton(this, x, tabY, tabH * 1.4, tabH, { color: zone === this.zoneKey ? 'yellow' : 'sand', label: emoji, onTap: () => this.goZone(zone) });
      this.tabs.set(zone, tab);
    });
    this.body = new Phaser.Geom.Rectangle(panel.x + panelW * 0.05, tabY + tabH * 0.75, panelW * 0.9, panel.bottom - (tabY + tabH * 0.75) - panelH * 0.05);

    if (this.zoneKey === 'poll') this.drawPoll();
    else if (this.zoneKey === 'wall') this.drawWall();
    else this.drawIdea();

    if (this.opened) {
      bus.emit('board-opened', { phase: community.phase() });
      if (!community.online) bus.emit('board-offline', {});
      // Al abrir se pide lo último; si cambia algo, se vuelve a montar.
      void community.refresh().then((ok) => {
        if (ok && this.scene.isActive() && !this.busy) this.restart();
      });
      this.opened = false;
    }
    const keyboard = this.input.keyboard;
    keyboard?.on('keydown-ESC', this.close, this);
    restartOnResize(this, () => this.data());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => keyboard?.off('keydown-ESC', this.close, this));
  }

  // --- Zonas ---

  private drawPoll(): void {
    const community = getCommunity()!;
    const status = community.status;
    const b = this.body;
    if (!status) {
      this.view = 'offline';
      this.bigMessage('📡', t('board.offline'));
      return;
    }
    if (!community.online) this.strip('📡 ' + t('board.offline'));
    const poll = status.votacion;
    const phase = community.phase();
    if (!poll || phase === 'none') {
      this.view = 'none';
      this.bigMessage('🗳️', t('board.noPoll'));
      return;
    }
    const lang = getLanguage();
    if (phase === 'closed' && poll.ganadora) {
      this.view = 'winner';
      const win = poll.opciones.find((o) => o.id === poll.ganadora)!;
      const size = Math.min(b.width * 0.4, b.height * 0.62);
      this.option(win, b.centerX, b.y + size / 2 + 8, size, false);
      addUiText(this, b.centerX, b.y + size + 30, t('board.winner'), textStyle(Math.round(size * 0.14), '#ffffff', UI.outline)).setOrigin(0.5);
      this.confetti();
      community.markBoardSeen();
      return;
    }
    if (phase === 'open' || (phase === 'voted' && this.changing)) {
      this.view = 'cards';
      const n = poll.opciones.length;
      const gap = b.width * 0.03;
      const size = Math.min((b.width - gap * (n - 1)) / n, b.height * 0.72);
      const startX = b.centerX - ((size + gap) * n - gap) / 2 + size / 2;
      poll.opciones.forEach((option, i) => {
        const card = this.option(option, startX + i * (size + gap), b.y + size / 2, size, true);
        this.cards.set(option.id, card);
      });
      this.markPicked();
      const button = Phaser.Math.Clamp(b.height * 0.18, 52, 84);
      if (community.online) {
        this.confirm = addPillButton(this, b.centerX, b.bottom - button / 2, button * 1.6, button, { color: 'green', label: '✓', onTap: () => void this.confirmVote() });
        this.confirm.setVisible(this.pickedId !== null);
      }
      return;
    }
    // Votada, o cerrada sin ganadora: barras sin números.
    this.view = phase === 'voted' ? 'bars' : 'closed';
    const mine = community.memory.voted[poll.id] ?? null;
    const rowH = Math.min((b.height * 0.7) / poll.opciones.length, 70);
    const barX = b.x + rowH * 1.2 + b.width * 0.22;
    const barW = b.right - barX - b.width * 0.04;
    poll.opciones.forEach((option, i) => {
      const y = b.y + rowH * (i + 0.5);
      this.drawing(option.dibujo, b.x + rowH * 0.6, y, rowH * 0.9);
      addUiText(this, b.x + rowH * 1.2, y, localized(option.titulo, lang), textStyle(Math.round(rowH * 0.3), UI.brown, UI.cream)).setOrigin(0, 0.5);
      const share = poll.reparto[option.id] ?? 0;
      const bar = this.add.graphics();
      bar.fillStyle(0xffffff, 0.35).fillRoundedRect(barX, y - rowH * 0.25, barW, rowH * 0.5, 8);
      bar.fillStyle(option.id === mine ? 0x4caf50 : 0xffb300, 1).fillRoundedRect(barX, y - rowH * 0.25, Math.max(8, (barW * share) / 100), rowH * 0.5, 8);
      if (option.id === mine) addUiText(this, barX + barW + 6, y, '✓', textStyle(Math.round(rowH * 0.4), '#4caf50', '#ffffff')).setOrigin(0, 0.5);
    });
    const footY = b.bottom - Math.min(b.height * 0.12, 40);
    if (phase === 'voted') {
      const left = daysLeft(status);
      addUiText(this, b.x + b.width * 0.25, footY, `⏳ ${left <= 1 ? t('board.lastDay') : t('board.daysLeft', { n: left })}`, textStyle(22, UI.brown, UI.cream)).setOrigin(0.5);
      if (community.online) {
        this.change = addPillButton(this, b.x + b.width * 0.75, footY, 180, 56, { color: 'blue', label: t('board.change'), onTap: () => this.startChange() });
      }
    } else {
      addUiText(this, b.centerX, footY, t('board.closed'), textStyle(20, UI.brown, UI.cream)).setOrigin(0.5);
    }
  }

  private drawWall(): void {
    const community = getCommunity()!;
    const status = community.status;
    const b = this.body;
    if (!status) {
      this.bigMessage('📡', t('board.offline'));
      return;
    }
    community.markBoardSeen();
    // Tarro con bombillas, el número de verdad debajo.
    const jarSize = Math.min(b.width * 0.3, b.height * 0.6);
    const jx = b.x + b.width * 0.18;
    const jy = b.y + jarSize / 2 + 6;
    addUiText(this, jx, jy, '🫙', { fontSize: `${Math.round(jarSize)}px` }).setOrigin(0.5);
    const bulbs = JAR_BULBS[jarTier(status.ideas)];
    for (let i = 0; i < bulbs; i++) {
      const bx = jx + ((i % 3) - 1) * jarSize * 0.2;
      const by = jy + jarSize * 0.28 - Math.floor(i / 3) * jarSize * 0.16;
      addUiText(this, bx, by, '💡', { fontSize: `${Math.round(jarSize * 0.16)}px` }).setOrigin(0.5);
    }
    const jarLine = status.ideas === 0 ? t('board.jarEmpty') : status.ideas === 1 ? t('board.jarOne') : t('board.jar', { n: status.ideas });
    this.jar = addUiText(this, jx, jy + jarSize / 2 + 18, jarLine, { ...textStyle(18, UI.brown, UI.cream), wordWrap: { width: b.width * 0.34 }, align: 'center' }).setOrigin(0.5, 0);
    // Muro.
    const wx = b.x + b.width * 0.4;
    addUiText(this, wx, b.y + 4, t('board.wallTitle'), textStyle(22, UI.brown, UI.cream)).setOrigin(0, 0);
    const lang = getLanguage();
    const rowH = Math.min((b.height - 40) / MAX_WALL_SHOWN, 72);
    status.muro.slice(0, MAX_WALL_SHOWN).forEach((entry, i) => {
      const y = b.y + 40 + rowH * (i + 0.5);
      this.drawing(entry.dibujo, wx + rowH * 0.45, y, rowH * 0.85);
      const name = entry.ideaDe ? ` · ${t('board.ideaOf', { name: entry.ideaDe })}` : '';
      addUiText(this, wx + rowH, y, `${localized(entry.titulo, lang)}${name}`, textStyle(Math.round(rowH * 0.26), UI.brown, UI.cream)).setOrigin(0, 0.5);
      const stamp = entry.estado === 'hecha' ? t('board.done') : t('board.chosen');
      addUiText(this, b.right - 4, y, stamp, textStyle(Math.round(rowH * 0.24), entry.estado === 'hecha' ? '#2e7d32' : '#1565c0', '#ffffff')).setOrigin(1, 0.5);
    });
  }

  private drawIdea(): void {
    const b = this.body;
    bus.emit('board-qr', {});
    const size = Math.max(160, Math.min(b.height * 0.92, b.width * 0.45));
    const qr = this.add.image(b.x + b.width * 0.28, b.centerY, getLanguage() === 'en' ? 'qr-ideas-en' : 'qr-ideas');
    qr.setDisplaySize(size, size);
    const tx = b.x + b.width * 0.56;
    addUiText(this, tx, b.y + b.height * 0.18, t('board.ideaCard'), textStyle(30, UI.brown, UI.cream)).setOrigin(0, 0.5);
    addUiText(this, tx, b.y + b.height * 0.38, `👉 ${t('board.showAdult')}`, textStyle(24, UI.brown, UI.cream)).setOrigin(0, 0.5);
    addUiText(this, tx, b.y + b.height * 0.7, t('board.version', { v: APP_VERSION || '—' }), textStyle(16, UI.brown, UI.cream)).setOrigin(0, 0.5);
    addUiText(this, tx, b.y + b.height * 0.82, t('board.terms'), textStyle(14, UI.brown, UI.cream)).setOrigin(0, 0.5);
  }

  // --- Piezas ---

  private option(option: PollOption, x: number, y: number, size: number, tappable: boolean): Phaser.GameObjects.Container {
    const card = addTile(this, x, y, size, size, tappable ? () => this.pick(option.id) : undefined);
    const lang = getLanguage();
    card.add(this.drawing(option.dibujo, 0, -size * 0.1, size * 0.62));
    card.add(addUiText(this, 0, size * 0.3, localized(option.titulo, lang), textStyle(Math.round(size * 0.11), UI.brown, UI.cream)).setOrigin(0.5));
    if (option.ideaDe) card.add(addUiText(this, 0, size * 0.42, t('board.ideaOf', { name: option.ideaDe }), textStyle(Math.round(size * 0.075), UI.brown, UI.cream)).setOrigin(0.5));
    return card;
  }

  /** Dibujo del servidor; mientras carga, o si falla, el de reserva. */
  private drawing(name: string | null, x: number, y: number, size: number): Phaser.GameObjects.Container {
    const holder = this.add.container(x, y);
    const fallback = addUiText(this, 0, 0, '🖼️', { fontSize: `${Math.round(size * 0.7)}px` }).setOrigin(0.5);
    holder.add(fallback);
    const url = getCommunity()?.drawingUrl(name) ?? null;
    if (!url) return holder;
    const key = `dibujo:${name}`;
    const show = (): void => {
      if (!holder.active || !this.textures.exists(key)) return;
      fallback.setVisible(false);
      holder.add(this.add.image(0, 0, key).setDisplaySize(size, size));
    };
    if (this.textures.exists(key)) {
      show();
      return holder;
    }
    this.load.setCORS('anonymous');
    this.load.image(key, url);
    this.load.once(`filecomplete-image-${key}`, show);
    this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => undefined);
    if (!this.load.isLoading()) this.load.start();
    return holder;
  }

  private bigMessage(emoji: string, text: string): void {
    const b = this.body;
    addUiText(this, b.centerX, b.centerY - b.height * 0.12, emoji, { fontSize: `${Math.round(b.height * 0.4)}px` }).setOrigin(0.5);
    addUiText(this, b.centerX, b.centerY + b.height * 0.25, text, textStyle(26, UI.brown, UI.cream)).setOrigin(0.5);
  }

  private strip(text: string): void {
    const b = this.body;
    addUiText(this, b.centerX, b.y - 6, text, textStyle(16, '#ffffff', UI.outline)).setOrigin(0.5, 1).setDepth(5);
  }

  private confetti(): void {
    const { width, height } = this.scale;
    const colors = [0xffd23c, 0xe03c31, 0x4caf50, 0x2196f3, 0xff80ab];
    for (let i = 0; i < 30; i++) {
      const piece = this.add.rectangle(Phaser.Math.Between(0, width), -20, 8, 14, colors[i % colors.length]).setDepth(50);
      this.tweens.add({ targets: piece, y: height + 20, angle: Phaser.Math.Between(180, 720), duration: Phaser.Math.Between(1600, 2800), delay: Phaser.Math.Between(0, 600) });
    }
  }

  // --- Acciones ---

  private pick(id: string): void {
    if (this.busy) return;
    sfx.play('tap');
    this.pickedId = id;
    this.markPicked();
    this.confirm?.setVisible(true);
  }

  private markPicked(): void {
    for (const [id, card] of this.cards) card.setScale(id === this.pickedId ? 1.06 : 1).setAlpha(this.pickedId && id !== this.pickedId ? 0.75 : 1);
  }

  private async confirmVote(): Promise<void> {
    const community = getCommunity();
    if (!community || !this.pickedId || this.busy) return;
    this.busy = true;
    sfx.play('tap');
    const result = await community.vote(this.pickedId);
    this.busy = false;
    if (!this.scene.isActive()) return;
    if (result === 'ok') {
      sfx.play('coin');
      bus.emit('toast', { text: t('board.thanks') });
      this.pickedId = null;
      this.changing = false;
    } else if (result === 'offline') {
      bus.emit('toast', { text: t('board.voteFailed') });
      return;
    }
    this.restart();
  }

  private startChange(): void {
    sfx.play('tap');
    const poll = getCommunity()?.status?.votacion;
    this.changing = true;
    this.pickedId = poll ? (getCommunity()?.memory.voted[poll.id] ?? null) : null;
    this.restart();
  }

  private goZone(zone: BoardZone): void {
    if (zone === this.zoneKey || this.busy) return;
    sfx.play('tap');
    this.zoneKey = zone;
    this.restart();
  }

  private data(): BoardSceneData {
    return { zone: this.zoneKey, picked: this.pickedId, changing: this.changing };
  }

  private restart(): void {
    this.scene.restart(this.data());
  }

  close(): void {
    if (!this.scene.isActive()) return;
    sfx.play('tap');
    this.finish();
  }

  private finish(): void {
    this.scene.stop();
    sfx.setPaused('menu', false);
    if (this.scene.isPaused('World')) this.scene.resume('World', { from: 'board' });
  }

  // --- API para pruebas ---

  zone(): BoardZone {
    return this.zoneKey;
  }

  zonePos(zone: BoardZone): Vec | null {
    const tab = this.tabs.get(zone);
    return tab ? { x: tab.x, y: tab.y } : null;
  }

  optionPos(id: string): Vec | null {
    const card = this.cards.get(id);
    return card ? { x: card.x, y: card.y } : null;
  }

  confirmPos(): Vec | null {
    return this.confirm?.visible ? { x: this.confirm.x, y: this.confirm.y } : null;
  }

  changePos(): Vec | null {
    return this.change ? { x: this.change.x, y: this.change.y } : null;
  }

  pollView(): PollView {
    return this.view;
  }

  picked(): string | null {
    return this.pickedId;
  }

  jarText(): string | null {
    return this.jar?.text ?? null;
  }
}
```

Antes de dar por buena la escena, comprueba en `src/ui/widgets.ts` y `src/ui/theme.ts`: (a) los colores que admite `PillColor` (aquí se usan `green`, `blue`, `yellow`, `sand`; cambia a los que existan); (b) que `addTile` devuelve un `Container` al que se le puede hacer `.add()`; (c) cómo funciona `restartOnResize` (si ya reinicia con `data()`, no llames a `scene.restart` por tu cuenta en el cambio de tamaño); (d) qué hace `addUiText` con emojis (si los pinta con la fuente Baloo y salen cuadrados en Android, usa `this.add.text` con `fontFamily: 'sans-serif'` para los emojis). Corrige en la escena lo que no cuadre; los nombres de la API de pruebas no cambian.

- [ ] **Step 3: Registrar la escena y que cuente como ventana**

- `game/src/main.ts`: importa `BoardScene` y ponlo en la lista justo después de `BookScene` (debajo de `HudScene`, para que la barra de monedas quede encima igual que con el libro; si con el tablón tapa demasiado, ponlo después de `HudScene`).
- `game/src/core/hud.ts`: `const OVERLAYS = ['Shop', 'Book', 'Board', 'Feed', 'Settings', 'Quit'] as const;`
- `game/src/scenes/SettingsScene.ts:27`: `const OVERLAYS = ['Book', 'Board', 'Shop', 'Feed'] as const;` (al cambiar de idioma se vuelve a montar con los textos nuevos; mira cómo usa la lista y comprueba que reinicia la escena con sus datos).
- `game/src/systems/platform.ts`: en `backAction()`, `overlayOpen: this.active('Feed') || this.active('Shop') || this.active('Board')`; en `back()`, caso `close-overlay`, añade `if (this.active('Board')) scene<BoardScene>('Board').close();` con su `import type`.
- Si `tests/unit/hud.test.ts` o `back.test.ts` enumeran las ventanas, añade un caso con `'Board'`.

- [ ] **Step 4: Ejecutar pruebas y tipos**

Run: `npm run typecheck && npx vitest run`
Expected: PASS.

- [ ] **Step 5: Probar a mano en el navegador**

Con el servidor de desarrollo abierto (`preview_start`), en la consola del juego monta un servidor falso con la API de la tarea 7 (si aún no está, usa `startCommunity` contra `https://api.zooesponji.com`, que hoy responde «sin votación» y sirve para ver `none`, el tarro con 1 idea y el QR). Recorre las tres pestañas, gira a vertical y vuelve (`resize_window`), cambia el idioma en Ajustes con el tablón abierto. Captura de cada zona. Comprueba: el QR se ve nítido y grande; nada se sale del panel a 1280×720 ni a 812×375 (móvil apaisado).

- [ ] **Step 6: Commit**

```bash
git add game/src/scenes/BoardScene.ts game/src/main.ts game/src/core/hud.ts game/src/scenes/SettingsScene.ts game/src/systems/platform.ts game/src/scenes/PreloadScene.ts game/tests/unit
git commit -m "feat(juego): pantalla del tablón (votación, tarro, muro y QR)"
```

---

### Task 6: Aviso de votación nueva (`PollNoticeScene.ts`)

**Files:**
- Create: `game/src/scenes/PollNoticeScene.ts`
- Modify: `game/src/main.ts`, `game/src/scenes/WorldScene.ts`, `game/src/systems/platform.ts`, `game/src/core/back.ts` (si hace falta un campo)

**Interfaces:**
- Consumes: `getCommunity().notify()/markNoticed()/status`; `getAds()?.panelOpen`; `WorldScene.openBoard()`.
- Produces: `class PollNoticeScene` (clave `'PollNotice'`) con `yesPos(): Vec | null`, `noPos(): Vec | null`, `decline(): void`. En `WorldScene`: `private maybeNotice(): void`.

Reglas (spec 6): salta una vez por votación al llegar al mapa (al montarse `World` y al volver a él). Si hay otro panel abierto (`AdOffer` activo, o `getAds()?.panelOpen`), o el mundo no está activo, espera a la siguiente vuelta. Al volver de la tienda o de comer, el anuncio tiene preferencia: el aviso se mira **después** de `AD_OFFER_MS` y solo si no ha saltado el anuncio.

- [ ] **Step 1: Escribir la escena**

```ts
import * as Phaser from 'phaser';
import type { Vec } from '../core/movement';
import { sfx } from '../systems/audio';
import { getCommunity } from '../systems/community';
import { bus } from '../systems/events';
import { addUiText } from '../ui/text';
import { addCloseBadge, addPanel, addPillButton, addVeil } from '../ui/widgets';
import type { WorldScene } from './WorldScene';

/** Panel grande de «¡hay votación!»: una urna, un botón verde que lleva al tablón y una X. Sin leer. */
export class PollNoticeScene extends Phaser.Scene {
  private yes: Phaser.GameObjects.Container | null = null;
  private no: Phaser.GameObjects.Container | null = null;
  private done = false;

  constructor() {
    super('PollNotice');
  }

  init(): void {
    this.yes = null;
    this.no = null;
    this.done = false;
  }

  create(): void {
    const community = getCommunity();
    const poll = community?.status?.votacion;
    if (!community || !poll) {
      this.finish(false);
      return;
    }
    const { width, height } = this.scale;
    addVeil(this);
    const panelW = Math.min(width * 0.62, 520);
    const panelH = Math.min(height * 0.8, 420);
    const cx = width / 2;
    const cy = height / 2;
    addPanel(this, cx, cy, panelW, panelH);
    addUiText(this, cx, cy - panelH * 0.14, '🗳️', { fontSize: `${Math.round(panelH * 0.38)}px` }).setOrigin(0.5);
    const button = Phaser.Math.Clamp(panelH * 0.24, 60, 110);
    this.yes = addPillButton(this, cx, cy + panelH * 0.3, button * 1.5, button, { color: 'green', icon: 'play', onTap: () => this.finish(true) });
    this.no = addCloseBadge(this, cx + panelW / 2 - 18, cy - panelH / 2 + 18, () => this.decline(), 52);
    community.markNoticed();
    bus.emit('poll-notice', { poll: poll.id });
    sfx.play('coin');
    this.scale.once(Phaser.Scale.Events.RESIZE, () => this.scene.isActive() && this.scene.restart());
  }

  decline(): void {
    if (!this.scene.isActive()) return;
    sfx.play('tap');
    this.finish(false);
  }

  private finish(openBoard: boolean): void {
    if (this.done) return;
    this.done = true;
    this.scene.stop();
    this.scene.resume('World', { from: 'notice' });
    if (openBoard) this.scene.get<WorldScene>('World').openBoard();
  }

  // --- API para pruebas ---

  yesPos(): Vec | null {
    return this.yes ? { x: this.yes.x, y: this.yes.y } : null;
  }

  noPos(): Vec | null {
    return this.no ? { x: this.no.x, y: this.no.y } : null;
  }
}
```

Nota: al reiniciar por cambio de tamaño, `markNoticed` ya está guardado y `poll-notice` se emitiría otra vez; para no contarlo dos veces, guarda en un campo estático `shownFor: string | null` el id de la votación y emite solo si cambia.

- [ ] **Step 2: Cuándo salta**

En `WorldScene`:

```ts
/** El aviso de votación se mira un poco después del anuncio, para no pisarse. */
const NOTICE_MS = AD_OFFER_MS + 250;
```

Al final de `create()`:

```ts
    this.time.delayedCall(NOTICE_MS, () => this.maybeNotice());
```

En `onResume`, al final (cualquier origen menos el propio aviso y el tablón):

```ts
    if (data?.from !== 'notice' && data?.from !== 'board') this.time.delayedCall(NOTICE_MS, () => this.maybeNotice());
```

En el oyente de `community-updated` de `create()` (la respuesta puede llegar con el mapa ya pintado):

```ts
    const offCommunity = bus.on('community-updated', () => {
      this.board?.sync();
      this.maybeNotice();
    });
```

Y el método:

```ts
  /** Una vez por votación, al llegar al mapa, si no hay otro panel abierto. Si lo hay, espera a otra vuelta. */
  private maybeNotice(): void {
    if (!this.scene.isActive() || this.scene.isActive('AdOffer') || this.scene.isActive('PollNotice')) return;
    if (getAds()?.panelOpen) return;
    if (!getCommunity()?.notify()) return;
    this.stopWalking();
    this.scene.pause();
    this.scene.launch('PollNotice');
  }
```

`this.scene.isActive()` es falso con el mundo en pausa (tienda, comer, libro, tablón, anuncio): así nunca salta encima de otra ventana.

- [ ] **Step 3: Registrar y botón atrás**

- `main.ts`: `PollNoticeScene` justo después de `AdOfferScene`.
- `platform.ts`: en `backAction()`, `adOfferOpen: this.active('AdOffer') || this.active('PollNotice')`; en `back()`, caso `close-ad`: `if (this.active('PollNotice')) scene<PollNoticeScene>('PollNotice').decline(); else scene<AdOfferScene>('AdOffer').decline();`.
- `analyticsInstall.ts` no necesita la pantalla del aviso (la spec solo pide `tablon`), pero `hud.ts` sí: añade `'PollNotice'` a `OVERLAYS` para que el engranaje no se vea debajo.

- [ ] **Step 4: Tipos y pruebas**

Run: `npm run typecheck && npx vitest run`
Expected: PASS. (Las pruebas de juego del aviso van en la tarea 9.)

- [ ] **Step 5: Commit**

```bash
git add game/src/scenes/PollNoticeScene.ts game/src/main.ts game/src/scenes/WorldScene.ts game/src/systems/platform.ts game/src/core/hud.ts
git commit -m "feat(juego): aviso de votación nueva al llegar al mapa"
```

---

### Task 7: API de pruebas

**Files:**
- Modify: `game/src/systems/testHooks.ts`

**Interfaces:**
- Consumes: `startCommunity` (tarea 3), `BoardScene`, `PollNoticeScene`, métodos nuevos de `WorldScene` (tarea 4).
- Produces (en `ZooTestApi`):
  - `communityStart(baseUrl: string): Promise<void>`
  - `communityPhase(): string | null`
  - `boardTile(): { x: number; y: number } | null`
  - `boardScreenPos(): Vec | null`
  - `boardSparkling(): boolean`
  - `ideaSignCount(): number`
  - `openBoard(): void`
  - `boardView(): string | null`, `boardZone(): string | null`, `boardZonePos(zone: 'poll' | 'wall' | 'idea'): Vec | null`
  - `boardOptionPos(id: string): Vec | null`, `boardConfirmPos(): Vec | null`, `boardChangePos(): Vec | null`, `boardPicked(): string | null`, `boardJarText(): string | null`
  - `pollNoticePos(key: 'yes' | 'no'): Vec | null`
  - `restartBoardWithResize(): void` (emite un cambio de tamaño con el tablón abierto)

- [ ] **Step 1: Añadir a la interfaz y al objeto**

En la interfaz `ZooTestApi`, después de `busLog`:

```ts
  /** Monta el tablón contra un servidor (en las pruebas, uno falso con `page.route`). */
  communityStart(baseUrl: string): Promise<void>;
  communityPhase(): string | null;
  boardTile(): { x: number; y: number } | null;
  boardScreenPos(): Vec | null;
  boardSparkling(): boolean;
  ideaSignCount(): number;
  openBoard(): void;
  boardView(): string | null;
  boardZone(): string | null;
  boardZonePos(zone: 'poll' | 'wall' | 'idea'): Vec | null;
  boardOptionPos(id: string): Vec | null;
  boardConfirmPos(): Vec | null;
  boardChangePos(): Vec | null;
  boardPicked(): string | null;
  boardJarText(): string | null;
  pollNoticePos(key: 'yes' | 'no'): Vec | null;
  /** Con el tablón abierto, la pantalla cambia de tamaño (girar el móvil). */
  boardResize(): void;
```

En el objeto `window.__ZOO__`:

```ts
    communityStart: async (baseUrl) => {
      await startCommunity(baseUrl);
    },
    communityPhase: () => getCommunity()?.phase() ?? null,
    boardTile: () => game.scene.getScene<WorldScene>('World').boardTile(),
    boardScreenPos: () => activeScene<WorldScene>('World')?.boardScreenPos() ?? null,
    boardSparkling: () => game.scene.getScene<WorldScene>('World').boardSparkling(),
    ideaSignCount: () => game.scene.getScene<WorldScene>('World').ideaSignCount(),
    openBoard: () => activeScene<WorldScene>('World')?.openBoard(),
    boardView: () => activeScene<BoardScene>('Board')?.pollView() ?? null,
    boardZone: () => activeScene<BoardScene>('Board')?.zone() ?? null,
    boardZonePos: (zone) => activeScene<BoardScene>('Board')?.zonePos(zone) ?? null,
    boardOptionPos: (id) => activeScene<BoardScene>('Board')?.optionPos(id) ?? null,
    boardConfirmPos: () => activeScene<BoardScene>('Board')?.confirmPos() ?? null,
    boardChangePos: () => activeScene<BoardScene>('Board')?.changePos() ?? null,
    boardPicked: () => activeScene<BoardScene>('Board')?.picked() ?? null,
    boardJarText: () => activeScene<BoardScene>('Board')?.jarText() ?? null,
    pollNoticePos: (key) => {
      const scene = activeScene<PollNoticeScene>('PollNotice');
      return (key === 'yes' ? scene?.yesPos() : scene?.noPos()) ?? null;
    },
    boardResize: () => {
      const { gameSize, baseSize, displaySize } = game.scale;
      game.scale.emit('resize', gameSize, baseSize, displaySize, 0, 0);
    },
```

Añade a `logged` los eventos `'board-opened', 'board-voted', 'board-qr', 'board-offline', 'poll-notice'`, y los imports (`startCommunity`, `getCommunity`, `type BoardScene`, `type PollNoticeScene`).

- [ ] **Step 2: Tipos**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add game/src/systems/testHooks.ts
git commit -m "test(juego): API de pruebas del tablón"
```

---

### Task 8: Estadísticas (Matomo)

**Files:**
- Modify: `game/src/core/eventCatalog.ts`, `game/src/systems/analyticsEvents.ts:150-180`, `game/src/systems/analyticsInstall.ts:15-24`
- Test: `game/tests/unit/eventCatalog.test.ts`, `game/tests/unit/analyticsEvents.test.ts`

**Interfaces:**
- Consumes: eventos de la tarea 2.
- Produces: categoría `tablon: ['tablon-abre', 'tablon-aviso', 'tablon-vota', 'tablon-qr', 'tablon-sin-red']`.

- [ ] **Step 1: Pruebas que fallan**

En `game/tests/unit/analyticsEvents.test.ts`, siguiendo cómo ese archivo monta el tracker con un `sink` falso y un `EventBus`, añade:

```ts
it('tablón: abrir, aviso, voto, QR y sin red', async () => {
  // Monta el tracker como en las demás pruebas de este archivo (helper existente) y guarda lo enviado en `sent`.
  events.emit('board-opened', { phase: 'open' });
  events.emit('poll-notice', { poll: '2026-11-a' });
  events.emit('board-voted', { poll: '2026-11-a', option: 'delfines', changed: false });
  events.emit('board-qr', {});
  events.emit('board-offline', {});
  expect(sent).toEqual([
    ['tablon', 'tablon-abre', 'open'],
    ['tablon', 'tablon-aviso', '2026-11-a'],
    ['tablon', 'tablon-vota', '2026-11-a/delfines'],
    ['tablon', 'tablon-qr', undefined],
    ['tablon', 'tablon-sin-red', undefined],
  ]);
});
```

Ajusta la forma de `sent` (y si lleva `value`) a la que ya usa ese archivo. La prueba de `eventCatalog.test.ts` que comprueba que ninguna acción se repite en el catálogo cubrirá la categoría nueva sola.

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run tests/unit/analyticsEvents.test.ts`
Expected: FAIL (tipos o envíos que faltan).

- [ ] **Step 3: Implementar**

`eventCatalog.ts`, en `CATALOG` después de `anuncio`:

```ts
  tablon: ['tablon-abre', 'tablon-aviso', 'tablon-vota', 'tablon-qr', 'tablon-sin-red'],
```

`analyticsEvents.ts`, después de los `on('ad-…')`:

```ts
    // Tablón: el voto viaja como «votación/opción»; nunca nombres ni textos del servidor.
    on('board-opened', ({ phase }) => this.send('tablon', 'tablon-abre', phase));
    on('poll-notice', ({ poll }) => this.send('tablon', 'tablon-aviso', poll));
    on('board-voted', ({ poll, option }) => this.send('tablon', 'tablon-vota', part(poll, option)));
    on('board-qr', () => this.send('tablon', 'tablon-qr'));
    on('board-offline', () => this.send('tablon', 'tablon-sin-red'));
```

`analyticsInstall.ts`, en `SCREENS`: `Board: 'tablon',`. Y en `analyticsEvents.ts`, `REACH_SCREENS` pasa a `['tienda', 'libro', 'ajustes', 'tablon']` para que el alcance de pantallas cuente el tablón (si las pruebas de alcance enumeran pantallas, añade el caso).

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add game/src/core/eventCatalog.ts game/src/systems/analyticsEvents.ts game/src/systems/analyticsInstall.ts game/tests/unit
git commit -m "feat(juego): estadísticas del tablón (categoría tablon)"
```

---

### Task 9: Pruebas de juego (Playwright con servidor falso)

**Files:**
- Create: `game/tests/e2e/board.spec.ts`

**Interfaces:**
- Consumes: la API de la tarea 7. El servidor falso es `https://comunidad.test`, interceptado con `page.route`.

- [ ] **Step 1: Escribir las pruebas**

```ts
import { expect, test, type Page, type Route } from '@playwright/test';

const BASE = 'https://comunidad.test';

const OPEN = {
  hoy: '2026-11-03', ideas: 127,
  votacion: {
    id: '2026-11-a', abre: '2026-11-01', cierra: '2026-11-15', ganadora: null, abierta: true,
    opciones: [
      { id: 'delfines', titulo: { es: 'Delfines', en: 'Dolphins' }, dibujo: 'delfines.png', ideaDe: 'Lucía' },
      { id: 'koalas', titulo: { es: 'Koalas', en: 'Koalas' }, dibujo: 'koalas.png' },
    ],
    reparto: { delfines: 50, koalas: 50 },
  },
  muro: [{ titulo: { es: 'Pingüinos', en: 'Penguins' }, dibujo: 'pinguinos.png', ideaDe: 'Adrián', estado: 'hecha', recinto: 'pinguinos' }],
};

interface Fake { votes: unknown[]; status: unknown; offline: boolean; delayMs: number }

async function fakeServer(page: Page, initial: Partial<Fake> = {}): Promise<Fake> {
  const fake: Fake = { votes: [], status: OPEN, offline: false, delayMs: 0, ...initial };
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };
  await page.route(`${BASE}/**`, async (route: Route) => {
    if (fake.offline) return route.abort('internetdisconnected');
    if (fake.delayMs) await new Promise((r) => setTimeout(r, fake.delayMs));
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (path === '/estado.php') return route.fulfill({ status: 200, headers: cors, json: fake.status });
    if (path === '/voto.php') {
      fake.votes.push(request.postDataJSON());
      return route.fulfill({ status: 200, headers: cors, json: { ok: true, reparto: { delfines: 65, koalas: 35 } } });
    }
    // Dibujos: no hay; el juego pone el de reserva.
    return route.fulfill({ status: 404, headers: cors, body: '' });
  });
  return fake;
}

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
  await page.waitForFunction(() => {
    const scenes = window.__ZOO__?.activeScenes() ?? [];
    return scenes.includes('World') && scenes.includes('Hud');
  });
}

async function click(page: Page, pos: { x: number; y: number } | null): Promise<void> {
  if (!pos) throw new Error('No hay dónde tocar');
  const box = await canvasBox(page);
  await page.mouse.click(box.x + pos.x, box.y + pos.y);
}

const scenes = (page: Page) => page.evaluate(() => window.__ZOO__!.activeScenes());
const log = (page: Page) => page.evaluate(() => window.__ZOO__!.busLog());

async function closeNoticeIfAny(page: Page): Promise<void> {
  await page.waitForTimeout(1000);
  const no = await page.evaluate(() => window.__ZOO__!.pollNoticePos('no'));
  if (no) await click(page, no);
}

test('sin tablón configurado no hay tablón ni aviso', async ({ page }) => {
  await startGame(page);
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.__ZOO__!.boardTile())).toBeNull();
  expect(await scenes(page)).not.toContain('PollNotice');
});

test('el aviso salta una vez, y el botón verde lleva al tablón', async ({ page }) => {
  await fakeServer(page);
  await startGame(page);
  await page.evaluate((b) => window.__ZOO__!.communityStart(b), BASE);
  await page.waitForFunction(() => window.__ZOO__!.pollNoticePos('yes') !== null);
  await click(page, await page.evaluate(() => window.__ZOO__!.pollNoticePos('yes')));
  await page.waitForFunction(() => window.__ZOO__!.boardView() === 'cards');
  await page.evaluate(() => window.__ZOO__!.back());
  await expect.poll(() => scenes(page)).toContain('World');
  // Vuelta al mapa desde la tienda: no vuelve a saltar.
  await page.evaluate(() => window.__ZOO__!.openShop());
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__ZOO__!.back());
  await page.waitForTimeout(1500);
  expect(await scenes(page)).not.toContain('PollNotice');
  expect((await log(page)).filter((n) => n === 'poll-notice')).toHaveLength(1);
});

test('se vota con dos toques, salen las barras y se puede cambiar', async ({ page }) => {
  const fake = await fakeServer(page);
  await startGame(page);
  await page.evaluate((b) => window.__ZOO__!.communityStart(b), BASE);
  await closeNoticeIfAny(page);
  await page.evaluate(() => window.__ZOO__!.openBoard());
  await page.waitForFunction(() => window.__ZOO__!.boardView() === 'cards');
  expect(await page.evaluate(() => window.__ZOO__!.boardConfirmPos())).toBeNull();
  await click(page, await page.evaluate(() => window.__ZOO__!.boardOptionPos('delfines')));
  await click(page, await page.evaluate(() => window.__ZOO__!.boardConfirmPos()));
  await page.waitForFunction(() => window.__ZOO__!.boardView() === 'bars');
  expect(fake.votes).toEqual([{ votacion: '2026-11-a', opcion: 'delfines' }]);

  await click(page, await page.evaluate(() => window.__ZOO__!.boardChangePos()));
  await page.waitForFunction(() => window.__ZOO__!.boardView() === 'cards');
  expect(await page.evaluate(() => window.__ZOO__!.boardPicked())).toBe('delfines');
  await click(page, await page.evaluate(() => window.__ZOO__!.boardOptionPos('koalas')));
  await click(page, await page.evaluate(() => window.__ZOO__!.boardConfirmPos()));
  await page.waitForFunction(() => window.__ZOO__!.boardView() === 'bars');
  expect(fake.votes[1]).toEqual({ votacion: '2026-11-a', opcion: 'koalas', anterior: 'delfines' });
});

test('girar el móvil con una tarjeta marcada la conserva y no envía nada', async ({ page }) => {
  const fake = await fakeServer(page);
  await startGame(page);
  await page.evaluate((b) => window.__ZOO__!.communityStart(b), BASE);
  await closeNoticeIfAny(page);
  await page.evaluate(() => window.__ZOO__!.openBoard());
  await page.waitForFunction(() => window.__ZOO__!.boardView() === 'cards');
  await click(page, await page.evaluate(() => window.__ZOO__!.boardOptionPos('koalas')));
  await page.evaluate(() => window.__ZOO__!.boardResize());
  await page.waitForFunction(() => window.__ZOO__!.boardView() === 'cards');
  expect(await page.evaluate(() => window.__ZOO__!.boardPicked())).toBe('koalas');
  expect(fake.votes).toEqual([]);
});

test('sin conexión: aviso de sin internet y no se vota', async ({ page }) => {
  const fake = await fakeServer(page, { offline: true });
  await startGame(page);
  await page.evaluate((b) => window.__ZOO__!.communityStart(b), BASE);
  // Sin nada guardado no hay tablón en el mapa; se abre a mano para ver el aviso.
  await page.evaluate(() => window.__ZOO__!.openBoard());
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__ZOO__!.boardTile())).toBeNull();
  expect(fake.votes).toEqual([]);
});

test('con lo guardado y sin conexión: se ve el tablón pero no deja votar', async ({ page }) => {
  const fake = await fakeServer(page);
  await startGame(page);
  await page.evaluate((b) => window.__ZOO__!.communityStart(b), BASE);
  await closeNoticeIfAny(page);
  fake.offline = true;
  await page.evaluate(() => window.__ZOO__!.openBoard());
  await page.waitForFunction(() => window.__ZOO__!.boardView() === 'cards');
  await expect.poll(() => log(page)).toContain('board-opened');
  await click(page, await page.evaluate(() => window.__ZOO__!.boardOptionPos('delfines')));
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.__ZOO__!.boardConfirmPos())).toBeNull();
  expect(fake.votes).toEqual([]);
});

test('la respuesta tarda y el tablón aparece después, con estrellita y cartel', async ({ page }) => {
  await fakeServer(page, { delayMs: 2500 });
  await startGame(page);
  void page.evaluate((b) => window.__ZOO__!.communityStart(b), BASE);
  expect(await page.evaluate(() => window.__ZOO__!.boardTile())).toBeNull();
  await page.waitForFunction(() => window.__ZOO__!.boardTile() !== null, undefined, { timeout: 15_000 });
  expect(await page.evaluate(() => window.__ZOO__!.boardSparkling())).toBe(true);
  expect(await page.evaluate(() => window.__ZOO__!.ideaSignCount())).toBe(1);
});

test('el tarro enseña el número de verdad y el QR se cuenta', async ({ page }) => {
  await fakeServer(page);
  await startGame(page);
  await page.evaluate((b) => window.__ZOO__!.communityStart(b), BASE);
  await closeNoticeIfAny(page);
  await page.evaluate(() => window.__ZOO__!.openBoard());
  await click(page, await page.evaluate(() => window.__ZOO__!.boardZonePos('wall')));
  await page.waitForFunction(() => window.__ZOO__!.boardZone() === 'wall');
  expect(await page.evaluate(() => window.__ZOO__!.boardJarText())).toBe('¡Ya han llegado 127 ideas!');
  await click(page, await page.evaluate(() => window.__ZOO__!.boardZonePos('idea')));
  await expect.poll(() => log(page)).toContain('board-qr');
});

test('andando a la casilla del tablón se abre', async ({ page }) => {
  await fakeServer(page);
  await startGame(page);
  await page.evaluate((b) => window.__ZOO__!.communityStart(b), BASE);
  await closeNoticeIfAny(page);
  const tile = (await page.evaluate(() => window.__ZOO__!.boardTile()))!;
  await page.evaluate(({ x, y }) => window.__ZOO__!.goToTile(x, y), tile);
  await expect.poll(() => scenes(page), { timeout: 30_000 }).toContain('Board');
});

test('el aviso no salta encima del panel del anuncio', async ({ page }) => {
  await fakeServer(page);
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.adsFake('visto'));
  await page.evaluate(() => window.__ZOO__!.adsAdvance(900));
  // Que la comunidad arranque con el mapa en pausa debajo de la tienda.
  await page.evaluate(() => window.__ZOO__!.openShop());
  await page.evaluate((b) => window.__ZOO__!.communityStart(b), BASE);
  await page.waitForTimeout(600);
  expect(await scenes(page)).not.toContain('PollNotice');
});
```

La prueba «sin conexión» de arriba solo comprueba que no se rompe nada ni se envía; si `openBoard` no abre nada sin tablón (como está escrito en la tarea 4, porque `getCommunity()` existe pero el tablón no es visible), está bien. Si al hacer la tarea 5 decides que sin nada guardado se abre igualmente la pantalla con 📡, cambia la prueba para esperar `boardView() === 'offline'` y `board-offline` en el registro.

Las pruebas leen textos en español (`locale: 'es-ES'` en `playwright.config.ts`).

- [ ] **Step 2: Ejecutar**

Run: `npx playwright test tests/e2e/board.spec.ts`
Expected: PASS. Si una falla, usa superpowers:systematic-debugging antes de tocar nada; no cambies la expectativa para que pase.

- [ ] **Step 3: Tanda completa**

Run: `npx vitest run && npx playwright test`
Expected: todo PASS. Las pruebas de siempre no deben cambiar: sin `communityStart` el juego es el de antes. (Si `zoo-grande.spec.ts:46` o `:104` fallan una vez, son los cabos sueltos ya conocidos del README: lánzalas solas antes de concluir nada.)

- [ ] **Step 4: Commit**

```bash
git add game/tests/e2e/board.spec.ts
git commit -m "test(juego): pruebas de juego del tablón con servidor falso"
```

---

### Task 10: Textos legales

**Files:**
- Modify: `game/public/privacidad.html`, `game/public/privacidad-en.html`, `web/paginas/privacidad.html` (y su versión inglesa en `web/paginas/` si existe; búscala con `ls web/paginas`)
- Test: `game/tests/unit/legal.test.ts` (solo si comprueba fechas o títulos)

- [ ] **Step 1: Apartado nuevo y retoques (español)**

En `game/public/privacidad.html`:

1. «Última actualización»: la fecha del día en que se haga (formato «15 de octubre de 2026»).
2. En «En pocas palabras», después de la frase de los anuncios, añade: «En el zoo hay un tablón donde se puede votar, de forma anónima, la próxima idea que se hará en el juego.» Y cambia «el juego no tiene compras, chat ni redes sociales» por «el juego no tiene compras, chat ni redes sociales, y nadie puede escribir nada dentro de él».
3. Apartado nuevo antes de «Permisos»:

```html
      <h2>Votaciones e ideas</h2>
      <p>
        Si el juego tiene conexión, el tablón de la plaza pide a nuestro servidor (api.zooesponji.com) la votación del
        momento y las ideas ya elegidas. Al votar se envía solo qué opción se ha elegido en qué votación.
        <strong>El voto es anónimo:</strong> no se envía ni se guarda nada que diga quién ha votado; el servidor solo suma
        votos. El aparato recuerda qué se ha votado para no votar dos veces. Las ideas no se escriben en el juego: se
        envían desde una página web aparte (zooesponji.com/ideas), pensada solo para mayores de 18 años, a la que se llega
        con el código del tablón. Los nombres que se ven en el juego (por ejemplo, «Idea de Lucía») los ha escrito un
        adulto en esa web y los revisamos antes de publicarlos: solo nombres de pila o apodos.
      </p>
```

4. En «Condiciones de uso», añade al final: «Las ideas enviadas desde la web tienen sus propias condiciones: zooesponji.com/ideas/condiciones.»
5. En «Cambios en esta página», el último cambio pasa a: «Último cambio (fecha): se añade el apartado «Votaciones e ideas» por el tablón del juego.»

- [ ] **Step 2: Lo mismo en inglés**

En `game/public/privacidad-en.html`, la misma estructura: fecha, retoque de «In short», apartado «Votes and ideas» con la traducción fiel del párrafo de arriba (dirección inglesa de las condiciones, la misma que en `board.terms` de `en.ts`) y «Changes to this page».

- [ ] **Step 3: La página pública**

Copia los mismos cambios a `web/paginas/privacidad.html` (y a la inglesa de la web si existe). La regla de la memoria del proyecto: la página pública dice lo mismo que la del juego. Compara con `diff` el texto de los `<main>` de las dos y que solo cambien lo que ya cambiaba antes (rutas, cabecera).

- [ ] **Step 4: Pruebas**

Run: `npx vitest run tests/unit/legal.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add game/public/privacidad.html game/public/privacidad-en.html web/paginas
git commit -m "docs(legal): apartado de votaciones e ideas en la privacidad del juego y de la web"
```

---

### Task 11: Comprobaciones contra el servidor de verdad, versión 2.7.0 y documentación

**Files:**
- Modify: `game/package.json` (`version`), `game/android/app/build.gradle` (`versionCode 8`, `versionName "2.7.0"`), `README.md`, `game/README.md`, `docs/superpowers/specs/2026-10-12-comunidad-design.md` (línea de estado), y los demás sitios de la «lista de sitios donde se cambia la versión» (búscala con `grep -rn "sitios donde se cambia la versión" -i README.md game/README.md docs`).

- [ ] **Step 1: Los dibujos se pueden leer desde el juego (CORS)**

Phaser pinta los dibujos con WebGL: si el servidor no manda `Access-Control-Allow-Origin` en los PNG, no se ven (sale el de reserva). Sube un PNG de prueba a `dibujos/` en el VPS (por SSH con la clave `zoo_vps2`, ver memoria «Servidor de comunidad»; carpeta pública del dominio `api.zooesponji.com`) y comprueba:

Run: `curl -sI -H "Origin: https://localhost" https://api.zooesponji.com/dibujos/prueba.png`
Expected: `200` y `Access-Control-Allow-Origin: *`.

Si falta la cabecera, el estático lo sirve nginx directamente y un `.htaccess` no basta: añade en la configuración de nginx de ese dominio en Hestia (plantilla propia o `nginx.ssl.conf_*` del dominio) `location /dibujos/ { add_header Access-Control-Allow-Origin "*"; }`, recarga nginx y repite el `curl`. Si para eso hace falta ser administrador del servidor, para y díselo a David con los pasos exactos; no lo des por hecho. Borra `prueba.png` al acabar.

- [ ] **Step 2: Probar contra el servidor de verdad**

Con `VITE_COMMUNITY_URL=https://api.zooesponji.com` en `.env.production.local` (o, en desarrollo, `communityStart('https://api.zooesponji.com')` desde la consola), comprueba que el tablón aparece, que con `votacion: null` sale «Pronto habrá votación», que el tarro dice el número real de ideas y que el QR se ve. Para la votación de verdad no subas un `comunidad.json` de prueba a producción sin permiso de David: pídeselo o usa el MariaDB de XAMPP en local como dice la memoria «Probar contra producción».

- [ ] **Step 3: Versión**

`game/package.json`: `"version": "2.7.0"`. `game/android/app/build.gradle`: `versionCode 8`, `versionName "2.7.0"`. El resto de sitios de la lista de versión, igual.

Run: `npm run build`
Expected: compila; `check-dist` pasa.

- [ ] **Step 4: Documentación**

- `README.md`: «Versión actual: 2.7.0», fila nueva en la tabla de versiones («**Tablón de la comunidad.** En la plaza hay un tablón: se vota con dibujos la próxima idea del zoo, se ve cuántas ideas han llegado y las ideas ya hechas con el nombre de quien la propuso, y hay un QR para que un adulto envíe ideas desde la web. Sin internet el juego es el de siempre.»), estado de la 2.7.0 (sin subir a Play hasta que David la pruebe) y quitar «falta el tablón dentro del juego (plan 2)» de la línea de comunidad.
- `game/README.md`: versión, `versionCode` 8 como siguiente, `VITE_COMMUNITY_URL` en la lista de variables y una línea sobre `src/core/community.ts`, `src/systems/community.ts`, `BoardScene` y `PollNoticeScene`.
- Spec: estado «plan 2 hecho en `<rama>`; falta probarlo en el móvil con el servidor real».
- Para David, en la spec (sección 10, Pasos manuales): «`recinto` en `comunidad.json` usa los ids del juego: leon, cabra, pantera, panda, estanque, ovejas, establo, pinguinos, sabana, elefantes-africanos, elefantes-asiaticos (el ejemplo decía `pinguino`)», y corrige el ejemplo JSON de la sección 1 a `"recinto": "pinguinos"`.

- [ ] **Step 5: Commit**

```bash
git add game/package.json game/android/app/build.gradle README.md game/README.md docs/superpowers/specs/2026-10-12-comunidad-design.md
git commit -m "chore: versión 2.7.0 con el tablón de la comunidad"
```

- [ ] **Step 6: Prueba en el móvil (la hace David)**

Avisar a David (ventana nueva con Sonnet, órdenes en PowerShell paso a paso) para compilar e instalar en el móvil con `VITE_COMMUNITY_URL` puesto: abrir el tablón, ver el QR y escanearlo con otro móvil, y, cuando haya una votación de verdad, votar y cambiar el voto. Hasta entonces la 2.7.0 no se sube a Play.
