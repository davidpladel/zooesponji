# Plaza grande, recintos por especie, prueba del recorrido y jugadores con IA — diseño

Fecha: 2026-11-06 · Rama: `feat/plaza-recintos-recorrido` (sale de `main`) · Estado: diseño pendiente de aprobar por David

## Por qué

- **La plaza de la fuente se rompió.** El 2026-10-27 (commit `7b7cdf0`) la fuente pasó a ser sólida para que la cuidadora no se metiera en el agua. Pero el dibujo de la fuente (80×64 px) es más grande que su isla de césped (4×4 casillas), así que tapa una casilla de camino a cada lado. Antes se daba la vuelta a la fuente con holgura; ahora a izquierda y derecha queda un pasillo de una sola casilla. David lo ha notado jugando con la cuidadora y Luna: «se ha cargado la plaza que teníamos antes».
- **Nada avisa cuando un cambio del mapa quita caminos.** El 2026-11-01 (commit `e551344`, atajos según el plano de David) el mapa perdió 227 casillas de camino y ganó 91, y ninguna prueba lo señaló. «Esto no puede pasar.»
- **Los recintos son pequeños y pobres.** Leones y cabras tienen 10×6 casillas por dentro. Elefantes y ovejas tienen 4 o 5 adornos. El paisaje no siempre cuadra con la especie.
- **La regla de qué se pisa dentro de los recintos no es la de David.** Hoy todo lo que no deja pasar al animal tampoco deja pasar a la cuidadora (rocas incluidas), y la hierba y las flores se dibujan por encima de la cuidadora y de Luna cuando pasan por detrás.
- **Hay fallos y problemas de manejo que no vemos.** David quiere jugadores con IA, con perfil de niño, que den ideas de experiencia de uso y pantalla (UX/UI) y encuentren fallos.

## Objetivos

1. Una plaza de la fuente grande y bonita para los niños, por la que se dé la vuelta con holgura.
2. Recintos más grandes, con un paisaje propio de cada especie y realista, usando solo los sprites que ya tenemos en los packs.
3. Una regla clara y probada de qué se pisa y qué no, y de qué se dibuja por encima de quién.
4. Una prueba automática que haga que la cuidadora, con Luna detrás, recorra todos los caminos, y que falle si un cambio quita alguno.
5. Un sistema reutilizable de jugadores con IA (niño de 5 años y niño de 10 años) que deje un informe útil. Se pasa una vez al terminar esta rama y se puede repetir cuando se quiera.

## No objetivos (esta rama)

- **Los cerdos y lo de limpiarlos.** Vendrán más adelante: se meterán en una charca de barro, se mancharán y el jugador los limpiará. Aquí solo se deja preparado (ver bloque 4).
- **El joystick que «se activa solo»** cerca de las cabras y la tienda. David no lo reproduce; se aparca. (Pista para cuando vuelva: con el joystick encendido en Ajustes, un toque en la zona de abajo a la izquierda, el 40 % izquierdo y algo más de la mitad inferior de la pantalla, no hace andar a la cuidadora sino que saca el joystick; cerca de los bordes del mapa la cámara deja de centrarla y los caminos caen en esa zona. Los jugadores con IA pueden encontrarlo.)
- Recintos nuevos o animales nuevos. Se mantienen los 11 recintos, sus animales y su orden de compra.
- Recuperar la vuelta de abajo que se quitó el 2026-11-01. Se deja como está salvo que David diga lo contrario.
- Ocupar los huecos reservados para las tiendas futuras del hermano de David (ver el diseño del 2026-11-01).

## Anti-objetivos (sería un fracaso aunque funcionara)

- Que la cuidadora o Luna no puedan llegar a un camino al que antes llegaban.
- Que una flor, una hierba o una roca se dibuje encima de la cuidadora o de Luna mientras la pisan.
- Que se pueda atravesar un árbol, un tronco, el bambú o el agua.
- Que los recintos parezcan un batiburrillo de adornos sin sentido para la especie.
- Que los jugadores con IA cuesten un dineral o llenen el chat de capturas.
- Que una partida guardada deje de cargar después de agrandar el mapa.

## Bloque 1 · Mapa más grande y plaza de la fuente

El mapa se genera con `game/scripts/make-zoo-map.mjs` → `game/public/assets/maps/zoo.tmj` (hoy 96×60 casillas de 16 px). Todo cambio del mapa se hace en el generador, nunca a mano en el `.tmj`.

**Plaza (lo eligió David: opción C, «algo GRANDE y bonito para los niños»):**
- Plaza de unas **15×13 casillas** en el centro del zoo, con la fuente en medio.
- **4 casillas de camino alrededor de la fuente** por todos los lados.
- Esquinas recortadas para que no parezca un cuadrado duro.
- **4 bancos y 4 farolas** en la plaza.
- Los **caminos que llegan a la plaza pasan a tener 3 casillas** de ancho.
- El mockup que eligió David está en `.superpowers/brainstorm/` (pantalla `plaza.html`, opción C).

**Decisiones mías:**
- La **isla de césped de la fuente tiene el tamaño del dibujo**, redondeado hacia arriba a casillas enteras (5×4 casillas para el dibujo de 80×64). La fuente sigue siendo sólida, pero su bloqueo coincide con la isla, así que ya no tapa camino.
- El mapa crece lo justo para que quepan la plaza y los recintos ampliados del bloque 3. Leones, cabras, pantera y panda se apartan de la plaza.
- Los caminos de 3 casillas son solo los que llegan a la plaza. Las demás avenidas se quedan con el ancho que tienen.
- La entrada, la tienda, el tablón y el resto de atajos conservan su posición relativa entre ellos. Si al crecer el mapa hay que moverlos, se mueven juntos.

**Lo que tiene que seguir funcionando:** la cuidadora empieza junto a la entrada; la tienda, el tablón y las puertas de los recintos se alcanzan; los visitantes pasean por los caminos y entran en los recintos donde ya podían; la cámara no se sale del mapa.

**Partidas guardadas:** la partida no guarda la posición de la cuidadora en el mapa (comprobado en `game/src/core/save.ts`), así que agrandar el mapa no rompe nada guardado. Hay que comprobarlo igualmente en la tienda (`ShopScene` guarda una posición *dentro* de la tienda, que no cambia).

## Bloque 2 · Qué se pisa y qué se dibuja encima

**Regla de David:** «todo lo que no sea agua se puede subir. Árboles, troncos no tiene sentido atravesarlos.»

| Se pisa o se sube | No se atraviesa |
|---|---|
| Rocas y piedras de todos los paisajes | Agua: lagos, estanques, charcas (también la futura de barro, ver bloque 4), la cascada |
| La meseta de las cabras y cualquier montaña | Árboles: acacias, pinos, palmeras, árboles de selva, cerezos, árboles del parque |
| La parte de roca del risco de la pantera | Troncos y tocones |
| Hierba, hierba seca, flores, girasoles, margaritas, nenúfares | Bambú |
| | La fuente de la plaza |

**Decisiones mías (David puede corregirlas):**
- Los **arbustos** cuentan como árboles: no se atraviesan.
- La **cueva** de las cabras es roca: se puede subir.
- Los **animales siguen la misma regla** que la cuidadora. Así las cabras se suben a la montaña y los leones a las rocas.
- Fuera de los recintos (bancos, farolas, barriles, cajas, carteles) **no cambia nada** respecto a hoy.
- Los girasoles hoy bloquean su base; pasan a pisarse como el resto de flores.

**Qué se dibuja encima:**
- Todo lo que se pisa se dibuja **siempre por debajo** de la cuidadora, de Luna, de los animales y de los visitantes. Nunca debe quedar una flor, una hierba o una roca tapándoles las piernas. Hoy la hierba y las flores se ordenan por su altura en pantalla (`depthForY` en `game/src/world/Decor.ts`) y por eso tapan a quien pasa por detrás.
- Los árboles siguen como hoy: se pasa por detrás de la copa y la copa tapa a la cuidadora, pero el tronco no se cruza.
- Una roca grande que se sube se dibuja debajo de quien la pisa. *Decisión mía:* no hay efecto de altura (la cuidadora no «sube» en pantalla). Si queda raro, se verá con David en el móvil.

**El risco de la pantera** es hoy una sola pieza (`waterfall`, 112×104 px) que bloquea 49 de las 104 casillas del recinto. Hay que separar en el mapa la parte de agua (cascada y poza: no se pisa) de la parte de roca (se pisa).

## Bloque 3 · Recintos más grandes con paisaje por especie

David: «el paisaje acorde a cada especie», «revisa cosas que hay en los parques en sus jaulas o en la vida real para que sea más bonito y realista (en base a los sprites que tenemos)».

**Tamaño:** todos los recintos crecen. Los que más, leones y cabras (hoy 10×6 por dentro). *Decisión mía:* ningún recinto por debajo de unas 14×9 casillas por dentro, y la sabana sigue siendo el más grande. La forma sigue siendo rectangular, con la puerta donde da al camino.

**Paisaje por recinto** (inspirado en cómo los zoos montan los recintos: sombra, sitios altos, agua y cosas para curiosear):

| Recinto | Paisaje | Piezas (de los packs que ya tenemos) |
|---|---|---|
| Leones | Sabana con una pila de rocas alta donde tumbarse a vigilar | 1 acacia grande de sombra, pila de rocas de sabana, hierba seca alta, tronco caído |
| Cabras | Montaña para escalar | Meseta y rocas grises, cueva, pinos, flores de montaña, tronco |
| Pantera | Selva espesa con agua | Risco con cascada (bloque 2), árbol grande con lianas, rocas con musgo, helechos, flores rojas |
| Pandas | Bosque de bambú | Matas de bambú de varias alturas, tocón y tronco, rocas con musgo, charca pequeña |
| Patos (estanque) | Estanque de humedal | Lago con nenúfares y flores, juncos y espadañas en la orilla, piedras con musgo |
| Ovejas | Prado | Margaritas y girasoles, rocas de prado, un árbol de sombra, tocón |
| Establo (caballos y gallinas) | Granja | Cobertizo de paja, abrevadero, barril, calabazas, espantapájaros, cajas |
| Pingüinos | Hielo | Charca helada con placas de hielo, cascada helada, rocas con nieve, pinos nevados |
| Sabana (jirafas, cebras, gacelas) | Llanura abierta para correr | Acacias altas (las jirafas comen arriba), charca para beber, hierba seca, rocas |
| Elefante africano | Sabana con charca | Charca grande, rocas grandes para rascarse, acacia, tronco |
| Elefante asiático | Bosque con río | Charca, palmeras, bambú, árbol de selva, rocas con musgo |

**De dónde salen las piezas.** Las hojas de detalles de los packs VectoRaith del repo privado (`zooesponji-private/packs`): sabana, prado, humedal y costa (Biome B y C), selva y sus especiales (Biome C), montaña (Biome D), nieve y sus especiales y bosque templado (Biome A), bambú y palmeras (Monocots) y la hoja de madera (cobertizo, abrevadero, calabazas, espantapájaros). Las piezas nuevas se añaden a `game/art/art.config.json` y se importan con `npm run art:import` como las de hoy. **El arte solo vive en el repo privado** (ver memoria del proyecto); en el público solo van las coordenadas del config.

**Lo supongo yo y hay que comprobarlo al recortar:**
- El agua de las charcas de sabana y elefantes sale del agua de la sabana del pack.
- La cascada helada y las placas de hielo de los pingüinos están en la hoja especial de nieve (`vectoraith_tileset_tundra_SPECIALS`) y hay que recortarlas.
- Los juncos, espadañas y piedras con musgo salen de la hoja de humedal.

**Qué queda al criterio de quien construya:** la colocación exacta de cada pieza, siempre que:
- No tape la puerta ni el paso desde la puerta.
- Deje sitio para todos los animales del recinto (los que hay y los que faltan por comprar) y para que se separen como hoy (`spreadPositions`).
- Deje a cada animal accesible para darle de comer: la cuidadora tiene que poder llegar junto a cualquier sitio donde pueda estar un animal.
- Se vea bonito. Se revisa con capturas del juego antes de dárselo a David.

## Bloque 4 · Charcas preparadas para el barro (para más adelante)

Más adelante habrá cerdos que se meten en una charca de barro, se manchan y el jugador los limpia. Ahora no se hace nada de eso, pero:
- Las charcas son una pieza que se puede poner en **cualquier recinto**, con su zona de agua conocida por el juego.
- El juego puede saber **si un animal está dentro de una charca**. Una función que lo diga basta. No hace falta usarla todavía.
- *Decisión mía:* los animales hoy no se meten en el agua (no se pisa). La futura charca de barro será la excepción para los cerdos; eso se decide cuando lleguen.

## Bloque 5 · Prueba del recorrido (cuidadora y Luna)

Dos capas: una rápida que corre siempre y una en el juego de verdad.

**Prueba rápida, sobre el mapa** (`vitest`, en `game/tests/unit/`):
- Desde la casilla de inicio se llega a **todas** las casillas de camino (hoy ya pasa; tiene que seguir pasando).
- **Lista de caminos guardada.** Se guarda en el repo la lista de casillas de camino del mapa. Si un cambio del mapa quita alguna, la prueba falla y dice cuáles. Para quitar caminos a propósito hay que actualizar esa lista adrede (con un comando, como una «foto» del mapa), así queda a la vista en el cambio.
- **Ningún paso estrecho por culpa de algo sólido.** Ninguna pieza sólida (como la fuente) puede dejar un camino con menos casillas de ancho de las que tiene el camino que lo rodea.
- **Regla de pisar.** Cada pieza del mapa está en el lado correcto de la tabla del bloque 2 (las de agua, árbol, tronco y bambú bloquean; las de roca, hierba y flores no).
- **Recintos.** Dentro de cada recinto abierto, la cuidadora llega desde la puerta a todas las casillas que no son agua, árbol, tronco o bambú.
- **Plaza.** La vuelta a la fuente tiene al menos 4 casillas de ancho por todos los lados.

**Prueba en el juego** (`playwright`, en `game/tests/e2e/`):
- Con Luna comprada y la plaza, la cuidadora **recorre el mapa tocando la pantalla**, como un niño, visitando una lista de puntos que cubra todos los tramos de camino (cada cruce, cada final de camino, la vuelta entera a la fuente y el interior de cada recinto abierto).
- En cada punto comprueba que **ha llegado** y que **Luna la sigue** (está cerca al poco rato).
- Comprueba que **nada de lo que se pisa se dibuja encima** de la cuidadora o de Luna en los puntos con flores, hierba o rocas.
- Se pasa con el joystick **apagado** (como juega casi todo el mundo). *Decisión mía:* no se repite con el joystick encendido en esta rama; queda aparcado con lo del joystick.
- Puede tardar varios minutos; va con su propio tiempo límite, como `zoo-grande.spec.ts`.

**Quién la lanza:** las pruebas locales las lanza David (memoria del proyecto). Se le dan el comando y el resultado esperado.

## Bloque 6 · Jugadores con IA

David: «Feedback vital de UX/UI del juego que ayude a coger ideas para mejorarlo. Y detectar problemas.»

**Quién juega**
- **Niño de 5 años, no sabe leer.** Solo entiende dibujos, colores y gestos. Toca lo que le llama la atención, se impacienta si algo tarda y no entiende ningún texto. Lo que solo se explica con letras, para él no existe.
- **Niño de 10 años, sabe leer.** Lee carteles y tienda, quiere desbloquearlo todo, prueba cosas raras y se queja de lo que le parece injusto o lento.
- *Decisión mía:* 3 jugadores de cada perfil, cada uno con un objetivo distinto (por ejemplo: dar de comer a todos los animales; comprar en la tienda; pasear con Luna y explorar). 6 en total por pasada.

**Cómo juegan**
- El juego corre en un navegador sin ventana del tamaño de un móvil tumbado, desde la versión construida del juego (sin trucos de desarrollo).
- Cada jugador solo ve **capturas de pantalla** y solo puede **tocar, arrastrar y esperar**, como un niño. No usa las funciones internas de prueba (`window.__ZOO__`) para jugar. Sí se pueden usar para anotar el estado en el informe.
- Un pequeño programa en el repo hace de mando: arranca el juego, toma capturas, toca donde le dicen y guarda un diario de la partida.
- Cada jugador tiene un límite de acciones para que el coste esté acotado.

**Coste (David: «lo que consuma menos»)**
- Jugar desde esta conversación con el modelo principal es lo más caro: cada captura se queda acumulada. Lo más barato es que **cada jugador sea un subagente con Sonnet**, con su propio contexto, y que aquí solo se lean los informes.
- Las capturas van reducidas (lo justo para distinguir botones y animales).
- Es la única excepción a la regla de David de no usar subagentes, y solo para esta parte.

*Decisiones mías:* juegan en español. El programa que hace de mando y las instrucciones de cada perfil van en el repo público (no llevan arte ni datos privados). Los informes y capturas van al repo privado, en `zooesponji-private/docs/jugadores-ia/AAAA-MM-DD/`.

**Qué deja cada pasada** (en esa carpeta del repo privado):
1. **Resumen general**, ordenado por importancia: problemas que se repiten entre jugadores, las mejores ideas de UX/UI y los fallos encontrados.
2. **Informe por jugador**, contado con la voz del niño («quería tocar el pato y no pasaba nada»), con las capturas de los momentos clave.
3. **Fallos**, cada uno con una captura y los pasos para repetirlo.

**Cuándo se pasa:** una vez al terminar esta rama. Queda listo para repetirlo cuando David quiera (por ejemplo, antes de cada versión).

## Restricciones

- El mapa se cambia en `make-zoo-map.mjs` y se regenera; nunca a mano en el `.tmj`.
- Arte de los packs solo en el repo privado; en el público, coordenadas del config y nada más.
- Los textos nuevos que vea el jugador (si los hay) van en los 11 idiomas.
- Las pruebas locales las lanza David; Claude da comandos y resultado esperado.
- README, spec (estado) y plan se actualizan al cerrar cada bloque.
- Rendimiento: más adornos no pueden notarse en un móvil normal. Lo que no se ve no se actualiza (como hoy).

## Orden sugerido

1. Bloque 2 (regla de pisar y dibujo por debajo), con sus pruebas rápidas.
2. Bloque 1 (mapa y plaza) y bloque 3 (recintos), juntos, porque los dos mueven el mapa. Bloque 4 dentro de este.
3. Bloque 5 (prueba del recorrido) sobre el mapa nuevo. Antes de cambiar el mapa se guarda la «foto» de caminos de hoy para ver exactamente qué cambia.
4. Bloque 6 (jugadores con IA) al final, sobre el juego ya cambiado.
