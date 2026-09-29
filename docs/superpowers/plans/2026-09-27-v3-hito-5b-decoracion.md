# ZooEsponji v3 — Hito 5b: decoración — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada recinto tenga su ambiente (🦁 sabana con leona, 🐐 montaña con rocas y cueva, 🐆 selva con catarata y estanque, 🐼 bosque de bambú), que el parque tenga bancos, farolas, flores, carteles con el nombre de cada animal y barriles/cajas junto a la tienda, y que la bandeja de comida use iconos del pack (la carne la pintan los niños; mientras, 🥩).

**Architecture:**
- **Piezas ("props")**: recortes de las hojas de los packs definidos en `game/art/art.config.json` (hoja + rectángulo). `npm run art:import` los exporta como `prop-<nombre>.png` y los apunta en el manifiesto (`props`, `foods`). Como el resto del arte, nunca entran en el repo público.
- **Mapa**: `make-zoo-map.mjs` añade a cada recinto la propiedad `biome` y coloca objetos de tipo `prop` (nombre de la pieza, posición, y si **bloquea** el paseo del animal). También los props del parque.
- **Dibujo**: en modo arte, el interior del recinto se rellena con el suelo del bioma y los props se colocan con **orden por profundidad según la Y** (el animal pasa por delante o por detrás de un árbol según dónde esté). En modo provisional no se dibuja la decoración (el juego sigue funcionando igual).
- **Paseo**: los animales eligen destinos que no atraviesen piezas que bloquean (agua, árboles grandes). La cabra sí puede subir a la montaña.

**Tech Stack:** Phaser 4.2.1, TypeScript, Vitest, Playwright, pngjs/adm-zip (importador).

**Spec:** `docs/superpowers/specs/2026-09-27-motor-phaser-v3-design.md` · **Plan anterior:** `docs/superpowers/plans/2026-09-27-v3-hito-5-arte.md`

**Decisiones de David y los niños (2026-09-27):** todo el tablón aprobado: sabana + leona, montaña, selva con catarata, bambú verde, parque con bancos/farolas/flores/carteles/barriles, iconos de comida; la carne la pintan los niños en Piskel (hasta entonces, emoji). El agua y las rocas ocupan **como mucho un tercio** de cada recinto.

## Global Constraints

- Directorio de trabajo: `game/`. Rama `v3-phaser`. TypeScript estricto; `core/` sin Phaser.
- **Ningún archivo de arte ni derivado en el repo público**; solo configuración (nombres de archivo y coordenadas) y código. Nada de los packs a herramientas de IA.
- Todo sigue funcionando y pasando las pruebas **sin** `public/art/` (modo provisional).
- Escalado entero; los props se dibujan a su tamaño nativo (×1 en el mundo).
- Piezas bloqueantes + agua ≤ 1/3 del interior de cada recinto; el animal siempre tiene sitio para pasear y se ve desde la puerta.
- Commits con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; nunca `--no-verify`.
- Al terminar: README raíz, `game/README.md`, estado en la spec, casillas del plan, README del repo privado y la guía de Piskel (sección carne).

## Hojas de origen (dentro de los zips del repo privado)

| Clave de zip | Zip | Hojas que se usan |
|---|---|---|
| `wooden` | `vectoraith_tileset_buildings_wooden.zip` | `Original/16x16/vectoraith_tileset_buildings_wooden_1.png` (bancos, farolas, cartel, barriles, cajas, flores) |
| `biomeA` | `Biome Tileset Pack A.zip` | `Original/16x16/temperate_forest/tilesets/vectoraith_tileset_details_temperate_forest.png` (flores, troncos, arbustos) |
| `biomeB` | `Biome Tileset Pack B.zip` | `16x16/savannah/tilesets/vectoraith_tileset_details_savannah.png`, `…_full_terrain_savannah.png` |
| `biomeC` | `Biome Tileset Pack C.zip` | `Original/16x16/tropical_rainforest/tilesets/vectoraith_tileset_details_tropical_rainforest.png`, `…_full_terrain_tropical_rainforest.png` |
| `biomeD` | `Biome Tileset Pack D.zip` | `Original/16x16/alpine/tilesets/vectoraith_tileset_full_terrain_alpine_A.png`, `…_details_alpine.png` |
| `monocots` | `Pixel Objects Pack - Monocots Plants.zip` | `Original/16x16/monocots_ATLAS.png` (bambú: columnas de la derecha) |
| `icons` | `vectoraith_iconset_16x16_farming.zip` | `vectoraith_16x16_iconset_farming.png` (zanahoria, piedra) |
| `farm` | `Farm & Cute Animals Sprite Pack.zip` | `16x16/Default Format/$rabbit.png` (icono del conejo = frame quieto de perfil) |
| `wild` | `Wild Animals Sprite Pack.zip` | `16x16/Default format/$lion_female.png` (leona) |

## Piezas necesarias (nombre → uso)

| Recinto / zona | Props |
|---|---|
| Suelos (tile 16×16 de relleno) | `ground-savannah`, `ground-alpine`, `ground-rainforest`, `ground-bamboo` (césped de bosque) |
| 🦁 Sabana | `acacia` (árbol grande), `grass-tall-dry` (mata de hierba alta, 2 variantes), `rock-savannah` |
| 🐐 Montaña | `plateau` (meseta de roca con paredes, ~3×4 tiles), `cave` (entrada de cueva), `pine`, `rock-grey` (2 variantes) |
| 🐆 Selva | `waterfall` (catarata con paredes de roca, ~3×4 tiles), `pond` (estanque, ~4×3 tiles), `lilypad`, `palm`, `jungle-tree`, `bush-jungle` |
| 🐼 Bambú | `bamboo-big`, `bamboo-mid`, `bamboo-small`, `log`, `flowers` (2 variantes) |
| Parque | `bench`, `lamp`, `sign` (cartel de madera), `barrel`, `crate-fruit`, `flowerbed` |
| Comida | `food-zanahoria`, `food-piedra`, `food-conejo` (de `$rabbit.png`) y, si existe `art-work/terminados/carne.png`, `food-carne` |

Las coordenadas exactas de cada recorte se fijan en la Task 2 con la herramienta de rejilla y se verifican con un tablón de previsualización.

## Mapa de archivos

```
game/
├── art/art.config.json            (mod) zips nuevos, props, foods, companions
├── scripts/
│   ├── import-art.ts              (mod) exporta props, foods, companions
│   ├── art/grid.ts                (nuevo) rejilla ampliada de una hoja (para catalogar)
│   ├── art/propsSheet.ts          (nuevo) tablón de todos los props importados (verificación)
│   └── make-zoo-map.mjs           (mod) biome por recinto + props + parque
├── src/
│   ├── art/manifest.ts            (mod) props, foods, companions (opcionales)
│   ├── core/
│   │   ├── depth.ts               (nuevo) depthForY
│   │   ├── obstacles.ts           (nuevo) pickWanderTarget, segmentHitsRects
│   │   └── tiledmap.ts            (mod) readProps, biome del recinto
│   ├── world/
│   │   ├── Decor.ts               (nuevo) suelos de bioma, props, carteles
│   │   ├── Actors.ts              (mod) profundidad por Y; companion
│   │   ├── Pens.ts                (mod) obstáculos, acompañante (leona), carteles en modo arte
│   │   └── TerrainArt.ts          (mod) quita la decoración vieja (pasa a Decor)
│   └── scenes/FeedScene.ts        (mod) iconos de comida
└── tests/unit/{depth,obstacles,manifest,zoomap,tiledmap}.test.ts
```

---

### Task 1: Manifiesto e importador ampliados (props, foods, companions)

**Files:** `game/src/art/manifest.ts`, `game/scripts/import-art.ts`, `game/art/art.config.json`, `game/tests/unit/manifest.test.ts`

**Interfaces:**
- `ArtManifest` gana campos **opcionales** (manifiestos antiguos siguen valiendo):
  - `props?: Record<string, ImageInfo>`
  - `foods?: Partial<Record<FoodId, ImageInfo>>`
  - `companions?: Partial<Record<AnimalId, SheetInfo>>` (animal decorativo que pasea con el principal; hoy solo `leon` → leona)
- `art.config.json` gana: `props: Record<string, { zip, file, x, y, w, h }>`, `foods: Record<FoodId, { zip, file, x, y, w, h } | { override: string }>` (la carne: `{ "override": "carne.png" }`), `companions: { leon: { zip: "wild", file: "16x16/Default format/$lion_female.png" } }`, y las claves nuevas en `zips`: `biomeA`, `biomeB`, `biomeC`, `biomeD`, `monocots`, `icons`.
- Salida: `prop-<nombre>.png`, `food-<id>.png`, `companion-<animal>.png`.

- [x] **Step 1: Tests (fallan)** — en `manifest.test.ts` añadir:

```ts
  it('acepta props, comidas y acompañantes opcionales', () => {
    const m = parseManifest({
      ...valid(),
      props: { acacia: image },
      foods: { zanahoria: image },
      companions: { leon: sheet(24, 24) },
    });
    expect(m?.props?.acacia?.width).toBe(16);
    expect(m?.foods?.zanahoria?.file).toBe('d.png');
    expect(m?.companions?.leon?.frameWidth).toBe(24);
  });

  it('sin props ni comidas sigue siendo válido', () => {
    const m = parseManifest(valid());
    expect(m?.props).toEqual({});
    expect(m?.foods).toEqual({});
  });

  it('rechaza un prop mal formado', () => {
    expect(parseManifest({ ...valid(), props: { roto: { file: 'x.png' } } })).toBeNull();
  });
```

- [x] **Step 2: `manifest.ts`** — añadir a la interfaz:

```ts
  props: Record<string, ImageInfo>;
  foods: Partial<Record<FoodId, ImageInfo>>;
  companions: Partial<Record<AnimalId, SheetInfo>>;
```

(con `import { FOOD_IDS, type FoodId } from '../data/foods';`) y al final de `parseManifest`, antes del `return`:

```ts
  const props: Record<string, ImageInfo> = {};
  if (value.props !== undefined) {
    if (!isObject(value.props)) return null;
    for (const [name, raw] of Object.entries(value.props)) {
      const img = asImage(raw);
      if (!img) return null;
      props[name] = img;
    }
  }
  const foods: Partial<Record<FoodId, ImageInfo>> = {};
  if (isObject(value.foods)) {
    for (const id of FOOD_IDS) {
      if (value.foods[id] === undefined) continue;
      const img = asImage(value.foods[id]);
      if (!img) return null;
      foods[id] = img;
    }
  }
  const companions: Partial<Record<AnimalId, SheetInfo>> = {};
  if (isObject(value.companions)) {
    for (const id of ANIMAL_IDS) {
      if (value.companions[id] === undefined) continue;
      const s = asSheet(value.companions[id]);
      if (!s) return null;
      companions[id] = s;
    }
  }
```

y devolver `props, foods, companions` en el objeto final.

- [x] **Step 3: Importador** — en `import-art.ts`:
  - Tipos de configuración: `props?: Record<string, Source & Rect>`, `foods?: Record<string, (Source & Rect) | { override: string }>`, `companions?: Record<string, Source>` (con `type Rect = { x: number; y: number; w: number; h: number }`).
  - Exportar cada prop con `crop` a `prop-<nombre>.png`; cada comida con recorte a `food-<id>.png`, o, si es `{ override }` y existe `art-work/terminados/<override>`, copiarla (si no existe, omitirla: el juego usará el emoji); cada acompañante tal cual a `companion-<id>.png` con `sheet(png)`.
  - Añadir `props`, `foods`, `companions` al manifiesto.

- [x] **Step 4: Configuración inicial** — añadir en `art.config.json` las claves de `zips` nuevas (tabla de arriba), `companions` (leona) y `"foods": { "carne": { "override": "carne.png" } }`. Los `props` y el resto de `foods` se rellenan en la Task 2.

- [x] **Step 5: Verificar y commit** — `npm test && npm run typecheck && npm run art:import` (el manifiesto incluye `companions.leon` 24×24). Commit `feat(v3): manifiesto e importador con props, comida y acompanantes`.

---

### Task 2: Catálogo de piezas (recortes) y tablón de verificación

**Files:** `game/scripts/art/grid.ts`, `game/scripts/art/propsSheet.ts`, `game/package.json`, `game/art/art.config.json`

**Interfaces:**
- `npm run art:grid -- <clave-zip> "<archivo en el zip>" <salida.png>` → hoja ampliada ×4 con rejilla de 16 px (líneas magenta) para leer coordenadas. Salida fuera del repo (scratchpad o `art-packs/`).
- `npm run art:props-sheet -- <salida.png>` → tablón con todos los `prop-*.png` y `food-*.png` de `public/art/` en fila (×3), para comprobar recortes de un vistazo.

- [x] **Step 1: Herramientas** — `grid.ts` reutiliza el lector de zips de `import-art.ts` (extraer `readSource` y la carga de config a `scripts/art/source.ts` y usarlo desde ambos). `propsSheet.ts` lee `public/art/manifest.json` y compone los PNG con pngjs.

- [x] **Step 2: Catalogar** — para cada pieza de la tabla "Piezas necesarias": generar la rejilla de su hoja, localizar la pieza, anotar `x, y, w, h` en píxeles (múltiplos de 16 salvo iconos) y añadirla a `props`/`foods` en `art.config.json`. Criterios:
  - El recorte incluye la pieza entera (sombra incluida) y nada de piezas vecinas.
  - Árboles y bambú: recorte ajustado a su alto real (pueden ser 32–64 px de alto).
  - `ground-*`: un tile 16×16 **liso** del suelo de relleno del bioma (sin bordes).
  - `food-conejo`: frame quieto de perfil (fila derecha, columna central) de `$rabbit.png`.

- [x] **Step 3: Verificar** — `npm run art:import && npm run art:props-sheet -- <scratchpad>/props.png`; revisar la imagen: cada pieza completa y limpia. Repetir hasta que todas estén bien. Enviar el tablón a David (queda en local).

- [x] **Step 4: Commit** — `feat(v3): catalogo de piezas de decoracion (solo coordenadas)`.

---

### Task 3: Profundidad por Y y paseo con obstáculos (lógica pura)

**Files:** `game/src/core/depth.ts`, `game/src/core/obstacles.ts`, tests `depth.test.ts`, `obstacles.test.ts`

**Interfaces:**
- `DEPTH_BASE = 100`; `depthForY(y: number): number` = `DEPTH_BASE + y` (lo que está más abajo se dibuja delante). Suelo y vallas quedan por debajo de 100.
- `segmentHitsRects(from: Vec, to: Vec, rects: readonly Rect[], step = 4): boolean` — muestrea el segmento cada `step` px.
- `pickWanderTarget(area: Rect, from: Vec, obstacles: readonly Rect[], rng: Rng, margin = 12, attempts = 12): Vec | null` — punto al azar en `area` (con margen) que no cae en un obstáculo y cuyo camino recto desde `from` no los atraviesa; `null` si no encuentra.

- [x] **Step 1: Tests (fallan)**

```ts
// depth.test.ts
import { describe, expect, it } from 'vitest';
import { DEPTH_BASE, depthForY } from '../../src/core/depth';

describe('depthForY', () => {
  it('más abajo = más delante', () => {
    expect(depthForY(200)).toBeGreaterThan(depthForY(100));
  });
  it('siempre por encima del suelo', () => {
    expect(depthForY(0)).toBe(DEPTH_BASE);
  });
});
```

```ts
// obstacles.test.ts
import { describe, expect, it } from 'vitest';
import { pickWanderTarget, segmentHitsRects } from '../../src/core/obstacles';

const pond = { x: 40, y: 0, width: 20, height: 100 };

describe('segmentHitsRects', () => {
  it('detecta cruzar un obstáculo', () => {
    expect(segmentHitsRects({ x: 0, y: 50 }, { x: 100, y: 50 }, [pond])).toBe(true);
  });
  it('libre si no lo cruza', () => {
    expect(segmentHitsRects({ x: 0, y: 50 }, { x: 30, y: 50 }, [pond])).toBe(false);
  });
});

describe('pickWanderTarget', () => {
  const area = { x: 0, y: 0, width: 100, height: 100 };

  it('nunca devuelve un punto dentro de un obstáculo ni tras él', () => {
    let seed = 0;
    const rng = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 50; i++) {
      const p = pickWanderTarget(area, { x: 10, y: 50 }, [pond], rng);
      if (!p) continue;
      expect(p.x < 40 || p.x > 60).toBe(true);
      expect(segmentHitsRects({ x: 10, y: 50 }, p, [pond])).toBe(false);
    }
  });

  it('null si todo está bloqueado', () => {
    expect(pickWanderTarget(area, { x: 50, y: 50 }, [area], () => 0.5)).toBeNull();
  });
});
```

- [x] **Step 2: Implementar**

```ts
// depth.ts
export const DEPTH_BASE = 100;
export function depthForY(y: number): number {
  return DEPTH_BASE + y;
}
```

```ts
// obstacles.ts
import { rectContains, type Rect } from './interaction';
import type { Vec } from './movement';
import type { Rng } from './wander';

export function segmentHitsRects(from: Vec, to: Vec, rects: readonly Rect[], step = 4): boolean {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const samples = Math.max(1, Math.ceil(length / step));
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const p = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    if (rects.some((r) => rectContains(r, p))) return true;
  }
  return false;
}

export function pickWanderTarget(
  area: Rect,
  from: Vec,
  obstacles: readonly Rect[],
  rng: Rng,
  margin = 12,
  attempts = 12,
): Vec | null {
  for (let i = 0; i < attempts; i++) {
    const p = {
      x: area.x + margin + rng() * (area.width - margin * 2),
      y: area.y + margin + rng() * (area.height - margin * 2),
    };
    if (obstacles.some((r) => rectContains(r, p))) continue;
    if (segmentHitsRects(from, p, obstacles)) continue;
    return p;
  }
  return null;
}
```

- [x] **Step 3: Verificar y commit** — `npm test && npm run typecheck`. Commit `feat(v3): profundidad por Y y paseo que esquiva obstaculos`.

---

### Task 4: Mapa con biomas y props

**Files:** `game/scripts/make-zoo-map.mjs`, `game/public/assets/maps/zoo.tmj`, `game/src/core/tiledmap.ts`, `game/tests/unit/tiledmap.test.ts`, `game/tests/unit/zoomap.test.ts`

**Interfaces:**
- Objetos `recinto` ganan propiedad string `biome`: `savannah` (león), `alpine` (cabra), `rainforest` (pantera), `bamboo` (panda).
- Objetos `prop` (capa `objetos`): `x, y` = **punto de apoyo** (centro de la base de la pieza, en px); propiedades `prop` (nombre) y `blocks` (bool); `width/height` = rectángulo que bloquea (0 si no bloquea).
- `readProps(map): PropInfo[]` con `interface PropInfo { prop: string; x: number; y: number; blocks: boolean; block: Rect | null }` (el `Rect` bloqueante, en px, centrado en la base).
- `EnclosureInfo` gana `biome: string | null`.
- Sustituye los objetos `decor` del hito 5 (árboles, arbustos y fuente pasan a ser props: `tree`, `bush`, `fountain` apuntando a los recortes del hito 5, que se mueven a `props` en la config).

- [x] **Step 1: Composición de cada recinto** (interior 10×6 tiles = 160×96 px; se describe en tiles relativos a la esquina interior superior izquierda):
  - 🦁 **Sabana**: `acacia` en (2,2) bloquea 2×1; `acacia` en (8,5) bloquea 2×1; `rock-savannah` en (6,1) y (1,5); `grass-tall-dry` en (4,5), (5,1), (9,2), (3,3) (no bloquean). Leona: acompañante.
  - 🐐 **Montaña**: `plateau` apoyada en (7,4) ocupando ~3×4 (no bloquea: la cabra sube); `cave` en (8,1); `pine` en (1,2) y (2,5) bloquean 1×1; `rock-grey` en (4,2) y (5,5).
  - 🐆 **Selva**: `waterfall` apoyada en (8,3) (arriba a la derecha), bloquea 3×3; `pond` apoyado en (8,6) bloquea 4×2; `lilypad` sobre el estanque (no bloquean); `palm` en (1,2) y (3,5) bloquean 1×1; `jungle-tree` en (5,2) bloquea 2×1; `bush-jungle` en (2,4), (6,5).
  - 🐼 **Bambú**: `bamboo-big` en (1,2) y (8,2) bloquean 2×1; `bamboo-mid` en (3,1), (7,5); `bamboo-small` en (5,1), (2,5), (9,4); `log` en (5,4) bloquea 2×1; `flowers` en (4,5), (8,4).
  - **Parque**: `sign` junto a la puerta de cada recinto (a la izquierda de la puerta, sobre césped del lado del camino); `bench` cada ~8 tiles en el césped junto a la cruz central; `lamp` en las 4 esquinas de la cruz; `flowerbed` delante de la fuente y junto a la tienda; `barrel` y `crate-fruit` a los lados del puesto de mercado; se mantienen `tree`/`bush`/`fountain`.
  - Regla: agua + props bloqueantes ≤ 1/3 del interior (lo comprueba un test).

- [x] **Step 2: Tests (fallan)** — en `zoomap.test.ts`:

```ts
import { readProps } from '../../src/core/tiledmap';

it('cada recinto tiene bioma', () => {
  expect(readEnclosures(map).map((e) => e.biome).sort()).toEqual(['alpine', 'bamboo', 'rainforest', 'savannah']);
});

it('lo que bloquea ocupa como mucho un tercio del interior de cada recinto', () => {
  const props = readProps(map);
  for (const e of readEnclosures(map)) {
    const inner = { x: e.x + 16, y: e.y + 16, width: e.width - 32, height: e.height - 32 };
    const blocked = props
      .filter((p) => p.block && p.x > inner.x && p.x < inner.x + inner.width && p.y > inner.y && p.y <= inner.y + inner.height)
      .reduce((sum, p) => sum + p.block!.width * p.block!.height, 0);
    expect(blocked, e.animalId).toBeLessThanOrEqual((inner.width * inner.height) / 3);
  }
});

it('los props del parque no tapan caminos', () => {
  for (const p of readProps(map)) {
    const tile = { x: Math.floor(p.x / 16), y: Math.floor((p.y - 1) / 16) };
    expect(isWalkable(grid, tile.x, tile.y), `${p.prop} en (${tile.x},${tile.y})`).toBe(false);
  }
});
```

y en `tiledmap.test.ts` un test de `readProps` con un mapa mínimo (objeto `prop` con `blocks: true` y 32×16 → `block` centrado en la base).

- [x] **Step 3: Implementar** `readProps` y `biome` en `tiledmap.ts`, y el generador. Ejecutar `npm run make:zoo-map`.

- [x] **Step 4: Verificar y commit** — `npm test && npm run typecheck && npm run test:e2e`. Commit `feat(v3): mapa con biomas por recinto y props de decoracion`.

---

### Task 5: Dibujar la decoración (`Decor`) con profundidad por Y

**Files:** `game/src/world/Decor.ts`, `game/src/world/TerrainArt.ts`, `game/src/world/Actors.ts`, `game/src/world/Pens.ts`, `game/src/world/VisitorCrowd.ts`, `game/src/scenes/WorldScene.ts`, `game/src/world/ShopBuilding.ts`

**Interfaces:**
- `Decor.build(scene, mapData): void` (solo en modo arte): rellena el interior de cada recinto con `ground-<biome>` (un `TileSprite` a profundidad 1, por encima del césped y por debajo de las vallas) y coloca cada prop con `setOrigin(0.5, 1)` en su punto de apoyo y `setDepth(depthForY(y))`. Los `sign` llevan encima el nombre del animal del recinto más cercano (texto pequeño con borde).
- `Walker` actualiza su profundidad con `depthForY(y)` en cada `moveTo` (cuidador, visitantes, animales, leona).
- `TerrainArt` deja de colocar la decoración (la hace `Decor`).
- En modo arte, los carteles sustituyen a las etiquetas flotantes de `Pens`; en modo provisional se mantienen las etiquetas.
- Tienda: el puesto de mercado usa `depthForY` de su base.

- [x] **Step 1: Implementar** según las interfaces.
- [x] **Step 2: Verificar visualmente** con capturas (Playwright en el scratchpad, como en el hito 5): cada recinto, la cruz del parque y la tienda. Ajustar posiciones del generador si algo tapa la puerta o queda raro.
- [x] **Step 3: Tests y commit** — `npm test && npm run test:e2e` (con y sin arte). Commit `feat(v3): decoracion de recintos y parque con profundidad por Y`.

---

### Task 6: Animales que esquivan obstáculos + leona

**Files:** `game/src/world/Pens.ts`, `game/src/world/Actors.ts`, `game/src/scenes/WorldScene.ts`

**Interfaces:**
- `Pens` recibe los props (`readProps`) y, por recinto, la lista de rectángulos bloqueantes que caen dentro; el paseo usa `pickWanderTarget(pen.rect, pos, obstacles, Math.random, 24)`; si devuelve `null`, descansa y lo intenta más tarde.
- `createCompanion(scene, animalId, x, y): Walker | null` en `Actors.ts` (sprite del manifiesto `companions`); `Pens` crea la leona en el recinto del león y la hace pasear igual (sin bocadillo, sin candado).

- [x] **Step 1: Implementar** y comprobar en capturas que ningún animal atraviesa el estanque ni los árboles grandes, y que la cabra sube a la meseta.
- [x] **Step 2: Tests y commit** — commit `feat(v3): animales que esquivan obstaculos y leona acompanante`.

---

### Task 7: Iconos de comida

**Files:** `game/src/scenes/FeedScene.ts`

**Interfaces:**
- En la bandeja, si `getArt()?.foods[id]` existe se usa la imagen (cargada en `queueArt` como `art-food-<id>`) con escala entera para que mida lo mismo que ahora (`size` px); si no, el emoji. La zona táctil sigue siendo ≥ 64 px.
- `queueArt` carga `foods`, `props` y `companions` (claves `art-food-<id>`, `art-prop-<nombre>`, `art-companion-<animal>`; anims de andar para acompañantes).

- [x] **Step 1: Implementar** (incluye el cambio en `art/art.ts`).
- [x] **Step 2: Verificar** con captura del primer plano (zanahoria, piedra y conejo con icono; carne con emoji hasta que exista `carne.png`) y `npm run test:e2e` (el arrastre sigue funcionando: los ganchos devuelven la misma posición de cada comida).
- [x] **Step 3: Commit** — `feat(v3): iconos de comida del pack (carne en emoji hasta que la pinten)`.

---

### Task 8: Carne para Piskel, documentación y subida

- [x] **Step 1: Guía de la carne** — en `zooesponji-private/art-work/GUIA-PINTAR-CON-PISKEL.md` añadir la sección "🥩 Carne (icono 16×16)": Create Sprite → tamaño 16×16 (Resize), pintar un filete (contorno oscuro, rojo con veta blanca, hueso blanco opcional) mirando los iconos del pack como referencia **sin subirlos a IA**, Export → PNG (1 frame) → guardar como `art-work/terminados/carne.png`. Añadir en `art-work/plantillas/` `carne_referencia_x8_para_ver.png` con 3 iconos del pack de comida ampliados (zanahoria, huevo, pescado) para que vean el estilo.
- [x] **Step 2: Documentación** — README raíz (fila v3: hito 5b ✅), `game/README.md` (props, `art:grid`, `art:props-sheet`, carne), spec (estado + decisiones), casillas de este plan, README del repo privado.
- [x] **Step 3: Subir ambos repos** (David ya lo autorizó para cerrar cada bloque) y comprobar que `game-ci` queda en verde. Revisar antes que no se sube nada confidencial ni de arte al repo público.
- [ ] **Step 4: Prueba en el móvil (David)** — `npm run art:import`, `npm run build`, `npx cap sync android`, ▶ Run.
