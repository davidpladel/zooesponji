# El libro del Zoo Esponji — diseño y plan

**Estado:** implementado (30-sep-2026), textos aprobados por David.

## Idea

En la estantería de la tienda hay un libro escondido. Al tocarlo se abre un álbum de páginas que
cuenta la historia del zoo. Cada animal que compras añade su página, con nombre propio y una
mini historia. Las páginas que faltan se ven como silueta con "???", para dar ganas de completarlo.

## Qué hacen otros juegos (y qué copiamos)

| Juego | Qué hace | Qué nos quedamos |
|---|---|---|
| Pokédex (Pokémon) | Huecos numerados, silueta hasta que lo consigues | Silueta + "???" y contador "7 de 14" |
| Critterpedia / museo (Animal Crossing) | Entrada corta y simpática por cada cosa conseguida | 2 frases por página, tono cariñoso |
| Álbum de cromos / Toca Boca | Todo visual, casi sin leer | Dibujo grande, texto grande, pocas palabras |
| Stardew Valley (colecciones) | Aviso al conseguir algo nuevo | Aviso "📖 ¡Nueva página!" y el libro brilla hasta leerla |

Reglas para niños pequeños: **una página por pantalla, dibujo arriba, máximo ~20 palabras**,
frases cortas, letra grande, pasar página con flechas grandes o deslizando. Sin menús.

## Páginas (14)

Siempre desbloqueadas: 1 portada, 2 historia, 3 Mary, 4 Bills, 5 Sasha, 6 primera cabra.
El resto se desbloquean al comprar. **Orden del libro = orden del parque** (león, cabras, pantera,
panda); las cabras se nombran por orden de llegada (la 2.ª que compras es Nube, la 3.ª Galleta…).

1. **Portada** — *Descubre Zoo Esponji.* "Cuenta lo que pasa en el zoo. ¡Llénalo de amigos!"
2. **Las jaulas abiertas** — "Había una vez un zoo triste, con jaulas cerradas. Un día alguien abrió
   las puertas… ¡y nació el Zoo Esponji!"
3. **Mary, la cuidadora** — "Soy Mary. Doy de comer a los animales y les busco sitio. ¡Mis comidas
   favoritas son los espaguetis y el chocolate!"
4. **Bills, el león** — "Bills fue el primero en llegar. Ruge muy fuerte… pero le dan miedo
   las mariposas."
5. **Sasha, la leona** (la compañera que ya pasea con él) — "Sasha cuida de Bills. Cuando él se
   asusta, ella le da un abrazo." *(texto nuevo, pendiente de aprobar)*
6. **Gordi, la cabra** — "Gordi se come todo lo que encuentra. ¡Una vez se comió un calcetín de Mary!"
7. **Nube, la cabra** (2.ª) — "Nube es blanca y blandita. Le encanta dormir la siesta al sol."
8. **Galleta, la cabra** (3.ª) — "Galleta salta más alto que nadie. ¡Boing, boing!"
9. **Tolón, la cabra** (4.ª) — "Tolón lleva una campanita. Así Mary siempre sabe dónde está."
10. **Chispa, la cabra** (5.ª) — "Chispa es la más pequeña."
11. **Noche, la pantera** (recinto) — "Noche es negra como el carbón. Corre tan rápido que parece
    que vuela."
12. **Sombra, la pantera** (2.ª) — "Sombra juega al escondite. ¿La encuentras? ¡Siempre gana!"
13. **Mochi, el panda** (recinto) — "Mochi come bambú todo el día. Ñam, ñam… y otra siesta."
14. **Pompón, el panda** (2.ª) — "Pompón da volteretas. ¡Se ríe hasta el león!"

Contraportada al completarlo todo: "¡Ayuda a hacer crecer el Zoo! Gracias por cuidar de todos,
Mary." y una fiesta de confeti.

Los nombres salen también en el juego: el cartel del recinto sigue diciendo el animal, y al tocar
a uno puede salir su nombre en un bocadillo (opcional, fase 2).

## Preparado para varios idiomas

El juego ya tiene todos los textos en `src/data/strings.ts` con `t(clave)`, así que el libro sigue
esa regla y deja el terreno listo para cuando llegue el multi-idioma:

- **Ningún texto escrito en el código ni en los dibujos.** Títulos, historias, "???", "6 de 14",
  "¡Nueva página!" y la contraportada van con claves `book.*` (`book.page.gordi.title`,
  `book.page.gordi.text`…). Las ilustraciones no llevan letras (si los niños dibujan, sin texto).
- **Frases completas, nunca pegadas a trozos.** "Gordi, la cabra" es una clave entera, no
  `nombre + ", la " + animal`: en otros idiomas cambian el artículo, el género y el orden.
  Variables solo con `{n}`/`{total}` dentro de la frase ("{n} de {total}").
- **Los nombres propios también son claves** (`book.name.gordi`), por si en inglés conviene
  adaptar alguno (Gordi → Chubby). Los datos del libro guardan el id (`gordi`), no el texto.
- **El guardado guarda ids de página**, nunca textos: cambiar de idioma no rompe la partida.
- **Maqueta elástica**: la caja de texto aguanta un 40 % más de largo (el alemán y el francés
  alargan) reduciendo la letra hasta un mínimo; lo probamos con un texto largo en los tests.
- **Fuera del libro**: al cambiar "el cuidador" por "la cuidadora" se hace en `strings.ts`, que es
  el único sitio.
- **No hacemos todavía** el selector de idioma ni `STRINGS_EN`: eso será su propio bloque. Solo
  dejamos que añadirlo sea copiar `STRINGS_ES` y traducir.

## Dibujos

Fase 1: el sprite del animal en grande sobre un marco de papel (como un cromo). Mary usa el sprite
de la cuidadora. Portada e historia: composición con el portón del zoo.
Fase 2 (opcional): Daniela y Adrián dibujan las 14 ilustraciones en Piskel; si existe
`art-work/terminados/libro-<página>.png`, sustituye al sprite automáticamente (igual que el panda).

## Cómo se encuentra

- En la tienda, un libro de la estantería asoma y brilla un poco cada pocos segundos.
- La primera vez que entras, el tendero dice: "¡Psst! Hay un libro secreto en la estantería…"
- Al comprar un animal: aviso "📖 ¡Nueva página!" y el libro brilla hasta que se lee esa página;
  el libro se abre directamente por la página nueva.

## Plan de implementación

1. **Datos puros** `src/data/book.ts`: lista de páginas (id, título, texto, animalId, índice del
   animal). `src/core/book.ts`: `unlockedPages(state)` a partir de `counts` (la cabra n.º k se
   desbloquea con `counts.cabra >= k`) y `newPages(state, seen)`. Tests unitarios.
2. **Guardado**: añadir `bookSeen: string[]` al estado, subir versión del guardado con migración
   (partidas viejas: las páginas ya desbloqueadas cuentan como vistas salvo la de Mary). Tests.
3. **BookScene**: libro a pantalla completa, una página, flechas grandes, deslizar, ✖ y botón
   atrás de Android. Página bloqueada = silueta negra + "???". Contador "6 de 14". Sonido de hoja.
4. **Tienda**: libro interactivo en la estantería (zona táctil grande), brillo, frase del tendero
   la primera vez; abrir el libro desde ahí. Aviso "¡Nueva página!" tras comprar.
5. **Textos** en `strings.ts` (claves `book.*`, ver "Preparado para varios idiomas"); test que
   compruebe que cada página del libro tiene su título y su texto.
6. **Pruebas e2e**: abrir el libro desde la estantería, comprar una pantera y ver que aparece Noche.
7. **Docs**: README, estado del spec y plan.

## Estado de implementación

Hecho (30-sep-2026): pasos 1–6 del plan.

## Decisiones tomadas durante la implementación

- El progreso va en `SaveData.book = { seen, hinted }` sin subir `SAVE_VERSION`: es un campo opcional
  y las partidas antiguas lo leen como libro vacío (así brilla y se descubre).
- El libro se abre por donde te quedaste (`book.page` en el guardado; al principio, la portada). Al
  comprar un animal, su página pasa a ser la de apertura (`newlyUnlockedPages`).
- El tendero cuenta el secreto una sola vez, tras el saludo, y solo si no está hablando de un animal.
- El libro está escondido en la estantería `shelf-b` (la de la derecha del mueble de libros): solo
  destella de vez en cuando (más si hay páginas sin leer). Tocar la estantería lleva a la cuidadora
  hasta ella; al acercarse, el libro salta fuera y tocarlo lo abre. Mientras está abierto la tienda
  se pausa y el botón atrás de Android lo cierra.
- Sin flecha ◀ en la primera página ni ▶ en la última; abajo "3 de 14".
- La portada lleva el logo del juego (el león del icono, `public/logo.png`).
- Cascada: 5 filas de acantilado completas (el borde de arriba cierra bien) con la catarata
  con el río llegando por arriba entre las mesetas (agua E) y la catarata arriba/medio/abajo en la
  pared (la de abajo trae la espuma), 2 filas de agua debajo con brillo (reflejo R) y un nenúfar: 112x112. Para que
  quepa, el recinto de la pantera crece a 10 de alto (sube 2 filas y se come el césped de encima) y
  su cartel pasa a la fila 18.
- Dibujos fase 1: sprite del animal (Sasha = la leona compañera, Mary = la cuidadora, portada e
  historia = el portón del zoo); bloqueadas en silueta.
- "El cuidador" → "la cuidadora": en pantalla no salía; solo estaba en comentarios y nombres de tests.
