# Tienda por dentro (fase C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Al entrar en la tienda se ve el interior en pixel art (pack VectoRaith *Interior Essentials*), con el tendero tras el mostrador, los animales en peanas y una entrada con campanita y saludo.

**Architecture:** Un mapa lógico `tienda.tmj` (generado por script, como `zoo.tmj`) define suelo/pared/muebles y puntos (tendero, peanas, puerta, decos). `world/ShopInterior.ts` lo pinta con las piezas `interior-*` del manifiesto o, sin arte, con colores. `ShopScene` (misma clave `'Shop'`) coloca productos sobre las peanas y reutiliza `shopEntries`/`buy` sin cambios.

**Tech Stack:** Phaser 4.2 · TypeScript · Vite · Vitest · Playwright · pngjs/adm-zip (importación de arte, Node).

Spec: `docs/superpowers/specs/2026-09-27-tienda-por-dentro-design.md`

## Global Constraints

- Todo lo actual sigue igual: `getSession().buy()`, `shopEntries()`, precios, extras, guardado, ajustes, ESC/✕/atrás, `restartOnResize`.
- API de pruebas intacta: `ShopScene.cardScreenPos(itemId)` y `ShopScene.cardStatus(itemId)` (`'buy' | 'owned' | 'full'`); se puede comprar desde el primer frame (la entrada no bloquea toques).
- Modo sin arte (repo público, `getArt() === null` o manifiesto sin `interior`): la tienda funciona con rectángulos de colores y emojis.
- El arte del pack solo se lee del repo privado (`npm run art:import`); `public/art/` está ignorado por git.
- Tiles de 16 px; el interior mide 20×12 tiles (320×192 px).
- Textos en español en `data/strings.ts`; comentarios en español como el resto del código.
- Comandos desde `game/`: `npm test`, `npm run typecheck`, `npm run test:e2e`.

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `game/scripts/make-shop-map.mjs` (nuevo) | Genera `public/assets/maps/tienda.tmj` |
| `game/src/core/tiledmap.ts` | + `readInteriorSpots`, `wallRows`, `INTERIOR_GIDS` |
| `game/src/core/interiorLayout.ts` (nuevo) | Escala/offset del interior en pantalla y puntos de reserva (puro, testeable) |
| `game/art/art.config.json`, `scripts/art/source.ts`, `scripts/import-art.ts` | Recortes `interior` del pack |
| `game/src/art/manifest.ts`, `src/art/art.ts` | `interior` opcional en el manifiesto, carga y claves |
| `game/scripts/make-campanita.mjs` (nuevo) | Sintetiza `public/audio/campanita.wav` (obra propia) |
| `game/src/systems/audio.ts` | Nuevo `SoundId` `'campanita'` con extensión `.wav` |
| `game/src/world/ShopInterior.ts` (nuevo) | Pinta suelo, pared, muebles, peanas, felpudo y ambiente |
| `game/src/scenes/ShopScene.ts` | Reescrita: interior + productos + tendero + bocadillos |
| `game/src/config.ts`, `src/scenes/PreloadScene.ts` | Clave y carga de `tienda.tmj` |
| `game/src/data/strings.ts` | `shop.hello`, `shop.thanks`, `shop.needCoins` |

---

### Task 1: Mapa del interior y su lectura

**Files:**
- Create: `game/scripts/make-shop-map.mjs`, `game/public/assets/maps/tienda.tmj` (generado)
- Modify: `game/src/core/tiledmap.ts` (añadir al final), `game/package.json` (script)
- Test: `game/tests/unit/shopmap.test.ts`

**Interfaces:**
- Produces:
  - `INTERIOR_GIDS = { floor: 1, wall: 2, furniture: 3 }`
  - `interface InteriorDeco { piece: string; x: number; y: number; z: number; flat: boolean }` (px; `x,y` = base de la pieza; `z` = cuánto se eleva al pintarla)
  - `interface InteriorSpots { shopkeeper: Point; pedestals: Point[]; door: Point; doorTile: Point; decos: InteriorDeco[] }` (px salvo `doorTile`)
  - `readInteriorSpots(map: TiledMap): InteriorSpots | null` (null si falta `tendero` o `puertaInterior`)
  - `wallRows(map: TiledMap): number` (filas de arriba cuya primera columna es pared)

- [ ] **Step 1: Test que falla**

`game/tests/unit/shopmap.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findPath } from '../../src/core/pathfinding';
import { buildWalkGrid, readInteriorSpots, wallRows, type TiledMap } from '../../src/core/tiledmap';

function loadShopMap(): TiledMap {
  const url = new URL('../../public/assets/maps/tienda.tmj', import.meta.url);
  return JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as TiledMap;
}

describe('tienda.tmj', () => {
  const map = loadShopMap();
  const spots = readInteriorSpots(map)!;

  it('mide 20x12 con 4 filas de pared', () => {
    expect([map.width, map.height]).toEqual([20, 12]);
    expect(wallRows(map)).toBe(4);
  });

  it('tiene tendero, puerta y 5 peanas ordenadas de izquierda a derecha', () => {
    expect(spots).not.toBeNull();
    expect(spots.pedestals).toHaveLength(5);
    const xs = spots.pedestals.map((p) => p.x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
  });

  it('se puede andar de la puerta al frente del mostrador (fase B)', () => {
    const grid = buildWalkGrid(map);
    expect(findPath(grid, spots.doorTile, { x: 3, y: 7 })).not.toBeNull();
  });

  it('las decos llevan pieza y el felpudo no es una deco', () => {
    expect(spots.decos.length).toBeGreaterThan(10);
    expect(spots.decos.every((d) => d.piece.length > 0)).toBe(true);
    expect(spots.decos.find((d) => d.piece === 'rug')?.flat).toBe(true);
  });
});

describe('readInteriorSpots', () => {
  it('devuelve null sin tendero', () => {
    const map: TiledMap = { width: 1, height: 1, tilewidth: 16, tileheight: 16, tilesets: [], layers: [] };
    expect(readInteriorSpots(map)).toBeNull();
  });
});
```

- [ ] **Step 2: Ver que falla**

Run: `npx vitest run tests/unit/shopmap.test.ts`
Expected: FAIL (no existe `tienda.tmj` / `readInteriorSpots` no exportado).

- [ ] **Step 3: Lectura en `tiledmap.ts`** (añadir al final del archivo)

```ts
/** Tipos de tile del interior de la tienda (mapa lógico, el arte lo pone ShopInterior). */
export const INTERIOR_GIDS = { floor: 1, wall: 2, furniture: 3 } as const;

export interface InteriorDeco {
  piece: string;
  /** Base de la pieza en px (centro abajo). */
  x: number;
  y: number;
  /** Cuánto se eleva al pintarla (p. ej. velas encima del mostrador). */
  z: number;
  /** Plana en el suelo (alfombra): siempre debajo de todo. */
  flat: boolean;
}

export interface InteriorSpots {
  /** Pies del tendero (px). */
  shopkeeper: Point;
  /** Base de cada peana (px), en orden de `orden`. */
  pedestals: Point[];
  /** Felpudo de salida (px) y su tile (entrada del cuidador en la fase B). */
  door: Point;
  doorTile: Point;
  decos: InteriorDeco[];
}

export function readInteriorSpots(map: TiledMap): InteriorSpots | null {
  const objects = objectsOf(map);
  const keeper = objects.find((o) => objectKind(o) === 'tendero');
  const door = objects.find((o) => objectKind(o) === 'puertaInterior');
  if (!keeper || !door) return null;
  const num = (o: TiledObject, name: string): number => {
    const v = getProperty(o.properties, name);
    return typeof v === 'number' ? v : 0;
  };
  const pedestals = objects
    .filter((o) => objectKind(o) === 'peana')
    .sort((a, b) => num(a, 'orden') - num(b, 'orden'))
    .map((o) => ({ x: o.x, y: o.y }));
  const decos: InteriorDeco[] = [];
  for (const o of objects) {
    const piece = getProperty(o.properties, 'pieza');
    if (objectKind(o) !== 'deco' || typeof piece !== 'string') continue;
    decos.push({ piece, x: o.x, y: o.y, z: num(o, 'z'), flat: getProperty(o.properties, 'flat') === true });
  }
  return {
    shopkeeper: { x: keeper.x, y: keeper.y },
    pedestals,
    door: { x: door.x, y: door.y },
    doorTile: { x: Math.floor(door.x / map.tilewidth), y: Math.floor(door.y / map.tileheight) },
    decos,
  };
}

/** Filas de pared arriba del todo (mirando la primera columna de la capa de suelo). */
export function wallRows(map: TiledMap): number {
  const layer = map.layers.find((l): l is TiledTileLayer => l.type === 'tilelayer' && l.name === GROUND_LAYER);
  if (!layer) return 0;
  let rows = 0;
  while (rows < layer.height && ((layer.data[rows * layer.width] ?? 0) & GID_MASK) === INTERIOR_GIDS.wall) rows++;
  return rows;
}
```

- [ ] **Step 4: Generador `game/scripts/make-shop-map.mjs`**

```js
// Genera public/assets/maps/tienda.tmj: el interior de la tienda (20x12), lógico (suelo/pared/mueble).
// El arte lo pone ShopInterior en el juego; sin arte se pinta con colores. En la fase B el cuidador andará por aquí.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 20;
const H = 12;
const T = 16;
const FLOOR = 1;
const WALL = 2;
const FURNITURE = 3;

const data = new Array(W * H).fill(FLOOR);
const fill = (x0, y0, x1, y1, gid) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) data[y * W + x] = gid;
};
fill(0, 0, W - 1, 3, WALL); // pared de fondo (64 px)
fill(5, 4, W - 1, 4, FURNITURE); // estanterías contra la pared
fill(1, 4, 4, 6, FURNITURE); // mostrador y el hueco del tendero
fill(0, 10, 4, 10, FURNITURE); // cajas de fruta abajo a la izquierda
fill(19, 8, 19, 9, FURNITURE); // barril

const objects = [];
let nextId = 1;
const point = (type, x, y, properties = []) =>
  objects.push({ id: nextId++, name: `${type}-${nextId}`, type, point: true, x, y, width: 0, height: 0, rotation: 0, visible: true, properties });
const deco = (pieza, x, y, extra = {}) => {
  const properties = [{ name: 'pieza', type: 'string', value: pieza }];
  if (extra.z) properties.push({ name: 'z', type: 'int', value: extra.z });
  if (extra.flat) properties.push({ name: 'flat', type: 'bool', value: true });
  point('deco', x, y, properties);
};

point('tendero', 48, 92);
point('puertaInterior', 192, 186);
// Peanas en arco, de izquierda a derecha.
[[112, 150], [152, 138], [192, 132], [232, 138], [272, 150]].forEach(([x, y], orden) =>
  point('peana', x, y, [{ name: 'orden', type: 'int', value: orden }]),
);

// Pared: ventanas (de ellas sale la luz), reloj y cuadros.
deco('window', 40, 38);
deco('window', 120, 36);
deco('window', 224, 36);
deco('clock', 176, 30);
deco('frames', 272, 34);
// Muebles contra la pared (base en y=80).
deco('plant', 88, 80);
deco('shelf-wide', 128, 80);
deco('shelf-a', 176, 80);
deco('bookcase', 216, 80);
deco('shelf-b', 256, 80);
deco('shelf-wide', 296, 80);
// Mostrador con velas y cesta de pan encima.
deco('counter', 48, 112);
deco('candles', 64, 114, { z: 30 });
deco('bread', 30, 114, { z: 30 });
// Alfombra bajo las peanas.
deco('rug', 192, 142, { flat: true });
// Esquinas: fruta, barril y plantas.
deco('crate-green', 16, 176);
deco('crate-yellow', 32, 176);
deco('crate-red', 48, 176);
deco('barrel', 308, 150);
deco('plant', 10, 190);
deco('plant', 308, 190);

const walkable = [{ name: 'walkable', type: 'bool', value: true }];
const map = {
  compressionlevel: -1, width: W, height: H, tilewidth: T, tileheight: T, infinite: false,
  orientation: 'orthogonal', renderorder: 'right-down', tiledversion: '1.11.0', type: 'map', version: '1.10',
  nextlayerid: 3, nextobjectid: nextId,
  layers: [
    { id: 1, name: 'suelo', type: 'tilelayer', width: W, height: H, x: 0, y: 0, opacity: 1, visible: true, data },
    { id: 2, name: 'objetos', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true, objects },
  ],
  tilesets: [{
    firstgid: 1, name: 'interior', image: '../tiles/placeholder.png', imagewidth: T * 3, imageheight: T,
    tilewidth: T, tileheight: T, tilecount: 3, columns: 3, margin: 0, spacing: 0,
    tiles: [{ id: FLOOR - 1, properties: walkable }],
  }],
};

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../public/assets/maps/tienda.tmj');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 1) + '\n');
console.log('Mapa generado en', out);
```

En `game/package.json`, junto a `make:zoo-map`: `"make:shop-map": "node scripts/make-shop-map.mjs",`

- [ ] **Step 5: Generar y pasar tests**

Run: `npm run make:shop-map && npx vitest run tests/unit/shopmap.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add scripts/make-shop-map.mjs public/assets/maps/tienda.tmj src/core/tiledmap.ts tests/unit/shopmap.test.ts package.json
git commit -m "feat(tienda): mapa del interior tienda.tmj y readInteriorSpots"
```

---

### Task 2: Encaje del interior en pantalla (puro)

**Files:**
- Create: `game/src/core/interiorLayout.ts`
- Test: `game/tests/unit/interiorLayout.test.ts`

**Interfaces:**
- Consumes: `InteriorSpots`, `Point` (Task 1)
- Produces:
  - `interface InteriorLayout { scale: number; offsetX: number; offsetY: number }`
  - `interiorLayout(screenW: number, screenH: number, mapW: number, mapH: number): InteriorLayout`
  - `toScreen(layout: InteriorLayout, p: Point): Point`
  - `FALLBACK_SPOTS: InteriorSpots` (sin mapa: peanas en fila)
  - `pedestalFor(spots: InteriorSpots, index: number): Point` (si hay más productos que peanas, fila delante del mostrador)

- [ ] **Step 1: Test que falla**

```ts
import { describe, expect, it } from 'vitest';
import { FALLBACK_SPOTS, interiorLayout, pedestalFor, toScreen } from '../../src/core/interiorLayout';

describe('interiorLayout', () => {
  it('escala entera cuando llega a 2 y centra', () => {
    expect(interiorLayout(1280, 720, 320, 192)).toEqual({ scale: 3, offsetX: 160, offsetY: 72 });
  });

  it('pantallas bajas: escala fraccionaria para verse entero', () => {
    const l = interiorLayout(800, 360, 320, 192);
    expect(l.scale).toBeCloseTo(1.875);
    expect(l.offsetY).toBeCloseTo(0);
  });

  it('toScreen aplica escala y offset', () => {
    expect(toScreen({ scale: 2, offsetX: 10, offsetY: 20 }, { x: 5, y: 6 })).toEqual({ x: 20, y: 32 });
  });
});

describe('pedestalFor', () => {
  it('usa la peana si existe y si no, una fila delante', () => {
    expect(pedestalFor(FALLBACK_SPOTS, 0)).toEqual(FALLBACK_SPOTS.pedestals[0]);
    const extra = pedestalFor(FALLBACK_SPOTS, 7);
    expect(extra.y).toBe(172);
  });
});
```

- [ ] **Step 2: Ver que falla** — Run: `npx vitest run tests/unit/interiorLayout.test.ts` → FAIL (módulo no existe).

- [ ] **Step 3: Implementación `game/src/core/interiorLayout.ts`**

```ts
import type { Point } from './pathfinding';
import type { InteriorSpots } from './tiledmap';

export interface InteriorLayout {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/** Escala entera (nítida) si cabe a ×2 o más; si no, fraccionaria para que se vea entero. Centrado. */
export function interiorLayout(screenW: number, screenH: number, mapW: number, mapH: number): InteriorLayout {
  const fit = Math.min(screenW / mapW, screenH / mapH);
  const scale = fit >= 2 ? Math.floor(fit) : fit;
  return { scale, offsetX: (screenW - mapW * scale) / 2, offsetY: (screenH - mapH * scale) / 2 };
}

export function toScreen(layout: InteriorLayout, p: Point): Point {
  return { x: layout.offsetX + p.x * layout.scale, y: layout.offsetY + p.y * layout.scale };
}

/** Si falta tienda.tmj: tendero, puerta y peanas en fila, sin decoración. */
export const FALLBACK_SPOTS: InteriorSpots = {
  shopkeeper: { x: 48, y: 92 },
  pedestals: [112, 152, 192, 232, 272].map((x) => ({ x, y: 140 })),
  door: { x: 192, y: 186 },
  doorTile: { x: 12, y: 11 },
  decos: [],
};

/** Peana del producto `index`; los que sobren van en fila delante del mostrador (hoy no pasa: máx. 5). */
export function pedestalFor(spots: InteriorSpots, index: number): Point {
  const p = spots.pedestals[index];
  if (p) return p;
  return { x: 40 + (index - spots.pedestals.length) * 36, y: 172 };
}
```

- [ ] **Step 4: Pasar** — Run: `npx vitest run tests/unit/interiorLayout.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/interiorLayout.ts tests/unit/interiorLayout.test.ts
git commit -m "feat(tienda): encaje del interior en pantalla y puntos de reserva"
```

---

### Task 3: Importar las piezas del pack de interiores

Coordenadas ya medidas sobre el pack (16×16, Classic) con recorte ajustado al contenido.

**Files:**
- Modify: `game/art/art.config.json`, `game/scripts/art/source.ts:21-33`, `game/scripts/import-art.ts`, `game/src/art/manifest.ts`, `game/src/art/art.ts`
- Test: `game/tests/unit/manifest.test.ts`

**Interfaces:**
- Produces: `ArtManifest.interior: Record<string, ImageInfo>` (vacío si no hay); `interiorKey(piece: string): string` → `art-interior-<piece>`. Piezas: `floor wall window clock frames candles shelf-wide shelf-a shelf-b bookcase counter bread crate-green crate-yellow crate-red barrel plant rug`.

- [ ] **Step 1: Test que falla** (añadir dentro del `describe('parseManifest')` de `tests/unit/manifest.test.ts`)

```ts
  it('acepta piezas de interior opcionales', () => {
    const m = parseManifest({ ...valid(), interior: { counter: image } });
    expect(m?.interior.counter?.width).toBe(16);
    expect(parseManifest(valid())?.interior).toEqual({});
  });

  it('rechaza una pieza de interior mal formada', () => {
    expect(parseManifest({ ...valid(), interior: { counter: { file: 'x.png' } } })).toBeNull();
  });
```

- [ ] **Step 2: Ver que falla** — Run: `npx vitest run tests/unit/manifest.test.ts` → FAIL (`interior` undefined).

- [ ] **Step 3: `manifest.ts`**

En `ArtManifest` añadir:

```ts
  /** Piezas del interior de la tienda (suelo, pared, muebles); vacío = tienda con colores. */
  interior: Record<string, ImageInfo>;
```

En `parseManifest`, antes del `return`:

```ts
  const interior: Record<string, ImageInfo> = {};
  if (value.interior !== undefined) {
    if (!isObject(value.interior)) return null;
    for (const [name, raw] of Object.entries(value.interior)) {
      const img = asImage(raw);
      if (!img) return null;
      interior[name] = img;
    }
  }
```

y en el objeto devuelto añadir `interior,` junto a `props,`.

- [ ] **Step 4: `art.ts`**

Junto a `propKey`:

```ts
export const interiorKey = (piece: string): string => `art-interior-${piece}`;
```

Al final de `queueArt`:

```ts
  for (const [piece, img] of Object.entries(m.interior)) scene.load.image(interiorKey(piece), url(img.file));
```

- [ ] **Step 5: Pasar tests** — Run: `npx vitest run tests/unit/manifest.test.ts` → PASS.

- [ ] **Step 6: Configuración del pack**

`game/art/art.config.json`: en `"zips"` añadir `"interior": "Interior Tileset Pack - Essentials.zip"`, y al final del objeto raíz:

```json
  "interior": {
    "floor":        { "zip": "interior", "file": "16x16/Classic/vectoraith_tileset_interior_essentials_floorwall_ATLAS.png", "x": 16,  "y": 16,  "w": 16, "h": 16 },
    "wall":         { "zip": "interior", "file": "16x16/Classic/vectoraith_tileset_interior_essentials_floorwall_ATLAS.png", "x": 256, "y": 576, "w": 64, "h": 64 },
    "window":       { "zip": "interior", "file": "16x16/Classic/vectoraith_tileset_interior_essentials_3.png", "x": 129, "y": 104, "w": 14, "h": 17 },
    "clock":        { "zip": "interior", "file": "16x16/Classic/vectoraith_tileset_interior_essentials_1.png", "x": 129, "y": 82,  "w": 13, "h": 13 },
    "frames":       { "zip": "interior", "file": "16x16/Classic/vectoraith_tileset_interior_essentials_1.png", "x": 97,  "y": 81,  "w": 30, "h": 15 },
    "candles":      { "zip": "interior", "file": "16x16/Classic/vectoraith_tileset_interior_essentials_1.png", "x": 227, "y": 112, "w": 20, "h": 14 },
    "shelf-wide":   { "zip": "interior", "file": "16x16/Classic/vectoraith_tileset_interior_essentials_3.png", "x": 128, "y": 186, "w": 48, "h": 32 },
    "shelf-a":      { "zip": "interior", "file": "16x16/Classic/vectoraith_tileset_interior_essentials_3.png", "x": 192, "y": 122, "w": 32, "h": 32 },
    "shelf-b":      { "zip": "interior", "file": "16x16/Classic/vectoraith_tileset_interior_essentials_3.png", "x": 224, "y": 122, "w": 32, "h": 32 },
    "bookcase":     { "zip": "interior", "file": "16x16/Classic/vectoraith_tileset_interior_essentials_3.png", "x": 224, "y": 170, "w": 32, "h": 32 },
    "counter":      { "zip": "interior", "file": "16x16/Classic/vectoraith_tileset_interior_essentials_3.png", "x": 176, "y": 186, "w": 48, "h": 32 },
    "bread":        { "zip": "interior", "file": "16x16/Classic/vectoraith_tileset_interior_essentials_3.png", "x": 240, "y": 85,  "w": 16, "h": 21 },
    "crate-green":  { "zip": "interior", "file": "16x16/Classic/vectoraith_tileset_interior_essentials_3.png", "x": 144, "y": 224, "w": 16, "h": 24 },
    "crate-yellow": { "zip": "interior", "file": "16x16/Classic/vectoraith_tileset_interior_essentials_3.png", "x": 160, "y": 224, "w": 16, "h": 24 },
    "crate-red":    { "zip": "interior", "file": "16x16/Classic/vectoraith_tileset_interior_essentials_3.png", "x": 176, "y": 224, "w": 16, "h": 24 },
    "barrel":       { "zip": "interior", "file": "16x16/Classic/vectoraith_tileset_interior_essentials_3.png", "x": 50,  "y": 119, "w": 12, "h": 15 },
    "plant":        { "zip": "interior", "file": "16x16/Classic/vectoraith_tileset_interior_essentials_1.png", "x": 97,  "y": 100, "w": 14, "h": 21 },
    "rug":          { "zip": "interior", "file": "16x16/Classic/vectoraith_tileset_interior_essentials_1.png", "x": 0,   "y": 16,  "w": 64, "h": 64 }
  }
```

`scripts/art/source.ts`, en `ArtConfig` añadir: `interior?: Record<string, Source & CropRect>;`

`scripts/import-art.ts`, tras el bucle de `companions`:

```ts
const interior: Record<string, { file: string; width: number; height: number }> = {};
for (const [name, p] of Object.entries(config.interior ?? {})) {
  interior[name] = image(crop(readSource(p), p.x, p.y, p.w, p.h), `interior-${name}.png`);
}
```

y en `manifest` añadir `interior,` después de `companions,`.

- [ ] **Step 7: Importar y comprobar**

Run: `npm run art:import && node -e "console.log(Object.keys(require('./public/art/manifest.json').interior).length)"`
Expected: `Arte importado en …` y `18`.

- [ ] **Step 8: Typecheck + tests + commit**

Run: `npm run typecheck && npm test` → sin errores.

```bash
git add art/art.config.json scripts/art/source.ts scripts/import-art.ts src/art/manifest.ts src/art/art.ts tests/unit/manifest.test.ts
git commit -m "feat(tienda): importar piezas del pack de interiores de VectoRaith"
```

---

### Task 4: Campanita (sonido propio) y textos

**Files:**
- Create: `game/scripts/make-campanita.mjs`, `game/public/audio/campanita.wav` (generado)
- Modify: `game/src/systems/audio.ts:6-7,90-93`, `game/public/audio/CREDITS.md`, `game/src/data/strings.ts`, `game/package.json`
- Test: `game/tests/unit/audio.test.ts` (si existe un test que enumere `SOUND_IDS`, actualizarlo; si no, añadir el de abajo)

**Interfaces:**
- Produces: `SoundId` incluye `'campanita'`; `soundFile(id: SoundId): string` → `audio/<id>.<ext>`; strings `shop.hello`, `shop.thanks`, `shop.needCoins`.

- [ ] **Step 1: Test que falla** (en `tests/unit/audio.test.ts`, crear el archivo si no existe)

```ts
import { describe, expect, it } from 'vitest';
import { SOUND_IDS, soundFile } from '../../src/systems/audio';

describe('sonidos', () => {
  it('la campanita es un wav propio; el resto ogg', () => {
    expect(SOUND_IDS).toContain('campanita');
    expect(soundFile('campanita')).toBe('audio/campanita.wav');
    expect(soundFile('buy')).toBe('audio/buy.ogg');
  });
});
```

- [ ] **Step 2: Ver que falla** — Run: `npx vitest run tests/unit/audio.test.ts` → FAIL.

- [ ] **Step 3: `audio.ts`**

```ts
export type SoundId = 'come' | 'rechaza' | 'especial' | 'coin' | 'buy' | 'unlock' | 'tap' | 'campanita';
export const SOUND_IDS: readonly SoundId[] = ['come', 'rechaza', 'especial', 'coin', 'buy', 'unlock', 'tap', 'campanita'];

/** La campanita se sintetiza con scripts/make-campanita.mjs (wav); el resto son ogg de Kenney. */
export const soundFile = (id: SoundId): string => `audio/${id}.${id === 'campanita' ? 'wav' : 'ogg'}`;
```

y en `queueAudio`: `for (const id of SOUND_IDS) scene.load.audio(soundKey(id), [withVersion(soundFile(id))]);`

- [ ] **Step 4: Generador `game/scripts/make-campanita.mjs`**

Dos toques de campanilla de tienda ("din-don"): parciales inarmónicos de campana con caída exponencial.

```js
// Genera public/audio/campanita.wav: la campanilla de la puerta de la tienda (obra propia, sintetizada).
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const LENGTH = 1.1;
const samples = new Float32Array(Math.round(RATE * LENGTH));
// Parciales típicos de campana (relación con la fundamental) y su volumen.
const PARTIALS = [[1, 1], [2.0, 0.5], [2.76, 0.35], [5.4, 0.2], [8.93, 0.1]];
function strike(start, freq, gain) {
  for (let i = Math.round(start * RATE); i < samples.length; i++) {
    const t = i / RATE - start;
    let v = 0;
    for (const [ratio, amp] of PARTIALS) v += amp * Math.sin(2 * Math.PI * freq * ratio * t) * Math.exp(-t * (3 + ratio * 1.5));
    samples[i] += gain * v * Math.min(1, t * 400); // ataque de 2,5 ms sin chasquido
  }
}
strike(0, 1568, 0.35); // sol
strike(0.16, 2093, 0.3); // do agudo

const data = Buffer.alloc(samples.length * 2);
samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
const header = Buffer.alloc(44);
header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8);
header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
header.writeUInt32LE(RATE, 24); header.writeUInt32LE(RATE * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
header.write('data', 36); header.writeUInt32LE(data.length, 40);
const out = resolve(dirname(fileURLToPath(import.meta.url)), '../public/audio/campanita.wav');
writeFileSync(out, Buffer.concat([header, data]));
console.log('Campanita generada en', out);
```

`package.json`: `"make:campanita": "node scripts/make-campanita.mjs",`

`CREDITS.md`, añadir fila a la tabla:

```
| `campanita.wav` | Sintetizado con `scripts/make-campanita.mjs` | Zoo Esponji | Igual que el juego |
```

- [ ] **Step 5: Textos en `strings.ts`** (tras `'shop.full'`)

```ts
  'shop.hello': '¡Hola! ¿Qué animal quieres hoy?',
  'shop.thanks': '¡Gracias! ¡Cuídalo mucho!',
  'shop.needCoins': '¡Te faltan monedas!',
```

- [ ] **Step 6: Generar, escuchar y pasar**

Run: `npm run make:campanita && npx vitest run tests/unit/audio.test.ts && npm run typecheck`
Expected: PASS. Escuchar `public/audio/campanita.wav` (debe sonar "din-don" limpio, sin chasquidos; si pita demasiado, bajar ganancias a 0.25/0.2).

- [ ] **Step 7: Commit**

```bash
git add scripts/make-campanita.mjs public/audio/campanita.wav public/audio/CREDITS.md src/systems/audio.ts src/data/strings.ts tests/unit/audio.test.ts package.json
git commit -m "feat(tienda): campanita de la puerta y textos del tendero"
```

---

### Task 5: `ShopInterior` — pintar la tienda

**Files:**
- Create: `game/src/world/ShopInterior.ts`
- Modify: `game/src/config.ts` (`MAPS.shop`), `game/src/scenes/PreloadScene.ts` (cargar mapa)

**Interfaces:**
- Consumes: `readInteriorSpots`, `wallRows`, `TiledMap` (T1); `interiorLayout`, `toScreen`, `FALLBACK_SPOTS`, `InteriorLayout` (T2); `getArt`, `interiorKey` (T3).
- Produces: `class ShopInterior { readonly spots: InteriorSpots; readonly layout: InteriorLayout; constructor(scene: Phaser.Scene, map: TiledMap | null); screen(p: Point): Point; drawPedestal(p: Point): Phaser.GameObjects.GameObject[]; doorMat(onTap: () => void): void }`. Profundidades: suelo −1000, alfombra −500, luz −400, muebles = y de su base (px de interior), UI de la escena ≥ 1000.

- [ ] **Step 1: `config.ts`** — `MAPS` pasa a `{ test: 'test-map', zoo: 'zoo-map', shop: 'shop-map' }`.

- [ ] **Step 2: `PreloadScene.preload`**, tras cargar el zoo:

```ts
    this.load.tilemapTiledJSON(MAPS.shop, withVersion('assets/maps/tienda.tmj'));
```

- [ ] **Step 3: `game/src/world/ShopInterior.ts`**

```ts
import * as Phaser from 'phaser';
import { getArt, interiorKey } from '../art/art';
import { FALLBACK_SPOTS, interiorLayout, toScreen, type InteriorLayout } from '../core/interiorLayout';
import type { Point } from '../core/pathfinding';
import { readInteriorSpots, wallRows, type InteriorDeco, type InteriorSpots, type TiledMap } from '../core/tiledmap';

const MAP_W = 320;
const MAP_H = 192;

/** Tamaño de cada pieza (px de interior) y cómo se pinta sin arte. Coincide con los recortes de art.config.json. */
const PIECES: Record<string, { w: number; h: number; color: number; emoji?: string }> = {
  window: { w: 14, h: 17, color: 0xb3e5fc },
  clock: { w: 13, h: 13, color: 0x8d6e63, emoji: '🕰️' },
  frames: { w: 30, h: 15, color: 0x6d4c41, emoji: '🖼️' },
  candles: { w: 20, h: 14, color: 0xffcc80, emoji: '🕯️' },
  'shelf-wide': { w: 48, h: 32, color: 0x8d6e63 },
  'shelf-a': { w: 32, h: 32, color: 0x8d6e63 },
  'shelf-b': { w: 32, h: 32, color: 0x8d6e63 },
  bookcase: { w: 32, h: 32, color: 0x795548, emoji: '📚' },
  counter: { w: 48, h: 32, color: 0xa1887f },
  bread: { w: 16, h: 21, color: 0xd7a86e, emoji: '🧺' },
  'crate-green': { w: 16, h: 24, color: 0x7cb342, emoji: '🥬' },
  'crate-yellow': { w: 16, h: 24, color: 0xfdd835, emoji: '🍌' },
  'crate-red': { w: 16, h: 24, color: 0xe53935, emoji: '🍎' },
  barrel: { w: 12, h: 15, color: 0x6d4c41 },
  plant: { w: 14, h: 21, color: 0x43a047, emoji: '🪴' },
  rug: { w: 64, h: 64, color: 0xc62828 },
};

/** El interior de la tienda: suelo, pared, muebles y ambiente (luz de ventanas, velas, polvo). */
export class ShopInterior {
  readonly spots: InteriorSpots;
  readonly layout: InteriorLayout;
  private readonly withArt: boolean;

  constructor(
    private readonly scene: Phaser.Scene,
    map: TiledMap | null,
  ) {
    const spots = map ? readInteriorSpots(map) : null;
    if (!spots) console.warn('tienda.tmj no disponible o incompleto: tienda con peanas en fila');
    this.spots = spots ?? FALLBACK_SPOTS;
    this.layout = interiorLayout(scene.scale.width, scene.scale.height, MAP_W, MAP_H);
    this.withArt = Boolean(getArt() && Object.keys(getArt()!.interior).length > 0);
    this.drawRoom(map ? wallRows(map) : 4);
    for (const deco of this.spots.decos) this.addDeco(deco);
    this.addAmbience();
  }

  screen(p: Point): Point {
    return toScreen(this.layout, p);
  }

  private get s(): number {
    return this.layout.scale;
  }

  private drawRoom(rows: number): void {
    const { offsetX: x, offsetY: y } = this.layout;
    const wallH = rows * 16;
    if (this.withArt) {
      this.scene.add.tileSprite(x, y, MAP_W, MAP_H, interiorKey('floor')).setOrigin(0).setScale(this.s).setDepth(-1000);
      this.scene.add.tileSprite(x, y, MAP_W, wallH, interiorKey('wall')).setOrigin(0).setScale(this.s).setDepth(-999);
    } else {
      const g = this.scene.add.graphics().setDepth(-1000);
      g.fillStyle(0xd7a86e).fillRect(x, y, MAP_W * this.s, MAP_H * this.s);
      g.lineStyle(Math.max(1, this.s / 2), 0xb07f4a, 0.6);
      for (let px = 16; px < MAP_W; px += 16) g.lineBetween(x + px * this.s, y + wallH * this.s, x + px * this.s, y + MAP_H * this.s);
      g.fillStyle(0x7da35a).fillRect(x, y, MAP_W * this.s, wallH * this.s);
      g.fillStyle(0x8d6e63).fillRect(x, y + (wallH - 16) * this.s, MAP_W * this.s, 16 * this.s);
    }
    // Sombra suave donde la pared toca el suelo: da profundidad.
    this.scene.add.rectangle(x, y + wallH * this.s, MAP_W * this.s, 4 * this.s, 0x000000, 0.18).setOrigin(0).setDepth(-998);
  }

  private addDeco(deco: InteriorDeco): void {
    const info = PIECES[deco.piece];
    const pos = this.screen({ x: deco.x, y: deco.y - deco.z });
    const originY = deco.flat ? 0.5 : 1;
    const depth = deco.flat ? -500 : deco.y;
    let obj: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
    if (this.withArt && getArt()!.interior[deco.piece]) {
      obj = this.scene.add.image(pos.x, pos.y, interiorKey(deco.piece)).setOrigin(0.5, originY).setScale(this.s);
    } else if (info) {
      obj = this.scene.add
        .rectangle(pos.x, pos.y, info.w * this.s, info.h * this.s, info.color)
        .setOrigin(0.5, originY)
        .setStrokeStyle(Math.max(1, this.s / 2), 0x3e2723);
      if (info.emoji) {
        this.scene.add
          .text(pos.x, deco.flat ? pos.y : pos.y - (info.h * this.s) / 2, info.emoji, { fontSize: `${Math.round(Math.min(info.w, info.h) * this.s * 0.8)}px` })
          .setOrigin(0.5)
          .setDepth(depth + 0.5);
      }
    } else {
      console.warn(`Pieza de interior desconocida: ${deco.piece}`);
      return;
    }
    obj.setDepth(depth);
    if (deco.piece === 'candles') this.flicker(pos, obj);
    if (deco.piece === 'window') this.lightBeam(pos);
  }

  /** Velas: parpadeo y un halo cálido. */
  private flicker(pos: Point, obj: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle): void {
    const glow = this.scene.add
      .circle(pos.x, pos.y - 10 * this.s, 14 * this.s, 0xffcc80, 0.22)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(obj.depth + 1);
    this.scene.tweens.add({ targets: glow, alpha: 0.1, scale: 0.85, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.scene.tweens.add({ targets: obj, alpha: 0.85, duration: 260, yoyo: true, repeat: -1, delay: 130 });
  }

  /** Haz de luz desde la ventana hasta el suelo, con motas de polvo flotando. */
  private lightBeam(win: Point): void {
    const s = this.s;
    const top = win.y - 2 * s;
    const bottom = win.y + 96 * s;
    const g = this.scene.add.graphics().setDepth(-400).setBlendMode(Phaser.BlendModes.ADD);
    g.fillStyle(0xfff3c4, 0.14);
    g.fillPoints(
      [
        new Phaser.Math.Vector2(win.x - 7 * s, top),
        new Phaser.Math.Vector2(win.x + 7 * s, top),
        new Phaser.Math.Vector2(win.x + 26 * s, bottom),
        new Phaser.Math.Vector2(win.x - 2 * s, bottom),
      ],
      true,
    );
    this.scene.tweens.add({ targets: g, alpha: 0.6, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    for (let i = 0; i < 5; i++) {
      const mote = this.scene.add
        .rectangle(win.x + Phaser.Math.Between(-4, 18) * s, top + Phaser.Math.Between(10, 80) * s, s, s, 0xffffff, 0.7)
        .setDepth(-399);
      this.scene.tweens.add({
        targets: mote,
        y: mote.y + 14 * s,
        x: mote.x + 6 * s,
        alpha: 0,
        duration: Phaser.Math.Between(2500, 4500),
        delay: Phaser.Math.Between(0, 2000),
        repeat: -1,
      });
    }
  }

  private addAmbience(): void {
    // Viñeta suave para centrar la mirada en las peanas.
    const { offsetX: x, offsetY: y } = this.layout;
    const g = this.scene.add.graphics().setDepth(900);
    g.fillStyle(0x000000, 0.12);
    g.fillRect(x, y, 10 * this.s, MAP_H * this.s);
    g.fillRect(x + (MAP_W - 10) * this.s, y, 10 * this.s, MAP_H * this.s);
  }

  /** Peana redonda de madera con borde dorado; `p` = base donde se apoya el animal. */
  drawPedestal(p: Point): Phaser.GameObjects.GameObject[] {
    const s = this.s;
    const c = this.screen(p);
    const depth = p.y - 1;
    const shadow = this.scene.add.ellipse(c.x, c.y + 6 * s, 30 * s, 8 * s, 0x000000, 0.25).setDepth(depth - 0.2);
    const body = this.scene.add.rectangle(c.x, c.y + 3 * s, 26 * s, 7 * s, 0x8d6e63).setDepth(depth - 0.1);
    const top = this.scene.add
      .ellipse(c.x, c.y, 26 * s, 9 * s, 0xd7a86e)
      .setStrokeStyle(Math.max(1, s * 0.75), 0xffca28)
      .setDepth(depth);
    return [shadow, body, top];
  }

  /** Felpudo de salida con flecha que bota; tocarlo sale de la tienda. */
  doorMat(onTap: () => void): void {
    const s = this.s;
    const c = this.screen(this.spots.door);
    this.scene.add.rectangle(c.x, c.y + 4 * s, 34 * s, 4 * s, 0x3e2723).setDepth(-450);
    const mat = this.scene.add
      .rectangle(c.x, c.y - 2 * s, 30 * s, 10 * s, 0x558b2f)
      .setStrokeStyle(Math.max(1, s / 2), 0x33691e)
      .setDepth(-450)
      .setInteractive({ useHandCursor: true });
    mat.on('pointerup', onTap);
    this.scene.add.text(c.x, c.y - 2 * s, '🐾', { fontSize: `${Math.round(7 * s)}px` }).setOrigin(0.5).setDepth(-449);
    const arrow = this.scene.add
      .text(c.x, c.y - 12 * s, '⬇', { fontFamily: 'sans-serif', fontSize: `${Math.round(8 * s)}px`, color: '#ffffff', stroke: '#33691e', strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(1000);
    this.scene.tweens.add({ targets: arrow, y: arrow.y + 3 * s, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }
}
```

- [ ] **Step 4: Typecheck** — Run: `npm run typecheck` → sin errores. (La pintura se verifica en Task 6 en el navegador.)

- [ ] **Step 5: Commit**

```bash
git add src/world/ShopInterior.ts src/config.ts src/scenes/PreloadScene.ts
git commit -m "feat(tienda): ShopInterior pinta el interior con arte o con colores"
```

---

### Task 6: `ShopScene` dentro de la tienda

**Files:**
- Modify (reescritura completa): `game/src/scenes/ShopScene.ts`
- Test: `game/tests/e2e/shop.spec.ts` (nuevo); las e2e existentes `play.spec.ts` y `polish.spec.ts` deben seguir pasando sin cambios.

**Interfaces:**
- Consumes: `ShopInterior` (T5), `pedestalFor` (T2), `MAPS.shop` (T5), `t('shop.hello' | 'shop.thanks' | 'shop.needCoins')` y `sfx.play('campanita')` (T4), `shopEntries`, `getSession().buy`, `animalPortrait`, `ART_KEYS.shopkeeper`, `idleFrame`, `addCloseButton`, `restartOnResize`, `textStyle` (existentes).
- Produces: igual que hoy — `cardScreenPos(itemId): Vec | null` (centro de la zona táctil del producto), `cardStatus(itemId): string | null`, `close(): void`. Nuevo para pruebas: `bubbleText(): string | null`.

- [ ] **Step 1: E2E que falla** — `game/tests/e2e/shop.spec.ts`

Copiar los helpers `startGame` y `canvasBox` de `tests/e2e/polish.spec.ts` (mismo archivo, mismas importaciones) y añadir:

```ts
test('la tienda por dentro: saludo, compra y salida por la puerta', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.addCoins(60));
  await page.evaluate(() => window.__ZOO__!.openShop());
  await page.waitForFunction(() => window.__ZOO__!.shopCardScreenPos('pantera') !== null);

  // El tendero saluda nada más entrar.
  expect(await page.evaluate(() => window.__ZOO__!.shopBubble())).toBe('¡Hola! ¿Qué animal quieres hoy?');

  // Se compra aunque el saludo no haya terminado.
  const pos = await page.evaluate(() => window.__ZOO__!.shopCardScreenPos('pantera'));
  const box = await canvasBox(page);
  await page.mouse.click(box.x + pos!.x, box.y + pos!.y);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.shopCardStatus('pantera'))).toBe('owned');
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.shopBubble())).toBe('¡Gracias! ¡Cuídalo mucho!');

  // Sin monedas para el panda: el tendero avisa.
  const panda = await page.evaluate(() => window.__ZOO__!.shopCardScreenPos('panda'));
  await page.mouse.click(box.x + panda!.x, box.y + panda!.y);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.shopBubble())).toBe('¡Te faltan monedas!');

  // Salir tocando el felpudo.
  const door = await page.evaluate(() => window.__ZOO__!.shopDoorScreenPos());
  await page.mouse.click(box.x + door!.x, box.y + door!.y);
  await page.waitForFunction(() => !window.__ZOO__?.activeScenes().includes('Shop'));
});
```

En `src/systems/testHooks.ts` añadir a la interfaz y al objeto (junto a `shopCardStatus`):

```ts
  shopBubble(): string | null;
  shopDoorScreenPos(): Vec | null;
```
```ts
    shopBubble: () => activeScene<ShopScene>('Shop')?.bubbleText() ?? null,
    shopDoorScreenPos: () => activeScene<ShopScene>('Shop')?.doorScreenPos() ?? null,
```

- [ ] **Step 2: Ver que falla** — Run: `npx playwright test tests/e2e/shop.spec.ts` → FAIL (`bubbleText` no existe / typecheck).

- [ ] **Step 3: Reescribir `game/src/scenes/ShopScene.ts`**

```ts
import * as Phaser from 'phaser';
import { ART_KEYS, getArt, idleFrame } from '../art/art';
import { pedestalFor } from '../core/interiorLayout';
import type { Vec } from '../core/movement';
import { shopEntries, type ShopEntry } from '../core/shopEntries';
import type { TiledMap } from '../core/tiledmap';
import { MAPS } from '../config';
import { t } from '../data/strings';
import { sfx } from '../systems/audio';
import { getSession } from '../systems/session';
import { animalPortrait } from '../world/Actors';
import { ShopInterior } from '../world/ShopInterior';
import { addCloseButton, restartOnResize, textStyle } from './ui';

interface Product {
  status: string;
  hit: Vec;
  animal: Phaser.GameObjects.Sprite | Phaser.GameObjects.Text;
  parts: Phaser.GameObjects.GameObject[];
}

/** La tienda por dentro: el tendero tras el mostrador y los animales en peanas. */
export class ShopScene extends Phaser.Scene {
  private readonly products = new Map<string, Product>();
  private interior!: ShopInterior;
  private keeper!: Phaser.GameObjects.Sprite | Phaser.GameObjects.Text;
  private bubble: Phaser.GameObjects.Container | null = null;
  private bubbleMessage: string | null = null;
  private busy = false;
  private closing = false;

  constructor() {
    super('Shop');
  }

  init(): void {
    this.products.clear();
    this.bubble = null;
    this.bubbleMessage = null;
    this.busy = false;
    this.closing = false;
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x1b120c).setOrigin(0).setDepth(-2000).setInteractive();
    const cached = this.cache.tilemap.get(MAPS.shop) as { data?: TiledMap } | undefined;
    this.interior = new ShopInterior(this, cached?.data ?? null);
    const s = this.interior.layout.scale;

    const title = this.interior.screen({ x: 160, y: 8 });
    this.add
      .text(title.x, Math.max(28, title.y), `🏪 ${t('shop.title')}`, textStyle(Math.round(Math.max(20, 9 * s)), '#fff8e1', '#5d4037'))
      .setOrigin(0.5, 0)
      .setDepth(1000);

    this.addShopkeeper();
    this.renderProducts();
    this.interior.doorMat(() => this.close());
    addCloseButton(this, () => this.close());
    this.input.keyboard?.on('keydown-ESC', this.close, this);
    restartOnResize(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', this.close, this);
    });
    this.enter();
  }

  /** Entrada: fundido, campanita y el tendero saluda. No bloquea: se puede comprar ya. */
  private enter(): void {
    this.cameras.main.fadeIn(300, 0, 0, 0);
    sfx.play('campanita');
    this.hopKeeper();
    this.say(t('shop.hello'), 2400);
    // Tocar en cualquier sitio salta el saludo.
    this.input.once(Phaser.Input.Events.POINTER_DOWN, () => {
      if (this.bubbleMessage === t('shop.hello')) this.hideBubble();
    });
  }

  close(): void {
    if (!this.scene.isActive() || this.closing) return;
    this.closing = true;
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop();
      this.scene.resume('World');
    });
  }

  cardScreenPos(itemId: string): Vec | null {
    return this.products.get(itemId)?.hit ?? null;
  }

  /** Estado de un producto (para pruebas): 'buy' | 'owned' | 'full'. */
  cardStatus(itemId: string): string | null {
    return this.products.get(itemId)?.status ?? null;
  }

  bubbleText(): string | null {
    return this.bubbleMessage;
  }

  doorScreenPos(): Vec {
    const door = this.interior.screen(this.interior.spots.door);
    return { x: door.x, y: door.y - 2 * this.interior.layout.scale };
  }

  private addShopkeeper(): void {
    const s = this.interior.layout.scale;
    const feet = this.interior.screen(this.interior.spots.shopkeeper);
    this.keeper = getArt()
      ? this.add.sprite(feet.x, feet.y, ART_KEYS.shopkeeper, idleFrame('down')).setOrigin(0.5, 1).setScale(s)
      : this.add.text(feet.x, feet.y, '🧑‍🌾', { fontSize: `${Math.round(22 * s)}px` }).setOrigin(0.5, 1);
    this.keeper.setDepth(this.interior.spots.shopkeeper.y);
    // Respira: sube y baja un pelín.
    this.tweens.add({ targets: this.keeper, scaleY: this.keeper.scaleY * 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  private hopKeeper(): void {
    const s = this.interior.layout.scale;
    const y = this.interior.screen(this.interior.spots.shopkeeper).y;
    this.tweens.add({ targets: this.keeper, y: y - 6 * s, duration: 140, yoyo: true, repeat: 1, ease: 'Quad.Out', onComplete: () => this.keeper.setY(y) });
  }

  /** Bocadillo del tendero encima de su cabeza. */
  private say(message: string, ms: number): void {
    this.hideBubble();
    const s = this.interior.layout.scale;
    const feet = this.interior.screen(this.interior.spots.shopkeeper);
    const text = this.add
      .text(0, 0, message, { fontFamily: 'sans-serif', fontSize: `${Math.round(Math.max(16, 6.5 * s))}px`, color: '#4e342e', align: 'center', wordWrap: { width: 110 * s } })
      .setOrigin(0.5);
    const w = text.width + 12 * s;
    const h = text.height + 8 * s;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1).lineStyle(Math.max(2, s * 0.75), 0x5d4037, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 4 * s).strokeRoundedRect(-w / 2, -h / 2, w, h, 4 * s);
    g.fillTriangle(-6 * s, h / 2 - 1, 2 * s, h / 2 - 1, -8 * s, h / 2 + 6 * s);
    const x = Math.max(w / 2 + 8, feet.x + 30 * s);
    this.bubble = this.add.container(x, feet.y - 44 * s - h / 2, [g, text]).setDepth(2000).setScale(0);
    this.bubbleMessage = message;
    this.tweens.add({ targets: this.bubble, scale: 1, duration: 220, ease: 'Back.Out' });
    const current = this.bubble;
    this.time.delayedCall(ms, () => {
      if (this.bubble === current) this.hideBubble();
    });
  }

  private hideBubble(): void {
    this.bubble?.destroy();
    this.bubble = null;
    this.bubbleMessage = null;
  }

  private renderProducts(): void {
    for (const product of this.products.values()) for (const part of product.parts) part.destroy();
    this.products.clear();
    shopEntries(getSession().state).forEach((entry, index) => this.addProduct(entry, pedestalFor(this.interior.spots, index)));
  }

  private addProduct(entry: ShopEntry, base: Vec): void {
    const s = this.interior.layout.scale;
    const pos = this.interior.screen(base);
    const parts: Phaser.GameObjects.GameObject[] = this.interior.drawPedestal(base);
    const done = entry.status !== 'buy';
    const affordable = getSession().state.coins >= entry.cost;

    const animal = animalPortrait(this, entry.animalId, pos.x, pos.y, 28 * s).setOrigin(0.5, 1).setDepth(base.y);
    if (entry.status === 'full') animal.setAlpha(0.5);
    // Bota suavecito, cada uno a su ritmo.
    this.tweens.add({ targets: animal, y: pos.y - 2 * s, duration: 520, yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 500), ease: 'Sine.InOut' });
    parts.push(animal);

    const fontSize = Math.round(Math.max(14, 5.5 * s));
    const extra = entry.kind === 'extra' ? `➕${entry.count}/${entry.max} ` : '';
    const label =
      entry.status === 'owned' ? `✅ ${t('shop.owned')}` : entry.status === 'full' ? `✔️ ${t('shop.full')}` : `${extra}🪙 ${entry.cost}`;
    const sign = this.add
      .text(pos.x, pos.y + 12 * s, label, {
        fontFamily: 'sans-serif',
        fontSize: `${fontSize}px`,
        color: '#ffffff',
        backgroundColor: done ? '#2e7d32' : affordable ? '#43a047' : '#9e9e9e',
        padding: { x: Math.round(2.5 * s), y: Math.round(1.5 * s) },
      })
      .setOrigin(0.5, 0)
      .setDepth(1500);
    parts.push(sign);

    // Zona táctil generosa (peana + animal) para dedos pequeños.
    const hit = { x: pos.x, y: pos.y - 10 * s };
    const zone = this.add.zone(hit.x, hit.y, 38 * s, 44 * s).setDepth(3000).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => void this.onProductTap(entry));
    parts.push(zone);

    this.products.set(entry.id, { status: entry.status, hit, animal, parts });
  }

  private async onProductTap(entry: ShopEntry): Promise<void> {
    if (this.busy || this.closing || entry.status !== 'buy') return;
    this.busy = true;
    const s = this.interior.layout.scale;
    const result = await getSession().buy(entry.id);
    if (result.ok) {
      sfx.play('buy');
      // Comprar un recinto puede hacer aparecer su extra: se rehacen todas las peanas.
      this.renderProducts();
      const product = this.products.get(entry.id);
      if (product) {
        this.tweens.add({ targets: product.animal, y: product.animal.y - 12 * s, duration: 160, yoyo: true, ease: 'Quad.Out' });
        this.coinShower(product.hit);
      }
      this.hopKeeper();
      this.say(t('shop.thanks'), 1800);
    } else if (result.error === 'not-enough-coins') {
      sfx.play('rechaza');
      const product = this.products.get(entry.id);
      if (product) this.tweens.add({ targets: product.animal, x: product.animal.x + 3 * s, duration: 50, yoyo: true, repeat: 3 });
      this.say(t('shop.needCoins'), 1800);
    }
    this.busy = false;
  }

  /** Lluvia corta de monedas y estrellitas sobre el animal comprado. */
  private coinShower(at: Vec): void {
    const s = this.interior.layout.scale;
    for (let i = 0; i < 10; i++) {
      const icon = this.add
        .text(at.x, at.y, i % 3 === 0 ? '✨' : '🪙', { fontSize: `${Math.round(7 * s)}px` })
        .setOrigin(0.5)
        .setDepth(2500);
      const angle = -Math.PI / 2 + Phaser.Math.FloatBetween(-1.1, 1.1);
      const dist = Phaser.Math.Between(18, 34) * s;
      this.tweens.add({
        targets: icon,
        x: at.x + Math.cos(angle) * dist,
        y: at.y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 1.4,
        duration: Phaser.Math.Between(500, 800),
        ease: 'Quad.Out',
        onComplete: () => icon.destroy(),
      });
    }
  }
}
```

- [ ] **Step 4: Typecheck + unit** — Run: `npm run typecheck && npm test` → sin errores.

- [ ] **Step 5: E2E completas** — Run: `npm run test:e2e`
Expected: PASS, incluidas `play.spec.ts` (compra de la pantera, ESC) y `polish.spec.ts` (extra "completo") sin tocarlas.
Si una prueba antigua falla porque espera cerrar en el acto, el cierre tarda 180 ms: los tests ya esperan con `waitForFunction`, así que no debería; no se cambian tiempos de los tests.

- [ ] **Step 6: Verificación visual en el navegador**

Arrancar el preview (`.claude/launch.json` → `npm run dev`, puerto 5173), abrir la tienda con `window.__ZOO__.addCoins(200); window.__ZOO__.openShop()` y hacer capturas:
1. Escritorio 1280×720 con arte (`npm run art:import` hecho): pared de madera, 3 ventanas con haz de luz y polvo, reloj y cuadros, estanterías, tendero asomando tras el mostrador con velas que parpadean, 5 peanas doradas en arco sobre la alfombra, animales botando, carteles legibles, felpudo con flecha, bocadillo de saludo.
2. Móvil apaisado (`resize_window` 812×375): todo cabe, nada se corta, carteles legibles.
3. Sin arte (renombrar `public/art/manifest.json` temporalmente): colores y emojis, misma disposición, compra funciona. Volver a dejar el manifiesto.
4. Comprar: monedas y ✨ salen, el tendero bota y dice "¡Gracias!".

Ajustar solo posiciones en `make-shop-map.mjs` (regenerar con `npm run make:shop-map`) si algo se solapa, y repetir `npx vitest run tests/unit/shopmap.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/scenes/ShopScene.ts src/systems/testHooks.ts tests/e2e/shop.spec.ts scripts/make-shop-map.mjs public/assets/maps/tienda.tmj
git commit -m "feat(tienda): ShopScene por dentro con tendero, peanas, saludo y campanita"
```

---

### Task 7: Documentación al día

**Files:**
- Modify: `README.md` (raíz, sección de la tienda / arte), `game/README.md` (scripts `make:shop-map`, `make:campanita`), `docs/superpowers/specs/2026-09-27-tienda-por-dentro-design.md` (Estado: implementado, con fecha)

- [ ] **Step 1:** Añadir en `game/README.md` los dos scripts nuevos con una línea cada uno y mencionar que `art:import` ahora también extrae `interior-*.png` del *Interior Tileset Pack – Essentials*.
- [ ] **Step 2:** En el README raíz, en la descripción del juego: "la tienda se ve por dentro: el tendero atiende tras el mostrador y los animales esperan en peanas".
- [ ] **Step 3:** Cambiar la cabecera del spec a `Estado: implementado (fase C, 2026-09-27)`.
- [ ] **Step 4: Commit**

```bash
git add README.md game/README.md docs/superpowers/specs/2026-09-27-tienda-por-dentro-design.md
git commit -m "docs: tienda por dentro (fase C) implementada"
```
