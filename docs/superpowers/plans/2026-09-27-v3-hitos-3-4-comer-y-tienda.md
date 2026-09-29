# ZooEsponji v3 — Hitos 3–4: dar de comer y tienda — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el juego v3 tenga el bucle completo de la v1 en el mundo nuevo: acercarse a un recinto, abrir el primer plano del animal, darle de comer **arrastrando**, ganar monedas que vuelan al contador, abrir la tienda a las 20 monedas, comprar pantera/panda y ver el recinto abrirse; con visitantes paseando y joystick opcional.

**Architecture:** Toda regla nueva va a `game/src/core/` como TypeScript puro con tests (alcance de puertas, zonas de acierto, joystick, paseo de visitantes) y a `Session` (dar de comer, comprar, ajustes, eventos). Las escenas nuevas `FeedScene` y `ShopScene` se lanzan encima de `World` pausada. `WorldScene` delega en tres ayudantes de `game/src/world/` (`Pens`, `ShopBuilding`, `VisitorCrowd`) para no crecer sin control. El arte sigue siendo provisional: **emojis** como animales, comida, visitantes y candados, que se sustituirán por sprites en el hito 5.

**Tech Stack:** Phaser 4.2.1, TypeScript 5, Vite 8, Vitest 5, Playwright, Web Audio (tonos provisionales).

**Spec:** `docs/superpowers/specs/2026-09-27-motor-phaser-v3-design.md` · **Plan anterior:** `docs/superpowers/plans/2026-09-27-v3-hitos-1-2-esqueleto-y-nucleo.md`

**Plan 2 de 3.** Quedan para el plan 3 (hitos 5–6): arte y sonido definitivos, atlas, botón atrás de Android, ciclo de vida (pausa/guardado en segundo plano), puerta parental, aviso de girar, manejador global de errores, publicación.

## Global Constraints

- Directorio de trabajo de los comandos: `game/`. Rama: `v3-phaser`.
- `game/src/core/` no importa `phaser` ni usa `window`/`document`.
- `import * as Phaser from 'phaser';` siempre. TypeScript estricto; `npm run typecheck` limpio al cerrar cada tarea.
- Textos visibles solo desde `game/src/data/strings.ts`.
- Botones táctiles de al menos **64 px**; zona de acierto al soltar comida **generosa** (margen 48 px alrededor del animal); soltar fuera **no penaliza** (la comida vuelve a la bandeja).
- Progresión: tienda al **alcanzar 20 monedas**; pantera **50**; panda **100**.
- Monedas voladoras y chispas usan **pool** (reutilizar objetos, no crear/destruir en bucle). Visitantes: número fijo, reutilizados.
- Cada escena elimina sus listeners (bus, input, scale) en `shutdown`.
- Sin SDKs de analítica. Commits con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; nunca `--no-verify`.
- Si la escritura con heredoc de bash falla por comillas, usar la herramienta de escritura de archivos.
- Al terminar: actualizar README raíz, `game/README.md`, sección "Estado de implementación" de la spec y marcar este plan (preferencia de David).

## Mapa de archivos

```
game/
├── scripts/make-test-map.mjs          (mod) edificio de tienda + puerta
├── public/assets/maps/test-map.tmj    (regenerado)
├── src/
│   ├── main.ts                        (mod) registra Feed y Shop
│   ├── core/
│   │   ├── tiledmap.ts                (mod) readShop
│   │   ├── interaction.ts             (nuevo) gateInReach, rectContains, isDropOnTarget
│   │   ├── joystick.ts                (nuevo) joystickVector, knobOffset, inJoystickZone
│   │   └── wander.ts                  (nuevo) walkableTiles, pickRandom, planWander
│   ├── data/
│   │   ├── strings.ts                 (mod) textos nuevos + t(key, vars)
│   │   └── shop.ts                    (mod) shopItemForAnimal
│   ├── systems/
│   │   ├── events.ts                  (mod) eventos nuevos
│   │   ├── session.ts                 (mod) feed, buy, updateSettings
│   │   ├── audio.ts                   (nuevo) Sfx con tonos provisionales
│   │   ├── joystickState.ts           (nuevo) vector compartido HUD → World
│   │   └── testHooks.ts               (mod) ganchos nuevos
│   ├── scenes/
│   │   ├── ui.ts                      (nuevo) estilos y botón de cerrar
│   │   ├── BootScene.ts               (mod) 5.º tile (edificio)
│   │   ├── TitleScene.ts              (mod) desbloquea el audio
│   │   ├── FeedScene.ts               (nuevo)
│   │   ├── ShopScene.ts               (nuevo)
│   │   ├── HudScene.ts                (reescrito) toasts, pop de monedas, joystick
│   │   └── WorldScene.ts              (reescrito) usa Pens/ShopBuilding/VisitorCrowd
│   └── world/
│       ├── Pens.ts                    (nuevo) animales, candados, bocadillo
│       ├── ShopBuilding.ts            (nuevo) edificio y puerta de la tienda
│       └── VisitorCrowd.ts            (nuevo) visitantes paseando
└── tests/
    ├── unit/{interaction,joystick,wander,audio}.test.ts (nuevos)
    ├── unit/{tiledmap,content,session}.test.ts          (ampliados)
    └── e2e/play.spec.ts                                 (nuevo)
```

---

### Task 1: Tienda en el mapa de prueba (`readShop`)

**Files:**
- Modify: `game/scripts/make-test-map.mjs`, `game/src/core/tiledmap.ts`, `game/src/scenes/BootScene.ts`, `game/tests/unit/tiledmap.test.ts`
- Regenerate: `game/public/assets/maps/test-map.tmj`

**Interfaces:**
- Produces: `interface ShopInfo { x: number; y: number; width: number; height: number; door: Point }` (rect en px, puerta en tiles) y `readShop(map: TiledMap): ShopInfo | null` en `core/tiledmap.ts`. Convención Tiled: objeto de tipo `tienda` (rectángulo del edificio) + objeto de tipo `puertaTienda` (tile de la puerta). Tileset "placeholder" pasa a 5 tiles: gid 5 = edificio (no transitable).

- [x] **Step 1: Tests (fallan)**

En `game/tests/unit/tiledmap.test.ts`, añadir `readShop` al import de `../../src/core/tiledmap` y añadir:

Dentro de `describe('readSpawn', …)` (al final del bloque):

```ts
  it('readShop devuelve null si el mapa no tiene tienda', () => {
    expect(readShop(tinyMap([1, 1, 1]))).toBeNull();
  });
```

Dentro de `describe('mapa de prueba', …)` (al final del bloque):

```ts
  it('tiene tienda con puerta alcanzable desde el inicio', () => {
    const shop = readShop(map);
    expect(shop).toEqual({ x: 256, y: 80, width: 48, height: 48, door: { x: 18, y: 6 } });
    expect(isWalkable(grid, 18, 6)).toBe(true);
    expect(isWalkable(grid, 17, 6)).toBe(false);
    expect(findPath(grid, readSpawn(map), shop!.door)).not.toBeNull();
  });
```

Run: `npm test -- tiledmap` → Expected: FAIL (`readShop` no existe).

- [x] **Step 2: Implementar `readShop`**

Al final de `game/src/core/tiledmap.ts`:

```ts
export interface ShopInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  door: Point;
}

export function readShop(map: TiledMap): ShopInfo | null {
  const objects = objectsOf(map);
  const building = objects.find((o) => objectKind(o) === 'tienda');
  const door = objects.find((o) => objectKind(o) === 'puertaTienda');
  if (!building || !door) return null;
  return {
    x: building.x,
    y: building.y,
    width: building.width,
    height: building.height,
    door: { x: Math.floor(door.x / map.tilewidth), y: Math.floor(door.y / map.tileheight) },
  };
}
```

- [x] **Step 3: Edificio en el generador del mapa**

En `game/scripts/make-test-map.mjs`:

1. Tras `const GATE = 4;` añadir `const BUILDING = 5;`.
2. Justo antes de `objects.push({ id: nextId++, name: 'inicio', …` añadir:

```js
// Tienda: edificio 3x3 junto a la cruz central, con la puerta hacia el camino (col 19).
for (let y = 5; y <= 7; y++) hLine(y, 16, 18, BUILDING);
set(18, 6, GATE);
objects.push({
  id: nextId++, name: 'tienda', type: 'tienda',
  x: 16 * T, y: 5 * T, width: 3 * T, height: 3 * T, rotation: 0, visible: true,
});
objects.push({
  id: nextId++, name: 'puerta-tienda', type: 'puertaTienda',
  x: 18 * T, y: 6 * T, width: T, height: T, rotation: 0, visible: true,
});
```

3. En el tileset: `imagewidth: T * 5`, `tilecount: 5`, `columns: 5`.

Run: `npm run make:test-map && npm test -- tiledmap` → Expected: PASS.

- [x] **Step 4: 5.º tile en `BootScene`**

En `game/src/scenes/BootScene.ts`, método `makeTiles`:
- Cambiar el comentario a `/** 5 tiles en fila, en el orden del tileset "placeholder": césped, camino, valla, puerta, edificio. */`
- Cambiar `const colors = [0x5fa84a, 0xd2b07a, 0x7a4e2d, 0xf0d890];` por `const colors = [0x5fa84a, 0xd2b07a, 0x7a4e2d, 0xf0d890, 0xc0603a];`
- Antes de `g.generateTexture(…)` añadir: `g.fillStyle(0x8d3b22, 1).fillRect(4 * TILE_SIZE, 0, TILE_SIZE, 4); // tejado`
- Cambiar `g.generateTexture(TEXTURES.tiles, TILE_SIZE * 4, TILE_SIZE);` por `g.generateTexture(TEXTURES.tiles, TILE_SIZE * 5, TILE_SIZE);`

Run: `npm run typecheck && npm test && npm run test:e2e` → Expected: todo en verde (las pruebas de humo siguen pasando con el mapa nuevo).

- [x] **Step 5: Commit**

```bash
git add scripts/make-test-map.mjs public/assets/maps/test-map.tmj src/core/tiledmap.ts src/scenes/BootScene.ts tests/unit/tiledmap.test.ts
git commit -m "feat(v3): edificio de la tienda en el mapa de prueba y readShop" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `core/interaction.ts` — alcance de puertas y zonas de acierto

**Files:**
- Create: `game/src/core/interaction.ts`
- Test: `game/tests/unit/interaction.test.ts`

**Interfaces:**
- Produces:
  - `interface Rect { x: number; y: number; width: number; height: number }`
  - `interface GateRef { animalId: string; tile: Point }`
  - `FEED_REACH_TILES = 2`
  - `gateInReach<T extends GateRef>(keeperTile: Point, gates: readonly T[], reach?: number): T | null` — la puerta más cercana (Manhattan) a `reach` tiles o menos; empate → la primera
  - `rectContains(rect: Rect, point: Vec, margin?: number): boolean` — bordes incluidos
  - `isDropOnTarget(drop: Vec, target: Rect, margin: number): boolean`

- [x] **Step 1: Tests (fallan)**

`game/tests/unit/interaction.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { gateInReach, isDropOnTarget, rectContains } from '../../src/core/interaction';

const gates = [
  { animalId: 'leon', tile: { x: 10, y: 11 } },
  { animalId: 'cabra', tile: { x: 29, y: 11 } },
];

describe('gateInReach', () => {
  it('devuelve la puerta a 2 tiles o menos', () => {
    expect(gateInReach({ x: 10, y: 13 }, gates)?.animalId).toBe('leon');
  });

  it('null si todas están lejos', () => {
    expect(gateInReach({ x: 19, y: 15 }, gates)).toBeNull();
  });

  it('elige la más cercana', () => {
    const withNear = [...gates, { animalId: 'panda', tile: { x: 11, y: 11 } }];
    expect(gateInReach({ x: 11, y: 12 }, withNear)?.animalId).toBe('panda');
  });

  it('respeta el alcance indicado', () => {
    expect(gateInReach({ x: 10, y: 14 }, gates)).toBeNull();
    expect(gateInReach({ x: 10, y: 14 }, gates, 3)?.animalId).toBe('leon');
  });
});

describe('rectContains / isDropOnTarget', () => {
  const rect = { x: 100, y: 100, width: 50, height: 50 };

  it('punto dentro', () => {
    expect(rectContains(rect, { x: 125, y: 125 })).toBe(true);
  });

  it('bordes incluidos', () => {
    expect(rectContains(rect, { x: 150, y: 150 })).toBe(true);
  });

  it('punto fuera', () => {
    expect(rectContains(rect, { x: 90, y: 125 })).toBe(false);
  });

  it('soltar cerca cuenta gracias al margen', () => {
    expect(isDropOnTarget({ x: 90, y: 125 }, rect, 20)).toBe(true);
    expect(isDropOnTarget({ x: 60, y: 125 }, rect, 20)).toBe(false);
  });
});
```

Run: `npm test -- interaction` → Expected: FAIL.

- [x] **Step 2: Implementar**

`game/src/core/interaction.ts`:

```ts
import type { Vec } from './movement';
import type { Point } from './pathfinding';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GateRef {
  animalId: string;
  tile: Point;
}

/** A cuántos tiles (Manhattan) de la puerta aparece el bocadillo de dar de comer. */
export const FEED_REACH_TILES = 2;

export function gateInReach<T extends GateRef>(
  keeperTile: Point,
  gates: readonly T[],
  reach = FEED_REACH_TILES,
): T | null {
  let best: T | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const gate of gates) {
    const distance = Math.abs(gate.tile.x - keeperTile.x) + Math.abs(gate.tile.y - keeperTile.y);
    if (distance <= reach && distance < bestDistance) {
      best = gate;
      bestDistance = distance;
    }
  }
  return best;
}

export function rectContains(rect: Rect, point: Vec, margin = 0): boolean {
  return (
    point.x >= rect.x - margin &&
    point.x <= rect.x + rect.width + margin &&
    point.y >= rect.y - margin &&
    point.y <= rect.y + rect.height + margin
  );
}

export function isDropOnTarget(drop: Vec, target: Rect, margin: number): boolean {
  return rectContains(target, drop, margin);
}
```

Run: `npm test -- interaction && npm run typecheck` → Expected: PASS.

- [x] **Step 3: Commit**

```bash
git add src/core/interaction.ts tests/unit/interaction.test.ts
git commit -m "feat(v3): alcance de puertas y zonas de acierto" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `core/joystick.ts` — matemática del joystick

**Files:**
- Create: `game/src/core/joystick.ts`
- Test: `game/tests/unit/joystick.test.ts`

**Interfaces:**
- Produces:
  - `JOYSTICK_RADIUS = 60`, `JOYSTICK_DEADZONE = 0.2`
  - `joystickVector(origin: Vec, current: Vec, radius?: number, deadzone?: number): Vec` — dirección con magnitud 0..1; 0 dentro de la zona muerta
  - `knobOffset(origin: Vec, current: Vec, radius?: number): Vec` — desplazamiento del mando limitado al radio
  - `inJoystickZone(point: Vec, viewWidth: number, viewHeight: number): boolean` — 40 % izquierdo × 55 % inferior de la pantalla

- [x] **Step 1: Tests (fallan)**

`game/tests/unit/joystick.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { inJoystickZone, joystickVector, knobOffset } from '../../src/core/joystick';

const O = { x: 0, y: 0 };

describe('joystickVector', () => {
  it('dentro de la zona muerta es cero', () => {
    expect(joystickVector(O, { x: 5, y: 0 }, 60, 0.2)).toEqual({ x: 0, y: 0 });
  });

  it('a medio radio da media potencia', () => {
    const v = joystickVector(O, { x: 30, y: 0 }, 60, 0.2);
    expect(v.x).toBeCloseTo(0.5);
    expect(v.y).toBeCloseTo(0);
  });

  it('más allá del radio se limita a 1', () => {
    const v = joystickVector(O, { x: 0, y: -500 }, 60, 0.2);
    expect(v.y).toBeCloseTo(-1);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1);
  });

  it('en diagonal conserva la dirección', () => {
    const v = joystickVector(O, { x: 60, y: 60 }, 60, 0.2);
    expect(v.x).toBeCloseTo(Math.SQRT1_2);
    expect(v.y).toBeCloseTo(Math.SQRT1_2);
  });
});

describe('knobOffset', () => {
  it('dentro del radio no cambia', () => {
    expect(knobOffset(O, { x: 10, y: -5 }, 60)).toEqual({ x: 10, y: -5 });
  });

  it('fuera se limita al radio', () => {
    expect(knobOffset(O, { x: 120, y: 0 }, 60)).toEqual({ x: 60, y: 0 });
  });
});

describe('inJoystickZone', () => {
  it('abajo a la izquierda sí', () => {
    expect(inJoystickZone({ x: 50, y: 600 }, 1280, 720)).toBe(true);
  });
  it('arriba no', () => {
    expect(inJoystickZone({ x: 50, y: 100 }, 1280, 720)).toBe(false);
  });
  it('a la derecha no', () => {
    expect(inJoystickZone({ x: 900, y: 600 }, 1280, 720)).toBe(false);
  });
});
```

Run: `npm test -- joystick` → Expected: FAIL.

- [x] **Step 2: Implementar**

`game/src/core/joystick.ts`:

```ts
import type { Vec } from './movement';

export const JOYSTICK_RADIUS = 60;
export const JOYSTICK_DEADZONE = 0.2;

export function joystickVector(
  origin: Vec,
  current: Vec,
  radius = JOYSTICK_RADIUS,
  deadzone = JOYSTICK_DEADZONE,
): Vec {
  const dx = current.x - origin.x;
  const dy = current.y - origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance < deadzone * radius) return { x: 0, y: 0 };
  const power = Math.min(distance, radius) / radius;
  return { x: (dx / distance) * power, y: (dy / distance) * power };
}

export function knobOffset(origin: Vec, current: Vec, radius = JOYSTICK_RADIUS): Vec {
  const dx = current.x - origin.x;
  const dy = current.y - origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= radius) return { x: dx, y: dy };
  return { x: (dx / distance) * radius, y: (dy / distance) * radius };
}

/** Zona de la pantalla (abajo a la izquierda) donde un toque maneja el joystick. */
export function inJoystickZone(point: Vec, viewWidth: number, viewHeight: number): boolean {
  return point.x <= viewWidth * 0.4 && point.y >= viewHeight * 0.45;
}
```

Run: `npm test -- joystick && npm run typecheck` → Expected: PASS.

- [x] **Step 3: Commit**

```bash
git add src/core/joystick.ts tests/unit/joystick.test.ts
git commit -m "feat(v3): matematica del joystick virtual" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `core/wander.ts` — paseo de visitantes

**Files:**
- Create: `game/src/core/wander.ts`
- Test: `game/tests/unit/wander.test.ts`

**Interfaces:**
- Consumes: `findPath`, `isWalkable`, `Point`, `WalkGrid` (`core/pathfinding.ts`); `gridFromAscii` (tests).
- Produces:
  - `type Rng = () => number` (0 ≤ n < 1)
  - `walkableTiles(grid: WalkGrid): Point[]` — orden por filas
  - `pickRandom<T>(items: readonly T[], rng: Rng): T | undefined`
  - `planWander(grid: WalkGrid, from: Point, tiles: readonly Point[], rng: Rng, attempts?: number): Point[] | null` — ruta a un destino al azar distinto de `from`; `null` si no lo encuentra en `attempts` (5) intentos

- [x] **Step 1: Tests (fallan)**

`game/tests/unit/wander.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { pickRandom, planWander, walkableTiles } from '../../src/core/wander';
import { gridFromAscii } from './helpers';

function sequence(values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)]!;
}

const grid = gridFromAscii([
  '...',
  '#.#',
  '...',
]);

describe('walkableTiles', () => {
  it('lista las celdas transitables por filas', () => {
    expect(walkableTiles(grid)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ]);
  });
});

describe('pickRandom', () => {
  it('usa el rng para elegir', () => {
    expect(pickRandom(['a', 'b', 'c'], () => 0)).toBe('a');
    expect(pickRandom(['a', 'b', 'c'], () => 0.99)).toBe('c');
  });
  it('lista vacía → undefined', () => {
    expect(pickRandom([], () => 0.5)).toBeUndefined();
  });
});

describe('planWander', () => {
  const tiles = walkableTiles(grid);

  it('devuelve una ruta hasta el destino elegido', () => {
    const path = planWander(grid, { x: 0, y: 0 }, tiles, () => 0.99);
    expect(path?.[0]).toEqual({ x: 0, y: 0 });
    expect(path?.[path.length - 1]).toEqual({ x: 2, y: 2 });
    expect(path).toHaveLength(5);
  });

  it('si sale su propia casilla, vuelve a elegir', () => {
    const path = planWander(grid, { x: 0, y: 0 }, tiles, sequence([0, 0.99]));
    expect(path?.[path.length - 1]).toEqual({ x: 2, y: 2 });
  });

  it('null si no hay a dónde ir', () => {
    expect(planWander(grid, { x: 0, y: 0 }, [{ x: 0, y: 0 }], () => 0)).toBeNull();
  });
});
```

Run: `npm test -- wander` → Expected: FAIL.

- [x] **Step 2: Implementar**

`game/src/core/wander.ts`:

```ts
import { findPath, isWalkable, type Point, type WalkGrid } from './pathfinding';

export type Rng = () => number;

export function walkableTiles(grid: WalkGrid): Point[] {
  const tiles: Point[] = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (isWalkable(grid, x, y)) tiles.push({ x, y });
    }
  }
  return tiles;
}

export function pickRandom<T>(items: readonly T[], rng: Rng): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(rng() * items.length)];
}

export function planWander(
  grid: WalkGrid,
  from: Point,
  tiles: readonly Point[],
  rng: Rng,
  attempts = 5,
): Point[] | null {
  for (let i = 0; i < attempts; i++) {
    const goal = pickRandom(tiles, rng);
    if (!goal) return null;
    if (goal.x === from.x && goal.y === from.y) continue;
    const path = findPath(grid, from, goal);
    if (path) return path;
  }
  return null;
}
```

Run: `npm test -- wander && npm run typecheck` → Expected: PASS.

- [x] **Step 3: Commit**

```bash
git add src/core/wander.ts tests/unit/wander.test.ts
git commit -m "feat(v3): paseo aleatorio de visitantes (logica pura)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Sesión — dar de comer, comprar, ajustes, eventos y textos

**Files:**
- Modify: `game/src/systems/events.ts`, `game/src/systems/session.ts`, `game/src/data/strings.ts`, `game/src/data/shop.ts`
- Test: `game/tests/unit/session.test.ts`, `game/tests/unit/content.test.ts`

**Interfaces:**
- Consumes: `resolveFeeding`, `FeedResult` (`core/reactions.ts`); `purchase`, `PurchaseResult` (`core/economy.ts`); `Settings` (`core/save.ts`).
- Produces:
  - `GameEvents` añade `'animal-unlocked': { animalId: AnimalId }`, `'shop-unlocked': Record<string, never>`, `'settings-changed': { settings: Settings }`, `'toast': { text: string }`
  - `Session.update` emite además `shop-unlocked` (al pasar de cerrada a abierta) y `animal-unlocked` (por cada animal nuevo)
  - `Session.feed(animalId: AnimalId, foodId: FoodId): Promise<FeedResult>`
  - `Session.buy(itemId: string): Promise<PurchaseResult>`
  - `Session.updateSettings(change: Partial<Settings>): Promise<void>` (emite `settings-changed`)
  - `t(key: StringKey, vars?: Record<string, string | number>): string` (sustituye `{nombre}`)
  - Claves nuevas: `feed.yum`, `feed.yuck`, `feed.wow`, `shop.title`, `shop.label`, `shop.owned`, `toast.shopOpen`, `toast.shopLocked` (`{n}`), `toast.needShop`, `toast.newAnimal` (`{name}`)
  - `shopItemForAnimal(animalId: AnimalId): ShopItemDef | undefined` en `data/shop.ts`

- [x] **Step 1: Tests (fallan)**

En `game/tests/unit/content.test.ts`, cambiar el import de la tienda por:

```ts
import { SHOP_ITEMS, SHOP_UNLOCK_COINS, getShopItem, shopItemForAnimal } from '../../src/data/shop';
```

y añadir al final:

```ts
describe('textos con variables', () => {
  it('t sustituye {n}', () => {
    expect(t('toast.shopLocked', { n: 20 })).toBe('La tienda abre con 20 monedas');
  });
  it('sin variables deja el texto igual', () => {
    expect(t('title.play')).toBe('Jugar');
  });
});

describe('shopItemForAnimal', () => {
  it('encuentra el producto de un animal comprable', () => {
    expect(shopItemForAnimal('pantera')?.cost).toBe(50);
  });
  it('undefined para animales de inicio', () => {
    expect(shopItemForAnimal('leon')).toBeUndefined();
  });
});
```

Al final de `game/tests/unit/session.test.ts`:

```ts
describe('Session: dar de comer, comprar y ajustes', () => {
  async function fresh(store = createMemoryStore()) {
    const events = new EventBus<GameEvents>();
    const session = await Session.load(store, events);
    return { session, events, store };
  }

  it('dar comida que le gusta suma monedas', async () => {
    const { session } = await fresh();
    expect(await session.feed('leon', 'carne')).toEqual({ reaction: 'come', coins: 1 });
    expect(session.state.coins).toBe(1);
  });

  it('comida rechazada no emite coins-changed', async () => {
    const { session, events } = await fresh();
    const handler = vi.fn();
    events.on('coins-changed', handler);
    expect(await session.feed('leon', 'piedra')).toEqual({ reaction: 'rechaza', coins: 0 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('emite shop-unlocked una sola vez al llegar a 20', async () => {
    const { session, events } = await fresh();
    const handler = vi.fn();
    events.on('shop-unlocked', handler);
    await session.earnCoins(19);
    await session.earnCoins(1);
    await session.earnCoins(5);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('comprar desbloquea el animal y emite animal-unlocked', async () => {
    const { session, events } = await fresh();
    await session.earnCoins(60);
    const handler = vi.fn();
    events.on('animal-unlocked', handler);
    const result = await session.buy('pantera');
    expect(result.ok).toBe(true);
    expect(handler).toHaveBeenCalledWith({ animalId: 'pantera' });
    expect(session.state.coins).toBe(10);
  });

  it('comprar sin monedas no cambia nada', async () => {
    const { session } = await fresh();
    await session.earnCoins(20);
    expect(await session.buy('panda')).toEqual({ ok: false, error: 'not-enough-coins' });
    expect(session.state.coins).toBe(20);
  });

  it('updateSettings guarda y emite settings-changed', async () => {
    const { session, events, store } = await fresh();
    const handler = vi.fn();
    events.on('settings-changed', handler);
    await session.updateSettings({ joystick: true });
    expect(handler).toHaveBeenCalledWith({ settings: { music: true, sfx: true, joystick: true } });
    const reloaded = await Session.load(store, new EventBus<GameEvents>());
    expect(reloaded.settings.joystick).toBe(true);
  });
});
```

Run: `npm test -- session content` → Expected: FAIL.

- [x] **Step 2: Textos**

`game/src/data/strings.ts` (reemplazo completo):

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
  'feed.yum': '¡Ñam!',
  'feed.yuck': '¡Puaj!',
  'feed.wow': '¡Guau!',
  'shop.title': 'Tienda del zoo',
  'shop.label': 'Tienda',
  'shop.owned': '¡Ya es tuyo!',
  'toast.shopOpen': '¡La tienda está abierta!',
  'toast.shopLocked': 'La tienda abre con {n} monedas',
  'toast.needShop': 'Cómpralo en la tienda 🏪',
  'toast.newAnimal': '¡Nuevo animal: {name}!',
} as const;

export type StringKey = keyof typeof STRINGS_ES;

export function t(key: StringKey, vars: Record<string, string | number> = {}): string {
  return STRINGS_ES[key].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
```

- [x] **Step 3: `shopItemForAnimal`**

Al final de `game/src/data/shop.ts`:

```ts
export function shopItemForAnimal(animalId: AnimalId): ShopItemDef | undefined {
  return SHOP_ITEMS.find((item) => item.animalId === animalId);
}
```

- [x] **Step 4: Eventos**

En `game/src/systems/events.ts`, reemplazar la interfaz `GameEvents` por (y añadir los imports de tipos al principio del archivo):

```ts
import type { Settings } from '../core/save';
import type { AnimalId } from '../data/animals';
```

```ts
export interface GameEvents {
  'coins-changed': { coins: number };
  'shop-unlocked': Record<string, never>;
  'animal-unlocked': { animalId: AnimalId };
  'settings-changed': { settings: Settings };
  toast: { text: string };
}
```

- [x] **Step 5: Sesión**

`game/src/systems/session.ts` (reemplazo completo):

```ts
import { addCoins, purchase, type GameState, type PurchaseResult } from '../core/economy';
import { resolveFeeding, type FeedResult } from '../core/reactions';
import { loadSave, writeSave, type KeyValueStore, type SaveData, type Settings } from '../core/save';
import type { AnimalId } from '../data/animals';
import type { FoodId } from '../data/foods';
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
    if (!previous.shopUnlocked && next.shopUnlocked) this.events.emit('shop-unlocked', {});
    for (const animalId of next.unlocked) {
      if (!previous.unlocked.includes(animalId)) this.events.emit('animal-unlocked', { animalId });
    }
    await writeSave(this.store, this.data);
  }

  earnCoins(amount: number): Promise<void> {
    return this.update((state) => addCoins(state, amount));
  }

  async feed(animalId: AnimalId, foodId: FoodId): Promise<FeedResult> {
    const result = resolveFeeding(animalId, foodId);
    if (result.coins > 0) await this.earnCoins(result.coins);
    return result;
  }

  async buy(itemId: string): Promise<PurchaseResult> {
    const result = purchase(this.data.state, itemId);
    if (result.ok) await this.update(() => result.state);
    return result;
  }

  async updateSettings(change: Partial<Settings>): Promise<void> {
    this.data = { ...this.data, settings: { ...this.data.settings, ...change } };
    this.events.emit('settings-changed', { settings: this.data.settings });
    await writeSave(this.store, this.data);
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

- [x] **Step 6: Verificar y commit**

Run: `npm test && npm run typecheck` → Expected: PASS.

```bash
git add src/systems/events.ts src/systems/session.ts src/data/strings.ts src/data/shop.ts tests/unit/session.test.ts tests/unit/content.test.ts
git commit -m "feat(v3): sesion con dar de comer, comprar, ajustes y eventos de desbloqueo" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Sonidos provisionales (`systems/audio.ts`)

**Files:**
- Create: `game/src/systems/audio.ts`
- Modify: `game/src/scenes/TitleScene.ts`
- Test: `game/tests/unit/audio.test.ts`

**Interfaces:**
- Produces: `type SoundId = 'come' | 'rechaza' | 'especial' | 'coin' | 'buy' | 'unlock' | 'tap'`, `SOUND_NOTES: Record<SoundId, Note[]>`, `class Sfx { constructor(enabled: () => boolean); unlock(): void; play(id: SoundId): void }`, instancia global `sfx` (respeta `settings.sfx`). Nunca lanza errores (sin navegador o sin Web Audio no hace nada). En el hito 5 se sustituirá por samples reales manteniendo `sfx.play(id)`.

- [x] **Step 1: Tests (fallan)**

`game/tests/unit/audio.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SOUND_NOTES, Sfx, type SoundId } from '../../src/systems/audio';

const IDS: SoundId[] = ['come', 'rechaza', 'especial', 'coin', 'buy', 'unlock', 'tap'];

describe('SOUND_NOTES', () => {
  it.each(IDS)('%s tiene notas válidas', (id) => {
    expect(SOUND_NOTES[id].length).toBeGreaterThan(0);
    for (const note of SOUND_NOTES[id]) {
      expect(note.freq).toBeGreaterThan(0);
      expect(note.duration).toBeGreaterThan(0);
      expect(note.delay).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Sfx', () => {
  it('sin navegador no lanza errores', () => {
    const sfx = new Sfx(() => true);
    expect(() => {
      sfx.unlock();
      sfx.play('come');
    }).not.toThrow();
  });

  it('desactivado no hace nada', () => {
    expect(() => new Sfx(() => false).play('coin')).not.toThrow();
  });
});
```

Run: `npm test -- audio` → Expected: FAIL.

- [x] **Step 2: Implementar**

`game/src/systems/audio.ts`:

```ts
import { getSession } from './session';

export type SoundId = 'come' | 'rechaza' | 'especial' | 'coin' | 'buy' | 'unlock' | 'tap';

interface Note {
  freq: number;
  duration: number;
  delay: number;
  type: OscillatorType;
}

const n = (freq: number, duration: number, delay = 0, type: OscillatorType = 'triangle'): Note => ({
  freq,
  duration,
  delay,
  type,
});

/** Tonos provisionales hasta el hito 5 (samples reales). */
export const SOUND_NOTES: Record<SoundId, Note[]> = {
  come: [n(523, 0.1), n(659, 0.1, 0.1), n(784, 0.15, 0.2)],
  rechaza: [n(220, 0.18, 0, 'square'), n(165, 0.25, 0.18, 'square')],
  especial: [n(523, 0.08), n(659, 0.08, 0.08), n(784, 0.08, 0.16), n(1047, 0.25, 0.24)],
  coin: [n(988, 0.06, 0, 'square'), n(1319, 0.12, 0.06, 'square')],
  buy: [n(392, 0.1), n(523, 0.1, 0.1), n(659, 0.1, 0.2), n(784, 0.3, 0.3)],
  unlock: [n(659, 0.12), n(784, 0.12, 0.12), n(1047, 0.3, 0.24)],
  tap: [n(880, 0.04, 0, 'sine')],
};

type AudioContextCtor = typeof AudioContext;

export class Sfx {
  private context: AudioContext | null = null;

  constructor(private readonly enabled: () => boolean) {}

  /** Llamar tras el primer toque del jugador: los navegadores bloquean el audio hasta entonces. */
  unlock(): void {
    this.getContext();
  }

  play(id: SoundId): void {
    if (!this.enabled()) return;
    const context = this.getContext();
    if (!context) return;
    const start = context.currentTime;
    for (const note of SOUND_NOTES[id]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = note.type;
      oscillator.frequency.value = note.freq;
      gain.gain.setValueAtTime(0.15, start + note.delay);
      gain.gain.exponentialRampToValueAtTime(0.001, start + note.delay + note.duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start + note.delay);
      oscillator.stop(start + note.delay + note.duration + 0.02);
    }
  }

  private getContext(): AudioContext | null {
    try {
      if (typeof window === 'undefined') return null;
      if (!this.context) {
        const Ctor =
          window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
        if (!Ctor) return null;
        this.context = new Ctor();
      }
      if (this.context.state === 'suspended') void this.context.resume();
      return this.context;
    } catch {
      return null;
    }
  }
}

export const sfx = new Sfx(() => {
  try {
    return getSession().settings.sfx;
  } catch {
    return true;
  }
});
```

- [x] **Step 3: Desbloquear el audio en el título**

En `game/src/scenes/TitleScene.ts` añadir `import { sfx } from '../systems/audio';` y, dentro del `play.once('pointerup', () => {`, como primera línea: `sfx.unlock();`.

Run: `npm test && npm run typecheck` → Expected: PASS.

- [x] **Step 4: Commit**

```bash
git add src/systems/audio.ts src/scenes/TitleScene.ts tests/unit/audio.test.ts
git commit -m "feat(v3): sonidos provisionales con Web Audio" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: `FeedScene` — primer plano y arrastrar la comida

**Files:**
- Create: `game/src/scenes/ui.ts`, `game/src/scenes/FeedScene.ts`
- Modify: `game/src/main.ts`, `game/src/systems/testHooks.ts`

**Interfaces:**
- Consumes: `isDropOnTarget`, `Rect` (Task 2); `Session.feed` (Task 5); `sfx` (Task 6); `t`; `ANIMALS`; `FOOD_IDS`, `FOODS`.
- Produces:
  - `ui.ts`: `textStyle(size: number, color?: string, stroke?: string): Phaser.Types.GameObjects.Text.TextStyle`, `addCloseButton(scene: Phaser.Scene, onClose: () => void): Phaser.GameObjects.Text`
  - `FeedScene` (clave `'Feed'`), `interface FeedSceneData { animalId: AnimalId }`; públicos `close(): void`, `targetsOnScreen(): { animal: Vec; foods: Record<FoodId, Vec> }`, `isBusy(): boolean`. Al cerrar: `scene.stop()` + `scene.resume('World')`.
  - `COIN_TARGET = { x: 34, y: 34 }` (posición del contador de monedas del HUD, en pantalla).
  - Ganchos: `openFeed(animalId)`, `feedTargets()`, `isFeedBusy()`.

- [x] **Step 1: `ui.ts`**

`game/src/scenes/ui.ts`:

```ts
import * as Phaser from 'phaser';

export function textStyle(
  size: number,
  color = '#ffffff',
  stroke = '#1b5e20',
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: 'sans-serif',
    fontSize: `${size}px`,
    color,
    stroke,
    strokeThickness: Math.max(3, Math.round(size / 8)),
  };
}

/** Botón rojo "✖" arriba a la derecha (≥ 64 px). */
export function addCloseButton(scene: Phaser.Scene, onClose: () => void): Phaser.GameObjects.Text {
  const button = scene.add
    .text(scene.scale.width - 20, 20, '✖', {
      fontFamily: 'sans-serif',
      fontSize: '40px',
      color: '#ffffff',
      backgroundColor: '#c62828',
      padding: { x: 18, y: 10 },
    })
    .setOrigin(1, 0)
    .setDepth(30)
    .setInteractive({ useHandCursor: true });
  button.on('pointerup', onClose);
  return button;
}
```

- [x] **Step 2: `FeedScene`**

`game/src/scenes/FeedScene.ts`:

```ts
import * as Phaser from 'phaser';
import { isDropOnTarget, type Rect } from '../core/interaction';
import type { Vec } from '../core/movement';
import type { FeedResult } from '../core/reactions';
import { ANIMALS, type AnimalId } from '../data/animals';
import { FOOD_IDS, FOODS, type FoodId } from '../data/foods';
import { t } from '../data/strings';
import { sfx } from '../systems/audio';
import { getSession } from '../systems/session';
import { addCloseButton, textStyle } from './ui';

export interface FeedSceneData {
  animalId: AnimalId;
}

/** Margen (px) alrededor del animal para que soltar "cerca" cuente. */
const DROP_MARGIN = 48;
/** Contador de monedas del HUD, en coordenadas de pantalla. */
export const COIN_TARGET: Vec = { x: 34, y: 34 };
/** Retardo elástico de la comida al seguir el dedo (0..1; 1 = sin retardo). */
const FOLLOW = 0.35;

type Food = Phaser.GameObjects.Text;

export class FeedScene extends Phaser.Scene {
  private animalId: AnimalId = 'leon';
  private animal!: Phaser.GameObjects.Text;
  private speech!: Phaser.GameObjects.Text;
  private readonly foods = new Map<FoodId, Food>();
  private readonly homes = new Map<FoodId, Vec>();
  private dragging: { id: FoodId; target: Vec } | null = null;
  private busy = false;
  private pool: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('Feed');
  }

  init(data: FeedSceneData): void {
    this.animalId = data.animalId;
    this.foods.clear();
    this.homes.clear();
    this.dragging = null;
    this.busy = false;
    this.pool = [];
  }

  create(): void {
    const { width, height } = this.scale;
    const def = ANIMALS[this.animalId];

    // Fondo oscuro que además bloquea los toques al mundo.
    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0).setInteractive();
    this.add
      .rectangle(width / 2, height * 0.4, Math.min(width * 0.85, 720), height * 0.62, 0x9ccc65)
      .setStrokeStyle(6, 0x33691e);
    this.animal = this.add
      .text(width / 2, height * 0.36, def.emoji, { fontSize: `${Math.round(height * 0.26)}px` })
      .setOrigin(0.5);
    this.add.text(width / 2, height * 0.64, t(def.nameKey), textStyle(Math.round(height * 0.05))).setOrigin(0.5);
    this.speech = this.add
      .text(width / 2 + height * 0.22, height * 0.16, '', textStyle(Math.round(height * 0.06), '#ffffff', '#4e342e'))
      .setOrigin(0.5)
      .setDepth(15)
      .setVisible(false);

    this.createTray(width, height);
    addCloseButton(this, () => this.close());

    this.input.on(Phaser.Input.Events.DRAG_START, this.onDragStart, this);
    this.input.on(Phaser.Input.Events.DRAG, this.onDrag, this);
    this.input.on(Phaser.Input.Events.DRAG_END, this.onDragEnd, this);
    this.input.keyboard?.on('keydown-ESC', this.close, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.DRAG_START, this.onDragStart, this);
      this.input.off(Phaser.Input.Events.DRAG, this.onDrag, this);
      this.input.off(Phaser.Input.Events.DRAG_END, this.onDragEnd, this);
      this.input.keyboard?.off('keydown-ESC', this.close, this);
    });
  }

  update(): void {
    if (!this.dragging) return;
    const food = this.foods.get(this.dragging.id);
    if (!food) return;
    food.x += (this.dragging.target.x - food.x) * FOLLOW;
    food.y += (this.dragging.target.y - food.y) * FOLLOW;
  }

  close(): void {
    if (!this.scene.isActive()) return;
    this.scene.stop();
    this.scene.resume('World');
  }

  targetsOnScreen(): { animal: Vec; foods: Record<FoodId, Vec> } {
    const foods = {} as Record<FoodId, Vec>;
    for (const id of FOOD_IDS) {
      const home = this.homes.get(id)!;
      foods[id] = { x: home.x, y: home.y };
    }
    return { animal: { x: this.animal.x, y: this.animal.y }, foods };
  }

  isBusy(): boolean {
    return this.busy;
  }

  private createTray(width: number, height: number): void {
    const size = Phaser.Math.Clamp(Math.round(height * 0.12), 56, 96);
    const trayY = height * 0.86;
    const gap = Math.min(width / (FOOD_IDS.length + 1), size * 2.2);
    this.add
      .rectangle(width / 2, trayY, gap * FOOD_IDS.length + size * 0.5, size * 1.6, 0x6d4c41)
      .setStrokeStyle(4, 0x3e2723);
    FOOD_IDS.forEach((id, index) => {
      const x = width / 2 + (index - (FOOD_IDS.length - 1) / 2) * gap;
      const food = this.add
        .text(x, trayY, FOODS[id].emoji, { fontSize: `${size}px` })
        .setOrigin(0.5)
        .setInteractive({ draggable: true, useHandCursor: true });
      food.setData('food', id);
      this.foods.set(id, food);
      this.homes.set(id, { x, y: trayY });
    });
  }

  private onDragStart(_pointer: Phaser.Input.Pointer, food: Food): void {
    if (this.busy) return;
    const id = food.getData('food') as FoodId;
    this.tweens.killTweensOf(food);
    food.setScale(1.2).setDepth(10);
    this.dragging = { id, target: { x: food.x, y: food.y } };
    sfx.play('tap');
  }

  private onDrag(_pointer: Phaser.Input.Pointer, food: Food, dragX: number, dragY: number): void {
    if (this.dragging && this.dragging.id === food.getData('food')) {
      this.dragging.target = { x: dragX, y: dragY };
    }
  }

  private onDragEnd(pointer: Phaser.Input.Pointer, food: Food): void {
    const id = food.getData('food') as FoodId;
    if (!this.dragging || this.dragging.id !== id) return;
    this.dragging = null;
    const bounds = this.animal.getBounds();
    const target: Rect = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    if (!this.busy && isDropOnTarget({ x: pointer.x, y: pointer.y }, target, DROP_MARGIN)) {
      void this.feed(id, food);
    } else {
      this.returnHome(id, food);
    }
  }

  private async feed(id: FoodId, food: Food): Promise<void> {
    this.busy = true;
    this.tweens.add({ targets: food, x: this.animal.x, y: this.animal.y, scale: 0, duration: 180, ease: 'Quad.easeIn' });
    const result = await getSession().feed(this.animalId, id);
    this.playReaction(result);
    this.time.delayedCall(1000, () => {
      this.returnHome(id, food, true);
      this.busy = false;
    });
  }

  private returnHome(id: FoodId, food: Food, fromZero = false): void {
    const home = this.homes.get(id)!;
    food.setDepth(0);
    if (fromZero) food.setPosition(home.x, home.y).setScale(0);
    this.tweens.add({ targets: food, x: home.x, y: home.y, scale: 1, duration: 250, ease: 'Back.easeOut' });
  }

  private playReaction(result: FeedResult): void {
    const animal = this.animal;
    const baseX = this.scale.width / 2;
    this.tweens.killTweensOf(animal);
    animal.setScale(1).setAngle(0).setX(baseX);

    if (result.reaction === 'come') {
      sfx.play('come');
      this.say(`${t('feed.yum')} 😋`);
      this.tweens.add({ targets: animal, scaleY: 0.85, duration: 120, yoyo: true, repeat: 2 });
    } else if (result.reaction === 'rechaza') {
      sfx.play('rechaza');
      this.say(`${t('feed.yuck')} 🤢`);
      this.tweens.add({
        targets: animal,
        x: baseX + 14,
        duration: 60,
        yoyo: true,
        repeat: 4,
        onComplete: () => animal.setX(baseX),
      });
    } else {
      sfx.play('especial');
      this.say(`${t('feed.wow')} 🤩`);
      this.tweens.add({
        targets: animal,
        angle: 360,
        scale: 1.2,
        duration: 500,
        yoyo: true,
        onComplete: () => animal.setAngle(0).setScale(1),
      });
      this.sparkles();
    }
    this.flyCoins(result.coins);
  }

  private say(text: string): void {
    this.tweens.killTweensOf(this.speech);
    this.speech.setText(text).setVisible(true).setScale(0);
    this.tweens.add({ targets: this.speech, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.time.delayedCall(900, () => this.speech.setVisible(false));
  }

  private flyCoins(count: number): void {
    for (let i = 0; i < count; i++) {
      const coin = this.pooled('🪙', 36).setPosition(this.animal.x, this.animal.y);
      this.tweens.add({
        targets: coin,
        x: COIN_TARGET.x,
        y: COIN_TARGET.y,
        scale: 0.6,
        delay: i * 120,
        duration: 600,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          coin.setVisible(false);
          sfx.play('coin');
        },
      });
    }
  }

  private sparkles(): void {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const sparkle = this.pooled('✨', 32).setPosition(this.animal.x, this.animal.y);
      this.tweens.add({
        targets: sparkle,
        x: this.animal.x + Math.cos(angle) * 140,
        y: this.animal.y + Math.sin(angle) * 140,
        alpha: 0,
        duration: 700,
        onComplete: () => sparkle.setVisible(false),
      });
    }
  }

  /** Reutiliza textos ocultos (monedas, chispas) en vez de crear y destruir. */
  private pooled(text: string, fontSize: number): Phaser.GameObjects.Text {
    let item = this.pool.find((candidate) => !candidate.visible);
    if (!item) {
      item = this.add.text(0, 0, '').setOrigin(0.5).setDepth(20);
      this.pool.push(item);
    }
    return item.setText(text).setFontSize(fontSize).setVisible(true).setAlpha(1).setScale(1).setAngle(0);
  }
}
```

- [x] **Step 3: Registrar la escena y los ganchos**

`game/src/main.ts`: añadir `import { FeedScene } from './scenes/FeedScene';` y cambiar la lista de escenas por:

```ts
  // El orden importa: Hud va el último para dibujarse encima de todo (también de Feed/Shop).
  scene: [BootScene, PreloadScene, TitleScene, WorldScene, FeedScene, HudScene],
```

`game/src/systems/testHooks.ts` (reemplazo completo):

```ts
import type * as Phaser from 'phaser';
import type { Vec } from '../core/movement';
import type { AnimalId } from '../data/animals';
import type { FoodId } from '../data/foods';
import type { FeedScene } from '../scenes/FeedScene';
import type { HudScene } from '../scenes/HudScene';
import type { WorldScene } from '../scenes/WorldScene';
import { getSession } from './session';

export interface ZooTestApi {
  activeScenes(): string[];
  keeperPosition(): Vec | null;
  tileToScreen(x: number, y: number): Vec | null;
  addCoins(amount: number): Promise<void>;
  hudCoinsText(): string | null;
  openFeed(animalId: AnimalId): void;
  feedTargets(): { animal: Vec; foods: Record<FoodId, Vec> } | null;
  isFeedBusy(): boolean;
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
    openFeed: (animalId) => {
      if (game.scene.isActive('World')) game.scene.pause('World');
      game.scene.start('Feed', { animalId });
    },
    feedTargets: () => activeScene<FeedScene>('Feed')?.targetsOnScreen() ?? null,
    isFeedBusy: () => activeScene<FeedScene>('Feed')?.isBusy() ?? false,
  };
}
```

- [x] **Step 4: Verificar**

Run: `npm run typecheck && npm test && npm run test:e2e` → Expected: todo en verde.

Verificación manual en el navegador integrado (`preview_start` nombre `game`, pane visible): Jugar → en consola `__ZOO__.openFeed('leon')` → se ve el león grande sobre fondo verde, bandeja con 🪨🥩🐇🥕 y ✖ rojo. Arrastrar 🥩 al león → "¡Ñam! 😋", sonido, una 🪙 vuela al contador y el HUD pasa a 🪙 1. Arrastrar 🪨 → "¡Puaj! 🤢", tiembla, sin monedas. Soltar 🥕 en una esquina → vuelve a la bandeja. `__ZOO__.openFeed('cabra')` + 🐇 → "¡Guau!", gira, chispas, +2. ✖ o Esc cierran. Sin errores en consola.

- [x] **Step 5: Commit**

```bash
git add src/scenes/ui.ts src/scenes/FeedScene.ts src/main.ts src/systems/testHooks.ts
git commit -m "feat(v3): escena de dar de comer con arrastrar, reacciones y monedas voladoras" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: `ShopScene` — tendero y compras

**Files:**
- Create: `game/src/scenes/ShopScene.ts`
- Modify: `game/src/main.ts`, `game/src/systems/testHooks.ts`

**Interfaces:**
- Consumes: `Session.buy` (Task 5); `SHOP_ITEMS`, `ShopItemDef`; `ANIMALS`; `sfx`; `textStyle`, `addCloseButton`.
- Produces: `ShopScene` (clave `'Shop'`) con `close(): void` y `cardScreenPos(itemId: string): Vec | null`. Ganchos `openShop()`, `shopCardScreenPos(id)`, `unlocked()`.

- [x] **Step 1: `ShopScene`**

`game/src/scenes/ShopScene.ts`:

```ts
import * as Phaser from 'phaser';
import type { Vec } from '../core/movement';
import { ANIMALS } from '../data/animals';
import { SHOP_ITEMS, type ShopItemDef } from '../data/shop';
import { t } from '../data/strings';
import { sfx } from '../systems/audio';
import { getSession } from '../systems/session';
import { addCloseButton, textStyle } from './ui';

export class ShopScene extends Phaser.Scene {
  private readonly cards = new Map<string, Phaser.GameObjects.Container>();
  private cardWidth = 200;
  private cardHeight = 260;
  private busy = false;

  constructor() {
    super('Shop');
  }

  init(): void {
    this.cards.clear();
    this.busy = false;
  }

  create(): void {
    const { width, height } = this.scale;
    const panelWidth = Math.min(width * 0.9, 900);
    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0).setInteractive();
    this.add.rectangle(width / 2, height / 2, panelWidth, height * 0.82, 0xfff3e0).setStrokeStyle(6, 0xe65100);
    this.add
      .text(width / 2, height * 0.17, `🏪 ${t('shop.title')}`, textStyle(Math.round(height * 0.065), '#ffffff', '#e65100'))
      .setOrigin(0.5);
    this.add
      .text(width / 2 - panelWidth / 2 + 24, height * 0.17, '🧑‍🌾', { fontSize: `${Math.round(height * 0.1)}px` })
      .setOrigin(0, 0.5);

    this.cardWidth = Math.min(220, (panelWidth * 0.8) / SHOP_ITEMS.length);
    this.cardHeight = Math.min(300, height * 0.52);
    SHOP_ITEMS.forEach((item, index) => this.createCard(item, index));

    addCloseButton(this, () => this.close());
    this.input.keyboard?.on('keydown-ESC', this.close, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', this.close, this);
    });
  }

  close(): void {
    if (!this.scene.isActive()) return;
    this.scene.stop();
    this.scene.resume('World');
  }

  cardScreenPos(itemId: string): Vec | null {
    const card = this.cards.get(itemId);
    return card ? { x: card.x, y: card.y } : null;
  }

  private createCard(item: ShopItemDef, index: number): void {
    const { width, height } = this.scale;
    const count = SHOP_ITEMS.length;
    const x = width / 2 + (index - (count - 1) / 2) * (this.cardWidth + 28);
    const card = this.add.container(x, height * 0.57);
    card.setInteractive(
      new Phaser.Geom.Rectangle(-this.cardWidth / 2, -this.cardHeight / 2, this.cardWidth, this.cardHeight),
      Phaser.Geom.Rectangle.Contains,
    );
    card.on('pointerup', () => void this.onCardTap(item));
    this.cards.set(item.id, card);
    this.renderCard(item);
  }

  private renderCard(item: ShopItemDef): void {
    const card = this.cards.get(item.id);
    if (!card) return;
    card.removeAll(true);
    const state = getSession().state;
    const owned = state.unlocked.includes(item.animalId);
    const affordable = state.coins >= item.cost;
    const w = this.cardWidth;
    const h = this.cardHeight;
    const def = ANIMALS[item.animalId];

    card.add(this.add.rectangle(0, 0, w, h, owned ? 0xc8e6c9 : 0xffffff).setStrokeStyle(4, 0x8d6e63));
    card.add(this.add.text(0, -h * 0.2, def.emoji, { fontSize: `${Math.round(h * 0.3)}px` }).setOrigin(0.5));
    card.add(this.add.text(0, h * 0.08, t(def.nameKey), textStyle(Math.round(h * 0.08), '#ffffff', '#5d4037')).setOrigin(0.5));
    const label = owned ? `✅ ${t('shop.owned')}` : `🪙 ${item.cost}`;
    const color = owned ? '#2e7d32' : affordable ? '#43a047' : '#9e9e9e';
    card.add(
      this.add
        .text(0, h * 0.32, label, {
          fontFamily: 'sans-serif',
          fontSize: `${Math.round(h * 0.09)}px`,
          color: '#ffffff',
          backgroundColor: color,
          padding: { x: 16, y: 12 },
        })
        .setOrigin(0.5),
    );
  }

  private async onCardTap(item: ShopItemDef): Promise<void> {
    if (this.busy) return;
    const card = this.cards.get(item.id);
    if (!card) return;
    this.busy = true;
    const result = await getSession().buy(item.id);
    if (result.ok) {
      sfx.play('buy');
      this.renderCard(item);
      this.tweens.add({ targets: card, scale: 1.12, duration: 150, yoyo: true });
    } else if (result.error === 'not-enough-coins') {
      sfx.play('rechaza');
      this.tweens.add({ targets: card, x: card.x + 10, duration: 50, yoyo: true, repeat: 3 });
    }
    this.busy = false;
  }
}
```

- [x] **Step 2: Registrar y ganchos**

`game/src/main.ts`: añadir `import { ShopScene } from './scenes/ShopScene';` y la lista `scene: [BootScene, PreloadScene, TitleScene, WorldScene, FeedScene, ShopScene, HudScene],`.

En `game/src/systems/testHooks.ts`:
- Añadir `import type { ShopScene } from '../scenes/ShopScene';`
- En `ZooTestApi` añadir:

```ts
  openShop(): void;
  shopCardScreenPos(itemId: string): Vec | null;
  unlocked(): string[];
```

- En el objeto `window.__ZOO__` añadir:

```ts
    openShop: () => {
      if (game.scene.isActive('World')) game.scene.pause('World');
      game.scene.start('Shop');
    },
    shopCardScreenPos: (itemId) => activeScene<ShopScene>('Shop')?.cardScreenPos(itemId) ?? null,
    unlocked: () => [...getSession().state.unlocked],
```

- [x] **Step 3: Verificar**

Run: `npm run typecheck && npm test && npm run test:e2e` → Expected: verde.

Manual (navegador integrado): Jugar → `await __ZOO__.addCoins(60)` → `__ZOO__.openShop()` → tarjetas Pantera (🪙 50, verde) y Panda (🪙 100, gris). Tocar Pantera → fanfarria, pasa a "✅ ¡Ya es tuyo!", HUD 🪙 10. Tocar Panda → tiembla, no compra. ✖ cierra.

- [x] **Step 4: Commit**

```bash
git add src/scenes/ShopScene.ts src/main.ts src/systems/testHooks.ts
git commit -m "feat(v3): escena de tienda con tarjetas y compra" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: HUD — pop de monedas, avisos y joystick opcional

**Files:**
- Create: `game/src/systems/joystickState.ts`
- Modify (reemplazo completo): `game/src/scenes/HudScene.ts`

**Interfaces:**
- Consumes: bus (`coins-changed`, `toast`, `shop-unlocked`, `animal-unlocked`), `Session.updateSettings`, `joystickVector`, `knobOffset`, `inJoystickZone`, `JOYSTICK_RADIUS`, `sfx`, `t`, `ANIMALS`.
- Produces: `joystickState: { vector: Vec }` (lo lee `WorldScene`); `HudScene.coinsLabel(): string` (sin cambios); botón 🕹️ arriba a la derecha que activa/desactiva el joystick y lo guarda en ajustes.

- [x] **Step 1: Estado compartido del joystick**

`game/src/systems/joystickState.ts`:

```ts
import type { Vec } from '../core/movement';

/** Dirección actual del joystick virtual (magnitud 0..1). La escribe el HUD y la lee el mundo. */
export const joystickState: { vector: Vec } = { vector: { x: 0, y: 0 } };
```

- [x] **Step 2: `HudScene`**

`game/src/scenes/HudScene.ts` (reemplazo completo):

```ts
import * as Phaser from 'phaser';
import { JOYSTICK_RADIUS, inJoystickZone, joystickVector, knobOffset } from '../core/joystick';
import type { Vec } from '../core/movement';
import { ANIMALS } from '../data/animals';
import { t } from '../data/strings';
import { sfx } from '../systems/audio';
import { bus } from '../systems/events';
import { joystickState } from '../systems/joystickState';
import { getSession } from '../systems/session';
import { textStyle } from './ui';

export class HudScene extends Phaser.Scene {
  private coinsText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private toggle!: Phaser.GameObjects.Text;
  private stickBase!: Phaser.GameObjects.Arc;
  private stickKnob!: Phaser.GameObjects.Arc;
  private stickOrigin: Vec | null = null;
  private stickPointerId: number | null = null;

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

    this.toastText = this.add
      .text(this.scale.width / 2, 90, '', textStyle(28, '#ffffff', '#000000'))
      .setOrigin(0.5)
      .setDepth(50)
      .setVisible(false);

    this.toggle = this.add
      .text(this.scale.width - 16, 16, '🕹️', { fontSize: '40px', backgroundColor: '#00000055', padding: { x: 10, y: 8 } })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    this.toggle.on('pointerup', () => void this.toggleJoystick());
    this.renderToggle();

    this.stickBase = this.add.circle(0, 0, JOYSTICK_RADIUS, 0xffffff, 0.25).setVisible(false);
    this.stickKnob = this.add.circle(0, 0, 28, 0xffffff, 0.7).setVisible(false);

    const unsubscribe = [
      bus.on('coins-changed', ({ coins }) => this.renderCoins(coins, true)),
      bus.on('toast', ({ text }) => this.showToast(text)),
      bus.on('shop-unlocked', () => {
        sfx.play('unlock');
        this.showToast(t('toast.shopOpen'));
      }),
      bus.on('animal-unlocked', ({ animalId }) =>
        this.showToast(t('toast.newAnimal', { name: t(ANIMALS[animalId].nameKey) })),
      ),
    ];

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const off of unsubscribe) off();
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
      this.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
      this.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
      joystickState.vector = { x: 0, y: 0 };
    });
  }

  coinsLabel(): string {
    return this.coinsText.text;
  }

  private renderCoins(coins: number, pop = false): void {
    this.coinsText.setText(`🪙 ${coins}`);
    if (pop) {
      this.tweens.killTweensOf(this.coinsText);
      this.coinsText.setScale(1);
      this.tweens.add({ targets: this.coinsText, scale: 1.3, duration: 120, yoyo: true });
    }
  }

  private showToast(text: string): void {
    this.tweens.killTweensOf(this.toastText);
    this.toastText.setText(text).setPosition(this.scale.width / 2, 90).setVisible(true).setAlpha(1).setScale(0.6);
    this.tweens.add({ targets: this.toastText, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      delay: 1800,
      duration: 400,
      onComplete: () => this.toastText.setVisible(false),
    });
  }

  private async toggleJoystick(): Promise<void> {
    sfx.play('tap');
    await getSession().updateSettings({ joystick: !getSession().settings.joystick });
    this.renderToggle();
  }

  private renderToggle(): void {
    this.toggle.setAlpha(getSession().settings.joystick ? 1 : 0.45);
  }

  private layout(): void {
    this.toggle.setPosition(this.scale.width - 16, 16);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!getSession().settings.joystick || this.stickPointerId !== null) return;
    if (!this.scene.isActive('World')) return; // Feed/Shop abiertas: el mundo está pausado
    const point = { x: pointer.x, y: pointer.y };
    if (!inJoystickZone(point, this.scale.width, this.scale.height)) return;
    this.stickPointerId = pointer.id;
    this.stickOrigin = point;
    this.stickBase.setPosition(point.x, point.y).setVisible(true);
    this.stickKnob.setPosition(point.x, point.y).setVisible(true);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.stickPointerId || !this.stickOrigin) return;
    const current = { x: pointer.x, y: pointer.y };
    joystickState.vector = joystickVector(this.stickOrigin, current);
    const offset = knobOffset(this.stickOrigin, current);
    this.stickKnob.setPosition(this.stickOrigin.x + offset.x, this.stickOrigin.y + offset.y);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.stickPointerId) return;
    this.stickPointerId = null;
    this.stickOrigin = null;
    joystickState.vector = { x: 0, y: 0 };
    this.stickBase.setVisible(false);
    this.stickKnob.setVisible(false);
  }
}
```

- [x] **Step 3: Verificar y commit**

Run: `npm run typecheck && npm test && npm run test:e2e` → Expected: verde.

Manual: Jugar → `await __ZOO__.addCoins(20)` → el contador hace "pop" y aparece "¡La tienda está abierta!". Tocar 🕹️ → se ilumina; recargar → sigue activo.

```bash
git add src/systems/joystickState.ts src/scenes/HudScene.ts
git commit -m "feat(v3): HUD con pop de monedas, avisos y joystick opcional" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: El mundo — animales, bocadillo, tienda, visitantes y joystick

**Files:**
- Create: `game/src/world/Pens.ts`, `game/src/world/ShopBuilding.ts`, `game/src/world/VisitorCrowd.ts`
- Modify (reemplazo completo): `game/src/scenes/WorldScene.ts`, `game/src/systems/testHooks.ts`

**Interfaces:**
- Consumes: `readEnclosures`, `readGates`, `readShop`, `ShopInfo`, `EnclosureInfo`, `GateInfo`; `gateInReach`, `rectContains`, `Rect`; `inJoystickZone`; `walkableTiles`, `pickRandom`, `planWander`, `Rng`; `joystickState`; `bus` (`shop-unlocked`, `toast`); `shopItemForAnimal`; `SHOP_UNLOCK_COINS`; `sfx`; `FeedSceneData`.
- Produces:
  - `Pens`: `update(time)`, `updateBubble(keeperTile, state)`, `bubbleHit(point): AnimalId | null`, `bubblePosition(): Vec | null`, `lockedPenAt(point, state): AnimalId | null`, `syncUnlocks(state)`
  - `ShopBuilding`: `onKeeperTile(tile, state): 'open' | 'locked' | null`, `sync(state)`
  - `VisitorCrowd`: `update(delta)`
  - `WorldScene` públicos: `goTo(world)`, `goToTile(x, y)`, `keeperPosition()`, `tileToScreen(tile)`, `worldToScreen(world)`, `bubbleScreenPos()`
  - Ganchos nuevos: `goToTile(x, y)`, `bubbleScreenPos()`

- [x] **Step 1: `Pens`**

`game/src/world/Pens.ts`:

```ts
import * as Phaser from 'phaser';
import type { GameState } from '../core/economy';
import { gateInReach, rectContains, type Rect } from '../core/interaction';
import type { Vec } from '../core/movement';
import type { Point } from '../core/pathfinding';
import type { EnclosureInfo, GateInfo } from '../core/tiledmap';
import { ANIMALS, isAnimalId, type AnimalId } from '../data/animals';
import { shopItemForAnimal } from '../data/shop';
import { t } from '../data/strings';

interface Pen {
  id: AnimalId;
  rect: Rect;
  gate: Point;
  home: Vec;
  animal: Phaser.GameObjects.Text;
  lock: Phaser.GameObjects.Text;
  phase: number;
  shown: boolean;
}

const LABEL_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'sans-serif',
  fontSize: '9px',
  color: '#ffffff',
  stroke: '#000000',
  strokeThickness: 2,
};

/** Recintos: animal (emoji provisional), candado con precio y bocadillo de "dar de comer". */
export class Pens {
  private readonly pens: Pen[] = [];
  private readonly bubble: Phaser.GameObjects.Text;
  private readonly sparklePool: Phaser.GameObjects.Text[] = [];
  private bubbleFor: AnimalId | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    enclosures: EnclosureInfo[],
    gates: GateInfo[],
    state: GameState,
  ) {
    for (const enclosure of enclosures) {
      if (!isAnimalId(enclosure.animalId)) continue;
      const id = enclosure.animalId;
      const gate = gates.find((g) => g.animalId === id);
      if (!gate) continue;
      const def = ANIMALS[id];
      const home = { x: enclosure.x + enclosure.width / 2, y: enclosure.y + enclosure.height / 2 };
      const unlocked = state.unlocked.includes(id);
      const price = shopItemForAnimal(id)?.cost;

      scene.add.text(home.x, enclosure.y + 11, t(def.nameKey), LABEL_STYLE).setOrigin(0.5).setResolution(4).setDepth(6);
      const animal = scene.add
        .text(home.x, home.y, def.emoji, { fontSize: '22px' })
        .setOrigin(0.5)
        .setResolution(4)
        .setDepth(5)
        .setAlpha(unlocked ? 1 : 0.25);
      const lock = scene.add
        .text(home.x, home.y + 14, price ? `🔒 ${price}🪙` : '🔒', {
          fontFamily: 'sans-serif',
          fontSize: '10px',
          color: '#ffffff',
          backgroundColor: '#000000aa',
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5)
        .setResolution(4)
        .setDepth(7)
        .setVisible(!unlocked);

      this.pens.push({
        id,
        rect: { x: enclosure.x, y: enclosure.y, width: enclosure.width, height: enclosure.height },
        gate: gate.tile,
        home,
        animal,
        lock,
        phase: Math.random() * Math.PI * 2,
        shown: unlocked,
      });
    }

    this.bubble = scene.add
      .text(0, 0, '🥣', { fontSize: '14px', backgroundColor: '#ffffff', padding: { x: 3, y: 2 } })
      .setOrigin(0.5, 1)
      .setResolution(4)
      .setDepth(8)
      .setVisible(false);
    scene.tweens.add({ targets: this.bubble, scale: 1.15, duration: 450, yoyo: true, repeat: -1 });
  }

  /** Paseo suave de los animales dentro del recinto. */
  update(time: number): void {
    for (const pen of this.pens) {
      pen.animal.x = pen.home.x + Math.sin(time / 1300 + pen.phase) * 6;
      pen.animal.y = pen.home.y + Math.sin(time / 450 + pen.phase) * 1.5;
    }
    if (this.bubbleFor) {
      const pen = this.pen(this.bubbleFor);
      this.bubble.setPosition(pen.animal.x, pen.animal.y - 12);
    }
  }

  updateBubble(keeperTile: Point, state: GameState): void {
    const open = this.pens
      .filter((pen) => state.unlocked.includes(pen.id))
      .map((pen) => ({ animalId: pen.id, tile: pen.gate }));
    const near = gateInReach(keeperTile, open);
    this.bubbleFor = near ? near.animalId : null;
    this.bubble.setVisible(this.bubbleFor !== null);
  }

  bubbleHit(point: Vec): AnimalId | null {
    if (!this.bubbleFor || !this.bubble.visible) return null;
    const b = this.bubble.getBounds();
    return rectContains({ x: b.x, y: b.y, width: b.width, height: b.height }, point, 6) ? this.bubbleFor : null;
  }

  bubblePosition(): Vec | null {
    if (!this.bubble.visible) return null;
    const b = this.bubble.getBounds();
    return { x: b.centerX, y: b.centerY };
  }

  lockedPenAt(point: Vec, state: GameState): AnimalId | null {
    const pen = this.pens.find((p) => !state.unlocked.includes(p.id) && rectContains(p.rect, point));
    return pen?.id ?? null;
  }

  /** Anima los recintos recién comprados (se llama al volver de la tienda). */
  syncUnlocks(state: GameState): void {
    for (const pen of this.pens) {
      if (!pen.shown && state.unlocked.includes(pen.id)) {
        pen.shown = true;
        this.playUnlock(pen);
      }
    }
  }

  private playUnlock(pen: Pen): void {
    this.scene.tweens.add({
      targets: pen.lock,
      scale: 1.8,
      alpha: 0,
      duration: 400,
      onComplete: () => pen.lock.setVisible(false),
    });
    pen.animal.setAlpha(1).setScale(0);
    this.scene.tweens.add({ targets: pen.animal, scale: 1, duration: 600, delay: 300, ease: 'Back.easeOut' });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const sparkle = this.sparkle().setPosition(pen.home.x, pen.home.y);
      this.scene.tweens.add({
        targets: sparkle,
        x: pen.home.x + Math.cos(angle) * 30,
        y: pen.home.y + Math.sin(angle) * 30,
        alpha: 0,
        delay: 300,
        duration: 700,
        onComplete: () => sparkle.setVisible(false),
      });
    }
  }

  private sparkle(): Phaser.GameObjects.Text {
    let item = this.sparklePool.find((s) => !s.visible);
    if (!item) {
      item = this.scene.add.text(0, 0, '✨', { fontSize: '10px' }).setOrigin(0.5).setResolution(4).setDepth(9);
      this.sparklePool.push(item);
    }
    return item.setVisible(true).setAlpha(1);
  }

  private pen(id: AnimalId): Pen {
    const pen = this.pens.find((p) => p.id === id);
    if (!pen) throw new Error(`Recinto desconocido: ${id}`);
    return pen;
  }
}
```

- [x] **Step 2: `ShopBuilding`**

`game/src/world/ShopBuilding.ts`:

```ts
import * as Phaser from 'phaser';
import type { GameState } from '../core/economy';
import type { Point } from '../core/pathfinding';
import type { ShopInfo } from '../core/tiledmap';
import { SHOP_UNLOCK_COINS } from '../data/shop';
import { t } from '../data/strings';

export type ShopDoorEvent = 'open' | 'locked' | null;

export class ShopBuilding {
  private readonly lock: Phaser.GameObjects.Text;
  private atDoor = false;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly info: ShopInfo,
    state: GameState,
  ) {
    const cx = info.x + info.width / 2;
    const cy = info.y + info.height / 2;
    scene.add.text(cx, cy, '🏪', { fontSize: '26px' }).setOrigin(0.5).setResolution(4).setDepth(5);
    scene.add
      .text(cx, info.y - 6, t('shop.label'), {
        fontFamily: 'sans-serif',
        fontSize: '9px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setResolution(4)
      .setDepth(6);
    this.lock = scene.add
      .text(cx, cy + 16, `🔒 ${SHOP_UNLOCK_COINS}🪙`, {
        fontFamily: 'sans-serif',
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setResolution(4)
      .setDepth(7)
      .setVisible(!state.shopUnlocked);
  }

  /** 'open'/'locked' solo al llegar a la puerta; no se repite hasta salir de ella. */
  onKeeperTile(tile: Point, state: GameState): ShopDoorEvent {
    const onDoor = tile.x === this.info.door.x && tile.y === this.info.door.y;
    if (!onDoor) {
      this.atDoor = false;
      return null;
    }
    if (this.atDoor) return null;
    this.atDoor = true;
    return state.shopUnlocked ? 'open' : 'locked';
  }

  sync(state: GameState): void {
    if (!state.shopUnlocked || !this.lock.visible) return;
    this.scene.tweens.add({
      targets: this.lock,
      scale: 1.8,
      alpha: 0,
      duration: 400,
      onComplete: () => this.lock.setVisible(false),
    });
  }
}
```

- [x] **Step 3: `VisitorCrowd`**

`game/src/world/VisitorCrowd.ts`:

```ts
import * as Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import { stepAlongPath, tileCenter, worldToTile, type Vec } from '../core/movement';
import type { Point, WalkGrid } from '../core/pathfinding';
import { pickRandom, planWander, walkableTiles, type Rng } from '../core/wander';

const VISITOR_EMOJIS = ['🧒', '👧', '👦', '👩', '👨', '🧓', '👵', '👴'];
/** Más lentos que el cuidador (64 px/s). */
const VISITOR_SPEED = 28;

interface Visitor {
  sprite: Phaser.GameObjects.Text;
  route: Vec[];
  wait: number;
}

/** Número fijo de visitantes que se reutilizan siempre (nada de crear/destruir). */
export class VisitorCrowd {
  private readonly visitors: Visitor[] = [];
  private readonly tiles: Point[];

  constructor(
    scene: Phaser.Scene,
    private readonly grid: WalkGrid,
    private readonly rng: Rng = Math.random,
  ) {
    this.tiles = walkableTiles(grid);
    for (const emoji of VISITOR_EMOJIS) {
      const start = pickRandom(this.tiles, rng);
      if (!start) break;
      const pos = tileCenter(start, TILE_SIZE);
      const sprite = scene.add.text(pos.x, pos.y, emoji, { fontSize: '12px' }).setOrigin(0.5, 0.8).setResolution(4).setDepth(4);
      this.visitors.push({ sprite, route: [], wait: rng() * 1500 });
    }
  }

  update(delta: number): void {
    for (const visitor of this.visitors) {
      if (visitor.route.length === 0) {
        visitor.wait -= delta;
        if (visitor.wait > 0) continue;
        const path = planWander(this.grid, worldToTile(visitor.sprite, TILE_SIZE), this.tiles, this.rng);
        visitor.route = path ? path.slice(1).map((tile) => tileCenter(tile, TILE_SIZE)) : [];
        visitor.wait = 800 + this.rng() * 2200;
        continue;
      }
      const step = stepAlongPath(visitor.sprite, visitor.route, VISITOR_SPEED, delta);
      visitor.sprite.setPosition(step.pos.x, step.pos.y);
      visitor.route = step.remaining;
    }
  }
}
```

- [x] **Step 4: `WorldScene`**

`game/src/scenes/WorldScene.ts` (reemplazo completo):

```ts
import * as Phaser from 'phaser';
import { KEEPER_SPEED, MAPS, TEXTURES, TILE_SIZE } from '../config';
import { inJoystickZone } from '../core/joystick';
import { stepAlongPath, tileCenter, tryMove, worldToTile, type Vec } from '../core/movement';
import { findPathOrNearest, type Point, type WalkGrid } from '../core/pathfinding';
import { buildWalkGrid, readEnclosures, readGates, readShop, readSpawn, type TiledMap } from '../core/tiledmap';
import type { AnimalId } from '../data/animals';
import { SHOP_UNLOCK_COINS } from '../data/shop';
import { t } from '../data/strings';
import { sfx } from '../systems/audio';
import { bus } from '../systems/events';
import { joystickState } from '../systems/joystickState';
import { getSession } from '../systems/session';
import { computeZoom } from '../systems/viewport';
import { Pens } from '../world/Pens';
import { ShopBuilding } from '../world/ShopBuilding';
import { VisitorCrowd } from '../world/VisitorCrowd';
import type { FeedSceneData } from './FeedScene';

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
  private pens!: Pens;
  private shop: ShopBuilding | null = null;
  private visitors!: VisitorCrowd;

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

    const state = getSession().state;
    this.pens = new Pens(this, readEnclosures(mapData), readGates(mapData), state);
    const shopInfo = readShop(mapData);
    this.shop = shopInfo ? new ShopBuilding(this, shopInfo, state) : null;
    this.visitors = new VisitorCrowd(this, this.grid);

    const spawn = tileCenter(readSpawn(mapData), TILE_SIZE);
    this.marker = this.add.image(0, 0, TEXTURES.marker).setVisible(false).setDepth(3);
    this.keeper = this.add.image(spawn.x, spawn.y, TEXTURES.keeper).setDepth(10);
    this.route = [];

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

    const offShopUnlocked = bus.on('shop-unlocked', () => this.shop?.sync(getSession().state));
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.applyZoom, this);
      this.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
      this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
      offShopUnlocked();
    });
  }

  update(time: number, delta: number): void {
    this.visitors.update(delta);
    this.pens.update(time);
    this.moveKeeper(delta);

    const tile = worldToTile(this.keeper, TILE_SIZE);
    const state = getSession().state;
    this.pens.updateBubble(tile, state);
    const doorEvent = this.shop?.onKeeperTile(tile, state) ?? null;
    if (doorEvent === 'open') this.openShop();
    else if (doorEvent === 'locked') bus.emit('toast', { text: t('toast.shopLocked', { n: SHOP_UNLOCK_COINS }) });
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

  goToTile(x: number, y: number): boolean {
    return this.goTo(tileCenter({ x, y }, TILE_SIZE));
  }

  keeperPosition(): Vec {
    return { x: this.keeper.x, y: this.keeper.y };
  }

  worldToScreen(world: Vec): Vec {
    const camera = this.cameras.main;
    return {
      x: (world.x - camera.worldView.x) * camera.zoom,
      y: (world.y - camera.worldView.y) * camera.zoom,
    };
  }

  /** Centro del tile en coordenadas relativas al canvas (para tests). */
  tileToScreen(tile: Point): Vec {
    return this.worldToScreen(tileCenter(tile, TILE_SIZE));
  }

  bubbleScreenPos(): Vec | null {
    const position = this.pens.bubblePosition();
    return position ? this.worldToScreen(position) : null;
  }

  private moveKeeper(delta: number): void {
    const direction = this.inputDirection();
    const length = Math.hypot(direction.x, direction.y);
    if (length > 0) {
      this.route = [];
      this.marker.setVisible(false);
      const distance = ((KEEPER_SPEED * delta) / 1000) * Math.min(1, length);
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

  /** Teclado si se está usando; si no, el joystick virtual. */
  private inputDirection(): Vec {
    const c = this.cursors;
    const k = this.wasd;
    if (c && k) {
      const x = (c.right.isDown || k.D.isDown ? 1 : 0) - (c.left.isDown || k.A.isDown ? 1 : 0);
      const y = (c.down.isDown || k.S.isDown ? 1 : 0) - (c.up.isDown || k.W.isDown ? 1 : 0);
      if (x !== 0 || y !== 0) return { x, y };
    }
    return joystickState.vector;
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.getDistance() > TAP_MAX_DISTANCE) return;
    const down = { x: pointer.downX, y: pointer.downY };
    if (getSession().settings.joystick && inJoystickZone(down, this.scale.width, this.scale.height)) return;

    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const world = { x: point.x, y: point.y };
    const feedTarget = this.pens.bubbleHit(world);
    if (feedTarget) {
      this.openFeed(feedTarget);
      return;
    }
    if (this.pens.lockedPenAt(world, getSession().state)) bus.emit('toast', { text: t('toast.needShop') });
    this.goTo(world);
  }

  private openFeed(animalId: AnimalId): void {
    this.stopWalking();
    sfx.play('tap');
    this.scene.pause();
    const data: FeedSceneData = { animalId };
    this.scene.launch('Feed', data);
  }

  private openShop(): void {
    this.stopWalking();
    this.scene.pause();
    this.scene.launch('Shop');
  }

  private stopWalking(): void {
    this.route = [];
    this.marker.setVisible(false);
  }

  private onResume(): void {
    const state = getSession().state;
    this.pens.syncUnlocks(state);
    this.shop?.sync(state);
  }

  private applyZoom(): void {
    this.cameras.main.setZoom(computeZoom(this.scale.width, this.scale.height));
  }
}
```

- [x] **Step 5: Ganchos de test**

En `game/src/systems/testHooks.ts`:
- En `ZooTestApi` añadir:

```ts
  goToTile(x: number, y: number): boolean;
  bubbleScreenPos(): Vec | null;
```

- En `window.__ZOO__` añadir:

```ts
    goToTile: (x, y) => activeScene<WorldScene>('World')?.goToTile(x, y) ?? false,
    bubbleScreenPos: () => activeScene<WorldScene>('World')?.bubbleScreenPos() ?? null,
```

- [x] **Step 6: Verificar**

Run: `npm run typecheck && npm test && npm run test:e2e` → Expected: verde.

Manual (navegador integrado, pane visible; y en móvil con `npm run build && npx cap sync android` + ▶ en Android Studio):
1. Se ven 🦁 y 🐐 moviéndose en sus recintos; 🐆 y 🐼 apagados con "🔒 50🪙" / "🔒 100🪙"; 🏪 con "🔒 20🪙"; 8 visitantes paseando por los caminos.
2. Ir hacia la puerta del león → aparece 🥣 sobre el león; tocarlo → escena de dar de comer.
3. Tocar dentro del recinto de la pantera → aviso "Cómpralo en la tienda 🏪".
4. Ir a la puerta de la tienda con < 20 monedas → aviso "La tienda abre con 20 monedas".
5. Ganar 20 monedas → aviso de tienda abierta y el candado de la tienda desaparece; entrar → tienda; comprar pantera → al cerrar, el recinto se abre con animación.
6. Activar 🕹️ → arrastrar abajo a la izquierda mueve al cuidador; un toque en el resto de la pantalla sigue funcionando.

- [x] **Step 7: Commit**

```bash
git add src/world src/scenes/WorldScene.ts src/systems/testHooks.ts
git commit -m "feat(v3): mundo con animales, bocadillo de comer, tienda, visitantes y joystick" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Pruebas de juego completas (Playwright)

**Files:**
- Create: `game/tests/e2e/play.spec.ts`

**Interfaces:**
- Consumes: ganchos `goToTile`, `bubbleScreenPos`, `feedTargets`, `isFeedBusy`, `addCoins`, `hudCoinsText`, `shopCardScreenPos`, `unlocked`, `activeScenes`. Mapa de prueba: conexión de la puerta del león en (10, 12); puerta de la tienda en (18, 6).

- [x] **Step 1: Escribir las pruebas**

`game/tests/e2e/play.spec.ts`:

```ts
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

async function walkTo(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(([tx, ty]) => window.__ZOO__!.goToTile(tx!, ty!), [x, y]);
  const cx = x * 16 + 8;
  const cy = y * 16 + 8;
  await expect
    .poll(() => page.evaluate(() => window.__ZOO__!.keeperPosition()), { timeout: 10_000 })
    .toEqual({ x: cx, y: cy });
}

async function dragFood(page: Page, food: string): Promise<void> {
  const targets = await page.evaluate(() => window.__ZOO__!.feedTargets());
  if (!targets) throw new Error('La escena de comer no está abierta');
  const box = await canvasBox(page);
  const from = (targets.foods as Record<string, { x: number; y: number }>)[food]!;
  await page.mouse.move(box.x + from.x, box.y + from.y);
  await page.mouse.down();
  await page.mouse.move(box.x + targets.animal.x, box.y + targets.animal.y, { steps: 12 });
  await page.mouse.up();
  // Dar tiempo a que Phaser procese el dragend y marque la escena como ocupada.
  await page.waitForTimeout(150);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.isFeedBusy())).toBe(false);
}

test('ir al león, abrir el bocadillo y darle de comer arrastrando', async ({ page }) => {
  await startGame(page);
  await walkTo(page, 10, 12);

  const bubble = await page.evaluate(() => window.__ZOO__!.bubbleScreenPos());
  expect(bubble).not.toBeNull();
  const box = await canvasBox(page);
  await page.mouse.click(box.x + bubble!.x, box.y + bubble!.y);
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Feed'));

  await dragFood(page, 'carne');
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.hudCoinsText())).toBe('🪙 1');

  await dragFood(page, 'piedra');
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.hudCoinsText())).toBe('🪙 1');

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => {
    const scenes = window.__ZOO__?.activeScenes() ?? [];
    return scenes.includes('World') && !scenes.includes('Feed');
  });
});

test('soltar la comida lejos no da monedas', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.openFeed('leon'));
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Feed'));
  const targets = await page.evaluate(() => window.__ZOO__!.feedTargets());
  const box = await canvasBox(page);
  await page.mouse.move(box.x + targets!.foods.carne.x, box.y + targets!.foods.carne.y);
  await page.mouse.down();
  await page.mouse.move(box.x + 20, box.y + box.height - 20, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__ZOO__!.hudCoinsText())).toBe('🪙 0');
});

test('con 60 monedas se entra en la tienda y se compra la pantera', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.addCoins(60));
  await walkTo(page, 18, 6);
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Shop'));

  const card = await page.evaluate(() => window.__ZOO__!.shopCardScreenPos('pantera'));
  const box = await canvasBox(page);
  await page.mouse.click(box.x + card!.x, box.y + card!.y);

  await expect.poll(() => page.evaluate(() => window.__ZOO__!.hudCoinsText())).toBe('🪙 10');
  expect(await page.evaluate(() => window.__ZOO__!.unlocked())).toContain('pantera');

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__ZOO__?.activeScenes().includes('Shop'));

  await page.reload();
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
  expect(await page.evaluate(() => window.__ZOO__!.unlocked())).toContain('pantera');
});

test('sin 20 monedas la tienda no se abre', async ({ page }) => {
  await startGame(page);
  await walkTo(page, 18, 6);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__ZOO__!.activeScenes())).not.toContain('Shop');
});
```

- [x] **Step 2: Ejecutar**

Run: `npm run test:e2e`
Expected: 7 passed (3 de `smoke.spec.ts` + 4 de `play.spec.ts`). Si falla el clic en el bocadillo por su oscilación, subir el margen de `bubbleHit` de 6 a 10 en `Pens.ts` y volver a ejecutar.

- [x] **Step 3: Commit**

```bash
git add tests/e2e/play.spec.ts
git commit -m "test(v3): pruebas de juego de dar de comer y tienda" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Documentación, subida y prueba en el móvil

**Files:**
- Modify: `README.md` (raíz), `game/README.md`, `docs/superpowers/specs/2026-09-27-motor-phaser-v3-design.md` (sección "Estado de implementación"), este plan (casillas)

- [x] **Step 1: Documentación**

1. `README.md` raíz: en la tabla de versiones, la fila de v3.0.0-dev pasa a "Hitos 1–4 hechos: … dar de comer arrastrando, tienda con desbloqueos, visitantes, joystick opcional …"; en el Roadmap marcar ✅ los hitos 3 y 4 y añadir el enlace a este plan en la tabla de documentos de la sección v3.
2. `game/README.md`: en "Estructura" añadir `src/world/` (Pens, ShopBuilding, VisitorCrowd); en "Depuración" listar los ganchos nuevos (`openFeed('leon')`, `openShop()`, `goToTile(x, y)`, `unlocked()`).
3. Spec, sección "Estado de implementación": hitos 3 y 4 → ✅ con este plan; en "Qué hay hecho" añadir un bloque "Hitos 3–4"; en "Decisiones tomadas durante la implementación" añadir: arte provisional con emojis; bocadillo a ≤ 2 tiles de la puerta; margen de acierto 48 px; tienda se abre al pisar su puerta; joystick en el 40 % izquierdo × 55 % inferior; sonidos provisionales con Web Audio; 8 visitantes.
4. Marcar con `[x]` las casillas de este plan (salvo la verificación en móvil si David aún no la ha hecho).

```bash
git add ../README.md README.md ../docs/superpowers
git commit -m "docs(v3): estado tras hitos 3-4" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 2: Subir (pedir confirmación a David antes)**

```bash
git push
gh run watch --exit-status
```

Expected: `game-ci` en verde.

- [ ] **Step 3: Prueba en el móvil (David)**

Desde `game/`: `npm run build` y `npx cap sync android`; en Android Studio ▶ Run. Recorrer los 6 puntos de la verificación manual de la Task 10 con el dedo.

---

## Resultado al terminar este plan

El juego v3 tiene el bucle completo de la v1 dentro del mundo nuevo: pasear, acercarse a un recinto, tocar el 🥣, arrastrar la comida al animal y ver su reacción con sonido y monedas volando; con 20 monedas se abre la tienda, se compran pantera y panda y su recinto se abre con animación. Visitantes paseando, joystick opcional, todo guardado, con tests de lógica y pruebas de juego en navegador.

**Siguiente plan (hitos 5–6):** arte y sonido definitivos (pack elegido + animales de los niños, atlas), ciclo de vida móvil, botón atrás de Android, puerta parental, aviso de girar, errores globales, y publicación en prueba cerrada de Play Store.
