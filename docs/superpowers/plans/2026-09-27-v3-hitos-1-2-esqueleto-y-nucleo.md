# ZooEsponji v3 — Hitos 1–2: esqueleto y núcleo — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tener el proyecto Phaser 4 + TypeScript funcionando en web y preparado para Android, con la lógica del juego (reacciones, economía, guardado, A\*) portada y testeada, y un mapa de prueba de Tiled por el que el cuidador se mueve tocando el suelo o con el teclado, con las monedas en el HUD y guardadas.

**Architecture:** Proyecto nuevo en `game/` (el juego v1/v2 de la raíz no se toca). La lógica vive en `game/src/core/` como TypeScript puro sin Phaser y se prueba con Vitest; `game/src/data/` guarda el contenido tipado; las escenas de Phaser en `game/src/scenes/` solo dibujan y recogen input y se comunican por un bus de eventos tipado. El arte de este plan es provisional y se genera en código (texturas de colores), así que no depende de ningún pack.

**Tech Stack:** Phaser 4.2.1, TypeScript 5 (estricto), Vite 8, Vitest 5, Playwright 1.x, Capacitor 8 (+ `@capacitor/preferences`), Node 24, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-27-motor-phaser-v3-design.md`

**Plan 1 de 3.** Este plan cubre los hitos 1 (esqueleto) y 2 (núcleo). Quedan para planes siguientes: hitos 3–4 (`FeedScene` con drag & drop, `ShopScene`, recintos bloqueados, animales en sus recintos, visitantes paseando y joystick opcional) y hitos 5–6 (arte y sonido definitivos, atlas, ciclo de vida, botón atrás, puerta parental, aviso de girar, manejador global de errores, sprites de reserva, publicación).

## Global Constraints

- Directorio de trabajo de todos los comandos: `game/` (salvo que se indique otro). Rama: `v3-phaser`.
- `game/src/core/` **no importa** `phaser` ni usa `window`/`document`.
- TypeScript con `"strict": true`. `npm run typecheck` sin errores al terminar cada tarea.
- Phaser se importa siempre como `import * as Phaser from 'phaser';` (Phaser 4 no tiene export por defecto).
- Tiles de **16 px**; `pixelArt: true`, `roundPixels: true`; zoom de cámara siempre entero.
- Identificadores de contenido en español, igual que hoy: animales `leon`, `cabra`, `pantera`, `panda`; comidas `piedra`, `carne`, `conejo`, `zanahoria`; reacciones `come`, `rechaza`, `especial`.
- Progresión: la tienda se desbloquea al **alcanzar 20 monedas**; pantera cuesta **50**, panda **100**; león y cabra desbloqueados de inicio.
- Textos visibles al jugador solo desde `game/src/data/strings.ts`.
- Nada de SDKs de analítica o de envío de errores (Families Policy).
- Cada commit termina con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- El hook de pre-commit (Gitleaks) debe pasar; nunca usar `--no-verify`.

## Mapa de archivos

```
game/
├── package.json, package-lock.json, tsconfig.json, vite.config.ts,
│   vitest.config.ts, playwright.config.ts, capacitor.config.ts,
│   index.html, .gitignore, README.md
├── scripts/make-test-map.mjs        — genera el mapa de prueba de Tiled
├── public/assets/maps/test-map.tmj  — mapa de prueba (generado)
├── src/
│   ├── main.ts                      — crea el Phaser.Game
│   ├── config.ts                    — constantes (TILE_SIZE, claves de texturas…)
│   ├── core/
│   │   ├── reactions.ts             — resolveFeeding
│   │   ├── economy.ts               — GameState, addCoins, purchase…
│   │   ├── save.ts                  — SaveData, loadSave, writeSave, migración v1.1
│   │   ├── pathfinding.ts           — WalkGrid, findPath, findPathOrNearest
│   │   ├── tiledmap.ts              — lee mapas de Tiled: rejilla y objetos
│   │   └── movement.ts              — stepAlongPath, tryMove, conversiones
│   ├── data/
│   │   ├── strings.ts  foods.ts  animals.ts  shop.ts
│   ├── systems/
│   │   ├── viewport.ts              — computeZoom
│   │   ├── events.ts                — EventBus tipado + bus global
│   │   ├── storage.ts               — stores memoria / web / Capacitor
│   │   ├── createStore.ts           — elige store según plataforma
│   │   ├── session.ts               — partida en curso + guardado + eventos
│   │   └── testHooks.ts             — window.__ZOO__ (solo en desarrollo)
│   └── scenes/
│       ├── BootScene.ts  PreloadScene.ts  TitleScene.ts
│       ├── WorldScene.ts  HudScene.ts
├── tests/unit/*.test.ts, tests/unit/helpers.ts
├── tests/e2e/smoke.spec.ts
└── android/                         — generado por Capacitor
.github/workflows/game-ci.yml
.claude/launch.json
```

---

### Task 1: Esqueleto del proyecto (Vite + TypeScript + Phaser + Vitest)

**Files:**
- Create: `game/package.json` (vía `npm init`), `game/tsconfig.json`, `game/vite.config.ts`, `game/vitest.config.ts`, `game/index.html`, `game/.gitignore`, `game/src/main.ts`, `game/src/config.ts`, `game/src/scenes/BootScene.ts`, `game/src/systems/viewport.ts`, `.claude/launch.json`
- Test: `game/tests/unit/viewport.test.ts`

**Interfaces:**
- Produces: `computeZoom(viewWidth: number, viewHeight: number, baseHeight?: number): number` y `BASE_VIEW_HEIGHT = 180` en `src/systems/viewport.ts`; constantes en `src/config.ts`: `TILE_SIZE = 16`, `KEEPER_SPEED = 64`, `TEXTURES = { tiles, keeper, marker }`, `MAPS = { test }`.

- [x] **Step 1: Crear el proyecto e instalar dependencias**

Desde la raíz del repo:

```bash
mkdir game && cd game && npm init -y
npm install phaser@4.2.1
npm install -D typescript@5 vite@8 vitest@5 @types/node@24
```

Editar `game/package.json` para que quede así (conservar las versiones que haya escrito npm en `dependencies`/`devDependencies`):

```json
{
  "name": "zooesponji",
  "private": true,
  "version": "3.0.0-dev",
  "type": "module",
  "license": "GPL-3.0-or-later",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "make:test-map": "node scripts/make-test-map.mjs"
  },
  "dependencies": {
    "phaser": "4.2.1"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "typescript": "^5.0.0",
    "vite": "^8.0.0",
    "vitest": "^5.0.0"
  }
}
```

- [x] **Step 2: Configuración de TypeScript, Vite y Vitest**

`game/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "tests", "*.ts"]
}
```

`game/vite.config.ts`:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas: funciona en davidpladel.com/zooesponji/ y dentro de Capacitor.
  base: './',
  server: { port: 5173, strictPort: true },
  build: { target: 'es2022', assetsInlineLimit: 0, chunkSizeWarningLimit: 2000 },
});
```

`game/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
```

`game/.gitignore`:

```
node_modules/
dist/
test-results/
playwright-report/
```

- [x] **Step 3: Escribir el test de `computeZoom` (falla)**

`game/tests/unit/viewport.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BASE_VIEW_HEIGHT, computeZoom } from '../../src/systems/viewport';

describe('computeZoom', () => {
  it('usa 180 px de mundo visibles en vertical como base', () => {
    expect(BASE_VIEW_HEIGHT).toBe(180);
  });

  it.each([
    [844, 390, 2], // móvil en horizontal
    [1280, 720, 4],
    [1920, 1080, 6],
    [300, 150, 1], // más pequeño que la base: nunca menos de 1
    [0, 0, 1], // tamaño aún no conocido
  ])('%i×%i → zoom %i', (w, h, zoom) => {
    expect(computeZoom(w, h)).toBe(zoom);
  });

  it('siempre devuelve un entero', () => {
    expect(Number.isInteger(computeZoom(1000, 555))).toBe(true);
  });
});
```

- [x] **Step 4: Ejecutar y ver que falla**

Run: `npm test`
Expected: FAIL — no se puede resolver `../../src/systems/viewport`.

- [x] **Step 5: Implementar `viewport.ts` y `config.ts`**

`game/src/systems/viewport.ts`:

```ts
/** Píxeles de mundo que se ven en vertical con el zoom mínimo razonable (~11 tiles). */
export const BASE_VIEW_HEIGHT = 180;

/** Zoom entero de la cámara del mundo para que el pixel art se vea nítido. */
export function computeZoom(viewWidth: number, viewHeight: number, baseHeight = BASE_VIEW_HEIGHT): number {
  if (viewWidth <= 0 || viewHeight <= 0) return 1;
  return Math.max(1, Math.floor(viewHeight / baseHeight));
}
```

`game/src/config.ts`:

```ts
export const TILE_SIZE = 16;

/** Velocidad del cuidador en píxeles de mundo por segundo (4 tiles/s). */
export const KEEPER_SPEED = 64;

export const TEXTURES = {
  tiles: 'tiles-placeholder',
  keeper: 'keeper-placeholder',
  marker: 'marker-placeholder',
} as const;

export const MAPS = {
  test: 'test-map',
} as const;
```

- [x] **Step 6: Ejecutar y ver que pasa**

Run: `npm test`
Expected: PASS (7 tests).

- [x] **Step 7: Arranque mínimo de Phaser**

`game/index.html`:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
    />
    <title>ZooEsponji</title>
    <style>
      html,
      body {
        margin: 0;
        height: 100%;
        overflow: hidden;
        background: #1d2b1f;
        touch-action: none;
      }
      #game {
        position: fixed;
        inset: 0;
      }
    </style>
  </head>
  <body>
    <div id="game"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`game/src/scenes/BootScene.ts` (provisional; la Tarea 10 la reemplaza):

```ts
import * as Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, 'ZooEsponji v3 — motor listo', {
        fontFamily: 'sans-serif',
        fontSize: '32px',
        color: '#ffd54a',
      })
      .setOrigin(0.5);
  }
}
```

`game/src/main.ts` (provisional; la Tarea 10 lo reemplaza):

```ts
import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1d2b1f',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  scene: [BootScene],
});
```

`.claude/launch.json` (en la **raíz** del repo, para abrir el juego en el navegador integrado):

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "game",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev", "--prefix", "game"],
      "port": 5173
    }
  ]
}
```

- [x] **Step 8: Verificar typecheck, build y que se ve en el navegador**

Run: `npm run typecheck && npm run build`
Expected: sin errores; se crea `game/dist/index.html`.

Arrancar con `preview_start` (nombre `game`) y comprobar con una captura que se ve el texto amarillo "ZooEsponji v3 — motor listo" centrado sobre fondo verde oscuro. Parar el servidor después.

- [x] **Step 9: Commit**

```bash
git add game/package.json game/package-lock.json game/tsconfig.json game/vite.config.ts game/vitest.config.ts game/index.html game/.gitignore game/src game/tests ../.claude/launch.json
git commit -m "feat(v3): esqueleto Phaser 4 + TypeScript + Vite + Vitest" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Contenido tipado (textos, comidas, animales, tienda)

**Files:**
- Create: `game/src/data/strings.ts`, `game/src/data/foods.ts`, `game/src/data/animals.ts`, `game/src/data/shop.ts`
- Test: `game/tests/unit/content.test.ts`

**Interfaces:**
- Produces:
  - `strings.ts`: `STRINGS_ES`, `type StringKey`, `t(key: StringKey): string`
  - `foods.ts`: `FOOD_IDS`, `type FoodId`, `interface FoodDef { id; nameKey; emoji }`, `FOODS: Record<FoodId, FoodDef>`
  - `animals.ts`: `ANIMAL_IDS`, `type AnimalId`, `type Reaction = 'come' | 'rechaza' | 'especial'`, `interface AnimalDef { id; nameKey; emoji; reactions: Record<FoodId, Reaction>; coins: { come: number; especial?: number }; unlockedByDefault: boolean }`, `ANIMALS: Record<AnimalId, AnimalDef>`, `isAnimalId(value: string): value is AnimalId`
  - `shop.ts`: `SHOP_UNLOCK_COINS = 20`, `interface ShopItemDef { id: string; animalId: AnimalId; cost: number }`, `SHOP_ITEMS: readonly ShopItemDef[]`, `getShopItem(id: string): ShopItemDef | undefined`

- [x] **Step 1: Escribir los tests de coherencia (fallan)**

`game/tests/unit/content.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ANIMAL_IDS, ANIMALS, isAnimalId } from '../../src/data/animals';
import { FOOD_IDS, FOODS } from '../../src/data/foods';
import { SHOP_ITEMS, SHOP_UNLOCK_COINS, getShopItem } from '../../src/data/shop';
import { STRINGS_ES, t } from '../../src/data/strings';

describe('contenido: animales', () => {
  it('contiene los 4 animales actuales', () => {
    expect([...ANIMAL_IDS]).toEqual(['leon', 'cabra', 'pantera', 'panda']);
  });

  it.each(ANIMAL_IDS)('%s tiene reacción para todas las comidas', (id) => {
    for (const food of FOOD_IDS) {
      expect(['come', 'rechaza', 'especial']).toContain(ANIMALS[id].reactions[food]);
    }
  });

  it.each(ANIMAL_IDS)('%s da monedas por comer y, si tiene especial, por especial', (id) => {
    const animal = ANIMALS[id];
    expect(animal.coins.come).toBeGreaterThan(0);
    const hasSpecial = FOOD_IDS.some((f) => animal.reactions[f] === 'especial');
    if (hasSpecial) expect(animal.coins.especial).toBeGreaterThan(0);
  });

  it.each(ANIMAL_IDS)('%s tiene nombre en la tabla de textos', (id) => {
    expect(STRINGS_ES[ANIMALS[id].nameKey]).toBeTruthy();
  });

  it('isAnimalId distingue ids válidos', () => {
    expect(isAnimalId('leon')).toBe(true);
    expect(isAnimalId('tigre')).toBe(false);
  });

  it('león y cabra vienen desbloqueados; pantera y panda no', () => {
    expect(ANIMALS.leon.unlockedByDefault).toBe(true);
    expect(ANIMALS.cabra.unlockedByDefault).toBe(true);
    expect(ANIMALS.pantera.unlockedByDefault).toBe(false);
    expect(ANIMALS.panda.unlockedByDefault).toBe(false);
  });
});

describe('contenido: comidas', () => {
  it.each(FOOD_IDS)('%s tiene nombre y emoji', (id) => {
    expect(t(FOODS[id].nameKey)).toBeTruthy();
    expect(FOODS[id].emoji).toBeTruthy();
  });
});

describe('contenido: tienda', () => {
  it('la tienda se desbloquea a las 20 monedas', () => {
    expect(SHOP_UNLOCK_COINS).toBe(20);
  });

  it('pantera cuesta 50 y panda 100', () => {
    expect(getShopItem('pantera')?.cost).toBe(50);
    expect(getShopItem('panda')?.cost).toBe(100);
  });

  it('todo animal no desbloqueado de inicio se puede comprar, y solo esos', () => {
    const lockedAnimals = ANIMAL_IDS.filter((id) => !ANIMALS[id].unlockedByDefault).sort();
    const sold = SHOP_ITEMS.map((item) => item.animalId).sort();
    expect(sold).toEqual(lockedAnimals);
  });

  it('getShopItem devuelve undefined para ids desconocidos', () => {
    expect(getShopItem('delfines')).toBeUndefined();
  });
});
```

- [x] **Step 2: Ejecutar y ver que falla**

Run: `npm test -- content`
Expected: FAIL — no se resuelven los módulos de `src/data/`.

- [x] **Step 3: Implementar el contenido**

`game/src/data/strings.ts`:

```ts
export const STRINGS_ES = {
  'title.play': 'Jugar',
  'animal.leon': 'León',
  'animal.cabra': 'Cabra',
  'animal.pantera': 'Pantera negra',
  'animal.panda': 'Oso panda',
  'food.piedra': 'Piedra',
  'food.carne': 'Carne',
  'food.conejo': 'Conejo',
  'food.zanahoria': 'Zanahoria',
} as const;

export type StringKey = keyof typeof STRINGS_ES;

export function t(key: StringKey): string {
  return STRINGS_ES[key];
}
```

`game/src/data/foods.ts`:

```ts
import type { StringKey } from './strings';

export const FOOD_IDS = ['piedra', 'carne', 'conejo', 'zanahoria'] as const;
export type FoodId = (typeof FOOD_IDS)[number];

export interface FoodDef {
  id: FoodId;
  nameKey: StringKey;
  emoji: string;
}

export const FOODS: Record<FoodId, FoodDef> = {
  piedra: { id: 'piedra', nameKey: 'food.piedra', emoji: '🪨' },
  carne: { id: 'carne', nameKey: 'food.carne', emoji: '🥩' },
  conejo: { id: 'conejo', nameKey: 'food.conejo', emoji: '🐇' },
  zanahoria: { id: 'zanahoria', nameKey: 'food.zanahoria', emoji: '🥕' },
};
```

`game/src/data/animals.ts`:

```ts
import type { FoodId } from './foods';
import type { StringKey } from './strings';

export const ANIMAL_IDS = ['leon', 'cabra', 'pantera', 'panda'] as const;
export type AnimalId = (typeof ANIMAL_IDS)[number];

export type Reaction = 'come' | 'rechaza' | 'especial';

export interface AnimalDef {
  id: AnimalId;
  nameKey: StringKey;
  emoji: string;
  reactions: Record<FoodId, Reaction>;
  coins: { come: number; especial?: number };
  unlockedByDefault: boolean;
}

export const ANIMALS: Record<AnimalId, AnimalDef> = {
  leon: {
    id: 'leon',
    nameKey: 'animal.leon',
    emoji: '🦁',
    reactions: { carne: 'come', conejo: 'come', piedra: 'rechaza', zanahoria: 'rechaza' },
    coins: { come: 1 },
    unlockedByDefault: true,
  },
  cabra: {
    id: 'cabra',
    nameKey: 'animal.cabra',
    emoji: '🐐',
    reactions: { carne: 'rechaza', conejo: 'especial', piedra: 'come', zanahoria: 'come' },
    coins: { come: 1, especial: 2 },
    unlockedByDefault: true,
  },
  pantera: {
    id: 'pantera',
    nameKey: 'animal.pantera',
    emoji: '🐆',
    reactions: { carne: 'come', conejo: 'come', piedra: 'rechaza', zanahoria: 'rechaza' },
    coins: { come: 2 },
    unlockedByDefault: false,
  },
  panda: {
    id: 'panda',
    nameKey: 'animal.panda',
    emoji: '🐼',
    reactions: { carne: 'rechaza', conejo: 'especial', piedra: 'rechaza', zanahoria: 'come' },
    coins: { come: 2, especial: 4 },
    unlockedByDefault: false,
  },
};

export function isAnimalId(value: string): value is AnimalId {
  return (ANIMAL_IDS as readonly string[]).includes(value);
}
```

`game/src/data/shop.ts`:

```ts
import type { AnimalId } from './animals';

/** Monedas que hay que alcanzar (no gastar) para abrir la tienda. */
export const SHOP_UNLOCK_COINS = 20;

export interface ShopItemDef {
  id: string;
  animalId: AnimalId;
  cost: number;
}

export const SHOP_ITEMS: readonly ShopItemDef[] = [
  { id: 'pantera', animalId: 'pantera', cost: 50 },
  { id: 'panda', animalId: 'panda', cost: 100 },
];

export function getShopItem(id: string): ShopItemDef | undefined {
  return SHOP_ITEMS.find((item) => item.id === id);
}
```

- [x] **Step 4: Ejecutar y ver que pasa**

Run: `npm test -- content && npm run typecheck`
Expected: PASS, sin errores de tipos.

- [x] **Step 5: Commit**

```bash
git add game/src/data game/tests/unit/content.test.ts
git commit -m "feat(v3): contenido tipado de animales, comidas, tienda y textos" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `core/reactions.ts` — resultado de dar de comer

**Files:**
- Create: `game/src/core/reactions.ts`
- Test: `game/tests/unit/reactions.test.ts`

**Interfaces:**
- Consumes: `ANIMALS`, `AnimalId`, `Reaction` (`data/animals.ts`); `FoodId` (`data/foods.ts`).
- Produces: `interface FeedResult { reaction: Reaction; coins: number }` y `resolveFeeding(animalId: AnimalId, foodId: FoodId): FeedResult`.

- [x] **Step 1: Escribir los tests (portados de `tests/data.test.js` de la v1.1, fallan)**

`game/tests/unit/reactions.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveFeeding } from '../../src/core/reactions';
import type { AnimalId } from '../../src/data/animals';
import type { FoodId } from '../../src/data/foods';

describe('resolveFeeding', () => {
  it.each<[AnimalId, FoodId, string, number]>([
    ['leon', 'carne', 'come', 1],
    ['leon', 'conejo', 'come', 1],
    ['leon', 'piedra', 'rechaza', 0],
    ['leon', 'zanahoria', 'rechaza', 0],
    ['cabra', 'carne', 'rechaza', 0],
    ['cabra', 'conejo', 'especial', 2],
    ['cabra', 'piedra', 'come', 1],
    ['cabra', 'zanahoria', 'come', 1],
    ['pantera', 'carne', 'come', 2],
    ['pantera', 'conejo', 'come', 2],
    ['pantera', 'piedra', 'rechaza', 0],
    ['pantera', 'zanahoria', 'rechaza', 0],
    ['panda', 'carne', 'rechaza', 0],
    ['panda', 'conejo', 'especial', 4],
    ['panda', 'piedra', 'rechaza', 0],
    ['panda', 'zanahoria', 'come', 2],
  ])('%s + %s → %s (%i monedas)', (animal, food, reaction, coins) => {
    expect(resolveFeeding(animal, food)).toEqual({ reaction, coins });
  });
});
```

- [x] **Step 2: Ejecutar y ver que falla**

Run: `npm test -- reactions`
Expected: FAIL — no se resuelve `../../src/core/reactions`.

- [x] **Step 3: Implementar**

`game/src/core/reactions.ts`:

```ts
import { ANIMALS, type AnimalId, type Reaction } from '../data/animals';
import type { FoodId } from '../data/foods';

export interface FeedResult {
  reaction: Reaction;
  coins: number;
}

export function resolveFeeding(animalId: AnimalId, foodId: FoodId): FeedResult {
  const animal = ANIMALS[animalId];
  const reaction = animal.reactions[foodId];
  if (reaction === 'rechaza') return { reaction, coins: 0 };
  return { reaction, coins: animal.coins[reaction] ?? 0 };
}
```

- [x] **Step 4: Ejecutar y ver que pasa**

Run: `npm test -- reactions && npm run typecheck`
Expected: PASS (16 tests).

- [x] **Step 5: Commit**

```bash
git add game/src/core/reactions.ts game/tests/unit/reactions.test.ts
git commit -m "feat(v3): core de reacciones portado de v1.1 con tests" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `core/economy.ts` — monedas, tienda y desbloqueos

**Files:**
- Create: `game/src/core/economy.ts`
- Test: `game/tests/unit/economy.test.ts`

**Interfaces:**
- Consumes: `ANIMALS`, `ANIMAL_IDS`, `AnimalId` (`data/animals.ts`); `SHOP_UNLOCK_COINS`, `getShopItem` (`data/shop.ts`).
- Produces:
  - `interface GameState { readonly coins: number; readonly unlocked: readonly AnimalId[]; readonly shopUnlocked: boolean }`
  - `initialState(): GameState`
  - `addCoins(state: GameState, amount: number): GameState` (lanza `Error` si `amount` no es entero ≥ 0)
  - `isAnimalUnlocked(state: GameState, id: AnimalId): boolean`
  - `type PurchaseError = 'unknown-item' | 'shop-locked' | 'already-owned' | 'not-enough-coins'`
  - `type PurchaseResult = { ok: true; state: GameState } | { ok: false; error: PurchaseError }`
  - `purchase(state: GameState, itemId: string): PurchaseResult`
  - Todas las funciones son puras: nunca modifican el estado recibido.

- [x] **Step 1: Escribir los tests (fallan)**

`game/tests/unit/economy.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { addCoins, initialState, isAnimalUnlocked, purchase, type GameState } from '../../src/core/economy';

function withCoins(coins: number, extra: Partial<GameState> = {}): GameState {
  return { ...initialState(), coins, shopUnlocked: coins >= 20, ...extra };
}

describe('initialState', () => {
  it('empieza con 0 monedas, león y cabra, y tienda cerrada', () => {
    expect(initialState()).toEqual({ coins: 0, unlocked: ['leon', 'cabra'], shopUnlocked: false });
  });
});

describe('addCoins', () => {
  it('suma monedas', () => {
    expect(addCoins(addCoins(initialState(), 1), 2).coins).toBe(3);
  });

  it('abre la tienda justo al alcanzar 20', () => {
    expect(addCoins(withCoins(18), 1).shopUnlocked).toBe(false);
    expect(addCoins(withCoins(19), 1).shopUnlocked).toBe(true);
  });

  it('no modifica el estado original', () => {
    const state = initialState();
    addCoins(state, 5);
    expect(state.coins).toBe(0);
  });

  it.each([-1, 1.5, Number.NaN])('rechaza cantidades no válidas (%s)', (amount) => {
    expect(() => addCoins(initialState(), amount)).toThrow();
  });
});

describe('isAnimalUnlocked', () => {
  it('refleja la lista de desbloqueados', () => {
    expect(isAnimalUnlocked(initialState(), 'leon')).toBe(true);
    expect(isAnimalUnlocked(initialState(), 'panda')).toBe(false);
  });
});

describe('purchase', () => {
  it('compra la pantera: descuenta 50 y la desbloquea', () => {
    const result = purchase(withCoins(60), 'pantera');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.coins).toBe(10);
    expect(result.state.unlocked).toContain('pantera');
  });

  it('la tienda sigue abierta después de gastar por debajo de 20', () => {
    const result = purchase(withCoins(60), 'pantera');
    expect(result.ok && result.state.shopUnlocked).toBe(true);
  });

  it('falla si no hay monedas suficientes', () => {
    expect(purchase(withCoins(99), 'panda')).toEqual({ ok: false, error: 'not-enough-coins' });
  });

  it('falla si la tienda está cerrada', () => {
    expect(purchase(withCoins(60, { shopUnlocked: false }), 'pantera')).toEqual({
      ok: false,
      error: 'shop-locked',
    });
  });

  it('falla si ya lo tienes', () => {
    const owned = withCoins(200, { unlocked: ['leon', 'cabra', 'pantera'] });
    expect(purchase(owned, 'pantera')).toEqual({ ok: false, error: 'already-owned' });
  });

  it('falla con un producto desconocido', () => {
    expect(purchase(withCoins(200), 'delfines')).toEqual({ ok: false, error: 'unknown-item' });
  });

  it('no modifica el estado original', () => {
    const state = withCoins(60);
    purchase(state, 'pantera');
    expect(state.coins).toBe(60);
    expect(state.unlocked).toEqual(['leon', 'cabra']);
  });
});
```

- [x] **Step 2: Ejecutar y ver que falla**

Run: `npm test -- economy`
Expected: FAIL — no se resuelve `../../src/core/economy`.

- [x] **Step 3: Implementar**

`game/src/core/economy.ts`:

```ts
import { ANIMAL_IDS, ANIMALS, type AnimalId } from '../data/animals';
import { SHOP_UNLOCK_COINS, getShopItem } from '../data/shop';

export interface GameState {
  readonly coins: number;
  readonly unlocked: readonly AnimalId[];
  readonly shopUnlocked: boolean;
}

export type PurchaseError = 'unknown-item' | 'shop-locked' | 'already-owned' | 'not-enough-coins';
export type PurchaseResult = { ok: true; state: GameState } | { ok: false; error: PurchaseError };

export function initialState(): GameState {
  return {
    coins: 0,
    unlocked: ANIMAL_IDS.filter((id) => ANIMALS[id].unlockedByDefault),
    shopUnlocked: false,
  };
}

export function addCoins(state: GameState, amount: number): GameState {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(`Cantidad de monedas no válida: ${amount}`);
  }
  const coins = state.coins + amount;
  return { ...state, coins, shopUnlocked: state.shopUnlocked || coins >= SHOP_UNLOCK_COINS };
}

export function isAnimalUnlocked(state: GameState, id: AnimalId): boolean {
  return state.unlocked.includes(id);
}

export function purchase(state: GameState, itemId: string): PurchaseResult {
  const item = getShopItem(itemId);
  if (!item) return { ok: false, error: 'unknown-item' };
  if (!state.shopUnlocked) return { ok: false, error: 'shop-locked' };
  if (state.unlocked.includes(item.animalId)) return { ok: false, error: 'already-owned' };
  if (state.coins < item.cost) return { ok: false, error: 'not-enough-coins' };
  return {
    ok: true,
    state: { ...state, coins: state.coins - item.cost, unlocked: [...state.unlocked, item.animalId] },
  };
}
```

- [x] **Step 4: Ejecutar y ver que pasa**

Run: `npm test -- economy && npm run typecheck`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add game/src/core/economy.ts game/tests/unit/economy.test.ts
git commit -m "feat(v3): core de economia (monedas, tienda, compras) inmutable y testeado" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `core/save.ts` + stores de memoria y web

**Files:**
- Create: `game/src/core/save.ts`, `game/src/systems/storage.ts`
- Test: `game/tests/unit/save.test.ts`, `game/tests/unit/storage.test.ts`

**Interfaces:**
- Consumes: `initialState`, `GameState` (`core/economy.ts`); `ANIMAL_IDS`, `isAnimalId`, `AnimalId` (`data/animals.ts`); `SHOP_UNLOCK_COINS` (`data/shop.ts`).
- Produces (`core/save.ts`):
  - `interface KeyValueStore { get(key: string): Promise<string | null>; set(key: string, value: string): Promise<void> }`
  - `interface Settings { music: boolean; sfx: boolean; joystick: boolean }`
  - `SAVE_VERSION = 1`, `interface SaveData { version: 1; state: GameState; settings: Settings }`
  - `SAVE_KEY = 'zooesponji_v3_save'`, `BACKUP_KEY = 'zooesponji_v3_save_backup'`, `LEGACY_COINS_KEY = 'zooesponji_coins'`, `LEGACY_PURCHASES_KEY = 'zooesponji_purchases'`
  - `defaultSettings(): Settings`, `defaultSave(): SaveData`
  - `parseSave(value: unknown): SaveData | null`
  - `migrateLegacy(coinsRaw: string | null, purchasesRaw: string | null): SaveData | null`
  - `loadSave(store: KeyValueStore): Promise<SaveData>`, `writeSave(store: KeyValueStore, data: SaveData): Promise<void>`
- Produces (`systems/storage.ts`):
  - `createMemoryStore(initial?: Record<string, string>): KeyValueStore & { dump(): Record<string, string> }`
  - `createWebStore(storage?: WebStorageLike | null): KeyValueStore`, con `type WebStorageLike = Pick<Storage, 'getItem' | 'setItem'>`

- [x] **Step 1: Escribir los tests de `storage.ts` (fallan)**

`game/tests/unit/storage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createMemoryStore, createWebStore } from '../../src/systems/storage';

function fakeWebStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

describe('createMemoryStore', () => {
  it('guarda y lee valores', async () => {
    const store = createMemoryStore({ a: '1' });
    expect(await store.get('a')).toBe('1');
    await store.set('b', '2');
    expect(await store.get('b')).toBe('2');
    expect(store.dump()).toEqual({ a: '1', b: '2' });
  });

  it('devuelve null para claves que no existen', async () => {
    expect(await createMemoryStore().get('nada')).toBeNull();
  });
});

describe('createWebStore', () => {
  it('delega en el storage del navegador', async () => {
    const web = fakeWebStorage();
    const store = createWebStore(web);
    await store.set('k', 'v');
    expect(web.getItem('k')).toBe('v');
    expect(await store.get('k')).toBe('v');
  });

  it('no revienta si el navegador bloquea el storage', async () => {
    const broken = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const store = createWebStore(broken);
    await expect(store.set('k', 'v')).resolves.toBeUndefined();
    expect(await store.get('k')).toBeNull();
  });

  it('sin storage disponible funciona en memoria', async () => {
    const store = createWebStore(null);
    await store.set('k', 'v');
    expect(await store.get('k')).toBe('v');
  });
});
```

- [x] **Step 2: Escribir los tests de `save.ts` (fallan)**

`game/tests/unit/save.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  BACKUP_KEY,
  LEGACY_COINS_KEY,
  LEGACY_PURCHASES_KEY,
  SAVE_KEY,
  defaultSave,
  loadSave,
  migrateLegacy,
  parseSave,
  writeSave,
} from '../../src/core/save';
import { createMemoryStore } from '../../src/systems/storage';

describe('parseSave', () => {
  it('acepta una partida válida', () => {
    const data = defaultSave();
    expect(parseSave(JSON.parse(JSON.stringify(data)))).toEqual(data);
  });

  it.each([
    ['null', null],
    ['versión desconocida', { ...defaultSave(), version: 99 }],
    ['monedas negativas', { ...defaultSave(), state: { ...defaultSave().state, coins: -3 } }],
    ['monedas con decimales', { ...defaultSave(), state: { ...defaultSave().state, coins: 1.5 } }],
    ['sin lista de desbloqueados', { version: 1, state: { coins: 1 }, settings: {} }],
  ])('rechaza: %s', (_label, value) => {
    expect(parseSave(value)).toBeNull();
  });

  it('descarta animales desconocidos y siempre incluye los de inicio', () => {
    const parsed = parseSave({
      version: 1,
      state: { coins: 5, unlocked: ['panda', 'tigre'], shopUnlocked: true },
      settings: {},
    });
    expect(parsed?.state.unlocked).toEqual(['leon', 'cabra', 'panda']);
  });

  it('rellena ajustes que falten con los valores por defecto', () => {
    const parsed = parseSave({
      version: 1,
      state: { coins: 0, unlocked: [], shopUnlocked: false },
      settings: { music: false },
    });
    expect(parsed?.settings).toEqual({ music: false, sfx: true, joystick: false });
  });
});

describe('migrateLegacy (partidas de la v1.1)', () => {
  it('sin datos antiguos devuelve null', () => {
    expect(migrateLegacy(null, null)).toBeNull();
  });

  it('trae monedas y compras', () => {
    const migrated = migrateLegacy('37', JSON.stringify({ shop: true, pantera: true }));
    expect(migrated?.state).toEqual({ coins: 37, unlocked: ['leon', 'cabra', 'pantera'], shopUnlocked: true });
  });

  it('abre la tienda si ya había 20 monedas aunque no la comprara', () => {
    expect(migrateLegacy('25', null)?.state.shopUnlocked).toBe(true);
  });

  it('ignora valores corruptos', () => {
    const migrated = migrateLegacy('abc', 'no-es-json');
    expect(migrated?.state).toEqual({ coins: 0, unlocked: ['leon', 'cabra'], shopUnlocked: false });
  });
});

describe('loadSave / writeSave', () => {
  it('sin nada guardado devuelve la partida por defecto', async () => {
    expect(await loadSave(createMemoryStore())).toEqual(defaultSave());
  });

  it('lo que se escribe se vuelve a leer igual', async () => {
    const store = createMemoryStore();
    const data = { ...defaultSave(), state: { coins: 42, unlocked: ['leon', 'cabra'] as const, shopUnlocked: true } };
    await writeSave(store, data);
    expect(await loadSave(store)).toEqual(data);
  });

  it('partida corrupta: hace copia de seguridad y empieza de cero', async () => {
    const store = createMemoryStore({ [SAVE_KEY]: '{esto no es json' });
    expect(await loadSave(store)).toEqual(defaultSave());
    expect(await store.get(BACKUP_KEY)).toBe('{esto no es json');
  });

  it('sin partida v3 migra la de la v1.1', async () => {
    const store = createMemoryStore({
      [LEGACY_COINS_KEY]: '12',
      [LEGACY_PURCHASES_KEY]: JSON.stringify({ panda: true }),
    });
    const loaded = await loadSave(store);
    expect(loaded.state.coins).toBe(12);
    expect(loaded.state.unlocked).toContain('panda');
  });

  it('si hay partida v3, ignora la de la v1.1', async () => {
    const store = createMemoryStore({ [LEGACY_COINS_KEY]: '99' });
    await writeSave(store, defaultSave());
    expect((await loadSave(store)).state.coins).toBe(0);
  });
});
```

- [x] **Step 3: Ejecutar y ver que fallan**

Run: `npm test -- save storage`
Expected: FAIL — no se resuelven `src/core/save` ni `src/systems/storage`.

- [x] **Step 4: Implementar `core/save.ts`**

`game/src/core/save.ts`:

```ts
import { ANIMAL_IDS, isAnimalId, type AnimalId } from '../data/animals';
import { SHOP_UNLOCK_COINS } from '../data/shop';
import { initialState, type GameState } from './economy';

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export interface Settings {
  music: boolean;
  sfx: boolean;
  joystick: boolean;
}

export const SAVE_VERSION = 1;

export interface SaveData {
  version: typeof SAVE_VERSION;
  state: GameState;
  settings: Settings;
}

export const SAVE_KEY = 'zooesponji_v3_save';
export const BACKUP_KEY = 'zooesponji_v3_save_backup';
export const LEGACY_COINS_KEY = 'zooesponji_coins';
export const LEGACY_PURCHASES_KEY = 'zooesponji_purchases';

type Loose = Record<string, unknown>;

function isObject(value: unknown): value is Loose {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function uniq<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

function withDefaultAnimals(extra: readonly AnimalId[]): AnimalId[] {
  return uniq([...initialState().unlocked, ...extra]);
}

export function defaultSettings(): Settings {
  return { music: true, sfx: true, joystick: false };
}

export function defaultSave(): SaveData {
  return { version: SAVE_VERSION, state: initialState(), settings: defaultSettings() };
}

export function parseSave(value: unknown): SaveData | null {
  if (!isObject(value) || value.version !== SAVE_VERSION) return null;
  const state = value.state;
  if (!isObject(state)) return null;

  const coins = state.coins;
  if (typeof coins !== 'number' || !Number.isInteger(coins) || coins < 0) return null;
  if (!Array.isArray(state.unlocked)) return null;

  const known = state.unlocked.filter(
    (id): id is AnimalId => typeof id === 'string' && isAnimalId(id),
  );
  const rawSettings = isObject(value.settings) ? value.settings : {};
  const defaults = defaultSettings();
  const bool = (key: keyof Settings): boolean =>
    typeof rawSettings[key] === 'boolean' ? (rawSettings[key] as boolean) : defaults[key];

  return {
    version: SAVE_VERSION,
    state: { coins, unlocked: withDefaultAnimals(known), shopUnlocked: state.shopUnlocked === true },
    settings: { music: bool('music'), sfx: bool('sfx'), joystick: bool('joystick') },
  };
}

export function migrateLegacy(coinsRaw: string | null, purchasesRaw: string | null): SaveData | null {
  if (coinsRaw === null && purchasesRaw === null) return null;

  const parsedCoins = Number.parseInt(coinsRaw ?? '', 10);
  const coins = Number.isFinite(parsedCoins) && parsedCoins > 0 ? parsedCoins : 0;

  let purchases: unknown = null;
  try {
    purchases = purchasesRaw ? JSON.parse(purchasesRaw) : null;
  } catch {
    purchases = null;
  }
  const bought: Loose = isObject(purchases) ? purchases : {};
  const extra = ANIMAL_IDS.filter((id) => bought[id] === true);

  return {
    version: SAVE_VERSION,
    state: {
      coins,
      unlocked: withDefaultAnimals(extra),
      shopUnlocked: bought.shop === true || coins >= SHOP_UNLOCK_COINS,
    },
    settings: defaultSettings(),
  };
}

export async function loadSave(store: KeyValueStore): Promise<SaveData> {
  const raw = await store.get(SAVE_KEY);
  if (raw !== null) {
    let parsed: SaveData | null = null;
    try {
      parsed = parseSave(JSON.parse(raw));
    } catch {
      parsed = null;
    }
    if (parsed) return parsed;
    await store.set(BACKUP_KEY, raw);
    return defaultSave();
  }
  const legacy = migrateLegacy(await store.get(LEGACY_COINS_KEY), await store.get(LEGACY_PURCHASES_KEY));
  return legacy ?? defaultSave();
}

export async function writeSave(store: KeyValueStore, data: SaveData): Promise<void> {
  await store.set(SAVE_KEY, JSON.stringify(data));
}
```

- [x] **Step 5: Implementar `systems/storage.ts`**

`game/src/systems/storage.ts`:

```ts
import type { KeyValueStore } from '../core/save';

export type WebStorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function createMemoryStore(
  initial: Record<string, string> = {},
): KeyValueStore & { dump(): Record<string, string> } {
  const map = new Map(Object.entries(initial));
  return {
    async get(key) {
      return map.get(key) ?? null;
    },
    async set(key, value) {
      map.set(key, value);
    },
    dump() {
      return Object.fromEntries(map);
    },
  };
}

function browserLocalStorage(): WebStorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Store sobre localStorage. Si el navegador lo bloquea, nunca lanza errores. */
export function createWebStore(storage: WebStorageLike | null = browserLocalStorage()): KeyValueStore {
  if (!storage) return createMemoryStore();
  return {
    async get(key) {
      try {
        return storage.getItem(key);
      } catch {
        return null;
      }
    },
    async set(key, value) {
      try {
        storage.setItem(key, value);
      } catch (error) {
        console.error('[storage] no se pudo guardar', key, error);
      }
    },
  };
}
```

- [x] **Step 6: Ejecutar y ver que pasan**

Run: `npm test -- save storage && npm run typecheck`
Expected: PASS. (En el test "no revienta si el navegador bloquea…" aparecerá un `console.error` esperado.)

- [x] **Step 7: Commit**

```bash
git add game/src/core/save.ts game/src/systems/storage.ts game/tests/unit/save.test.ts game/tests/unit/storage.test.ts
git commit -m "feat(v3): guardado versionado con validacion, backup y migracion desde v1.1" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: `core/pathfinding.ts` — A\* y destino más cercano

**Files:**
- Create: `game/src/core/pathfinding.ts`, `game/tests/unit/helpers.ts`
- Test: `game/tests/unit/pathfinding.test.ts`

**Interfaces:**
- Produces:
  - `interface Point { x: number; y: number }` (coordenadas de tile)
  - `interface WalkGrid { readonly width: number; readonly height: number; readonly cells: Uint8Array }` (1 = transitable)
  - `createGrid(width: number, height: number, walkable: (x: number, y: number) => boolean): WalkGrid`
  - `isWalkable(grid: WalkGrid, x: number, y: number): boolean` (fuera del mapa → `false`)
  - `findPath(grid: WalkGrid, start: Point, goal: Point): Point[] | null` — incluye `start` y `goal`; 4 direcciones; camino más corto
  - `findPathOrNearest(grid: WalkGrid, start: Point, goal: Point): Point[] | null` — si `goal` no es alcanzable, ruta a la celda alcanzable más cercana (Manhattan) a `goal`; `null` solo si `start` no es transitable
- Produces (`tests/unit/helpers.ts`): `gridFromAscii(rows: string[]): WalkGrid` (`.` transitable, cualquier otro carácter bloqueado)

- [x] **Step 1: Helper de tests**

`game/tests/unit/helpers.ts`:

```ts
import { createGrid, type WalkGrid } from '../../src/core/pathfinding';

/** '.' = transitable; cualquier otro carácter = bloqueado. Todas las filas deben medir igual. */
export function gridFromAscii(rows: string[]): WalkGrid {
  const width = rows[0]?.length ?? 0;
  return createGrid(width, rows.length, (x, y) => rows[y]?.[x] === '.');
}
```

- [x] **Step 2: Escribir los tests (fallan)**

`game/tests/unit/pathfinding.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { findPath, findPathOrNearest, isWalkable, type Point } from '../../src/core/pathfinding';
import { gridFromAscii } from './helpers';

function expectContiguous(path: Point[]): void {
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)).toBe(1);
  }
}

describe('isWalkable', () => {
  const grid = gridFromAscii(['.#', '..']);
  it('lee las celdas', () => {
    expect(isWalkable(grid, 0, 0)).toBe(true);
    expect(isWalkable(grid, 1, 0)).toBe(false);
  });
  it('fuera del mapa es no transitable', () => {
    expect(isWalkable(grid, -1, 0)).toBe(false);
    expect(isWalkable(grid, 2, 0)).toBe(false);
    expect(isWalkable(grid, 0, 2)).toBe(false);
  });
});

describe('findPath', () => {
  it('línea recta', () => {
    const grid = gridFromAscii(['.....']);
    expect(findPath(grid, { x: 0, y: 0 }, { x: 4, y: 0 })).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
    ]);
  });

  it('rodea un muro por el camino más corto', () => {
    const grid = gridFromAscii([
      '.....',
      '.###.',
      '.....',
    ]);
    const path = findPath(grid, { x: 0, y: 1 }, { x: 4, y: 1 });
    expect(path).not.toBeNull();
    expect(path!.length).toBe(7); // 6 pasos
    expectContiguous(path!);
    expect(path![0]).toEqual({ x: 0, y: 1 });
    expect(path![path!.length - 1]).toEqual({ x: 4, y: 1 });
  });

  it('origen igual a destino', () => {
    const grid = gridFromAscii(['..']);
    expect(findPath(grid, { x: 1, y: 0 }, { x: 1, y: 0 })).toEqual([{ x: 1, y: 0 }]);
  });

  it('null si el destino está aislado', () => {
    const grid = gridFromAscii(['.#.']);
    expect(findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
  });

  it('null si el destino no es transitable', () => {
    const grid = gridFromAscii(['.#']);
    expect(findPath(grid, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
  });
});

describe('findPathOrNearest', () => {
  it('si se puede llegar, es igual que findPath', () => {
    const grid = gridFromAscii(['...']);
    expect(findPathOrNearest(grid, { x: 0, y: 0 }, { x: 2, y: 0 })).toEqual(
      findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 }),
    );
  });

  it('destino en un muro: va a la celda alcanzable más cercana', () => {
    const grid = gridFromAscii([
      '.....',
      '##.##',
      '##.##',
    ]);
    const path = findPathOrNearest(grid, { x: 0, y: 0 }, { x: 3, y: 2 });
    expect(path![path!.length - 1]).toEqual({ x: 2, y: 2 });
    expectContiguous(path!);
  });

  it('destino fuera del mapa: se acerca todo lo posible', () => {
    const grid = gridFromAscii(['...']);
    const path = findPathOrNearest(grid, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(path![path!.length - 1]).toEqual({ x: 2, y: 0 });
  });

  it('null si el origen no es transitable', () => {
    const grid = gridFromAscii(['#.']);
    expect(findPathOrNearest(grid, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
  });
});
```

- [x] **Step 3: Ejecutar y ver que falla**

Run: `npm test -- pathfinding`
Expected: FAIL — no se resuelve `src/core/pathfinding`.

- [x] **Step 4: Implementar**

`game/src/core/pathfinding.ts`:

```ts
export interface Point {
  x: number;
  y: number;
}

export interface WalkGrid {
  readonly width: number;
  readonly height: number;
  /** 1 = transitable, 0 = bloqueado. Índice = y * width + x. */
  readonly cells: Uint8Array;
}

const DIRECTIONS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function createGrid(
  width: number,
  height: number,
  walkable: (x: number, y: number) => boolean,
): WalkGrid {
  const cells = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells[y * width + x] = walkable(x, y) ? 1 : 0;
    }
  }
  return { width, height, cells };
}

export function isWalkable(grid: WalkGrid, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < grid.width && y < grid.height && grid.cells[y * grid.width + x] === 1;
}

function manhattan(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function findPath(grid: WalkGrid, start: Point, goal: Point): Point[] | null {
  if (!isWalkable(grid, start.x, start.y) || !isWalkable(grid, goal.x, goal.y)) return null;

  const width = grid.width;
  const startIndex = start.y * width + start.x;
  const goalIndex = goal.y * width + goal.x;

  const cost = new Map<number, number>([[startIndex, 0]]);
  const cameFrom = new Map<number, number>();
  const closed = new Set<number>();
  const open: { index: number; f: number }[] = [{ index: startIndex, f: manhattan(start, goal) }];

  while (open.length > 0) {
    // Extraer el nodo con menor f (búsqueda lineal: suficiente para mapas de este tamaño).
    let best = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i]!.f < open[best]!.f) best = i;
    }
    const current = open[best]!;
    open[best] = open[open.length - 1]!;
    open.pop();

    if (current.index === goalIndex) return reconstruct(cameFrom, goalIndex, width);
    if (closed.has(current.index)) continue;
    closed.add(current.index);

    const cx = current.index % width;
    const cy = Math.floor(current.index / width);
    const currentCost = cost.get(current.index) ?? 0;

    for (const [dx, dy] of DIRECTIONS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!isWalkable(grid, nx, ny)) continue;
      const next = ny * width + nx;
      if (closed.has(next)) continue;
      const nextCost = currentCost + 1;
      if (nextCost < (cost.get(next) ?? Number.POSITIVE_INFINITY)) {
        cost.set(next, nextCost);
        cameFrom.set(next, current.index);
        open.push({ index: next, f: nextCost + manhattan({ x: nx, y: ny }, goal) });
      }
    }
  }
  return null;
}

function reconstruct(cameFrom: Map<number, number>, end: number, width: number): Point[] {
  const path: Point[] = [];
  let current: number | undefined = end;
  while (current !== undefined) {
    path.unshift({ x: current % width, y: Math.floor(current / width) });
    current = cameFrom.get(current);
  }
  return path;
}

export function findPathOrNearest(grid: WalkGrid, start: Point, goal: Point): Point[] | null {
  const direct = findPath(grid, start, goal);
  if (direct) return direct;
  if (!isWalkable(grid, start.x, start.y)) return null;

  // BFS por todo lo alcanzable y quedarse con la celda más cercana al destino.
  const seen = new Uint8Array(grid.width * grid.height);
  const queue: Point[] = [start];
  seen[start.y * grid.width + start.x] = 1;
  let nearest = start;
  let nearestDistance = manhattan(start, goal);

  for (let i = 0; i < queue.length; i++) {
    const point = queue[i]!;
    const distance = manhattan(point, goal);
    if (distance < nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
    for (const [dx, dy] of DIRECTIONS) {
      const nx = point.x + dx;
      const ny = point.y + dy;
      if (!isWalkable(grid, nx, ny) || seen[ny * grid.width + nx]) continue;
      seen[ny * grid.width + nx] = 1;
      queue.push({ x: nx, y: ny });
    }
  }
  return findPath(grid, start, nearest);
}
```

- [x] **Step 5: Ejecutar y ver que pasa**

Run: `npm test -- pathfinding && npm run typecheck`
Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add game/src/core/pathfinding.ts game/tests/unit/helpers.ts game/tests/unit/pathfinding.test.ts
git commit -m "feat(v3): A* con destino alcanzable mas cercano" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: `core/tiledmap.ts` + mapa de prueba de Tiled

**Files:**
- Create: `game/src/core/tiledmap.ts`, `game/scripts/make-test-map.mjs`, `game/public/assets/maps/test-map.tmj` (generado)
- Test: `game/tests/unit/tiledmap.test.ts`

**Interfaces:**
- Consumes: `createGrid`, `Point`, `WalkGrid`, `findPath` (`core/pathfinding.ts`); `ANIMAL_IDS`, `isAnimalId` (`data/animals.ts`).
- Produces (`core/tiledmap.ts`):
  - Tipos `TiledProperty`, `TiledTile`, `TiledTileset`, `TiledObject`, `TiledTileLayer`, `TiledObjectLayer`, `TiledLayer`, `TiledMap` (subconjunto del formato JSON de Tiled 1.10)
  - `GROUND_LAYER = 'suelo'`, `OBJECTS_LAYER = 'objetos'`
  - `buildWalkGrid(map: TiledMap): WalkGrid` — transitable = tile con propiedad booleana `walkable: true`
  - `interface EnclosureInfo { animalId: string; x: number; y: number; width: number; height: number }` (px) y `readEnclosures(map: TiledMap): EnclosureInfo[]` — objetos de tipo `recinto`
  - `interface GateInfo { animalId: string; tile: Point }` y `readGates(map: TiledMap): GateInfo[]` — objetos de tipo `puerta`
  - `readSpawn(map: TiledMap): Point` — objeto llamado `inicio` (tile); lanza `Error` si falta
- Convenciones del mapa (las seguirá también el mapa definitivo): capa de tiles `suelo`; capa de objetos `objetos`; objetos con `type` (o `class`) `recinto` / `puerta` y propiedad string `animalId`; punto `inicio`.

- [x] **Step 1: Script que genera el mapa de prueba**

`game/scripts/make-test-map.mjs`:

```js
// Genera public/assets/maps/test-map.tmj: mapa de prueba 40x30 con caminos,
// 4 recintos vallados con puerta y punto de inicio. Tileset "placeholder"
// de 4 tiles (la textura se genera en código en BootScene).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 40;
const H = 30;
const T = 16;
const GRASS = 1;
const PATH = 2;
const FENCE = 3;
const GATE = 4;

const data = new Array(W * H).fill(GRASS);
const set = (x, y, gid) => {
  data[y * W + x] = gid;
};
const hLine = (y, x0, x1, gid) => {
  for (let x = x0; x <= x1; x++) set(x, y, gid);
};
const vLine = (x, y0, y1, gid) => {
  for (let y = y0; y <= y1; y++) set(x, y, gid);
};

// Caminos: anillo exterior + cruz central de 2 tiles de ancho.
hLine(2, 2, 37, PATH);
hLine(27, 2, 37, PATH);
vLine(2, 2, 27, PATH);
vLine(37, 2, 27, PATH);
hLine(14, 2, 37, PATH);
hLine(15, 2, 37, PATH);
vLine(19, 2, 27, PATH);
vLine(20, 2, 27, PATH);

const enclosures = [
  { animalId: 'leon', x: 5, y: 5, gate: { x: 10, y: 11 }, link: [{ x: 10, y: 12 }, { x: 10, y: 13 }] },
  { animalId: 'cabra', x: 24, y: 5, gate: { x: 29, y: 11 }, link: [{ x: 29, y: 12 }, { x: 29, y: 13 }] },
  { animalId: 'pantera', x: 5, y: 18, gate: { x: 10, y: 18 }, link: [{ x: 10, y: 16 }, { x: 10, y: 17 }] },
  { animalId: 'panda', x: 24, y: 18, gate: { x: 29, y: 18 }, link: [{ x: 29, y: 16 }, { x: 29, y: 17 }] },
];
const EW = 11;
const EH = 7;

const objects = [];
let nextId = 1;
for (const e of enclosures) {
  hLine(e.y, e.x, e.x + EW - 1, FENCE);
  hLine(e.y + EH - 1, e.x, e.x + EW - 1, FENCE);
  vLine(e.x, e.y, e.y + EH - 1, FENCE);
  vLine(e.x + EW - 1, e.y, e.y + EH - 1, FENCE);
  set(e.gate.x, e.gate.y, GATE);
  for (const p of e.link) set(p.x, p.y, PATH);

  const animalProp = [{ name: 'animalId', type: 'string', value: e.animalId }];
  objects.push({
    id: nextId++, name: `recinto-${e.animalId}`, type: 'recinto',
    x: e.x * T, y: e.y * T, width: EW * T, height: EH * T,
    rotation: 0, visible: true, properties: animalProp,
  });
  objects.push({
    id: nextId++, name: `puerta-${e.animalId}`, type: 'puerta',
    x: e.gate.x * T, y: e.gate.y * T, width: T, height: T,
    rotation: 0, visible: true, properties: animalProp,
  });
}
objects.push({
  id: nextId++, name: 'inicio', type: 'punto', point: true,
  x: 19 * T + T / 2, y: 15 * T + T / 2, width: 0, height: 0, rotation: 0, visible: true,
});

const walkable = [{ name: 'walkable', type: 'bool', value: true }];
const map = {
  compressionlevel: -1,
  width: W,
  height: H,
  tilewidth: T,
  tileheight: T,
  infinite: false,
  orientation: 'orthogonal',
  renderorder: 'right-down',
  tiledversion: '1.11.0',
  type: 'map',
  version: '1.10',
  nextlayerid: 3,
  nextobjectid: nextId,
  layers: [
    { id: 1, name: 'suelo', type: 'tilelayer', width: W, height: H, x: 0, y: 0, opacity: 1, visible: true, data },
    { id: 2, name: 'objetos', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true, objects },
  ],
  tilesets: [
    {
      firstgid: 1,
      name: 'placeholder',
      image: '../tiles/placeholder.png',
      imagewidth: T * 4,
      imageheight: T,
      tilewidth: T,
      tileheight: T,
      tilecount: 4,
      columns: 4,
      margin: 0,
      spacing: 0,
      // id = gid - firstgid: 1 = camino, 3 = puerta
      tiles: [
        { id: PATH - 1, properties: walkable },
        { id: GATE - 1, properties: walkable },
      ],
    },
  ],
};

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../public/assets/maps/test-map.tmj');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 1) + '\n');
console.log('Mapa generado en', out);
```

Run: `npm run make:test-map`
Expected: `Mapa generado en …/public/assets/maps/test-map.tmj`.

- [x] **Step 2: Escribir los tests (fallan)**

`game/tests/unit/tiledmap.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findPath, isWalkable } from '../../src/core/pathfinding';
import {
  buildWalkGrid,
  readEnclosures,
  readGates,
  readSpawn,
  type TiledMap,
} from '../../src/core/tiledmap';
import { ANIMAL_IDS, isAnimalId } from '../../src/data/animals';

function loadTestMap(): TiledMap {
  const url = new URL('../../public/assets/maps/test-map.tmj', import.meta.url);
  return JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as TiledMap;
}

function tinyMap(data: number[], objects: TiledMap['layers'][number][] = []): TiledMap {
  return {
    width: 3,
    height: 1,
    tilewidth: 16,
    tileheight: 16,
    tilesets: [
      { firstgid: 1, name: 'ts', tilecount: 2, tiles: [{ id: 1, properties: [{ name: 'walkable', type: 'bool', value: true }] }] },
    ],
    layers: [{ type: 'tilelayer', name: 'suelo', width: 3, height: 1, data }, ...objects],
  };
}

describe('buildWalkGrid', () => {
  it('transitable = tile con walkable: true', () => {
    const grid = buildWalkGrid(tinyMap([1, 2, 0]));
    expect([0, 1, 2].map((x) => isWalkable(grid, x, 0))).toEqual([false, true, false]);
  });

  it('ignora los bits de volteo de Tiled en el gid', () => {
    const flippedH = (2 | 0x80000000) >>> 0;
    const grid = buildWalkGrid(tinyMap([flippedH, 1, 1]));
    expect(isWalkable(grid, 0, 0)).toBe(true);
  });

  it('lanza error si falta la capa "suelo"', () => {
    const map = { ...tinyMap([1, 1, 1]), layers: [] };
    expect(() => buildWalkGrid(map)).toThrow(/suelo/);
  });
});

describe('readSpawn', () => {
  it('lanza error si falta el punto "inicio"', () => {
    expect(() => readSpawn(tinyMap([1, 1, 1]))).toThrow(/inicio/);
  });
});

describe('mapa de prueba', () => {
  const map = loadTestMap();
  const grid = buildWalkGrid(map);

  it('mide 40×30', () => {
    expect([grid.width, grid.height]).toEqual([40, 30]);
  });

  it('el inicio está sobre un camino', () => {
    const spawn = readSpawn(map);
    expect(spawn).toEqual({ x: 19, y: 15 });
    expect(isWalkable(grid, spawn.x, spawn.y)).toBe(true);
  });

  it('cada animal del juego tiene exactamente un recinto y una puerta', () => {
    const enclosureIds = readEnclosures(map).map((e) => e.animalId).sort();
    const gateIds = readGates(map).map((g) => g.animalId).sort();
    expect(enclosureIds).toEqual([...ANIMAL_IDS].sort());
    expect(gateIds).toEqual([...ANIMAL_IDS].sort());
    expect(enclosureIds.every(isAnimalId)).toBe(true);
  });

  it('se puede llegar andando desde el inicio a todas las puertas', () => {
    const spawn = readSpawn(map);
    for (const gate of readGates(map)) {
      expect(findPath(grid, spawn, gate.tile), `puerta de ${gate.animalId}`).not.toBeNull();
    }
  });

  it('los recintos están en píxeles', () => {
    const leon = readEnclosures(map).find((e) => e.animalId === 'leon');
    expect(leon).toEqual({ animalId: 'leon', x: 80, y: 80, width: 176, height: 112 });
  });
});
```

- [x] **Step 3: Ejecutar y ver que falla**

Run: `npm test -- tiledmap`
Expected: FAIL — no se resuelve `src/core/tiledmap`.

- [x] **Step 4: Implementar**

`game/src/core/tiledmap.ts`:

```ts
import { createGrid, type Point, type WalkGrid } from './pathfinding';

export interface TiledProperty {
  name: string;
  type: string;
  value: unknown;
}

export interface TiledTile {
  id: number;
  properties?: TiledProperty[];
}

export interface TiledTileset {
  firstgid: number;
  name: string;
  tilecount: number;
  tiles?: TiledTile[];
}

export interface TiledObject {
  id: number;
  name: string;
  type?: string;
  class?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  point?: boolean;
  properties?: TiledProperty[];
}

export interface TiledTileLayer {
  type: 'tilelayer';
  name: string;
  width: number;
  height: number;
  data: number[];
}

export interface TiledObjectLayer {
  type: 'objectgroup';
  name: string;
  objects: TiledObject[];
}

export type TiledLayer = TiledTileLayer | TiledObjectLayer;

export interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  tilesets: TiledTileset[];
}

export interface EnclosureInfo {
  animalId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GateInfo {
  animalId: string;
  tile: Point;
}

export const GROUND_LAYER = 'suelo';
export const OBJECTS_LAYER = 'objetos';

/** Los 3 bits altos del gid de Tiled indican volteos/rotación. */
const GID_MASK = 0x1fffffff;

function getProperty(properties: TiledProperty[] | undefined, name: string): unknown {
  return properties?.find((p) => p.name === name)?.value;
}

function objectKind(object: TiledObject): string | undefined {
  return object.type || object.class;
}

function objectsOf(map: TiledMap): TiledObject[] {
  const layer = map.layers.find(
    (l): l is TiledObjectLayer => l.type === 'objectgroup' && l.name === OBJECTS_LAYER,
  );
  return layer?.objects ?? [];
}

function animalIdOf(object: TiledObject): string | null {
  const value = getProperty(object.properties, 'animalId');
  return typeof value === 'string' ? value : null;
}

export function buildWalkGrid(map: TiledMap): WalkGrid {
  const layer = map.layers.find(
    (l): l is TiledTileLayer => l.type === 'tilelayer' && l.name === GROUND_LAYER,
  );
  if (!layer) throw new Error(`El mapa no tiene la capa de tiles "${GROUND_LAYER}"`);

  const walkableGids = new Set<number>();
  for (const tileset of map.tilesets) {
    for (const tile of tileset.tiles ?? []) {
      if (getProperty(tile.properties, 'walkable') === true) walkableGids.add(tileset.firstgid + tile.id);
    }
  }
  return createGrid(layer.width, layer.height, (x, y) => {
    const gid = (layer.data[y * layer.width + x] ?? 0) & GID_MASK;
    return walkableGids.has(gid);
  });
}

export function readEnclosures(map: TiledMap): EnclosureInfo[] {
  const result: EnclosureInfo[] = [];
  for (const object of objectsOf(map)) {
    const animalId = animalIdOf(object);
    if (objectKind(object) !== 'recinto' || !animalId) continue;
    result.push({ animalId, x: object.x, y: object.y, width: object.width, height: object.height });
  }
  return result;
}

export function readGates(map: TiledMap): GateInfo[] {
  const result: GateInfo[] = [];
  for (const object of objectsOf(map)) {
    const animalId = animalIdOf(object);
    if (objectKind(object) !== 'puerta' || !animalId) continue;
    result.push({
      animalId,
      tile: { x: Math.floor(object.x / map.tilewidth), y: Math.floor(object.y / map.tileheight) },
    });
  }
  return result;
}

export function readSpawn(map: TiledMap): Point {
  const spawn = objectsOf(map).find((o) => o.name === 'inicio');
  if (!spawn) throw new Error('El mapa no tiene el punto "inicio" en la capa "objetos"');
  return { x: Math.floor(spawn.x / map.tilewidth), y: Math.floor(spawn.y / map.tileheight) };
}
```

- [x] **Step 5: Ejecutar y ver que pasa**

Run: `npm test -- tiledmap && npm run typecheck`
Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add game/src/core/tiledmap.ts game/scripts/make-test-map.mjs game/public/assets/maps/test-map.tmj game/tests/unit/tiledmap.test.ts
git commit -m "feat(v3): lectura de mapas Tiled (rejilla, recintos, puertas, inicio) y mapa de prueba" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: `core/movement.ts` — avanzar por la ruta y moverse con colisión

**Files:**
- Create: `game/src/core/movement.ts`
- Test: `game/tests/unit/movement.test.ts`

**Interfaces:**
- Consumes: `isWalkable`, `Point`, `WalkGrid` (`core/pathfinding.ts`).
- Produces:
  - `interface Vec { x: number; y: number }` (píxeles de mundo)
  - `interface PathStep { pos: Vec; remaining: Vec[] }`
  - `stepAlongPath(pos: Vec, waypoints: readonly Vec[], speed: number, dtMs: number): PathStep` — `speed` en px/s
  - `tileCenter(tile: Point, tileSize: number): Vec`
  - `worldToTile(pos: Vec, tileSize: number): Point`
  - `tryMove(grid: WalkGrid, tileSize: number, pos: Vec, dx: number, dy: number): Vec` — mueve por ejes; si un eje choca, desliza por el otro

- [x] **Step 1: Escribir los tests (fallan)**

`game/tests/unit/movement.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { stepAlongPath, tileCenter, tryMove, worldToTile } from '../../src/core/movement';
import { gridFromAscii } from './helpers';

describe('stepAlongPath', () => {
  it('avanza speed × tiempo hacia el siguiente punto', () => {
    const step = stepAlongPath({ x: 0, y: 0 }, [{ x: 100, y: 0 }], 50, 1000);
    expect(step.pos).toEqual({ x: 50, y: 0 });
    expect(step.remaining).toEqual([{ x: 100, y: 0 }]);
  });

  it('al llegar exacto quita el punto', () => {
    const step = stepAlongPath({ x: 0, y: 0 }, [{ x: 10, y: 0 }], 10, 1000);
    expect(step.pos).toEqual({ x: 10, y: 0 });
    expect(step.remaining).toEqual([]);
  });

  it('puede pasar varios puntos en un mismo paso', () => {
    const step = stepAlongPath(
      { x: 0, y: 0 },
      [
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 10 },
      ],
      25,
      1000,
    );
    expect(step.pos).toEqual({ x: 15, y: 10 });
    expect(step.remaining).toEqual([{ x: 20, y: 10 }]);
  });

  it('con dt 0 o sin ruta no se mueve', () => {
    expect(stepAlongPath({ x: 3, y: 4 }, [{ x: 9, y: 9 }], 50, 0).pos).toEqual({ x: 3, y: 4 });
    expect(stepAlongPath({ x: 3, y: 4 }, [], 50, 16).pos).toEqual({ x: 3, y: 4 });
  });
});

describe('conversiones tile ↔ mundo', () => {
  it('tileCenter devuelve el centro del tile', () => {
    expect(tileCenter({ x: 2, y: 3 }, 16)).toEqual({ x: 40, y: 56 });
  });
  it('worldToTile redondea hacia abajo', () => {
    expect(worldToTile({ x: 47.9, y: 16 }, 16)).toEqual({ x: 2, y: 1 });
  });
});

describe('tryMove', () => {
  const grid = gridFromAscii([
    '...',
    '.#.',
    '...',
  ]);

  it('se mueve libremente por celdas transitables', () => {
    expect(tryMove(grid, 16, { x: 8, y: 8 }, 16, 0)).toEqual({ x: 24, y: 8 });
  });

  it('no entra en un bloqueo', () => {
    expect(tryMove(grid, 16, { x: 8, y: 24 }, 16, 0)).toEqual({ x: 8, y: 24 });
  });

  it('en diagonal contra un muro desliza por el eje libre', () => {
    // Desde (8,24) hacia la derecha (bloqueado por el muro) y hacia abajo (libre).
    expect(tryMove(grid, 16, { x: 8, y: 24 }, 16, 16)).toEqual({ x: 8, y: 40 });
  });

  it('no sale del mapa', () => {
    expect(tryMove(grid, 16, { x: 8, y: 8 }, -16, 0)).toEqual({ x: 8, y: 8 });
  });
});
```

- [x] **Step 2: Ejecutar y ver que falla**

Run: `npm test -- movement`
Expected: FAIL — no se resuelve `src/core/movement`.

- [x] **Step 3: Implementar**

`game/src/core/movement.ts`:

```ts
import { isWalkable, type Point, type WalkGrid } from './pathfinding';

export interface Vec {
  x: number;
  y: number;
}

export interface PathStep {
  pos: Vec;
  remaining: Vec[];
}

export function stepAlongPath(pos: Vec, waypoints: readonly Vec[], speed: number, dtMs: number): PathStep {
  let budget = (speed * dtMs) / 1000;
  let x = pos.x;
  let y = pos.y;
  let index = 0;

  while (index < waypoints.length && budget > 0) {
    const target = waypoints[index]!;
    const dx = target.x - x;
    const dy = target.y - y;
    const distance = Math.hypot(dx, dy);
    if (distance <= budget) {
      x = target.x;
      y = target.y;
      budget -= distance;
      index++;
    } else {
      x += (dx / distance) * budget;
      y += (dy / distance) * budget;
      budget = 0;
    }
  }
  return { pos: { x, y }, remaining: waypoints.slice(index) };
}

export function tileCenter(tile: Point, tileSize: number): Vec {
  return { x: tile.x * tileSize + tileSize / 2, y: tile.y * tileSize + tileSize / 2 };
}

export function worldToTile(pos: Vec, tileSize: number): Point {
  return { x: Math.floor(pos.x / tileSize), y: Math.floor(pos.y / tileSize) };
}

export function tryMove(grid: WalkGrid, tileSize: number, pos: Vec, dx: number, dy: number): Vec {
  let x = pos.x;
  let y = pos.y;
  if (isWalkable(grid, Math.floor((x + dx) / tileSize), Math.floor(y / tileSize))) x += dx;
  if (isWalkable(grid, Math.floor(x / tileSize), Math.floor((y + dy) / tileSize))) y += dy;
  return { x, y };
}
```

- [x] **Step 4: Ejecutar y ver que pasa**

Run: `npm test -- movement && npm run typecheck`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add game/src/core/movement.ts game/tests/unit/movement.test.ts
git commit -m "feat(v3): movimiento por ruta y con colision por ejes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Bus de eventos tipado y sesión de juego

**Files:**
- Create: `game/src/systems/events.ts`, `game/src/systems/session.ts`
- Test: `game/tests/unit/events.test.ts`, `game/tests/unit/session.test.ts`

**Interfaces:**
- Consumes: `addCoins`, `GameState` (`core/economy.ts`); `loadSave`, `writeSave`, `KeyValueStore`, `SaveData`, `Settings` (`core/save.ts`); `createMemoryStore` (solo en tests).
- Produces (`systems/events.ts`):
  - `class EventBus<E extends object>` con `on<K extends keyof E>(event: K, handler: (payload: E[K]) => void): () => void` (devuelve la función para darse de baja), `off<K>(event, handler): void`, `emit<K>(event, payload: E[K]): void`, `clear(): void`
  - `interface GameEvents { 'coins-changed': { coins: number } }`
  - `bus: EventBus<GameEvents>` (instancia global)
- Produces (`systems/session.ts`):
  - `class Session` con `static load(store: KeyValueStore, events?: EventBus<GameEvents>): Promise<Session>`, getters `state: GameState` y `settings: Settings`, `update(change: (state: GameState) => GameState): Promise<void>` (emite `coins-changed` si cambian las monedas y guarda), `earnCoins(amount: number): Promise<void>`
  - `setSession(session: Session): void`, `getSession(): Session` (lanza `Error` si aún no hay sesión)

- [x] **Step 1: Escribir los tests (fallan)**

`game/tests/unit/events.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../src/systems/events';

interface TestEvents {
  ping: { n: number };
  other: { s: string };
}

describe('EventBus', () => {
  it('entrega el payload a los suscritos del evento', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    bus.on('ping', handler);
    bus.emit('ping', { n: 1 });
    expect(handler).toHaveBeenCalledWith({ n: 1 });
  });

  it('no mezcla eventos distintos', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    bus.on('other', handler);
    bus.emit('ping', { n: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('la función devuelta por on da de baja', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    const off = bus.on('ping', handler);
    off();
    bus.emit('ping', { n: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('darse de baja durante un emit no salta a otros suscritos', () => {
    const bus = new EventBus<TestEvents>();
    const second = vi.fn();
    const off = bus.on('ping', () => off());
    bus.on('ping', second);
    bus.emit('ping', { n: 1 });
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('clear quita todos los suscritos', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    bus.on('ping', handler);
    bus.clear();
    bus.emit('ping', { n: 1 });
    expect(handler).not.toHaveBeenCalled();
  });
});
```

`game/tests/unit/session.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { EventBus, type GameEvents } from '../../src/systems/events';
import { Session, getSession, setSession } from '../../src/systems/session';
import { createMemoryStore } from '../../src/systems/storage';

describe('Session', () => {
  it('sin partida guardada empieza con 0 monedas', async () => {
    const session = await Session.load(createMemoryStore(), new EventBus<GameEvents>());
    expect(session.state.coins).toBe(0);
    expect(session.settings.music).toBe(true);
  });

  it('earnCoins emite coins-changed y guarda', async () => {
    const store = createMemoryStore();
    const events = new EventBus<GameEvents>();
    const handler = vi.fn();
    events.on('coins-changed', handler);

    const session = await Session.load(store, events);
    await session.earnCoins(3);

    expect(handler).toHaveBeenCalledWith({ coins: 3 });
    const reloaded = await Session.load(store, new EventBus<GameEvents>());
    expect(reloaded.state.coins).toBe(3);
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

describe('getSession / setSession', () => {
  it('getSession devuelve la sesión registrada', async () => {
    const session = await Session.load(createMemoryStore(), new EventBus<GameEvents>());
    setSession(session);
    expect(getSession()).toBe(session);
  });
});
```

- [x] **Step 2: Ejecutar y ver que fallan**

Run: `npm test -- events session`
Expected: FAIL — no se resuelven `src/systems/events` ni `src/systems/session`.

- [x] **Step 3: Implementar `events.ts`**

`game/src/systems/events.ts`:

```ts
type Handler<T> = (payload: T) => void;

export class EventBus<E extends object> {
  private readonly handlers = new Map<keyof E, Set<Handler<never>>>();

  on<K extends keyof E>(event: K, handler: Handler<E[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<never>);
    return () => this.off(event, handler);
  }

  off<K extends keyof E>(event: K, handler: Handler<E[K]>): void {
    this.handlers.get(event)?.delete(handler as Handler<never>);
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    // Copia: permite darse de baja dentro de un handler sin saltarse a otros.
    for (const handler of [...set]) (handler as Handler<E[K]>)(payload);
  }

  clear(): void {
    this.handlers.clear();
  }
}

export interface GameEvents {
  'coins-changed': { coins: number };
}

export const bus = new EventBus<GameEvents>();
```

- [x] **Step 4: Implementar `session.ts`**

`game/src/systems/session.ts`:

```ts
import { addCoins, type GameState } from '../core/economy';
import { loadSave, writeSave, type KeyValueStore, type SaveData, type Settings } from '../core/save';
import { bus, type EventBus, type GameEvents } from './events';

export class Session {
  private constructor(
    private readonly store: KeyValueStore,
    private data: SaveData,
    private readonly events: EventBus<GameEvents>,
  ) {}

  static async load(store: KeyValueStore, events: EventBus<GameEvents> = bus): Promise<Session> {
    return new Session(store, await loadSave(store), events);
  }

  get state(): GameState {
    return this.data.state;
  }

  get settings(): Settings {
    return this.data.settings;
  }

  async update(change: (state: GameState) => GameState): Promise<void> {
    const previous = this.data.state;
    const next = change(previous);
    this.data = { ...this.data, state: next };
    if (next.coins !== previous.coins) this.events.emit('coins-changed', { coins: next.coins });
    await writeSave(this.store, this.data);
  }

  earnCoins(amount: number): Promise<void> {
    return this.update((state) => addCoins(state, amount));
  }
}

let current: Session | null = null;

export function setSession(session: Session): void {
  current = session;
}

export function getSession(): Session {
  if (!current) throw new Error('La sesión de juego aún no está cargada');
  return current;
}
```

- [x] **Step 5: Ejecutar y ver que pasan**

Run: `npm test -- events session && npm run typecheck`
Expected: PASS.

- [x] **Step 6: Ejecutar toda la suite**

Run: `npm test`
Expected: PASS (todos los archivos de `tests/unit`).

- [x] **Step 7: Commit**

```bash
git add game/src/systems/events.ts game/src/systems/session.ts game/tests/unit/events.test.ts game/tests/unit/session.test.ts
git commit -m "feat(v3): bus de eventos tipado y sesion de juego con guardado" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Escenas — arranque, título, mundo con cuidador y HUD

**Files:**
- Modify (reemplazo completo): `game/src/main.ts`, `game/src/scenes/BootScene.ts`
- Create: `game/src/scenes/PreloadScene.ts`, `game/src/scenes/TitleScene.ts`, `game/src/scenes/WorldScene.ts`, `game/src/scenes/HudScene.ts`, `game/src/systems/testHooks.ts`

**Interfaces:**
- Consumes: todo lo anterior — `TILE_SIZE`, `KEEPER_SPEED`, `TEXTURES`, `MAPS` (`config.ts`); `buildWalkGrid`, `readEnclosures`, `readSpawn`, `TiledMap`; `findPathOrNearest`, `Point`, `WalkGrid`; `stepAlongPath`, `tileCenter`, `tryMove`, `worldToTile`, `Vec`; `computeZoom`; `Session`, `setSession`, `getSession`; `bus`; `createWebStore`; `ANIMALS`, `isAnimalId`; `t`.
- Produces:
  - Claves de escena: `'Boot'`, `'Preload'`, `'Title'`, `'World'`, `'Hud'`.
  - `WorldScene` públicos: `keeperPosition(): Vec`, `tileToScreen(tile: Point): Vec` (coordenadas relativas al canvas), `goTo(world: Vec): boolean`.
  - `HudScene` público: `coinsLabel(): string`.
  - `installTestHooks(game: Phaser.Game): void` y `window.__ZOO__` (solo si `import.meta.env.DEV`) con: `activeScenes(): string[]`, `keeperPosition(): Vec | null`, `tileToScreen(x: number, y: number): Vec | null`, `addCoins(amount: number): Promise<void>`, `hudCoinsText(): string | null`.

Esta tarea es de integración visual: la lógica ya está testeada; la verificación es manual en el navegador integrado (y automatizada en la Tarea 11).

- [x] **Step 1: `BootScene` — texturas provisionales generadas en código**

`game/src/scenes/BootScene.ts` (reemplazo completo):

```ts
import * as Phaser from 'phaser';
import { TEXTURES, TILE_SIZE } from '../config';

/** Genera el arte provisional (hasta que llegue el pack en el hito 5). */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.makeTiles();
    this.makeKeeper();
    this.makeMarker();
    this.scene.start('Preload');
  }

  /** 4 tiles en fila, en el orden del tileset "placeholder": césped, camino, valla, puerta. */
  private makeTiles(): void {
    const g = this.make.graphics({}, false);
    const colors = [0x5fa84a, 0xd2b07a, 0x7a4e2d, 0xf0d890];
    colors.forEach((color, i) => {
      g.fillStyle(color, 1);
      g.fillRect(i * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
    });
    // Detalles mínimos para distinguirlos a simple vista.
    g.fillStyle(0x4f9440, 1).fillRect(3, 4, 2, 2).fillRect(10, 11, 2, 2);
    g.fillStyle(0x4a2f1a, 1).fillRect(2 * TILE_SIZE, 5, TILE_SIZE, 2).fillRect(2 * TILE_SIZE, 10, TILE_SIZE, 2);
    g.lineStyle(1, 0x7a4e2d, 1).strokeRect(3 * TILE_SIZE + 0.5, 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
    g.generateTexture(TEXTURES.tiles, TILE_SIZE * 4, TILE_SIZE);
    g.destroy();
  }

  private makeKeeper(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0x2e7d32, 1).fillRoundedRect(1, 5, 10, 9, 2); // uniforme verde
    g.fillStyle(0xf1c27d, 1).fillCircle(6, 4, 4); // cara
    g.fillStyle(0x6d4c41, 1).fillRect(2, 0, 8, 2); // sombrero
    g.generateTexture(TEXTURES.keeper, 12, 14);
    g.destroy();
  }

  private makeMarker(): void {
    const g = this.make.graphics({}, false);
    g.lineStyle(2, 0xffffff, 0.9).strokeCircle(6, 6, 5);
    g.generateTexture(TEXTURES.marker, 12, 12);
    g.destroy();
  }
}
```

- [x] **Step 2: `PreloadScene` y `TitleScene`**

`game/src/scenes/PreloadScene.ts`:

```ts
import * as Phaser from 'phaser';
import { MAPS } from '../config';
import { Session, setSession } from '../systems/session';
import { createWebStore } from '../systems/storage';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, 304, 20).setStrokeStyle(2, 0xffffff);
    const bar = this.add.rectangle(width / 2 - 150, height / 2, 0, 14, 0xffd54a).setOrigin(0, 0.5);
    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      bar.width = 300 * value;
    });
    this.load.tilemapTiledJSON(MAPS.test, 'assets/maps/test-map.tmj');
  }

  create(): void {
    void this.startSession();
  }

  private async startSession(): Promise<void> {
    setSession(await Session.load(createWebStore()));
    this.scene.start('Title');
  }
}
```

`game/src/scenes/TitleScene.ts`:

```ts
import * as Phaser from 'phaser';
import { t } from '../data/strings';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height * 0.3, 'ZooEsponji', {
        fontFamily: 'sans-serif',
        fontSize: '56px',
        color: '#ffd54a',
        stroke: '#3b2a10',
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    const play = this.add
      .text(width / 2, height * 0.62, `▶  ${t('title.play')}`, {
        fontFamily: 'sans-serif',
        fontSize: '40px',
        color: '#ffffff',
        backgroundColor: '#3e8e41',
        padding: { x: 36, y: 18 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    play.once('pointerup', () => {
      this.scene.start('World');
      this.scene.launch('Hud');
    });
  }
}
```

- [x] **Step 3: `WorldScene` — mapa, cuidador, tocar para ir, teclado y cámara**

`game/src/scenes/WorldScene.ts`:

```ts
import * as Phaser from 'phaser';
import { KEEPER_SPEED, MAPS, TEXTURES, TILE_SIZE } from '../config';
import { stepAlongPath, tileCenter, tryMove, worldToTile, type Vec } from '../core/movement';
import { findPathOrNearest, type Point, type WalkGrid } from '../core/pathfinding';
import { buildWalkGrid, readEnclosures, readSpawn, type TiledMap } from '../core/tiledmap';
import { ANIMALS, isAnimalId } from '../data/animals';
import { t } from '../data/strings';
import { computeZoom } from '../systems/viewport';

/** Si el dedo se desplaza más que esto entre pulsar y soltar, no es un toque. */
const TAP_MAX_DISTANCE = 12;

type WasdKeys = Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

export class WorldScene extends Phaser.Scene {
  private grid!: WalkGrid;
  private keeper!: Phaser.GameObjects.Image;
  private marker!: Phaser.GameObjects.Image;
  private route: Vec[] = [];
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: WasdKeys;

  constructor() {
    super('World');
  }

  create(): void {
    const mapData = this.cache.tilemap.get(MAPS.test).data as TiledMap;
    this.grid = buildWalkGrid(mapData);

    const map = this.make.tilemap({ key: MAPS.test });
    const tileset = map.addTilesetImage('placeholder', TEXTURES.tiles);
    if (!tileset) throw new Error('No se pudo crear el tileset "placeholder"');
    map.createLayer('suelo', tileset, 0, 0);

    this.drawEnclosureLabels(mapData);

    const spawn = tileCenter(readSpawn(mapData), TILE_SIZE);
    this.marker = this.add.image(0, 0, TEXTURES.marker).setVisible(false);
    this.keeper = this.add.image(spawn.x, spawn.y, TEXTURES.keeper);

    const camera = this.cameras.main;
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    camera.startFollow(this.keeper, true);
    this.applyZoom();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.applyZoom, this);

    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    const keyboard = this.input.keyboard;
    if (keyboard) {
      this.cursors = keyboard.createCursorKeys();
      this.wasd = keyboard.addKeys('W,A,S,D') as WasdKeys;
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.applyZoom, this);
      this.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    });
  }

  update(_time: number, delta: number): void {
    const direction = this.keyboardDirection();
    if (direction.x !== 0 || direction.y !== 0) {
      this.route = [];
      this.marker.setVisible(false);
      const length = Math.hypot(direction.x, direction.y);
      const distance = (KEEPER_SPEED * delta) / 1000;
      const next = tryMove(
        this.grid,
        TILE_SIZE,
        this.keeper,
        (direction.x / length) * distance,
        (direction.y / length) * distance,
      );
      this.keeper.setPosition(next.x, next.y);
      return;
    }

    if (this.route.length > 0) {
      const step = stepAlongPath(this.keeper, this.route, KEEPER_SPEED, delta);
      this.keeper.setPosition(step.pos.x, step.pos.y);
      this.route = step.remaining;
      if (this.route.length === 0) this.marker.setVisible(false);
    }
  }

  /** Manda al cuidador hacia un punto del mundo. Devuelve false si no hay a dónde ir. */
  goTo(world: Vec): boolean {
    const path = findPathOrNearest(this.grid, worldToTile(this.keeper, TILE_SIZE), worldToTile(world, TILE_SIZE));
    if (!path || path.length < 2) {
      this.route = [];
      this.marker.setVisible(false);
      return false;
    }
    this.route = path.slice(1).map((tile) => tileCenter(tile, TILE_SIZE));
    const last = this.route[this.route.length - 1]!;
    this.marker.setPosition(last.x, last.y).setVisible(true);
    return true;
  }

  keeperPosition(): Vec {
    return { x: this.keeper.x, y: this.keeper.y };
  }

  /** Centro del tile en coordenadas relativas al canvas (para tests). */
  tileToScreen(tile: Point): Vec {
    const world = tileCenter(tile, TILE_SIZE);
    const camera = this.cameras.main;
    return {
      x: (world.x - camera.worldView.x) * camera.zoom,
      y: (world.y - camera.worldView.y) * camera.zoom,
    };
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.getDistance() > TAP_MAX_DISTANCE) return;
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.goTo({ x: world.x, y: world.y });
  }

  private applyZoom(): void {
    this.cameras.main.setZoom(computeZoom(this.scale.width, this.scale.height));
  }

  private keyboardDirection(): Vec {
    const c = this.cursors;
    const k = this.wasd;
    if (!c || !k) return { x: 0, y: 0 };
    const x = (c.right.isDown || k.D.isDown ? 1 : 0) - (c.left.isDown || k.A.isDown ? 1 : 0);
    const y = (c.down.isDown || k.S.isDown ? 1 : 0) - (c.up.isDown || k.W.isDown ? 1 : 0);
    return { x, y };
  }

  private drawEnclosureLabels(mapData: TiledMap): void {
    for (const enclosure of readEnclosures(mapData)) {
      const label = isAnimalId(enclosure.animalId)
        ? `${ANIMALS[enclosure.animalId].emoji} ${t(ANIMALS[enclosure.animalId].nameKey)}`
        : enclosure.animalId;
      this.add
        .text(enclosure.x + enclosure.width / 2, enclosure.y + enclosure.height / 2, label, {
          fontFamily: 'sans-serif',
          fontSize: '10px',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setResolution(4);
    }
  }
}
```

- [x] **Step 4: `HudScene` — contador de monedas**

`game/src/scenes/HudScene.ts`:

```ts
import * as Phaser from 'phaser';
import { bus } from '../systems/events';
import { getSession } from '../systems/session';

export class HudScene extends Phaser.Scene {
  private coinsText!: Phaser.GameObjects.Text;

  constructor() {
    super('Hud');
  }

  create(): void {
    this.coinsText = this.add.text(16, 16, '', {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 5,
    });
    this.renderCoins(getSession().state.coins);

    const unsubscribe = bus.on('coins-changed', ({ coins }) => this.renderCoins(coins));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
  }

  coinsLabel(): string {
    return this.coinsText.text;
  }

  private renderCoins(coins: number): void {
    this.coinsText.setText(`🪙 ${coins}`);
  }
}
```

- [x] **Step 5: Ganchos de test y `main.ts`**

`game/src/systems/testHooks.ts`:

```ts
import type * as Phaser from 'phaser';
import type { Vec } from '../core/movement';
import type { HudScene } from '../scenes/HudScene';
import type { WorldScene } from '../scenes/WorldScene';
import { getSession } from './session';

export interface ZooTestApi {
  activeScenes(): string[];
  keeperPosition(): Vec | null;
  tileToScreen(x: number, y: number): Vec | null;
  addCoins(amount: number): Promise<void>;
  hudCoinsText(): string | null;
}

declare global {
  interface Window {
    __ZOO__?: ZooTestApi;
  }
}

/** Solo en desarrollo: API para Playwright y depuración. Nunca en la build de producción. */
export function installTestHooks(game: Phaser.Game): void {
  if (!import.meta.env.DEV) return;

  const activeScene = <T extends Phaser.Scene>(key: string): T | null =>
    game.scene.isActive(key) ? (game.scene.getScene(key) as T) : null;

  window.__ZOO__ = {
    activeScenes: () => game.scene.getScenes(true).map((scene) => scene.scene.key),
    keeperPosition: () => activeScene<WorldScene>('World')?.keeperPosition() ?? null,
    tileToScreen: (x, y) => activeScene<WorldScene>('World')?.tileToScreen({ x, y }) ?? null,
    addCoins: (amount) => getSession().earnCoins(amount),
    hudCoinsText: () => activeScene<HudScene>('Hud')?.coinsLabel() ?? null,
  };
}
```

`game/src/main.ts` (reemplazo completo):

```ts
import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { HudScene } from './scenes/HudScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { WorldScene } from './scenes/WorldScene';
import { installTestHooks } from './systems/testHooks';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1d2b1f',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  // El orden importa: Hud va después de World para dibujarse encima.
  scene: [BootScene, PreloadScene, TitleScene, WorldScene, HudScene],
});

installTestHooks(game);
```

- [x] **Step 6: Typecheck, tests y build**

Run: `npm run typecheck && npm test && npm run build`
Expected: sin errores. Si el typecheck marca alguna API de Phaser 4 distinta a la usada aquí (p. ej. firma de `make.graphics` o de `Pointer.getDistance`), consultar `node_modules/phaser/types/phaser.d.ts` y ajustar a la firma real sin cambiar el comportamiento.

- [x] **Step 7: Verificación manual en el navegador integrado**

Arrancar con `preview_start` (nombre `game`) y comprobar, con capturas:
1. Se ve la barra de carga y luego el título "ZooEsponji" con el botón verde "▶ Jugar".
2. Al pulsar "Jugar" aparece el mapa: césped verde, caminos claros, 4 recintos vallados con su etiqueta (🦁 León, 🐐 Cabra, 🐆 Pantera negra, 🐼 Oso panda) y el cuidador en el cruce central. Arriba a la izquierda, "🪙 0".
3. Al hacer clic en un camino, aparece el marcador blanco y el cuidador va andando **solo por camino**. Al hacer clic en el césped dentro de un recinto, va hasta el punto de camino más cercano.
4. Con WASD o las flechas se mueve y no atraviesa césped ni vallas.
5. En la consola del navegador: `await window.__ZOO__.addCoins(5)` → el HUD pasa a "🪙 5". Recargar la página, volver a pulsar Jugar → sigue en "🪙 5".
6. Con `resize_window` preset `mobile` (y luego girado, 812×375): el pixel art se ve nítido (zoom entero) y tocar el suelo mueve al cuidador. Volver al preset `desktop` al terminar.
7. `read_console_messages` con `onlyErrors: true` → sin errores.

Parar el servidor.

- [x] **Step 8: Commit**

```bash
git add game/src
git commit -m "feat(v3): escenas Boot/Preload/Title/World/Hud con cuidador, tocar para ir y monedas" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Prueba de humo con Playwright

**Files:**
- Create: `game/playwright.config.ts`, `game/tests/e2e/smoke.spec.ts`
- Modify: `game/package.json` (devDependency `@playwright/test`)

**Interfaces:**
- Consumes: `window.__ZOO__` (`systems/testHooks.ts`); spawn del mapa de prueba en el tile (19, 15) y camino en (22, 15); botón "Jugar" en `height * 0.62`.

- [x] **Step 1: Instalar Playwright**

```bash
npm install -D @playwright/test@1
npx playwright install chromium
```

- [x] **Step 2: Configuración**

`game/playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:5173',
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
```

- [x] **Step 3: Escribir la prueba de humo**

`game/tests/e2e/smoke.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test';

async function canvasBox(page: Page) {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('No hay canvas');
  return box;
}

async function startGame(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
  const box = await canvasBox(page);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.62);
  await page.waitForFunction(() => {
    const scenes = window.__ZOO__?.activeScenes() ?? [];
    return scenes.includes('World') && scenes.includes('Hud');
  });
}

test('tocar el camino mueve al cuidador hasta allí', async ({ page }) => {
  await page.goto('/');
  await startGame(page);

  const target = await page.evaluate(() => window.__ZOO__!.tileToScreen(22, 15));
  expect(target).not.toBeNull();
  const box = await canvasBox(page);
  await page.mouse.click(box.x + target!.x, box.y + target!.y);

  // Centro del tile (22, 15) = (22*16+8, 15*16+8) = (360, 248)
  await expect
    .poll(() => page.evaluate(() => window.__ZOO__!.keeperPosition()?.x ?? 0), { timeout: 5_000 })
    .toBeCloseTo(360, 0);
  expect(await page.evaluate(() => window.__ZOO__!.keeperPosition()?.y)).toBeCloseTo(248, 0);
});

test('las monedas se muestran y sobreviven a recargar', async ({ page }) => {
  await page.goto('/');
  await startGame(page);

  await page.evaluate(() => window.__ZOO__!.addCoins(3));
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.hudCoinsText())).toBe('🪙 3');

  await page.reload();
  await startGame(page);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.hudCoinsText())).toBe('🪙 3');
});

test('sin errores en la consola al arrancar', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  await startGame(page);
  expect(errors).toEqual([]);
});
```

- [x] **Step 4: Ejecutar**

Run: `npm run test:e2e`
Expected: 3 passed. Si falla el primer test por el punto de clic, comprobar con el navegador integrado que `tileToScreen(22, 15)` cae sobre el camino con el viewport 1280×720.

- [x] **Step 5: Commit**

```bash
git add game/package.json game/package-lock.json game/playwright.config.ts game/tests/e2e
git commit -m "test(v3): prueba de humo Playwright (mover cuidador, monedas persistentes, consola limpia)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Android con Capacitor y guardado nativo

**Files:**
- Create: `game/capacitor.config.ts`, `game/src/systems/createStore.ts`, `game/android/` (generado)
- Modify: `game/src/systems/storage.ts` (añadir `createCapacitorStore`), `game/src/scenes/PreloadScene.ts` (usar `createStore`), `game/tests/unit/storage.test.ts`, `game/android/app/src/main/AndroidManifest.xml`

**Interfaces:**
- Consumes: `KeyValueStore` (`core/save.ts`), `createWebStore` (`systems/storage.ts`).
- Produces:
  - `interface PreferencesLike { get(options: { key: string }): Promise<{ value: string | null }>; set(options: { key: string; value: string }): Promise<void> }` y `createCapacitorStore(preferences: PreferencesLike): KeyValueStore` en `systems/storage.ts` (sin importar Capacitor, para poder testearlo en Node)
  - `createStore(): KeyValueStore` en `systems/createStore.ts` — Preferences en app nativa, `localStorage` en web

**Decisión a confirmar con David antes de ejecutar esta tarea:** el identificador de la app en Play Store (`appId`) **no se puede cambiar nunca** una vez publicada. Propuesta: `com.davidpladel.zooesponji`.

- [x] **Step 1: Instalar Capacitor**

```bash
npm install @capacitor/core@8 @capacitor/android@8 @capacitor/preferences@8
npm install -D @capacitor/cli@8
```

- [x] **Step 2: Test del store nativo (falla)**

Añadir al final de `game/tests/unit/storage.test.ts`:

```ts
import { createCapacitorStore } from '../../src/systems/storage';

describe('createCapacitorStore', () => {
  function fakePreferences() {
    const map = new Map<string, string>();
    return {
      get: async ({ key }: { key: string }) => ({ value: map.get(key) ?? null }),
      set: async ({ key, value }: { key: string; value: string }) => void map.set(key, value),
    };
  }

  it('guarda y lee a través de Preferences', async () => {
    const store = createCapacitorStore(fakePreferences());
    await store.set('k', 'v');
    expect(await store.get('k')).toBe('v');
    expect(await store.get('nada')).toBeNull();
  });

  it('no revienta si Preferences falla', async () => {
    const store = createCapacitorStore({
      get: async () => {
        throw new Error('fallo nativo');
      },
      set: async () => {
        throw new Error('fallo nativo');
      },
    });
    expect(await store.get('k')).toBeNull();
    await expect(store.set('k', 'v')).resolves.toBeUndefined();
  });
});
```

(Mover el `import` a la cabecera del archivo junto a los demás imports de `storage`.)

Run: `npm test -- storage`
Expected: FAIL — `createCapacitorStore` no existe.

- [x] **Step 3: Implementar el store nativo y el selector**

Añadir al final de `game/src/systems/storage.ts`:

```ts
export interface PreferencesLike {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
}

/** Store sobre @capacitor/preferences (almacenamiento nativo; Android no lo borra como el del WebView). */
export function createCapacitorStore(preferences: PreferencesLike): KeyValueStore {
  return {
    async get(key) {
      try {
        return (await preferences.get({ key })).value;
      } catch {
        return null;
      }
    },
    async set(key, value) {
      try {
        await preferences.set({ key, value });
      } catch (error) {
        console.error('[storage] no se pudo guardar (nativo)', key, error);
      }
    },
  };
}
```

`game/src/systems/createStore.ts`:

```ts
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import type { KeyValueStore } from '../core/save';
import { createCapacitorStore, createWebStore } from './storage';

export function createStore(): KeyValueStore {
  return Capacitor.isNativePlatform() ? createCapacitorStore(Preferences) : createWebStore();
}
```

En `game/src/scenes/PreloadScene.ts`, cambiar el import `import { createWebStore } from '../systems/storage';` por `import { createStore } from '../systems/createStore';` y la línea `setSession(await Session.load(createWebStore()));` por `setSession(await Session.load(createStore()));`.

Run: `npm test && npm run typecheck`
Expected: PASS.

- [x] **Step 4: Configurar Capacitor y generar el proyecto Android**

`game/capacitor.config.ts`:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.davidpladel.zooesponji',
  appName: 'ZooEsponji',
  webDir: 'dist',
  android: { backgroundColor: '#1d2b1f' },
};

export default config;
```

```bash
npm run build
npx cap add android
npx cap sync android
```

Expected: se crea `game/android/` sin errores (no hace falta el SDK de Android para este paso).

- [x] **Step 5: Forzar horizontal en Android**

En `game/android/app/src/main/AndroidManifest.xml`, dentro de la etiqueta `<activity`, sustituir:

```xml
            android:name=".MainActivity"
```

por:

```xml
            android:name=".MainActivity"
            android:screenOrientation="sensorLandscape"
```

Run: `npx cap sync android`
Expected: sin errores.

- [ ] **Step 6: Verificación en Android (manual, la hace David)**

En este equipo no hay Android SDK ni Java. Para probarlo en el móvil:
1. Instalar Android Studio (incluye JDK y SDK).
2. `npx cap open android` desde `game/`, esperar a que Gradle sincronice.
3. Conectar el móvil con la depuración USB activada y pulsar ▶ Run.
4. Comprobar: arranca en horizontal, se ve nítido, tocar el suelo mueve al cuidador, y tras cerrar y abrir la app las monedas se mantienen (para probarlo sin tienda: con el móvil conectado, en `chrome://inspect` → la WebView de ZooEsponji → consola: `await window.__ZOO__?.addCoins(5)`; nota: `__ZOO__` solo existe en builds de desarrollo, así que para este paso usar `npm run build -- --mode development` antes de `npx cap sync android`).

- [x] **Step 7: Commit**

```bash
git add game/package.json game/package-lock.json game/capacitor.config.ts game/src game/tests/unit/storage.test.ts game/android
git commit -m "feat(v3): proyecto Android con Capacitor, horizontal fijo y guardado nativo" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Integración continua y README del proyecto

**Files:**
- Create: `.github/workflows/game-ci.yml`, `game/README.md`

- [x] **Step 1: Workflow de GitHub Actions**

`.github/workflows/game-ci.yml`:

```yaml
name: game-ci

on:
  push:
    paths: ['game/**', '.github/workflows/game-ci.yml']
  pull_request:
    paths: ['game/**', '.github/workflows/game-ci.yml']

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: game
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: game/package-lock.json
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: game/playwright-report
```

- [x] **Step 2: README del proyecto**

`game/README.md`:

````markdown
# ZooEsponji v3 (Phaser 4 + TypeScript)

Spec: `docs/superpowers/specs/2026-09-27-motor-phaser-v3-design.md`

## Comandos (desde `game/`)

```bash
npm install          # dependencias
npm run dev          # juego en http://localhost:5173
npm test             # tests de lógica (Vitest)
npm run test:e2e     # prueba de humo en navegador (Playwright)
npm run build        # build de producción en dist/
npm run make:test-map  # regenera el mapa de prueba
npx cap sync android # copia la build al proyecto Android
npx cap open android # abre Android Studio
```

## Estructura

- `src/core/` — lógica pura sin Phaser (reacciones, economía, guardado, A*, mapas, movimiento). Todo con tests.
- `src/data/` — contenido: animales, comidas, tienda, textos.
- `src/systems/` — eventos, sesión, almacenamiento, zoom.
- `src/scenes/` — escenas de Phaser (solo dibujan y recogen input).

## Añadir un animal

1. Entrada en `src/data/animals.ts` (y su nombre en `src/data/strings.ts`; si se compra, en `src/data/shop.ts`).
2. Sprites del animal (a partir del hito 5, en el atlas).
3. En el mapa de Tiled, capa `objetos`: rectángulo de tipo `recinto` y objeto de tipo `puerta`, ambos con la propiedad `animalId`.

Los tests de contenido fallan si falta alguna de las tres piezas.

## Depuración

En `npm run dev` existe `window.__ZOO__` en la consola del navegador (p. ej. `await __ZOO__.addCoins(10)`). No existe en la build de producción.
````

- [x] **Step 3: Verificación local de todo lo que hará la CI**

Run: `npm ci && npm run typecheck && npm test && npm run build && npm run test:e2e`
Expected: todo en verde.

- [x] **Step 4: Commit**

```bash
git add .github/workflows/game-ci.yml game/README.md
git commit -m "ci(v3): GitHub Actions con typecheck, tests, build y humo; README del juego" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [x] **Step 5: Subir la rama y comprobar la CI (pedir confirmación a David antes del push)**

```bash
git push -u origin v3-phaser
gh run watch --exit-status
```

Expected: el workflow `game-ci` termina en verde.

---

## Resultado al terminar este plan

- `npm run dev` abre el juego: carga → título → mapa de prueba con 4 recintos, cuidador que va tocando el suelo por los caminos (o con teclado), cámara que lo sigue con zoom entero y HUD de monedas que se guardan (y que trae las monedas y compras de la v1.1 si las hay).
- Lógica completa del juego portada y con tests: reacciones, economía y tienda, guardado con migración, A\*, lectura de mapas, movimiento.
- Proyecto Android generado, en horizontal y con guardado nativo, listo para abrir en Android Studio.
- CI en verde en cada push.

**Siguiente plan (hitos 3–4):** `FeedScene` con el drag & drop, `ShopScene`, recintos bloqueados con candado y animación de apertura, animales provisionales en sus recintos.
