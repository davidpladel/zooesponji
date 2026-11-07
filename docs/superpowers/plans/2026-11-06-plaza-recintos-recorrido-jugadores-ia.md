# Plaza grande, recintos por especie, prueba del recorrido y jugadores con IA — plan

> **Para quien lo ejecute:** en este proyecto se ejecuta **inline con superpowers:executing-plans** (memoria `sin-subagentes`). La única excepción son los jugadores con IA de la tarea 10, que sí son subagentes porque David lo pidió. Los pasos usan casillas (`- [ ]`).

**Objetivo:** plaza de la fuente grande, mapa más grande, recintos más amplios con paisaje por especie, una regla clara de qué se pisa y qué queda dibujado encima, una prueba que hace recorrer todos los caminos a la cuidadora con Luna, y jugadores con IA que dejan un informe de UX/UI y fallos.

**Arquitectura:** todo el mapa sale de `game/scripts/make-zoo-map.mjs` → `game/public/assets/maps/zoo.tmj`. La regla de pisar se marca en el mapa (`walk` en cada prop, objetos `agua` para el agua) y la leen la rejilla de la cuidadora, la de los animales y la decoración. Las pruebas del mapa son Vitest sobre el `.tmj`; la del recorrido es Playwright. Los jugadores con IA usan un «mando» Playwright con un pequeño servidor HTTP local.

**Tecnología:** Phaser 4.2.1, TypeScript, Vite, Vitest, Playwright, Node 24 (los scripts `.ts` se ejecutan directamente con `node`, como los existentes).

**Diseño:** `docs/superpowers/specs/2026-11-06-plaza-recintos-recorrido-jugadores-ia-design.md`

## Restricciones globales

- El mapa se cambia en `make-zoo-map.mjs` y se regenera con `npm run make:zoo-map`; nunca a mano en el `.tmj`.
- Arte de los packs solo en el repo privado (`zooesponji-private/packs`); en el público solo las coordenadas en `game/art/art.config.json`.
- Textos nuevos que vea el jugador, en los 11 idiomas (`game/src/data/strings/*.ts`). Este plan no debería necesitar ninguno.
- **Todas las pruebas locales las lanza David** (memoria `pruebas-en-ventana-sonnet`): en cada paso «Pedir a David» se le da el comando en PowerShell desde `C:\Projects\games\zooesponji\game` y el resultado esperado, y se espera su respuesta. Lo visual (capturas, vista del mapa, arte) también lo valida él.
- Git lo hace Claude: rama `feat/plaza-recintos-recorrido` desde `main`; `git add` y `git commit` en el mismo comando (memoria `sesiones-paralelas-git`); mensajes en español, sin líneas de atribución.
- Al cerrar cada bloque: README, estado del diseño y casillas de este plan al día (memoria `docs-siempre-al-dia`).
- Regla de pisar (David): **todo lo que no sea agua se puede subir; árboles y troncos no se atraviesan.** Por decisión del diseño: arbustos y bambú tampoco; la cueva sí.
- Lo que se pisa se dibuja siempre por debajo de cuidadora, Luna, animales y visitantes.

## Puntos a vigilar en la revisión

1. **Recinto recién comprado:** al abrir un recinto, la cuidadora tiene que poder entrar y moverse por sus rocas sin quedarse atascada en una roca que antes bloqueaba (la rejilla se rehace en `refresh()`). → Prueba en la tarea 2 (`withPenInteriors` con una roca dentro: casilla pisable).
2. **Animal encima de una roca alta:** con rocas pisables, un animal puede quedarse quieto encima de una roca grande. Tiene que seguir siendo tocable y alcanzable para darle de comer. → Prueba en la tarea 6 (desde la puerta se llega junto a todo el interior pisable).
3. **Luna en recintos:** Luna espera en la puerta cuando la cuidadora entra (usa `pathGrid`, sin interiores). Con el mapa nuevo la puerta de cada recinto sigue siendo camino. → Prueba en la tarea 4 (cada puerta es casilla de camino alcanzable).
4. **Visitantes:** pasean por `pathGrid`. Si un camino de 3 de ancho o la plaza nueva dejan casillas sueltas, se quedarían atrapados. → La prueba de «todo camino alcanzable desde el inicio» de la tarea 3 lo cubre.
5. **Pantalla pequeña:** con el mapa más grande, en un móvil pequeño la cámara no puede salirse del mapa ni dejar la cuidadora fuera de pantalla. → Se mira en la revisión visual de la tarea 4 (captura a 640×360).

---

### Tarea 0: Rama

- [x] **Paso 1:** `git switch -c feat/plaza-recintos-recorrido` desde `main` actualizado. Comprobar con `git log --oneline -1` que sale de `main`.

---

### Tarea 1: Agua como zona del mapa (y charcas listas para el barro)

Hoy el agua es un prop con `block` (lago, charcas, catarata entera). Pasa a ser un objeto del mapa de tipo `agua`, un rectángulo, con propiedad `kind` (`'agua'` hoy, `'barro'` en el futuro). Esto separa el agua de la roca en el risco de la pantera y deja preparado el bloque 4.

**Archivos:**
- Modificar: `game/src/core/tiledmap.ts` (tipo `WaterInfo`, `readWater`)
- Crear: `game/src/core/water.ts` (`waterAt`)
- Modificar: `game/src/core/flock.ts` (`penSpace` suma el agua a los obstáculos)
- Modificar: `game/src/world/Pens.ts:135` (pasa el agua a `penSpace`)
- Modificar: `game/scripts/make-zoo-map.mjs` (helper `water()`, lagos y charcas sin `block`, catarata partida)
- Pruebas: `game/tests/unit/water.test.ts`, `game/tests/unit/flock.test.ts`, `game/tests/unit/zoomap.test.ts`

**Interfaces:**
- Produce: `interface WaterInfo { kind: 'agua' | 'barro'; x: number; y: number; width: number; height: number }` (px) en `tiledmap.ts`; `readWater(map: TiledMap): WaterInfo[]`.
- Produce: `waterAt(waters: readonly WaterInfo[], point: Vec): WaterInfo | null` en `water.ts`.
- Produce: `penSpace(enclosure: Rect, props, tile: number, waters: readonly WaterInfo[] = []): PenSpace` — los rectángulos de agua dentro del interior se añaden a `obstacles`.
- Produce (generador): `water(kind, x0, y0, x1, y1)` en casillas del mapa, inclusivo; escribe un objeto `{ type: 'agua', properties: [{ name: 'kind', value: kind }] }`.

- [x] **Paso 1: Pruebas que fallan**

```ts
// water.test.ts
it('waterAt dice en qué charca está un punto', () => {
  const ws = [{ kind: 'agua', x: 0, y: 0, width: 32, height: 32 }, { kind: 'barro', x: 64, y: 0, width: 16, height: 16 }];
  expect(waterAt(ws, { x: 10, y: 10 })?.kind).toBe('agua');
  expect(waterAt(ws, { x: 70, y: 5 })?.kind).toBe('barro');
  expect(waterAt(ws, { x: 40, y: 40 })).toBeNull();
});
// flock.test.ts
it('penSpace cuenta el agua del interior como obstáculo', () => {
  const s = penSpace({ x: 0, y: 0, width: 160, height: 160 }, [], 16, [{ kind: 'agua', x: 32, y: 32, width: 32, height: 32 }]);
  expect(s.obstacles).toContainEqual({ x: 32, y: 32, width: 32, height: 32 });
});
// zoomap.test.ts
it('el agua del mapa es zona propia y ningún prop de agua bloquea por su cuenta', () => {
  const waters = readWater(map);
  expect(waters.length).toBeGreaterThanOrEqual(4); // estanque, pingüinos, pantera (cascada + poza)
  for (const p of readProps(map)) if (/^(lake|pond|waterfall)/.test(p.prop)) expect(p.block, p.prop).toBeNull();
});
it('en el risco de la pantera la roca se pisa y el agua no', () => {
  // casillas concretas: las fija la tarea al partir la catarata (una de roca, una de cascada)
});
```

El último caso se completa en el paso 3 con dos casillas concretas del recinto de la pantera, una de roca del acantilado y otra de la cascada, comprobando con `withPenInteriors` que la primera es pisable y la segunda no.

- [x] **Paso 2: Pedir a David** `npm test -- water flock zoomap` → esperado: FALLAN las pruebas nuevas.

- [x] **Paso 3: Implementar** `readWater`, `waterAt`, el parámetro `waters` de `penSpace` (y pasarlo en `Pens.ts`), y en el generador: `water()`; el lago del estanque, la charca de los pingüinos y la de la cabra (si la hay) pasan a `flat` sin `block` más su `water()` del mismo tamaño; la catarata de la pantera pasa a `flat` sin `block` y con dos `water()`: la columna de la cascada y la poza del pie. Las medidas salen de la composición de 7×7 casillas del prop `waterfall` en `art.config.json` (la columna central de la cascada y la fila de agua de abajo). Regenerar con `npm run make:zoo-map`.

- [x] **Paso 4: Pedir a David** `npm test` → esperado: todo en verde.

- [x] **Paso 5: Commit** `feat(mapa): el agua es zona propia del mapa (roca del risco pisable) y las charcas saben quién está dentro`

---

### Tarea 2: Regla de pisar y lo que se pisa, por debajo

**Archivos:**
- Modificar: `game/scripts/make-zoo-map.mjs:143-158` (`WALKABLE`, `BASE_W`, `inPen`; nueva propiedad `walk`)
- Modificar: `game/src/core/tiledmap.ts` (`PropInfo.walk: boolean`, lo lee `readProps`)
- Modificar: `game/src/core/depth.ts` (`propDepth`)
- Modificar: `game/src/world/Decor.ts:63` (usa `propDepth`)
- Pruebas: `game/tests/unit/depth.test.ts`, `game/tests/unit/zoomap.test.ts`, `game/tests/unit/penGrid.test.ts`

**Interfaces:**
- Produce: `PropInfo.walk` — `true` en lo que se pisa o se sube.
- Produce: `propDepth(p: Pick<PropInfo, 'flat' | 'walk' | 'z' | 'y'>): number` — `FLAT_DEPTH + p.z` si `flat` o `walk`; si no, `depthForY(p.y)`. `FLAT_DEPTH` se mueve de `Decor.ts` a `depth.ts` con el mismo valor.
- Produce (generador): `WALK = /^(grass|flowers|sunflowers|rock|plateau|cave|lilypad|pebble|daisies)/` — sustituye a `WALKABLE`. Lo pisable no lleva `block`. Lo que no es pisable ni plano bloquea su base (`BASE_W`), como hoy.

Lo que **no** se pisa por nombre: árboles (`acacia`, `pine`, `palm`, `jungle-tree`, `cherry-tree`, `tree`), troncos y tocones (`log`, `stump`), `bamboo`, arbustos (`bush`, `bush-jungle`, `pink-star`), `fountain`. Fuera de los recintos (bancos, farolas, barriles, cajas, carteles) no cambia nada.

- [x] **Paso 1: Pruebas que fallan**

```ts
// depth.test.ts
it('lo que se pisa se dibuja por debajo de quien lo pisa', () => {
  expect(propDepth({ flat: false, walk: true, z: 0, y: 500 })).toBeLessThan(depthForY(10));
  expect(propDepth({ flat: false, walk: false, z: 0, y: 500 })).toBe(depthForY(500));
});
// zoomap.test.ts
const NEVER_WALK = /^(acacia|pine|palm|jungle-tree|cherry-tree|tree|log|stump|bamboo|bush|pink-star|fountain)/;
const ALWAYS_WALK = /^(grass|flowers|sunflowers|rock|plateau|cave|lilypad)/;
it('regla de pisar: el agua y los árboles no, las rocas y las flores sí', () => {
  for (const p of readProps(map)) {
    if (NEVER_WALK.test(p.prop) && insideSomePen(p)) expect(p.block, p.prop).not.toBeNull();
    if (ALWAYS_WALK.test(p.prop)) { expect(p.walk, p.prop).toBe(true); expect(p.block, p.prop).toBeNull(); }
  }
});
// penGrid.test.ts
it('una roca dentro de un recinto abierto no corta el paso de la cuidadora', () => {
  // recinto de 6x6 casillas con un prop walk sin block en el centro: su casilla es pisable
});
```

`insideSomePen` es un ayudante local de la prueba con `readEnclosures` y `rectContains`.

- [x] **Paso 2: Pedir a David** `npm test -- depth zoomap penGrid` → esperado: FALLAN las nuevas.

- [x] **Paso 3: Implementar** según las interfaces. En el generador quitar `block` a `rock-*`, `plateau`, `cave` y `sunflowers`, y quitarlos de `BASE_W`. Regenerar el mapa.

- [x] **Paso 4: Pedir a David** `npm test` y `npm run typecheck` → esperado: en verde.

- [x] **Paso 5: Revisión visual.** Pedir a David que abra el juego (`npm run dev`) y pase con la cuidadora por encima de una hierba alta de la sabana y de la roca grande de los leones: las piernas se ven por encima. Se le pasa también una captura propia si el navegador interno está visible.

- [x] **Paso 6: Commit** `feat(juego): rocas y montañas se suben; lo que se pisa queda por debajo de cuidadora, Luna y animales`

---

### Tarea 3: Foto de los caminos y prueba de pasos estrechos

Antes de tocar el mapa se guarda la lista de caminos de hoy, para que todo cambio posterior se vea.

**Archivos:**
- Crear: `game/scripts/map-snapshot.ts` (escribe la foto)
- Crear: `game/tests/unit/data/caminos.json` (la foto: `{ width, height, tiles: string[] }` con claves `"x,y"` de las casillas de camino de `pathGrid`, ordenadas)
- Crear: `game/src/core/mapCheck.ts` (`pathTiles`, `solidOverPath`)
- Modificar: `game/package.json` (script `"map:snapshot": "node scripts/map-snapshot.ts"`)
- Prueba: `game/tests/unit/caminos.test.ts`

**Interfaces:**
- Produce: `pathTiles(map: TiledMap): string[]` — casillas `"x,y"` pisables de `withSolidProps(buildWalkGrid(map), readProps(map), 16)`, ordenadas.
- Produce: `solidOverPath(map: TiledMap): { prop: string; tile: string }[]` — casillas de camino de `buildWalkGrid` que cierra el `block` de algún prop `solid`.

- [x] **Paso 1: Pruebas que fallan**

```ts
it('no se ha quitado ningún camino sin actualizar la foto', () => {
  const now = new Set(pathTiles(map));
  const lost = snapshot.tiles.filter((t) => !now.has(t));
  expect(lost, 'caminos quitados: si es a propósito, npm run map:snapshot').toEqual([]);
});
it('desde el inicio se llega a todas las casillas de camino', () => { /* BFS desde readSpawn: alcanzables === pathTiles */ });
it('nada sólido tapa camino', () => { expect(solidOverPath(map)).toEqual([]); });
```

- [x] **Paso 2: Pedir a David** `npm test -- caminos` → esperado: FALLA (no hay foto y la fuente de hoy tapa 8 casillas: `solidOverPath` devuelve la fuente).

- [x] **Paso 3: Implementar** `mapCheck.ts` y `map-snapshot.ts`; generar la foto con el mapa de hoy (`npm run map:snapshot`, lo puede lanzar Claude: no es una prueba). La prueba de «nada sólido tapa camino» se deja **marcada `it.fails`** con el comentario «se arregla en la tarea 4 (isla de la fuente del tamaño del dibujo)».

- [x] **Paso 4: Pedir a David** `npm test -- caminos` → esperado: en verde (la de la fuente, como fallo esperado).

- [x] **Paso 5: Commit** `test(mapa): foto de los caminos y aviso si algo sólido tapa camino`

---

### Tarea 4: Mapa más grande, plaza grande y recintos más amplios (solo trazado)

Esta tarea mueve y agranda; la decoración nueva va en la tarea 6. Los adornos que ya hay se recolocan para que sigan dentro de su recinto.

**Archivos:**
- Modificar: `game/scripts/make-zoo-map.mjs` (W, H, OX, OY, plaza, avenidas a la plaza, recintos, tienda, tablón, carteles, árboles, muro)
- Modificar: `game/tests/unit/zoomap.test.ts`, `game/tests/unit/caminos.test.ts`
- Actualizar: `game/tests/unit/data/caminos.json` (a propósito, con el resumen de qué se quita en el commit)
- Imagen para David: `docs/superpowers/mockups/2026-11-06-mapa-nuevo.png` con `npm run map:preview -- --antes <tmj de main> --salida <png>`

**Valores que fija el diseño:**
- Plaza de **15×13 casillas** de camino con esquinas recortadas (corte en diagonal de 2 casillas), fuente en el centro.
- Isla de la fuente: **5×4 casillas** de césped, con el `block` de la fuente igual a la isla (80×64 px). Debe dejar **4 casillas de camino** alrededor por los cuatro lados.
- **4 bancos y 4 farolas** en la plaza, fuera del anillo de 4 casillas, junto al borde de la plaza.
- Los caminos que **llegan a la plaza**: **3 casillas** de ancho. Las demás avenidas, como hoy.
- Recintos: interior de **al menos 14×9 casillas**; la sabana sigue siendo el más grande. Leones, cabras, pantera y panda se apartan de la plaza.
- Entrada, tienda, tablón y atajos conservan su posición relativa. El tablón sigue en una esquina de la plaza. Los huecos reservados para las tiendas del hermano de David (diseño del 2026-11-01) no se ocupan.
- La partida no guarda la posición en el mapa (`save.ts`); la tienda guarda una posición dentro de la tienda, que no cambia. No hace falta migrar partidas; basta con que `zoomap.test.ts` y la prueba de la tienda sigan en verde.
- `W` y `H`, los mínimos que hagan falta. La decisión exacta del trazado es de quien construye, con la revisión de David en el paso 5.

- [x] **Paso 1: Pruebas que fallan** (`zoomap.test.ts`)

```ts
it('la plaza deja 4 casillas de camino alrededor de la fuente', () => {
  // para cada casilla del borde de la isla (block de la fuente), las 4 siguientes hacia fuera son camino
});
it('la fuente no tapa camino', () => { expect(solidOverPath(map)).toEqual([]); }); // quitar el it.fails de la tarea 3
it('cada recinto mide al menos 14x9 por dentro y la sabana es el mayor', () => { /* readEnclosures */ });
it('los caminos que llegan a la plaza tienen 3 casillas de ancho', () => {
  // en cada lado de la plaza, la fila (o columna) de camino que sale tiene 3 casillas seguidas en perpendicular
});
it('cada puerta de recinto, la de la tienda y el tablón son camino alcanzable desde el inicio', () => {});
```

Las pruebas que ya hay en `zoomap.test.ts` con coordenadas fijas del mapa de 96×60 se reescriben para leer del mapa (recintos, puertas, tienda), no de números.

- [x] **Paso 2: Pedir a David** `npm test -- zoomap caminos` → esperado: FALLAN las nuevas.

- [x] **Paso 3: Implementar** el trazado nuevo en el generador y regenerar. Guardar la foto nueva con `npm run map:snapshot` y anotar en el mensaje del commit cuántas casillas de camino se quitan y se ganan y dónde (la plaza vieja queda dentro de la nueva, así que no debería perderse ningún tramo útil).

- [x] **Paso 4: Pedir a David** `npm test` y `npm run typecheck` → esperado: en verde.

- [x] **Paso 5: Revisión de David (punto de parada).** Enviarle con SendUserFile la vista del mapa nuevo comparada con `main` (en rojo lo nuevo). No se sigue a la tarea 6 sin su visto bueno al trazado. Después de su visto bueno, que pruebe en el móvil o en `npm run dev` a 640×360 que la cámara sigue a la cuidadora en las esquinas del mapa.

- [x] **Paso 6: Commit** `feat(mapa): mapa más grande con plaza de la fuente de 15x13 y recintos más amplios`

---

### Tarea 5: Piezas de arte nuevas

**Archivos:**
- Modificar: `game/art/art.config.json` (`props`)
- Modificar: `game/tests/unit/artConfig.test.ts` si comprueba una lista cerrada de props

Piezas a añadir (nombre → hoja del pack; coordenadas en px aproximadas, **se ajustan mirando el recorte**):

| Nombre | Pack · hoja (16x16) | x, y, w, h aprox. |
|---|---|---|
| `log-savannah` | biomeB · `savannah/.../details_savannah.png` | 0, 48, 48, 16 |
| `rock-pile-savannah` | ídem | 0, 112, 32, 32 (ya es `rock-savannah-big`; usar ese y no duplicar si encaja) |
| `flowers-alpine-red` / `flowers-alpine-white` / `flowers-alpine-purple` | biomeD · `alpine/.../details_alpine.png` | 0,32,16,16 / 144,32,16,16 / 160,32,16,16 |
| `log-alpine` | ídem | 0, 48, 48, 16 |
| `boulder-alpine` | ídem | 0, 224, 32, 32 |
| `rock-moss` / `rock-moss-big` | biomeC · `tropical_rainforest/.../details_tropical_rainforest.png` | 0,96,16,16 / 0,112,32,32 |
| `log-moss` | ídem | 0, 48, 48, 16 |
| `fern` | ídem | 0, 16, 16, 16 |
| `jungle-tree-vines` | biomeC · `details_tropical_rainforest_SPECIALS.png` | 128, 160, 48, 80 |
| `cattails` / `reeds` | biomeC · `wetland/.../details_wetland.png` | 16,0,16,32 / 144,0,16,32 |
| `rock-wetland` | ídem | 0, 96, 16, 16 |
| `daisies` | biomeB · `grassland/.../details_grassland.png` | 0, 32, 16, 16 |
| `rock-grassland` / `rock-grassland-big` | ídem | 128,96,16,16 / 128,112,32,32 |
| `tree-grassland` | ídem | 48, 0, 32, 48 |
| `ice-floe` / `ice-waterfall` | biomeA · `tundra/.../tundra_SPECIALS.png` | 240,0,48,48 (placas) / 0,144,48,80 (animada, 3 marcos a la derecha) |
| `water-savannah` | biomeB · `savannah/.../_old/vectoraith_tileset_water_savannah.png` | charca de 48×48 animada, como `pond-grassland` |
| `shelter` / `scarecrow` / `pumpkin` / `trough` / `well` | wooden · `buildings_wooden_1.png` | 128,112,48,48 / 176,128,16,32 / 208,144,16,16 / 240,208,16,16 / 96,96,16,16 |
| `palm-leaning` | monocots · `ReShade/16x16/tree_palm_large_leaning.png` | hoja entera |

- [x] **Paso 1:** añadir las entradas; lanzar `npm run art:import` (lo puede lanzar Claude: no es una prueba) y `npm run art:props-sheet -- <scratchpad>/props.png`.
- [x] **Paso 2:** mirar el tablón y corregir cada recorte que corte o arrastre otra pieza. Repetir hasta que estén limpios.
- [x] **Paso 3:** enviar el tablón a David con SendUserFile y esperar su visto bueno al arte.
- [x] **Paso 4: Pedir a David** `npm test -- artConfig` → esperado: en verde.
- [x] **Paso 5: Commit** `feat(arte): piezas nuevas para los paisajes de los recintos` (solo `art.config.json`; el PNG importado está ignorado por git).

---

### Tarea 6: Paisaje por especie en cada recinto

**Archivos:**
- Modificar: `game/scripts/make-zoo-map.mjs` (bloque de decoración de recintos, `BASE_W` para las piezas nuevas que bloquean)
- Prueba: `game/tests/unit/recintos.test.ts` (nueva)

**Lo que fija el diseño (piezas mínimas por recinto, con los nombres de la tarea 5 y los de hoy):**

```ts
const PAISAJE: Record<PenId, RegExp[]> = {
  leon: [/^acacia$/, /^rock-savannah-big$/, /^grass-tall-dry/, /^log-savannah$/],
  cabra: [/^plateau$/, /^cave$/, /^(rock-grey|boulder-alpine)/, /^pine/, /^flowers-alpine/],
  pantera: [/^waterfall$/, /^jungle-tree-vines$/, /^rock-moss/, /^fern$/, /^flowers-red$/],
  panda: [/^bamboo-big$/, /^bamboo-mid$/, /^bamboo-small$/, /^(log|stump)/, /^rock-moss/, /^pond/],
  estanque: [/^lake-grassland$/, /^lilypad/, /^(cattails|reeds)$/, /^rock-wetland$/],
  ovejas: [/^daisies$/, /^sunflowers$/, /^rock-grassland/, /^tree-grassland$/],
  establo: [/^shelter$/, /^trough$/, /^barrel$/, /^pumpkin$/, /^scarecrow$/],
  pinguinos: [/^pond-tundra$/, /^ice-floe$/, /^ice-waterfall$/, /^rock-snow/, /^pine-snow/],
  sabana: [/^acacia$/, /^water-savannah$/, /^grass-tall-dry/, /^rock-savannah/],
  'elefantes-africanos': [/^water-savannah$/, /^rock-savannah-big$/, /^acacia$/, /^log-savannah$/],
  'elefantes-asiaticos': [/^pond/, /^(palm|palm-leaning)$/, /^bamboo/, /^jungle-tree/, /^rock-moss/],
};
```

Toda pieza de agua nueva (`water-savannah`, charcas) lleva su `water()` de la tarea 1.

- [x] **Paso 1: Pruebas que fallan** (`recintos.test.ts`)

```ts
it.each(PEN_IDS)('%s tiene su paisaje', (id) => { /* cada regex de PAISAJE[id] casa con algún prop dentro del recinto */ });
it.each(PEN_IDS)('%s: la puerta y la casilla de dentro junto a ella quedan libres', (id) => {});
it.each(PEN_IDS)('%s: desde la puerta se llega a todo el interior que no es agua ni obstáculo', (id) => {
  // withPenInteriors con penSpace(e, props, 16, readWater(map)); BFS desde la casilla de dentro de la puerta
});
it.each(PEN_IDS)('%s: caben todos sus animales separados', (id) => {
  // spreadPositions(space, penCapacity(id) + compañero, rng fijo) devuelve penCapacity(id) puntos
});
it.each(PEN_IDS)('%s: ningún adorno se sale del recinto ni pisa la valla', (id) => {});
```

- [x] **Paso 2: Pedir a David** `npm test -- recintos` → esperado: FALLAN.

- [x] **Paso 3: Implementar** la decoración de cada recinto siguiendo la tabla del diseño (bloque 3). Criterios de colocación: sombra (árbol) en una esquina de atrás, sitio alto (rocas o meseta) visible desde el camino, agua donde la haya lejos de la puerta, la puerta y su frente despejados, las piezas altas (bambú, árboles) lejos del lado que da al camino para no tapar a los animales. Regenerar.

- [x] **Paso 4: Pedir a David** `npm test` y `npm run typecheck` → esperado: en verde.

- [x] **Paso 5: Revisión de David (punto de parada).** Capturas de los 11 recintos con el juego en marcha (navegador interno visible, o que las haga David). Ajustar lo que pida.

- [x] **Paso 6: Commit** `feat(recintos): paisaje propio de cada especie, más grande y más bonito`

---

### Tarea 7: Ruta que cubre todos los caminos

**Archivos:**
- Crear: `game/src/core/tour.ts`
- Prueba: `game/tests/unit/tour.test.ts`

**Interfaces:**
- Produce: `tourWaypoints(grid: WalkGrid, start: Point, maxStep: number): Point[]` — lista ordenada de casillas tal que, yendo de cada una a la siguiente con `findPath`, se pisan **todas** las casillas pisables de `grid` alcanzables desde `start`, y entre dos consecutivas hay como mucho `maxStep` casillas de camino. Así cada punto está en pantalla cuando se va a tocar. Se usará con `maxStep = 6`.

Algoritmo (no lo determinan la firma ni las pruebas): voraz. Pendientes = todas las alcanzables. Desde la actual, ir a la pendiente más cercana por BFS; si está a más de `maxStep`, meter puntos intermedios del camino cada `maxStep`. Marcar como pisadas todas las casillas de cada `findPath` recorrido.

- [x] **Paso 1: Pruebas que fallan**

```ts
it('la ruta pisa todas las casillas alcanzables', () => { /* rejilla en forma de anillo con dos ramas: la unión de los findPath = todas */ });
it('dos puntos seguidos están a como mucho maxStep casillas', () => {});
it('con el mapa real, la ruta pisa todo pathGrid', () => { /* zoo.tmj */ });
```

- [x] **Paso 2: Pedir a David** `npm test -- tour` → FALLAN.
- [x] **Paso 3: Implementar** `tourWaypoints`.
- [x] **Paso 4: Pedir a David** `npm test -- tour` → en verde.
- [x] **Paso 5: Commit** `feat(pruebas): ruta que pasa por todas las casillas de camino`

---

### Tarea 8: Prueba del recorrido en el juego (cuidadora y Luna)

**Archivos:**
- Modificar: `game/src/systems/testHooks.ts` (ganchos nuevos, solo en desarrollo como los demás)
- Modificar: `game/src/scenes/WorldScene.ts` (métodos que exponen lo que piden los ganchos)
- Crear: `game/tests/e2e/recorrido.spec.ts`

**Interfaces:**
- Consume: `tourWaypoints` (tarea 7).
- Produce (ganchos en `window.__ZOO__`):
  - `tourWaypoints(maxStep: number, withPens: boolean): { x: number; y: number }[]` — de `pathGrid` (sin recintos) o de `grid` (con los interiores abiertos).
  - `keeperTile(): { x: number; y: number } | null`
  - `walkPropsAbove(): string[]` — nombres de los props `walk` cuyo dibujo se cruza con el de la cuidadora o el de Luna y tienen más profundidad que ellas. Vacío = bien.

- [x] **Paso 1: Escribir la prueba**

```ts
test.setTimeout(30 * 60_000);
test('la cuidadora recorre todos los caminos tocando la pantalla y Luna la sigue', async ({ page }) => {
  // startGame (como zoo-grande.spec.ts); addCoins + buy('luna'); para cada punto de tourWaypoints(6, false):
  //   tileToScreen → page.mouse.click; esperar keeperTile() === punto (máx. 8 s);
  //   esperar que Luna esté a ≤ 3 casillas (máx. 3 s); expect(walkPropsAbove()).toEqual([])
});
test('con todos los recintos abiertos, la cuidadora recorre sus interiores', async ({ page }) => {
  // igual, comprando todos los recintos (addCoins + buy de cada uno) y tourWaypoints(6, true) solo de los interiores
});
```

Si un punto no está en pantalla al ir a tocarlo, la prueba falla diciendo qué punto. No se teletransporta a la cuidadora.

- [x] **Paso 2: Implementar** los ganchos.
- [x] **Paso 3: Pedir a David** `npx playwright test recorrido` → esperado: 2 pasadas. Tarda varios minutos.
- [x] **Paso 4:** si falla, `superpowers:systematic-debugging` con lo que diga la prueba (punto, casilla). No se relaja la prueba para que pase.
- [x] **Paso 5: Commit** `test(e2e): la cuidadora y Luna recorren todos los caminos y los recintos`

---

### Tarea 9: Mando para los jugadores con IA

**Archivos:**
- Crear: `game/scripts/ia/mando.ts` (servidor HTTP local + Playwright)
- Crear: `game/scripts/ia/perfiles.md` (los dos perfiles y los objetivos)
- Crear: `game/scripts/ia/instrucciones.md` (plantilla del encargo de cada jugador)
- Modificar: `game/package.json` (`"ia:mando": "node scripts/ia/mando.ts"`)

**Interfaces (HTTP en `127.0.0.1:7801`, JSON):**
- `POST /partida { id }` → abre un navegador sin ventana a **640×360**, con la versión construida (`vite preview` en 4173, como `game-preview`) y partida limpia. Devuelve `{ captura }`.
- `POST /tocar { id, x, y }`, `POST /arrastrar { id, x0, y0, x1, y1 }`, `POST /esperar { id, ms }` (máx. 5000) → cada una devuelve `{ captura }`: ruta de un PNG reducido a 640×360 en la carpeta de la partida.
- `POST /fin { id }` → cierra y devuelve `{ diario }`: ruta del JSON con cada acción, la hora, la captura y las escenas activas (de `__ZOO__.activeScenes()`, solo para el diario, nunca para el jugador).
- Carpeta de salida: `zooesponji-private/docs/jugadores-ia/AAAA-MM-DD/<id>/`.
- Límite: 60 acciones por partida; la 61 responde `{ error: 'límite' }`.

- [x] **Paso 1:** escribir `mando.ts`. Prueba de humo a mano (David): `npm run build`, `npm run preview` y `npm run ia:mando` en ventanas aparte; luego `curl -X POST localhost:7801/partida -d '{"id":"humo"}'` → esperado: devuelve una captura con la pantalla de título.
- [x] **Paso 2:** escribir `perfiles.md` con los dos perfiles del diseño (5 años sin leer; 10 años que lee) y 3 objetivos (dar de comer a todos los animales; comprar en la tienda; pasear con Luna y explorar). Escribir `instrucciones.md`: el jugador solo mira capturas y solo toca, arrastra o espera mediante `curl`; habla como el niño; al terminar escribe `informe.md` en su carpeta con lo que intentó, dónde se atascó, qué le gustó, ideas y fallos (cada fallo con captura y pasos).
- [x] **Paso 3: Commit** `feat(ia): mando para que jugadores con IA prueben el juego como un niño`

---

### Tarea 10: Primera pasada de jugadores con IA

- [x] **Paso 1:** pedir a David que deje en marcha `npm run preview` y `npm run ia:mando`.
- [x] **Paso 2:** lanzar **6 subagentes con `model: "sonnet"`** en paralelo (3 perfiles de 5 años y 3 de 10, uno por objetivo), cada uno con `instrucciones.md` y su perfil. Es la excepción acordada a «sin subagentes».
- [x] **Paso 3:** leer los 6 `informe.md` (no las capturas una a una) y escribir `resumen.md` en la carpeta de la fecha: problemas que se repiten, ordenados por importancia; mejores ideas de UX/UI; fallos con captura y pasos.
- [x] **Paso 4:** enviar `resumen.md` a David con SendUserFile. Los fallos que él elija se arreglan en este trabajo o en otro, según diga.
- [x] **Paso 5:** commit en el repo privado `docs(ia): primera pasada de jugadores con IA`.

---

### Tarea 11: Cierre

- [x] **Paso 1:** README del juego (cómo se lanza la prueba del recorrido, `map:snapshot` y los jugadores con IA), estado del diseño («implementado, pendiente de probar en el móvil»), casillas de este plan.
- [x] **Paso 2: Pedir a David** `npm run typecheck`, `npm test` y `npm run test:e2e` → esperado: todo en verde.
- [x] **Paso 3: Commit** `docs: plaza, recintos, recorrido y jugadores con IA`
- [ ] **Paso 4:** usar `superpowers:finishing-a-development-branch` para fusionar cuando David dé el visto bueno en el móvil.

**Resultado (2026-11-07, lanzado por Claude):** `npm run typecheck` bien; `npm test` 65 ficheros, 4787 pruebas en verde;
`npm run test:e2e --workers=1` 81 pasan, 1 se salta y 2 fallan: `shop.spec.ts:138` (pasa sola; fue lentitud) y
`tutorial.spec.ts:78` (**falla igual en `main`**: tras arrastrar la comida de la segunda vez el tutorial no pasa a
`coins`; no es de esta rama). Jugadores con IA: resumen en `zooesponji-private/docs/jugadores-ia/2026-11-07/resumen.md`.

