# Tienda por dentro (fase B): el cuidador entra andando — diseño

Fecha: 2026-09-28 · Estado: implementado (2026-09-28)

Cambios respecto a este diseño, decididos al probarlo en el navegador:
- Alcance de peana 32 px (con 26 las peanas que ocupan dos filas quedaban fuera de mano).
- El bocadillo dice "¡Comprar! 🪙 N": el 🛒 no se veía bien en todos los equipos.
- La cuidadora entra desde la calle (aparece bajo la puerta con un fundido, cruza el felpudo)
  y al llegar se vuelve de cara; el paseo de 14 px desde el felpudo casi no se notaba.
- Huellas de la pista más grandes, con un halo claro para verse sobre la madera.
- Si se gira el móvil a mitad de la entrada, reaparece delante de la alfombra.
- Hook de pruebas extra: `shopActiveItem`.
- Tras la prueba de David: alfombra y peanas 24 px más arriba (se ve la entrada) y el punto donde
  se para la cuidadora se elige siempre dentro del alcance de la peana.

## Objetivo

Dentro de la tienda (fase C, `tienda.tmj`) el cuidador **entra andando y compra acercándose**,
como en el zoo al dar de comer. Se mantiene todo lo de la fase C (interior, tendero, peanas,
campanita, carteles, corazones, economía, guardado, ✕/ESC/atrás, giro del móvil, modo sin arte).

## Decisiones tomadas

- Enfoque **A**: posición lógica del cuidador en píxeles del interior (320×192, tiles de 16) y
  dibujado con `toScreen`, reutilizando `buildWalkGrid`, `tryMove`, `findPathOrNearest`,
  `stepAlongPath` y el `SpriteWalker` del cuidador. No se reescribe `ShopInterior`.
- Comprar = **acercarse + bocadillo de compra** (solo compra tocar el bocadillo).
- Salir = **andar hasta el felpudo** (además de ✕, ESC y atrás).
- Extras: animales que reaccionan, tendero atento, entrada con paseo, pista para peques, pasos.

## Recorrido

1. **Entrada:** fundido 300 ms + campanita. El cuidador aparece en `puertaInterior` y anda solo
   hasta delante de la alfombra (`ENTRY_TARGET` = (192, 170)). Suena `paso` suave al andar.
   El tendero mira al cuidador, saluda (👋 + saltito) y dice `shop.hello`.
   Cualquier toque, tecla o joystick corta el paseo (y el saludo) y da el control.
2. **Control:** flechas/WASD, joystick (si está activado en ajustes) y tocar el suelo
   (ruta con pathfinding). Un gesto que se desplaza más de 12 px no es un toque.
3. **Tocar un animal:** el cuidador va al punto de aproximación de su peana (casilla transitable
   más cercana por debajo; si no, cualquier vecina).
4. **Alcance:** si los pies del cuidador están a ≤ 32 px (interior) de la base de una peana, esa
   es la peana activa (la más cercana). Sobre su animal sale el **bocadillo de compra**
   `🪙 N 🛒`: verde si alcanzan las monedas, gris si no. Los ya comprados/completos no tienen
   bocadillo de compra.
5. **Comprar (tocar bocadillo):** como en la fase C: `buy`, `sfx buy`, lluvia de monedas, salto,
   "¡Gracias!" y se rehacen las peanas (y la cuadrícula). Gris: `sfx rechaza`, tiembla,
   "¡Te faltan monedas!".
6. **Salir:** al pisar el felpudo (tile de `puertaInterior` y vecinos de la fila de abajo, zona
   de 32×16 px centrada en la puerta) **después de haberse alejado de él** (flag `armed`).
   Tocar el felpudo lleva al cuidador andando hasta allí. Fundido y `scene.resume('World', { from: 'shop' })`.
7. **Vuelta al zoo:** `WorldScene` coloca al cuidador en la casilla bajo la puerta del puesto
   (si es transitable), mirando hacia abajo; como ya no pisa la puerta, no reentra.

## Piezas

- `core/shopWalk.ts` (puro, con tests):
  - `shopWalkGrid(base: WalkGrid, bases: Point[])` → copia con las casillas de cada peana
    bloqueadas (rectángulo 26×10 px centrado en la base, desplazado 3 px hacia abajo).
  - `productInReach(feet, bases, reach = 32)` → índice o `null`.
  - `approachPoint(grid, base)` → centro de casilla transitable donde pararse.
  - `hintTarget(entries, coins)` → id del más barato comprable, o `'door'`.
  - `onDoorMat(feet, door)` → boolean.
- `world/ShopKeeperWalker.ts`: el cuidador en la tienda (posición lógica, entradas, ruta,
  paseo de entrada, pasos cada ~260 ms andando). `update(delta)`, `goTo(p)`, `feet`, `moving`.
- `world/Shopkeeper.ts`: el tendero sacado de `ShopScene` (respirar, `hop`, `wave`, `say`,
  `lookAt(x)` con frames left/down/right; sin arte solo emoji).
- `world/ShopHint.ts`: rastro de 🐾 del cuidador al objetivo; `show(from, to)`, `hide()`.
- `ShopScene`: coordina; productos, bocadillo de compra, reacciones, pista, salida.
- `world/Actors.ts`: `createKeeper(scene, x, y, opts?: { scale, depthOf })`; `SpriteWalker`
  y `PlainWalker` usan `depthOf` (por defecto `depthForY`).
- `HudScene`: joystick activo si `World` **o** `Shop` están activos.
- `WorldScene`: `onResume(_sys, data)` recoloca al cuidador si `data.from === 'shop'`.
- `make-shop-map.mjs`: plantas de las esquinas (0,11) y (19,11) como mueble.
- `audio.ts`: sonido nuevo `paso` (wav sintetizado con `scripts/make-paso.mjs`, CC0).

## Extras

- **Animales que reaccionan:** al entrar una peana en alcance, su animal se gira hacia el
  cuidador (frame left/right), salta y suelta un 💗 (también los ya comprados).
- **Tendero atento:** mira al cuidador (izquierda/abajo/derecha según x relativa) y al entrar
  en alcance de una peana dice una frase del animal (`shop.about.<id>`), o `shop.owned`
  / `shop.full`; una vez por peana hasta alejarse de ella.
- **Pista para peques:** tras 6 s quieto y sin comprar, rastro de 🐾 hasta el objetivo de
  `hintTarget`; se repite cada 8 s; se esconde al moverse.
- **Pasos:** `paso` a volumen del resto de efectos, solo mientras anda.

## Casos límite

- Sin arte: cuidador placeholder, sin animación, mismo movimiento.
- Sin `tienda.tmj`: cuadrícula abierta 20×12 con la pared (4 filas) bloqueada.
- Giro del móvil (`restartOnResize`): la escena se reinicia con la posición del cuidador y sin
  repetir la entrada (`init` recibe `{ keeper, skipEntry }`).
- Comprar/tiembla con `busy` como ahora; no se compra mientras se cierra.

## Pruebas

- Unit: `shopWalk.ts` entero; `tienda.tmj` conecta la puerta con el punto de aproximación de
  cada peana con la cuadrícula de peanas bloqueadas; plantas bloqueadas.
- E2E: tienda reescrita (tocar pantera → bocadillo → comprar → gracias; panda sin monedas;
  tocar felpudo → sale y el cuidador queda bajo la puerta); pista visible tras esperar.
- Hooks nuevos: `shopKeeperScreenPos`, `shopBuyBubblePos`, `shopHintVisible`.
- Manual: capturas en escritorio y móvil apaisado, con arte.
