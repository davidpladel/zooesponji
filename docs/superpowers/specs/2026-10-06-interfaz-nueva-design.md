# Interfaz nueva: menús, botones y portada

Fecha: 2026-10-06 · Estado: diseño aprobado, sin implementar.

## Objetivo

Los menús y ventanas del juego pasan de tableros de madera planos con emojis a una interfaz lisa y brillante de juego casual de móvil: botones píldora de colores, paneles crema redondeados, carteles de título, letra gordita con contorno y efecto al pulsar. Todas las pantallas comparten las mismas piezas para que la estética sea una sola.

El mundo, los animales y la tienda por dentro siguen en pixel art. La mezcla (interfaz lisa sobre mundo pixelado, portada pintada) es deliberada y está aprobada.

**Bocetos aprobados** (abrir en el navegador; los botones responden al mantener pulsado):

- `docs/superpowers/mockups/boceto-titulo.html`: título y ajustes.
- `docs/superpowers/mockups/boceto-resto.html`: monedas y engranaje, ¿salir?, dar de comer, libro y tienda.
- `docs/superpowers/mockups/titulo-fondo-prueba.webp`: fondo de la portada (generado por David con ChatGPT, 1536×1024).

Los bocetos mandan en colores, proporciones y composición. En ellos, los recuadros discontinuos son huecos para el arte real y los iconos son provisionales.

## Decisiones

- **Estilo:** liso y brillante, no pixelado.
- **Portada:** fondo pintado sin texto, sin animales y sin botones. El nombre y el botón van por código (dos idiomas).
- **El título solo tiene «Jugar».** A Ajustes se llega desde el engranaje dentro del juego.
- **Engranaje:** abajo a la izquierda (a la derecha están los botones de Android). Solo visible mientras la cuidadora anda por el zoo: oculto en tienda, libro, dar de comer, ajustes y ¿salir?.
- **Monedas:** moneda dorada con un «1» y el número grande en blanco con contorno marrón, sin cápsula.
- **Ajustes:** se quita la línea «Panda y pantera pintados por Daniela y Adrián» y los dos dibujos. Orden de arriba abajo: interruptores, Privacidad y Salir, «Hecho con cariño por Daniela y Adrián», copyright y versión.
- **Sin emojis en la interfaz:** cambian según el móvil. Se sustituyen por iconos propios.
- **Modo inmersivo en Android:** se ocultan la barra de navegación y la de estado mientras se juega.
- **Arranque:** la pantalla de carga usa el mismo fondo que el título y su barra se convierte en el botón «Jugar». El splash de Android conserva el león y cambia el fondo a azul cielo.
- **Tienda por dentro:** la escena no cambia. Solo cambian monedas, botón de cerrar y etiquetas de precio.

## Diseño

### 1. Piezas comunes (`src/ui/`, nuevo)

Sustituye a `src/scenes/ui.ts`, que desaparece; sus funciones se reparten así y se actualizan los imports.

- `theme.ts`: colores (por nombre: `yellow`, `green`, `blue`, `red`, `gray`, cada uno con base, brillo, canto y contorno de texto; crema del panel, naranja del marco y del cartel, marrón de contorno), nombre de la fuente y `textStyle(size, color, stroke)`.
- `press.ts`: `makePressable(target, onTap)`. Ver apartado 2.
- `widgets.ts`:
  - `addPillButton(scene, x, y, w, h, { color, label?, icon?, onTap })`: píldora con reborde crema, brillo en la mitad superior, canto más oscuro abajo y sombra. Texto blanco con contorno del color.
  - `addPanel(scene, x, y, w, h)`: panel crema muy redondeado con marco naranja, contorno marrón y sombra. Se traga los toques.
  - `addRibbonTitle(scene, x, y, w, h, text)`: cartel naranja que monta sobre el borde superior del panel.
  - `addCloseBadge(scene, x, y, onClose)`: chapa roja redonda con aspa blanca, colocada en la esquina superior derecha del panel. La zona de toque mide al menos 64 px aunque la chapa sea menor.
  - `addTile(scene, x, y, w, h, onTap?)`: ficha blanca redondeada con marco naranja (comidas, cromo del libro).
  - `addCoinCounter(scene, x, y)`: moneda y número; devuelve un objeto con `set(coins, pop)`.
  - `addVeil(scene, onTap?)`: velo verde oscuro translúcido (`0x142814`, 0.4) en vez del negro al 60–70 %.
  - `restartOnResize` se mueve aquí sin cambios.
- `icons.ts`: claves de textura y `addIcon(scene, x, y, name, size, tint?)`.

Las piezas se dibujan con `Graphics` (rectángulos redondeados en capas: sombra, contorno, base, brillo, canto). No se usan degradados reales: base, brillo y canto son colores planos. Todas las medidas salen del ancho y alto que se les pasa, como hasta ahora.

Al terminar no quedan `addWoodPanel`, `addPlateButton` ni `addCloseButton`.

### 2. Efecto al pulsar (`press.ts`)

Un solo sitio para todos los botones, fichas, filas del libro, interruptores, engranaje y chapa de cerrar.

- Al bajar el dedo: escala a 0,92 en 60 ms y se oscurece (capa negra al 15 % del tamaño de la pieza, dentro del contenedor).
- Al soltar dentro: se ejecuta la acción de inmediato y la pieza vuelve a escala 1 con rebote (`Back.easeOut`, 140 ms).
- Si el dedo sale de la pieza antes de soltar: vuelve a su tamaño sin ejecutar nada.
- El sonido `tap` lo siguen poniendo las acciones, como ahora.
- El objeto guarda su escala base; el efecto es relativo a ella (la moneda ya hace su propio «pop»).

### 3. Letra

- **Baloo 2** (pesos 700 y 800), licencia OFL. Los `.woff2` van en `game/public/fonts/` y se anotan en `THIRD_PARTY_NOTICES.md`.
- `BootScene` la carga con la API `FontFace` antes de arrancar `Preload`. Si falla o tarda más de 2 s, se sigue con `sans-serif` y el juego funciona igual.
- Todo texto de interfaz usa `textStyle` del tema. El pie de copyright sigue en `sans-serif` fino.

### 4. Iconos

- SVG de Tabler Icons (MIT), copiados en `game/public/assets/ui/icons/` y anotados en `THIRD_PARTY_NOTICES.md`: jugar, cerrar, música, altavoz, joystick, engranaje, candado, escudo (privacidad), puerta (salir), flecha izquierda, flecha derecha, corazón.
- `PreloadScene` los carga como texturas SVG a 128 px, en blanco; el color se da con tinte.
- La moneda se dibuja con `Graphics` (dorado, aro interior, «1»).
- El idioma no usa banderas: la ficha muestra «ES» o «EN» en letra grande.
- Los corazones de «Hecho por…» pasan de `💛` en el texto a icono de corazón amarillo junto al texto; las claves `title.credits` y `credits.madeBy` pierden el emoji en los dos idiomas.
- Quedan fuera los emojis del mundo y los de reserva de comidas y animales (`src/world/`, `data/foods.ts`, `data/animals.ts`): no son interfaz.

### 5. Pantallas

**Título (`TitleScene`)**
- Fondo `game/public/assets/ui/title-bg.webp` (copia del boceto), escalado para cubrir la pantalla y centrado en vertical al 42 %.
- Nombre en amarillo `#ffd23c` con doble contorno (blanco fuera, marrón dentro), arriba.
- Botón «Jugar» píldora amarilla grande con icono de jugar, con un latido suave (escala 1 ↔ 1,04) mientras espera.
- Abajo, «Hecho por Daniela y Adrián» con corazón y el copyright, en blanco con contorno marrón.

**Dentro del juego (`HudScene`)**
- Monedas con `addCoinCounter` arriba a la izquierda. `coinsLabel()` devuelve solo el número como texto.
- Engranaje: píldora azul redonda con icono blanco, abajo a la izquierda. Visible solo si `World` está activa y no lo están `Shop`, `Book`, `Feed`, `Settings` ni `Quit`; se comprueba en `update()`. Nuevo `gearVisible()` para pruebas. Oculto no arranca nada ni bloquea el joystick.
- El aviso (`toast`) usa la fuente nueva con contorno marrón.

**Ajustes (`SettingsScene`)**
- Velo, panel, cartel «Ajustes» y chapa de cerrar en la esquina del panel.
- Cuatro fichas en fila: música, sonidos, joystick e idioma. Encendido: ficha verde con icono blanco. Apagado: ficha gris con icono atenuado, sin raya roja. Idioma: ficha azul con «ES»/«EN». Etiqueta debajo en marrón.
- Privacidad (azul, icono escudo) y Salir (rojo, icono puerta; solo en la app).
- «Hecho con cariño…» con corazón, y debajo copyright y versión.
- Se eliminan `addCredits` con los sprites y la clave `credits.art`. `creditsText()` devuelve solo `credits.madeBy`.
- Se mantienen `togglePos`, `buttonPos`, `languagePos` y `languageLabel`.

**¿Salir? (`QuitScene`)**
- Velo, panel y cartel con `quit.ask`.
- «Seguir jugando» (verde, grande, icono jugar) cierra; «Salir» (rojo, más pequeño) confirma. Sin chapa de cerrar; tocar fuera cierra, como ahora.
- `yesPos()` sigue devolviendo la posición del botón que confirma la salida.

**Dar de comer (`FeedScene`)**
- Panel único con el nombre del animal en el cartel y chapa de cerrar.
- Dentro, ventana redondeada con cielo y prado donde va el animal, y debajo una fila de fichas blancas, una por comida.
- No cambia qué comidas salen ni lo que pasa al elegir una.

**Libro (`BookScene`)**
- Panel con cartel «Libro del zoo» y chapa de cerrar.
- Capítulos como filas píldora a la izquierda: amarillo el elegido, crema anaranjado los demás, gris con candado los bloqueados.
- Cromo en ficha blanca ligeramente girada a la derecha, nombre y texto en marrón, flechas azules.
- No cambian los datos, el desbloqueo ni la navegación.

**Tienda (`ShopScene`)**
- Monedas y chapa de cerrar nuevas; sin engranaje.
- Etiquetas de precio como píldoras con moneda: verdes si alcanza el dinero, grises si no.
- El botón de comprar pasa a `addPillButton`.

### 6. Textos (`src/data/strings/`)

| Clave | Español | Inglés |
| --- | --- | --- |
| `quit.ask` | ¿Salir del zoo? | Leave the zoo? |
| `quit.stay` (nueva) | Seguir jugando | Keep playing |
| `quit.leave` (nueva) | Salir | Quit |
| `title.credits` | Hecho por Daniela y Adrián | Made by Daniela and Adrián |
| `credits.madeBy` | Hecho con cariño por Daniela y Adrián | Made with love by Daniela and Adrián |
| `credits.art` | se elimina | se elimina |

### 7. Modo inmersivo (Android)

- En `MainActivity.java`: ocultar las barras del sistema (estado y navegación) con `WindowInsetsControllerCompat`, con el comportamiento «aparecen un momento al deslizar desde el borde» (`BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE`).
- Se vuelve a aplicar en `onWindowFocusChanged(true)`, porque Android las restaura al volver a la app o al cerrar un diálogo.
- El botón atrás sigue abriendo ¿Salir?: no cambia `askQuit`.
- En web no hace nada.

### 8. Arranque: splash y pantalla de carga

Al abrir se ven tres cosas seguidas: splash de Android, carga del juego y título. Deben leerse como una sola.

**Pantalla de carga (`BootScene` y `PreloadScene`)**
- `BootScene` carga lo mínimo para pintarla: la fuente (apartado 3) y `title-bg.webp`.
- `PreloadScene` pinta el fondo de la portada con el mismo encuadre que el título, el nombre arriba y, donde irá el botón «Jugar», una barra de carga en píldora: carril crema con reborde y relleno amarillo con brillo, del mismo ancho y alto que el botón.
- El progreso cubre las dos tandas de carga (mapas y sonido, luego arte) sin que la barra retroceda: la primera llena hasta el 40 % y la segunda el resto. Sin arte importado, salta al 100 %.
- Al terminar, `Title` arranca sobre el mismo fondo y el nombre no se mueve: la barra da paso al botón con una aparición corta (escala 0,8 → 1, 200 ms). No hay fundido a negro entre las dos escenas.
- La carga no muestra textos traducibles: el idioma se resuelve al final de la carga.

**Splash de Android**
- `windowSplashScreenBackground` pasa de `#1D2B1F` a azul cielo `#58B0F0` (tomado del cielo de la portada; se ajusta a ojo contra la imagen). El icono animado sigue siendo el león.
- `splash.png` (todas las densidades, vertical y apaisado): se rehace con el león, el fondo azul cielo y «Zoo Esponji» en Baloo 2 amarillo con contorno marrón. Solo lo ven los Android anteriores al 12.
- El fondo de `index.html` pasa al mismo azul, para que no asome verde oscuro entre el splash y la carga.

## Errores y casos límite

- Fuente que no carga: se usa `sans-serif`; nada se bloquea.
- Fondo de portada que no carga: color verde oscuro actual de fondo.
- Giro o cambio de tamaño: las ventanas se vuelven a montar con `restartOnResize`, como ahora.
- Pantallas pequeñas: todas las piezas conservan los mínimos de toque actuales (48 px el engranaje, 64 px cerrar).

## Pruebas

- **Unitarias:** `makePressable` (acción al soltar dentro, nada al salir), regla de visibilidad del engranaje como función pura, y que `es.ts` y `en.ts` siguen teniendo las mismas claves.
- **De extremo a extremo (Playwright):** se actualizan las que dependen de textos o posiciones cambiados (`coinsLabel`, `creditsText`, `quit.ask`). Nuevas: el engranaje no se ve con la tienda, el libro o dar de comer abiertos y vuelve al cerrarlos; ¿Salir? se cierra con «Seguir jugando».
- **A mano en el móvil:** arranque completo (splash azul, carga y título sin saltos de color ni pantallazos oscuros), modo inmersivo (las barras no aparecen al andar; vuelven al deslizar; siguen ocultas al volver a la app), botón atrás, y lectura de todas las pantallas en español e inglés.

## Orden de trabajo

Cada bloque deja el juego jugable y las pruebas en verde.

1. Piezas comunes, letra, iconos y efecto al pulsar.
2. Monedas, engranaje y avisos dentro del juego.
3. Ajustes y ¿Salir?, con los textos nuevos.
4. Título con el fondo y pantalla de carga.
5. Dar de comer, libro y tienda.
6. Android: modo inmersivo y splash.

## Fuera de alcance

- Fondos pintados para otras pantallas y animales pintados en la portada.
- Rehacer el arte de la tienda o del mundo.
- Nuevas capturas para Google Play (habrá que rehacerlas cuando esto se publique).
- Emojis del mundo y de reserva de comidas y animales.
