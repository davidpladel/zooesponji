# Aviso para actualizar el juego (suave, de versión grande y obligatorio)

Fecha: 2026-11-19 · Rama: `feat/release-2.11.0` · Estado: **diseño aprobado por David el 2026-11-19** (política de tres niveles; el plan de salida de abajo lo propuso él)

## Por qué

David lo ha visto en muchos juegos y le parece necesario: hoy no hay forma de empujar a la gente a la versión
nueva. Los datos lo confirman: el 11-nov (informes de Play) había **59 dispositivos activos**, el 76 % en la 2.9.0
y casi **1 de cada 4 en versiones anteriores** (2.8.1 un 14 %, 2.7.1 un 10 %), semanas después de salir la 2.9.0.
Mucha gente no actualiza sola.

Lo que pidió David: **obligar a actualizar, pero con un mensaje suave que deje jugar sin actualizar dos veces**.
La versión con muchas novedades es más obligatoria; la de arreglos y cosas menores, menos.

## Lo que dicen las fuentes (comprobado el 2026-11-19, no de memoria)

- **Actualización dentro de la app (Google Play, `app-update` 2.1.0).** Dos tipos: *flexible* (descarga en segundo
  plano, hay que llamar a `completeUpdate()`) e *inmediata* (Play cubre la app hasta acabar). Cada versión puede
  llevar una prioridad 0–5 al publicarla, **que no se puede cambiar después**. Si el usuario cancela
  (`RESULT_CANCELED`), Google recomienda dejarle seguir y volver a avisar más tarde si la app puede funcionar sin
  la actualización, y no pedirlo con demasiada frecuencia. Cada `AppUpdateInfo` solo vale para un intento.
  Fuente: <https://developer.android.com/guide/playcore/in-app-updates/kotlin-java>.
- **Versión mínima desde un servidor (Firebase Remote Config).** Patrón: `minimum_version` obligatoria y
  `latest_version` opcional; por debajo de la mínima, pantalla completa que no se cierra; entre las dos, aviso con
  «Actualizar / Más tarde». Comparar con números (no con texto: «1.10.0» < «1.2.0» como texto), valores por
  defecto para que la app funcione sin conexión y probar con un grupo pequeño antes de subir la mínima. Fuente:
  <https://firebase.google.com/docs/remote-config/use-cases/minimum-version>.
- **Herramienta de Play Console «avisar para actualizar».** Aviso a pantalla completa a quien tenga una versión
  concreta, sin código; se puede cerrar y vuelve en cada arranque en frío. Exige una versión nueva en todas las
  pistas. Fuentes: <https://support.google.com/googleplay/android-developer/answer/13812041> y
  <https://android-developers.googleblog.com/2024/01/prompt-users-to-update-to-your-latest-app-version-google-play.html>.
- **No confirmado:** si la política «Diseñado para Familias» dice algo sobre forzar actualizaciones. No hay nada
  publicado que lo prohíba o lo exija; se revisa en la política de Play antes de sacar la versión (ver «Antes de
  publicar»).

## Objetivos

- Que quien tiene una versión vieja se actualice, sin sacarle del juego (la ventana la pone Play encima).
- Tres niveles de insistencia, que David elige al publicar cada versión y puede **cambiar después sin sacar otra
  versión**.
- Que funcione **sin palabras**: icono grande y números; el texto, mínimo, en los 11 idiomas.
- Que sin conexión, o si algo falla, el juego **siga funcionando siempre**.

## No objetivos y antiobjetivos

- **No** hay avisos fuera del juego (notificaciones, correos): solo sale al abrir la app.
- **No** se sale del juego hacia la tienda con un enlace propio (`market://`, `play.google.com`): regla de «sin
  enlaces externos» de un juego infantil. Se usa solo la ventana de Play.
- **No** se usa la prioridad de Play como control (no se puede cambiar después de publicar).
- **No** se identifica al jugador: la comprobación es la misma para todos.
- **Antiobjetivo:** un niño que se queda sin poder jugar porque su móvil no puede actualizar (Android viejo, sin
  espacio, sin cuenta de Google, retirada escalonada que aún no le llega). **El bloqueo solo se aplica si Play confirma
  que ahora mismo puede actualizar.**
- **Antiobjetivo:** insistir tanto que moleste (un aviso en cada arranque) o interrumpir a mitad de una acción.

## Los tres niveles

Un solo dato del servidor, `actualizacion`, dentro del `comunidad.json` que ya edita David a mano:

```json
"actualizacion": { "minima": 12, "ultima": 14, "grande": true }
```

Los números son `versionCode` (enteros que siempre suben), no el nombre de la versión.

| Nivel | Cuándo | Qué ve el jugador |
|---|---|---|
| **Pequeña** | `código < ultima` y `grande: false` | Ventana suave («Actualizar» o «Luego»), **como mucho una vez al día y tres veces en total** por cada `ultima`. Nunca bloquea. |
| **Grande** | `código < ultima` y `grande: true` | Ventana suave, **dos veces** en las que puede seguir jugando (como mucho una por día). A la **tercera, actualización obligatoria**. |
| **Rota** | `código < minima` | Actualización obligatoria **ya**, sin las dos oportunidades. Para una versión incompatible con el servidor o con un fallo grave. |

«Obligatoria» = la ventana de actualización inmediata de Play, que no deja seguir hasta acabar. Si el jugador la
cancela, vuelve a salir la pantalla de bloqueo (ver abajo).

Si `minima` y `ultima` no vienen (o vienen mal), **no pasa nada**: no hay aviso.

## Cuándo y dónde sale

Solo cuando se cumplen **todas** estas condiciones (si falla una, no se molesta):

1. Es Android nativo (no navegador ni pruebas).
2. El servidor respondió **en esta sesión** y la respuesta es válida (una copia vieja guardada no sirve para
   bloquear: sin conexión no se puede actualizar de todos modos).
3. Play dice que **hay una versión disponible para este aparato** y que el tipo de actualización está permitido
   (`isUpdateTypeAllowed`). Si Play no responde, no está instalada desde Play o la retirada escalonada aún no le
   llega: no hay aviso ni bloqueo.
4. Es un **momento seguro**: en la pantalla del título o al volver a abrir la app. Nunca mientras el niño da de
   comer, limpia o cura, ni con una ventana de la tienda o del libro abierta.

El número de veces aplazadas se guarda en el aparato por cada valor de `ultima`, para que una versión nueva
empiece de cero.

## Lo que se ve

- **Ventana suave:** un panel como los del tablón o la oferta de anuncio (`PollNoticeScene` y `AdOfferScene` como
  modelo), con el dibujo de una flecha hacia abajo dentro de un círculo (dibujada con Canvas 2D en `src/ui/`) y dos
  botones: el verde grande «actualizar» (✓) y uno pequeño «luego» (un reloj). Mismo manejo del botón «atrás» que
  `PollNotice`: equivale a «luego».
- **Pantalla de bloqueo:** a pantalla completa, el mismo dibujo de la flecha grande que se pulsa para volver a
  intentar. Lleva una **puerta de salida** pequeña (el «Salir» que ya existe) para que el niño no quede atrapado y
  pueda cerrar el juego.
- **Texto:** una sola frase corta («¡Hay versión nueva!») en los 11 idiomas, árabe de derecha a izquierda incluido;
  la flecha y los botones dicen lo demás. Los textos los valida David.
- **Lo visual lo valida David** con capturas o jugando; no se da por terminado sin eso.

## Aproximaciones consideradas

| | Qué es | Pros | Contras |
|---|---|---|---|
| **A (elegida)** | El servidor dice qué versión toca y de qué tipo; la ventana la pone Play | Se cambia sin sacar versión; sin salir del juego; una sola pieza de control | Plugin nativo nuevo; solo protege desde la versión que lo lleve |
| B | Solo la prioridad de Play (0–5) de cada versión | Sin servidor | La prioridad no se puede cambiar después de publicar; hay que fijarla antes de saber cómo va; sin contador de «dos veces» |
| C | Enlace propio a la ficha de Play | Sin plugin | Sale del juego con un enlace externo (regla de niños); sin retirada escalonada correcta |
| D | Solo el aviso de Play Console | Sin código; llega a versiones ya publicadas | Se cierra y vuelve en cada arranque (más pesado); sin los tres niveles; no se puede probar fácil |

**Se complementan:** la A protege de la 2.11.0 en adelante. A quien ya tiene la **2.10.0 o anteriores** (que nunca
llevarán este código) solo le llega la D, y se lanza desde Play Console al publicar la 2.11.0 (con permiso de David,
como siempre que se publica algo).

## Plan de salida (idea de David: sacar una versión con esto y, ya publicada, llevar a todos a la última)

El mecanismo vive **dentro de la app**, así que solo lo tienen las versiones que lo incluyan. Por eso el orden es:

1. **Sacar la 2.11.0 (versionCode 14) con el aviso incluido.** En el servidor no se toca `ultima`: quien ya la tiene
   no necesita nada, y a quien no la tiene el servidor no le llega.
2. **Ya publicada y al 100 % en Play** (producción y prueba cerrada), lanzar la herramienta de Play Console
   «avisar para actualizar» contra la 2.10.0 y anteriores. Es el único camino para quien no tiene el mecanismo:
   aviso a pantalla completa que **se puede cerrar y vuelve en cada arranque en frío** (no bloquea; Google contó
   más de un 50 % de respuesta). Publicar y lanzar esto va con permiso expreso de David, y es él quien lo manda desde Play Console (o Claude con la
   API `apprecovery` y su permiso).
3. **Desde la 2.11.0, cada versión siguiente** (2.12.0…) ya se puede subir a «grande» u obligar por el servidor, y
   llega a todos los que pasaron por la 2.11.0.

Lo que **no** se puede: obligar de verdad (bloqueo) a quien se quede en la 2.10.0 o anterior. Si no abre Play, no
actualiza sola y cierra el aviso cada vez, esa persona queda fuera hasta que actualice por su cuenta. Se mide con
los informes de Play y con la tabla de versiones de Matomo (hoy, casi 1 de cada 4 está en versiones antes de la
2.9.0).

No se marca la propia 2.11.0 como `grande`: obligar a actualizar a una versión que ya se tiene no tiene sentido.
La primera vez que se use la clave será con la 2.12.0.

## Dónde va cada cosa

- **Servidor** (`server/`): `Contenido::validar` hoy devuelve solo las claves conocidas, así que la clave nueva
  `actualizacion` se añade ahí con su validación (enteros ≥ 0, `ultima ≥ minima`, `grande` booleano); `Estado::construir`
  la incluye en la respuesta de `estado.php`. Las versiones ya publicadas **ignoran el campo nuevo**
  (`parseStatus` lee solo `hoy`, `ideas`, `votacion` y `muro`; se deja una prueba que lo demuestre). Tocar el
  servidor real sigue las notas privadas del VPS y nada sin que David lo pida.
- **Juego, pura lógica** (`game/src/core/updatePolicy.ts`): dado `código`, la respuesta del servidor, lo aplazado y
  la fecha, devuelve `nada | suave | obligatoria`. Sin dependencias, entera con pruebas.
- **Juego, memoria** (aparte, con su clave de guardado): `{ ultima, aplazadas, ultimoAviso }`. Campo nuevo con valor
  por defecto; el guardado viejo se sigue leyendo (prueba en `save.test.ts` o en la suya).
- **Juego, Play** (`game/src/systems/appUpdate.ts`): envoltorio del plugin `@capawesome/capacitor-app-update`
  (MIT, última 8.1.1, compatible con `@capacitor/core >=8`) con `getAppUpdateInfo`, `performImmediateUpdate`
  y las comprobaciones de `updateAvailability` e `immediateUpdateAllowed`. **Los nombres exactos de campos se
  confirman contra el README y los tipos del paquete al implementar** (aquí no están leídos aún).
- **Juego, escena** (`UpdateNoticeScene`, en `main.ts` y en el manejo de «atrás» de `platform.ts`) y el momento
  seguro (título y `appStateChange`).
- Un solo cliente del servidor: se reutiliza la petición a `/estado.php` que ya hace `Community` (con su tiempo
  límite y su caché de 60 s); no se abre una conexión nueva.

## Cosas que cuidar (y que no se olviden)

- **Plugin nuevo = pieza nativa nueva:** `app-update` de Play entra en el AAB. Se comprueba el tamaño, las reglas
  de R8 (spec `2026-10-25-optimizacion-dex-r8`), `check:aab` y `check:manifest`.
- **Antes de subir `ultima` en el servidor**, la versión nueva tiene que estar **ya disponible al 100 %** en Play;
  si no, los que aún no la reciben no ven nada (por la condición 3, no se les molesta). Sube `ultima` y `minima`
  en dos pasos y con calma; `minima` solo con una versión rota de verdad.
- **No se bloquea nunca** sin la confirmación de Play de que se puede actualizar ahora.
- **Probarlo de verdad** exige dos versiones en una pista de pruebas de Play (compartir app interno o pista
  interna): el aviso no se puede ver en `npm run dev`. En pruebas de juego se sustituye Play por una pieza falsa
  (como ya se hace con los anuncios y el tablón).
- **Antes de publicar** se lee la política de «Diseñado para Familias» sobre este flujo y se anota el resultado
  aquí.

## Estadísticas (Matomo)

Categoría nueva `actualizacion`, con una acción por cosa y el tipo en el nombre (`pequena`, `grande`, `obligatoria`):

| Categoría | Acción | Nombre | Valor | Cuándo |
|---|---|---|---|---|
| `actualizacion` | `actualizacion-ofrece` | tipo | — | sale la ventana suave o el bloqueo |
| `actualizacion` | `actualizacion-acepta` | tipo | — | pulsa «actualizar» |
| `actualizacion` | `actualizacion-luego` | tipo | veces aplazadas ya | pulsa «luego» o «atrás» en la suave |
| `actualizacion` | `actualizacion-obliga` | `grande` o `rota` | — | llega la actualización obligatoria |
| `actualizacion` | `actualizacion-fallo` | tipo | — | Play cancela o falla (`RESULT_CANCELED`, error) |

Así se ve cuánta gente ve el aviso, cuántos lo aceptan, cuántos lo aplazan y cuántos se quedan atascados. No hay
`tiene` (no se compra nada). Pasos del protocolo de `game/README.md` › «Estadísticas»: aviso en el bus, traducción en
`analyticsEvents.ts` con su prueba, acciones en `CATALOG`, esta spec en la lista de `eventCatalog.test.ts`, apartado
en `tools/matomo/resumen.mjs` y estadísticas apagadas en los jugadores con IA. Sin identificadores del jugador.

## Pruebas (una por caso)

**Las lanza Claude** (decidido por David el 2026-11-19). Pesadas de una en una (`--workers=1`), nunca varios navegadores a la vez.

- **Unitarias de `updatePolicy`:** versión al día (nada); pequeña (una al día, tope de tres); grande (dos suaves y a
  la tercera obligatoria); rota (obligatoria ya); aplazadas de una `ultima` vieja (empieza de cero con una nueva);
  `ultima < minima` o datos inválidos (nada); aviso ya mostrado hoy (nada); sin respuesta del servidor (nada).
- **Condiciones:** Play dice «no disponible» o «no permitido» → nunca se bloquea; no es Android nativo → nada;
  respuesta antigua de otra sesión → no bloquea.
- **Servidor (PHPUnit):** `Contenido::validar` con la clave nueva (válida, ausente, número negativo, `ultima <
  minima`, tipos mal); `Estado::construir` la devuelve; `estado.php` sin la clave sigue igual que hoy.
- **Compatibilidad:** `parseStatus` con el campo nuevo funciona igual (versión ya publicada); guardado viejo sin la
  clave de memoria se lee con sus valores por defecto.
- **Estadísticas:** cada evento con su prueba en `analyticsEvents.test.ts` y el catálogo en `eventCatalog.test.ts`.
- **De juego (Playwright, Play falso):** sale en el título; «luego» y «atrás» aplazan y juegan; a la tercera, el
  bloqueo; el bloqueo se puede salir por la puerta; cancelar la actualización vuelve al bloqueo; no sale con una
  ventana abierta ni a mitad de una acción; sin conexión no sale; pantalla baja apaisada; árabe de derecha a
  izquierda; los 11 idiomas caben.
- **Cada fallo que aparezca** lleva primero su prueba que lo reproduzca.

## Qué se deja al constructor (decisiones mías, ajustables)

- **Tope de avisos:** grande, 2 suaves y la tercera obligatoria; pequeña, una al día y tres en total; todo, como
  mucho uno por día. Son números de `updatePolicy.ts`, fáciles de cambiar.
- **Momento seguro:** título y volver a abrir la app. Nada a mitad de acción.
- **Puerta de salida en el bloqueo:** sí.
- **Orden de comparación:** `versionCode` entero (se lee de Play/`App.getInfo`), nunca el texto del nombre.
- **Texto, dibujo de la flecha y botones:** los propone el constructor; David los valida.

## Después

- Documentación al día al cerrar: `README.md` raíz (hoja de ruta), `game/README.md` (versión y un apartado nuevo
  «Avisos de actualización» con cómo cambiar `actualizacion`), `server/README.md` y el «Cómo quedó» de esta spec.
- En las notas de versión de Play no se promete nada de esto.
