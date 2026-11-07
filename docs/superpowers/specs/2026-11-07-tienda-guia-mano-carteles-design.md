# Llegar a la tienda, mano del tutorial, carteles con dibujo y farolas — diseño

Fecha: 2026-11-07 · Rama: `feat/plaza-recintos-recorrido` (se sigue en la misma) · Estado: diseño aprobado por partes en el chat, pendiente de revisar este documento

## Por qué

- **El camino de la tienda lleva a la ventana, no a la puerta.** Lo vio David jugando. El dibujo de la tienda (`decor-shop.png`, 80×80 px = 5×5 casillas) tiene el mostrador con fruta en las casillas 2 y 3 y la puerta en la 4. El generador del mapa pone la puerta (`puertaTienda`) y el camino debajo de las casillas 2–3 (`SHOP.x + 1 … SHOP.x + 2`).
- **Nadie encuentra la tienda.** Los 6 jugadores con IA del 2026-11-07 no sabían dónde estaba, y David lo confirma: «complicado encontrar la tienda sin carteles». La flecha del tutorial apunta en línea recta, atravesando vallas, y un jugador acabó dando vueltas en círculo.
- **Tocar la comida no hace nada.** Hay que arrastrarla, y si el niño se saltó el tutorial nada se lo enseña. David: «tiene que salir el dedo del tutorial para recordarte que debes deslizar el dedo».
- **La mano y la flecha del tutorial son emojis** (👆 ➡️) y desentonan con el pixel art. Las primeras versiones dibujadas a mano tampoco le gustaron a David («muy feos»).
- **Los carteles de los recintos son solo texto.** Un niño de 5 años no lee.
- **Las farolas que quedan a la derecha de un camino tienen el brazo hacia fuera.** El dibujo tiene el poste a la izquierda y el brazo hacia la derecha. Cuando la farola está a la derecha del camino, el farol cuelga sobre la hierba en vez de sobre el camino. David lo marcó en una captura.
- **Durante el tutorial, al dar de comer, la mano «molesta arriba a la derecha».** Lo dijo David; sin reproducir todavía.

Fuentes: pruebas de David en el navegador y `zooesponji-private/docs/jugadores-ia/2026-11-07/` (resumen e informes). La pantalla blanca que vieron los agentes **no es del juego** (6 navegadores a la vez en un PC cargado; no se repite con uno solo) y queda fuera.

## Objetivos

1. Que el camino lleve a la puerta de la tienda.
2. Que un niño que no lee pueda llegar a la tienda: botón fijo, huellas por el camino de verdad y, tras la primera visita, ir solo.
3. Que tocar una comida enseñe el gesto de arrastrar, sin texto.
4. Que la mano y los avisos del tutorial tengan el mismo estilo de píxeles que el resto del juego.
5. Carteles de recinto con el dibujo del animal, bonitos.
6. Farolas con el farol siempre hacia el camino.

## No objetivos

- Recuperarse si el móvil pierde los gráficos (WebGL). David: «nada».
- Sonido o saltito al tocar el estanque, el bambú o los animales; otros solapamientos del HUD que vieron los agentes (globo de la tendera sobre el contador, etiqueta «60» tapada). Otra tanda.
- Cambiar la economía (monedas por comida, precios). La tienda ya está abierta desde el principio (spec del 2026-11-01; `shopUnlocked: true` en `economy.ts` y `save.ts`).
- Tocar un animal lejano: **ya funciona** (va hasta él y abre la comida). No se toca.
- Viaje instantáneo (teletransporte). La cuidadora anda.

## Anti-objetivos

- Que la tienda deje de abrirse al llegar a la puerta, o que la cuidadora no pueda llegar a ella.
- Que se pierda alguna casilla de camino sin querer (la prueba de caminos tiene que seguir pasando; si cambia a propósito, se regenera la foto con `npm run map:snapshot` y se dice qué cambió).
- Volver a meter dibujos hechos a mano que no estén a la altura del arte comprado. La mano es la de Lintnaya; lo demás sale de arte que ya está en el juego o se enseña a David antes de darlo por bueno.
- Textos nuevos que un niño de 5 años necesite leer para jugar.
- Que el botón de la tienda tape algo o compita con la X del tutorial.

## Bloque 1 · Puerta y camino de la tienda (mapa)

En `game/scripts/make-zoo-map.mjs` (líneas ~131–137 y ~365–366):

- La puerta (`puerta-tienda`) pasa a la **casilla 4 del edificio** (`SHOP.x + 3`), debajo del hueco de la puerta del dibujo (px 48–64 del dibujo de 80 px).
- El camino a la plaza baja desde esa puerta. Hoy el camino es de 2 casillas (`SHOP.x + 1 … + 2`). **Decisión mía:** que siga siendo de 2 casillas, `SHOP.x + 3 … SHOP.x + 4`, y la puerta de 1 casilla sobre `SHOP.x + 3`. Si el ancho de puerta de 1 casilla da problemas al entrar, el constructor puede dejarla de 2 (`+3 … +4`), mientras quede bajo el dibujo de la puerta y no bajo el mostrador.
- La caja de fruta (`crate-fruit`, hoy en `SHOP.x + 3, SHOP.y + 5`) queda encima del nuevo camino: se mueve debajo del mostrador (por ejemplo `SHOP.x + 1, SHOP.y + 5`), que es donde tiene sentido una caja de fruta. El barril se queda.
- Lo que ocupaba el camino viejo vuelve a ser césped. Comprobar que nada (farola, banco) cae ahora encima del camino nuevo.
- Regenerar el mapa, regenerar la foto de caminos a propósito y revisar con `npm run map:preview -- --antes <tmj viejo>` que solo cambia ese tramo.

## Bloque 2 · Farolas hacia el camino

- En el generador, `lampAt` decide hacia dónde mira la farola: si el camino de al lado está **a su izquierda**, se guarda una propiedad `flip: true` en el prop.
- Al dibujar los props (`Decor` / quien pinte `prop-lamp`), `flip` → `setFlipX(true)`, recolocado para que **el poste siga en la misma casilla de césped** y el farol cuelgue sobre el camino (como el dibujo de David).
- Si las farolas son sólidas (`withSolidProps`), comprobar que la parte sólida (el poste) no se mueve a una casilla de camino.
- Aplica a todas: las de la plaza y las que se reparten solas por los caminos.

## Bloque 3 · Mano del tutorial (Lintnaya)

- Arte: **mano señalando** del [Pixel Hand Gesture Cursor Asset de Lintnaya](https://lintnaya.itch.io/pixel-hand-gesture-asset), licencia **CC0**. Guardada en `zooesponji-private/packs/lintnaya_pixel_hand_gesture/` (`manos-fila1.png`, quinta mano: x 64–80, 16×16). El zip completo no se pudo bajar (el almacén de itch.io no responde desde el PC de David); las imágenes son las originales de la página.
- **Solo la mano con el dedo señalando**, sin puño (David). Se mueve como hoy: baja, «aprieta» con el anillo blanco y sube; para arrastrar, lleva el dedo de la comida a la boca.
- Sustituye al emoji 👆 en **todo** el tutorial (`TutorialScene`) y en el aviso nuevo de la comida (bloque 5).
- Se dibuja a escala entera (×3 en las pantallas de interfaz; el constructor elige la que se vea igual de grande que hoy), con `pixelArt` / filtro NEAREST para que no se emborrone.
- Como es CC0 se puede distribuir: **puede ir en el repo público** (por ejemplo `game/public/art/ui-hand.png` o donde vaya el resto de la interfaz). Si el juego funciona sin arte (modo emoji), mantener el emoji como reserva.
- **README** (sección «Arte y créditos»): añadir una línea con la mano de Lintnaya (CC0), igual que los sonidos de Kenney. Si existe `THIRD_PARTY_NOTICES.md` o créditos dentro del juego que listen el arte, también ahí.

## Bloque 4 · Botón de la tienda, huellas de Luna y aviso de borde

**Botón (HUD):** arriba a la izquierda, **debajo de las monedas** (David). Las monedas están en `HUD_COIN = (38, 38)`; el botón va en la misma columna, debajo.

- Dibujo: la tiendita en píxeles de la maqueta (toldo amarillo, rayas, puerta) dentro de un círculo crema con contorno, igual que el bocadillo de borde. **Decisión mía** (David no eligió entre círculo azul con icono y dibujo; aprobó la tiendita del bocadillo). Si se ve mejor el estilo del engranaje, se le enseña a David.
- Siempre visible en el zoo (la tienda está abierta desde el principio). Oculto dentro de la tienda y en las pantallas que tapan el zoo.
- **Antes de la primera visita** (nunca ha entrado en la tienda): al tocarlo aparecen **huellas de Luna claras** (color crema, la opción B de la maqueta) por el **camino de verdad** (el mismo pathfinding de la cuidadora) desde ella hasta la puerta. La cuidadora no se mueve sola; el niño las sigue. Las huellas se encienden en secuencia desde la cuidadora hacia la tienda y se apagan al llegar a la puerta, al volver a tocar el botón o pasado un rato largo (el constructor lo ajusta; que no se queden para siempre).
- **Después de la primera visita:** al tocarlo, **la cuidadora va andando sola** hasta la puerta por el camino (como al tocar un punto lejano, con su aro de destino) y entra.
- «Haber visitado la tienda» se guarda en la partida (campo nuevo en el guardado, con migración: las partidas viejas que ya tengan compras o Luna cuentan como visitada). Probar que una partida antigua sigue cargando.

**Huellas:** forma de huella de perro (cuatro dedos en arco y almohadilla), basada en el [Animal Paw Print Asset Pack de IndieLodge](https://indielodge.itch.io/animal-paw-print-asset-pack). Dibujo de la maqueta: 11×9 px, color crema `#fff6dc` semitransparente, alternando izquierda y derecha del centro del camino, cada ~2 casillas. Hechas por nosotros; se le enseñan a David en el juego antes de cerrar.

**Aviso de borde** (sustituye a la flecha ➡️): si el destino (la puerta de la tienda, o lo que señale el tutorial) queda fuera de la pantalla, sale en el borde más cercano un **bocadillo crema con la tiendita dentro y una colita que apunta hacia ella**. El bocadillo no gira (pixel art girado se ve mal); solo cambia de lado y dónde está la colita (arriba, abajo, izquierda, derecha). Se ve mientras haya huellas o mientras el tutorial esté en el paso de la tienda.

**Tutorial, paso de la tienda:** la mano señala el **botón de la tienda** (no la puerta). Al tocarlo salen las huellas, como a cualquiera.

**Choque con la X del tutorial:** la X roja para salir del tutorial está hoy en `CLOSE_AT = (38, 100)`, justo debajo de las monedas. **Decisión mía:** el botón de la tienda ocupa ese sitio y la X del tutorial baja una posición (misma columna, debajo del botón). Comprobar que no toca el engranaje ni el joystick, en apaisado y en vertical.

## Bloque 5 · Tocar una comida enseña a arrastrarla

- En `FeedScene`, un **toque** (sin arrastre) sobre una comida hace que aparezca la mano de Lintnaya y repita **dos veces** el gesto de arrastrar esa comida hasta la boca del animal, y luego desaparece.
- Funciona con o sin tutorial. Si el tutorial ya está enseñando el arrastre, no se duplica la mano.
- Si el niño empieza a arrastrar, la mano desaparece en el acto.
- El toque no debe contar como «fallo» (`food-missed`) ni romper el arrastre normal.

## Bloque 6 · La mano que molesta al dar de comer con el tutorial

- David: con el tutorial puesto, al dar de comer, «la mano molesta arriba a la derecha».
- Primero **reproducirlo** (tutorial con «Aprender», ir a un animal, abrir la comida) y ver qué es. Sospecha: arriba a la derecha está la X de cerrar la comida, o una mano del paso anterior que se queda pintada. Los agentes vieron también la mano tapando la moneda y la X roja.
- Arreglo: que durante la comida solo haya **una** mano, la del arrastre, y que nada del tutorial tape la X de cerrar.
- Si no se reproduce, decírselo a David con capturas en vez de inventar el arreglo.

## Bloque 7 · Carteles con el animal (medallón)

- El cartel de cada recinto (`prop-sign`, nombre en `Decor`) pasa a ser un **medallón redondo sobre un poste** con el **dibujo del animal** del recinto, el que ya usa el juego (primer fotograma de frente de su hoja). Encima, el nombre, con el mismo estilo de texto o algo más bonito (la maqueta usaba Baloo 800 blanco con borde marrón).
- Medallón: borde `#414040`, aro de madera `#946b47`, fondo crema `#f4e4c1`, poste `#7b5039`. Tamaño: el animal entero y legible; los animales de 24 o 32 px (león, panda…) se recortan a la cabeza o se reducen a escala entera para que el medallón no sea enorme. En la maqueta al león se le veía la cola por arriba: no puede pasar.
- Los carteles de zona (`sign-zone`, «Granja»…) se quedan como están (decisión mía: no hay un único animal que los represente).
- Con los recintos cerrados (siluetas), el medallón puede enseñar el animal igualmente: así el niño sabe qué hay ahí.
- «Que sea bonito» (David): se le enseña en el juego antes de cerrar.

## Pruebas

- Unitarias: dirección de la farola según el camino; puerta y camino de la tienda en el mapa (la puerta queda bajo la casilla 4 del edificio y conecta con la plaza); ruta de huellas = ruta de la cuidadora; migración del campo «tienda visitada».
- Prueba de caminos (`caminos.test.ts`): regenerada a propósito tras el bloque 1, con el cambio explicado en el commit.
- E2E: tocar el botón de la tienda antes y después de visitarla; tocar una comida y ver la mano; tutorial completo hasta la tienda.
- Capturas en el juego (apaisado 640×360 y vertical) de: puerta y camino, farolas, botón, huellas, bocadillo de borde, mano en la comida y medallones, para que David las vea.
- Todas las pruebas las lanza David; se le dan los comandos y lo que debe ver.

## Lo que queda al constructor

- Tiempos y ritmo de la mano y de las huellas; cuánto duran las huellas.
- Escala exacta de la mano en cada pantalla.
- Si la puerta de la tienda es de 1 o 2 casillas (siempre bajo el dibujo de la puerta).
- Dónde vive exactamente la mano en el repo público y cómo se carga junto al resto del arte.

## Decisiones mías (para que David las revise)

1. Camino de la tienda de 2 casillas bajo la puerta; caja de fruta movida bajo el mostrador.
2. Botón de la tienda con la tiendita en píxeles en círculo crema (no el estilo del engranaje).
3. Huellas claras (B), no las oscuras.
4. La X del tutorial baja un hueco y el paso de la tienda del tutorial señala el botón.
5. Carteles de zona sin medallón.
6. Las partidas viejas con compras o con Luna cuentan como «tienda ya visitada».
