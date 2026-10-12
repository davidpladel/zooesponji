# Publicidad con premio para niños

Fecha: 2026-10-12 · Estado: implementada en la rama `feat/publicidad` (2.6.0); faltan los pasos manuales de David y la prueba en Android.

Primera de tres piezas. Las otras dos (buzón de sugerencias y fallos, y votaciones) tendrán su propia spec.

## Objetivo

Que el juego dé ingresos con anuncios **sin estorbar al niño**: pocos, con premio, y siempre con la opción de decir que no. David lo resumió así: «que jueguen con el juego, no que vean anuncios para ganar monedas».

**Se sabrá que está bien si:**

- Un niño que no sabe leer entiende el panel y sabe decir que sí o que no.
- Nunca ve más de un anuncio cada 15 minutos de juego ni más de 4 al día.
- Sin conexión, sin anuncio disponible o en la web, el juego es idéntico al de hoy.
- Google aprueba la versión dentro de las normas de Familias.

**Plataforma:** solo Android. La web sigue sin publicidad.

## Contexto de política (revisado 12-oct-2026 en las páginas oficiales)

- **Público:** sigue declarado solo para niños (5–12). Se descartó pasarlo a público mixto: obliga a preguntar la edad y no quita ninguna norma.
- **Red certificada:** una app para niños solo puede enseñar anuncios de redes del programa «Families Self-Certified Ads SDK». Google AdMob lo está (SDK 19.0.0 o posterior). AppLovin se salió.
- **AdMob con público solo infantil:** sirve por sí solo anuncios aptos para Familias, sin personalizar. Avisa de que son una parte pequeña del total y de que habrá peticiones sin anuncio.
- **Identificadores:** prohibido enviar el identificador de publicidad. Con API 33 o superior, la app no debe pedir el permiso `AD_ID`, que el SDK de anuncios añade por defecto.
- **Formato (Familias):** nada de anuncios al abrir la app ni al empezar una actividad; los de pantalla completa, también los que dan premio, se cierran a los 5 segundos; un solo anuncio por pantalla; que no se confundan con el juego ni provoquen toques sin querer.
- **Frecuencia:** Google no fija un número; prohíbe repetirlos hasta estorbar. Los límites de este diseño son decisión propia.
- **Premios (AdMob):** solo se puede premiar en los formatos con premio. El «intersticial bonificado» puede salir solo en una pausa, pero exige antes una pantalla que explique el premio, deje saltárselo y dé tiempo a decidir.
- **Europa:** a un niño no se le pide consentimiento. Sin consentimiento Google solo sirve «anuncios limitados». No se ha podido confirmar cuántos hay en estos dos formatos (ver Riesgos).
- **Play Games:** descartado. Las cuentas infantiles necesitan permiso de los padres y reciben un apodo automático, y la norma de Familias restringe los sistemas de inicio de sesión en apps solo para niños.

Fuentes: [Familias](https://support.google.com/googleplay/android-developer/answer/9893335) · [redes certificadas](https://support.google.com/googleplay/android-developer/answer/9283445) · [AdMob y Familias](https://support.google.com/admob/answer/6223431) · [premios en AdMob](https://support.google.com/admob/answer/48182) · [consentimiento en Europa](https://developers.google.com/admob/android/privacy/gdpr) · [datos que recoge el SDK](https://developers.google.com/admob/android/privacy/play-data-disclosure).

## Decisiones

- **Solo anuncios con premio.** Ni tiras fijas ni anuncios normales sin nada a cambio.
- **Dos momentos**, los dos con el mismo panel grande que salta solo:
  - **`tienda`:** al entrar en la tienda. Formato «bonificado»: el anuncio empieza solo si el niño toca el botón.
  - **`pausa`:** uno por partida, a partir del minuto 15, al volver al mapa. Formato «intersticial bonificado»: cuenta atrás y empieza solo; se puede saltar.
- **El panel no depende de leer:** monedas, número grande, botón verde con ▶ y una X.
- **El premio crece con el zoo.**
- **Red:** AdMob con el complemento `@capacitor-community/admob` 8.x (el juego usa Capacitor 8.5). Se descartó una red solo infantil (no hay complemento y habría que escribir código de Android) y la mediación con varias redes (más SDK que revisar; se puede añadir después).
- **Sin formulario de consentimiento** y sin llamar a la plataforma de consentimiento de Google (UMP).
- **Sin interruptor en Ajustes.** No hace falta: cada anuncio se puede rechazar.

## Diseño

### 1. Reglas de ritmo (`src/core/adPacing.ts`, nuevo, lógica pura)

Constantes: `SESSION_MIN_S = 300`, `GAP_S = 900`, `PAUSE_SESSION_S = 900`, `DAILY_MAX = 4`.

**Tiempo de juego:** segundos con el juego en pantalla y la partida empezada (ya se ha salido de la portada). No cuenta el segundo plano ni el rato en que se ve un anuncio.

**Partida:** desde que se abre el juego, o desde que se vuelve tras más de 30 minutos en segundo plano (la misma regla que las estadísticas).

Estado guardado en una clave aparte, `zooesponji_v3_ads` (no toca `SAVE_VERSION`):

```ts
interface AdPacingState {
  /** Segundos de juego desde el último panel resuelto. `null`: nunca ha habido ninguno. */
  sinceLast: number | null;
  /** Día de la cuenta, `AAAA-MM-DD` en hora local. */
  day: string;
  /** Anuncios enseñados ese día. */
  shown: number;
}
```

En memoria, por partida: `sessionPlay` (segundos de juego), `seenInSession` (se ha enseñado algún anuncio) y `pauseOffered` (ya saltó el panel de `pausa`).

**El panel de `tienda` puede saltar si se cumple todo:**

1. `sessionPlay >= SESSION_MIN_S`.
2. `sinceLast === null` o `sinceLast >= GAP_S`.
3. `shown < DAILY_MAX` en el día de hoy.

**El panel de `pausa` puede saltar si se cumple todo:**

1. `sessionPlay >= PAUSE_SESSION_S`.
2. `seenInSession` y `pauseOffered` son falsos.
3. `sinceLast === null` o `sinceLast >= GAP_S`.
4. `shown < DAILY_MAX` en el día de hoy.

**Qué cambia el estado:**

| Lo que pasa | `sinceLast` | `shown` | `seenInSession` | `pauseOffered` |
|---|---|---|---|---|
| Se enseña un anuncio (se vea entero o se cierre antes) | 0 | +1 | sí | sí, si era `pausa` |
| El niño toca la X del panel | 0 | igual | igual | sí, si era `pausa` |
| El anuncio no llega a enseñarse (fallo) | 0 | igual | igual | sí, si era `pausa` |

Una sola espera para todo: tras cualquier panel, se vea el anuncio o no, **no salta ningún otro hasta 15 minutos de juego después**.

**Día:** la cuenta se pone a cero solo cuando hoy es posterior a `day`. Con el reloj hacia atrás no se pone a cero ni retrocede `day`.

**Estado ilegible:** se trata como «nunca ha habido ninguno». Si el almacén falla al leer o al escribir, no se ofrece ningún anuncio en esa partida.

`sinceLast` se guarda cada 30 segundos de juego, al pasar a segundo plano y al resolverse un panel.

### 2. Premio (`src/core/economy.ts`)

`adReward(state)`: la décima parte del precio del recinto más barato que queda por abrir, redondeada, con un mínimo de 10. Con todo abierto, la décima parte del recinto más caro.

| Recinto más barato por abrir | 50 | 100 | 150 | 250 | 400 | 600 | 900 | 1.300 | 1.600 | ninguno |
|---|---|---|---|---|---|---|---|---|---|---|
| Premio | 10 | 10 | 15 | 25 | 40 | 60 | 90 | 130 | 160 | 160 |

La cantidad se fija al abrir el panel: es la que se enseña y la que se paga. El premio configurado en AdMob no se usa.

### 3. Sistema de anuncios (`src/systems/ads.ts`, nuevo; sin Phaser ni complemento, dependencias inyectadas)

Proveedor, para poder probar con uno falso:

```ts
type AdSlot = 'tienda' | 'pausa';
interface AdProvider {
  /** Carga un anuncio. `true` si queda listo. */
  load(slot: AdSlot): Promise<boolean>;
  /** Enseña el anuncio cargado y resuelve cuando se cierra. */
  show(slot: AdSlot): Promise<{ shown: boolean; rewarded: boolean }>;
}
```

La clase `Ads`:

- **Carga con antelación, no al arrancar.** Pide el anuncio de un hueco cuando falta un minuto o menos para que las reglas lo permitan. Una partida corta no llega a pedir ningún anuncio.
- **Reintento:** si la carga falla, vuelve a probar cada 2 minutos mientras siga haciendo falta. Un anuncio cargado hace más de 50 minutos se vuelve a pedir.
- `canOffer(slot)`: reglas de ritmo cumplidas **y** anuncio listo.
- `offer(slot)`: devuelve la cantidad del premio y la deja fijada.
- `accept(slot)`: pausa el sonido, enseña el anuncio, actualiza el ritmo y, solo si `rewarded` es verdadero, suma las monedas con `Session.earnCoins`. Después reanuda el sonido.
- `decline(slot)`: actualiza el ritmo.
- Avisa por el `bus` de cada paso (ver apartado 7).
- **Nunca lanza:** todo fallo acaba en «no hay anuncio». La publicidad nunca impide jugar.

`src/systems/adProvider.ts` (nuevo) envuelve el complemento: `prepareRewardVideoAd` / `showRewardVideoAd` para `tienda` y `prepareRewardInterstitialAd` / `showRewardInterstitialAd` para `pausa`. `rewarded` sale del aviso `Rewarded`; `Dismissed` solo indica que se cerró.

`src/systems/adsInstall.ts` (nuevo): crea `Ads` con las dependencias reales, lleva el reloj de juego y escucha el `bus`. **No instala nada** si no es Android nativo o falta la configuración.

Sonido: `PauseReason` gana `'ad'`.

### 4. Modo infantil

- El SDK se inicia justo antes de la primera carga, no al abrir el juego, con `tagForChildDirectedTreatment: true` y `maxAdContentRating: General`.
- En el manifiesto se retrasa la medición automática del SDK (`com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT`), para que no envíe nada antes de ese inicio.
- No se marca además «menor de la edad de consentimiento»: Google indica que no se activen las dos marcas a la vez y que manda la de niños.
- No se llama a `requestConsentInfo` ni a `showConsentForm`.
- `AndroidManifest.xml` quita el permiso `com.google.android.gms.permission.AD_ID` (`tools:node="remove"`) y los permisos de `ACCESS_ADSERVICES_*` que añada el SDK. La lista exacta sale del manifiesto fusionado en el primer paso del plan.
- **Comprobación automática** sobre el manifiesto fusionado de la compilación de publicación: no hay `AD_ID` y sí está el identificador de la app de AdMob.

### 5. El panel (`src/scenes/AdOfferScene.ts`, nuevo)

Escena `AdOffer`, por encima de la que la abre (que queda en pausa). Hecha con las piezas de `src/ui/` (`addVeil`, `addPanel`, `addPillButton`, `addCloseBadge`, `coinImage`).

- Monedas apiladas y la cantidad en grande: «+25».
- Botón verde grande con el icono `play`. Sin texto dentro.
- X en la esquina del panel.
- Una frase corta debajo: «¡Mira un anuncio y gana 25 monedas!» / «Watch an ad and get 25 coins!».
- Al abrirse suena `coin`.
- Tocar fuera del panel no hace nada (evita cierres sin querer).
- El botón atrás de Android equivale a la X: `decideBack` gana el caso del panel abierto.
- **En `pausa`:** cuenta atrás de 5 segundos alrededor del botón verde. Al llegar a cero empieza el anuncio. La X se lo salta.
- **En `tienda`:** sin cuenta atrás. El anuncio solo empieza si el niño toca el botón verde.

**Después del anuncio:**

- Visto entero: suena `coin`, sube el contador de monedas y sale el aviso «¡25 monedas para ti!» / «25 coins for you!».
- Cerrado antes: se vuelve al juego sin más.
- No se pudo enseñar: aviso «Ahora no hay anuncio» / «No ad right now» y se vuelve al juego.

### 6. Dónde salta

- **`tienda`:** en `ShopScene`, medio segundo después de entrar, si `canOffer('tienda')`. La tienda queda en pausa mientras el panel está abierto. El tendero y sus frases no cambian.
- **`pausa`:** al volver al mapa tras cerrar la pantalla de dar de comer o salir de la tienda (`feed-closed`, `shop-closed`), si `canOffer('pausa')`. El mundo queda en pausa.
- **Nunca:** en la portada, al abrir el juego, mientras se arrastra comida, en el libro, en Ajustes ni en «¿Salir?».

### 7. Estadísticas (Matomo)

Eventos nuevos del `bus` y categoría `anuncio` en `eventCatalog.ts`. El nombre es el hueco (`tienda` o `pausa`).

| Acción | Cuándo | Valor |
|---|---|---|
| `anuncio-ofrece` | salta el panel | monedas |
| `anuncio-acepta` | toca el botón verde, o la cuenta atrás llega a cero | |
| `anuncio-no` | toca la X | |
| `anuncio-visto` | visto entero | monedas |
| `anuncio-cortado` | cerrado antes de tiempo | |
| `anuncio-fallo` | no se pudo enseñar | |
| `anuncio-vacio` | las reglas lo permitían y no había anuncio listo | |

**Monedas que tenía el niño:** `anuncio-ofrece`, `anuncio-acepta`, `anuncio-no` y `anuncio-visto` llevan en el nombre el hueco y el tramo de saldo al saltar el panel (`tienda/100-499`), con el `coinsBucket` que ya existe. Así el cruce viaja hecho y se lee sin segmentos. Las demás acciones llevan solo el hueco.

**Qué se puede leer con esto:** cuántos paneles saltan, qué parte se acepta y qué parte se rechaza, cuántos anuncios se ven enteros, cuántas monedas se reparten (suma del valor de `anuncio-visto`) y si rechazan más los que tienen muchas monedas. `tools/matomo/resumen.mjs` gana un apartado «Anuncios» con esas cifras.

**Lo que no sale aquí:** el dinero real. Los ingresos en euros solo están en el panel de AdMob.

`anuncio-vacio` se envía una vez por ocasión. Es el dato que dice si faltan anuncios. `AdOffer` entra en la lista de pantallas como `anuncio`.

### 8. Configuración

El repositorio es público: los valores reales no se suben.

- `game/.env.production.local` (ignorado por git; se amplía `.env.example`): `VITE_ADMOB_REWARDED` y `VITE_ADMOB_REWARDED_INTERSTITIAL`. Si falta alguno, ese hueco no existe; si faltan los dos, no hay publicidad.
- **Identificador de la app de AdMob:** el SDK cierra la app al arrancar si no está en el manifiesto. Va con `manifestPlaceholders`: por defecto, el identificador público de pruebas de Google; el real se lee de un archivo local ignorado por git o de una variable de entorno, como la firma.
- **Modo de pruebas:** en desarrollo, y en producción con `VITE_ADMOB_TESTING=1`, se piden los anuncios de prueba de Google.

### 9. Textos legales

`public/privacidad.html` y `public/privacidad-en.html`:

- Apartado nuevo «Publicidad»: solo en Android; solo anuncios con premio y que se pueden rechazar; los sirve Google AdMob marcados como dirigidos a niños; sin personalizar y sin identificador de publicidad; qué recibe Google (dirección IP, datos del aparato, interacción con el anuncio, diagnóstico); enlace a la política de Google.
- Retocar «En pocas palabras», «Permisos» y «Niños». Actualizar la fecha y el último apartado.

La página pública de privacidad de davidpladel.com debe decir lo mismo.

### 10. Pasos manuales de David

Irán escritos paso a paso en el plan:

- **AdMob:** crear la cuenta y la app, dos bloques de anuncios (bonificado e intersticial bonificado), fijar la clasificación máxima de contenido en «G», revisar las categorías bloqueadas, registrar su móvil como dispositivo de prueba y publicar `app-ads.txt` en davidpladel.com.
- **Play Console:** «Anuncios: sí»; rehacer «Seguridad de los datos» con lo que recoge el SDK (ubicación aproximada, interacciones con la app, diagnóstico, identificadores del dispositivo; finalidad publicidad, análisis y prevención del fraude); el identificador de publicidad sigue en «No».
- Pasar a Claude los identificadores de AdMob.
- **No tocar nunca anuncios reales en el propio móvil:** AdMob lo cuenta como tráfico no válido y puede cerrar la cuenta. Las pruebas se hacen con anuncios de prueba.

### 11. Versión y documentación

- Versión **2.6.0**, `versionCode` 7.
- Al cerrar: `README.md` (hoja de ruta, línea de Familias, fila de esta spec y su plan), `game/README.md`, nota en la spec principal y lista de comprobaciones de `docs/privado/play-store.md`.

## Pruebas

- **Unitarias (`adPacing`):** bordes de cada regla (299 y 300 segundos, 899 y 900, 3 y 4 anuncios), nunca ha habido panel, X y fallo no suman al día, `pausa` una vez por partida, `pausa` bloqueada si ya se vio un anuncio, partida nueva tras 30 minutos, cambio de día, reloj hacia atrás, estado ilegible, fallo del almacén.
- **Unitarias (`adReward`):** cada fila de la tabla y todo abierto.
- **Unitarias (`ads`, con proveedor falso):** sin configuración; no carga antes de tiempo; reintento; anuncio caducado; sin anuncio listo (no ofrece y avisa `anuncio-vacio` una vez); visto entero (monedas y eventos); cerrado antes (sin monedas, cuenta); fallo al enseñar; X; el proveedor lanza.
- **Unitarias (`back`):** el panel abierto se cierra con atrás.
- **Pruebas de juego (Playwright, proveedor falso por `testHooks`):** el panel salta al entrar en la tienda cuando toca y no salta cuando no; el botón verde da las monedas; la X cierra; cuenta atrás de `pausa`.
- **Android, a mano, con anuncios de prueba:** los dos paneles, sonido que para y vuelve, botón atrás, sin conexión (no salta nada), tocar el anuncio y volver al juego.
- **Paquete:** la comprobación del manifiesto pasa.

## Riesgos

- **Pocos anuncios o ninguno en España.** Los anuncios para niños son pocos y en Europa solo se sirven los «limitados». Puede que el intersticial bonificado no tenga. Alternativa, a decidir con David si pasa: que `pausa` use el formato bonificado y pierda la cuenta atrás (el anuncio solo empieza si el niño toca el botón).
- **No se puede medir con anuncios reales antes de publicar.** AdMob limita los anuncios reales hasta que la app está pública en una tienda, enlazada en AdMob y revisada por ellos, lo que suele tardar un par de días ([requisitos de AdMob](https://support.google.com/admob/answer/10564477)). Una app en prueba cerrada no se puede enlazar. Antes de publicar se prueba con anuncios de prueba; el dato real llegará con `anuncio-vacio` tras la salida.
- **Revisión de Google.** Es la primera versión con un SDK de anuncios y con niños es más estricta. El panel previo, la X a los 5 segundos, el permiso quitado y la marca de niños van por eso.
- **Contenido de los anuncios.** No se elige. AdMob permite bloquear categorías; queda como paso manual.
- **Ingresos bajos.** Con estos límites y este público, el ingreso por jugador será pequeño. Solo sumará con muchos jugadores.
- **El anuncio saca al niño del juego si lo toca.** Es propio de cualquier anuncio. Al volver, el juego sigue donde estaba.

## Fuera de alcance

Pagar por quitar anuncios, anuncios en la web, tiras fijas, anuncios sin premio, mediación con otras redes, formulario de consentimiento, interruptor en Ajustes, y el buzón y las votaciones.

## Estado de implementación

Hecho y con pruebas: ritmo (`core/adPacing`), premio (`adReward`), configuración (`core/adConfig`), sistema (`systems/ads`), avisos del SDK (`systems/adProvider`), arranque (`systems/adsInstall`), panel (`scenes/AdOfferScene`), los dos momentos (tienda y pausa), botón atrás, estadísticas y resumen, manifiesto sin identificador de publicidad con su comprobación, y textos de privacidad.

Pendiente: pasos de David en AdMob y Play Console, la prueba en Android con anuncios de prueba y la página pública de davidpladel.com. Ver el plan.

## Decisiones tomadas durante la implementación

- `anuncio-vacio` se envía una vez por hueco hasta que se resuelve un panel o empieza otra partida.
- El complemento solo se toca en `adsInstall.ts`; `adProvider.ts` recibe una fachada mínima y tiene pruebas.
- Si el SDK no avisa de que el anuncio se abrió en 10 segundos, se da por fallido.
- El botón verde es redondo, con la cuenta atrás como anillo alrededor.
- El panel de la pausa salta 300 ms después de volver al mapa. La pantalla de dar de comer reanuda el mapa con `{ from: 'feed' }`.
- Los tramos de saldo son los de `coinsBucket` (`0-19` … `1600+`).
- El identificador de la app de AdMob se lee de `ZOO_ADMOB_APP_ID` o de `game/android/admob.properties`.
- La política de Google va escrita en la página de privacidad, no como enlace pulsable.
- La prueba `legal.test.ts` pasa a exigir 10 apartados en la página de privacidad (antes 9).
- «Permisos» de la página de privacidad nombra también los permisos técnicos que declara el SDK de anuncios (estado de la red, mantener el aparato despierto, segundo plano).
