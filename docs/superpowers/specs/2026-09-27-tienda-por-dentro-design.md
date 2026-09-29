# Tienda por dentro (fase C) — diseño

Fecha: 2026-09-27 · Estado: implementado (fase C, 2026-09-27)

Cambios respecto a este diseño, decididos al probarlo en el navegador:
- La alfombra se dibuja por código (óvalo rojo con borde dorado): la del pack parecía un marco gris.
- El tendero se pinta ×1,6 respecto al mobiliario para que se vea bien tras el mostrador.
- Los productos se reparten a lo largo del arco de peanas y quedan centrados (con 4 caen entre peanas).
- Carteles cortos para que no se pisen: `🪙 N`, `✅` (ya es tuyo) o `✔️` (completo); el `➕n/max`
  de los extras va en una chapita encima del animal.
- La campanita es CC0 como el resto del audio.
- Tras la primera prueba de David: alfombra coral con huellas, banderines, cartel de madera
  colgado, luz cálida, flores, corazones que salen de los animales y un solo candelabro.
  La puerta del puesto en el zoo ocupa las 2 casillas del camino (`doorWidth`, `isShopDoor`).
- Bocadillos del tendero un 10 % más largos para que dé tiempo a leerlos: saludo 2,64 s,
  "¡Gracias!" y "¡Te faltan monedas!" 1,98 s.
- Recinto del panda: bambú del pack Monocots (`ReShade/16x16/tree_bamboo_new_A_3/5/7`) en los
  lados y abajo; arriba tapaba el camino y el cartel, y en el centro escondía al panda.

## Objetivo

Al entrar en la tienda se ve **la tienda por dentro**, en pixel art con el pack
VectoRaith *Interior Tileset Pack – Essentials* (repo privado), con el tendero
atendiendo detrás del mostrador y los animales a la venta expuestos en peanas.
Entrada con encanto (fundido, campanita, el tendero saluda) y compra tocando
el animal. Todo lo actual sigue igual: economía, guardado, extras, ajustes,
ESC/cerrar, giro del móvil y modo sin arte.

Fase B (más adelante, spec aparte): el cuidador entra andando en ese mismo
interior y compra acercándose. Esta fase deja el mapa listo para eso.

## Decisiones tomadas

- Estilo: **pixel art con los packs** (coherente con el cuidador y los animales).
- Construcción: **mapa de Tiled `tienda.tmj`**, generado por script como `zoo.tmj`.
- Experiencia: **fase C** = interior fijo con entrada animada + escaparate táctil.

## Qué no cambia

- `getSession().buy()`, `shopEntries()`, precios, extras (`count/max`), `SHOP_UNLOCK_COINS`.
- Flujo World → Shop: `WorldScene.openShop()` pausa el mundo y lanza `'Shop'`;
  al cerrar se reanuda `'World'`.
- API de pruebas de `ShopScene`: `cardScreenPos(itemId)` y `cardStatus(itemId)`
  (ahora apuntan a la peana del producto). Las e2e existentes siguen valiendo.
- Cerrar: botón ✕ (`addCloseButton`), ESC y botón atrás de Android.
- `restartOnResize` (giro del móvil sin recargar).

## Piezas

### 1. Mapa lógico `public/assets/maps/tienda.tmj` (script `make-shop-map.mjs`)

Mismo patrón que `make-zoo-map.mjs`: gids lógicos, el arte lo pone el juego.
Tamaño 20×12 tiles de 16 px (320×192, apaisado).

- Capa de tiles con tipos: `SUELO`, `PARED`, `VENTANA`, `MOSTRADOR`, `ESTANTERIA`, `PUERTA`.
  Pared de fondo en las 3 filas de arriba con 2 ventanas y estanterías; mostrador
  a la izquierda; puerta abajo en el centro.
- Capa de objetos (tipo = `class`):
  - `tendero` (punto): detrás del mostrador.
  - `peana` ×5 (punto, propiedad `orden` 0–4): en arco en el centro-derecha.
    Hay 5 porque `shopEntries` da como mucho 5 productos.
  - `puertaInterior` (punto): donde aparecerá el cuidador en la fase B.
  - `deco` (punto, propiedad `pieza`): planta, barril, cesta de fruta, alfombra,
    farolillo, cuadro, reloj…
  - `luz` (rectángulo): haz de luz de cada ventana.
- Lectura con funciones nuevas en `core/tiledmap.ts`: `readInteriorSpots(map)`
  → `{ tendero, peanas[], puerta, decos[], luces[] }`. `buildWalkGrid` ya sirve
  (suelo transitable; pared, mostrador, estanterías y peanas no).

### 2. Arte: importación (`scripts/import-art.ts` + `scripts/art/source.ts`)

- Nueva entrada `interior` en la config: recortes del atlas de 16×16 (Classic),
  igual que `props`: suelo de madera, pared con zócalo, ventana, estanterías
  llenas, mostrador, peana (mesita), planta, barril, cesta de fruta, alfombra,
  farolillo, cuadro, reloj.
- Salida: `public/art/interior-<pieza>.png` y la clave `interior` en `manifest.json`.
  `parseManifest` la trata como **opcional**: un manifiesto sin `interior`
  sigue siendo válido y la tienda usa el modo provisional.
- Las coordenadas exactas de cada recorte se fijan al implementar con `art:grid`
  sobre el atlas.

### 3. Pintar el interior: `world/ShopInterior.ts` (nuevo)

Recibe la escena y el mapa, y dibuja suelo, paredes, muebles y decos
(profundidad con `depthForY`). Escala entera máxima que quepa en pantalla,
centrado, `pixelArt` nítido. Devuelve las posiciones en pantalla de tendero,
peanas y puerta.

- **Con arte:** tiles e imágenes del manifiesto.
- **Sin arte (repo público):** rectángulos de colores (suelo madera claro,
  pared verde, mostrador marrón) y emojis de deco. Mismo layout.
- Ambiente: farolillos con parpadeo suave (tween de alfa), haces de luz
  semitransparentes en las ventanas y motas de polvo (partículas lentas y pocas).
  Se desactiva si en el futuro hay ajuste de "reducir movimiento" (hoy no existe).

### 4. `ShopScene` reescrita (misma clave `'Shop'`)

- Fondo: el interior en vez del panel naranja. Título "Tienda del zoo" en un
  cartel de madera arriba.
- **Tendero:** sprite `shopkeeper` (animación idle) en el punto `tendero`,
  escalado igual que el interior. Sin arte: 🧑‍🌾.
- **Productos:** una peana por entrada de `shopEntries`, en orden. Sobre ella,
  `animalPortrait` animado; delante, un cartelito con el precio `🪙 N`,
  `✅` si ya es tuyo o `✔️` si está completo. Los extras llevan `➕` y `n/max`.
  Si no alcanzan las monedas, el cartel va en gris (como ahora). Zona táctil
  generosa (peana + animal) para dedos de niño.
- **Entrada (fase C):** fundido desde negro (300 ms) + sonido de campanita
  (`sfx 'campanita'`, nuevo, CC0; si falta se usa `tap`) + el tendero da un
  saltito y muestra un bocadillo "¡Hola! ¿Qué animal quieres hoy?" (2 s).
  Tocar en cualquier sitio salta la animación. Los productos se pueden comprar
  desde el primer momento.
- **Comprar:** igual que ahora (`buy`). Si sale bien: `sfx buy`, el animal da un
  salto, lluvia corta de monedas y bocadillo del tendero "¡Gracias!". Después se
  rehacen las peanas (comprar un recinto puede hacer aparecer su extra).
- **Sin monedas:** `sfx rechaza`, la peana tiembla y el tendero dice
  "¡Te faltan monedas!".
- **Salir:** ✕, ESC, atrás de Android o tocar la puerta. Fundido a negro corto
  y se reanuda el mundo.

### 5. Textos (`data/strings.ts`)

`shop.hello`, `shop.thanks`, `shop.needCoins`.

### 6. Carga

`PreloadScene` carga `tienda.tmj` (con `withVersion`) y las piezas `interior`
del manifiesto si están.

## Errores y casos límite

- Falta `tienda.tmj` o le faltan peanas: la tienda se pinta con un layout de
  reserva (peanas en fila) y avisa en consola. No se rompe la compra.
- Hay más entradas que peanas: las sobrantes se colocan en fila delante del
  mostrador. Hoy no puede pasar (máximo 5).
- Pantallas muy bajas: la escala entera mínima es 1; si no cabe, escala
  fraccionaria (se ve un poco menos nítido, pero se ve entero).

## Pruebas

- **Unit:** `readInteriorSpots` con un mapa mínimo; `tienda.tmj` generado tiene
  5 peanas, tendero, puerta y el suelo transitable conectado de la puerta al
  mostrador (preparado para la fase B); `parseManifest` acepta un manifiesto con
  y sin `interior`.
- **E2E (Playwright):** las pruebas actuales de la tienda siguen pasando (abrir,
  comprar, sin monedas, cerrar); nueva prueba: la entrada se salta tocando y el
  bocadillo aparece; salir por la puerta reanuda el mundo.
- **Manual:** captura en escritorio y en móvil apaisado, con y sin arte.

## Fuera de alcance (fase B y más)

- Cuidador andando dentro de la tienda (fase B, spec propio, reutiliza `tienda.tmj`).
- Vender comida, juguetes o accesorios (hoy la tienda solo vende animales).
- Música propia de la tienda.
