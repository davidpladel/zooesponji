# Caminos nuevos, perrita Luna, cría Jose, tutorial visual y aviso del libro — diseño

Fecha: 2026-11-01 · Rama: `feat/luna-jose-caminos-tutorial` (sale de `main`) · Estado: implementada, probada por David en el móvil y fusionada en `main` como **2.9.0 (versionCode 12)** el 2026-11-02; pendiente de subir a Play

Se prueba de forma independiente de las otras ramas pendientes (R8/DEX, etc.) y se fusiona cuando David dé el visto bueno.

## Por qué

- **Caminos:** hoy, para ir de una punta del parque a otra hay que bajar al centro y volver a subir. Los atajos acortan los paseos de todo el mundo.
- **Luna:** la perrita de una amiga de David entra como mascota de la cuidadora.
- **Jose:** una cría de panda, como ya existe una cría de gacela (Pipa).
- **Tutorial y aviso del libro:** mucha gente, y sobre todo los niños que no saben leer, no sabe moverse, ni que hay joystick, ni que hay que tocar al animal y **arrastrar** la comida. Tampoco encuentra el libro de la tienda.

## Bloque 1 · Caminos nuevos

Se trazan sobre `game/public/assets/maps/zoo.tmj` con el **mismo aspecto que los caminos actuales**. Son para **todo el mundo**: la cuidadora, los visitantes y el personal. La búsqueda de rutas y el paseo de los visitantes tienen que usarlos.

Atajos, según el plano a mano de David (las referencias se toman del mapa actual):

1. **Izquierda (rojo):** desde el extremo izquierdo de la avenida de arriba, baja pegado al borde izquierdo hasta la avenida de los pingüinos.
2. **Junto a los pingüinos:** desde la avenida de arriba baja hasta la esquina de arriba a la izquierda del cuadrado central.
3. **Abajo a la izquierda:** desde la avenida de los pingüinos y el polo baja por el borde izquierdo y gira a la derecha hasta la parte de abajo del cuadrado central, junto a la entrada.
4. **La «U» de arriba:** sube desde la avenida de arriba entre la Sabana y los dos recintos pequeños de la derecha, y vuelve a bajar. Sirve para que los visitantes se repartan cuando hay mucha gente en una zona. **Dentro de la U va un jardín de flores**, solo decorativo.
5. **Derecha:** desde el extremo derecho de la avenida de arriba baja hasta la avenida del oso y el elefante. Sigue por el borde derecho y va por abajo hasta la entrada.
6. **Horizontal derecha:** une el lado derecho del cuadrado central con el camino 5.

**No tocar:** los círculos con «T» y los garabatos azules del plano son tiendas futuras del hermano de David. Ningún camino nuevo ni el jardín pueden ocupar esos huecos. Esto queda fuera de esta rama.

Decisiones mías:
- Ancho y pieza de baldosa iguales a los de las avenidas secundarias.
- Que los visitantes «usen» la U significa que su elección de destino o ruta la incluye, por ejemplo como punto de paseo cuando una zona está llena. El mecanismo concreto lo decide quien lo construya, siguiendo el sistema de visitantes que ya existe.

## Bloque 2 · Luna, la perrita de la cuidadora

- **Aspecto:** perrita negra pixelada al estilo del juego (16×16, como los demás animales), a partir de las fotos de David. Orejas caídas, con una algo más levantada; rabo fino hacia arriba; **mancha blanca en el pecho** (el detalle que David pidió cuidar) y algo de blanco en las patas. Necesita andar en 4 direcciones y estar quieta, como la cuidadora.
- **Cómo se consigue:** se compra en la tienda por **67 monedas**.
- **Qué hace:** una vez comprada, aparece junto a la cuidadora y **la sigue por todo el parque**, para siempre. Por ahora no hace nada más; más adelante puede tener otras funciones.
- **Nombre:** «Luna». Es el **único nombre del juego que se traduce** (en: Moon, fr: Lune, it/pt: Luna, de: Mond…). Propongo las traducciones de los 13 idiomas y David las revisa.
- Se guarda en la partida, así que hay que ampliar el guardado y su migración, y la tienda tiene que mostrarla como un artículo nuevo.

Decisiones mías:
- El arte se dibuja como un archivo nuevo en `game/art` (el arte con licencia VectoRaith sigue solo en el repositorio privado). La perrita es dibujo propio.
- Cuando la cuidadora entra a un recinto, Luna la espera en la puerta y no entra.
- Si la cuidadora está quieta, Luna se sienta o se queda quieta a su lado. No hay ladridos ni sonidos en esta rama.

## Bloque 3 · Jose, cría de panda

- Es un tercer residente del recinto del panda, después de Mochi y Pompón.
- **Aspecto:** el mismo panda, **más pequeño**, reducido a 13 píxeles con `shrink`, como Pipa, y con las **manchas grises en vez de negras**, como los pandas recién nacidos. El resto es blanco.
- **Nombre:** «Jose», sin tilde, igual en todos los idiomas. Lleva su página en el libro, como los demás residentes.
- **Precio:** el de cualquier panda extra (20).

## Bloque 4 · Cambios de precio

- Estanque de patos: 150 → **120**.
- Ovejas: 250 → **120**.

Hay que revisar las pruebas y el catálogo de analítica que dependen de los precios (`eventCatalog.ts`, `economy.test.ts`, etc.).

## Bloque 5 · Tutorial visual para niños

**Tiene que entenderse sin saber leer:** nada de frases. Solo una mano animada, flechas, iconos (▶, ✕, ✓) y el propio juego.

- **Al abrir el juego la primera vez** sale un aviso con el mismo estilo que el de votar: un dibujo y dos botones, «▶ Aprender» y «✕ Saltar».
- **En el menú** hay un botón «Aprender» para volver a verlo cuando se quiera.
- **Se aprende jugando de verdad.** En cada paso, una mano animada hace el gesto encima del juego, junto a lo que hay que tocar, y **no avanza hasta que el jugador lo hace**. Un gesto cada vez.

Orden de los pasos (fijado por David):

1. **Moverse:** tocar el suelo y la cuidadora va. Se enseña también que existe el joystick, con una flecha hacia donde se activa en opciones.
2. **Tocar al animal:** la mano pulsa sobre un animal y se abre su comida.
3. **Dar de comer arrastrando:** la mano arrastra la comida hasta el animal. Si el jugador solo toca el icono, la mano repite el arrastre.
4. **Así se ganan monedas:** las monedas vuelan hasta el contador.
5. **Ir a la tienda:** cuando tenga **20 monedas** (lo que cuesta abrir la tienda), la mano señala la tienda. Allí se abren los recintos.

Decisiones mías:
- Si el jugador cierra el tutorial a medias, no vuelve a salir solo; queda el botón del menú.
- El paso 5 espera a tener 20 monedas. Mientras tanto se juega libre y la mano reaparece al llegar a 20.
- Si se abre desde el menú con la partida avanzada, los pasos se hacen igual sobre la partida real, sin regalar ni quitar monedas.
- Para los niños que leen se pueden añadir textos cortos traducidos, pero el tutorial tiene que funcionar entero sin ellos.

## Bloque 6 · Aviso del libro en la tienda

Hoy el 📕 está escondido y solo sale de la estantería cuando la cuidadora se acerca (`ShopScene.updateBook`). Mientras tanto solo hay destellos ✨ sueltos, que mucha gente toma por decoración.

- A partir de la **3.ª entrada a la tienda**, si **no se ha abierto nunca el libro**, el 📕 se ve **siempre encima de la estantería (`bookShelf`) y parpadeando**, aunque la cuidadora esté lejos. Tocarlo lo abre, igual que ahora.
- En cuanto se abre el libro una vez, se vuelve para siempre al comportamiento actual: libro escondido y destellos.
- Se cuentan las entradas a la tienda y se guardan en la partida. «Abierto alguna vez» se deduce de lo que ya está guardado, por ejemplo con una página vista o con un indicador nuevo si hace falta.

## Fuera de esta rama

- Las tiendas del hermano de David (los círculos con «T» y los garabatos azules).
- Otras funciones de Luna.
- Sonidos nuevos.

## Lo que no puede pasar

- Que un camino nuevo bloquee una puerta o un recinto, o que deje a los visitantes atascados.
- Que el tutorial necesite saber leer.
- Que una partida antigua se rompa al cargar.

## Al terminar

- Habrá versión nueva: vc 12 si R8 no ha salido antes. Se decide al fusionar.
- Hay que actualizar el README y la spec, y escribir notas de Play en los 13 idiomas para que David las valide.
- Todas las pruebas locales las lanza David; yo le doy los comandos y el resultado esperado.

## Estado de implementación (2026-11-01)

Todo hecho en la rama, con pruebas unitarias y de juego (ver el plan, `docs/superpowers/plans/2026-11-01-luna-jose-caminos-tutorial.md`). Pendiente: que David lo pruebe en el móvil, validar las notas de Play y decidir la versión al fusionar.

## Decisiones tomadas durante la implementación

- **Caminos:** rehechos con el dibujo azul de David sobre la primera propuesta: el borde izquierdo y el derecho bajan desde la avenida de arriba y giran a las esquinas de abajo del cuadrado central (ya no van hasta la entrada); dos tramos cortos unen la avenida con las esquinas de arriba del cuadrado; la pata derecha de la U sigue en línea con el camino central. Para que el camino derecho baje pegado al borde, las ovejas pasan de 11 a 9 casillas de ancho y el estanque se corre 2 a la izquierda (mismo tamaño y lago).
- **Visitantes:** de 4 casillas al azar van a la que tiene menos gente cerca (`pickQuietGoal`); así usan los atajos y la U cuando una zona se llena.
- **Jose:** el panda de los niños tiene fotogramas de 32 px, no de 16, así que se reduce a 22 (no a 13), con las manchas en gris oscuro (opción B elegida por David el 2026-11-02). Se reduce antes de pasar las manchas a gris, para que el gris no ensucie el blanco.
- **Luna:** dibujo propio en `game/art/luna.png`, ajustado con David (sin el pico ni el píxel suelto de la oreja). Comprada, aparece junto a la cuidadora; la sigue por su rastro y, si ella entra en un recinto, espera en la puerta. Por decisión de David **sí entra en la tienda** y curiosea a su aire (peanas, estantería, tendero); al salir aparece otra vez con la cuidadora. Mientras no se ha comprado ocupa una peana como un artículo más. Nombres: Luna, Moon, Lune, Luna (it/pt), Луна, قمر, चंदा, 月亮, ツキ.
- **Tutorial:** por decisión de David el aviso sale **una vez a todos**, también a quien ya jugaba. Mientras dura no salen anuncios ni avisos de votación. La ✕ para dejarlo va debajo de las monedas (arriba en el centro tapaba el título de la ventana de comer). Si el animal está fuera de la pantalla, la mano se pone en el borde con una flecha hacia él.
- **Libro:** la visita se cuenta al entrar y no al girar el móvil. Arreglado de paso un fallo anterior: tras girar el móvil dentro de la tienda, las visitas siguientes heredaban los datos del giro (no se contaban, no había paseo de entrada y las peanas no se renovaban).
- **Matomo:** los tramos de monedas no cambian con los precios nuevos (se rompería la serie). La compra de Luna se cuenta como `tienda | compra | mascota/luna`.

## Cambios tras la prueba en el móvil (2026-11-02)

David probó la rama en el móvil (paquete de publicación con R8, ya con la 2.8.2 de `main` fusionada) y pidió:

- **La tienda está abierta desde el principio**, sin las 20 monedas. Se quitan el candado y el aviso «abre a las 20». Las partidas antiguas también la tienen abierta.
- **El tutorial, más claro:** tras dar de comer, al cerrar la ventana de comer (o pasado un rato) la mano lleva a la puerta de la tienda; al entrar, termina. Ya no hay espera de monedas ni se queda la ✕ sola.
- **Luna mueve las patas:** pegada a la cuidadora avanzaba un fotograma sí y otro no, y pararla en cada uno cortaba la animación. Ahora solo se para tras 200 ms quieta.
- **Jardín de la U:** cerezos altos (tres a cada lado) y flores rosas en estrella en medio, de la versión 16×16 de `vectoraith_tileset_details_temperate_forest_SPECIALS_B_reshade.png` (pack A, ReShade). Sin flores abajo.
- **Página de Luna en el libro**, detrás de la de Mary; se consigue al comprarla. El libro pasa a 51 páginas y solo está completo con Luna. Mary no se traduce; Luna sí. Jose ya tenía la suya (sale al comprarlo).

## Estadísticas del tutorial (añadido el 2026-11-02, pedido por David)

Categoría `tutorial` en Matomo, para saber si la gente ve el tutorial y dónde se atasca:

| Acción | Cuándo | Nombre | Valor |
|---|---|---|---|
| `tutorial-ofrece` | Sale el aviso de la primera vez | — | — |
| `tutorial-aprende` | En el aviso se toca «Aprender» | — | — |
| `tutorial-salta` | En el aviso se toca «Saltar» (o atrás) | — | — |
| `tutorial-menu` | Se abre desde el botón «Aprender» del menú | — | — |
| `tutorial-paso` | Se llega a un paso | `moverse`, `tocar-animal`, `arrastrar-comida`, `monedas`, `tienda` | segundos desde que empezó |
| `tutorial-fin` | Se termina (se entra en la tienda) | — | segundos en total |
| `tutorial-deja` | Se cierra a medias con la ✕ | el paso en el que estaba | segundos desde que empezó |

Si alguien cierra el juego a medias no llega `tutorial-fin` ni `tutorial-deja`: el último `tutorial-paso` dice hasta dónde llegó. Con la tienda abierta desde el principio, el paso del embudo `tienda-abierta` ya no se envía.
