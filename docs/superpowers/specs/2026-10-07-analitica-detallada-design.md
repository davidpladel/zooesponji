# Analítica detallada: qué gusta del juego

Fecha: 2026-10-07 · Estado: diseño aprobado en conversación, pendiente de revisión escrita y de plan. Amplía `2026-10-07-analitica-anonima-matomo-design.md`, que sigue vigente en todo lo que aquí no se cambia.

## Objetivo

Saber, con el máximo detalle que permite una medición sin identificadores, **qué gusta más del juego** para potenciarlo: a qué animal concreto se da más de comer y con qué comida, qué recinto se visita más, cuántas veces se abre el libro y qué páginas se leen, qué se desea y no se puede comprar, dónde se tropieza y dónde se abandona. Los datos tienen que poder **explotarse después**: Claude los leerá por la API de informes de Matomo y sacará conclusiones.

## Límites que no cambian

- **Sin identificador.** No se sigue a un jugador de un día a otro. Todo es agregado. Lo impiden Play Families y la exención de consentimiento de AEPD y CNIL.
- **Modo CNIL de Matomo:** sin registro de visitas; los datos filtrados por segmento se redondean a decenas. Por eso **ningún análisis puede depender de segmentos**: cada cruce necesario viaja ya hecho en el evento.
- **Solo contenido del juego.** Los ids de animales (`gordi`, `mochi`), comidas, recintos y páginas son personajes y objetos del juego, no datos de nadie. Se levanta la regla anterior de «no enviar nombres de residentes».
- Medir nunca rompe el juego: todo fallo se traga.

## Decisiones

1. **Animal concreto** (id de residente) en cada evento, no solo recinto.
2. **Detalle combinado en el nombre** del evento (`gordi/zanahoria`), con `/` como separador.
3. **Cada acción es única en todo el catálogo** (no hay dos categorías con la misma acción). Así los informes de Matomo «acción × nombre» se leen sin segmentos.
4. **Jugadores únicos sin identificador:** el dispositivo recuerda qué ha hecho hoy, esta semana y alguna vez, y avisa solo la primera vez (alcance diario, alcance semanal, descubrimiento).
5. **Medianas por tramos:** donde importa la distribución se envía el tramo además del número.
6. **Denominador justo:** una vez al día se envía qué tiene el jugador, para comparar cada animal solo entre quienes lo tienen.
7. **Juego sin conexión:** los eventos se guardan en el dispositivo y se envían al volver la red **con su fecha y hora reales**.
8. **Lectura por API** con un usuario de Matomo de solo lectura; el token nunca entra en la app ni en el repositorio.

## Diseño

### 1. Catálogo de eventos (`src/core/eventCatalog.ts`, nuevo, lógica pura)

Única fuente de verdad: categorías, acciones, constructores de nombre y tramos. Nadie escribe una cadena de evento fuera de este fichero. Un test comprueba que ninguna acción se repite y que la tabla de esta spec coincide con el código.

Abreviaturas: `R` = id de residente, `C` = id de comida, `P` = id de recinto, `G` = id de página, `E` = especie, `A` = id de artículo de la tienda.

#### Comer (categoría `comer`)

| Acción | Nombre | Valor | Cuándo |
|---|---|---|---|
| `toca-animal` | `R` | | se toca un animal en el mapa |
| `ventana` | `R` | | se abre la ventana de comer |
| `come` | `R/C` | monedas ganadas | el animal come |
| `rechaza` | `R/C` | | el animal rechaza |
| `especial` | `R/C` | monedas ganadas | reacción especial |
| `fuera` | `R/C` | | la comida se suelta fuera del animal |
| `ventana-fin` | `R` | comidas dadas | se cierra la ventana |
| `ventana-tiempo` | `R` | segundos abierta | se cierra la ventana |
| `ventana-vacia` | `R` | | se cierra sin dar nada |

Sustituyen a `juego / comida-*`, que deja de enviarse. El recinto y la especie se deducen del residente con el catálogo del juego. La posición de cada comida en la bandeja es fija en el código: el análisis la tendrá en cuenta, porque lo primero de la bandeja se elige más.

#### Mapa (categoría `mapa`)

| Acción | Nombre | Valor | Cuándo |
|---|---|---|---|
| `cerca` | `P` | | la cuidadora pasa 2 s seguidos junto a un recinto abierto |
| `cerca-cerrado` | `P` | | lo mismo junto a un recinto sin comprar |
| `toca-cerrado` | `P` | | toque sobre un recinto sin comprar |
| `tienda-cerrada` | | monedas que faltan | se pisa la puerta de la tienda sin las 20 monedas |
| `control` | `toque`, `joystick`, `teclado` | | primer uso de cada forma de moverse en la sesión |

«Junto a» es el rectángulo del recinto con un margen de 2 casillas. Un acercamiento termina al salir de esa zona; hasta entonces no se repite. Abrir la ventana de comer no lo termina.

#### Tienda (categoría `tienda`)

| Acción | Nombre | Valor | Cuándo |
|---|---|---|---|
| `mira` | `A` | | la cuidadora se para ante un artículo (aparece el bocadillo); una vez por visita y artículo |
| `compra` | `P/R` | precio | compra hecha (`R` = el animal que llega) |
| `sin-monedas` | `A` | monedas que faltan | intento de compra sin saldo |
| `tienda-fin` | | segundos dentro | se sale de la tienda |
| `tienda-sin-compra` | | | se sale sin comprar |

#### Libro (categoría `libro`)

| Acción | Nombre | Valor | Cuándo |
|---|---|---|---|
| `abre` | `G` por la que se abre | | se abre el libro |
| `lee` | `G` | segundos | se deja una página abierta al menos 1 s (desbloqueada, no índice ni portadilla) |
| `hojea` | `G` | | se deja antes de 1 s |
| `bloqueada` | `G` | | se ve una página aún sin conseguir |
| `indice` | capítulo | | toque en una fila del índice |
| `libro-fin` | tramo de páginas leídas | segundos abierto | se cierra el libro |

Sustituyen a `libro / pagina`. **Corrige un fallo actual:** hoy cuenta como página vista la que la tienda deja marcada tras una compra, y las bloqueadas cuentan igual que las leídas. Tramos de páginas: `0`, `1`, `2-3`, `4-7`, `8+`.

#### Ajustes y salida (categoría `ajustes`)

Se mantienen `musica`, `sonidos`, `joystick`, `idioma`. Se añaden `privacidad` (se abre el texto legal), `salir-pregunta`, `salir-si`, `salir-no`. Nueva pantalla `salir`.

#### Lo que tiene el jugador (categoría `tiene`), una vez al día, junto a `activo / dia`

| Acción | Nombre | Valor |
|---|---|---|
| `tiene-recinto` | `P` | animales que tiene en él |
| `tiene-saldo` | tramo de monedas | |
| `tiene-paginas` | tramo de páginas leídas del libro | |
| `tiene-ajuste` | `musica-on`, `sonidos-off`, `joystick-on`… | |

Tramos de saldo, alineados con los precios: `0-19`, `20-49`, `50-149`, `150-399`, `400-899`, `900-1599`, `1600+`. Es el denominador: «de los que tienen panda, cuántos le dieron de comer».

#### Alcance y descubrimiento (categoría `alcance`)

Para cada tipo, tres acciones: primera vez **hoy**, primera vez **esta semana**, primera vez **en la vida**.

| Tipo | Nombre | Acciones |
|---|---|---|
| animal alimentado | `R` | `dia-animal`, `semana-animal`, `vida-animal` |
| comida usada | `C` | `dia-comida`, `semana-comida`, `vida-comida` |
| recinto visitado (`cerca`) | `P` | `dia-recinto`, `semana-recinto`, `vida-recinto` |
| página leída (`lee`) | `G` | `dia-pagina`, `semana-pagina`, `vida-pagina` |
| pantalla usada | `tienda`, `libro`, `ajustes` | `dia-pantalla`, `semana-pantalla`, `vida-pantalla` |
| reacción especial vista | `E/C` | solo `vida-especial` |

`dia-animal / gordi` dividido entre `tiene / tiene-recinto / cabra` del mismo día es el porcentaje de quienes tienen cabras que hoy dieron de comer a Gordi.

#### Embudo de inicio (categoría `embudo`), cada paso una vez en la vida

Acciones: `primer-paso`, `primer-toque-animal`, `primera-ventana`, `primera-comida`, `tienda-abierta`, `primera-tienda`, `primera-compra`, `primer-libro`, `libro-completo`, `zoo-completo`. **Valor:** minutos de juego acumulados hasta ese paso. `progreso / tienda-abierta` deja de enviarse (pasa aquí); `progreso / recinto`, `animal` y `monedas` siguen igual.

En una instalación que ya tenía partida, los pasos que se deducen del guardado (tienda abierta, compras hechas, libro abierto) se marcan como hechos **sin enviarlos**, para no falsear tiempos.

#### Retención y cohortes (categoría `activo`)

- `nuevo` gana nombre: la semana de inicio, `AAAA-Snn`.
- Nuevas acciones `vuelve-d1`, `vuelve-d7`, `vuelve-d30`, nombre = semana de inicio. Cada una se envía una vez en la vida, en la primera sesión que ocurre 1, 7 o 30 días o más después del primer día. Retención = `vuelve-d7` ÷ `nuevo` de la misma semana.

#### Resumen por rato de juego (categoría `sesion`)

Al pasar a segundo plano, además de `fin` (que gana nombre: tramo de duración):

| Acción | Nombre | Valor |
|---|---|---|
| `rato-comidas` | tramo `0`, `1-2`, `3-5`, `6-10`, `11-20`, `21+` | comidas dadas |
| `rato-animales` | tramo `0`, `1`, `2-3`, `4-6`, `7+` | animales distintos alimentados |

Tramos de duración: `<1m`, `1-3m`, `3-10m`, `10-30m`, `30m+`. La unidad es el **rato en primer plano**, no la sesión: una sesión interrumpida por una llamada da dos ratos. Las medias por sesión salen de totales ÷ `sesion / inicio`.

#### Calidad del dato (categoría `calidad`)

| Acción | Nombre | Valor | Cuándo |
|---|---|---|---|
| `perdidos` | motivo: `cola-llena`, `caducado` | cuántos eventos | primera sesión con red tras perderlos |
| `pendientes` | tramo de edad del más viejo: `<1h`, `1-6h`, `6-24h`, `1-3d`, `3-7d` | cuántos se reenvían | al arrancar con eventos guardados |

### 2. Etapa del jugador: sexta dimensión

Nueva dimensión de visita `progreso`, tramo de recintos abiertos: `2`, `3-4`, `5-7`, `8-11`. `VITE_MATOMO_DIMS` admite cinco ids (como hoy, sin esta dimensión) o seis. Así la versión nueva funciona antes de que David cree la dimensión.

### 3. Lo que recuerda el dispositivo (`src/core/reach.ts`, nuevo, lógica pura)

Clave aparte `zooesponji_v3_reach`. No toca la partida ni `SAVE_VERSION`.

```
{ day, week, today: string[], thisWeek: string[], ever: string[],
  steps: string[], playSeconds: number, returned: string[] }
```

- `mark(state, tipo, id, hoy)` devuelve el estado nuevo y qué acciones de alcance toca enviar (ninguna, o hasta tres).
- Al cambiar de día se vacía `today`; al cambiar de lunes, `thisWeek`.
- `ever` crece como mucho hasta unos 400 ids cortos (animales, comidas, recintos, páginas, especiales): pocos KB.
- Valor ilegible = estado vacío. Si el almacén falla, no se envía alcance (mejor no contar que contar de más), igual que en `activity.ts`.
- `activity.ts` gana la semana de inicio y las banderas `vuelve-*`.

### 4. Juego sin conexión (`src/core/hitQueue.ts`, nuevo, lógica pura)

- Cada evento se guarda con el instante en que ocurrió: `{ q: consulta, t: milisegundos }`.
- La cola se persiste en `zooesponji_v3_stats_queue` en cada vaciado (cada 10 s) y al pasar a segundo plano, solo si ha cambiado. Un cierre brusco pierde como mucho 10 s.
- **Límite:** 1000 eventos. Al superarlo se descartan los más viejos y se cuentan en `calidad / perdidos / cola-llena`.
- **Envío:** lotes de 50. `send` pasa a devolver una promesa: si `fetch` resuelve, el lote se borra de la cola; si rechaza (sin red), se queda. Con `no-cors` no se ve la respuesta: un error del servidor no se distingue de un éxito.
- **Fecha real:** al enviar, todo evento con más de 5 minutos lleva `cdt` con su fecha y hora en UTC. Los recientes van sin `cdt` y usan la hora del servidor, que no depende del reloj del móvil. Si la edad sale negativa (reloj atrasado), sin `cdt`.
- **Caducidad:** Matomo acepta `cdt` sin token solo dentro de una ventana, 24 horas por defecto. Los eventos más viejos que `VITE_MATOMO_REPLAY_HOURS` (por defecto 23) se descartan antes de enviar y se cuentan en `calidad / perdidos / caducado`. Como el Matomo es propio, David puede ampliar la ventana a 7 días en `config.ini.php` (`[Tracker] tracking_requests_require_authentication_when_custom_timestamp_newer_than = 604800`) y poner 167 en la variable. Es un ajuste de toda la instancia.
- Los eventos reenviados conservan el `_id` de su sesión original: Matomo los agrupa en la visita de aquel día.
- Las banderas (activo, alcance, retención) se calculan en el momento real, con o sin red, y viajan en la cola como un evento más.
- Apagar «Estadísticas» borra también la cola guardada.

### 5. Reparto del código

- **Escenas:** solo emiten eventos nuevos del `bus` (`feed-opened`, `feed-closed`, `food-missed`, `pen-near`, `locked-tap`, `shop-look`, `shop-denied`, `shop-closed`, `book-opened`, `book-page-left`, `book-index`, `book-closed`, `control-used`, `legal-opened`, `quit-asked`, `quit-answered`). `animal-fed` gana `foodId` y `coins`. No conocen Matomo.
- **`src/systems/analyticsEvents.ts`** (nuevo): traduce el `bus` a eventos del catálogo y lleva los contadores por ventana y por rato.
- **`src/systems/analytics.ts`:** se queda con sesión, cola y envío.
- **`src/core/penNear.ts`** (nuevo, puro): decide entradas y permanencias junto a recintos a partir de la posición de la cuidadora.

### 6. Lectura de los datos (`tools/matomo/`, nuevo, fuera de `game/`)

- `pull.mjs`: script de Node sin dependencias. Descarga por la API de informes, para un periodo dado, los eventos (acción × nombre, con apariciones, sesiones, suma, media, mínimo y máximo del valor), las dimensiones y las visitas por día. Guarda JSON en `tools/matomo/data/`.
- `resumen.mjs`: calcula a partir de esos JSON las tablas habituales: animales y comidas por alcance entre quienes los tienen, combinaciones animal-comida, recintos visitados frente a alimentados, páginas leídas y tiempo medio, deseo (cerrados, sin monedas), tropiezos, embudo, retención por cohorte, medianas desde tramos y porcentaje de dato perdido.
- **Regla de muestra:** toda cifra va con su tamaño de muestra; por debajo de 30 jugadores en el denominador el resultado se marca «insuficiente» y no se concluye nada de él.
- Uso: David pide el análisis y Claude lanza los scripts y comenta el resultado.

### 7. Seguridad (el repositorio es público)

- **Token de lectura:** en `tools/matomo/.env.local`, ignorado por git, con variables `MATOMO_URL`, `MATOMO_SITE`, `MATOMO_TOKEN`. **Sin prefijo `VITE_`** y fuera de `game/`: Vite no puede meterlo en la app. Hay un `.env.example` vacío.
- **Usuario de Matomo:** solo permiso «ver» y solo sobre el sitio del juego. Revocable en un clic.
- **El script** envía el token en el cuerpo de un `POST`, nunca en la dirección; no lo imprime ni imprime la dirección; se niega a arrancar si su fichero de configuración no está ignorado por git.
- **`tools/matomo/data/`** ignorado por git.
- **Test de compilación:** falla si `dist/` contiene `token_auth` o `MATOMO_TOKEN`.
- En specs, planes, tests y commits solo aparece `stats.example.com`.
- **Lo que no se puede esconder:** la dirección del seguimiento y el id del sitio viajan en la app, como hoy. No permiten leer nada; solo enviar eventos falsos. Si se amplía la ventana de `cdt`, esos eventos falsos podrían llevar fecha de hasta 7 días atrás. Riesgo aceptado: se vería como picos raros y no expone datos.

### 8. Privacidad y documentación

- `public/privacidad.html` y `privacidad-en.html`: el apartado de estadísticas explica que se mide el uso del contenido del juego (animales, comidas, recintos, páginas, compras), que si no hay conexión los datos esperan en el dispositivo unos días y se envían después con su fecha, y que sigue sin haber identificadores. Actualizar fecha y el test que cuenta apartados si cambia.
- **Play, Seguridad de los datos:** sin cambios (interacciones con la app, registros de fallos, ubicación aproximada).
- `README.md`, estado de la spec anterior y de esta, `SECURITY.md` (regla del token) y `game/.env.example`.

### 9. Pasos manuales de David (detallados en el plan)

- Crear la dimensión de visita `progreso` y pasar su id.
- Crear el usuario de solo lectura y guardar su token en el fichero local.
- Opcional, recomendado: ampliar la ventana de `cdt` a 7 días.

## Pruebas

- **`eventCatalog`:** acciones únicas, nombres combinados, tramos en sus bordes.
- **`reach`:** primera vez del día, de la semana y de la vida; cambio de día y de lunes; estado corrupto; fallo del almacén; siembra desde una partida existente.
- **`activity`:** semana de inicio, `vuelve-*` una sola vez, salto directo de d0 a d40.
- **`hitQueue`:** límite y descarte, caducidad, `cdt` solo pasados 5 minutos y en UTC, reloj atrasado, lote confirmado y lote fallido, persistencia y relectura, borrado al apagar.
- **`penNear`:** paso rápido que no cuenta, permanencia que cuenta una vez, salida y vuelta.
- **`analyticsEvents` (con envío falso):** ventana con comidas, ventana vacía, comida fuera, libro leído y hojeado, compra, sin monedas, resumen del rato, estado diario.
- **`matomoRequest`:** cinco o seis dimensiones; nunca `token_auth`.
- **Pruebas de juego:** las escenas emiten los eventos nuevos del `bus`.
- **Compilación:** sin token en `dist/`; `AndroidManifest.xml` sin permisos nuevos.

## Comprobar contra el Matomo real antes de dar nada por bueno

1. Un lote `no-cors` con `cdt` de hace unas horas se acepta sin token y cae en su hora.
2. Un `cdt` de ayer aparece en el informe de ayer sin reprocesar a mano; si no, documentar el comando de invalidación.
3. Con modo CNIL, el informe de eventos sin segmento da cifras exactas y cuenta sesiones por `_id`.
4. La API devuelve «acción × nombre» en una sola tabla plana.
5. Qué hace Matomo con un evento más viejo que la ventana (rechaza el lote entero o lo fecha hoy); de ello depende el margen de caducidad.

Si el punto 3 falla, las medias por sesión se sacan de los tramos y de `sesion / inicio`, que no dependen de cómo agrupe Matomo.

## Riesgos y límites

- **Duplicados:** si la app muere después de enviar un lote y antes de confirmarlo, se reenvía al arrancar. Afecta sobre todo al último lote de un rato. No se puede medir; se espera pequeño.
- **Reloj del móvil mal puesto:** los eventos reenviados caen en un día equivocado. Los enviados al momento no se ven afectados.
- **Jugadores anteriores a esta versión:** sus «primera vez en la vida» llegan tarde. El análisis de descubrimiento y embudo usará solo jugadores con antigüedad `d0` en el momento del evento.
- **Únicos:** por día natural, semana natural y vida. No hay «últimos 17 días».
- **Pocos jugadores:** durante la prueba cerrada muchos cruces darán «insuficiente».
- **Sin recorridos individuales, sin mapas de calor, sin pruebas A/B:** fuera de alcance.
