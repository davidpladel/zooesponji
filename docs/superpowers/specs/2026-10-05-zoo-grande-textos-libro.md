# Zoo grande — textos de las 35 páginas nuevas del libro

**Estado:** **aprobados por David (6-oct-2026)**. Están en el juego (`game/src/data/strings.ts`, claves
`book.page.<id>.text`); cambiar uno es cambiar su línea ahí.

Reglas: 20 palabras como mucho, frases completas, sin nada que dependa del idioma (los nombres propios
son claves aparte). Un test comprueba el máximo de palabras.

Cómo leerlos en el juego: tienda → estantería → libro → índice → capítulo. Con el juego en
desarrollo, `await window.__ZOO__.addCoins(12000)` y comprarlo todo desbloquea las 49 páginas.

## Granja

### Estanque

| Animal | Título | Texto |
|---|---|---|
| `cuac` | Cuac, el pato | Cuac es blanco como la leche. Dice su nombre todo el día: ¡cuac, cuac! |
| `charco` | Charco, el pato | Charco tiene la cabeza verde y brillante. Salta en todos los charcos que ve. |
| `pluma` | Pluma, la pata | Pluma sabe que el pan sienta mal a los patos. ¡Ella prefiere el maíz! |
| `remo` | Remo, el pato | Remo nada más rápido que nadie. ¡Mueve las patas como dos remos! |
| `pio` | Pío, el patito | Pío es el más pequeño del estanque. Sigue a Cuac a todas partes. |

### Ovejas

| Animal | Título | Texto |
|---|---|---|
| `lana` | Lana, la oveja | Lana fue la primera oveja de la granja. Su mejor amiga es una gallina. |
| `bolita` | Bolita, la oveja | Bolita es redonda y tostada. Cuando corre parece una pelota de lana. |
| `trueno` | Trueno, la oveja negra | Trueno es la oveja negra. Tiene nombre de tormenta, pero es muy miedoso. |
| `algodon` | Algodón, la oveja | Algodón es tan suave que los visitantes no quieren dejar de acariciarlo. |
| `rizos` | Rizos, la oveja | Rizos tiene la lana gris y llena de caracoles. ¡Nunca se peina! |

### Establo

| Animal | Título | Texto |
|---|---|---|
| `canela` | Canela, el caballo | Canela es marrón como la canela. Por una manzana te sigue hasta el fin del mundo. |
| `pepa` | Pepa, la gallina | Pepa pone un huevo cada mañana. Luego lo cuenta a gritos por todo el establo. |
| `lucero` | Lucero, el caballo | Lucero tiene una mancha blanca en la frente. Parece una estrella. |
| `kiko` | Kiko, el gallo | Kiko canta cuando sale el sol. ¡Y despierta a todo el zoo! |
| `clo` | Clo, la gallina | Clo tiene las plumas naranjas. Busca granos de maíz por todos los rincones. |
| `tizon` | Tizón, el caballo | Tizón es negro como el carbón. De noche solo se le ven los ojos. |
| `miga` | Miga, la gallina | Miga es blanca y esponjosa. Se vuelve loca por una miga de pan. |
| `mancha` | Mancha, el caballo | Mancha tiene las patas blancas. ¡Parece que lleva calcetines! |

## Polo

| Animal | Título | Texto |
|---|---|---|
| `pingu` | Pingu, el pingüino | Pingu anda como un señor con prisa. ¡Pero en el agua es un cohete! |
| `copito` | Copito, el pingüino | Copito regala piedrecitas a quien más quiere. ¿Le das tú una? |
| `frac` | Frac, el pingüino | Frac va siempre muy elegante, de blanco y negro. Parece que va a una boda. |
| `tobogan` | Tobogán, el pingüino | Tobogán se tira por la nieve con la barriga. ¡Yujuuu! |
| `hielo` | Hielo, el pingüino | Hielo es el más pequeño. Tiene las plumas azuladas, como un cubito de hielo. |

## Sabana

### Sabana

| Animal | Título | Texto |
|---|---|---|
| `lola` | Lola, la jirafa | Lola es tan alta que ve todo el zoo. Avisa a todos cuando llega la comida. |
| `raya` | Raya, la cebra | Raya tiene tantas rayas que nadie ha podido contarlas. ¿Lo intentas tú? |
| `brisa` | Brisa, la gacela | Brisa corre tan deprisa que solo notas el aire cuando pasa. |
| `pecas` | Pecas, la jirafa | Pecas tiene las manchas más oscuras. Su lengua es larguísima… ¡y azul! |
| `zigzag` | Zigzag, la cebra | Zigzag nunca anda recto. Sus rayas son de color chocolate. |
| `salto` | Salto, la gacela | Salto no anda: bota. ¡Boing, boing, boing por toda la sabana! |
| `miel` | Miel, la gacela | Miel es clarita y muy dulce. Lo que más le gusta es el maíz. |
| `pipa` | Pipa, la gacela | Pipa es la más pequeña de las gacelas. Se esconde detrás de Lola. |

### Elefantes

| Animal | Título | Texto |
|---|---|---|
| `tembo` | Tembo, el elefante africano | Tembo tiene las orejas enormes. Se abanica con ellas cuando hace calor. |
| `kali` | Kali, el elefante africano | Kali se echa tierra por encima. Así no se quema con el sol. |
| `raja` | Raja, el elefante asiático | Raja se ducha con la trompa. ¡Y ducha a quien pase cerca! |
| `mali` | Mali, el elefante asiático | Mali es marrón y muy lista. Pela los plátanos con la trompa. |

## Textos nuevos del propio libro

| Clave | Texto |
|---|---|
| `book.index.title` | Índice |
| `book.chapter.inicio` | El zoo |
| `book.chapter.centro` | Centro |
| `book.chapter.montana` | Montaña |
| `book.chapter.granja` | Granja |
| `book.chapter.polo` | Polo |
| `book.chapter.sabana` | Sabana |
| `book.chapter.count` | Tienes {n} de {total} |
