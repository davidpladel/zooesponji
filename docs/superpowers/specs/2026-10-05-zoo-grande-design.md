# Zoo grande — más zonas, animales y comidas (diseño)

**Estado:** aprobado por David (5-oct-2026). Los cuatro planes están hechos (ver «Estado de
implementación» al final) y David aprobó los 35 textos del libro el 6-oct-2026
(`docs/superpowers/specs/2026-10-05-zoo-grande-textos-libro.md`). Queda que David lo pruebe entero
antes de fusionar las ramas y publicar la 2.3.0.
**Versión prevista:** 2.3.0.

## Idea

El zoo pasa de 4 recintos a 11. Las zonas nuevas son sabana de herbívoros, pingüinos, granja
(ovejas, caballos, gallinas), estanque de patos y dos recintos de elefantes. Los animales de un
mismo recinto dejan de ser clones: cada uno tiene su aspecto, su nombre y su página del libro.
La cuidadora entra en los recintos para dar de comer a un animal concreto. Llegan 7 comidas
nuevas y los recintos nuevos dan más monedas, pero cuestan más.

Fuera de este bloque (cada uno tendrá su spec): bañar y limpiar, día y noche, clínica veterinaria
y acuario con delfines.

## Qué entra

| # | Recinto (id) | Zona | Residentes (máximo) | Empieza con |
|---|---|---|---|---|
| 1 | `sabana` | Sabana | 2 jirafas, 2 cebras, 4 gacelas | 1 jirafa |
| 2 | `pinguinos` | Polo | 5 pingüinos | 1 pingüino |
| 3 | `cabra` (ya existe) | Montaña | 5 cabras, ahora distintas | — |
| 4 | `ovejas` | Granja, entran también los visitantes | 5 ovejas | 1 oveja |
| 5 | `establo` | Granja | 4 caballos, 3 gallinas, 1 gallo | 1 caballo |
| 6 | `estanque` | Granja | 4 patos y 1 patito | 1 pato |
| 7a | `elefantes-africanos` | Sabana, jaula propia | 2 elefantes africanos | 1 elefante |
| 7b | `elefantes-asiaticos` | Sabana, jaula propia al lado | 2 elefantes asiáticos | 1 elefante |

Total: 7 recintos nuevos y 35 animales nuevos. Los recintos de león, pantera y panda no cambian.

Dos cambios respecto a lo pedido:

- **Ñu:** no hay sprite de ñu en los packs. El tercer herbívoro de la sabana es la **gacela de
  Thomson** (aprobado), con 4 gacelas.
- **Elefantes:** africanos y asiáticos van en **dos jaulas distintas**, cada una con su valla, su
  puerta, su cartel y su compra en la tienda, una al lado de la otra. Se pidieron "5 elefantes,
  2 africanos y 2 asiáticos", que suman 4: el diseño usa 2 + 2. Si se quiere el quinto, sería un
  tercer asiático (el pack trae dos colores de asiático y solo uno de africano).

## Enfoques considerados

| Enfoque | Qué supone | Veredicto |
|---|---|---|
| A. Un recinto por especie, como hoy | Sin tocar el motor, pero jirafa, cebra y gacela irían en tres jaulas separadas y el establo no podría mezclar caballos y gallinas | Descartado: no da lo pedido |
| **B. Recinto con lista de residentes** | El recinto es lo que se compra; dentro hay una lista ordenada de animales, cada uno con especie, aspecto y página | **Elegido** |
| C. Animales sueltos por zonas sin vallas | Más vistoso, pero rompe el flujo "ir a la puerta y dar de comer" y la tienda por recintos | Descartado: demasiado cambio |

## Modelo de datos

Hoy "recinto" y "animal" son lo mismo (`AnimalId`). Se separan en tres piezas:

- **Especie** (`data/species.ts`): reacciones a las comidas, monedas, sonido y animaciones.
  Ids: `leon`, `cabra`, `pantera`, `panda`, `jirafa`, `cebra`, `gacela`, `pinguino`, `oveja`,
  `caballo`, `gallina`, `gallo`, `pato`, `elefante-africano`, `elefante-asiatico`.
- **Recinto** (`data/pens.ts`): bioma, precio, si se puede entrar y su lista de residentes.
- **Residente**: `{ id, species, look }`. El `id` es también el id de su página del libro
  (`gordi`, `nube`…). `look` dice qué hoja de sprites usa.

Reglas:

- `counts` del guardado pasa a ir por recinto: cuántos residentes han llegado. El residente
  número *k* de la lista está en el recinto si `counts[recinto] >= k`. Así el orden de llegada
  es fijo y el libro sabe qué página abrir.
- Los ids `leon`, `cabra`, `pantera` y `panda` se mantienen como ids de recinto, de modo que
  **las partidas guardadas siguen valiendo** sin migración: los recintos nuevos se leen como 0.
- **Comprar un recinto trae solo su primer residente.** El resto se compra de uno en uno.
- El "otro animal" de la tienda compra el siguiente residente de la lista. Su precio sale de la
  especie de ese residente (una gallina cuesta menos que un caballo).
- Las reacciones pasan a ser parciales: una especie solo lista las comidas que salen en su
  bandeja. Comida que no está en la lista, no aparece.
- El test de coherencia se amplía: cada residente tiene especie, hoja de sprites y página; cada
  recinto tiene su rectángulo y su puerta en el mapa; cada especie tiene entre 4 y 5 comidas.

## La cuidadora entra a dar de comer

Hoy la cuidadora se queda en la puerta y toca un bocadillo. Ahora **entra en el recinto**, en
todos los recintos abiertos (también los cuatro que ya existen):

1. La puerta de un recinto comprado es transitable para la cuidadora. Los animales no salen.
2. Dentro, tocar a un animal lleva a la cuidadora hasta él. Al llegar se abre `FeedScene`
   con **ese animal**, su nombre y la bandeja de su especie (sin bocadillo intermedio, igual que
   hoy pasa al llegar a la puerta).
3. Tocar el recinto desde fuera sigue funcionando: la cuidadora entra sola y va al animal tocado.
4. Los animales siguen paseando; el que se va a alimentar se para y la mira mientras se acerca.

Con esto los recintos mixtos (sabana, establo) no necesitan nada especial: se da de comer al
animal que se toca. Y cada animal queda identificado (`residentId`) en el evento de dar de
comer, que es lo que hará falta más adelante para "este animal está malo", bañar a uno concreto
o la clínica. En este bloque ese dato solo se usa para el nombre y las monedas.

**Preparado para iconos de estado:** más adelante cada animal llevará un icono encima cuando
tenga hambre o esté malo. Este bloque no lo implementa, pero deja el sitio: cada residente
dibujado en el mundo tiene un punto de anclaje sobre la cabeza, reservado para el icono de estado.

**Visitantes en la granja:** los visitantes siguen andando solo por los caminos, salvo en el
recinto `ovejas`, que es una granja de contacto: entran por la puerta, pasean entre las ovejas,
se paran junto a alguna y salen. Como mucho 3 visitantes dentro a la vez. Las ovejas se apartan
un poco de quien pasa cerca y siguen un rato a la cuidadora. Cuando un visitante y una oveja
se juntan, salen **corazoncitos** sobre los dos, con el mismo efecto que ya tiene la reacción
especial de la cabra con el conejo.

## Animales distintos entre sí

Cada residente tiene su hoja de sprites. Se busca en este orden:

1. Dibujo de los niños en `art-work/terminados/<residente>.png` (como el panda).
2. Otra hoja del pack, cuando existe una variante real.
3. Recolor automático de la hoja base, definido en `art.config.json`.

| Especie | Hojas reales en los packs | Qué falta |
|---|---|---|
| Caballo | 12 (granja y salvajes) | Nada: se eligen 4 |
| Gallina y gallo | 4 gallinas y 4 gallos | Nada |
| Pato | blanco, ánade macho, ánade hembra, patito | 1 recolor |
| Elefante | 1 africano, 2 asiáticos | 1 recolor del africano |
| Pingüino | emperador y africano | 3 variantes |
| Cabra | 1 | 4 variantes |
| Oveja | 1 | 4 variantes |
| Jirafa y cebra | 1 de cada | 1 variante de cada |
| Gacela | 1 | 3 variantes |

El importador gana un recolor genérico por tabla de colores (hoy solo existe el de la pantera).
Límite: un recolor cambia colores, no dibuja manchas. Las "marcas" de cabras, ovejas, patos y
pingüinos (parche en el ojo, calcetines, pecho moteado, oveja negra) se hacen con una **capa de
marcas**: un PNG pequeño que se pinta encima de cada fotograma. **Claude dibuja cada una** (decidido), en el
repo privado igual que la carne, y los niños pueden sustituir las que quieran. Ningún arte de los packs entra en
el repo público.

## Comidas

Siguen las 4 de ahora (piedra, carne, conejo, zanahoria) y entran 7, todas con icono ya
disponible en el pack de iconos: **pescado, manzana, plátano, lechuga, maíz, pan y huevo**.
Además entran una **gallina**, que no se come sino que se hace amiga (como el conejo), y una
cosa rara: un **calcetín**, dibujado por Claude. Total: 13.
Cada especie enseña 4 o 5 en su bandeja.

**Regla de las bandejas** (decidida con David):

- En cada bandeja hay al menos una comida de verdad que ese animal **rechaza** y que otro animal
  sí come. Así el niño aprende que no todo vale para todos.
- Hay **cosas raras** (piedra, calcetín) que dan error casi siempre. La gracia es que a algún
  animal sí le gustan: la cabra come piedras y al pingüino le encantan.

| Especie | Come | Especial | Rechaza (comida de otros) | Rechaza (cosa rara) |
|---|---|---|---|---|
| Jirafa | lechuga, manzana | plátano | carne | calcetín |
| Cebra | lechuga, zanahoria | manzana | pescado | piedra |
| Gacela | lechuga, zanahoria | maíz | carne, huevo | — |
| Pingüino | pescado | piedra (regalan piedrecitas) | zanahoria, pan | calcetín |
| Oveja | lechuga, maíz | gallina (se hacen amigas) | carne | calcetín |
| Caballo | zanahoria, maíz | manzana | huevo | piedra |
| Gallina | maíz, lechuga | pan | pescado | piedra |
| Gallo | maíz, pan | — | huevo, carne | calcetín |
| Pato | maíz, lechuga | pescado | pan (les sienta mal: lo cuenta el libro) | piedra |
| Elefante africano | lechuga, manzana | plátano | carne | calcetín |
| Elefante asiático | lechuga, plátano | manzana | pescado | piedra |
| Cabra | piedra, zanahoria, lechuga | conejo | carne | — |

**Amigos:** el conejo y la gallina no se comen. Cuando son la reacción especial (cabra y panda
con el conejo, oveja con la gallina), aparecen al lado del animal, saltan juntos, se dan un
achuchón y salen corazones. Las demás reacciones especiales se celebran con saltos y corazones.

León, pantera y panda no cambian: ya cumplen la regla (rechazan la zanahoria o la carne, y la
piedra).

## Monedas y precios

Hoy dar de comer da 1–2 monedas (4 con la reacción especial del panda) y los recintos cuestan 50
y 100. No hay espera entre comidas: cada arrastre acertado paga. Por eso el precio de un recinto
se mide en arrastres: cada recinto nuevo cuesta unos 60–160 arrastres del mejor animal que ya
se tiene, que es el ritmo que hay hoy entre pantera y panda.

| Orden | Recinto | Precio | Come / especial | Otro animal |
|---|---|---|---|---|
| 1 | Estanque | 150 | 3 / 5 | 30 |
| 2 | Ovejas | 250 | 4 / 6 | 40 |
| 3 | Establo | 400 | caballo 5 / 8; gallina y gallo 3 / 5 | caballo 60; gallina y gallo 30 |
| 4 | Pingüinos | 600 | 6 / 9 | 80 |
| 5 | Sabana | 900 | jirafa 8 / 12; cebra 6 / 9; gacela 5 / 8 | jirafa 150; cebra 120; gacela 100 |
| 6 | Elefantes africanos | 1300 | 10 / 15 | 200 |
| 7 | Elefantes asiáticos | 1600 | 10 / 15 | 200 |

Completar todo lo nuevo cuesta unas 7.300 monedas (5.200 en recintos y 2.090 en animales extra). Con el rango 4–10 pedido, los animales
grandes pagan más y los de granja menos; el especial llega a 15 solo en los elefantes.

La tienda no enseña los 7 recintos a la vez: muestra **los 3 siguientes** de la lista de arriba,
más los "otro animal" de los recintos abiertos, para no pasar de las peanas que hay.

## Mapa

El mapa crece de 48×35 a unas 96×60 casillas. El parque actual queda en el centro, intacto, y
del anillo de caminos salen tres zonas:

- **Norte, sabana:** el recinto `sabana` (grande, unas 22×12) y, al lado, los dos de elefantes:
  dos jaulas separadas, cada una con su valla y su puerta, con un pasillo de césped entre ellas
  y el mismo terreno de sabana que el león.
- **Oeste, polo:** pingüinos con terreno de tundra y un trozo de agua.
- **Este, granja:** ovejas, establo y estanque juntos, con terreno de pradera. El estanque usa
  el agua animada que ya existe.

Lo genera `make-zoo-map.mjs`, como ahora. Cada zona tiene su cartel a la entrada. El mapa se ve
entero desde el principio; los recintos sin comprar llevan candado y precio.

**Puertas:** todas las puertas de recintos comprados dejan pasar a la cuidadora; la de `ovejas`
también a los visitantes. El interior de cada recinto entra en la búsqueda de caminos, con sus
rocas, árboles y agua como obstáculos (ya están marcados para el paseo de los animales).

## Libro

Pasa de 14 a 49 páginas, una por residente nuevo. Para que no sean 49 páginas seguidas:

- El libro se divide en **capítulos por zona** (Centro, Montaña, Granja, Polo, Sabana), cada uno
  con una página de portadilla que no cuenta en el total.
- Un índice con los cinco capítulos, tocable, y el contador "n de total" por capítulo.
- Las cabras conservan sus nombres; cada una recibe su aspecto (Nube blanca, Tolón con campanita).

Nombres propuestos para los residentes nuevos:

| Recinto | Nombres |
|---|---|
| Sabana | jirafas Lola y Pecas; cebras Raya y Zigzag; gacelas Brisa, Salto, Miel y Pipa |
| Pingüinos | Pingu, Copito, Frac, Tobogán, Hielo |
| Ovejas | Lana, Bolita, Trueno (la negra), Algodón, Rizos |
| Establo | caballos Canela, Lucero, Tizón y Mancha; gallinas Pepa, Clo y Miga; gallo Kiko |
| Estanque | Cuac, Charco, Pluma, Remo y el patito Pío |
| Elefantes | africanos Tembo y Kali; asiáticos Raja y Mali |

Los textos de las 35 páginas (20 palabras como mucho) se escriben como primer paso del plan y
David los aprueba antes de programar, igual que en el libro original. Siguen las reglas de
idiomas del spec del libro: todo en `strings.ts`, frases completas, ids en el guardado.

## Riesgos

- **Rendimiento en móvil:** casi 50 animales paseando. Los animales de recintos fuera de
  pantalla no se actualizan.
- **Tamaño de la tienda:** `ShopScene` ya es el archivo más largo (612 líneas). La regla de
  "los 3 siguientes" evita rehacer el interior.
- **Arte:** 18 variantes entre recolores y capas de marcas, todas dibujadas por Claude. Es la parte más lenta y no depende
  del código: puede avanzar en paralelo.
- **Entrar en los recintos:** cambia cómo se abre `FeedScene` en los cuatro recintos que ya
  existen. Hay que comprobar que el león, la pantera y el panda siguen jugándose igual de fácil.
- **Monedas sin espera:** con 10–15 monedas por arrastre, los elefantes pagan cualquier cosa
  futura en poco tiempo. Los bloques siguientes tendrán que poner sus precios con esto en cuenta.

## Pruebas

- Unitarias: residentes por `counts`, compra del siguiente residente y su precio, bandeja por
  especie, guardado antiguo leído sin perder nada, capítulos y páginas del libro.
- Coherencia: especie ↔ sprites ↔ página ↔ recinto en el mapa.
- Unitarias: camino de la cuidadora hasta un animal dentro del recinto; los animales no cruzan la
  puerta; tope de visitantes dentro de `ovejas`.
- E2E: comprar el estanque, entrar y dar de comer a un pato; dar de comer a una jirafa y a una
  cebra en la sabana; ver un visitante dentro del recinto de ovejas; dar de comer al león
  entrando en su recinto; abrir el libro por un capítulo.

## Orden de trabajo

Cuatro planes, cada uno deja el juego funcionando:

1. **Cimientos:** modelo especie/recinto/residente, bandeja por especie y la cuidadora entra a
   dar de comer, con los 4 recintos actuales.
2. **Arte y comidas:** importador con variantes, recolor genérico y capa de marcas; cabras
   distintas; las 7 comidas nuevas.
3. **Mapa y recintos:** mapa grande, los 7 recintos nuevos, recintos mixtos, visitantes y
   corazones en `ovejas`.
4. **Tienda y libro:** "los 3 siguientes" y precios, libro por capítulos con los 35 textos (David
   los aprueba antes de programarlos), test de textos, docs y versión 2.3.0.

## Decisiones tomadas con David (5-oct-2026)

- Gacela en lugar de ñu, con 4 gacelas.
- Elefantes africanos y asiáticos en jaulas separadas.
- Los visitantes entran en el recinto de ovejas; en el resto siguen por los caminos.
- La cuidadora entra en los recintos para dar de comer a un animal concreto.
- Claude dibuja todas las variantes de aspecto.
- Corazoncitos cuando un visitante se junta con una oveja.
- Cada recinto se compra con 1 animal; los demás se compran después.
- Gordi pasa a ser tostada (la blanca es Nube); Chispa se dibuja más pequeña.
- Regla de las bandejas: al menos una comida de otros que el animal rechaza, y cosas raras.
- La oveja se hace amiga de una gallina (igual que la cabra del conejo).

## Multi-idioma (bloque aparte, antes de Play)

El selector de idioma y las traducciones son su propio spec, que va justo después de este
bloque y antes del lanzamiento en Play Store. Este bloque no lo implementa, pero no puede
estorbarlo: todos los textos nuevos (nombres, páginas, comidas, carteles de zona, tienda) van
en `strings.ts` como frases completas, ningún dibujo lleva letras y el guardado solo guarda ids.
Un test comprueba que no queda ningún texto visible fuera de `strings.ts`.

## Decisiones cerradas

- Elefantes: 2 africanos y 2 asiáticos.
- Nombres de los 35 animales: aprobados los propuestos.

## Estado de implementación

| Plan | Estado | Archivo |
|---|---|---|
| 1. Cimientos | ✅ Hecho | `docs/superpowers/plans/2026-10-05-zoo-grande-1-cimientos.md` |
| 2. Arte y comidas | ✅ Hecho | `docs/superpowers/plans/2026-10-05-zoo-grande-2-arte-y-comidas.md` |
| 3. Mapa y recintos | ✅ Hecho | `docs/superpowers/plans/2026-10-05-zoo-grande-3-mapa-y-recintos.md` |
| 4. Tienda y libro | ✅ Hecho | `docs/superpowers/plans/2026-10-05-zoo-grande-4-tienda-y-libro.md` |

### Decisiones tomadas durante la implementación (plan 1)

- `data/animals.ts` se queda como tabla de especies (no se renombra a `species.ts`): `AnimalId` es
  la especie y `PenId` (`data/pens.ts`) el recinto.
- Al llegar junto al animal la ventana de comer se abre sola, sin bocadillo intermedio, igual que
  antes pasaba al llegar a la puerta. `Pens.anchorOf(residente)` da el punto sobre la cabeza para
  los futuros iconos de hambre o enfermedad.
- La cuidadora tiene su propia rejilla (caminos más interior de recintos abiertos); los visitantes
  usan la de caminos.
- En el mapa, la propiedad de recintos y puertas sigue llamándose `animalId` hasta que el plan 3
  regenere el mapa.

### Decisiones tomadas durante la implementación (plan 2)

- Las "marcas" no son una capa pintada a mano sino **retoques declarados** en `art.config.json`:
  cambio de colores exactos dentro de una zona del fotograma (calcetines, lomo) y puntos sueltos
  (la campanita). Se ajustan mirando `npm run art:preview -- <aspecto>`.
- El dibujo de los niños sigue mandando: `art-work/terminados/<aspecto>.png` sustituye a la hoja
  del pack y a sus retoques.
- El manifiesto de arte va por aspecto (`cabra`, `cabra-gordi`…). Si falta la hoja de un aspecto,
  ese animal se dibuja con la de su especie; para verlo distinto hay que volver a ejecutar
  `npm run art:import`.
- Cabras: Gordi tostada, Nube blanca (la del pack), Galleta marrón con calcetines, Tolón gris con
  campanita, Chispa oscura y más pequeña.
- La campanita de Tolón son 2 px bajo la barbilla. El fotograma central del paso va 1 px más alto
  que los otros dos, así que sus puntos se declaran aparte con `cols`.
- Chispa se reduce a 13 px con `shrink` en su aspecto. La reducción se queda con el píxel más
  oscuro de los que cubre cada punto: con un muestreo simple se perdían un ojo y el contorno.
- De las comidas nuevas, en este plan solo se usa la lechuga (cabra). El resto, y el calcetín,
  entran con las especies del plan 3.
- La animación de amistad dibuja al amigo que se ha dado (conejo o gallina, `FoodDef.friend`); una
  reacción especial con otra comida se celebra con saltos y corazones.
- Regla de las bandejas, con test: cada animal rechaza al menos una comida que otro sí come.

### Decisiones tomadas durante la implementación (plan 3)

- El mapa mide 96×60. El parque de siempre queda en el centro (desplazado 24 a la derecha y 20 hacia
  abajo) y `make-zoo-map.mjs` lo escribe en sus coordenadas de antes.
- La propiedad de recintos y puertas del mapa se llama `penId`.
- Orden de llegada en los recintos mixtos. Sabana: Lola, Raya, Brisa, Pecas, Zigzag, Salto, Miel, Pipa.
  Establo: Canela, Pepa, Lucero, Kiko, Clo, Tizón, Miga, Mancha.
- Al dar de comer reacciona solo el animal que ha comido (primero reaccionaban también los de su especie; David pidió que fuera solo uno, 6-oct-2026).
- Los animales grandes llevan `radius` en su especie: se separan más y se tocan por el cuerpo.
- La charca de pingüinos y la del estanque bloquean el paso, como la catarata de la pantera: los patos
  pasean alrededor.
- Visitantes: 14 en lugar de 8 (el mapa es cuatro veces mayor). En `ovejas`, la oveja más cercana a un
  visitante parado se le acerca, y los corazones salen cuando están a menos de 22 px.
- Adelantado del plan 4, lo justo para que el juego funcione: la tienda enseña solo los 3 recintos
  siguientes (`PENS_ON_SALE`) y los 35 residentes tienen título (`book.page.<id>.title`), que la ventana
  de dar de comer usa como nombre. Las páginas, sus textos y los capítulos siguen en el plan 4.
- Con muchos recintos abiertos los «otro animal» pasaban de las 5 peanas; lo resolvió el plan 4 (la
  tienda enseña 5 artículos por precio).
- Las dos panteras y los dos pandas siguen compartiendo hoja (son los dibujos de los niños); en el
  resto de recintos cada animal tiene la suya.
- `npm run art:compare` enseña varios aspectos juntos. Con él se separaron más los tonos de las
  gacelas y de Pecas, que con los colores de partida casi no se distinguían.
- En la tabla de comidas el huevo lo rechazan la gacela, el caballo y el gallo, y no lo come nadie.
  La regla de las bandejas se cumple igual (cada uno rechaza además otra comida que alguien sí come).
  **Decidido por David (5-oct-2026): se queda así, el huevo no lo come nadie.**

### Decisiones tomadas durante la implementación (plan 4)

- **Tienda (decidido por David, 5-oct-2026):** enseña como mucho 5 artículos, los siguientes por
  precio, mezclando recintos por abrir y «otro animal». Sustituye a «los 3 recintos siguientes». Lo
  completo ya no ocupa peana; el sello AGOTADO solo sale al final, cuando quedan menos de 5 cosas que
  comprar, para que la tienda no se quede vacía.
- **Libro:** las páginas ya no se escriben a mano: salen de los recintos (`PENS`) según
  `CHAPTER_PENS`. Hay un capítulo más de los previstos, `inicio` (portada, historia y Mary), que no
  lleva portadilla ni sale en el índice.
- Orden del libro: portada, índice, historia, Mary y los capítulos Centro (león, pantera, panda),
  Montaña (cabras), Granja (estanque, ovejas, establo), Polo y Sabana (sabana y elefantes). Antes las
  cabras iban detrás del león; los ids de página no cambian, así que lo leído se conserva.
- El número de abajo de cada página es su puesto dentro del capítulo («Granja · 3 de 18»). El índice y
  las portadillas no cuentan, no llevan estrella de «nueva» y no se guardan como leídas.
- El máximo de 20 palabras se comprueba con un test. La página de Mary (21 palabras, del libro
  original) queda fuera de la regla.
- Test de textos: en `src/scenes` y `src/world` no puede haber cadenas con dos palabras seguidas
  fuera de `strings.ts`. Encontró el «Zoo Esponji» del portón, que ya sale de `title.name`.
- La página no declaraba icono y el navegador pedía `favicon.ico` (404): ahora usa el logo.

### Cambios tras la primera prueba de David (6-oct-2026)

- **Tienda:** lo que hay en las peanas se decide al entrar (`shopStock`) y no cambia mientras se está
  dentro. Antes, al agotarse un animal, otro ocupaba su peana al instante y se compraba sin querer con
  el mismo toque. Ahora la peana se queda con su sello AGOTADO y lo siguiente sale en la próxima visita.
- **Dar de comer:** la comida solo se abre al tocar un animal. Pasar andando a su lado ya no la abre
  (con varios animales por recinto saltaba a cada paso).
- **Estanque:** el recinto es más alto (10×13) y lleva un lago de 6×6 casillas (`lake-grassland`,
  montado con las nueve piezas de la charca del pack). Sigue sin poder pisarse: los patos pasean por la
  orilla.
- **Miga** tiene ojos (la gallina sedosa del pack no los trae; se pintan con `dots`).
- **Kiko** es el gallo de colores del pack: el gallo blanco era casi igual que la gallina blanca.
