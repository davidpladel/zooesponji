# Código de Android optimizado con R8

Fecha: 2026-10-25 · Estado: implementada el 2026-11-01 en la rama `feat/optimizacion-r8`, sin compilar ni probar todavía (ver «Estado de implementación»). Revisada la mañana del 25 con las capturas de Play Console de David, las guías de Capacitor 8.0 y 8.5 leídas enteras, y las cifras de Google comprobadas contra el texto original de sus páginas (ver «Cómo se ha comprobado»).

## En pocas palabras

Sobre la 2.7.1, Google Play muestra «Optimización de código DEX: Baja» y recomienda «Actualiza a la versión 9.0 de AGP y usa R8». Lo he comprobado en el paquete de la 2.8.1: el juego se compila con el optimizador de Android (R8) **apagado** (`minifyEnabled false`). Por eso el paquete lleva entero el código de todas las librerías, se use o no, sin encoger ni optimizar.

- **Ahora (2.8.2):** encender R8 con las herramientas que ya usamos (AGP 8.13). Es lo que Google mide de verdad, y con AGP 8.13 lo mide igual que con AGP 9.
- **Después:** pasar a AGP 9. Hoy no se puede hacer bien: Capacitor 8 no lo admite y Capacitor 9, que sí, está en alfa. Se hará cuando salga Capacitor 9 estable (condiciones en el bloque 2).
- **Las otras tres recomendaciones de Play** (tabletas y pantalla completa) y el ahorro en imágenes: bloque 3. Una línea del manifiesto entra ya en la 2.8.2; lo demás va aparte.
- **Android vitals no tiene datos todavía** (cierres, ANR, memoria, arranque): somos pocos jugadores para que Google calcule porcentajes. La comprobación de la 2.8.2 no puede apoyarse en ellos.

## Qué pide Google (revisado el 25-oct-2026 en las páginas oficiales)

- **Qué mide:** el porcentaje de clases, métodos y campos del código Android (los archivos DEX) que están optimizados, ofuscados (renombrados) y encogidos (lo que no se usa, quitado). Con AGP 8.10 o posterior, en su último parche, lo lee de `BUNDLE-METADATA/com.android.tools/r8.json` dentro del AAB. Si no está, del archivo de desofuscación o, si tampoco, de una estimación.
- **Umbral:** mínimo un 25 %. Los avisos solo llegan a las apps con más de 10 MB de DEX y a los juegos con más de 50 MB.
- **Visibilidad:** no es una «métrica principal», pero desde **febrero de 2027** las apps que no cumplan los umbrales de memoria, memoria de mapas de bits u optimización de código pueden perder visibilidad en Play.
- **Nuestro caso:** en Play, Zoo Esponji es un juego (categoría Simulación) y tiene 16,4 MB de DEX. Según la tabla de Google, eso queda por debajo de los 50 MB de los juegos, así que seguramente la pérdida de visibilidad no nos tocaría. Merece la pena igual: la descarga baja de tamaño, el móvil carga menos código al arrancar y el aviso desaparece. Además, el cambio es pequeño.
- **AGP 9 y R8:** R8 es la misma herramienta en AGP 8.13 y en AGP 9. AGP 9 trae mejores valores por defecto (prohíbe la configuración vieja sin optimizar, encoge los recursos de forma más fina y aplica reglas más estrictas), pero la puntuación ya se calcula igual con AGP 8.13.

## Cómo está hoy (medido en `zooesponji-2.8.1-vc11.aab`)

| Parte del AAB | Sin comprimir | Comprimido |
|---|---|---|
| Código Android (`classes.dex` y `classes2.dex`) | **16,42 MB** | 6,23 MB |
| Juego (`assets`: web, arte, sonido) | 4,31 MB | 2,55 MB |
| Recursos de Android (`res`: icono, pantalla de inicio…) | 2,13 MB | 1,87 MB |
| AAB entero | | 11,05 MB |

- **El código Android pesa casi cuatro veces más que el juego.** Son 17.602 clases. Las nuestras son 3 (`MainActivity` y dos auxiliares) y 7 de recursos (`R`). El resto son librerías: SDK de anuncios de Google (8.862 clases de `com.google.android.gms`, más 1.982 de Guava y 333 de `checkerframework`, que vienen con él), AndroidX (3.719), Kotlin y sus corrutinas (1.928), y Capacitor con Cordova (378).
- **Metadatos del AAB:** lleva `com.android.tools/d8.json` (compilador sin optimizar, versión 8.13.6) y no lleva `r8.json`. AGP 8.13.0.
- **Ninguna librería apaga la optimización.** Revisadas las reglas que traen las librerías en la caché de Gradle (35 archivos): ninguna lleva `-dontoptimize`, `-dontobfuscate` ni `-dontshrink`.
- **Antecedente:** la guía privada `docs/privado/play-store.md` dice, ante el aviso «no hay archivo de desofuscación», «Ignorarlo; no activar R8». Esta spec cambia esa decisión.

## Qué dice Play Console (capturas de David, 25-oct-2026)

**Android vitals → Información general.** Cuatro acciones recomendadas, todas sobre la 2.7.1 (versionCode 9):

1. «Es posible que la vista de extremo a extremo no funcione para todos los usuarios» (experiencia de usuario).
2. «Tu aplicación usa APIs o parámetros obsoletos para la vista de extremo a extremo» (experiencia de usuario).
3. «Quita las restricciones de redimensionamiento y orientación de tu juego para que sea compatible con dispositivos de pantalla grande» (experiencia de usuario).
4. «Mejora la memoria y el rendimiento de tu aplicación con la optimización de R8» (uso de memoria). Es la de esta spec.

Las métricas salen todas sin datos: cierres, ANR, cierres por falta de memoria, uso de memoria, mapas de bits, arranque, renderizado, batería y permisos. Solo hay «datos limitados» de uso: 25,11 % de usuarios diarios entre mensuales y 2,07 % de pérdida de usuarios. Con tan pocos jugadores, Google no calcula los porcentajes, así que la 2.8.2 se comprobará de otra forma (apartado 9).

**Tamaño de la aplicación** (calculado por Play para un móvil XXXHDPI con ARMv8):

- Descarga de unos 9,8 MB, igual en la 2.7.1 y en la 2.8.1. De ellos, unos 6,3 MB son código (DEX), unos 2,5 MB el juego y unos 0,8 MB recursos de Android. **El código es casi dos tercios de lo que se descarga.**
- Recomendaciones: «Habilita la ofuscación y la reducción de código» (sin hacer; es esta spec) y «Usa imágenes WebP cuando sea posible», con un ahorro de 699 kB (7,05 %). Los APK por idioma, densidad y ABI ya están hechos.
- El 5,8 % de los móviles activos tiene menos de 2 GB libres.
- La gráfica ya enseña la 2.8.1 (versionCode 11): está subida, así que la 2.8.2 será la 12.

## Objetivo

Que el paquete de Android lleve solo el código que se usa, optimizado, **sin que el juego cambie en nada** para el niño.

**Se sabrá que está bien si:**

- El AAB lleva `r8.json` y el archivo de desofuscación, y su código Android pesa bastante menos que 16,4 MB.
- En el móvil todo funciona igual que en la 2.8.1, anuncios de prueba incluidos (lista del apartado 8).
- En Play, la optimización de código DEX deja de salir «Baja», desaparecen la recomendación de R8 y el aviso de que falta el archivo de desofuscación, y el tamaño de descarga baja en «Tamaño de la aplicación».
- No llega ningún cierre nuevo a «Fallos y errores ANR» de Play Console tras publicar (apartado 9).

## No objetivos

- No se toca el juego (TypeScript y Phaser), ni los textos, ni la privacidad, ni lo declarado en Play Console. R8 no toca `assets/public`, donde va el juego.
- No se pasa a AGP 9 ni a Capacitor 9 en esta versión.

## Anti-objetivos (aunque «funcione», sería un fracaso)

- Una versión que se cierre al abrir o al usar un complemento (anuncios, guardado, botón atrás).
- Reglas anchas que dejan la puntuación bonita sin optimizar de verdad: `-keep class ** { *; }`, `-keep class com.getcapacitor.** { *; }`, `-dontoptimize`, `-dontobfuscate`, o apagar el modo completo de R8 (`android.enableR8.fullMode=false`).
- Parchear archivos dentro de `node_modules` o usar los interruptores provisionales de AGP 9 (`android.builtInKotlin=false`, `android.newDsl=false`).

## Bloque 1: R8 en la 2.8.2 (ahora)

### 1. Capacitor con las reglas de R8 arregladas

Hay un fallo conocido de Capacitor 8 con R8 en modo completo, que es el que usa AGP 8 por defecto ([#8589](https://github.com/ionic-team/capacitor/issues/8589), [#8587](https://github.com/ionic-team/capacitor/issues/8587)): R8 elimina las anotaciones que Capacitor lee por reflexión y la app se cierra en cuanto un complemento pasa por los permisos. Nos afecta: el complemento de AdMob declara un permiso en su anotación (`@Permission(alias = "network")`). Está arreglado en `main` de Capacitor ([#8646](https://github.com/ionic-team/capacitor/pull/8646), y [#8657](https://github.com/ionic-team/capacitor/pull/8657) del 23-oct-2026). Los mantenedores han dicho que saldrá como parche de Capacitor 8. El 25-oct-2026 la última estable es la 8.5.3, todavía sin el arreglo; la compilación nocturna `8.5.4-nightly-20261023` ya lo trae.

Al implementar, mirar `npm view @capacitor/android version`:

- **Si ya hay una 8.5.4 o posterior estable:** subir a esa versión `@capacitor/core`, `@capacitor/android` y `@capacitor/cli` (las tres iguales) y `npx cap sync android`. Sin reglas propias para Capacitor. Subir también `@capacitor/app` y `@capacitor/preferences` a su último parche 8.x, por si traen reglas suyas.
- **Si todavía no:** quedarse en 8.5.2 y copiar en `proguard-rules.pro` las mismas reglas que trae la 8.5.4, con un comentario para quitarlas al actualizar:

```proguard
# Hasta @capacitor/android 8.5.4: Capacitor lee estas anotaciones por reflexión y R8 las quitaría
# (ionic-team/capacitor#8589). Son las de su versión 8.5.4: quitarlas al actualizar.
-keep @interface com.getcapacitor.annotation.** { *; }
-keep @interface com.getcapacitor.PluginMethod { *; }
-keep @interface com.getcapacitor.NativePlugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.PermissionCallback <methods>;
}
```

`@capacitor-community/admob` se queda en la 8.2.1, la última. No trae reglas de R8 propias, y revisado su código, no usa reflexión. Lo que necesita su anotación lo cubren las reglas de Capacitor.

### 2. Herramientas (`game/android/build.gradle`)

- AGP `8.13.0` → **`8.13.2`**, el último parche de la 8.13. Google pide el último parche para leer `r8.json`.
- Gradle 8.14.3 y el JDK 21 de la guía de Play no cambian.
- Los `build.gradle` de los complementos siguen diciendo 8.13.0: manda el del proyecto raíz. No se tocan.

### 3. Encender R8 (`game/android/app/build.gradle`)

```groovy
release {
    if (zooCanSign) {
        signingConfig signingConfigs.release
    }
    // R8: quita el código y los recursos que no se usan, renombra y optimiza (lo que mide Google Play).
    minifyEnabled true
    shrinkResources true
    proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
}
```

Solo en `release`. La compilación de depuración (la de «▶ Run» en Android Studio) sigue sin R8.

### 4. `game/android/gradle.properties`

```properties
# Encogido de recursos nuevo de R8 (en AGP 9 viene por defecto; en AGP 8.12 y 8.13 hay que pedirlo).
android.r8.optimizedResourceShrinking=true
```

No se añade `android.enableR8.fullMode`: el modo completo ya viene por defecto.

### 5. `game/android/app/proguard-rules.pro`

- `-keepattributes SourceFile,LineNumberTable` y `-renamesourcefileattribute SourceFile`, para que los cierres que enseña Play salgan con número de línea (Play los traduce con el archivo de desofuscación).
- Las reglas provisionales del apartado 1, solo si no hay 8.5.4.
- **Nada más.** No hacen falta reglas propias:
  - `MainActivity` está en el manifiesto, y R8 conserva lo que el manifiesto nombra.
  - `AdBarsHider` reconoce la pantalla del anuncio por el nombre `com.google.android.gms.ads.AdActivity`, escrito como texto. Esa actividad la declara el manifiesto del SDK, así que su nombre no cambia.
  - El puente con JavaScript (`@JavascriptInterface`) lo conserva el archivo de Google (`proguard-android-optimize.txt`).
  - Capacitor carga los complementos por su nombre desde `assets/capacitor.plugins.json`. AdMob, además, se registra con el nombre de su clase, porque su anotación no lleva `name`. La regla de Capacitor `-keep public class * extends com.getcapacitor.Plugin { *; }` conserva esos nombres.
- Una regla nueva solo entra tras un fallo real, nombra la clase concreta y lleva comentario del porqué. Nunca un paquete entero.

### 6. Comprobación del paquete: `npm run check:aab` (nuevo)

Como `check:manifest`: `scripts/aabRules.ts` (reglas puras, sin dependencias) y `scripts/check-aab.ts` (lee el AAB con `adm-zip`, que ya está en el proyecto). Recibe la ruta del AAB; si no se le da, usa `android/app/build/outputs/bundle/release/app-release.aab`.

Falla si:

- No está `BUNDLE-METADATA/com.android.tools/r8.json` (R8 no se ejecutó) o está `d8.json` en su lugar.
- No está el archivo de desofuscación (se espera en `BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map`).
- `android/app/build/outputs/mapping/release/configuration.txt` (la configuración final de R8, con todas las reglas de todas las librerías) tiene una línea que empieza por `-dontoptimize`, `-dontobfuscate` o `-dontshrink`.

Enseña el tamaño del AAB, el de cada `.dex` y el total, para apuntar el antes y el después. No hay un tamaño mínimo que cumplir: si el código baja poco, se mira en `seeds.txt` (junto a `configuration.txt`) qué reglas lo retienen, pero eso no frena la versión si `r8.json` está y la lista del móvil pasa.

Las rutas de `r8.json`, del archivo de desofuscación y de `configuration.txt` hay que confirmarlas con el primer AAB real. Si AGP 8.13.2 las pone en otro sitio, se ajusta la regla; si no deja `configuration.txt`, se pide con `-printconfiguration` en `proguard-rules.pro`. Se apunta en «Decisiones tomadas durante la implementación».

### 7. Versión

- **2.8.2**, `versionCode` **12** (la 2.8.1, el 11, ya está subida: sale en «Tamaño de la aplicación»). Cambia en `game/package.json`, `game/android/app/build.gradle` y la línea de versión de `game/README.md`.
- Solo lleva R8 y la línea del manifiesto del bloque 3a, que no cambia nada en móviles: si algo falla, se sabe que es R8. Las imágenes WebP y el resto van en la versión siguiente.
- Notas de la versión: se redactan cuando haya números medidos y David valida el texto antes de traducirlo (regla de siempre). Solo se afirma lo que esté medido; por ejemplo, el tamaño de descarga que enseña el explorador de app bundles de Play Console, antes y después.

### 8. Pruebas

El AAB se compila, como siempre, en la carpeta principal del repositorio (`C:\Projects\games\zooesponji\game`), que es la que tiene `node_modules`, el arte privado, `admob.properties` y la firma. La carpeta de trabajo de esta rama no los tiene.

- **Unitarias:** `tests/unit/aab.test.ts` para `aabRules` (paquete correcto, sin `r8.json`, con `d8.json`, sin archivo de desofuscación, cada opción global prohibida, cálculo del tamaño) y el caso nuevo de `androidManifest.test.ts` (falta `android:appCategory="game"`). David lanza `npm run typecheck` y `npm test`, como antes de cada versión.
- **Compilación:** `gradlew.bat clean bundleRelease` termina bien con R8. Se guardan sus avisos. Los avisos de metadatos de Kotlin (el complemento de AdMob se compila con Kotlin 2.2.20) son avisos, no errores: se apuntan. Después, `npm run check:manifest -- --publicar` y `npm run check:aab`.
- **En el móvil, con la compilación de publicación y anuncios de prueba** (`VITE_ADMOB_TESTING=1` en `.env.production.local`). Tiene que instalarse la variante `release`: la de depuración no pasa por R8. Quien implemente elige cómo (variante `release` en Android Studio o `gradlew.bat installRelease`) y le deja a David los pasos en PowerShell, uno por bloque. La lista:
  - [ ] Abre: pantalla de inicio, portada, sin la pantalla «¡Ups!».
  - [ ] Guardado: jugar, comprar algo, salir con «Salir», volver a abrir. Siguen las monedas, lo comprado y el idioma.
  - [ ] Andar con el joystick, dar de comer arrastrando a dos animales, comprar en la tienda, abrir el libro.
  - [ ] Ajustes: cambiar de idioma, abrir la privacidad. La versión dice 2.8.2.
  - [ ] Tablón con internet: salen las ideas y los dibujos.
  - [ ] Botón atrás: cierra paneles; en la portada sale del juego y lo quita de las recientes.
  - [ ] Segundo plano y vuelta: la música para y vuelve; el modo inmersivo se recupera.
  - [ ] Anuncio de la tienda (sale a partir de 5 minutos de juego, como en la lista C del plan de publicidad de la 2.6.0): panel, «Test Ad», premio al verlo entero; sin barra de navegación encima y con el botón de cerrar visible; la música para y vuelve.
  - [ ] Anuncio de la pausa: panel con cuenta atrás y anuncio de prueba.
  - [ ] Modo avión: el juego va igual y no sale ningún panel de anuncio.
  - [ ] Girar el móvil a un lado y al otro (sigue apaisado).
- **Paquete final** (sin `VITE_ADMOB_TESTING`): `check:manifest -- --publicar`, `check:aab`, firma y versión dentro del AAB (pasos 3 y 4 de la guía de Play). Se sube primero a **Prueba interna** (con David en su lista de testers); David lo instala desde Play y juega dos minutos sin tocar ningún anuncio (nunca anuncios reales en su móvil). Después pasa a producción con «Añadir de la biblioteca».

### 9. Publicación y vigilancia

Android vitals no tiene datos (somos pocos jugadores), así que no se puede comparar el porcentaje de cierres antes y después. La comprobación se apoya en esto:

- **La prueba en el móvil del apartado 8.** Es la que de verdad cuenta.
- **El informe previo al lanzamiento de Play**, en el que Google abre el juego en varios móviles reales y apunta los cierres. Si Play lo genera para la prueba interna, esperar a que salga y que no tenga cierres antes de pasar a producción; si no lo genera, basta la prueba en el móvil. Cuándo lo genera está por confirmar en la ayuda de Play (ver «Cómo se ha comprobado»).
- **Después de publicar**, mirar «Fallos y errores ANR» en Play Console unos días. Cualquier cierre con `com.getcapacitor`, `ClassNotFoundException`, `NoSuchMethodException`, o un `NullPointerException` en `Bridge` o `PluginHandle`, apunta a R8. Con el archivo de desofuscación dentro del AAB, Play enseña los nombres de verdad.
- **Producción directamente al 100 %.** Un lanzamiento progresivo no serviría de nada con tan pocos jugadores: no llegarían datos en unos días y solo retrasaría la versión.
- **Optimización de código DEX y tamaño:** mirarlos unos días después de publicar y apuntar los valores en esta spec.
- **Si algo sale mal:** Play no deja bajar el `versionCode`. Se publica enseguida una 2.8.3 (`versionCode` 13) con `minifyEnabled false` mientras se arregla.

### 10. Documentación al cerrar

- Esta spec: «Estado de implementación» y «Decisiones tomadas durante la implementación», con los tamaños antes y después.
- `README.md`: línea de la 2.8.2 y lista de pendientes.
- `game/README.md`: el comando `npm run check:aab` y la versión.
- `docs/privado/play-store.md` (solo en la carpeta de David, fuera de git): cambiar la fila «Aviso no hay archivo de desofuscación», añadir `check:aab` al paso 3, poner el tamaño real del AAB (la guía dice «~5 MB» y hoy son 11 MB) y el historial de `versionCode`.

## Bloque 2: AGP 9 (cuando salga Capacitor 9 estable)

**Por qué no ahora:**

- Los mantenedores de Capacitor lo han dicho en [#8587](https://github.com/ionic-team/capacitor/issues/8587): AGP 9 y R8 encendido por defecto llegan con Capacitor 9, porque rompen compatibilidad.
- Capacitor 9 va por la `9.0.0-alpha.8` (en npm como `next`). No es para una app infantil publicada y con anuncios.
- El complemento de AdMob aplica el plugin `kotlin-android` y usa `kotlinOptions`. Con AGP 9 obliga a los interruptores provisionales `android.builtInKotlin=false` y `android.newDsl=false` ([admob#459](https://github.com/capacitor-community/admob/issues/459)). Google anuncia que quitará el segundo en AGP 10.
- La alternativa sería parchear `node_modules`, y cada `npm install` lo deshace.

**Cuándo:** cuando se cumplan las tres cosas:

- `@capacitor/android` 9.x es la versión `latest` de npm (ni alfa, ni beta, ni candidata).
- Hay una versión de `@capacitor-community/admob` que admite Capacitor 9 (en sus `peerDependencies`).
- Android Studio 2026.1.1 o posterior. David tiene una 2026.1 (compilación AI-261): comprobar el número exacto.

**Qué supone** (según la guía oficial de hoy, [Updating to 9.0](https://capacitorjs.com/docs/next/updating/9-0); releerla cuando toque):

- `npx cap migrate`, AGP 9.2.1 o posterior, Gradle 9.5.1 o posterior y Node 24 o posterior.
- `compileSdk` y `targetSdk` 37 (el `targetSdk` sale solo de `compileSdk`).
- **`minSdk` de 24 a 26:** deja fuera los móviles con Android 7.0 y 7.1. Lo decide David con los datos de Play Console (dispositivos por versión de Android).
- Quitar `android.r8.optimizedResourceShrinking` de `gradle.properties` (en AGP 9 viene por defecto) y no dejar los interruptores que escribe el asistente de actualización de Android Studio.
- Conservar nuestros bloques de `app/build.gradle` (firma e identificador de AdMob): `cap migrate` edita ese archivo sustituyendo texto.
- R8 sigue como en el bloque 1. En AGP 9 las reglas son más estrictas (`-keep class A` ya no conserva su constructor): revisar las nuestras y repasar la misma lista del móvil.
- Tendrá su propio plan.

## Bloque 3: las otras recomendaciones de Play

### 3a. Tabletas: marcar el juego como juego (entra en la 2.8.2)

Desde Android 16, con `targetSdk` 36 como el nuestro, en pantallas grandes (tabletas y plegables abiertos, a partir de 600 dp de ancho mínimo) se ignoran `screenOrientation`, incluido nuestro `sensorLandscape`, y los límites de tamaño. Es lo que señala la recomendación 3. **Los juegos quedan exentos si lo declaran con `android:appCategory`** ([cambios de Android 16](https://developer.android.com/about/versions/16/behavior-changes-16)), y nuestro manifiesto no lo declara. Hoy, en una tableta con Android 16, el juego puede abrirse en vertical y enseñar la pantalla de «gira el móvil».

- En `game/android/app/src/main/AndroidManifest.xml`, en `<application>`: `android:appCategory="game"`.
- `scripts/manifestRules.ts` lo exige, con su prueba en `tests/unit/androidManifest.test.ts`.
- En los móviles no cambia nada: la regla de Android 16 solo afecta a pantallas grandes. En Android anterior al 8 el atributo se ignora.
- El aviso temporal de Google para no adoptar la regla (`PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY`) no se usa: deja de valer con `targetSdk` 37. La exención de los juegos no caduca.
- No es seguro que la recomendación desaparezca de Play Console: Google prefiere que todo se adapte a cualquier pantalla. Lo que sí cambia es lo que hace Android.
- Prueba: si hay a mano una tableta con Android 16, o un emulador de tableta con API 36 en Android Studio, comprobar que el juego sale apaisado. Si no, no se puede probar, y se acepta porque en móviles no cambia nada.

### 3b. Pantalla completa y la cámara del móvil (recomendaciones 1 y 2)

Desde Android 15 (`targetSdk` 35 o más) todas las apps se dibujan de borde a borde, también debajo de la cámara o el «notch»: el modo de recorte que pida la app se trata como «siempre» ([cambios de Android 15](https://developer.android.com/about/versions/15/behavior-changes-15)). Android 16 quita la forma de evitarlo. El juego ya se dibuja a pantalla completa (modo inmersivo), así que lo único que puede salir mal es que la cámara tape algo.

- **Recomendación 2 (funciones obsoletas).** Busqué en el DEX de la 2.8.1 quién llama a `Window.setStatusBarColor` y `setNavigationBarColor`: solo librerías de AndroidX (`androidx.activity` con `EdgeToEdgeApi23`, `26` y `29`, `androidx.core.splashscreen` y `androidx.core` con `WindowCompat`). El modo de recorte lo tocan el SDK de anuncios, AndroidX y Play Core, y `setSystemUiVisibility` también Cordova. Ninguna llamada es nuestra. No hay nada que cambiar en nuestro código. R8 quitará las que no se usen: tras la 2.8.2 se mira si la recomendación sigue. Si sigue, es de las librerías, y se irá cuando se actualicen.
- **Recomendación 1 («puede no funcionar para todos»).** Los botones y números del juego no tienen en cuenta la zona de la cámara. Solo lo hace la página de privacidad (`env(safe-area-inset-*)` en `systems/legal.ts`). Capacitor 8 ya da esa zona al juego: su complemento System Bars inyecta por defecto las variables CSS `--safe-area-inset-*` ([System Bars](https://capacitorjs.com/docs/apis/system-bars)), y `index.html` ya lleva `viewport-fit=cover`.
  - **Paso de David:** en su móvil, con el juego apaisado hacia los dos lados, mirar si la cámara tapa algún botón, número o el joystick. Si no tapa nada, no se hace nada. Si tapa algo, spec pequeña para apartar el marcador de esa zona con esas variables.
  - Capacitor aconseja además llamar a `EdgeToEdge.enable(this)` en `MainActivity`, y Capacitor 9 lo hará solo. Se deja para el bloque 2: ya dibujamos a pantalla completa, así que hoy no cambiaría lo que se ve.

### 3c. Menos peso de descarga (versión siguiente, no la 2.8.2)

Medido el 25-oct-2026 pasando a WebP sin pérdida los PNG de la carpeta compilada y de `res`:

| Qué | PNG | WebP sin pérdida | Ahorro |
|---|---|---|---|
| Imágenes del juego (`dist`, 145 archivos) | 547 kB | 111 kB | 436 kB |
| Pantalla de inicio e iconos de Android (`res`, 31 archivos, todas las densidades) | 1.856 kB | 1.163 kB | 693 kB |

Cada móvil solo descarga los recursos de su densidad, así que en `res` el ahorro real por móvil es una parte (en XXXHDPI, unos 250 kB entre las dos pantallas de inicio y el icono). Cuadra con los 699 kB que estima Play.

Además, `audio/music.mp3` (637 kB) no se usa en Android: el juego carga antes `music.ogg` (`systems/audio.ts`), y el mp3 solo servía de reserva para la web, que ya no existirá. Al quitarlo, comprobar en el móvil que la música suena.

Juntas, las dos cosas quitarían alrededor de 1 MB de la descarga, aparte de lo que quite R8. Convertir el arte toca su cadena de importación (repositorio privado, `art:import` y el manifiesto de arte), y los iconos y la pantalla de inicio salen de `store/make_icon.py`. Por eso van en su propia spec pequeña, en la versión siguiente.

## Seguimiento

- **Android vitals sin datos:** hoy no hay nada que leer. Cuando Play empiece a dar porcentajes, mirar cierres y ANR percibidos, uso de memoria (P50, P90 y P99, y el desglose por proceso: un P99 3,5 veces o más por encima del P50 apunta a una fuga), memoria de mapas de bits y arranque.
- **El SDK de anuncios arranca en el hilo principal:** el complemento llama a `MobileAds.initialize` en el hilo de la pantalla, justo antes del primer anuncio. Puede causar ANR. Que Google aconseje hacerlo en segundo plano lo digo de memoria, sin comprobarlo en su documentación. Solo se mira si llegan ANR con `MobileAds.initialize`.
- **Perfiles de arranque** (ordenar el código para que arranque antes): Google los propone después de R8, pero piden un módulo de pruebas de rendimiento y generarlos en un móvil. Nuestro código Android son 3 clases y el arranque lo marca el WebView, así que ganaríamos poco. No por ahora.

## Alternativas descartadas

- **AGP 9 ya, con Capacitor 8 y los interruptores provisionales:** combinación sin soporte, con interruptores que van a desaparecer (ver bloque 2).
- **Capacitor 9 alfa:** no es estable y AdMob no tiene versión para ella.
- **Solo renombrar, sin optimizar** (`proguard-android.txt` o `-dontoptimize`): AGP 9 lo prohíbe y se pierde casi toda la ganancia.
- **R8 sin modo completo o con reglas anchas:** la puntuación baja y Google dice expresamente que no se haga.
- **Lanzamiento progresivo al 20 %** (estaba en la primera versión de esta spec): con Android vitals sin datos, no daría información en unos días y solo retrasaría la versión.
- **`PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY` para las tabletas:** es temporal y deja de valer con `targetSdk` 37; la marca de juego no caduca.

## Riesgos

- **Algo que se usa por reflexión desaparece y la app se cierra.** Es el fallo conocido de Capacitor (apartado 1). Lo cubren la lista del móvil y la prueba interna. Como Android vitals no tiene datos, un cierre que solo pase en otros móviles se vería tarde, por un informe suelto en «Fallos y errores ANR».
- **El encogido de recursos quita uno que hacía falta** (pantalla de inicio, icono, textos). La lista del móvil lo vería. Si pasa, se conserva ese recurso con `tools:keep` en `res/raw/keep.xml`.
- **Los anuncios reales no se pueden probar en el móvil de David.** Se prueban con los de prueba, que pasan por el mismo código del SDK.
- **La métrica de Play tarda** unos días en reflejar la versión nueva.
- **La compilación de publicación tarda algo más** (R8 solo corre en `release`).

## Fuera de alcance

En la 2.8.2: AGP 9 y Capacitor 9 (bloque 2), `EdgeToEdge.enable`, apartar el marcador de la cámara (solo si hace falta, bloque 3b), WebP y el mp3 (bloque 3c), perfiles de arranque, el arranque del SDK de anuncios en segundo plano y cualquier cambio del juego.

## Estado de implementación

2026-11-01, rama `feat/optimizacion-r8` (David dijo «hazlo»):

- [x] Capacitor 8.6.0 (`core`, `android`, `cli`) y `@capacitor/app` 8.1.2 en `package.json` y `package-lock.json`.
- [x] AGP 8.13.2, `minifyEnabled true`, `shrinkResources true`, `proguard-android-optimize.txt`, `android.r8.optimizedResourceShrinking=true`.
- [x] `proguard-rules.pro`: solo los números de línea.
- [x] `android:appCategory="game"`, exigido por `check:manifest` con su prueba.
- [x] `npm run check:aab` (`scripts/aabRules.ts`, `scripts/check-aab.ts`, `tests/unit/aab.test.ts`).
- [x] Versión 2.8.2, `versionCode` 12.
- [ ] `npm install` y `npx cap sync android`, `npm run typecheck` y `npm test` (David).
- [ ] Compilar el AAB, `check:manifest -- --publicar` y `check:aab`; apuntar los tamaños y confirmar las rutas del apartado 6.
- [ ] Lista del móvil del apartado 8 con la variante `release` y anuncios de prueba.
- [ ] Prueba interna, producción y vigilancia (apartado 9). Notas de la versión validadas por David.
- [ ] `docs/privado/play-store.md` (apartado 10).
- [ ] Paso de David del bloque 3b: mirar si la cámara tapa algo.

## Decisiones tomadas en esta spec (de Claude, para que David las revise)

- R8 ahora en AGP 8.13.2. AGP 9 cuando salga Capacitor 9 estable y AdMob lo admita.
- La 2.8.2 lleva solo R8 y `android:appCategory="game"`. WebP y el mp3, en la siguiente.
- Si Capacitor 8.5.4 no ha salido al implementar, no se espera: se copian sus reglas, y se quitan al actualizar.
- Se encogen también los recursos (`shrinkResources`), con el encogido nuevo de R8.
- Se conservan los números de línea en los cierres (unos pocos KB más) para que se puedan leer en Play.
- Comprobación nueva `npm run check:aab`, para que nadie vuelva a apagar R8 sin darse cuenta.
- Prueba interna en Play antes de producción y, después, producción al 100 % (sin lanzamiento progresivo, porque no hay datos que vigilar).
- El marcador solo se aparta de la cámara si David ve que tapa algo en su móvil.

## Decisiones tomadas durante la implementación

- **Capacitor 8.6.0 en vez de 8.5.4.** No salió ninguna 8.5.4: el arreglo de R8 llegó en la 8.6.0 (28-oct-2026; en su CHANGELOG, «keep plugin annotation types from R8 full mode» y «keep callbacks on non-public base classes from R8»). Leídas sus reglas en el paquete: son las del apartado 1, así que no van reglas propias. `@capacitor/preferences` sigue en la 8.0.1, la última.
- **AdMob se queda en la 8.2.1** aunque ya hay una 8.3.0: la 2.8.2 solo cambia R8, para que si algo falla se sepa que es R8.
- **Sin plan aparte:** los apartados 1 a 7 de esta spec ya dicen archivo por archivo qué cambia.
- **`check:aab` también falla si no está `configuration.txt`**, para no dar por buena una compilación cuyas reglas no se han podido revisar.

## Cómo se ha comprobado

**Leído entero, en el texto original** (descargado y leído línea a línea la mañana del 25-oct-2026, no con resúmenes):

- Google: umbrales de Android vitals (25 %, 10 MB para apps, 50 MB para juegos y la nota de febrero de 2027), la página de optimización de código DEX (`r8.json`, AGP 8.10 en su último parche), cómo activar la optimización (`android.r8.optimizedResourceShrinking` para AGP 8.12 y 8.13), las notas de AGP 9.0 (`builtInKotlin`, `newDsl`, `proguard-android.txt`) y los cambios de comportamiento de Android 15 (borde a borde y cámara) y de Android 16 (tabletas y la exención de los juegos).
- Capacitor: las guías [Updating to 8.0](https://capacitorjs.com/docs/updating/8-0) y [Updating to 8.5](https://capacitorjs.com/docs/updating/8-5), desde su fuente oficial en GitHub, y la página de [System Bars](https://capacitorjs.com/docs/apis/system-bars). **Ninguna de las dos guías habla de R8 ni de AGP 9.** La 8.5 solo trae cambios de iOS. Los pasos de Android de la 8.0 (AGP 8.13.0, Gradle 8.14.3, `variables.gradle`, `google-services` 4.4.4, sintaxis con `=` y `density` en `configChanges`) ya están todos en nuestro proyecto.
- Capgo, [error de plugins con AGP 9](https://capgo.app/es/blog/fix-capacitor-plugin-build-errors-with-agp-9/): solo trata el cambio de `proguard-android.txt` a `proguard-android-optimize.txt`. Nuestra app usa el primero y el apartado 3 lo cambia.

**Comprobado a mano:** las versiones en npm y en el Maven de Google; el AAB de la 2.8.1 abierto con `dexdump` (tamaños, clases y quién llama a las funciones obsoletas); el código de los complementos; las reglas de las librerías en la caché de Gradle; el archivo de reglas por defecto de AGP 8.13 (conserva `@JavascriptInterface`); las reglas de `@capacitor/android` 8.5.3 y de la compilación nocturna 8.5.4; la plantilla Android de Capacitor 9 alfa; y el ahorro de WebP, convirtiendo los PNG de verdad.

**Leído solo en resumen automático** (la primera noche): las incidencias de GitHub (Capacitor #8589, #8587 y #8657; AdMob #459; Stripe #544), la guía de Capacitor 9 y el artículo de Capgo sobre Capacitor 9. Lo que de ahí sostiene una decisión está comprobado aparte: el arreglo de R8, leyendo las reglas de la 8.5.4 en su paquete; los requisitos de Capacitor 9, en su plantilla.

**Sin comprobar todavía (lo digo de memoria o lo deduzco):**

- La ruta exacta del archivo de desofuscación dentro del AAB, y que Play lo use solo. Se comprueba con el primer AAB (apartado 6) y con que desaparezca el aviso de Play.
- Si Play genera el informe previo al lanzamiento para la prueba interna. Su página de ayuda no se pudo leer el 25 por la mañana.
- Que Google aconseje arrancar el SDK de anuncios en segundo plano.
- Que R8 conserva lo que nombra el manifiesto: es como funciona AGP (`aapt_rules.txt`), y la compilación lo enseñará.
- Que `android:appCategory` se ignora antes de Android 8.
- Si el WebView de Android usa hoy el `ogg` o el `mp3`: se comprueba al quitar el mp3.

## Fuentes

[Optimización de código DEX](https://developer.android.com/google/play/vitals/code-optimization) · [umbrales de Android vitals](https://developer.android.com/google/play/vitals#dex_code_optimization) · [uso de memoria](https://developer.android.com/google/play/vitals/memory-usage) · [activar la optimización](https://developer.android.com/topic/performance/app-optimization/enable-app-optimization) · [notas de AGP 9.0](https://developer.android.com/build/releases/agp-9-0-0-release-notes) · [notas de AGP 9.4](https://developer.android.com/build/releases/gradle-plugin) · [cambios de Android 15](https://developer.android.com/about/versions/15/behavior-changes-15) · [cambios de Android 16](https://developer.android.com/about/versions/16/behavior-changes-16) · [Capacitor 8.0](https://capacitorjs.com/docs/updating/8-0) · [Capacitor 8.5](https://capacitorjs.com/docs/updating/8-5) · [System Bars](https://capacitorjs.com/docs/apis/system-bars) · [Capacitor 9](https://capacitorjs.com/docs/next/updating/9-0) · [Capgo, AGP 9](https://capgo.app/es/blog/fix-capacitor-plugin-build-errors-with-agp-9/) · [Capacitor #8589](https://github.com/ionic-team/capacitor/issues/8589) · [#8587](https://github.com/ionic-team/capacitor/issues/8587) · [#8646](https://github.com/ionic-team/capacitor/pull/8646) · [#8657](https://github.com/ionic-team/capacitor/pull/8657) · [AdMob #459](https://github.com/capacitor-community/admob/issues/459).

Comprobado además a mano el 25-oct-2026: versiones en npm (`@capacitor/android` 8.5.3 `latest`, 9.0.0-alpha.8 `next`; `@capacitor-community/admob` 8.2.1), versiones de AGP en el Maven de Google (8.13.2 último de la 8.13; 9.4.1 último estable), las reglas de R8 de `@capacitor/android` 8.5.3 y de la compilación nocturna 8.5.4, la plantilla Android de Capacitor 9 alfa, y el contenido del AAB de la 2.8.1 con `dexdump`.
