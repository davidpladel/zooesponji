# Pedir la valoración en Google Play (ventana de Google, sin enlace)

Fecha: 2026-11-21 · Rama: `feat/release-2.11.0` · Estado: **aprobada por David el 2026-11-21** (opción A elegida el 2026-11-21; criterio decidido por David el mismo día: **10 min de juego acumulados y primer animal comprado, sin condición de días**; falta confirmar con Google que la API vale en una app de Familias, ver «Antes de publicar»; **revisada contra el
código el 2026-11-21**: cambios en el choque con los anuncios y las lecciones, la pausa mientras sale la tarjeta, el
plugin y las pruebas en el móvil)

## Por qué

David quiere más valoraciones de 5 estrellas y comentarios en la ficha de Play. Pidió que no resulte cargante (lejos de
tutorial, votación y otros avisos destacados), en varios idiomas, claro para niños que no leen, y **sin enlace directo a
la tienda**.

Tras varias vueltas, lo que manda de David:

1. **No se puede esperar mucho:** la gente puede aburrirse o desinstalar el juego. Hay que pedirlo pronto, cuando le
   está gustando y descubriendo cómo funciona. Por eso **no se exigen varios días** (solo vuelve otro día el 31 %).
2. **Tampoco vale pedirlo a los 3 minutos:** es poco para opinar. Hace falta un mínimo de juego **y una señal de que
   le ha gustado**: haber comprado su primer animal.
3. **Criterio elegido:** **10 minutos de juego en total y el primer animal comprado.**

## Lo que dicen los datos (Matomo, últimos 30 días, leídos el 2026-11-21)

- **Duración de cada rato de juego** (589 ratos): menos de 1 min, el **41 %**; de 1 a 3 min, el 18 %; de 3 a 10 min, el
  26 %; de 10 a 30 min, el 12 %; más de 30 min, el 2 % (el resto). **La mediana está entre 1 y 3 minutos.**
- **Quién vuelve** (las tres semanas con muestra suficiente, 110 jugadores nuevos): vuelve el día siguiente o
  después el **31 %** (34 de 110) y llega a la semana el **17 %** (19 de 110). Las semanas S44 y S47 tienen muestra
  insuficiente y no se cuentan.
- **Embudo de inicio** (129 jugadores nuevos; minutos de juego hasta cada paso, **media**, que se tira hacia arriba
  por unos pocos jugadores muy largos): **el primer animal comprado** (`primera-compra`) lo consigue el **40 %**
  (51 de 129), a los **6,5 min** de juego de media; la primera comida, el 47 %, a los 2,7 min; abrir el libro, solo
  el 10 % (13 de 129, muestra insuficiente), a unos 26 min.
- **Lo que NO se puede medir hoy: cuántos jugadores habrían visto la petición.** Cada sesión usa un identificador
  aleatorio nuevo (a propósito, por privacidad: `analytics.beginSession`), así que **no se puede seguir a un mismo
  jugador de un día a otro**, y Matomo solo da ratos sueltos y medias. Solo se puede estimar con el modelo de abajo.

## Alcance estimado por umbral (modelo, 2026-11-21)

**Método (aproximado, ±8 puntos):** del embudo salen tres puntos medidos de «minutos de juego hasta el paso» frente a
«% de los nuevos que llega»: primera comida (2,7 min, 47 %), primer animal (6,5 min, 40 %), libro (26 min, 10 %,
muestra insuficiente). Entre ellos se interpola en escala de logaritmo para saber qué % pasa de T minutos acumulados.
Esos minutos son **medias**, así que el modelo es optimista. La condición de días se acota con la retención (31 %
vuelve otro día): **prudente** = % de T × 31 % (si jugar mucho y volver fueran cosas independientes) y **techo** = el
menor de los dos; **central** = el punto medio.

| Minutos acumulados | Sin condición de días | Con 2 días: prudente | Con 2 días: techo | Con 2 días: central |
|---|---|---|---|---|
| 3 | 46 % | 14 % | 31 % | 23 % |
| 5 | 42 % | 13 % | 31 % | 22 % |
| 7 | 38 % | 12 % | 31 % | 21 % |
| **10** | **31 %** | 10 % | 31 % | 20 % |
| 15 | 22 % | 7 % | 22 % | 14 % |
| 20 | 16 % | 5 % | 16 % | 10 % |
| 30 | 7 % | 2 % | 7 % | 5 % |
| Primer animal comprado (~6,5 min) | 40 % | 12 % | 31 % | 22 % |

**Lo elegido (10 min + primer animal, sin días): en torno al 30 % de los nuevos** (23–39 % con el margen del
modelo). Casi todo el que llega a 10 min ya ha comprado su primer animal (se compra a los 6,5 min de media), así que
la segunda condición recorta poco: es una **garantía de calidad más que un filtro de cantidad**.

**Objetivo de David (≥ 40 % de los jugadores):** con esta elección **queda por debajo** (≈ 30 %). El 40 % solo lo da
«primer animal» a secas (≈ 6,5 min). David lo conoce y ha elegido 10 min + primer animal; los dos números (minutos y
animal sí/no) son constantes y se ajustan con los datos reales.

## Lo que dicen las fuentes (comprobado el 2026-11-21, no de memoria)

- **API de reseñas de Google Play** (<https://developer.android.com/guide/playcore/in-app-review>):
  - Se lanza «después de que el usuario haya probado la app o el juego lo suficiente para dar una opinión útil», sin
    pedirla en exceso. 10 min de juego y un animal comprado son el **límite bajo** de esa frase.
  - **Sin botón ni llamada a la acción que dispare la API.** Si el usuario quiere valorar desde un botón, la guía lo
    manda a la ficha de Play.
  - **Sin preguntas antes ni durante** («¿te gusta?», «¿le darías 5 estrellas?»).
  - La tarjeta de Google no se toca: ni tamaño, ni opacidad, ni capas encima o alrededor.
  - Cuota por tiempo: llamar más de una vez en menos de un mes (orientativo) puede no enseñar nada. La API **no dice
    si la tarjeta se mostró ni si el usuario valoró**.
  - Librería `com.google.android.play:review` 2.0.2 (Android 5.0 o superior con Play Store). Se aplican las
    condiciones de servicio de Play Core.
  - Las reseñas hechas así recogen «datos escritos por el usuario» (nota y texto): afecta a la ficha de seguridad
    de datos.
- **Valoraciones incentivadas:** Play prohíbe dar algo a cambio de valorar
  (<https://android-developers.googleblog.com/2017/06/google-plays-policy-on-incentivized.html>).
- **Política de Familias** (<https://support.google.com/googleplay/android-developer/answer/9893335>): **no
  menciona** reseñas ni esta API. Lo aplicable es general: nada emocionalmente manipulador hacia los niños, ningún
  diseño que provoque toques involuntarios de niños, y las promociones de tus propias fichas de Play (cruzadas)
  deben distinguirse del juego. Las SDK «aprobadas para Familias» solo se listan para anuncios; Play Core / reseñas
  no aparecen ni como aprobadas ni como prohibidas. La página de la política de uso de SDK (`answer/15406736`) dio
  404 el 2026-11-21: **no se ha podido leer**.
- **Enlace a la ficha de Play:** la política **no lo prohíbe ni lo permite** de forma expresa. Queda descartado por
  nuestra propia regla (ni enlaces externos dentro del juego) y porque «promoción de tu ficha» se acerca al apartado
  de promociones cruzadas.

## Qué se va a hacer (opción A)

**El juego no enseña ningún cartel ni botón propios.** Cuando se cumplen las condiciones, llama a la API de Google y
Google pone su tarjeta encima del juego, ya en el idioma del móvil. Por eso no hace falta traducir nada ni dibujar
nada: cumple la guía de la API (sin botón, sin pregunta previa, sin tocar la tarjeta) y «los 11 idiomas» lo cubre
Google.

Lo que se pierde, dicho claro: **no hay un dibujo propio para quien no lee**. Un niño verá la tarjeta de Google.

### A quién y cuándo

Se pide **la primera vez que, con 10 minutos de juego acumulados y el primer animal comprado, llega un momento
tranquilo**. No se mira cuántos días ha jugado: quien lo cumple todo el primer día lo recibe el primer día.

- **10 min de juego en total**, sumando todos los ratos y todos los días desde que se instala la versión con esta
  función. Cuenta solo juego de verdad: mapa activo, sin pausas ni segundo plano (en pausa o con el móvil en
  segundo plano no suma). No hace falta que sean seguidos.
- **Primer animal comprado:** algún recinto tiene más animales de los iniciales (`counts[id] > initialCounts()[id]`
  para algún recinto, la misma regla que `knownSteps` en `analyticsEvents.ts`). **Se lee de la partida guardada, no
  hay contador nuevo**, así que quien ya compró antes de actualizar también cuenta. **No cuenta** comprar a Luna ni
  la clínica: solo animales.
- **El tutorial ya se ofreció** (`tutorial.offered`) y no hay ninguno en marcha ni lecciones por ofrecer.
- **Momento tranquilo:** el mapa activo, sin otro panel abierto, justo al volver de dar de comer, limpiar o la
  tienda (la misma pausa natural que usa `offerAd`). **Salir de la tienda tras comprar el primer animal** es el
  momento natural: ya lleva el rato y está contento. Si cumple las dos condiciones en medio de un rato y no hay una
  pausa así en los **5 min** siguientes de juego, vale el primer momento con el mapa activo y sin ningún panel.
- **Nada destacado cerca:** ni votación (`PollNotice`), ni aviso de ganadora, ni aviso de actualización abiertos ni
  enseñados en los **10 min** anteriores de esta partida. Con el **panel de anuncio** (`AdOffer`) la espera es más
  corta, **3 min** (revisión del 2026-11-21, ver abajo). Si algo de eso ocupa el momento, espera al siguiente.
- **Si en la misma pausa tocan la valoración y el anuncio de la pausa** (los dos se lanzan al volver de comer,
  limpiar o la tienda), va **la valoración** y el anuncio se salta esa vuelta (sale en la siguiente pausa: tiene su
  propia espera). Nunca los dos seguidos.
- **Al salir de la tienda con lecciones por ofrecer** (ha comprado un recinto de barro o la clínica), esa vuelta es
  de la lección, como ya pasa con el anuncio (`WorldScene`, «primero ellos, sin anuncio ni otro aviso en esta
  vuelta»). La valoración espera a la siguiente pausa.

> **Por qué 3 min y no 10 con los anuncios (revisión del 2026-11-21).** El panel de anuncio de la tienda sale a los
> 5 min de juego de la partida (`SESSION_MIN_S` en `adPacing.ts`) **dentro de la tienda**, que es justo donde se
> compra el primer animal (a los 6,5 min de media); el de la pausa, a los 15 min (`PAUSE_SESSION_S`). Con 10 min de
> espera tras cualquier anuncio, quien vio el de la tienda no recibiría la valoración hasta los ~16 min, y ahí ya
> toca el de la pausa, que la empuja otros 10: casi nadie llegaría (solo el 14 % de los ratos pasa de 10 min). Eso
> dejaría el alcance muy por debajo del 30 % estimado. Con 3 min y la regla de «una cosa por pausa» no se pegan y el
> alcance se mantiene. Es decisión mía; David la confirma al aprobar.
- Solo en Android con Play Store. En web, en desarrollo y en las pruebas no hace nada (o usa el plugin falso).

Los números (10 min de juego, 5 min de espera de la pausa, 10 min sin avisos, 3 min sin anuncio) son constantes con
su prueba: si David quiere otro umbral, se cambia sin tocar el diseño. Los 5, 10 y 3 min de espera son **decisión
mía** como punto de partida.

### Cuántas veces

La primera vez no espera nada más que las dos condiciones. Lo que se limita es **volver a pedirlo**, y para eso Google
ya pone su propia cuota (más o menos un mes):

- **1.ª vez:** al cumplir las condiciones de arriba.
- **2.ª vez, y última:** a los **30 días** de la primera **y** con otros **10 min de juego** desde entonces (sigue
  jugando), más un momento tranquilo. Menos de 30 días no tiene sentido: Google probablemente no mostraría nada.
- **Nunca más de 2 intentos en la vida.**

### Qué se guarda

Una clave propia en el almacén `zooesponji_v3_review` (como `zooesponji_v3_ads`): no forma parte de la partida
guardada ni de `SAVE_VERSION`, y **no se envía a ningún sitio**:

- `playSeconds`: segundos de juego acumulados (el contador de minutos).
- `attempts`: veces que se ha llamado a la API (0, 1 o 2).
- `lastAttemptDay`: día del último intento, `AAAA-MM-DD` en hora local.
- `playAtAttempt`: los `playSeconds` que había en el último intento (para medir los otros 10 min de la 2.ª vez).

**No hay contador de días** (ya no hace falta) **ni de «primer animal»** (se lee de la partida).

**¿Ya lo teníamos?** A medias. `core/reach.ts` guarda `playSeconds` («segundos de juego en primer plano desde la
instalación»), pero está hecho para el embudo de Matomo y **solo se suma con las estadísticas activas y al pasar el
juego a segundo plano** (`analyticsEvents.goingBackground`). Con las estadísticas apagadas no cuenta, y dependería de
un consentimiento que no tiene nada que ver. Así que la valoración lleva **su propio contador**, que cuenta siempre y
se alimenta de los mismos segundos de juego (los que ya miden `adPacing.sessionPlay` y `goingBackground`). El de
actividad (`ActivityState`: primer día, último día y sesiones) tampoco sirve: no mide tiempo y también depende de
las estadísticas.

- **Cómo se suma:** en memoria mientras se juega y se guarda cada minuto de juego y al pasar a segundo plano o
  cerrar, para no perder el rato si el móvil mata la app. Cada suma es de pocos segundos (si de pronto llega un
  salto enorme por un cambio de reloj, se ignora).
- **Partida vieja sin esa clave:** `playSeconds = 0`, nada se rompe. Quien ya jugaba antes de esta versión empieza
  de cero: necesita 10 min más desde que actualiza (el animal ya lo tiene).
- **Clave ilegible o de otra forma** (no número, negativo, infinito): se trata como vacía, sin lanzar.
- **Reloj del móvil hacia atrás:** la espera de 30 días se mide con `daysBetween`; con fecha anterior a la del
  intento no vuelve a pedir.

### Qué se ve y qué se guarda al pedir

- Se marca el intento (`attempts + 1`, `lastAttemptDay`, `playAtAttempt`) **antes** de llamar a la API: la API no
  dice si se mostró, y mejor pedir de menos que de más.
- **Mientras la tarjeta está abierta, el mapa queda en pausa** (se para la cuidadora y se pausa `World`, como con los
  demás avisos) y se reanuda cuando la llamada termina, salga bien o mal. La guía de Google pide esperar a que acabe
  la valoración antes de seguir el juego normal (revisión del 2026-11-21: la versión anterior decía «el juego sigue
  como si nada», que iba en contra). Mientras tanto cuenta como «panel abierto»: no salta ni anuncio, ni votación, ni
  aviso de actualización (este último también mira al volver la app a primer plano, `updateNoticeInstall.ts`, y
  no debe saltar encima de la tarjeta ni justo al cerrarla). Si la llamada no termina (Play colgado), a los
  **60 s** se reanuda igual.
- Después, el juego sigue normal. Si la API falla, no se avisa ni se cambia nada.
- Nada de premios, monedas ni «gracias» por valorar (política de Play).

## No objetivos y antiobjetivos

- No hay botón en el juego, ni en Ajustes, que abra la valoración.
- No hay enlace a la ficha de Play ni a ninguna web.
- No se pregunta nada antes («¿te gusta?», «¿5 estrellas?»), ni se dibuja nada alrededor de la tarjeta de Google.
- No se dirige al niño con estrellas, caritas o mensajes para que valore.
- No se sabe cuántas valoraciones salen de aquí (la API no lo dice); se mira en Play Console.
- No hay interruptor remoto en el servidor (cambiaría el servidor y el juego ya publicado): si hiciera falta
  pararlo, se saca versión.
- No se pide antes de los 10 min de juego acumulados ni sin el primer animal comprado.
- No se exige un número de días de juego.

## Cosas que hay que hacer

1. **Lógica pura** `core/reviewPrompt.ts` (sin Phaser ni reloj ni almacén, como `adPacing.ts`): leer, sumar y
   avanzar los datos guardados, y decidir «¿toca pedir?» a partir de los segundos, de «¿ha comprado un animal?»
   (que le pasa quien llama) y de lo que haya abierto. Nunca lanza.
2. **Sistema** `systems/review.ts`: lee y guarda la clave, recibe los segundos de juego, ofrece `canRequest()` y
   `request()`.
3. **Plugin nativo** `systems/reviewInstall.ts` (único archivo que toca el plugin, como `adsInstall.ts` y
   `updateNoticeInstall.ts`) sobre `com.google.android.play:review`. No hay ninguno instalado hoy. **Propuesta
   (revisión del 2026-11-21): `@capawesome/capacitor-app-review` 8.1.0**, del mismo autor que
   `@capawesome/capacitor-app-update`, que ya usamos, y para Capacitor 8 (la alternativa es
   `@capacitor-community/in-app-review` 8.0.0). Solo se usa `requestReview()`; **`openAppStore()` no se llama nunca**
   (sería el enlace a la ficha que descartamos), y una prueba lo vigila. Antes de dar por bueno el plugin se lee su
   código de Android (qué versión de `play:review` trae y que no añada permisos al manifiesto). Comprobar reglas de R8,
   que convive con `play:app-update` (las dos tiran de `play:core-common`) y que el AAB sigue compilando.
4. **Enganche en `WorldScene`**, junto a `offerAd`/`maybeNotice`, con la misma comprobación de «no hay otro panel
   abierto» y un ayudante de pruebas en `testHooks.ts` (`?valoracion=rapido` con un plugin falso y los 10 min y el
   animal ya cumplidos, solo en desarrollo).
5. **Estadísticas** (ver tabla), **documentación** y **ficha de datos/privacidad** (ver «Antes de publicar»).

## Estadísticas (Matomo)

Todo lo que pasa lleva su evento; aquí hay pocos, porque la API no dice más.

| Qué pasa | Aviso en el bus | Evento de Matomo | Notas |
|---|---|---|---|
| El juego llama a la API de reseñas | `review-requested` | `valoracion` / `valoracion-solicitada` (nombre: `1` o `2`, el número de intento) | No dice si se mostró ni si valoró |
| La API falla | `review-failed` | `valoracion` / `valoracion-fallo` | Solo cuenta; el niño no ve nada |

Con esto se verá **qué % de los nuevos cumple 10 min y el primer animal** (el dato que hoy no tenemos), frente a la
estimación del 30 %.

Pasos de `game/README.md` › «Estadísticas: qué hacer con cada cosa nueva»: aviso en el bus; traducción en
`analyticsEvents.ts` con su prueba; acción única en `eventCatalog.ts`; esta tabla (y la spec añadida a la lista de
`eventCatalog.test.ts`); `tiene` no aplica (no se compra nada); apartado en `tools/matomo/resumen.mjs`; estadísticas
apagadas en los jugadores con IA (y que no llamen a la API real).

## Pruebas (una por caso)

Unitarias (`reviewPrompt.test.ts`, `review.test.ts`):

- 9 min 59 s con animal comprado: no toca. 10 min con animal: sí, en el primer momento tranquilo.
- 10 min sin animal comprado: no. Animal comprado y menos de 10 min: no. Las dos cosas: sí.
- Comprar a Luna o la clínica no cuenta como animal.
- Animal comprado antes de actualizar (partida vieja): cuenta; los 10 min empiezan de cero.
- Los 10 min en un solo día y los 10 min repartidos en varios días: tocan igual; no se mira cuántos días.
- El tiempo en pausa o en segundo plano no suma.
- Salir de la tienda tras comprar el primer animal con los 10 min ya hechos: sí (momento tranquilo).
- Sin pausa natural en los 5 min siguientes a cumplir las dos condiciones: vale el primer momento con el mapa
  activo y sin panel.
- Tutorial sin ofrecer, en marcha o con lecciones por ofrecer: no.
- Hay un panel abierto, o salió una votación, aviso de ganadora o de actualización hace menos de 10 min: no. A los
  10 min: sí. Un anuncio hace menos de 3 min: no; a los 3 min: sí.
- En la misma pausa tocan valoración y anuncio de la pausa: sale la valoración y el anuncio no (sí en la pausa
  siguiente).
- Al salir de la tienda con una lección por ofrecer (recinto de barro o clínica recién comprados): sale la lección y
  la valoración espera.
- Con la tarjeta abierta el mapa está en pausa y no salta ningún otro panel (tampoco el aviso de actualización al
  volver la app a primer plano); al terminar la llamada, bien o mal, se reanuda. Si no termina, se reanuda a los 60 s.
- `openAppStore()` no aparece en el código del juego.
- Primera vez, con `attempts = 0`: sí, en cuanto se cumplen las dos condiciones. Con `attempts = 1`: no hasta 30
  días y 10 min más de juego (cada condición por separado: falta una, no). Con `attempts = 2`: nunca más.
- Partida vieja sin clave: `playSeconds = 0`, nada se rompe.
- Clave corrupta o de otra forma: se trata como vacía, sin lanzar.
- Salto enorme de segundos (reloj): se ignora.
- Reloj hacia atrás: no vuelve a pedir.
- Con estadísticas apagadas cuenta y pide igual.
- Se guarda cada minuto y al pasar a segundo plano; tras cerrar y abrir sigue donde iba.
- El intento se marca antes de llamar; si la API falla, no se vuelve a pedir en esta partida.
- Cada evento de Matomo (`analyticsEvents`, `eventCatalog`).

De juego (Playwright, de una en una, `--workers=1`; no dibujan nada propio, así que comprueban la llamada y que el
juego sigue jugable): con los 10 min y el animal ya cumplidos sale al volver de dar de comer o de la tienda; **no
sale** sin los 10 min, sin animal comprado, ni con una votación sin avisar, ni con el tutorial sin hacer, ni con un
anuncio abierto; el juego sigue y la cuidadora se mueve después; pantalla baja apaisada (no tapa nada, porque Google
pone su ventana). Las pesadas las lanza David (o se acuerda al empezar), de una en una.

**En el móvil, solo David, desde una versión instalada de Play (prueba interna):** la tarjeta real no sale con un APK
suelto. Nunca con una cuenta de niño real. Según la guía de pruebas de Google (leída el 2026-11-21): en la **prueba
interna** no hay cuota (sale cada vez), pero **la cuenta no puede tener ya una reseña del juego** (si David lo valoró,
hay que borrarla en Play o usar otra cuenta de Gmail de la prueba interna); con **«compartir apps internamente»** la
tarjeta sale pero no deja enviar; con cuentas de empresa no sale.

## Antes de publicar (pendiente, no verificado)

1. **Consulta a Google** (soporte de Play Console): ¿vale la API de reseñas dentro de una app de «Diseñado para
   Familias»? Hasta que conteste, no se sube a producción. Si dice que no, el diseño se cierra: no hay alternativa
   sin enlace.
2. **Alcance:** con 10 min y primer animal se estima en torno al 30 % de los nuevos (23–39 %, no medido), por debajo
   del 40 % que quería David. Tras publicar, el evento `valoracion-solicitada` frente a los jugadores nuevos dirá el alcance
   real: si sale poco, se baja el umbral (o se deja solo el primer animal, ≈ 40 %); si las valoraciones llegan
   flojas, se sube.
3. **Ficha de seguridad de datos de Play y textos legales** (web y juego): las reseñas hechas con la API recogen
   nota y texto del usuario. Comprobar qué hay que declarar y no prometer nada sin comprobarlo.
4. **Cuentas de niños:** no se ha comprobado si Google deja valorar a una cuenta supervisada; las tres páginas de la
   guía de la API (resumen, Kotlin/Java y pruebas, leídas enteras el 2026-11-21) no hablan de Familias, niños ni
   Family Link. Solo dicen que con cuentas protegidas (de empresa) no sale. No cambia el diseño, pero conviene
   preguntarlo en la misma consulta del punto 1.
5. **Política de SDK de Play:** repetir la lectura cuando la página (`answer/15406736`) esté disponible.

## Aprobación

Aprobada por David: **sí, el 2026-11-21**, con los cambios de la revisión contra el código. Plan: `docs/superpowers/plans/2026-11-21-valoracion-en-play.md`.
