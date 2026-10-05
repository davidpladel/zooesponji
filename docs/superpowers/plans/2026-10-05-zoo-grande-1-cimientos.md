# Zoo grande, plan 1 de 4: cimientos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar "recinto" de "especie", dar identidad a cada animal (residente) y hacer que la cuidadora entre en los recintos para dar de comer al animal que se toca, sin añadir todavía contenido nuevo.

**Architecture:** `data/animals.ts` se queda como tabla de **especies** (reacciones, monedas). Un archivo nuevo `data/pens.ts` define los **recintos** y su lista ordenada de **residentes** (`{ id, species, look }`). El guardado (`counts`) pasa a ir por recinto: el residente *k* está si `counts[recinto] >= k`. La cuidadora usa una rejilla propia que añade el interior de los recintos abiertos; los visitantes siguen con la rejilla de caminos.

**Tech Stack:** TypeScript, Phaser 4, Vite, Vitest (unitarias), Playwright (e2e). Todo dentro de `game/`.

**Spec:** `docs/superpowers/specs/2026-10-05-zoo-grande-design.md`.

## Los 4 planes del bloque

| Plan | Qué entrega | Estado |
|---|---|---|
| **1. Cimientos (este)** | Modelo recinto/especie/residente, bandeja por especie, la cuidadora entra a dar de comer | Escrito |
| 2. Arte y comidas | Importador con variantes, recolor genérico, capa de marcas, cabras distintas, 7 comidas nuevas | Se escribe al cerrar el 1 |
| 3. Mapa y recintos | Mapa 96×60, 7 recintos nuevos, recintos mixtos, visitantes y corazones en `ovejas` | Se escribe al cerrar el 2 |
| 4. Tienda y libro | "Los 3 siguientes", precios, libro por capítulos con 35 textos, test de textos, docs, 2.3.0 | Se escribe al cerrar el 3 |

Los planes 2–4 no se escriben ahora porque su código exacto depende de cómo queden estos cimientos.

## Global Constraints

- Sin contenido nuevo en este plan: siguen los 4 recintos y las 4 comidas. Lo único que nota el jugador es que la cuidadora entra en el recinto y que la ventana de comer lleva el nombre del animal.
- **Las partidas guardadas siguen valiendo**: `SAVE_VERSION` se queda en 2 y los ids `leon`, `cabra`, `pantera`, `panda` no cambian.
- `core/` no importa Phaser ni APIs del navegador.
- Ningún texto visible fuera de `src/data/strings.ts`; frases completas, nunca pegadas a trozos.
- El guardado y los eventos llevan ids, nunca textos.
- Ningún archivo de arte de los packs entra en este repo.
- No se sube la versión (sigue 2.2.0): la 2.3.0 sale al cerrar el plan 4.
- Antes de empezar hay un cambio sin confirmar de David en `game/tests/unit/session.test.ts`. No lo deshagas: léelo y edita encima.
- Todos los comandos se ejecutan desde `game/`. Unitarias: `npm test`. Tipos: `npm run typecheck`. E2E: `npm run test:e2e`.
- Mensajes de commit en español, con el prefijo que usa el repo (`feat:`, `refactor:`, `test:`, `docs:`).

## Mapa de archivos

| Archivo | Cambio | Responsabilidad |
|---|---|---|
| `src/data/pens.ts` | Nuevo | Recintos, residentes y sus consultas |
| `src/data/animals.ts` | Modificar | Solo especie: reacciones parciales, `trayFoods`; pierde `maxCount` y `unlockedByDefault` |
| `src/data/shop.ts` | Modificar | Artículos derivados de `PENS` |
| `src/data/book.ts` | Modificar | `unlock.penId` |
| `src/core/economy.ts` | Modificar | `counts` por recinto; el extra compra el siguiente residente |
| `src/core/save.ts`, `core/book.ts`, `core/shopEntries.ts`, `core/reactions.ts` | Modificar | Tipos y consultas por recinto |
| `src/core/penGrid.ts` | Nuevo | Rejilla de la cuidadora con interiores de recinto |
| `src/core/interaction.ts` | Modificar | `nearestWithin` |
| `src/systems/session.ts`, `systems/events.ts`, `systems/testHooks.ts` | Modificar | Dar de comer por residente; eventos con `penId` y `residentId` |
| `src/world/Pens.ts` | Modificar | Residentes con identidad, tocar, retener, ancla |
| `src/scenes/WorldScene.ts`, `scenes/FeedScene.ts` | Modificar | Entrar al recinto; ventana por residente |
| `src/scenes/HudScene.ts`, `scenes/ShopScene.ts`, `world/Decor.ts` | Modificar | Ajuste de tipos |

---

### Task 1: Recintos y residentes como datos

**Files:**
- Create: `game/src/data/pens.ts`
- Test: `game/tests/unit/pens.test.ts`

**Interfaces:**
- Consumes: `AnimalId` de `src/data/animals.ts`, `StringKey` de `src/data/strings.ts`.
- Produces: `PEN_IDS`, `PenId`, `ResidentDef { id: string; species: AnimalId; look: string }`, `PenDef { id; nameKey; cost?; residents }`, `PENS`, `isPenId(value: string): value is PenId`, `penCapacity(id: PenId): number`, `residentsIn(id: PenId, count: number): ResidentDef[]`, `nextResident(id: PenId, count: number): ResidentDef | null`, `findResident(residentId: string): { penId: PenId; index: number; resident: ResidentDef } | null`.

- [ ] **Step 1: Escribir el test que falla**

`game/tests/unit/pens.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ANIMALS } from '../../src/data/animals';
import { BOOK_PAGES } from '../../src/data/book';
import { PEN_IDS, PENS, findResident, isPenId, nextResident, penCapacity, residentsIn } from '../../src/data/pens';
import { STRINGS_ES } from '../../src/data/strings';

describe('recintos', () => {
  it('son los 4 actuales, con los mismos ids que el guardado', () => {
    expect([...PEN_IDS]).toEqual(['leon', 'cabra', 'pantera', 'panda']);
  });

  it('caben los mismos animales que antes', () => {
    expect(PEN_IDS.map(penCapacity)).toEqual([1, 5, 2, 2]);
  });

  it('león y cabra vienen de inicio; pantera y panda se compran', () => {
    expect(PENS.leon.cost).toBeUndefined();
    expect(PENS.cabra.cost).toBeUndefined();
    expect(PENS.pantera.cost).toBe(50);
    expect(PENS.panda.cost).toBe(100);
  });

  it('cada residente tiene id único, especie conocida y página del libro', () => {
    const ids = PEN_IDS.flatMap((id) => PENS[id].residents.map((r) => r.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const penId of PEN_IDS) {
      for (const r of PENS[penId].residents) {
        expect(ANIMALS[r.species]).toBeDefined();
        expect(BOOK_PAGES.some((p) => p.id === r.id)).toBe(true);
        expect(STRINGS_ES[`book.page.${r.id}.title` as keyof typeof STRINGS_ES]).toBeTruthy();
      }
    }
  });

  it('residentsIn da los que han llegado, en orden', () => {
    expect(residentsIn('cabra', 2).map((r) => r.id)).toEqual(['gordi', 'nube']);
    expect(residentsIn('cabra', 0)).toEqual([]);
    expect(residentsIn('cabra', 99)).toHaveLength(5);
  });

  it('nextResident da el siguiente o null si está lleno', () => {
    expect(nextResident('cabra', 1)?.id).toBe('nube');
    expect(nextResident('cabra', 5)).toBeNull();
    expect(nextResident('leon', 1)).toBeNull();
  });

  it('findResident localiza recinto y posición', () => {
    expect(findResident('sombra')).toEqual({ penId: 'pantera', index: 1, resident: PENS.pantera.residents[1] });
    expect(findResident('nadie')).toBeNull();
  });

  it('isPenId distingue ids válidos', () => {
    expect(isPenId('panda')).toBe(true);
    expect(isPenId('tigre')).toBe(false);
  });
});
```

- [ ] **Step 2: Ver que falla**

Run: `npm test -- pens`
Expected: FAIL, no se puede resolver `../../src/data/pens`.

- [ ] **Step 3: Implementar**

`game/src/data/pens.ts`:

```ts
import type { AnimalId } from './animals';
import type { StringKey } from './strings';

export const PEN_IDS = ['leon', 'cabra', 'pantera', 'panda'] as const;
export type PenId = (typeof PEN_IDS)[number];

/** Un animal concreto. Su id es también el de su página del libro. */
export interface ResidentDef {
  id: string;
  species: AnimalId;
  /** Hoja de sprites que usa (hoy, la de su especie). */
  look: string;
}

export interface PenDef {
  id: PenId;
  nameKey: StringKey;
  /** Precio en la tienda. Sin precio: el recinto viene abierto de inicio. */
  cost?: number;
  /** Por orden de llegada: el primero viene con el recinto, el resto se compran de uno en uno. */
  residents: readonly ResidentDef[];
}

const residents = (species: AnimalId, ...ids: string[]): ResidentDef[] =>
  ids.map((id) => ({ id, species, look: species }));

export const PENS: Record<PenId, PenDef> = {
  leon: { id: 'leon', nameKey: 'animal.leon', residents: residents('leon', 'bills') },
  cabra: {
    id: 'cabra',
    nameKey: 'animal.cabra',
    residents: residents('cabra', 'gordi', 'nube', 'galleta', 'tolon', 'chispa'),
  },
  pantera: { id: 'pantera', nameKey: 'animal.pantera', cost: 50, residents: residents('pantera', 'noche', 'sombra') },
  panda: { id: 'panda', nameKey: 'animal.panda', cost: 100, residents: residents('panda', 'mochi', 'pompon') },
};

export function isPenId(value: string): value is PenId {
  return (PEN_IDS as readonly string[]).includes(value);
}

export function penCapacity(id: PenId): number {
  return PENS[id].residents.length;
}

/** Residentes que ya están en el recinto cuando su contador vale `count`. */
export function residentsIn(id: PenId, count: number): ResidentDef[] {
  return PENS[id].residents.slice(0, Math.max(0, count));
}

/** El siguiente en llegar, o null si el recinto está lleno. */
export function nextResident(id: PenId, count: number): ResidentDef | null {
  return PENS[id].residents[count] ?? null;
}

export function findResident(residentId: string): { penId: PenId; index: number; resident: ResidentDef } | null {
  for (const penId of PEN_IDS) {
    const index = PENS[penId].residents.findIndex((r) => r.id === residentId);
    if (index >= 0) return { penId, index, resident: PENS[penId].residents[index]! };
  }
  return null;
}
```

- [ ] **Step 4: Ver que pasa**

Run: `npm test -- pens`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add game/src/data/pens.ts game/tests/unit/pens.test.ts
git commit -m "feat: recintos y residentes como datos (pens.ts)"
```

---

### Task 2: Bandeja de comidas por especie

**Files:**
- Modify: `game/src/data/animals.ts`
- Modify: `game/src/core/reactions.ts`
- Modify: `game/src/scenes/FeedScene.ts:105-138`
- Modify: `game/src/systems/testHooks.ts:23`
- Test: `game/tests/unit/reactions.test.ts`, `game/tests/unit/content.test.ts`

**Interfaces:**
- Produces: `AnimalDef.reactions: Partial<Record<FoodId, Reaction>>`; `trayFoods(id: AnimalId): FoodId[]` en `src/data/animals.ts`; `resolveFeeding` devuelve `{ reaction: 'rechaza', coins: 0 }` para una comida que la especie no lista.

- [ ] **Step 1: Escribir los tests que fallan**

Añadir al final de `game/tests/unit/reactions.test.ts`:

```ts
import { ANIMALS, trayFoods } from '../../src/data/animals';

describe('bandeja por especie', () => {
  it('hoy cada especie enseña las 4 comidas, en el orden de FOOD_IDS', () => {
    expect(trayFoods('leon')).toEqual(['piedra', 'carne', 'conejo', 'zanahoria']);
  });

  it('una comida sin reacción no sale en la bandeja y, si llega, se rechaza sin monedas', () => {
    const original = ANIMALS.leon.reactions;
    ANIMALS.leon.reactions = { carne: 'come' };
    try {
      expect(trayFoods('leon')).toEqual(['carne']);
      expect(resolveFeeding('leon', 'piedra')).toEqual({ reaction: 'rechaza', coins: 0 });
    } finally {
      ANIMALS.leon.reactions = original;
    }
  });
});
```

En `game/tests/unit/content.test.ts`, sustituir el test `'%s tiene reacción para todas las comidas'` por:

```ts
  it.each(ANIMAL_IDS)('%s enseña entre 4 y 5 comidas, todas con reacción válida', (id) => {
    const tray = trayFoods(id);
    expect(tray.length).toBeGreaterThanOrEqual(4);
    expect(tray.length).toBeLessThanOrEqual(5);
    for (const food of tray) expect(['come', 'rechaza', 'especial']).toContain(ANIMALS[id].reactions[food]);
  });
```

y añadir `trayFoods` al import de `../../src/data/animals` de ese archivo.

- [ ] **Step 2: Ver que fallan**

Run: `npm test -- reactions content`
Expected: FAIL, `trayFoods` no existe.

- [ ] **Step 3: Implementar**

En `game/src/data/animals.ts`: cambiar el import de comidas, el tipo de `reactions` y añadir la función al final.

```ts
import { FOOD_IDS, type FoodId } from './foods';
```

```ts
  /** Solo las comidas que salen en su bandeja. */
  reactions: Partial<Record<FoodId, Reaction>>;
```

```ts
/** Comidas que se le ofrecen a la especie, en el orden de la bandeja. */
export function trayFoods(id: AnimalId): FoodId[] {
  return FOOD_IDS.filter((food) => ANIMALS[id].reactions[food] !== undefined);
}
```

`game/src/core/reactions.ts` completo:

```ts
import { ANIMALS, type AnimalId, type Reaction } from '../data/animals';
import type { FoodId } from '../data/foods';

export interface FeedResult {
  reaction: Reaction;
  coins: number;
}

/** `animalId` es la especie. Una comida que la especie no lista se rechaza. */
export function resolveFeeding(animalId: AnimalId, foodId: FoodId): FeedResult {
  const animal = ANIMALS[animalId];
  const reaction = animal.reactions[foodId] ?? 'rechaza';
  if (reaction === 'rechaza') return { reaction, coins: 0 };
  return { reaction, coins: animal.coins[reaction] ?? 0 };
}
```

En `game/src/scenes/FeedScene.ts`:

Import: `import { ANIMALS, trayFoods, type AnimalId } from '../data/animals';` y `import { FOODS, type FoodId } from '../data/foods';` (ya no se usa `FOOD_IDS`).

Sustituir `targetsOnScreen` y `createTray`:

```ts
  targetsOnScreen(): { animal: Vec; foods: Partial<Record<FoodId, Vec>> } {
    const foods: Partial<Record<FoodId, Vec>> = {};
    for (const [id, home] of this.homes) foods[id] = { x: home.x, y: home.y };
    return { animal: { x: this.animal.x, y: this.animal.y }, foods };
  }
```

```ts
  private createTray(width: number, height: number): void {
    const tray = trayFoods(this.animalId);
    const size = Phaser.Math.Clamp(Math.round(height * 0.12), 56, 96);
    const trayY = height * 0.86;
    const gap = Math.min(width / (tray.length + 1), size * 2.2);
    this.add
      .rectangle(width / 2, trayY, gap * tray.length + size * 0.5, size * 1.6, 0x6d4c41)
      .setStrokeStyle(4, 0x3e2723);
    tray.forEach((id, index) => {
      const x = width / 2 + (index - (tray.length - 1) / 2) * gap;
      const icon = getArt()?.foods[id];
      // Icono del pack con escala entera (nítido); si no hay, el emoji.
      const food: Food = icon
        ? this.add.image(x, trayY, foodKey(id)).setScale(Math.max(1, Math.floor(size / icon.height)))
        : this.add.text(x, trayY, FOODS[id].emoji, { fontSize: `${size}px` }).setOrigin(0.5);
      food.setInteractive({ draggable: true, useHandCursor: true });
      food.setData('food', id);
      food.setData('baseScale', food.scaleX);
      this.foods.set(id, food);
      this.homes.set(id, { x, y: trayY });
    });
  }
```

En `game/src/systems/testHooks.ts` línea 23:

```ts
  feedTargets(): { animal: Vec; foods: Partial<Record<FoodId, Vec>> } | null;
```

- [ ] **Step 4: Ver que pasa**

Run: `npm test && npm run typecheck`
Expected: todo en verde, sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add game/src/data/animals.ts game/src/core/reactions.ts game/src/scenes/FeedScene.ts game/src/systems/testHooks.ts game/tests/unit/reactions.test.ts game/tests/unit/content.test.ts
git commit -m "feat: cada especie enseña solo las comidas de su bandeja"
```

---

### Task 3: El juego cuenta por recinto y da de comer a un residente

Es un cambio de tipos que atraviesa el juego. No cambia nada visible salvo el título de la ventana de comer.

**Files:**
- Modify: `game/src/data/animals.ts`, `game/src/data/shop.ts`, `game/src/data/book.ts`
- Modify: `game/src/core/economy.ts`, `game/src/core/save.ts`, `game/src/core/book.ts`, `game/src/core/shopEntries.ts`
- Modify: `game/src/systems/events.ts`, `game/src/systems/session.ts`, `game/src/systems/testHooks.ts`
- Modify: `game/src/world/Pens.ts`, `game/src/world/Decor.ts`
- Modify: `game/src/scenes/WorldScene.ts`, `game/src/scenes/FeedScene.ts`, `game/src/scenes/HudScene.ts`, `game/src/scenes/ShopScene.ts`
- Test: `game/tests/unit/economy.test.ts`, `content.test.ts`, `session.test.ts`, `shopEntries.test.ts`, `book.test.ts`, `save.test.ts`; `game/tests/e2e/play.spec.ts`

**Interfaces:**
- Consumes: todo lo de Task 1 y `trayFoods` de Task 2.
- Produces:
  - `GameState.counts: Readonly<Record<PenId, number>>`.
  - En `core/economy.ts`: `penCount(state, id: PenId): number`, `isPenOpen(state, id: PenId): boolean`, `openPens(state): PenId[]`, `buyExtra(state, id: PenId)`, `purchase(state, itemId)`.
  - En `data/shop.ts`: `ShopItemDef { id: string; penId: PenId; cost: number }`, `shopItemForPen(id: PenId)`, `extraItemId(id: PenId)`, `parseExtraItemId(itemId): PenId | null`.
  - En `core/shopEntries.ts`: `ShopEntry { id; kind; penId: PenId; species: AnimalId; cost; status; count?; max? }`.
  - Eventos: `'animal-unlocked': { penId }`, `'animal-added': { penId; count; residentId }`, `'animal-fed': { penId; residentId; reaction }`.
  - `Session.feed(residentId: string, foodId: FoodId): Promise<FeedResult>`.
  - `FeedSceneData { residentId: string }`.
  - `BookPage.unlock?: { penId: PenId; count: number }`.

- [ ] **Step 1: Renombrar las consultas de economía en todo el repo**

Desde `game/`:

```bash
grep -rl "animalCount\|isAnimalUnlocked\|unlockedAnimals\|shopItemForAnimal" src tests | xargs sed -i 's/\banimalCount\b/penCount/g; s/\bisAnimalUnlocked\b/isPenOpen/g; s/\bunlockedAnimals\b/openPens/g; s/\bshopItemForAnimal\b/shopItemForPen/g'
```

Run: `npm test`
Expected: PASS (solo han cambiado nombres).

- [ ] **Step 2: Escribir los tests que fallan**

En `game/tests/unit/economy.test.ts`, añadir:

```ts
import { PENS } from '../../src/data/pens';

describe('comprar por recinto', () => {
  const rich = (): GameState => ({ ...initialState(), coins: 1000, shopUnlocked: true });

  it('comprar un recinto trae solo su primer residente', () => {
    const result = purchase(rich(), 'pantera');
    expect(result.ok && result.state.counts.pantera).toBe(1);
  });

  it('el extra cuesta lo que marca la especie del siguiente residente', () => {
    const result = buyExtra(rich(), 'cabra');
    expect(result.ok && result.state.coins).toBe(1000 - 10);
    expect(result.ok && result.state.counts.cabra).toBe(2);
  });

  it('un recinto lleno no admite más', () => {
    const full = { ...rich(), counts: { ...rich().counts, cabra: PENS.cabra.residents.length } };
    expect(buyExtra(full, 'cabra')).toEqual({ ok: false, error: 'pen-full' });
    expect(buyExtra(rich(), 'leon')).toEqual({ ok: false, error: 'pen-full' });
  });
});
```

(Si el archivo no importa ya `buyExtra`, `purchase`, `initialState` o `GameState`, añádelos a su import de `../../src/core/economy`.)

En `game/tests/unit/session.test.ts`, añadir (respetando lo que ya haya cambiado David):

```ts
  it('dar de comer a un residente avisa de quién es y de su recinto', async () => {
    const events = new EventBus<GameEvents>();
    const fed: GameEvents['animal-fed'][] = [];
    events.on('animal-fed', (e) => fed.push(e));
    const session = await Session.load(memoryStore(), events);
    const result = await session.feed('gordi', 'piedra');
    expect(result).toEqual({ reaction: 'come', coins: 1 });
    expect(fed).toEqual([{ penId: 'cabra', residentId: 'gordi', reaction: 'come' }]);
  });

  it('dar de comer a un residente que no existe es un error', async () => {
    const session = await Session.load(memoryStore(), new EventBus<GameEvents>());
    await expect(session.feed('nadie', 'piedra')).rejects.toThrow('nadie');
  });
```

Usa el almacén en memoria que ya emplee ese archivo (si se llama distinto de `memoryStore`, usa su nombre) y sustituye en los tests existentes las llamadas `session.feed('<especie>', …)` por el primer residente de ese recinto (`leon` → `bills`, `cabra` → `gordi`, `pantera` → `noche`, `panda` → `mochi`), y `animalId` por `penId` en los eventos esperados.

En `game/tests/unit/shopEntries.test.ts`, añadir:

```ts
  it('cada artículo dice su recinto y la especie que hay que dibujar', () => {
    const state = { ...initialState(), coins: 0, shopUnlocked: true };
    const entries = shopEntries(state);
    expect(entries.find((e) => e.id === 'pantera')).toMatchObject({ kind: 'pen', penId: 'pantera', species: 'pantera' });
    expect(entries.find((e) => e.id === 'extra-cabra')).toMatchObject({ kind: 'extra', penId: 'cabra', species: 'cabra', count: 1, max: 5 });
  });
```

- [ ] **Step 3: Ver que fallan**

Run: `npm test -- economy session shopEntries`
Expected: FAIL (`penId`/`species` no existen, `feed('gordi')` no compila o falla).

- [ ] **Step 4: Datos**

`game/src/data/animals.ts`: quitar de `AnimalDef` los campos `unlockedByDefault` y `maxCount` y sus valores en las cuatro entradas. Quedan `extraCost` y `extraNameKey` (el león no los tiene). Los comentarios pasan a:

```ts
  /** Precio de cada animal de esta especie que se compra suelto en la tienda. */
  extraCost?: number;
  /** Texto del artículo extra ("Otra cabra"). */
  extraNameKey?: StringKey;
```

`game/src/data/shop.ts` completo:

```ts
import { PEN_IDS, PENS, isPenId, type PenId } from './pens';

/** Monedas que hay que alcanzar (no gastar) para abrir la tienda. */
export const SHOP_UNLOCK_COINS = 20;

export interface ShopItemDef {
  id: string;
  penId: PenId;
  cost: number;
}

/** Un artículo por recinto con precio, en el orden de `PEN_IDS`. */
export const SHOP_ITEMS: readonly ShopItemDef[] = PEN_IDS.flatMap((penId) => {
  const cost = PENS[penId].cost;
  return cost === undefined ? [] : [{ id: penId, penId, cost }];
});

export function getShopItem(id: string): ShopItemDef | undefined {
  return SHOP_ITEMS.find((item) => item.id === id);
}

export function shopItemForPen(penId: PenId): ShopItemDef | undefined {
  return SHOP_ITEMS.find((item) => item.penId === penId);
}

const EXTRA_PREFIX = 'extra-';

/** Id del artículo "otro animal" de un recinto. */
export function extraItemId(penId: PenId): string {
  return `${EXTRA_PREFIX}${penId}`;
}

export function parseExtraItemId(itemId: string): PenId | null {
  if (!itemId.startsWith(EXTRA_PREFIX)) return null;
  const id = itemId.slice(EXTRA_PREFIX.length);
  return isPenId(id) ? id : null;
}
```

`game/src/data/book.ts`: importar `PenId` y cambiar el tipo y las 11 entradas con `unlock`.

```ts
import type { AnimalId } from './animals';
import type { PenId } from './pens';
```

```ts
  /** Sin `unlock`: página que está desde el principio. */
  unlock?: { penId: PenId; count: number };
```

En cada página, `unlock: { animalId: 'cabra', count: 2 }` pasa a `unlock: { penId: 'cabra', count: 2 }` (igual para las demás). `picture.animalId` no cambia: es la especie que se dibuja.

- [ ] **Step 5: Núcleo**

`game/src/core/economy.ts`: sustituir imports, `GameState`, `initialCounts` y las funciones que usan el recinto.

```ts
import { ANIMALS } from '../data/animals';
import { PEN_IDS, PENS, nextResident, type PenId } from '../data/pens';
import { SHOP_UNLOCK_COINS, getShopItem, parseExtraItemId } from '../data/shop';

export interface GameState {
  readonly coins: number;
  /** Residentes que han llegado a cada recinto (0 = recinto cerrado). */
  readonly counts: Readonly<Record<PenId, number>>;
  readonly shopUnlocked: boolean;
}
```

```ts
export function initialCounts(): Record<PenId, number> {
  const counts = {} as Record<PenId, number>;
  for (const id of PEN_IDS) counts[id] = PENS[id].cost === undefined ? 1 : 0;
  return counts;
}
```

```ts
export function penCount(state: GameState, id: PenId): number {
  return state.counts[id] ?? 0;
}

export function isPenOpen(state: GameState, id: PenId): boolean {
  return penCount(state, id) > 0;
}

export function openPens(state: GameState): PenId[] {
  return PEN_IDS.filter((id) => isPenOpen(state, id));
}

function withCount(state: GameState, id: PenId, count: number, cost: number): GameState {
  return { ...state, coins: state.coins - cost, counts: { ...state.counts, [id]: count } };
}

/** El siguiente residente de un recinto ya abierto. Su precio lo marca su especie. */
export function buyExtra(state: GameState, id: PenId): PurchaseResult {
  if (!state.shopUnlocked) return { ok: false, error: 'shop-locked' };
  const count = penCount(state, id);
  if (count === 0) return { ok: false, error: 'pen-closed' };
  const next = nextResident(id, count);
  const cost = next ? ANIMALS[next.species].extraCost : undefined;
  if (!next || cost === undefined) return { ok: false, error: 'pen-full' };
  if (state.coins < cost) return { ok: false, error: 'not-enough-coins' };
  return { ok: true, state: withCount(state, id, count + 1, cost) };
}

/** Compra un artículo de la tienda: un recinto (`pantera`) o un animal extra (`extra-cabra`). */
export function purchase(state: GameState, itemId: string): PurchaseResult {
  const extra = parseExtraItemId(itemId);
  if (extra) return buyExtra(state, extra);
  const item = getShopItem(itemId);
  if (!item) return { ok: false, error: 'unknown-item' };
  if (!state.shopUnlocked) return { ok: false, error: 'shop-locked' };
  if (isPenOpen(state, item.penId)) return { ok: false, error: 'already-owned' };
  if (state.coins < item.cost) return { ok: false, error: 'not-enough-coins' };
  return { ok: true, state: withCount(state, item.penId, 1, item.cost) };
}
```

`game/src/core/save.ts`: cambiar el import y las dos funciones de conteo; en el resto del archivo, `AnimalId` → `PenId`, `ANIMAL_IDS` → `PEN_IDS`, `isAnimalId` → `isPenId`.

```ts
import { PEN_IDS, isPenId, penCapacity, type PenId } from '../data/pens';
```

```ts
/** Conteos válidos: enteros entre 0 y la capacidad del recinto; los recintos de inicio, al menos 1. */
function sanitizeCounts(raw: Partial<Record<PenId, unknown>>): Record<PenId, number> {
  const base = initialCounts();
  const counts = {} as Record<PenId, number>;
  for (const id of PEN_IDS) {
    const value = raw[id];
    const n = typeof value === 'number' && Number.isInteger(value) ? value : 0;
    counts[id] = Math.min(penCapacity(id), Math.max(base[id], n));
  }
  return counts;
}

function countsFromUnlocked(ids: readonly PenId[]): Record<PenId, number> {
  const raw: Partial<Record<PenId, number>> = {};
  for (const id of ids) raw[id] = 1;
  return sanitizeCounts(raw);
}
```

`game/src/core/book.ts`, primera función:

```ts
export function isPageUnlocked(state: GameState, page: BookPage): boolean {
  return !page.unlock || penCount(state, page.unlock.penId) >= page.unlock.count;
}
```

`game/src/core/shopEntries.ts` completo:

```ts
import { ANIMALS, type AnimalId } from '../data/animals';
import { PEN_IDS, PENS, nextResident, penCapacity, type PenId } from '../data/pens';
import { extraItemId, shopItemForPen } from '../data/shop';
import { isPenOpen, penCount, type GameState } from './economy';

export type ShopEntryStatus = 'buy' | 'owned' | 'full';

/** Artículo visible en la tienda: un recinto por abrir o "otro animal" para un recinto abierto. */
export interface ShopEntry {
  id: string;
  kind: 'pen' | 'extra';
  penId: PenId;
  /** Especie que se dibuja en la peana: el animal que llegaría (o el último, si ya no cabe más). */
  species: AnimalId;
  cost: number;
  status: ShopEntryStatus;
  /** Solo en extras: animales que hay y máximo del recinto. */
  count?: number;
  max?: number;
}

/**
 * Un artículo por recinto, como en las tiendas de otros juegos: el recinto mientras no se tenga y,
 * al comprarlo, su "otro animal" ocupa su sitio (así no quedan peanas "ya compradas" que confunden).
 */
export function shopEntries(state: GameState): ShopEntry[] {
  const entries: ShopEntry[] = [];
  for (const penId of PEN_IDS) {
    const residents = PENS[penId].residents;
    const open = isPenOpen(state, penId);
    const count = penCount(state, penId);
    const max = penCapacity(penId);
    const pen = shopItemForPen(penId);
    const coming = nextResident(penId, count) ?? residents[residents.length - 1]!;
    const extraCost = ANIMALS[coming.species].extraCost;
    const hasExtra = open && max > 1 && extraCost !== undefined;
    if (pen && !hasExtra) {
      entries.push({ id: pen.id, kind: 'pen', penId, species: residents[0]!.species, cost: pen.cost, status: open ? 'owned' : 'buy' });
    }
    if (hasExtra && extraCost !== undefined) {
      entries.push({
        id: extraItemId(penId),
        kind: 'extra',
        penId,
        species: coming.species,
        cost: extraCost,
        status: count >= max ? 'full' : 'buy',
        count,
        max,
      });
    }
  }
  return entries;
}
```

- [ ] **Step 6: Eventos y sesión**

`game/src/systems/events.ts`: cambiar imports y tres eventos.

```ts
import type { Settings } from '../core/save';
import type { Reaction } from '../data/animals';
import type { PenId } from '../data/pens';
```

```ts
  'animal-unlocked': { penId: PenId };
  /** Un residente más en un recinto que ya estaba abierto. */
  'animal-added': { penId: PenId; count: number; residentId: string };
  /** Se ha dado de comer a un residente: su recinto entero lo celebra. */
  'animal-fed': { penId: PenId; residentId: string; reaction: Reaction };
```

`game/src/systems/session.ts`: cambiar imports, el bucle de `update` y `feed`.

```ts
import type { FoodId } from '../data/foods';
import { PEN_IDS, PENS, findResident } from '../data/pens';
```

(se quita el import de `../data/animals`)

```ts
    for (const penId of PEN_IDS) {
      const before = previous.counts[penId];
      const count = next.counts[penId];
      if (count <= before) continue;
      if (before === 0) this.events.emit('animal-unlocked', { penId });
      else this.events.emit('animal-added', { penId, count, residentId: PENS[penId].residents[count - 1]!.id });
    }
```

```ts
  /** Da de comer a un animal concreto. La reacción y las monedas las marca su especie. */
  async feed(residentId: string, foodId: FoodId): Promise<FeedResult> {
    const found = findResident(residentId);
    if (!found) throw new Error(`Residente desconocido: ${residentId}`);
    const result = resolveFeeding(found.resident.species, foodId);
    this.events.emit('animal-fed', { penId: found.penId, residentId, reaction: result.reaction });
    if (result.coins > 0) await this.earnCoins(result.coins);
    return result;
  }
```

- [ ] **Step 7: Escenas y mundo (ajuste de tipos, sin cambiar el comportamiento)**

`game/src/scenes/FeedScene.ts`:

```ts
import { ANIMALS, trayFoods, type AnimalId } from '../data/animals';
import { findResident } from '../data/pens';
import { t, type StringKey } from '../data/strings';

export interface FeedSceneData {
  residentId: string;
}
```

Campos e `init`:

```ts
  private residentId = 'bills';
  private animalId: AnimalId = 'leon';
```

```ts
  init(data: FeedSceneData): void {
    const found = findResident(data.residentId);
    if (!found) throw new Error(`Residente desconocido: ${data.residentId}`);
    this.residentId = data.residentId;
    this.animalId = found.resident.species;
    this.foods.clear();
    this.homes.clear();
    this.dragging = null;
    this.busy = false;
    this.pool = [];
  }
```

En `create`, quitar `const def = ANIMALS[this.animalId];` si ya no se usa y cambiar el título por el nombre del residente (la clave de su página del libro, que es una frase completa):

```ts
    const title = t(`book.page.${this.residentId}.title` as StringKey);
    this.add.text(width / 2, height * 0.64, title, textStyle(Math.round(height * 0.05))).setOrigin(0.5);
```

En `feed`: `const result = await getSession().feed(this.residentId, id);`

`game/src/world/Pens.ts`:
- Imports: quitar `isAnimalId`, `ANIMALS` y `type AnimalId` de `../data/animals` (queda `type Reaction`); añadir `import { PENS, isPenId, residentsIn, type PenId, type ResidentDef } from '../data/pens';`; `shopItemForPen` ya viene renombrado.
- `Wanderer` gana `residentId: string | null;` y la fábrica pasa a:

```ts
const wanderer = (walker: Walker, residentId: string | null, rest = Math.random() * 2000): Wanderer => ({
  walker,
  residentId,
  roam: { pos: { x: walker.x, y: walker.y }, target: null, rest },
  base: { x: walker.x, y: walker.y },
  phase: Math.random() * Math.PI * 2,
});
```

- `Pen.id`, `DoorstepEvent.animalId` → `penId: PenId`, `atDoorstep`, y los parámetros de `lockedPenAt`, `animalsIn`, `celebrate` y `pen` pasan a `PenId`. `DoorstepEvent` queda `{ penId: PenId; locked: boolean }`.
- En el constructor:

```ts
      if (!isPenId(enclosure.animalId)) continue;
      const id = enclosure.animalId;
      const gate = gates.find((g) => g.animalId === id);
      if (!gate) continue;
      const def = PENS[id];
```

```ts
      // El primero se dibuja siempre (en fantasma si el recinto está cerrado).
      const here: ResidentDef[] = residentsIn(id, Math.max(1, penCount(state, id)));
      const count = here.length;
      const hasCompanion = Boolean(getArt()?.companions[id]);
      const spots = spreadPositions(space, count + (hasCompanion ? 1 : 0), Math.random);
      const spot = (i: number): Vec => spots[i] ?? home;
      const animals = here.map((resident, i) => {
        const p = spot(i);
        return wanderer(createAnimal(scene, resident.species, p.x, p.y), resident.id);
      });
      const companionAt = spot(count);
      const companionWalker = hasCompanion ? createCompanion(scene, id, companionAt.x, companionAt.y) : null;
      const companion = companionWalker ? wanderer(companionWalker, null, 500 + Math.random() * 1500) : null;
```

- `addAnimal` crea al siguiente residente:

```ts
    const resident = PENS[pen.id].residents[pen.animals.length];
    if (!resident) return;
    const w = wanderer(createAnimal(this.scene, resident.species, entry.x, entry.y), resident.id, 800);
```

- En `onKeeperTile`: `return id ? { penId: id, locked: !isPenOpen(state, id) } : null;`

`game/src/scenes/WorldScene.ts`:
- Import: `import { PENS, type PenId } from '../data/pens';` en lugar del de `../data/animals`.
- `bus.on('animal-fed', ({ penId, reaction }) => this.pens.celebrate(penId, reaction));`
- En `update`: `this.openFeed(PENS[doorstep.penId].residents[0]!.id);`
- `animalsInPen(penId: PenId)`.
- `openFeed`:

```ts
  private openFeed(residentId: string): void {
    this.stopWalking();
    sfx.play('tap');
    this.scene.pause();
    const data: FeedSceneData = { residentId };
    this.scene.launch('Feed', data);
  }
```

`game/src/scenes/HudScene.ts` líneas 4 y 58–59:

```ts
import { PENS } from '../data/pens';
```

```ts
      bus.on('animal-unlocked', ({ penId }) =>
        this.showToast(t('toast.newAnimal', { name: t(PENS[penId].nameKey) })),
```

`game/src/world/Decor.ts` líneas 5 y 72–74: `import { PENS, isPenId } from '../data/pens';`, `isPenId(enclosure.animalId)` y `t(PENS[enclosure.animalId].nameKey)`.

`game/src/scenes/ShopScene.ts` líneas 386 y 452: `entry.animalId` → `entry.species` en las dos.

`game/src/systems/testHooks.ts`: `import type { PenId } from '../data/pens';` en lugar del de `AnimalId`; `openFeed(residentId: string): void;` con `game.scene.start('Feed', { residentId })`; `counts(): Record<PenId, number>;`; `animalsInPen(penId: PenId): number;`.

- [ ] **Step 8: Arreglar los tests que quedan**

Run: `npm run typecheck`

Corrige cada error que señale en `tests/unit/` con estas reglas, sin cambiar lo que comprueba cada test:
- `ANIMALS[id].maxCount` → `penCapacity(id)` (import de `../../src/data/pens`).
- `ANIMALS[id].unlockedByDefault` → `PENS[id].cost === undefined`.
- `item.animalId` de un artículo de tienda → `item.penId`.
- `unlock.animalId` de una página → `unlock.penId`.
- En `content.test.ts`, el test `'%s: si admite extras, tiene precio y texto'` pasa a recorrer `PEN_IDS`: para cada residente a partir del segundo, `ANIMALS[r.species].extraCost` es mayor que 0 y `extraNameKey` tiene texto.

En `game/tests/e2e/play.spec.ts` línea 65: `window.__ZOO__!.openFeed('bills')`.

- [ ] **Step 9: Ver que todo pasa**

Run: `npm test && npm run typecheck && npm run test:e2e`
Expected: unitarias y e2e en verde; sin errores de tipos.

- [ ] **Step 10: Comprobar una partida antigua**

Añadir a `game/tests/unit/save.test.ts`:

```ts
  it('una partida de la 2.2.0 se lee igual tras separar recintos y especies', () => {
    const old = {
      version: 2,
      state: { coins: 77, counts: { leon: 1, cabra: 3, pantera: 2, panda: 0 }, shopUnlocked: true },
      settings: { music: false, sfx: true, joystick: true },
      book: { seen: ['cover', 'gordi'], hinted: true, page: 'gordi' },
    };
    expect(parseSave(old)).toEqual(old);
  });
```

Run: `npm test -- save`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add game/src game/tests
git commit -m "refactor: el juego cuenta por recinto y da de comer a un residente"
```

---

### Task 4: Rejilla de la cuidadora y "el animal más cercano"

**Files:**
- Create: `game/src/core/penGrid.ts`
- Modify: `game/src/core/interaction.ts`
- Test: `game/tests/unit/penGrid.test.ts`, `game/tests/unit/interaction.test.ts`

**Interfaces:**
- Consumes: `WalkGrid`, `createGrid`, `isWalkable` de `core/pathfinding.ts`; `PenSpace` de `core/flock.ts`; `rectContains`, `Vec`.
- Produces: `withPenInteriors(grid: WalkGrid, spaces: readonly PenSpace[], tile: number): WalkGrid`; `nearestWithin<T extends Vec>(items: readonly T[], point: Vec, radius: number): T | null`.

- [ ] **Step 1: Escribir los tests que fallan**

`game/tests/unit/penGrid.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { withPenInteriors } from '../../src/core/penGrid';
import { findPath, isWalkable } from '../../src/core/pathfinding';
import { gridFromAscii } from './helpers';

const T = 16;
// Recinto de 5x4 casillas en (1,0): valla '#', puerta '.' en (3,3), camino debajo.
const base = gridFromAscii([
  '#######',
  '#######',
  '#######',
  '###.###',
  '.......',
]);
// Interior: casillas (2..4, 1..2).
const space = { inner: { x: 2 * T, y: 1 * T, width: 3 * T, height: 2 * T }, obstacles: [] };

describe('withPenInteriors', () => {
  it('abre el interior del recinto y deja la valla cerrada', () => {
    const grid = withPenInteriors(base, [space], T);
    expect(isWalkable(grid, 2, 1)).toBe(true);
    expect(isWalkable(grid, 4, 2)).toBe(true);
    expect(isWalkable(grid, 1, 1)).toBe(false);
    expect(isWalkable(grid, 2, 0)).toBe(false);
    expect(isWalkable(grid, 5, 2)).toBe(false);
  });

  it('se puede entrar desde el camino por la puerta', () => {
    const grid = withPenInteriors(base, [space], T);
    expect(findPath(grid, { x: 0, y: 4 }, { x: 2, y: 1 })).not.toBeNull();
  });

  it('una roca dentro no se pisa', () => {
    const rock = { x: 3 * T, y: 1 * T, width: T, height: T };
    const grid = withPenInteriors(base, [{ ...space, obstacles: [rock] }], T);
    expect(isWalkable(grid, 3, 1)).toBe(false);
    expect(isWalkable(grid, 3, 2)).toBe(true);
  });

  it('sin recintos abiertos la rejilla no cambia', () => {
    expect(withPenInteriors(base, [], T).cells).toEqual(base.cells);
  });
});
```

Añadir a `game/tests/unit/interaction.test.ts`:

```ts
import { nearestWithin } from '../../src/core/interaction';

describe('nearestWithin', () => {
  const items = [
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 10, y: 0 },
  ];

  it('da el más cercano dentro del radio', () => {
    expect(nearestWithin(items, { x: 7, y: 0 }, 14)?.id).toBe('b');
  });

  it('da null si ninguno está dentro del radio', () => {
    expect(nearestWithin(items, { x: 50, y: 0 }, 14)).toBeNull();
    expect(nearestWithin([], { x: 0, y: 0 }, 14)).toBeNull();
  });
});
```

- [ ] **Step 2: Ver que fallan**

Run: `npm test -- penGrid interaction`
Expected: FAIL, no existen `penGrid` ni `nearestWithin`.

- [ ] **Step 3: Implementar**

`game/src/core/penGrid.ts`:

```ts
import type { PenSpace } from './flock';
import { rectContains } from './interaction';
import { createGrid, isWalkable, type WalkGrid } from './pathfinding';

/**
 * Rejilla de la cuidadora: los caminos de siempre más el interior de los recintos abiertos.
 * La valla sigue cerrada (se entra por la puerta, que ya es camino) y las rocas, árboles y agua
 * del recinto no se pisan. Los visitantes siguen usando la rejilla original.
 */
export function withPenInteriors(grid: WalkGrid, spaces: readonly PenSpace[], tile: number): WalkGrid {
  const inside = (x: number, y: number): boolean => {
    const center = { x: x * tile + tile / 2, y: y * tile + tile / 2 };
    return spaces.some((s) => rectContains(s.inner, center) && !s.obstacles.some((o) => rectContains(o, center)));
  };
  return createGrid(grid.width, grid.height, (x, y) => isWalkable(grid, x, y) || inside(x, y));
}
```

Añadir al final de `game/src/core/interaction.ts`:

```ts
/** El elemento más cercano a `point` a no más de `radius`, o null. */
export function nearestWithin<T extends Vec>(items: readonly T[], point: Vec, radius: number): T | null {
  let best: T | null = null;
  let bestDistance = radius;
  for (const item of items) {
    const distance = Math.hypot(item.x - point.x, item.y - point.y);
    if (distance <= bestDistance) {
      best = item;
      bestDistance = distance;
    }
  }
  return best;
}
```

- [ ] **Step 4: Ver que pasan**

Run: `npm test -- penGrid interaction`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add game/src/core/penGrid.ts game/src/core/interaction.ts game/tests/unit/penGrid.test.ts game/tests/unit/interaction.test.ts
git commit -m "feat: rejilla de la cuidadora con el interior de los recintos"
```

---

### Task 5: La cuidadora entra y da de comer al animal que se toca

**Files:**
- Modify: `game/src/world/Pens.ts`
- Modify: `game/src/scenes/WorldScene.ts`
- Modify: `game/src/systems/testHooks.ts`
- Test: `game/tests/e2e/play.spec.ts`

**Interfaces:**
- Consumes: `withPenInteriors`, `nearestWithin` (Task 4); `FeedSceneData { residentId }` (Task 3).
- Produces en `Pens`:
  - `openSpaces(state: GameState): PenSpace[]`
  - `residentAt(point: Vec, state: GameState, radius: number): { penId: PenId; residentId: string } | null`
  - `positionOf(residentId: string): Vec | null`
  - `anchorOf(residentId: string): Vec | null` (punto sobre la cabeza; lo usarán los iconos de hambre o enfermedad)
  - `hold(residentId: string): void`, `release(): void`
  - `lockedDoorstep(keeperTile: Point, state: GameState): PenId | null` (sustituye a `onKeeperTile`)
  - `contains(penId: PenId, point: Vec): boolean`
- Produces en `WorldScene`: `feedResident(residentId: string): boolean`, `residentScreenPos(residentId: string): Vec | null`, `keeperInPen(penId: PenId): boolean`.
- Produces en `ZooTestApi`: `feedResident`, `residentScreenPos`, `keeperInPen`.

Comportamiento:
- Tocar un animal de un recinto abierto manda a la cuidadora hasta él, entrando por la puerta. El animal se queda quieto esperándola. Al llegar se abre la ventana de comer con ese animal.
- Con joystick o teclado, la ventana se abre al acercarse andando a un animal.
- Al cerrar la ventana no se vuelve a abrir hasta que la cuidadora se aparte o se toque un animal.
- Pisar la puerta ya no abre nada. En un recinto cerrado sigue saliendo el aviso de comprarlo.
- La leona (acompañante) no se alimenta: tocarla solo lleva a la cuidadora hasta allí.

- [ ] **Step 1: Escribir los e2e que fallan**

En `game/tests/e2e/play.spec.ts`, sustituir el test `'ir al león: al llegar a su puerta se abre la comida y se le da arrastrando'` entero por estos dos (se conservan sus comprobaciones de monedas):

```ts
test('tocar al león: la cuidadora entra en su recinto y se le da de comer arrastrando', async ({ page }) => {
  await startGame(page);
  expect(await page.evaluate(() => window.__ZOO__!.feedResident('bills'))).toBe(true);
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Feed'), undefined, { timeout: 30_000 });
  expect(await page.evaluate(() => window.__ZOO__!.keeperInPen('leon'))).toBe(true);

  await dragFood(page, 'carne');
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.hudCoinsText())).toBe('🪙 1');

  await dragFood(page, 'piedra');
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.hudCoinsText())).toBe('🪙 1');

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => {
    const scenes = window.__ZOO__?.activeScenes() ?? [];
    return scenes.includes('World') && !scenes.includes('Feed');
  });
  // Sigue al lado del león: no se vuelve a abrir sola.
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__ZOO__!.activeScenes())).not.toContain('Feed');
});

test('con el dedo: tocar al animal que está al lado abre su comida', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.feedResident('bills'));
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Feed'), undefined, { timeout: 30_000 });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__ZOO__?.activeScenes().includes('Feed'));

  const pos = await page.evaluate(() => window.__ZOO__!.residentScreenPos('bills'));
  const box = await canvasBox(page);
  await page.mouse.click(box.x + pos!.x, box.y + pos!.y);
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Feed'), undefined, { timeout: 10_000 });
});

test('pisar la puerta de un recinto abierto ya no abre la comida', async ({ page }) => {
  await startGame(page);
  const approach = await page.evaluate(() => window.__ZOO__!.gateApproachTile('leon'));
  await page.evaluate(([x, y]) => window.__ZOO__!.goToTile(x!, y!), [approach!.x, approach!.y]);
  await expect
    .poll(() => page.evaluate(() => window.__ZOO__!.keeperPosition()), { timeout: 20_000 })
    .toEqual({ x: approach!.x * 16 + 8, y: approach!.y * 16 + 8 });
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__ZOO__!.activeScenes())).not.toContain('Feed');
});
```

- [ ] **Step 2: Ver que fallan**

Run: `npm run test:e2e -- play`
Expected: FAIL, `feedResident` no es una función.

- [ ] **Step 3: `Pens`: identidad, tocar, retener**

En `game/src/world/Pens.ts`:

Import: `import { gateAtDoorstep, nearestWithin, rectContains, type Rect } from '../core/interaction';`

Campo nuevo en la clase:

```ts
  /** Residente al que va a dar de comer la cuidadora: se queda quieto esperándola. */
  private held: string | null = null;
```

En `update`, el animal retenido no pasea:

```ts
      for (const w of all) {
        if (w.residentId !== null && w.residentId === this.held) {
          w.walker.stop();
          continue;
        }
        if (art) this.roam(pen, w, all, delta);
```

Sustituir `onKeeperTile` por `lockedDoorstep` y añadir las consultas nuevas:

```ts
  /**
   * Recinto cerrado delante de cuya puerta acaba de llegar la cuidadora (para avisar de que se compra
   * en la tienda). Solo al llegar; no se repite hasta que se aparte de la puerta.
   */
  lockedDoorstep(keeperTile: Point, state: GameState): PenId | null {
    const gate = gateAtDoorstep(keeperTile, this.pens.map((pen) => ({ animalId: pen.id, tile: pen.gate })));
    const id = gate?.animalId ?? null;
    if (id === this.atDoorstep) return null;
    this.atDoorstep = id;
    return id && !isPenOpen(state, id) ? id : null;
  }

  /** Interior de los recintos abiertos: por ahí puede andar la cuidadora. */
  openSpaces(state: GameState): PenSpace[] {
    return this.pens.filter((pen) => isPenOpen(state, pen.id)).map((pen) => pen.space);
  }

  /** El residente de un recinto abierto más cercano a `point`, a no más de `radius`. */
  residentAt(point: Vec, state: GameState, radius: number): { penId: PenId; residentId: string } | null {
    const candidates = this.pens
      .filter((pen) => isPenOpen(state, pen.id))
      .flatMap((pen) =>
        pen.animals.flatMap((w) =>
          w.residentId === null ? [] : [{ x: w.walker.x, y: w.walker.y, penId: pen.id, residentId: w.residentId }],
        ),
      );
    const hit = nearestWithin(candidates, point, radius);
    return hit ? { penId: hit.penId, residentId: hit.residentId } : null;
  }

  positionOf(residentId: string): Vec | null {
    const w = this.find(residentId);
    return w ? { x: w.walker.x, y: w.walker.y } : null;
  }

  /** Punto sobre la cabeza del animal, donde irán los iconos de estado (hambre, enfermo). */
  anchorOf(residentId: string): Vec | null {
    const w = this.find(residentId);
    return w ? { x: w.walker.x, y: w.walker.y - 16 } : null;
  }

  hold(residentId: string): void {
    this.held = residentId;
  }

  release(): void {
    this.held = null;
  }

  contains(penId: PenId, point: Vec): boolean {
    return rectContains(this.pen(penId).rect, point);
  }

  private find(residentId: string): Wanderer | null {
    for (const pen of this.pens) {
      const w = pen.animals.find((a) => a.residentId === residentId);
      if (w) return w;
    }
    return null;
  }
```

Borrar la interfaz `DoorstepEvent` (ya no se usa).

- [ ] **Step 4: `WorldScene`: dos rejillas, tocar un animal y abrir al llegar**

En `game/src/scenes/WorldScene.ts`:

Imports nuevos: `import { withPenInteriors } from '../core/penGrid';` y `import type { PenId } from '../data/pens';` (ya no hace falta `PENS`).

Constantes, bajo `TAP_MAX_DISTANCE`:

```ts
/** Radio (px) alrededor de un animal en el que un toque cuenta como tocarlo. */
const TAP_REACH = 14;
/** Distancia (px) a la que la cuidadora ya puede dar de comer a un animal. */
const FEED_REACH = 18;
```

Campos:

```ts
  /** Solo caminos: por aquí andan los visitantes. */
  private pathGrid!: WalkGrid;
  /** Residente hacia el que va la cuidadora para darle de comer. */
  private feedTarget: string | null = null;
  /** Residente junto al que está (para abrir la comida solo al llegar). */
  private nearResident: string | null = null;
```

En `create`, sustituir la creación de la rejilla, los recintos y los visitantes:

```ts
    this.pathGrid = buildWalkGrid(mapData);
```

```ts
    const state = getSession().state;
    this.pens = new Pens(this, readEnclosures(mapData), readGates(mapData), state, readProps(mapData));
    this.grid = withPenInteriors(this.pathGrid, this.pens.openSpaces(state), TILE_SIZE);
    const shopInfo = readShop(mapData);
    this.shop = shopInfo ? new ShopBuilding(this, shopInfo, state) : null;
    this.visitors = new VisitorCrowd(this, this.pathGrid);
```

y poner `this.feedTarget = null; this.nearResident = null;` junto a `this.route = [];`.

`update` completo:

```ts
  update(time: number, delta: number): void {
    this.visitors.update(delta);
    this.pens.update(time, delta);
    const before = this.keeperPosition();
    this.moveKeeper(delta);
    const pos = this.keeperPosition();
    const moved = pos.x !== before.x || pos.y !== before.y;

    const state = getSession().state;
    if (this.reachResident(pos, moved, state)) return;

    const tile = worldToTile(this.keeper, TILE_SIZE);
    if (this.pens.lockedDoorstep(tile, state)) bus.emit('toast', { text: t('toast.needShop') });
    const doorEvent = this.shop?.onKeeperTile(tile, state) ?? null;
    if (doorEvent === 'open') this.openShop();
    else if (doorEvent === 'locked') bus.emit('toast', { text: t('toast.shopLocked', { n: SHOP_UNLOCK_COINS }) });
  }

  /**
   * Abre la comida al llegar junto a un animal: el que se ha tocado o, andando con joystick o teclado,
   * el que quede al lado. Solo al llegar: no se repite hasta que la cuidadora se aparte.
   */
  private reachResident(pos: Vec, moved: boolean, state: GameState): boolean {
    let reached: string | null;
    if (this.feedTarget) {
      const at = this.pens.positionOf(this.feedTarget);
      reached = at && Math.hypot(at.x - pos.x, at.y - pos.y) <= FEED_REACH ? this.feedTarget : null;
      // No hay camino hasta él: se deja de esperar.
      if (!reached && this.route.length === 0) this.cancelFeedTarget();
    } else {
      reached = this.pens.residentAt(pos, state, FEED_REACH)?.residentId ?? null;
    }
    if (reached === this.nearResident) return false;
    this.nearResident = reached;
    if (!reached || !(moved || this.feedTarget)) return false;
    this.openFeed(reached);
    return true;
  }

  private cancelFeedTarget(): void {
    this.feedTarget = null;
    this.pens.release();
  }

  /** Manda a la cuidadora a dar de comer a un animal concreto. False si ese animal no está en el zoo. */
  feedResident(residentId: string): boolean {
    const at = this.pens.positionOf(residentId);
    if (!at) return false;
    this.feedTarget = residentId;
    this.nearResident = null;
    this.pens.hold(residentId);
    this.goTo(at);
    return true;
  }

  residentScreenPos(residentId: string): Vec | null {
    const at = this.pens.positionOf(residentId);
    return at ? this.worldToScreen(at) : null;
  }

  keeperInPen(penId: PenId): boolean {
    return this.pens.contains(penId, this.keeperPosition());
  }
```

Añadir `type GameState` al import: `import type { GameState } from '../core/economy';`.

En `moveKeeper`, dentro de `if (length > 0) {`, la primera línea pasa a cancelar el destino (andar a mano anula el toque):

```ts
      this.route = [];
      this.marker.setVisible(false);
      if (this.feedTarget) this.cancelFeedTarget();
```

`onPointerUp`, las tres últimas líneas pasan a:

```ts
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const world = { x: point.x, y: point.y };
    const state = getSession().state;
    const hit = this.pens.residentAt(world, state, TAP_REACH);
    if (hit) {
      this.feedResident(hit.residentId);
      return;
    }
    this.cancelFeedTarget();
    if (this.pens.lockedPenAt(world, state)) bus.emit('toast', { text: t('toast.needShop') });
    this.goTo(world);
```

`openFeed` deja de esperar a nadie pero mantiene quieto al animal mientras la ventana está abierta:

```ts
  private openFeed(residentId: string): void {
    this.stopWalking();
    this.feedTarget = null;
    this.pens.hold(residentId);
    sfx.play('tap');
    this.scene.pause();
    const data: FeedSceneData = { residentId };
    this.scene.launch('Feed', data);
  }
```

`onResume` suelta al animal y rehace la rejilla (puede haberse abierto un recinto en la tienda):

```ts
  private onResume(_sys: Phaser.Scenes.Systems, data?: { from?: string }): void {
    if (data?.from === 'shop') this.leaveShop();
    const state = getSession().state;
    this.pens.release();
    this.pens.syncUnlocks(state);
    this.grid = withPenInteriors(this.pathGrid, this.pens.openSpaces(state), TILE_SIZE);
    this.shop?.sync(state);
  }
```

`gateApproachTile` debe seguir devolviendo la casilla de fuera: usa `this.pathGrid` en lugar de `this.grid` en esa función.

- [ ] **Step 5: Ganchos de prueba**

En `game/src/systems/testHooks.ts`, añadir a `ZooTestApi`:

```ts
  /** Manda a la cuidadora a dar de comer a un animal (lo mismo que tocarlo). */
  feedResident(residentId: string): boolean;
  residentScreenPos(residentId: string): Vec | null;
  keeperInPen(penId: PenId): boolean;
```

y a la implementación:

```ts
    feedResident: (residentId) => activeScene<WorldScene>('World')?.feedResident(residentId) ?? false,
    residentScreenPos: (residentId) => activeScene<WorldScene>('World')?.residentScreenPos(residentId) ?? null,
    keeperInPen: (penId) => activeScene<WorldScene>('World')?.keeperInPen(penId) ?? false,
```

- [ ] **Step 6: Ver que todo pasa**

Run: `npm run typecheck && npm test && npm run test:e2e`
Expected: todo en verde.

- [ ] **Step 7: Probar a mano en el navegador**

Arranca el servidor con la herramienta de preview (configuración `dev` de `.claude/launch.json`, que ejecuta `npm run dev` en `game/`; créala si no existe) y comprueba:

1. Tocar al león desde el camino: la cuidadora entra por la puerta, él la espera y se abre la ventana con el título "Bills, el león".
2. Cerrar la ventana: no se reabre; tocar a la leona solo mueve a la cuidadora.
3. Tocar una cabra, cerrar y tocar otra dentro del mismo recinto: se abre con el nombre de la segunda (hace falta tener dos; usa `window.__ZOO__.addCoins(100)` y compra una en la tienda).
4. La cuidadora no atraviesa rocas, árboles ni la catarata de la pantera, y los animales no salen por la puerta.
5. Los visitantes no entran en ningún recinto.
6. Un recinto cerrado sigue enseñando candado y el aviso de la tienda.

Haz una captura del paso 1 para enseñársela a David.

- [ ] **Step 8: Commit**

```bash
git add game/src game/tests
git commit -m "feat: la cuidadora entra en el recinto y da de comer al animal que se toca"
```

---

### Task 6: Documentación

**Files:**
- Modify: `docs/superpowers/specs/2026-10-05-zoo-grande-design.md` (añadir al final)
- Modify: `docs/superpowers/specs/2026-09-27-motor-phaser-v3-design.md` (sección "Añadir un animal" y "Dar de comer")
- Modify: `game/README.md`, `README.md`

**Interfaces:** ninguna.

- [ ] **Step 1: Estado en el spec del zoo grande**

Añadir al final de `docs/superpowers/specs/2026-10-05-zoo-grande-design.md`:

```markdown
## Estado de implementación

| Plan | Estado | Archivo |
|---|---|---|
| 1. Cimientos | ✅ Hecho | `docs/superpowers/plans/2026-10-05-zoo-grande-1-cimientos.md` |
| 2. Arte y comidas | ⬜ Plan por escribir | — |
| 3. Mapa y recintos | ⬜ Plan por escribir | — |
| 4. Tienda y libro | ⬜ Plan por escribir | — |

### Decisiones tomadas durante la implementación (plan 1)

- `data/animals.ts` se queda como tabla de especies (no se renombra a `species.ts`): `AnimalId` es
  la especie y `PenId` (`data/pens.ts`) el recinto.
- Al llegar junto al animal la ventana de comer se abre sola, sin bocadillo intermedio, igual que
  antes pasaba al llegar a la puerta. `Pens.anchorOf(residente)` da el punto sobre la cabeza para
  los futuros iconos de hambre o enfermedad.
- La cuidadora tiene su propia rejilla (caminos más interior de recintos abiertos); los visitantes
  usan la de caminos.
- En el mapa, la propiedad de recintos y puertas sigue llamándose `animalId` hasta que el plan 3
  regenere el mapa.
```

- [ ] **Step 2: Contrato de contenido en el spec del motor**

En `docs/superpowers/specs/2026-09-27-motor-phaser-v3-design.md`, sustituir los tres puntos de "Añadir un animal (contrato de contenido)" por:

```markdown
1. Especie en `data/animals.ts`: nombre (clave de `strings.ts`), reacciones solo para las comidas
   de su bandeja (4 o 5), monedas y precio del animal suelto.
2. Recinto en `data/pens.ts`: precio y lista ordenada de residentes (`id`, especie, aspecto). El
   `id` del residente es el de su página en `data/book.ts`.
3. Hoja de sprites del aspecto en el manifiesto de arte.
4. En el mapa, rectángulo `recinto` y objeto `puerta` con el id del recinto.
```

y en "Dar de comer", sustituir el punto de la puerta por: "Tocar un animal lleva a la cuidadora dentro de su recinto; al llegar junto a él se abre `Feed` con ese animal."

- [ ] **Step 3: READMEs**

En `game/README.md` y `README.md`, donde se explique cómo se da de comer (busca "puerta"), cambiar la frase por: "Toca un animal: la cuidadora entra en su recinto y, al llegar, se abre la bandeja de comida de ese animal."

- [ ] **Step 4: Commit**

```bash
git add docs README.md game/README.md
git commit -m "docs: cimientos del zoo grande (recintos, residentes, entrar a dar de comer)"
```

---

## Self-Review

- **Cobertura del spec (lo que toca a este plan):** modelo especie/recinto/residente → Tasks 1 y 3; `counts` por recinto y partidas antiguas → Task 3 (pasos 5 y 10); el extra compra el siguiente residente con el precio de su especie → Task 3; reacciones parciales y bandeja de 4–5 → Task 2; la cuidadora entra y da de comer al animal tocado, en los 4 recintos → Tasks 4 y 5; `residentId` en el evento → Task 3; ancla para iconos de estado → Task 5; textos solo en `strings.ts` → se reutiliza `book.page.<id>.title`. Fuera de este plan y asignado en la tabla de planes: variantes de aspecto y comidas nuevas (2), mapa, recintos nuevos, visitantes y corazones (3), tienda, precios, libro por capítulos y test de textos (4).
- **Tipos:** `PenId`, `ResidentDef`, `penCount`/`isPenOpen`/`openPens`, `shopItemForPen`, `ShopEntry.penId`/`species`, `FeedSceneData.residentId`, `Session.feed(residentId, foodId)` y los tres eventos se usan con el mismo nombre en todas las tareas.
- **Riesgo conocido:** la rejilla del mapa solo marca como camino `PATH` y `GATE`; el interior de los recintos es césped, por eso hace falta `withPenInteriors`. Si un animal se mete en una casilla tapada por un obstáculo, `findPathOrNearest` lleva a la cuidadora a la más cercana y `FEED_REACH` (18 px) cubre esa diferencia.
