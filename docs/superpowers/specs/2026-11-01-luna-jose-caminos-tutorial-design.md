# Caminos nuevos, perrita Luna, cría Jose, tutorial visual y aviso del libro — diseño

Fecha: 2026-11-01 · Rama: `feat/luna-jose-caminos-tutorial` (sale de `main`) · Estado: pendiente de aprobar

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

- Cuando el jugador haya **entrado más de 3 veces a la tienda** (es decir, a partir de la 4.ª) y **no haya abierto nunca el libro**, la estantería donde está (`bookShelf` de `ShopInterior`) **parpadea** para que se vea que ahí hay algo.
- El parpadeo deja de salir para siempre en cuanto se abre el libro.
- Se cuentan las entradas a la tienda y se guardan en la partida.

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
