# ZooEsponji v3 — Hito 6a: pulido del juego (diseño)

*Fecha: 2026-09-27 · Estado: implementado (plan `docs/superpowers/plans/2026-09-27-v3-hito-6a-pulido.md`); falta la prueba de David en Android*

Spec padre: `docs/superpowers/specs/2026-09-27-motor-phaser-v3-design.md` (leer su sección
"Cómo retomar" antes de empezar). El hito 6 se divide en **6a (este documento, solo código)** y
**6b (publicación: privacidad, ficha de Play, firma, prueba cerrada, web)**, que irá en otra spec.

## Para quien ejecute esta spec

- Trabajas sin la conversación en la que se diseñó: todo lo necesario está aquí. Si algo no
  encaja con el código real, **para y pregunta a David**; no improvises decisiones de diseño.
- Siguiente paso: `superpowers:writing-plans` → plan en `docs/superpowers/plans/` → ejecución.
- Reglas fijas del proyecto (ver también el plan del hito 5):
  - Directorio `game/`, rama `v3-phaser`. `core/` sin Phaser ni DOM. TypeScript estricto.
  - **Ningún archivo de arte de los packs ni derivado en el repo público**, y **nada de los
    packs a herramientas de IA**. Solo se commitea código y configuración (coordenadas).
  - Todo debe funcionar y pasar las pruebas **en modo provisional** (sin `public/art/`, como en
    CI) y en local con arte.
  - Pixel art con escalado entero. Commits con `Co-Authored-By`; nunca `--no-verify`.
  - **Pedir permiso a David antes de descargar nada** (sonidos incluidos).
  - Al cerrar: README raíz, `game/README.md`, "Estado de implementación" de la spec padre,
    casillas del plan, y subir ambos repos.

## Objetivo

Dejar el juego listo para ponerlo en manos de testers en Android: agua animada, recintos con
varios animales que no se pisan ni atraviesan piezas, menú de ajustes con créditos de Daniela y
Adrián, sonido real, y comportamiento correcto en móvil (orientación, botón atrás, segundo
plano, errores).

## Contexto de política (Google Play Families, revisado 27-sep-2026)

El juego no tiene anuncios, compras reales, enlaces externos, chat ni recogida de datos, así que
**no necesita puerta parental**. Consecuencias para el código de 6a:

- No añadir SDKs (analítica, Firebase, crash reporting remoto…). Los errores se quedan en el
  dispositivo.
  (Cambiado el 7-oct-2026: sigue sin SDK, pero hay estadísticas anónimas propias y de los errores sale un
  mensaje corto. Ver `2026-10-07-analitica-anonima-matomo-design.md`.)
- No añadir enlaces que salgan de la app. Si alguna vez se añade uno, irá tras una puerta
  parental (fuera de este hito).
- No añadir permisos de Android más allá de los que ya pone Capacitor; en particular, nunca
  `AD_ID` ni ubicación. El plan incluye comprobar el `AndroidManifest.xml` final.

## 1. Agua animada

**Problema:** la catarata y el estanque de la pantera son imágenes fijas recortadas de
`vectoraith_tileset_full_terrain_alpine_A.png` (Biome Tileset Pack D, ver `art/art.config.json`,
claves `waterfall` y `pond`).

**Solución:** el pack trae el agua animada en formato RPG Maker A1:
`Original/16x16/alpine/tilesets - RPG Maker ready/vectoraith_tileset_terrain_A1_alpine_A.png`
(y variantes `_B`, `_SPECIALS`). En el formato A1 el agua y las cascadas vienen en **3
fotogramas** colocados en horizontal que el motor alterna.

- Primera tarea del plan: **inspeccionar ese PNG** (dimensiones, dónde están los fotogramas de
  cascada y de agua quieta) y anotar las coordenadas en `art.config.json`. Si la estructura no es
  la esperada, parar y enseñar a David lo encontrado.
- `npm run art:import` genera una hoja de fotogramas por pieza (`waterfall`, `pond`), montando
  cada fotograma con el mismo tamaño que la pieza fija actual (autotile A1 → imagen compuesta).
- El manifiesto indica que esas piezas son animadas (nº de fotogramas y fps ≈ 4). `Decor`
  crea un sprite con animación en bucle en vez de una imagen.
- Sin arte (modo provisional): nada cambia.
- Aceptación: en el navegador con arte, la catarata cae y el estanque ondula; la profundidad
  (`flat`, `z`) y los nenúfares por encima siguen igual.

## 2. Colisiones de la decoración en recintos

**Problema:** en `scripts/make-zoo-map.mjs` varias piezas con volumen no tienen `block`
(`rock-grey`, `rock-grey-big`, `pine-small`, `rock-savannah`, `rock-savannah-big`,
`jungle-tree`, `bush-jungle`…). El animal las atraviesa y, como la profundidad va por Y, parece
que pasa "por debajo" (visto con la cabra y la roca).

**Solución:**
- Regla: **dentro de un recinto, toda pieza no plana bloquea**, salvo una lista explícita de
  piezas pisables (hierba y flores: `grass-tall-dry*`, `flowers*`). Las planas (`flat`: meseta,
  agua, nenúfares) siguen su configuración actual (el agua bloquea; la meseta y los nenúfares no).
- Tamaño del bloqueo: la base de la pieza (ancho de la pieza × ~1 casilla de alto), definido en
  el script del mapa como las que ya lo tienen.
- Test unitario sobre el mapa generado: toda pieza no plana dentro de un recinto y no incluida en
  la lista de pisables tiene `blocks = true`. Se mantiene el test existente de "lo que bloquea ≤
  1/3 del interior".

## 3. Animales extra en la tienda

| Recinto | Máximo en el recinto | Primer animal | Cada extra |
|---|---|---|---|
| 🦁 León | 1 (+ leona acompañante, como ahora) | precio actual | — |
| 🐐 Cabra | 5 | precio actual | 10 🪙 |
| 🐆 Pantera | 2 | precio actual | 20 🪙 |
| 🐼 Panda | 2 | precio actual | 20 🪙 |

- Datos en `data/animals.ts` (o `data/shop.ts`): `maxCount` y `extraCost` por animal. Añadir un
  animal nuevo sigue siendo solo datos.
- **Guardado:** `unlocked: AnimalId[]` pasa a `counts: Record<AnimalId, number>` (0 = cerrado).
  Migración en `core/save.ts`: cada id de `unlocked` → 1. Subir la versión del guardado. Test de
  migración con un guardado antiguo real.
- **Tienda:** para cada recinto abierto con `count < maxCount` aparece "Otra cabra · 10🪙"
  (icono del animal + ➕). Al llegar al máximo, el artículo se ve como "completo" (atenuado con ✔️)
  y no se puede comprar. Con el recinto cerrado, el artículo extra no aparece. Textos en
  `data/strings.ts`.
- `core/economy.ts`: `buyExtra(state, id)` con las reglas (recinto abierto, bajo el máximo,
  monedas suficientes). Tests.
- Al comprar: el nuevo animal aparece en la puerta del recinto con el efecto de desbloqueo
  actual y se une al paseo.
- **Dar de comer:** sigue siendo por recinto (un bocadillo por puerta). Al dar comida, todos los
  animales del recinto muestran la reacción. Las monedas que se ganan no cambian.
- Los extras usan el mismo sprite y tamaño que el primero (pantera y panda: los de Daniela y
  Adrián).

## 4. Que los animales no se pisen

- `Pens` pasa de "animal + acompañante opcional" a una lista de `Wanderer` por recinto
  (`count` animales + la leona en el león). Posiciones iniciales repartidas sin solaparse.
- Nueva lógica pura en `core/` (p. ej. ampliar `core/obstacles.ts` o un `core/flock.ts`):
  - `pickWanderTarget` recibe además los puntos ocupados (posición y destino de los demás) y
    descarta destinos a menos de `MIN_GAP` (≈ 14 px) de ellos.
  - En cada paso, si el siguiente punto queda a menos de `MIN_GAP` de otro animal, el animal se
    detiene, descansa un poco y elige otro destino.
- Tests: con 5 cabras en el recinto de la cabra y un rng fijo, tras N pasos simulados ningún par
  está a menos de `MIN_GAP` y ninguno pisa un obstáculo.
- Sin arte (modo provisional), los animales extra se balancean como ahora, repartidos en el
  recinto sin solaparse.

## 5. Menú ⚙️ y créditos

- Botón ⚙️ en el HUD (esquina inferior izquierda —arriba tapaba la ✖ de las ventanas—, tamaño táctil ≥ 48 px). Se abre con un toque, **sin puerta
  parental**. Pausa el mundo mientras está abierto.
- Contenido: tres interruptores grandes con icono — 🎵 música, 🔊 sonido, 🕹️ joystick — que
  usan `settings` del guardado (ya existe). El botón 🕹️ suelto del HUD desaparece.
- **Créditos** (lo tenía la versión vieja en el pie de `index.html`), al pie del menú:
  "Hecho con cariño por Daniela y Adrián 💛" y "Panda y pantera pintados por Daniela y
  Adrián". En modo arte, junto al texto, los sprites del panda y la pantera de los niños.
- La pantalla de título también muestra, pequeño, "Hecho por Daniela y Adrián 💛".
- Cerrar: botón ✖ grande, tocar fuera o botón atrás.

## 6. Sonido real

Sustituye los tonos de Web Audio de `systems/audio.ts` por samples, y añade música.

- **Fuente:** packs CC0 de Kenney (p. ej. "Interface Sounds", "Impact Sounds", "Music Jingles")
  o equivalentes CC0. **Antes de descargar, pedir permiso a David** indicando nombre, URL,
  tamaño y licencia. Los CC0 sí pueden ir al repo público (`game/public/audio/`), con un
  `CREDITS.md` que diga origen y licencia.
- Sonidos a cubrir (los `SoundId` actuales): `come`, `rechaza`, `especial`, `coin`, `buy`,
  `unlock`, `tap`. Añadir uno de pasos suave opcional (no obligatorio).
- **Música:** un bucle alegre y tranquilo para el mundo, a volumen bajo. Se para con la pausa,
  en segundo plano y con el ajuste 🎵 apagado.
- Formato: `.ogg` + `.mp3` (Phaser elige), total de audio < 2 MB. Carga en `PreloadScene`.
- El juego sigue funcionando si un audio no carga (sin error visible). Los tonos actuales pueden
  quedar como respaldo o eliminarse; decide el plan, pero sin dejar código muerto.
- Respeta el desbloqueo de audio tras el primer toque (ya existe `unlock()`).

## 7. Móvil

- **Orientación:** en Android, bloqueada en horizontal (`android:screenOrientation` en el
  manifiesto vía Capacitor). En la web, si alto > ancho, capa "gira el móvil" (dibujo de un
  móvil girando, sin texto necesario) que pausa el juego; desaparece al girar.
- **Recolocado:** Título, HUD, tienda, primer plano y menú se recolocan al cambiar el tamaño
  (hoy el título no lo hace; visto en el navegador integrado). Usar el evento de resize de
  Phaser y `systems/viewport.ts`.
- **Botón atrás de Android** (`@capacitor/app`, `backButton`). Orden: menú ⚙️ abierto → cerrarlo;
  tienda o primer plano abiertos → cerrarlos; en el mundo → diálogo "¿Salir?" con ✔️ y ❌
  grandes (✔️ guarda y sale con `App.exitApp()`); en el título → salir. Nunca cierra de golpe.
  La decisión de qué hacer es una función pura en `core/` con tests; la escena solo la aplica.
  En la web, el botón atrás del navegador no hace nada especial.
- **Segundo plano:** con `visibilitychange` (web) y `appStateChange` (Capacitor): guardar, pausar
  el mundo y la música; al volver, reanudar.

## 8. Errores globales

- `window.onerror` y `unhandledrejection` → escena de error amable: "¡Ups! 🐾" con un dibujo y un
  botón grande 🔄 que recarga el juego. Sin texto técnico en pantalla.
- Antes de mostrarla, intentar guardar el último estado bueno (sin sobrescribir con un estado
  corrupto: solo si pasa la validación de `core/save.ts`).
- El error se escribe en `console.error` (y nada más: sin envío remoto).
- Hook de pruebas para forzar un error y comprobar la pantalla en E2E.

## 9. Pruebas y aceptación

- **Unitarias (Vitest):** migración del guardado; `buyExtra` y límites; separación entre
  animales; colisiones del mapa; decisión del botón atrás; manifiesto con piezas animadas.
- **E2E (Playwright, modo provisional):** comprar el recinto de la pantera y luego una segunda
  (monedas vía hook de pruebas), ver el artículo "completo"; abrir ⚙️, apagar sonido, ver
  créditos; viewport vertical → aviso de girar; forzar error → pantalla de error.
- `npm test`, `npm run test:e2e` y `game-ci` en verde.
- **David en su Android:** agua animada, 5 cabras sin pisarse ni atravesar rocas, compra de
  extras, menú, sonido y música, botón atrás, salir y volver a la app.

## Fuera de este hito (6b y después)

Política de privacidad, ficha y cuestionarios de Play Console (audiencia < 13, Seguridad de los
datos: no se recogen datos), clave de firma y AAB, prueba cerrada (12 testers × 14 días si la
cuenta es personal posterior a nov-2023), despliegue de la web v3. Carne pintada por los niños
(pendiente de ellos). Atlas empaquetado (solo si la carga en móvil lo pide).
