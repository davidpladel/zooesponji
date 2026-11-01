# Caminos nuevos, Luna, Jose, tutorial visual y aviso del libro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seis atajos en el mapa (con un jardín dentro de la «U»), la perrita Luna que se compra y sigue a la cuidadora, la cría de panda Jose, los precios nuevos del estanque y las ovejas, un tutorial que se entiende sin saber leer y el libro de la tienda a la vista desde la 3.ª visita.

**Architecture:** Toda la lógica nueva va en módulos puros de `game/src/core/` con su prueba (`petFollow.ts`, `tutorial.ts`, más funciones en `wander.ts`, `book.ts`, `economy.ts`, `shopEntries.ts`, `save.ts`). Phaser solo pinta y conecta: `WorldScene` (Luna, aviso del tutorial), `ShopScene` (Luna en la peana, libro parpadeando), dos escenas nuevas (`TutorialOfferScene`, `TutorialScene`) y un botón más en `SettingsScene`. Los caminos salen del generador `scripts/make-zoo-map.mjs`; el arte de Luna, de un script propio que dibuja `game/art/luna.png`.

**Tech Stack:** TypeScript 5.9, Phaser 4.2.1, Vite 8, Vitest 5, Playwright 1.63, pngjs 7, Capacitor 8 (Android).

**Spec:** `docs/superpowers/specs/2026-11-01-luna-jose-caminos-tutorial-design.md`

## Global Constraints

- **Las pruebas las lanza David.** Ningún `npm test`, `npm run typecheck`, `vitest` ni `playwright` lo lanza quien ejecute el plan. En cada **punto de control** se le dan los comandos en PowerShell, uno por bloque, con el resultado esperado, y se espera su respuesta. Lo que no depende de ese resultado puede seguir.
- Git lo hace quien ejecute el plan: un commit por tarea en `feat/luna-jose-caminos-tutorial`, con el estilo del repo (`feat(juego): …`, `fix: …`, `docs: …`). No se fusiona ni se sube sin que David lo pida.
- Comentarios, nombres de prueba y textos en español, como el resto del código.
- **El tutorial no puede necesitar saber leer:** solo mano (👆), flechas, iconos y el propio juego. Los únicos textos son las etiquetas de los dos botones del aviso y la del menú, y todo funciona igual sin leerlas.
- **Una partida antigua nunca se rompe al cargar.** No se cambia `SAVE_VERSION` (sigue en 2): los campos nuevos tienen valor por defecto cuando faltan.
- Precios: Luna **67**, Jose **20** (el `extraCost` del panda), estanque **120**, ovejas **120**. La tienda se abre con `SHOP_UNLOCK_COINS` = **20**.
- Luna: nombre traducido (único nombre del juego que se traduce). Jose: «Jose», sin tilde, igual en todos los idiomas.
- El arte con licencia VectoRaith sigue solo en el repo privado. `game/art/luna.png` es dibujo propio y sí va al repo público.
- Los huecos de las tiendas futuras del hermano de David (círculos «T» y garabatos azules del plano a mano) no se tocan. Como el plano no está en el repo, **David valida la vista previa del mapa antes de seguir** (tarea 1).
- Ningún camino nuevo puede bloquear una puerta ni dejar casillas de camino sin salida.
- Textos nuevos en los 11 idiomas del juego (`game/src/data/strings/*.ts`). Notas de Play: borrador en español a David, y solo con su visto bueno, los 13 idiomas.
- La versión (vc 12 o la que toque) se decide al fusionar; este plan no toca `package.json` ni `build.gradle`.

## Review Focus

1. **Partida guardada antes de esta rama** (sin `luna`, `tutorial`, `shop`, `book.opened`; también una v1 con `unlocked`): carga sin perder nada; quien ya tenía la tienda abierta no ve el aviso del tutorial al entrar; el libro cuenta como abierto si ya hay páginas leídas. → pruebas en la tarea 4.
2. **El aviso del tutorial, el panel del anuncio y el aviso de votación a la vez**: nunca dos paneles; mientras dura el tutorial no se ofrece anuncio ni aviso de votación. → pruebas e2e en las tareas 10 y 11.
3. **La cuidadora entra en un recinto, en la tienda o se cambia de idioma con Luna detrás**: Luna espera en la puerta del recinto, no se queda atascada en el césped y, si el mundo se vuelve a montar, aparece junto a la cuidadora. → pruebas en la tarea 7.
4. **Casillas de camino a las que no se llega** (visitantes atascados o cuidadora encerrada) tras añadir los atajos y mover el estanque y las ovejas. → prueba de conectividad en la tarea 1.
5. **Girar el móvil** con el aviso del tutorial, con el tutorial en marcha o dentro de la tienda: el aviso se vuelve a montar, el tutorial sigue en el mismo paso y la visita a la tienda no se cuenta dos veces. → pruebas en las tareas 8, 10 y 11.

---

## Mapa de archivos

| Archivo | Qué cambia |
|---|---|
| `game/scripts/make-zoo-map.mjs` → `game/public/assets/maps/zoo.tmj` | Atajos, jardín de la U, ovejas y estanque más a la izquierda, árboles apartados. |
| `game/scripts/map-preview.ts` (nuevo) | Dibuja el mapa lógico en PNG, con lo nuevo resaltado, para que David lo compare con su plano. |
| `game/src/core/wander.ts`, `game/src/world/VisitorCrowd.ts` | Los visitantes eligen destinos con menos gente. |
| `game/src/data/pens.ts`, `game/art/art.config.json`, `game/scripts/art/looks.ts`, `game/scripts/art/source.ts` | Precios, Jose y retoques encima de un dibujo terminado. |
| `game/src/core/save.ts`, `game/src/systems/session.ts` | `luna`, `tutorial.offered`, `shop.visits`, `book.opened`. |
| `game/src/data/shop.ts`, `game/src/core/economy.ts`, `game/src/core/shopEntries.ts`, `game/src/systems/events.ts`, `game/src/systems/analyticsEvents.ts`, `game/src/scenes/ShopScene.ts` | Luna como artículo. |
| `game/scripts/make-luna.ts` (nuevo), `game/art/luna.png` (nuevo), `game/scripts/import-art.ts`, `game/src/art/manifest.ts`, `game/src/art/art.ts`, `game/src/world/Actors.ts` | Arte de Luna. |
| `game/src/core/petFollow.ts` (nuevo), `game/src/scenes/WorldScene.ts` | Luna sigue a la cuidadora. |
| `game/src/core/book.ts`, `game/src/scenes/ShopScene.ts`, `game/src/scenes/BookScene.ts` | Libro a la vista desde la 3.ª visita. |
| `game/src/core/tutorial.ts` (nuevo), `game/src/scenes/TutorialOfferScene.ts` (nuevo), `game/src/scenes/TutorialScene.ts` (nuevo), `game/src/scenes/SettingsScene.ts`, `game/src/scenes/HudScene.ts`, `game/src/core/hud.ts`, `game/src/systems/platform.ts`, `game/src/main.ts` | Tutorial. |
| `game/src/data/strings/*.ts` | Textos nuevos en 11 idiomas. |
| `game/src/systems/testHooks.ts` | API de pruebas. |
| `game/tests/unit/*`, `game/tests/e2e/*` | Pruebas; todos los `page.goto('/')` existentes pasan a `page.goto('/?sin-tutorial')`. |

---

### Task 1: Caminos nuevos y jardín de la U

**Files:**
- Modify: `game/scripts/make-zoo-map.mjs`
- Regenerate: `game/public/assets/maps/zoo.tmj` (`npm run make:zoo-map`, en `game/`)
- Create: `game/scripts/map-preview.ts`, script `"map:preview": "node scripts/map-preview.ts"` en `game/package.json`
- Test: `game/tests/unit/zoomap.test.ts`

**Interfaces:**
- Consumes: nada nuevo.
- Produces: el mapa con los atajos. Ninguna API cambia (`readEnclosures`, `readGates`, `readProps` siguen igual).

Coordenadas en casillas del mapa entero (96×60), como `fill(x0, y0, x1, y1, PATH)`. Caminos de 2 de ancho, como las avenidas. Hoy: avenida de arriba en las filas 17–18 (x 12–79), avenida oeste/este en las filas 36–37, cuadrado central x 26–69 · y 22–51, entrada en x 47–48 desde la fila 52.

| # | Atajo | `fill` |
|---|---|---|
| 1 | Izquierda | `(3,17,11,18)`, `(3,19,4,37)` |
| 2 | Junto a los pingüinos, a la esquina de arriba a la izquierda del cuadrado | `(26,19,27,21)` |
| 3 | Abajo a la izquierda hasta la entrada | `(3,38,4,55)`, `(5,54,46,55)` |
| 4 | La U (sube entre la Sabana y los elefantes y baja) | `(38,5,49,6)`, `(38,7,39,16)`, `(48,7,49,16)` |
| 5 | Derecha, por el borde y por abajo hasta la entrada | `(80,17,91,18)`, `(92,17,93,55)`, `(49,54,91,55)` |
| 6 | Horizontal derecha: lado derecho del cuadrado → camino 5 | `(70,49,91,50)` |

Para que el camino 5 baje pegado al borde, el estanque deja de tocar el borde derecho:
- Ovejas: `ew` 11 → **9** (x 72–80). Su tocón pasa de `cx` 7 a **5**.
- Estanque: `x` 84 → **82**, `gateX` 88 → **86** (mismo `ew` 10, el lago sigue a 2 casillas de la valla). Su cartel `at('sign', 87, 35)` → `(85, 35)`.

Árboles y arbustos que quedarían sobre un camino: `at('tree', 3, 30)` → `(7, 21)`; `(4, 50)` → `(7, 50)`; `(38, 6)` → `(36, 6)`; `(38, 12)` → `(36, 12)`; `(92, 42)` → `(90, 44)`; `at('tree', 44, 9)` y `at('bush', 40, 16)` se quitan (ahí va el jardín).

Jardín de la U: dentro de x 40–47 · y 7–16, al menos 8 piezas de flores (`flowers`, `flowers-red`, `sunflowers`, `flowerbed`), todas con `at(...)` sin `block` ni `solid`: solo decoran.

- [ ] **Step 1: Escribir las pruebas nuevas en `zoomap.test.ts`**

```ts
const ATAJOS: [string, number, number][] = [
  ['izquierda', 3, 25], ['izquierda', 8, 17], ['pingüinos', 26, 20], ['abajo izquierda', 3, 45], ['abajo izquierda', 20, 55],
  ['U', 38, 10], ['U', 44, 5], ['U', 49, 10], ['derecha', 85, 17], ['derecha', 92, 25], ['derecha', 92, 45], ['derecha', 70, 55],
  ['horizontal derecha', 80, 49],
];

it('están los seis atajos', () => {
  for (const [name, x, y] of ATAJOS) expect(isWalkable(grid, x, y), `${name} (${x},${y})`).toBe(true);
});

it('los atajos acortan de verdad', () => {
  // Antes había que bajar al centro y volver a subir.
  expect(findPath(grid, { x: 12, y: 17 }, { x: 5, y: 36 })!.length).toBeLessThanOrEqual(32);
  expect(findPath(grid, { x: 79, y: 17 }, { x: 93, y: 36 })!.length).toBeLessThanOrEqual(40);
  expect(findPath(grid, { x: 5, y: 37 }, spawn)!.length).toBeLessThanOrEqual(65);
});

it('se llega andando a cualquier casilla de camino desde la entrada (nadie se queda atascado)', () => {
  const solid = withSolidProps(grid, readProps(map), 16);
  // Recorrido en anchura desde el inicio; toda casilla transitable tiene que aparecer.
  // (helper local `reachable(solid, spawn): Set<string>` con claves "x,y")
  const seen = reachable(solid, spawn);
  for (let y = 0; y < solid.height; y++)
    for (let x = 0; x < solid.width; x++) if (isWalkable(solid, x, y)) expect(seen.has(`${x},${y}`), `(${x},${y})`).toBe(true);
});

it('dentro de la U hay un jardín de flores que solo decora', () => {
  const flowers = readProps(map).filter((p) => {
    const tx = Math.floor((p.x - 1) / 16);
    const ty = Math.floor((p.y - 1) / 16);
    return tx >= 40 && tx <= 47 && ty >= 7 && ty <= 16;
  });
  expect(flowers.length).toBeGreaterThanOrEqual(8);
  for (const p of flowers) {
    expect(p.prop).toMatch(/^(flowers|sunflowers|flowerbed)/);
    expect(p.block, p.prop).toBeNull();
    expect(p.solid, p.prop).toBe(false);
  }
});

it('ningún atajo entra en un recinto: solo la puerta abre la valla', () => {
  const gates = readGates(map);
  for (const e of readEnclosures(map)) {
    for (let ty = e.y / 16; ty < (e.y + e.height) / 16; ty++)
      for (let tx = e.x / 16; tx < (e.x + e.width) / 16; tx++) {
        const isGate = gates.some((g) => g.penId === e.penId && ty === g.tile.y && (tx === g.tile.x || tx === g.tile.x + 1));
        if (!isGate) expect(isWalkable(grid, tx, ty), `${e.penId} (${tx},${ty})`).toBe(false);
      }
  }
});
```

Las pruebas que ya existen («no hay caminos de 1 casilla», «los props se apoyan en césped», «el estanque tiene un lago de 6×6», «cada recinto … se llega andando a la puerta», «el parque de siempre queda en el centro») siguen igual y tienen que pasar con el mapa nuevo.

- [ ] **Step 2: Cambiar `make-zoo-map.mjs` con la tabla de arriba y regenerar**

Run (en `game/`): `npm run make:zoo-map`
Expected: `Mapa generado en …/public/assets/maps/zoo.tmj`

- [ ] **Step 3: Escribir `game/scripts/map-preview.ts`**

`node scripts/map-preview.ts [--antes <tmj>] [--salida <png>]`. Pinta cada casilla de 8×8 px (césped verde, camino beige, valla marrón, puerta amarilla, tienda roja, flores del jardín en rosa). Con `--antes`, las casillas que son camino ahora y no lo eran antes van en **rojo**. Por defecto `--salida` es `docs/superpowers/mockups/2026-11-01-caminos-nuevos.png` (relativa a la raíz del repo). Usa `pngjs` y lee el `.tmj` con `JSON.parse`; no depende del repo privado.

- [ ] **Step 4: Sacar la vista previa**

Run (en `game/`):
```bash
git show HEAD:game/public/assets/maps/zoo.tmj > "$TMP/zoo-antes.tmj"
node scripts/map-preview.ts --antes "$TMP/zoo-antes.tmj"
```
(`$TMP` = la carpeta de borradores de la sesión.) Expected: escribe el PNG.

- [ ] **Step 5: Commit**

```bash
git add game/scripts/make-zoo-map.mjs game/public/assets/maps/zoo.tmj game/scripts/map-preview.ts game/package.json game/tests/unit/zoomap.test.ts docs/superpowers/mockups/2026-11-01-caminos-nuevos.png
git commit -m "feat(juego): seis atajos y jardín de flores en la U"
```

- [ ] **Step 6: Visto bueno de David (parada)**

Enseñarle el PNG (abrirlo con la herramienta de archivos). Preguntar si los seis atajos coinciden con su plano y si alguno pisa un hueco de las tiendas de su hermano; decirle que el estanque y las ovejas se han movido para que quepa el camino 5. Si pide cambios, se ajustan las coordenadas, se regenera, se vuelve a sacar la vista previa y se le enseña otra vez. Las tareas 2, 3 y 4 no dependen de esto y pueden avanzar mientras.

---

### Task 2: Los visitantes se reparten (y usan la U)

**Files:**
- Modify: `game/src/core/wander.ts`, `game/src/world/VisitorCrowd.ts`
- Test: `game/tests/unit/wander.test.ts`

**Interfaces:**
- Produces:
  - `pickQuietGoal(tiles: readonly Point[], people: readonly Point[], rng: Rng, samples = 4, radius = 6): Point | undefined` — saca `samples` casillas al azar y se queda con la que tiene menos personas a `radius` casillas o menos (distancia de Chebyshov); a igualdad, la primera sacada.
  - `planWander(grid, from, tiles, rng, attempts = 5, people: readonly Point[] = [])` — si `people` no está vacío, cada intento usa `pickQuietGoal` en vez de `pickRandom`.

- [ ] **Step 1: Pruebas**

```ts
describe('pickQuietGoal', () => {
  it('de las casillas sacadas, elige la que tiene menos gente cerca', () => {
    const crowded = { x: 0, y: 0 };
    const quiet = { x: 20, y: 0 };
    const people = [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }];
    const rng = sequence([0, 0.99]); // saca primero crowded y luego quiet
    expect(pickQuietGoal([crowded, quiet], people, rng, 2)).toEqual(quiet);
  });
  it('sin casillas, undefined', () => {
    expect(pickQuietGoal([], [], Math.random)).toBeUndefined();
  });
  it('sin gente, se queda con la primera sacada', () => {
    expect(pickQuietGoal([{ x: 3, y: 3 }, { x: 9, y: 9 }], [], sequence([0.99, 0]), 2)).toEqual({ x: 9, y: 9 });
  });
});
```
(`sequence(values)` = helper local que devuelve los valores en orden y luego repite el último.)

- [ ] **Step 2: Implementar `pickQuietGoal` y el parámetro `people` de `planWander`**

- [ ] **Step 3: `VisitorCrowd.plan` pasa la gente**

En `plan(visitor)`, la llamada a `planWander` recibe como `people` las casillas (`worldToTile`) de los demás visitantes (sin él mismo). Nada más cambia: los atajos entran solos porque `walkableTiles(paths)` ya los incluye.

- [ ] **Step 4: Commit** — `feat(juego): los visitantes van a donde hay menos gente`

---

### Task 3: Precios nuevos y Jose, la cría de panda

**Files:**
- Modify: `game/src/data/pens.ts`, `game/art/art.config.json`, `game/scripts/art/source.ts`, `game/scripts/art/looks.ts`, `game/src/data/strings/*.ts` (11), `game/src/core/eventCatalog.ts` (solo el comentario de `coinsBucket`)
- Test: `game/tests/unit/pens.test.ts`, `shopEntries.test.ts`, `book.test.ts`, `economy.test.ts`, `pngTools.test.ts`, `game/tests/e2e/zoo-grande.spec.ts`

**Interfaces:**
- Produces:
  - `PENS.panda.residents` = `mochi`, `pompon`, `jose` (aspecto `panda-jose`). Página del libro `jose` (sale sola de `penPages`).
  - `LookSource.retouchOverride?: boolean` — si es `true`, `edits` y `shrink` se aplican también encima del dibujo terminado.
  - `retouch(png: PNG, look: Pick<LookSource, 'edits' | 'shrink'>): PNG` exportada en `scripts/art/looks.ts` (aplica `editSheet` y luego `shrinkFrames`); `buildLook` la usa en los dos caminos.

`panda.png` (dibujo de los niños) tiene fotogramas de **32×32**, no de 16. La spec dice «13 píxeles, como Pipa» pensando en 16 px: Pipa queda al 81 % de su especie. Para Jose se usa **`shrink: 20`** (≈ 62 %: claramente cría, pero se le ve la cara). David lo confirma en el paso 6.

```json
"panda-jose": {
  "zip": "wild", "file": "16x16/Default format/$bear_polar.png", "override": "panda.png", "retouchOverride": true, "shrink": 20,
  "edits": [{ "swap": { "414040": "9a9a9a", "3e3a42": "8f8c94", "322f37": "7f7c85", "38343c": "86838b" } }]
}
```
(Las cuatro manchas negras del dibujo pasan a gris; el contorno y los ojos, `26232a` y `1e1c22`, no se tocan.)

- [ ] **Step 1: Pruebas que cambian**
  - `pens.test.ts`: costes `[undefined, undefined, 50, 100, 120, 120, 400, 600, 900, 1300, 1600]`; residentes 45 → **46**; nueva: `expect(PENS.panda.residents.map((r) => r.id)).toEqual(['mochi', 'pompon', 'jose'])` y `expect(PENS.panda.residents[2]!.look).toBe('panda-jose')`.
  - `book.test.ts`: páginas de contenido 49 → **50**.
  - `shopEntries.test.ts`: `'estanque:120', 'ovejas:120'`; donde un panda «completo» era `panda: 2`, pasa a `panda: 3`.
  - `economy.test.ts`: la tabla de `adReward` con los costes reales (el estanque da 12).
  - `pngTools.test.ts` (o `looks.test.ts` nuevo): `retouch` con una hoja 3×4 de un color: tras `swap` el color cambia y tras `shrink` el fotograma queda apoyado abajo y centrado (mismo criterio que las pruebas de `shrinkFrames`).
  - `zoo-grande.spec.ts`: «200 − 150 del estanque + 3 del pato» → 120, y el número esperado de monedas.
  - Buscar `150` y `250` en `game/src`, `game/tests` y el README por si algo más depende de esos precios.

- [ ] **Step 2: Cambiar `pens.ts`** (costes y `residents: [...residents('panda', 'mochi', 'pompon'), one('jose', 'panda', 'jose')]`).

- [ ] **Step 3: `retouchOverride` y `retouch` en `source.ts`/`looks.ts`; entrada `panda-jose` en `art.config.json`.**

- [ ] **Step 4: Comentario de `coinsBucket`**: los tramos no cambian (cambiarlos rompería la serie de Matomo); se anota que los recintos de 120 caen en `50-149`.

- [ ] **Step 5: Textos de la página de Jose en los 11 idiomas**: `book.page.jose.title` y `book.page.jose.text`.
  - es: `'Jose, el panda bebé'` / `'Jose es la cría de los pandas. ¡Todavía tiene las manchas grises!'`
  - en: `'Jose, the baby panda'` / `"Jose is the pandas' baby. His patches are still grey!"`
  - El resto, traducidos con el mismo sentido y «Jose» sin tocar.

- [ ] **Step 6: Ver a Jose y visto bueno de David**

Run (en `game/`): `npm run art:import` y `npm run art:preview -- panda-jose`. Enseñarle la vista ampliada (queda en el repo privado, `art-work/plantillas/`). Si la ve grande o pequeña, se ajusta `shrink`; si las manchas no se ven grises, los colores del `swap`.

- [ ] **Step 7: Commit** — `feat(juego): Jose, la cría de panda, y estanque y ovejas a 120`

---

### Punto de control A (David)

Tras las tareas 1–3. Dar a David, en PowerShell, uno por bloque:

```powershell
cd C:\Projects\games\zooesponji\game
```
```powershell
npm run typecheck
```
```powershell
npm test
```
Resultado esperado: `typecheck` sin errores; Vitest todo en verde (decirle el total esperado: los de antes más los nuevos de estas tareas). Si algo falla, arreglarlo antes de la tarea 4.

---

### Task 4: Guardado — Luna, aviso del tutorial, visitas a la tienda y libro abierto

**Files:**
- Modify: `game/src/core/save.ts`, `game/src/core/economy.ts` (solo el tipo y el estado inicial), `game/src/systems/session.ts`
- Test: `game/tests/unit/save.test.ts`, `game/tests/unit/session.test.ts`

**Interfaces:**
- Produces:
  - `GameState.luna: boolean` (en `initialState()` y en `defaultSave()`: `false`). Todos los literales de `GameState` del código y de las pruebas (`grep -rn "shopUnlocked:"`) ganan `luna: false`.
  - `BookProgress.opened: boolean`.
  - `SaveData.tutorial: { offered: boolean }` y `SaveData.shop: { visits: number }`.
  - `Session.tutorial` y `Session.shop` (getters), `Session.markTutorialOffered(): Promise<void>`, `Session.countShopVisit(): Promise<void>` (cambia `data` antes del `await`, así quien lo llame lee ya la visita contada), `Session.markBookOpened(): Promise<void>`. Las tres guardan y no hacen nada si ya estaba hecho (como `markBookHinted`).

Reglas de `parseSave` para lo que falta:
- `luna`: `state.luna === true`.
- `book.opened`: `raw.opened === true || seen.length > 0` (`book.page` no sirve: se pone sola al comprar).
- `shop.visits`: entero ≥ 0; si no, 0.
- `tutorial.offered`: si hay objeto `tutorial`, `tutorial.offered === true`; si no lo hay (partida de antes), `state.shopUnlocked` — quien ya ha abierto la tienda sabe jugar y no ve el aviso.
- `migrateLegacy`: `luna: false`, `tutorial.offered: shopUnlocked`, `shop.visits: 0`, `book.opened: false`.

- [ ] **Step 1: Pruebas en `save.test.ts`**
  - `defaultSave()` trae `luna: false`, `tutorial: { offered: false }`, `shop: { visits: 0 }`, `book.opened: false`.
  - ida y vuelta (`parseSave(JSON.parse(JSON.stringify(data)))`) conserva `luna: true`, `offered: true`, `visits: 4`, `opened: true`.
  - partida v2 de antes, sin los campos nuevos y con `shopUnlocked: true` y `book.seen: ['cover']` → `luna: false`, `offered: true`, `visits: 0`, `opened: true`.
  - igual con `shopUnlocked: false` y `seen: []` → `offered: false`, `opened: false`.
  - partida v1 (`unlocked`) → carga y `offered` sale de `shopUnlocked`.
  - `shop.visits: -1`, `2.5` o `'3'` → 0.
- [ ] **Step 2: Pruebas en `session.test.ts`**: `countShopVisit` dos veces → `shop.visits === 2` y lo guardado también; `markTutorialOffered`/`markBookOpened` dejan el valor guardado y la segunda llamada no escribe.
- [ ] **Step 3: Implementar** `save.ts`, `economy.ts` y `session.ts`.
- [ ] **Step 4: Commit** — `feat(juego): el guardado recuerda a Luna, el tutorial, las visitas a la tienda y el libro`

---

### Task 5: Luna en la tienda (compra y peana)

**Files:**
- Modify: `game/src/data/shop.ts`, `game/src/core/economy.ts`, `game/src/core/shopEntries.ts`, `game/src/systems/session.ts`, `game/src/systems/events.ts`, `game/src/systems/analyticsEvents.ts`, `game/src/scenes/ShopScene.ts`, `game/src/data/strings/*.ts`
- Test: `game/tests/unit/economy.test.ts`, `shopEntries.test.ts`, `analyticsEvents.test.ts`, `session.test.ts`

**Interfaces:**
- Consumes: `GameState.luna` (tarea 4); `petPortrait` (tarea 6; hasta entonces, en la peana sale el emoji 🐕 con `addEmoji`).
- Produces:
  - `LUNA_ITEM_ID = 'luna'` y `LUNA_COST = 67` en `data/shop.ts`.
  - `purchase(state, 'luna')`: errores `shop-locked`, `already-owned` (si `state.luna`), `not-enough-coins`; si va bien, `{ ...state, coins: coins - 67, luna: true }`.
  - `StockId = PenId | typeof LUNA_ITEM_ID`; `shopStock(state): StockId[]`; `shopEntries(state, stock?: readonly StockId[])`; `ShopSceneData.stock?: StockId[]`.
  - `ShopEntry` pasa a unión:
    ```ts
    interface EntryBase { id: string; look: string; cost: number; status: ShopEntryStatus }
    export type ShopEntry =
      | (EntryBase & { kind: 'pen' | 'extra'; penId: PenId; species: AnimalId; count?: number; max?: number })
      | (EntryBase & { kind: 'pet' });
    ```
    La de Luna: `{ id: 'luna', kind: 'pet', look: 'luna', cost: 67, status: state.luna ? 'owned' : 'buy' }`.
  - `shopStock`: Luna entra con los demás «se puede comprar» ordenados por precio; ya comprada **no** rellena huecos (va con la cuidadora, no en una peana con AGOTADO).
  - Evento `'pet-bought': { petId: 'luna'; cost: number }`, que emite `Session.buy` al comprar Luna (y no emite `purchase`).
  - Matomo: `pet-bought` → `send('tienda', 'compra', part('mascota', 'luna'), cost)` y `step('primera-compra')`. El catálogo no cambia.
  - Texto `shop.about.luna` (lo dice el tendero al acercarse), con el nombre traducido:

| Idioma | Nombre | `shop.about.luna` |
|---|---|---|
| es | Luna | `'¡Luna quiere pasear contigo por el zoo!'` |
| en | Moon | `'Moon wants to walk around the zoo with you!'` |
| fr | Lune | traducido con «Lune» |
| it | Luna | traducido con «Luna» |
| pt-BR / pt-PT | Luna | traducido con «Luna» |
| ru | Луна | traducido con «Луна» |
| ar | قمر | traducido con «قمر» |
| hi | चंदा | traducido con «चंदा» |
| zh | 月亮 | traducido con «月亮» |
| ja | ツキ | traducido con «ツキ» |

  David revisa los nombres en el punto de control B.

- [ ] **Step 1: Pruebas**
  - economy: tienda cerrada → `shop-locked`; 66 monedas → `not-enough-coins`; 67 → `ok`, `coins 0`, `luna true`; otra vez → `already-owned`.
  - shopEntries: estado con 70 monedas y nada comprado → `shopStock` incluye `'luna'` en su sitio por precio (entre `pantera:50` y `panda:100`); con `luna: true` no sale, ni siquiera cuando sobran peanas; `shopEntries` da la entrada `kind: 'pet'`.
  - session: `buy('luna')` emite `pet-bought` con `cost 67` y no emite `purchase`.
  - analyticsEvents: `pet-bought` → `'tienda | compra | mascota/luna'` con valor 67.
- [ ] **Step 2: Implementar datos, economía, `shopEntries`, `Session.buy`, evento y analítica.**
- [ ] **Step 3: `ShopScene`**: `addProduct` dibuja `petPortrait` (o el emoji) si `entry.kind === 'pet'` y `animalPortrait(this, entry.species, …)` si no; `updateReach` usa `'shop.about.luna'` para la mascota; el resto (precio, bocadillo de compra, lluvia de monedas, `hintTarget`) no cambia. `onBuy` funciona igual: tras comprar, `renderProducts()` deja la peana con lo que diga `shopEntries` (Luna ya no está porque se compró dentro de esta visita: se queda con su sello de comprada hasta salir, como los recintos).
- [ ] **Step 4: Textos `shop.about.luna` en los 11 idiomas.**
- [ ] **Step 5: Commit** — `feat(juego): Luna se compra en la tienda por 67 monedas`

---

### Task 6: Arte de Luna

**Files:**
- Create: `game/scripts/make-luna.ts`, `game/art/luna.png`, script `"make:luna": "node scripts/make-luna.ts"`
- Modify: `game/art/art.config.json` (`"pets": { "luna": { "file": "luna.png" } }`), `game/scripts/art/source.ts` (tipo `pets?`), `game/scripts/import-art.ts`, `game/src/art/manifest.ts`, `game/src/art/art.ts`, `game/src/world/Actors.ts`
- Test: `game/tests/unit/lunaArt.test.ts` (nuevo), `game/tests/unit/manifest.test.ts`

**Interfaces:**
- Produces:
  - `game/art/luna.png`: hoja de **48×64** (3 columnas × 4 filas de 16×16), filas abajo/izquierda/derecha/arriba como `FACING_ROWS`; la columna del medio es la pose quieta.
  - `ArtManifest.pets: Record<string, SheetInfo>` (opcional en manifiestos antiguos: si falta, `{}`).
  - `petKey(id: string): string` = `` `art-pet-${id}` `` en `art.ts`; `queueArt` carga las hojas de `m.pets`; `registerArtAnims` crea sus animaciones con `createWalkAnims`.
  - `createPet(scene, id: string, x: number, y: number): Walker` en `Actors.ts` — `SpriteWalker` con origen `(0.5, 0.75)` si hay hoja; si no, `PlainWalker` con el emoji 🐕 a 12 px.
  - `petPortrait(scene, id: string, x: number, y: number, targetHeight: number)` — como `animalPortrait`: pose quieta de perfil y escala entera; sin arte, 🐕.

Cómo es Luna (de las fotos de David): perrita **negra**; orejas caídas, una algo más levantada; rabo fino hacia arriba; **mancha blanca en el pecho** (el detalle que más importa); algo de blanco en las patas. Paleta: contorno `1c1a1e`, negro `2b2830`, brillo `4a4652`, blanco `f4f3f2`, ojos `0f0e10` con un punto de brillo `ffffff`, nariz `0f0e10`, lengua opcional `e07a7a`. `make-luna.ts` sigue el estilo de `make-calcetin.ts`: las cuatro poses quietas como rejillas de 16 caracteres y los dos pasos de andar derivados de cada una moviendo las patas una casilla (función local). Escribe en `game/art/luna.png` (no en el repo privado) y no la pisa si ya existe salvo con `--force`.

`import-art.ts` copia cada `config.pets[id].file` de `game/art/` a `public/art/pet-<id>.png` y lo apunta en `manifest.pets`.

- [ ] **Step 1: Prueba `lunaArt.test.ts`**: el PNG mide 48×64; cada uno de los 12 fotogramas tiene píxeles opacos; en el fotograma quieto de frente (fila 0, columna 1) hay al menos 3 píxeles `f4f3f2` entre las filas 7 y 12 (la mancha del pecho); la mayoría de los píxeles opacos de la hoja son oscuros (luminancia < 80).
- [ ] **Step 2: `manifest.test.ts`**: un manifiesto sin `pets` sigue siendo válido y da `pets: {}`; uno con `pets.luna` mal formado devuelve `null`.
- [ ] **Step 3: Escribir `make-luna.ts`, generar la hoja** (`npm run make:luna`) **y verla**: `scaleUp(png, 8)` a la carpeta de borradores y enseñársela a David junto a la descripción. Ajustar hasta que dé el visto bueno.
- [ ] **Step 4: Manifiesto, `import-art`, `art.ts` y `Actors.ts`; la peana de la tarea 5 pasa a usar `petPortrait`.**
- [ ] **Step 5: Commit** — `feat(juego): dibujo de Luna, la perrita de la cuidadora`

---

### Task 7: Luna sigue a la cuidadora

**Files:**
- Create: `game/src/core/petFollow.ts`
- Modify: `game/src/scenes/WorldScene.ts`, `game/src/systems/testHooks.ts`
- Test: `game/tests/unit/petFollow.test.ts`, `game/tests/e2e/luna.spec.ts` (nuevo)

**Interfaces:**
- Consumes: `createPet` (tarea 6), `GameState.luna`.
- Produces (en `petFollow.ts`):
  ```ts
  /** Rastro (px) que Luna deja entre ella y la cuidadora. */
  export const PET_GAP = 20;
  /** Algo más rápida que la cuidadora (64 px/s): si se queda atrás, alcanza. */
  export const PET_SPEED = 80;
  /** Más lejos que esto (el mundo se ha vuelto a montar), aparece junto a la cuidadora. */
  export const PET_SNAP = 160;
  /** Apunta la posición de la cuidadora si se ha movido al menos 4 px y está en un camino (no dentro de un recinto). Como mucho 256 puntos: se tiran los más viejos. */
  export function recordTrail(trail: readonly Vec[], keeper: Vec, onPath: boolean): Vec[];
  /** Luna avanza por el rastro hasta quedarse a PET_GAP del final. */
  export function followTrail(pet: Vec, trail: readonly Vec[], deltaMs: number): { pos: Vec; trail: Vec[]; moving: boolean };
  ```
  Algoritmo de `followTrail`: si el rastro está vacío, no se mueve. Si la recta de Luna al último punto mide más de `PET_SNAP`, salta al punto del rastro que queda a `PET_GAP` del final y el rastro se recorta desde ahí. Si no: lo que falta = distancia de Luna al primer punto + la suma de los tramos hasta el final; si es ≤ `PET_GAP`, se queda quieta; si no, avanza hacia el primer punto `min(PET_SPEED·dt, falta − PET_GAP)`, quitando del rastro los puntos que alcanza.
- Produces (en `WorldScene`): `petPosition(): Vec | null` (para pruebas). Test API: `petPosition(): Vec | null`.

- [ ] **Step 1: Pruebas `petFollow.test.ts`**
  - rastro en L de 100 px y Luna al principio: tras muchos pasos de 16 ms queda quieta a `PET_GAP` (±1 px) del final, medido por el rastro, y nunca se sale de la L.
  - `recordTrail` con `onPath: false` devuelve el mismo rastro: con la cuidadora dentro de un recinto, Luna se para a `PET_GAP` del último punto de camino (la puerta).
  - `recordTrail` ignora movimientos de menos de 4 px y no pasa de 256 puntos.
  - Luna a 300 px del final → salta y queda a `PET_GAP` del final.
- [ ] **Step 2: Implementar `petFollow.ts`.**
- [ ] **Step 3: `WorldScene`**
  - Campos `pet: Walker | null` y `petTrail: Vec[]`. `syncPet()`: si `state.luna` y no hay `pet`, `createPet(this, 'luna', keeper.x, keeper.y)` y rastro vacío. Se llama al final de `create()` y en `refresh()` (así aparece al salir de la tienda tras comprarla).
  - En `update`, tras `moveKeeper`: `petTrail = recordTrail(petTrail, keeperPos, isWalkable(this.pathGrid, keeperTile.x, keeperTile.y))`; `followTrail`; si se mueve, `pet.moveTo`; si no, `pet.face(facingFromDelta(keeper − pet))`.
  - Luna no entra en la tienda (es otra escena): espera fuera y, al salir, sigue.
- [ ] **Step 4: e2e `luna.spec.ts`** (con `/?sin-tutorial`): sin Luna, `petPosition()` es `null`; `addCoins(200)`, `buy('luna')` (la API ya llama a `refresh()`) → `petPosition()` existe y está a menos de 40 px de la cuidadora; se manda a la cuidadora a una casilla lejana con `goToTile` → al llegar, Luna está a menos de 40 px; `buy('pantera')`, `feedResident('noche')` y al estar la cuidadora dentro (`keeperInPen('pantera')`), Luna no está dentro del recinto.
- [ ] **Step 5: Commit** — `feat(juego): Luna sigue a la cuidadora por el parque`

---

### Task 8: El libro a la vista desde la 3.ª visita

**Files:**
- Modify: `game/src/core/book.ts`, `game/src/scenes/ShopScene.ts`, `game/src/scenes/BookScene.ts`, `game/src/systems/testHooks.ts`
- Test: `game/tests/unit/book.test.ts`, `game/tests/e2e/shop.spec.ts`

**Interfaces:**
- Consumes: `Session.countShopVisit`, `Session.shop.visits`, `Session.markBookOpened`, `Session.book.opened` (tarea 4).
- Produces:
  - `BOOK_NOTICE_VISITS = 3` y `showBookNotice(visits: number, opened: boolean): boolean` (= `visits >= 3 && !opened`) en `core/book.ts`.
  - `ShopScene.bookNotice(): boolean`; Test API `shopBookNotice(): boolean`.

- [ ] **Step 1: Pruebas unitarias**: `showBookNotice(2, false)` falso; `(3, false)` verdadero; `(10, true)` falso.
- [ ] **Step 2: `ShopScene`**
  - En `create()`, antes de `addBook()`: `if (!this.restored) void getSession().countShopVisit();` (al girar el móvil no se cuenta otra vez).
  - Campo `notice`, decidido en `addBook()` con `showBookNotice`. Con aviso: el 📕 se ve siempre en `home` (encima de `bookShelf`) y parpadea (`alpha` 1 → 0.35, `yoyo`, `repeat: -1`, 450 ms, más un leve vaivén de escala); `updateBook` no hace nada; `twinkle` no echa destellos; tocar el libro o la estantería lo abre; `bookScreenPos()` da la posición del libro.
  - Al reanudarse la tienda (evento `RESUME`), si había aviso y `book.opened` ya es verdadero: se para el parpadeo, se esconde el libro y vuelve el comportamiento de siempre.
- [ ] **Step 3: `BookScene.create()` llama a `void getSession().markBookOpened()`** (cubre la estantería y `openBook` de las pruebas).
- [ ] **Step 4: e2e en `shop.spec.ts`**: con la tienda abierta, entrar y salir dos veces → `shopBookNotice()` falso; tercera entrada → verdadero y `shopBookPos()` no es null aunque la cuidadora esté en la puerta; girar (cambiar el tamaño de la ventana) dentro de la tienda no suma visita; tocar el libro, cerrarlo → `shopBookNotice()` falso; cuarta entrada → falso.
- [ ] **Step 5: Commit** — `feat(juego): el libro se ve parpadeando en la tienda hasta que se abre`

---

### Punto de control B (David)

Tras las tareas 4–8. Comandos (uno por bloque):

```powershell
cd C:\Projects\games\zooesponji\game
```
```powershell
npm run typecheck
```
```powershell
npm test
```
```powershell
npx playwright test tests/e2e/shop.spec.ts tests/e2e/luna.spec.ts tests/e2e/zoo-grande.spec.ts
```
Resultado esperado: todo en verde (dar los totales). Aprovechar para que David revise los nombres de Luna de la tabla de la tarea 5 y, si quiere, lo vea en el juego con `npm run dev` comprando a Luna.

---

### Task 9: Tutorial — la lógica de los pasos

**Files:**
- Create: `game/src/core/tutorial.ts`
- Test: `game/tests/unit/tutorial.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const TUTORIAL_STEPS = ['move', 'tap-animal', 'drag-food', 'coins', 'shop'] as const;
  export type TutorialStep = (typeof TUTORIAL_STEPS)[number];
  export type TutorialEvent =
    | { type: 'moved' } | { type: 'feed-opened' } | { type: 'feed-closed' }
    | { type: 'fed'; coins: number } | { type: 'coins-shown' } | { type: 'shop-opened' };
  /** Px que tiene que andar la cuidadora para dar por aprendido el paso de moverse. */
  export const MOVE_DISTANCE = 48;
  /** Lo que la mano señala el contador tras ganar monedas. */
  export const COINS_SHOW_MS = 2500;
  export function advance(step: TutorialStep, event: TutorialEvent): TutorialStep | 'done';
  /** El paso de la tienda espera a tener las monedas que la abren; los demás, siempre. */
  export function handVisible(step: TutorialStep, coins: number): boolean;
  /** Comida de la bandeja que el animal se come (la primera que no rechaza): la que arrastra la mano. */
  export function goodFood(species: AnimalId): FoodId;
  ```
  Transiciones: `move`+`moved` → `tap-animal`; `move`+`feed-opened` → `drag-food` (ya se movió y tocó); `tap-animal`+`feed-opened` → `drag-food`; `drag-food`+`fed` con `coins > 0` → `coins`; `drag-food`+`feed-closed` → `tap-animal`; `coins`+`coins-shown` → `shop`; `shop`+`shop-opened` → `'done'`; cualquier otra combinación deja el paso igual.

- [ ] **Step 1: Pruebas**: una por transición de la lista; `fed` con `coins: 0` deja `drag-food`; `handVisible('shop', 19)` falso y `(…, 20)` verdadero; `handVisible('move', 0)` verdadero; `goodFood('leon')` es `carne`; para toda especie de `ANIMAL_IDS`, la reacción a `goodFood` no es `rechaza`.
- [ ] **Step 2: Implementar.**
- [ ] **Step 3: Commit** — `feat(juego): pasos del tutorial`

---

### Task 10: Tutorial — aviso de la primera vez y botón del menú

**Files:**
- Create: `game/src/scenes/TutorialOfferScene.ts`
- Modify: `game/src/scenes/WorldScene.ts`, `game/src/scenes/SettingsScene.ts`, `game/src/core/hud.ts`, `game/src/systems/platform.ts`, `game/src/main.ts` (registrar la escena), `game/src/data/strings/*.ts`, `game/src/systems/testHooks.ts`, todos los `tests/e2e/*.spec.ts`
- Test: `game/tests/unit/hud.test.ts`, `back.test.ts` si aplica, `game/tests/e2e/tutorial.spec.ts` (nuevo)

**Interfaces:**
- Consumes: `Session.tutorial.offered`, `Session.markTutorialOffered` (tarea 4). La escena `Tutorial` de la tarea 11 (hasta entonces, «Aprender» solo cierra el aviso).
- Produces:
  - Escena `'TutorialOffer'`, hecha como `PollNoticeScene`: velo, panel, dibujo grande (👆 sobre un animalito 🐾) y dos botones con `addPillButton`: verde `icon: 'play'`, `label: t('tutorial.learn')` y rojo `icon: 'close'`, `label: t('tutorial.skip')`. Los dos llaman a `markTutorialOffered()`. «Aprender»: para el aviso, reanuda `World` con `{ from: 'notice' }` y lanza `'Tutorial'`. «Saltar»: para el aviso y reanuda `World`. Métodos `start()`, `skip()`, `learnPos(): Vec | null`, `skipPos(): Vec | null`. Al cambiar de tamaño se vuelve a montar, como el aviso de votar.
  - `WorldScene.maybeTutorialOffer()`: en el mismo `delayedCall` del arranque, **antes** de `maybeNotice`; si `!tutorial.offered`, la escena está activa y no hay otro panel, pausa `World` y lanza `'TutorialOffer'`. No sale si `import.meta.env.DEV && new URLSearchParams(location.search).has('sin-tutorial')`.
  - `hud.ts`: `'TutorialOffer'` en `OVERLAYS`. `platform.ts`: con `'TutorialOffer'` abierto, atrás = «Saltar» (como el aviso de votar).
  - `SettingsScene`: `ButtonKey` gana `'learn'` (`{ color: 'green', icon: 'play' }`), primero en la fila: `['learn', 'privacy', 'quit']` en la app y `['learn', 'privacy']` en la web. `press('learn')`: si `'Tutorial'` está activa la para, la lanza y cierra el menú.
  - Textos en los 11 idiomas: `tutorial.learn` (es `'Aprender'`, en `'Learn'`), `tutorial.skip` (es `'Saltar'`, en `'Skip'`), `settings.learn` (es `'Aprender'`, en `'Learn to play'`).
  - Test API: `tutorialOfferPos(which: 'learn' | 'skip'): Vec | null`, `openTutorial(): void`.
  - Todos los `page.goto('/')` de los e2e que ya existen pasan a `page.goto('/?sin-tutorial')` (`grep -rn "goto('/')" tests/e2e`).

- [ ] **Step 1: Pruebas** — `hud.test.ts`: con `'TutorialOffer'` activa el engranaje no se ve. `tutorial.spec.ts`: partida nueva sin `?sin-tutorial` → al llegar al mapa sale `TutorialOffer`; tocar «Saltar» → se cierra, no sale el aviso de votación ni el panel de anuncio a la vez, y al recargar la página no vuelve a salir. Otra partida nueva: cambiar el tamaño de la ventana con el aviso abierto → sigue abierto y sus botones funcionan. Partida con la tienda ya abierta guardada → no sale.
- [ ] **Step 2: Escena, enganche en `WorldScene`, `hud`, `platform`, `Settings`, textos y API de pruebas.**
- [ ] **Step 3: Cambiar los `goto` de los e2e existentes.**
- [ ] **Step 4: Commit** — `feat(juego): aviso para aprender a jugar y botón Aprender en el menú`

---

### Task 11: Tutorial — la mano que enseña

**Files:**
- Create: `game/src/scenes/TutorialScene.ts`
- Modify: `game/src/scenes/WorldScene.ts`, `game/src/scenes/HudScene.ts`, `game/src/main.ts`, `game/src/systems/testHooks.ts`
- Test: `game/tests/e2e/tutorial.spec.ts`

**Interfaces:**
- Consumes: `advance`, `handVisible`, `goodFood`, `MOVE_DISTANCE`, `COINS_SHOW_MS` (tarea 9); `FeedScene.targetsOnScreen()`; `WorldScene.keeperPosition()`, `worldToScreen()`, `shopDoorTile()`, `tileToScreen()`; `HUD_COIN` de `ui/widgets.ts`.
- Produces:
  - Escena `'Tutorial'`: capa encima de todo que **no tapa los toques** (solo es interactiva su ✕). Empieza siempre en `move`. Se sube encima de las demás cuando se abre otra (`this.scene.bringToTop()` si no está ya arriba). Al cambiar de tamaño no se reinicia: lee `this.scale` en cada fotograma.
  - `WorldScene.tutorialMoveTarget(): Vec | null` — centro en pantalla de una casilla de camino a 3–5 casillas de la cuidadora (prueba arriba, derecha, izquierda y abajo, en ese orden).
  - `WorldScene.tutorialAnimal(): { residentId: string; screen: Vec } | null` — el residente abierto más cercano a la cuidadora (de `residentsIn` de cada recinto abierto y `pens.positionOf`).
  - `HudScene.gearScreenPos(): Vec`.
  - `WorldScene.offerAd()` y `maybeNotice()` no hacen nada mientras `'Tutorial'` o `'TutorialOffer'` estén activas.
  - Test API: `tutorialStep(): string | null` (null si no está en marcha) y `tutorialHand(): Vec | null` (dónde está la mano, si se ve).

Qué hace la mano (👆 con `addEmoji`, ~48 px, sombra) en cada paso; si el sitio queda fuera de la pantalla, la mano se pone en el borde (margen 48 px) con una flecha girada hacia él:

| Paso | Escena que tiene que estar activa | Gesto | Avanza con |
|---|---|---|---|
| `move` | `World` | toque (baja, se encoge, sube) con un anillo que se abre, en `tutorialMoveTarget()`; además, junto al engranaje, el icono `joystick` con una flecha hacia `gearScreenPos()` | la cuidadora a `MOVE_DISTANCE` px de donde empezó el paso → `moved` |
| `tap-animal` | `World` | toque sobre `tutorialAnimal().screen` | bus `feed-opened` |
| `drag-food` | `Feed` | va a la comida `goodFood(especie)` de `targetsOnScreen().foods`, la «coge» y la arrastra hasta `targetsOnScreen().animal` en 900 ms; repite mientras no se dé de comer (también si solo se toca el icono) | bus `animal-fed` → `fed`; `feed-closed` → `feed-closed` |
| `coins` | cualquiera | señala el contador `HUD_COIN` (las monedas ya vuelan solas desde la ventana de comer) | `COINS_SHOW_MS` después → `coins-shown` |
| `shop` | `World` | toque sobre la puerta de la tienda; escondida mientras `handVisible` sea falso (menos de 20 monedas: se juega libre) | bus `shop-opened` → fin |

Con la escena que toca en pausa o sin abrir (por ejemplo, el menú abierto), la mano se esconde y el paso se mantiene. ✕ (`addCloseBadge`, arriba en el centro): para el tutorial; no vuelve a salir solo (ya está `offered`). Al terminar o cerrar, la escena se para y quita sus escuchas del bus. Abierto desde el menú con la partida avanzada, hace los mismos pasos sobre la partida real, sin dar ni quitar monedas.

- [ ] **Step 1: e2e en `tutorial.spec.ts`**
  - partida nueva → «Aprender» → `tutorialStep()` es `move` y `tutorialHand()` no es null; tocar el suelo a unas casillas → pasa a `tap-animal`.
  - `feedResident` del animal que da `tutorialAnimal` → `drag-food`; la mano está cerca de la comida buena; cerrar la comida → vuelve a `tap-animal`; volver a abrirla y arrastrar `goodFood` hasta el animal → `coins`; ~3 s después → `shop`.
  - con menos de 20 monedas, en `shop` la mano no se ve; `addCoins` hasta 20 → se ve; `openShop` → `tutorialStep()` null.
  - mientras el tutorial está en marcha, al volver de la comida no se abre el panel del anuncio (con `startAds` de la API de pruebas, como en `ads.spec.ts`).
  - cambiar el tamaño de la ventana en `drag-food` → sigue en `drag-food`.
  - ✕ a medias → `tutorialStep()` null y al recargar no sale el aviso.
  - desde el menú: abrir Ajustes, tocar «Aprender» → `tutorialStep()` es `move` y las monedas no cambian.
- [ ] **Step 2: Implementar `TutorialScene`, los métodos de `WorldScene`/`HudScene`, el bloqueo de paneles y la API de pruebas.**
- [ ] **Step 3: Verlo funcionar** en el panel del navegador con `npm run dev` (preview), partida nueva sin `?sin-tutorial`, a tamaño de móvil (`resize_window` móvil) y de escritorio: captura de cada paso para enseñársela a David.
- [ ] **Step 4: Commit** — `feat(juego): tutorial con una mano que enseña a jugar sin leer`

---

### Punto de control C (David)

Comandos (uno por bloque):

```powershell
cd C:\Projects\games\zooesponji\game
```
```powershell
npm run typecheck
```
```powershell
npm test
```
```powershell
npm run test:e2e
```
Resultado esperado: todo en verde (dar los totales: los e2e de antes más `luna.spec.ts` y `tutorial.spec.ts`). Pedirle también que pruebe el tutorial en el móvil o en `npm run dev` como lo haría un niño.

---

### Task 12: Documentación y notas de versión

**Files:**
- Modify: `README.md` (raíz), `game/README.md`, `docs/superpowers/specs/2026-11-01-luna-jose-caminos-tutorial-design.md` (estado «implementada, pendiente de fusionar», sección «Estado de implementación» y «Decisiones tomadas durante la implementación»: estanque y ovejas movidos, `shrink` 20 de Jose, nombres de Luna, Luna no entra en la tienda, tramos de Matomo sin cambiar), este plan (casillas marcadas).
- Create (cuando David valide el texto y se sepa la versión): `game/store/notas-version-<versión>.txt` con los 13 idiomas.

- [ ] **Step 1: README, spec y plan al día.**
- [ ] **Step 2: Borrador de las notas de Play en español, en el chat**, para que David lo valide (caminos nuevos, Luna, Jose, tutorial, libro, precios). No se traducen ni se escriben en archivo hasta su visto bueno.
- [ ] **Step 3: Commit** — `docs: caminos, Luna, Jose, tutorial y libro en README, spec y plan`
- [ ] **Step 4: Avisar a David** de que la rama está lista para su prueba en el móvil y de que la versión (vc 12 u otra, según R8) se decide al fusionar.
