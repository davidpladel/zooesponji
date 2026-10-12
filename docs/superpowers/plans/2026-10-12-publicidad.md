# Publicidad con premio para niños — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la versión de Android enseñe anuncios con premio de AdMob, pocos y rechazables, con un panel que un niño que no lee entiende, sin cambiar nada en la web ni cuando no hay anuncio.

**Architecture:** La lógica vive en piezas puras con pruebas (`core/adPacing` para el ritmo, `adReward` en `core/economy`, `core/adConfig` para la configuración). `systems/ads.ts` (clase `Ads`) las une con un proveedor inyectado (`AdProvider`), y `systems/adProvider.ts` traduce los avisos del SDK a ese proveedor. Solo `systems/adsInstall.ts` toca el complemento de Capacitor. La escena `AdOffer` es el panel; `ShopScene` y `WorldScene` solo preguntan `canOffer` y la lanzan.

**Tech Stack:** TypeScript, Phaser 4.2.1, Capacitor 8.5, `@capacitor-community/admob` 8.x (8.2.1 a 12-oct-2026), Vitest, Playwright, Gradle (Android).

**Spec:** `docs/superpowers/specs/2026-10-12-publicidad-design.md`

## Global Constraints

- Solo Android nativo. En la web y sin configuración no se instala nada: el juego es idéntico al de hoy.
- Ritmo: `SESSION_MIN_S = 300`, `GAP_S = 900`, `PAUSE_SESSION_S = 900`, `DAILY_MAX = 4`. Tras cualquier panel (visto, X o fallo) no salta otro hasta 900 s de juego después.
- Estado en la clave `zooesponji_v3_ads`. No se toca `SAVE_VERSION`.
- Solo formatos con premio: bonificado (`tienda`) e intersticial bonificado (`pausa`). Ni tiras ni intersticiales normales.
- SDK en modo infantil: `tagForChildDirectedTreatment: true`, `maxAdContentRating: General`. **No** se marca `tagForUnderAgeOfConsent`. **No** se llama a `requestConsentInfo` ni a `showConsentForm`.
- El SDK se inicia justo antes de la primera carga, nunca al abrir el juego.
- El paquete no lleva el permiso `com.google.android.gms.permission.AD_ID` ni ningún `ACCESS_ADSERVICES_*`.
- El premio se fija al abrir el panel (`adReward`), es el que se enseña y el que se paga. El premio configurado en AdMob no se usa. Solo se paga si llega el aviso `Rewarded`.
- `Ads` nunca lanza: todo fallo acaba en «no hay anuncio».
- Todo texto visible pasa por `t()` (`src/data/strings/es.ts` y `en.ts`); lo vigila `tests/unit/strings.test.ts`.
- Los identificadores reales de AdMob no se suben al repositorio (es público).
- Nunca se tocan anuncios reales en el móvil de David: solo anuncios de prueba.
- Versión `2.6.0`, `versionCode` 7.
- Los comandos se lanzan desde `game/` salvo que se diga otra cosa.

## Cómo se pasan las pruebas en este proyecto

Las tandas completas (`npm test`, `npm run test:e2e`) las lanza David en una ventana aparte. Dentro de cada tarea se lanza solo el archivo de prueba de esa tarea (`npx vitest run tests/unit/<archivo>`) y `npm run typecheck`, que son rápidos. Al llegar a la Tarea 12 se le pide a David la tanda completa, con los comandos escritos allí.

Los commits los hace quien ejecuta el plan, uno por tarea, en la rama `feat/publicidad`.

## Decisiones de este plan que la spec no fija

1. **`anuncio-vacio` «una vez por ocasión»** = una vez por hueco hasta que se resuelva un panel o empiece una partida nueva. Si contara cada entrada a la tienda, no se podría comparar con `anuncio-ofrece`.
2. **Dónde se toca el complemento:** solo en `adsInstall.ts` (función `capacitorAdMob`). `adProvider.ts` recibe una fachada pequeña (`AdMobLike`) y así tiene pruebas. La spec decía que `adProvider.ts` envolvía el complemento; el reparto cambia, el comportamiento no.
3. **Vigilante de 10 segundos:** si el SDK no avisa de que el anuncio se abrió en 10 s, se da por fallido. Sin esto, un aviso que no llega dejaría el juego parado.
4. **El botón verde es redondo**, para que la cuenta atrás de `pausa` sea un anillo a su alrededor.
5. **El panel de `pausa` salta 300 ms después de volver al mapa** (deja acabar el fundido de la tienda).
6. **`FeedScene` reanuda el mapa con `{ from: 'feed' }`**, igual que la tienda con `{ from: 'shop' }`: así el mapa sabe que vuelve de dar de comer y no de Ajustes.
7. **Tramos de saldo:** los de `coinsBucket`, que ya existen (`0-19`, `20-49`, `50-149`, `150-399`, `400-899`, `900-1599`, `1600+`). El `tienda/100-499` de la spec era un ejemplo.
8. **Identificador de la app de AdMob:** variable `ZOO_ADMOB_APP_ID` o archivo `game/android/admob.properties` (ignorado por git) con `appId=...`.
9. **La política de Google va escrita, no como enlace pulsable:** la página de privacidad no tiene enlaces externos (norma de Familias).

## Estructura de archivos

| Archivo | Qué hace |
|---|---|
| `game/scripts/manifestRules.ts` (nuevo) | Reglas puras sobre el manifiesto fusionado de Android. |
| `game/scripts/check-manifest.ts` (nuevo) | Busca el manifiesto fusionado y aplica las reglas. |
| `game/android/app/src/main/AndroidManifest.xml` | Identificador de AdMob, medición retrasada, permisos quitados. |
| `game/android/app/build.gradle` | `manifestPlaceholders` con el identificador; versión. |
| `game/src/core/economy.ts` | Gana `adReward`. |
| `game/src/core/adPacing.ts` (nuevo) | Reglas de ritmo. |
| `game/src/core/adConfig.ts` (nuevo) | Lee `VITE_ADMOB_*`. |
| `game/src/systems/ads.ts` (nuevo) | Clase `Ads`, interfaz `AdProvider`, `getAds`/`setAds`. |
| `game/src/systems/adProvider.ts` (nuevo) | `AdMobLike` → `AdProvider`. |
| `game/src/systems/adsInstall.ts` (nuevo) | Único archivo que importa el complemento. Reloj de juego. |
| `game/src/scenes/AdOfferScene.ts` (nuevo) | El panel. |
| `game/src/systems/events.ts`, `core/eventCatalog.ts`, `systems/analyticsEvents.ts`, `systems/analyticsInstall.ts` | Eventos y estadísticas. |
| `game/src/core/back.ts`, `systems/platform.ts` | Botón atrás y segundo plano. |
| `game/src/scenes/ShopScene.ts`, `WorldScene.ts`, `FeedScene.ts`, `PreloadScene.ts`, `main.ts` | Dónde salta y arranque. |
| `tools/matomo/lib.mjs`, `resumen.mjs` | Apartado «Anuncios». |
| `game/public/privacidad.html`, `privacidad-en.html` | Textos legales. |

## Review Focus

Cada línea tiene su prueba en la tarea que se indica.

1. **Se compila para publicar sin el identificador real de AdMob** (falta `admob.properties`): el paquete saldría con el identificador de pruebas y unidades reales. Se espera que la comprobación del paquete lo pare. → Tarea 1, `manifestProblems(..., { release: true })`.
2. **El SDK no avisa de que el anuncio se abrió ni de que se cerró:** se espera que el juego siga a los 10 s, sin premio. → Tarea 6, prueba del vigilante.
3. **El niño toca dos veces el botón verde, o el verde y la X casi a la vez:** se espera un solo anuncio y un solo resultado. → Tarea 5, prueba «doble toque».
4. **El estado guardado está roto o trae valores raros** (texto, negativos, `NaN`, día mal escrito): se espera «nunca ha habido ninguno», sin errores. → Tarea 3, pruebas de `parsePacing`.
5. **La pantalla cambia de tamaño con el panel abierto** (barras del sistema, girar): se espera el mismo premio, un solo `anuncio-ofrece` y que el botón siga funcionando. → Tarea 9, prueba de juego «cambiar el tamaño».

---

### Task 1: El complemento de AdMob y el modo infantil en Android

**Files:**
- Create: `game/scripts/manifestRules.ts`, `game/scripts/check-manifest.ts`, `game/tests/unit/androidManifest.test.ts`
- Modify: `game/package.json`, `game/package-lock.json`, `game/android/app/src/main/AndroidManifest.xml`, `game/android/app/build.gradle`, `game/android/.gitignore`, `game/android/app/capacitor.build.gradle` y `game/android/capacitor.settings.gradle` (los reescribe `cap sync`)

**Interfaces:**
- Produces: `manifestProblems(xml: string, opts?: { release?: boolean }): string[]`, `TEST_APP_ID`; script `npm run check:manifest` (con `-- --publicar` exige el identificador real); paquete `@capacitor-community/admob` instalado.

- [x] **Step 1: Escribir la prueba que falla**

`game/tests/unit/androidManifest.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { TEST_APP_ID, manifestProblems } from '../../scripts/manifestRules.ts';

const manifest = (inside: string, permissions = ''): string =>
  `<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application>${inside}</application>${permissions}</manifest>`;
const appId = (value: string): string => `<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="${value}" />`;
const DELAY = '<meta-data android:name="com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT" android:value="true" />';
const REAL = 'ca-app-pub-1234567890123456~1234567890';
const permission = (name: string): string => `<uses-permission android:name="${name}" />`;

describe('manifiesto fusionado de Android', () => {
  it('un manifiesto correcto no tiene problemas', () => {
    expect(manifestProblems(manifest(appId(REAL) + DELAY, permission('android.permission.INTERNET')), { release: true })).toEqual([]);
  });

  it.each([
    'com.google.android.gms.permission.AD_ID',
    'android.permission.ACCESS_ADSERVICES_AD_ID',
    'android.permission.ACCESS_ADSERVICES_ATTRIBUTION',
    'android.permission.ACCESS_ADSERVICES_TOPICS',
  ])('rechaza el permiso %s', (name) => {
    const problems = manifestProblems(manifest(appId(REAL) + DELAY, permission(name)));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(name);
  });

  it('rechaza el permiso también en su forma «sdk-23»', () => {
    const xml = manifest(appId(REAL) + DELAY, '<uses-permission-sdk-23 android:name="com.google.android.gms.permission.AD_ID" />');
    expect(manifestProblems(xml)).toHaveLength(1);
  });

  it('exige el identificador de la app de AdMob', () => {
    expect(manifestProblems(manifest(DELAY))).toHaveLength(1);
    expect(manifestProblems(manifest(appId('${admobAppId}') + DELAY))).toHaveLength(1);
  });

  it('lee el identificador aunque el valor vaya antes que el nombre', () => {
    const swapped = `<meta-data android:value="${REAL}" android:name="com.google.android.gms.ads.APPLICATION_ID" />`;
    expect(manifestProblems(manifest(swapped + DELAY))).toEqual([]);
  });

  it('el identificador de pruebas vale para probar, no para publicar', () => {
    const xml = manifest(appId(TEST_APP_ID) + DELAY);
    expect(manifestProblems(xml)).toEqual([]);
    expect(manifestProblems(xml, { release: true })).toHaveLength(1);
  });

  it('exige retrasar la medición del SDK', () => {
    expect(manifestProblems(manifest(appId(REAL)))).toHaveLength(1);
  });
});
```

- [x] **Step 2: Lanzarla y ver que falla**

Run: `npx vitest run tests/unit/androidManifest.test.ts`
Expected: FAIL, no encuentra `scripts/manifestRules.ts`.

- [x] **Step 3: Escribir las reglas**

`game/scripts/manifestRules.ts`:

```ts
// Reglas sobre el manifiesto fusionado de Android (el que de verdad va en el paquete). Sin dependencias.

/** Identificador público de pruebas de Google: vale para compilar y probar, nunca para publicar. */
export const TEST_APP_ID = 'ca-app-pub-3940256099942544~3347511713';

const APP_ID = /^ca-app-pub-\d{16}~\d{10}$/;
const APP_ID_NAME = 'com.google.android.gms.ads.APPLICATION_ID';
const DELAY_NAME = 'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT';

function metaValue(xml: string, name: string): string | null {
  for (const [tag] of xml.matchAll(/<meta-data\b[^>]*>/g)) {
    if (!tag.includes(`android:name="${name}"`)) continue;
    return /android:value="([^"]*)"/.exec(tag)?.[1] ?? null;
  }
  return null;
}

/** Lo que incumple el manifiesto. Con `release`, además exige el identificador real de AdMob. */
export function manifestProblems(xml: string, opts: { release?: boolean } = {}): string[] {
  const problems: string[] = [];
  for (const match of xml.matchAll(/<uses-permission(?:-sdk-23)?\b[^>]*android:name="([^"]+)"/g)) {
    const name = match[1] ?? '';
    // Una app para niños no puede pedir el identificador de publicidad ni los permisos de «AdServices».
    if (/AD_ID|ADSERVICES/.test(name)) problems.push(`Permiso de publicidad que no debe estar: ${name}`);
  }
  const appId = metaValue(xml, APP_ID_NAME);
  if (appId === null) problems.push(`Falta el identificador de la app de AdMob (${APP_ID_NAME}).`);
  else if (!APP_ID.test(appId)) problems.push(`El identificador de la app de AdMob no tiene la forma esperada: ${appId}`);
  else if (opts.release && appId === TEST_APP_ID) {
    problems.push('El paquete lleva el identificador de pruebas de Google: falta android/admob.properties o la variable ZOO_ADMOB_APP_ID.');
  }
  if (metaValue(xml, DELAY_NAME) !== 'true') problems.push(`Falta retrasar la medición del SDK (${DELAY_NAME} = true).`);
  return problems;
}
```

`game/scripts/check-manifest.ts`:

```ts
// Uso: node scripts/check-manifest.ts [--publicar]
// Comprueba el manifiesto fusionado de la compilación de publicación. Hay que compilar antes con Gradle.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { manifestProblems } from './manifestRules.ts';

const ROOT = fileURLToPath(new URL('../android/app/build/intermediates/', import.meta.url));

function find(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) find(path, found);
    else if (name === 'AndroidManifest.xml' && path.includes('merged_manifest') && path.includes(`${sep}release${sep}`)) found.push(path);
  }
  return found;
}

const files = existsSync(ROOT) ? find(ROOT) : [];
if (files.length === 0) {
  console.error('No hay manifiesto fusionado de publicación. Compila antes con Gradle (ver docs/privado/play-store.md).');
  process.exit(1);
}
const newest = files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0]!;
const problems = manifestProblems(readFileSync(newest, 'utf8'), { release: process.argv.includes('--publicar') });
if (problems.length > 0) {
  console.error(`El manifiesto no pasa (${newest}):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`check-manifest: correcto (${newest}).`);
```

En `game/package.json`, dentro de `"scripts"`, después de `"check:dist"`:

```json
    "check:manifest": "node scripts/check-manifest.ts",
```

- [x] **Step 4: Lanzar la prueba y ver que pasa**

Run: `npx vitest run tests/unit/androidManifest.test.ts`
Expected: PASS, 10 pruebas.

- [x] **Step 5: Instalar el complemento**

```powershell
npm install @capacitor-community/admob@^8.2.1
npx cap sync android
```

Expected: `cap sync` lista `@capacitor-community/admob` entre los complementos de Android, y `android/app/capacitor.build.gradle` y `android/capacitor.settings.gradle` ganan sus líneas.

Abrir `node_modules/@capacitor-community/admob/dist/esm/index.d.ts` y los `.d.ts` que reexporta, y apuntar los nombres exactos de: `AdMob.initialize` y sus opciones (`initializeForTesting`, `tagForChildDirectedTreatment`, `maxAdContentRating`), `MaxAdContentRating.General`, `prepareRewardVideoAd` / `showRewardVideoAd`, `prepareRewardInterstitialAd` / `showRewardInterstitialAd`, y los avisos `Showed`, `FailedToShow`, `Dismissed` y `Rewarded` de `RewardAdPluginEvents` y `RewardInterstitialAdPluginEvents`. La Tarea 8 los usa escritos de memoria: si alguno se llama distinto, allí se usa el nombre real (solo cambia `capacitorAdMob`, nada más).

- [x] **Step 6: Manifiesto y Gradle**

En `game/android/app/src/main/AndroidManifest.xml`, la etiqueta raíz pasa a ser:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">
```

Dentro de `<application>`, justo antes de `<activity`:

```xml
        <!-- Publicidad (AdMob). El identificador llega de build.gradle: el real no está en el repo. -->
        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="${admobAppId}" />
        <!-- El SDK no mide nada hasta que el juego lo inicia en modo infantil, justo antes del primer anuncio. -->
        <meta-data
            android:name="com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT"
            android:value="true" />
```

Después de `<uses-permission android:name="android.permission.INTERNET" />`:

```xml
    <!-- App para niños: sin identificador de publicidad. El SDK de anuncios añade estos permisos por defecto. -->
    <uses-permission android:name="com.google.android.gms.permission.AD_ID" tools:node="remove" />
    <uses-permission android:name="android.permission.ACCESS_ADSERVICES_AD_ID" tools:node="remove" />
    <uses-permission android:name="android.permission.ACCESS_ADSERVICES_ATTRIBUTION" tools:node="remove" />
    <uses-permission android:name="android.permission.ACCESS_ADSERVICES_TOPICS" tools:node="remove" />
```

En `game/android/app/build.gradle`, después de la línea `def zooCanSign = ...`:

```groovy

// Identificador de la app de AdMob. El real NO está en el repo: se lee de la variable de entorno
// ZOO_ADMOB_APP_ID o de android/admob.properties (ignorado por git), con una línea `appId=ca-app-pub-...~...`.
// Sin ninguno de los dos se usa el identificador público de pruebas de Google: el SDK cierra la app si falta.
def admobProps = new Properties()
def admobPropsFile = rootProject.file('admob.properties')
if (admobPropsFile.exists()) {
    admobPropsFile.withInputStream { admobProps.load(it) }
}
def zooAdmobAppId = System.getenv('ZOO_ADMOB_APP_ID') ?: admobProps['appId'] ?: 'ca-app-pub-3940256099942544~3347511713'
```

Y dentro de `defaultConfig { ... }`, después de `versionName`:

```groovy
        manifestPlaceholders += [admobAppId: zooAdmobAppId]
```

En `game/android/.gitignore`, junto a `keystore.properties`:

```
admob.properties
```

- [x] **Step 7: Comprobar el manifiesto fusionado**

```powershell
$env:JAVA_HOME = "C:\Users\david\.jdks\jbr-21.0.11"; cd android; .\gradlew.bat :app:processReleaseMainManifest; cd ..
npm run check:manifest
```

Si Gradle dice que la tarea no existe, listar las que hay con `.\gradlew.bat :app:tasks --all | Select-String Manifest` y usar la de `Release`.

Expected: `check-manifest: correcto (...)`.

Si `check:manifest` señala otro permiso con `AD_ID` o `ADSERVICES`, añadir su línea `tools:node="remove"` al manifiesto, repetir este paso y apuntar el nombre en el mensaje del commit. Abrir además el manifiesto fusionado y apuntar la lista completa de `<uses-permission>` que queda: hace falta en la Tarea 11 (apartado «Permisos») y en los pasos manuales de Play Console.

- [x] **Step 8: Commit**

```bash
git add game/package.json game/package-lock.json game/scripts/manifestRules.ts game/scripts/check-manifest.ts game/tests/unit/androidManifest.test.ts game/android/app/src/main/AndroidManifest.xml game/android/app/build.gradle game/android/.gitignore game/android/app/capacitor.build.gradle game/android/capacitor.settings.gradle
git commit -m "feat: complemento de AdMob en Android, sin identificador de publicidad"
```

---

### Task 2: El premio (`adReward`)

**Files:**
- Modify: `game/src/core/economy.ts`
- Test: `game/tests/unit/economy.test.ts`

**Interfaces:**
- Consumes: `SHOP_ITEMS` de `src/data/shop.ts`, `isPenOpen` de `economy.ts`.
- Produces: `adReward(state: GameState): number`.

- [x] **Step 1: Escribir la prueba que falla**

Al final de `game/tests/unit/economy.test.ts` (añadir `adReward` al import de `../../src/core/economy`, y estos dos imports si no están):

```ts
import { PENS } from '../../src/data/pens';
import { SHOP_ITEMS } from '../../src/data/shop';

describe('adReward', () => {
  /** Estado con abiertos todos los recintos más baratos que `cheapest`. */
  const withCheapestClosed = (cheapest: number | null): GameState => {
    const counts = { ...initialState().counts };
    for (const item of SHOP_ITEMS) if (cheapest === null || item.cost < cheapest) counts[item.penId] = 1;
    return { ...initialState(), counts };
  };

  it.each([
    [50, 10], [100, 10], [150, 15], [250, 25], [400, 40], [600, 60], [900, 90], [1300, 130], [1600, 160],
  ])('con el recinto de %i como el más barato por abrir, el premio es %i', (cost, reward) => {
    expect(adReward(withCheapestClosed(cost))).toBe(reward);
  });

  it('con todo abierto, la décima parte del recinto más caro', () => {
    expect(adReward(withCheapestClosed(null))).toBe(160);
  });

  it('al empezar el juego son 10 monedas', () => {
    expect(adReward(initialState())).toBe(10);
  });

  it('mira el más barato que queda, no el orden de la tienda', () => {
    const counts = { ...initialState().counts, pantera: 1, estanque: 1 };
    expect(adReward({ ...initialState(), counts })).toBe(Math.round(PENS.panda.cost! / 10));
  });
});
```

Si `GameState` no está importado en el archivo de prueba, añadirlo: `import { ..., type GameState } from '../../src/core/economy';`.

- [x] **Step 2: Lanzarla y ver que falla**

Run: `npx vitest run tests/unit/economy.test.ts`
Expected: FAIL, `adReward` no existe.

- [x] **Step 3: Implementar**

En `game/src/core/economy.ts`, cambiar el import de la tienda y añadir la función al final:

```ts
import { SHOP_ITEMS, SHOP_UNLOCK_COINS, getShopItem, parseExtraItemId } from '../data/shop';
```

```ts
const AD_REWARD_MIN = 10;

/**
 * Monedas por ver un anuncio: la décima parte del recinto más barato que queda por abrir, con un mínimo.
 * Con todo abierto, la décima parte del más caro. Así el premio crece con el zoo.
 */
export function adReward(state: GameState): number {
  const closed = SHOP_ITEMS.filter((item) => !isPenOpen(state, item.penId)).map((item) => item.cost);
  const base = closed.length > 0 ? Math.min(...closed) : Math.max(...SHOP_ITEMS.map((item) => item.cost));
  return Math.max(AD_REWARD_MIN, Math.round(base / 10));
}
```

- [x] **Step 4: Lanzar y ver que pasa**

Run: `npx vitest run tests/unit/economy.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add game/src/core/economy.ts game/tests/unit/economy.test.ts
git commit -m "feat: el premio de un anuncio crece con el zoo"
```

---

### Task 3: Reglas de ritmo (`adPacing`)

**Files:**
- Create: `game/src/core/adPacing.ts`
- Test: `game/tests/unit/adPacing.test.ts`

**Interfaces:**
- Produces:
  - Constantes `SESSION_MIN_S`, `GAP_S`, `PAUSE_SESSION_S`, `DAILY_MAX`, `SESSION_GAP_S`, `ADS_KEY`, `AD_SLOTS`.
  - Tipos `AdSlot = 'tienda' | 'pausa'`, `AdOutcome = 'shown' | 'declined' | 'failed'`, `AdPacingState`, `AdSessionState`.
  - `emptyPacing(today: string): AdPacingState`, `newAdSession(): AdSessionState`, `parsePacing(raw: string | null, today: string): AdPacingState`, `rollDay(state, today): AdPacingState`.
  - `tick(state, session, seconds): { state: AdPacingState; session: AdSessionState }`.
  - `secondsUntil(slot, state, session, today): number` (`Infinity` si no puede saltar en esta partida o este día), `canOffer(slot, state, session, today): boolean`.
  - `resolvePanel(slot, outcome, state, session, today): { state; session }`.

- [x] **Step 1: Escribir las pruebas que fallan**

`game/tests/unit/adPacing.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  DAILY_MAX, GAP_S, PAUSE_SESSION_S, SESSION_MIN_S,
  canOffer, emptyPacing, newAdSession, parsePacing, resolvePanel, rollDay, secondsUntil, tick,
  type AdPacingState, type AdSessionState,
} from '../../src/core/adPacing';

const TODAY = '2026-10-12';
const played = (seconds: number, session: AdSessionState = newAdSession()): AdSessionState => ({ ...session, sessionPlay: seconds });
const pacing = (change: Partial<AdPacingState> = {}): AdPacingState => ({ ...emptyPacing(TODAY), ...change });

describe('las constantes son las de la spec', () => {
  it('5 minutos de partida, 15 entre paneles, 15 para la pausa y 4 al día', () => {
    expect([SESSION_MIN_S, GAP_S, PAUSE_SESSION_S, DAILY_MAX]).toEqual([300, 900, 900, 4]);
  });
});

describe('panel de la tienda', () => {
  it('no salta con 299 segundos de partida y sí con 300', () => {
    expect(canOffer('tienda', pacing(), played(299), TODAY)).toBe(false);
    expect(canOffer('tienda', pacing(), played(300), TODAY)).toBe(true);
  });

  it('tras un panel no salta con 899 segundos y sí con 900', () => {
    expect(canOffer('tienda', pacing({ sinceLast: 899 }), played(5000), TODAY)).toBe(false);
    expect(canOffer('tienda', pacing({ sinceLast: 900 }), played(5000), TODAY)).toBe(true);
  });

  it('si nunca ha habido panel, solo cuenta el rato de partida', () => {
    expect(canOffer('tienda', pacing({ sinceLast: null }), played(300), TODAY)).toBe(true);
  });

  it('con 3 anuncios hoy salta y con 4 no', () => {
    expect(canOffer('tienda', pacing({ shown: 3 }), played(300), TODAY)).toBe(true);
    expect(canOffer('tienda', pacing({ shown: 4 }), played(300), TODAY)).toBe(false);
  });

  it('puede saltar aunque ya se haya visto un anuncio en la partida', () => {
    const session = { ...played(5000), seenInSession: true, pauseOffered: true };
    expect(canOffer('tienda', pacing({ sinceLast: 900, shown: 1 }), session, TODAY)).toBe(true);
  });
});

describe('panel de la pausa', () => {
  it('no salta con 899 segundos de partida y sí con 900', () => {
    expect(canOffer('pausa', pacing(), played(899), TODAY)).toBe(false);
    expect(canOffer('pausa', pacing(), played(900), TODAY)).toBe(true);
  });

  it('solo una vez por partida', () => {
    expect(canOffer('pausa', pacing({ sinceLast: 900 }), { ...played(5000), pauseOffered: true }, TODAY)).toBe(false);
  });

  it('no salta si en la partida ya se ha visto un anuncio', () => {
    expect(canOffer('pausa', pacing({ sinceLast: 900 }), { ...played(5000), seenInSession: true }, TODAY)).toBe(false);
  });

  it('respeta la espera entre paneles y el tope del día', () => {
    expect(canOffer('pausa', pacing({ sinceLast: 899 }), played(5000), TODAY)).toBe(false);
    expect(canOffer('pausa', pacing({ shown: 4 }), played(5000), TODAY)).toBe(false);
  });
});

describe('cuánto falta', () => {
  it('es lo que más tarde de cumplirse', () => {
    expect(secondsUntil('tienda', pacing(), played(240), TODAY)).toBe(60);
    expect(secondsUntil('tienda', pacing({ sinceLast: 100 }), played(5000), TODAY)).toBe(800);
    expect(secondsUntil('pausa', pacing(), played(300), TODAY)).toBe(600);
    expect(secondsUntil('tienda', pacing(), played(9999), TODAY)).toBe(0);
  });

  it('es infinito si ya no puede saltar en esta partida o este día', () => {
    expect(secondsUntil('tienda', pacing({ shown: 4 }), played(0), TODAY)).toBe(Infinity);
    expect(secondsUntil('pausa', pacing(), { ...played(0), pauseOffered: true }, TODAY)).toBe(Infinity);
  });
});

describe('el tiempo de juego', () => {
  it('suma a la partida y a la espera', () => {
    const next = tick(pacing({ sinceLast: 10 }), played(100), 5);
    expect(next.session.sessionPlay).toBe(105);
    expect(next.state.sinceLast).toBe(15);
  });

  it('si nunca ha habido panel, la espera sigue sin empezar', () => {
    expect(tick(pacing(), played(0), 5).state.sinceLast).toBeNull();
  });

  it.each([0, -3, Number.NaN])('ignora %s segundos', (seconds) => {
    const state = pacing({ sinceLast: 10 });
    const session = played(100);
    expect(tick(state, session, seconds)).toEqual({ state, session });
  });
});

describe('qué cambia cada resultado', () => {
  it('un anuncio enseñado pone la espera a cero, suma al día y marca la partida', () => {
    const next = resolvePanel('tienda', 'shown', pacing({ sinceLast: 950, shown: 1 }), played(1000), TODAY);
    expect(next.state).toEqual({ sinceLast: 0, day: TODAY, shown: 2 });
    expect(next.session).toMatchObject({ seenInSession: true, pauseOffered: false });
  });

  it.each(['declined', 'failed'] as const)('«%s» pone la espera a cero y no suma al día', (outcome) => {
    const next = resolvePanel('tienda', outcome, pacing({ shown: 1 }), played(1000), TODAY);
    expect(next.state).toEqual({ sinceLast: 0, day: TODAY, shown: 1 });
    expect(next.session).toMatchObject({ seenInSession: false, pauseOffered: false });
  });

  it.each(['shown', 'declined', 'failed'] as const)('en la pausa, «%s» gasta la de la partida', (outcome) => {
    expect(resolvePanel('pausa', outcome, pacing(), played(1000), TODAY).session.pauseOffered).toBe(true);
  });

  it('tras cualquier panel no salta ningún otro hasta 15 minutos después', () => {
    const after = resolvePanel('tienda', 'declined', pacing(), played(300), TODAY);
    const later = tick(after.state, after.session, 899);
    expect(canOffer('tienda', later.state, later.session, TODAY)).toBe(false);
    expect(canOffer('pausa', later.state, later.session, TODAY)).toBe(false);
    const enough = tick(later.state, later.session, 1);
    expect(canOffer('tienda', enough.state, enough.session, TODAY)).toBe(true);
    expect(canOffer('pausa', enough.state, enough.session, TODAY)).toBe(true);
  });
});

describe('el día', () => {
  it('al día siguiente la cuenta vuelve a cero', () => {
    expect(rollDay(pacing({ shown: 4 }), '2026-10-13')).toEqual({ sinceLast: null, day: '2026-10-13', shown: 0 });
    expect(canOffer('tienda', pacing({ shown: 4 }), played(300), '2026-10-13')).toBe(true);
  });

  it('con el reloj hacia atrás ni se pone a cero ni retrocede el día', () => {
    const state = pacing({ shown: 4 });
    expect(rollDay(state, '2026-10-11')).toBe(state);
    expect(canOffer('tienda', state, played(300), '2026-10-11')).toBe(false);
  });

  it('un panel resuelto en un día nuevo cuenta en ese día', () => {
    expect(resolvePanel('tienda', 'shown', pacing({ shown: 4 }), played(300), '2026-10-13').state).toEqual({ sinceLast: 0, day: '2026-10-13', shown: 1 });
  });

  it('cambiar de mes y de año también es «después»', () => {
    expect(rollDay(pacing({ day: '2026-09-30', shown: 2 }), '2026-10-01').shown).toBe(0);
    expect(rollDay(pacing({ day: '2026-12-31', shown: 2 }), '2027-01-01').shown).toBe(0);
  });
});

describe('estado guardado', () => {
  it('sin nada guardado: nunca ha habido ninguno', () => {
    expect(parsePacing(null, TODAY)).toEqual({ sinceLast: null, day: TODAY, shown: 0 });
  });

  it('lee lo que se guardó', () => {
    const saved = { sinceLast: 120, day: TODAY, shown: 2 };
    expect(parsePacing(JSON.stringify(saved), TODAY)).toEqual(saved);
    expect(parsePacing(JSON.stringify({ ...saved, sinceLast: null }), TODAY).sinceLast).toBeNull();
  });

  it('lo guardado otro día llega con la cuenta a cero y la espera intacta', () => {
    expect(parsePacing(JSON.stringify({ sinceLast: 120, day: '2026-10-11', shown: 4 }), TODAY)).toEqual({ sinceLast: 120, day: TODAY, shown: 0 });
  });

  it.each([
    ['texto que no es JSON', 'hola'],
    ['vacío', ''],
    ['null', 'null'],
    ['una lista', '[1,2]'],
    ['un número', '7'],
    ['sin campos', '{}'],
    ['espera negativa', JSON.stringify({ sinceLast: -1, day: TODAY, shown: 0 })],
    ['espera que no es número', JSON.stringify({ sinceLast: 'mucho', day: TODAY, shown: 0 })],
    ['espera infinita', '{"sinceLast":1e999,"day":"2026-10-12","shown":0}'],
    ['día mal escrito', JSON.stringify({ sinceLast: 0, day: '12/10/2026', shown: 0 })],
    ['día que no es texto', JSON.stringify({ sinceLast: 0, day: 20261012, shown: 0 })],
    ['cuenta negativa', JSON.stringify({ sinceLast: 0, day: TODAY, shown: -2 })],
    ['cuenta con decimales', JSON.stringify({ sinceLast: 0, day: TODAY, shown: 1.5 })],
    ['cuenta que no es número', JSON.stringify({ sinceLast: 0, day: TODAY, shown: '3' })],
  ])('estado ilegible (%s): nunca ha habido ninguno', (_label, raw) => {
    expect(parsePacing(raw, TODAY)).toEqual({ sinceLast: null, day: TODAY, shown: 0 });
  });
});
```

- [x] **Step 2: Lanzarlas y ver que fallan**

Run: `npx vitest run tests/unit/adPacing.test.ts`
Expected: FAIL, no existe `src/core/adPacing`.

- [x] **Step 3: Implementar**

`game/src/core/adPacing.ts`:

```ts
/** Reglas de ritmo de la publicidad. Lógica pura: ni reloj, ni almacén, ni Phaser. */

/** Segundos de juego en la partida antes del primer panel de la tienda. */
export const SESSION_MIN_S = 300;
/** Segundos de juego entre un panel resuelto (se viera el anuncio o no) y el siguiente. */
export const GAP_S = 900;
/** Segundos de juego en la partida antes del panel de la pausa. */
export const PAUSE_SESSION_S = 900;
/** Anuncios enseñados por día, como mucho. */
export const DAILY_MAX = 4;
/** Tras este rato en segundo plano empieza una partida nueva (la misma regla que las estadísticas). */
export const SESSION_GAP_S = 1800;

/** Clave propia en el almacén: no forma parte de la partida guardada ni de `SAVE_VERSION`. */
export const ADS_KEY = 'zooesponji_v3_ads';

export type AdSlot = 'tienda' | 'pausa';
export const AD_SLOTS: readonly AdSlot[] = ['tienda', 'pausa'];

/** Cómo acabó un panel: se enseñó un anuncio (entero o cortado), el niño tocó la X, o el anuncio no llegó a enseñarse. */
export type AdOutcome = 'shown' | 'declined' | 'failed';

export interface AdPacingState {
  /** Segundos de juego desde el último panel resuelto. `null`: nunca ha habido ninguno. */
  sinceLast: number | null;
  /** Día de la cuenta, `AAAA-MM-DD` en hora local. */
  day: string;
  /** Anuncios enseñados ese día. */
  shown: number;
}

/** Lo que solo vive en memoria, por partida. */
export interface AdSessionState {
  /** Segundos de juego en esta partida. */
  sessionPlay: number;
  /** Se ha enseñado algún anuncio en esta partida. */
  seenInSession: boolean;
  /** Ya saltó el panel de la pausa en esta partida. */
  pauseOffered: boolean;
}

export function emptyPacing(today: string): AdPacingState {
  return { sinceLast: null, day: today, shown: 0 };
}

export function newAdSession(): AdSessionState {
  return { sessionPlay: 0, seenInSession: false, pauseOffered: false };
}

/** La cuenta del día se pone a cero solo cuando hoy es posterior. Con el reloj hacia atrás no cambia nada. */
export function rollDay(state: AdPacingState, today: string): AdPacingState {
  return today > state.day ? { ...state, day: today, shown: 0 } : state;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Lee el estado guardado. Lo ilegible se trata como «nunca ha habido ninguno». Nunca lanza. */
export function parsePacing(raw: string | null, today: string): AdPacingState {
  if (raw === null) return emptyPacing(today);
  try {
    const value = JSON.parse(raw) as { sinceLast?: unknown; day?: unknown; shown?: unknown } | null;
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return emptyPacing(today);
    const { sinceLast, day, shown } = value;
    const sinceOk = sinceLast === null || (typeof sinceLast === 'number' && Number.isFinite(sinceLast) && sinceLast >= 0);
    if (!sinceOk) return emptyPacing(today);
    if (typeof day !== 'string' || !DAY.test(day)) return emptyPacing(today);
    if (typeof shown !== 'number' || !Number.isInteger(shown) || shown < 0) return emptyPacing(today);
    return rollDay({ sinceLast: sinceLast as number | null, day, shown }, today);
  } catch {
    return emptyPacing(today);
  }
}

/** Pasan `seconds` de juego. */
export function tick(state: AdPacingState, session: AdSessionState, seconds: number): { state: AdPacingState; session: AdSessionState } {
  if (!(seconds > 0)) return { state, session };
  return {
    state: { ...state, sinceLast: state.sinceLast === null ? null : state.sinceLast + seconds },
    session: { ...session, sessionPlay: session.sessionPlay + seconds },
  };
}

/** Segundos de juego que faltan para que el panel pueda saltar. `Infinity`: ya no puede en esta partida o este día. */
export function secondsUntil(slot: AdSlot, state: AdPacingState, session: AdSessionState, today: string): number {
  const rolled = rollDay(state, today);
  if (rolled.shown >= DAILY_MAX) return Infinity;
  if (slot === 'pausa' && (session.seenInSession || session.pauseOffered)) return Infinity;
  const needed = slot === 'tienda' ? SESSION_MIN_S : PAUSE_SESSION_S;
  const gap = rolled.sinceLast === null ? 0 : GAP_S - rolled.sinceLast;
  return Math.max(0, needed - session.sessionPlay, gap);
}

export function canOffer(slot: AdSlot, state: AdPacingState, session: AdSessionState, today: string): boolean {
  return secondsUntil(slot, state, session, today) === 0;
}

/** Un panel se ha resuelto: empieza la espera, y cuenta en el día y en la partida según cómo acabó. */
export function resolvePanel(
  slot: AdSlot,
  outcome: AdOutcome,
  state: AdPacingState,
  session: AdSessionState,
  today: string,
): { state: AdPacingState; session: AdSessionState } {
  const rolled = rollDay(state, today);
  const shown = outcome === 'shown';
  return {
    state: { ...rolled, sinceLast: 0, shown: rolled.shown + (shown ? 1 : 0) },
    session: { ...session, seenInSession: session.seenInSession || shown, pauseOffered: session.pauseOffered || slot === 'pausa' },
  };
}
```

- [x] **Step 4: Lanzar y ver que pasan**

Run: `npx vitest run tests/unit/adPacing.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add game/src/core/adPacing.ts game/tests/unit/adPacing.test.ts
git commit -m "feat: reglas de ritmo de la publicidad"
```

---

### Task 4: Eventos del bus y estadísticas

**Files:**
- Modify: `game/src/systems/events.ts`, `game/src/core/eventCatalog.ts`, `game/src/systems/analyticsEvents.ts`
- Test: `game/tests/unit/eventCatalog.test.ts`, `game/tests/unit/analyticsEvents.test.ts`

**Interfaces:**
- Consumes: `AdSlot` de `core/adPacing`.
- Produces (en `GameEvents`):
  - `'ad-offered': { slot: AdSlot; coins: number; balance: number }`
  - `'ad-accepted': { slot: AdSlot; balance: number }`
  - `'ad-declined': { slot: AdSlot; balance: number }`
  - `'ad-watched': { slot: AdSlot; coins: number; balance: number }`
  - `'ad-cut': { slot: AdSlot }`, `'ad-failed': { slot: AdSlot }`, `'ad-empty': { slot: AdSlot }`
  - Categoría `anuncio` en `CATALOG` con `anuncio-ofrece`, `anuncio-acepta`, `anuncio-no`, `anuncio-visto`, `anuncio-cortado`, `anuncio-fallo`, `anuncio-vacio`.

`balance` son las monedas que tenía el niño al saltar el panel.

- [x] **Step 1: Escribir las pruebas que fallan**

En `game/tests/unit/eventCatalog.test.ts`, la lista de specs de la prueba «toda acción está escrita…» gana la de publicidad (y el título deja de decir «dos»):

```ts
  it('toda acción está escrita en alguna de las specs que definen eventos', () => {
    const specs = ['2026-10-07-analitica-anonima-matomo-design.md', '2026-10-07-analitica-detallada-design.md', '2026-10-12-publicidad-design.md']
```

Y dentro de `describe('catálogo de eventos', ...)`:

```ts
  it('la publicidad tiene sus siete acciones', () => {
    expect(CATALOG.anuncio).toEqual(['anuncio-ofrece', 'anuncio-acepta', 'anuncio-no', 'anuncio-visto', 'anuncio-cortado', 'anuncio-fallo', 'anuncio-vacio']);
  });
```

Al final de `game/tests/unit/analyticsEvents.test.ts`:

```ts
describe('GameTracker: publicidad', () => {
  it('cada paso del panel se cuenta con el hueco y el saldo que tenía el niño', async () => {
    const t = setup();
    await t.tracker.start();
    t.events.emit('ad-offered', { slot: 'tienda', coins: 25, balance: 120 });
    t.events.emit('ad-accepted', { slot: 'tienda', balance: 120 });
    t.events.emit('ad-watched', { slot: 'tienda', coins: 25, balance: 120 });
    t.events.emit('ad-declined', { slot: 'pausa', balance: 0 });

    expect(t.sent).toEqual([
      'anuncio | anuncio-ofrece | tienda/50-149',
      'anuncio | anuncio-acepta | tienda/50-149',
      'anuncio | anuncio-visto | tienda/50-149',
      'anuncio | anuncio-no | pausa/0-19',
    ]);
    expect(t.values.get('anuncio | anuncio-ofrece | tienda/50-149')).toBe(25);
    expect(t.values.get('anuncio | anuncio-visto | tienda/50-149')).toBe(25);
    expect(t.values.get('anuncio | anuncio-acepta | tienda/50-149')).toBeUndefined();
  });

  it('cortado, fallo y vacío llevan solo el hueco', async () => {
    const t = setup();
    await t.tracker.start();
    t.events.emit('ad-cut', { slot: 'pausa' });
    t.events.emit('ad-failed', { slot: 'tienda' });
    t.events.emit('ad-empty', { slot: 'tienda' });
    expect(t.sent).toEqual(['anuncio | anuncio-cortado | pausa', 'anuncio | anuncio-fallo | tienda', 'anuncio | anuncio-vacio | tienda']);
  });

  it('con las estadísticas apagadas no se cuenta nada', async () => {
    const t = setup({ active: false });
    await t.tracker.start();
    t.events.emit('ad-offered', { slot: 'tienda', coins: 25, balance: 120 });
    expect(t.sent).toEqual([]);
  });
});
```

- [x] **Step 2: Lanzarlas y ver que fallan**

Run: `npx vitest run tests/unit/eventCatalog.test.ts tests/unit/analyticsEvents.test.ts`
Expected: FAIL (no existe `CATALOG.anuncio`; los eventos `ad-*` no existen en `GameEvents`).

- [x] **Step 3: Implementar**

En `game/src/systems/events.ts`, añadir el import:

```ts
import type { AdSlot } from '../core/adPacing';
```

y en `GameEvents`, antes de `toast`:

```ts
  /** Publicidad con premio (solo Android). `balance`: las monedas que tenía el niño al saltar el panel. */
  'ad-offered': { slot: AdSlot; coins: number; balance: number };
  /** Tocó el botón verde, o la cuenta atrás llegó a cero. */
  'ad-accepted': { slot: AdSlot; balance: number };
  /** Tocó la X. */
  'ad-declined': { slot: AdSlot; balance: number };
  /** Anuncio visto entero: se han pagado `coins`. */
  'ad-watched': { slot: AdSlot; coins: number; balance: number };
  /** Anuncio cerrado antes de tiempo. */
  'ad-cut': { slot: AdSlot };
  /** El anuncio no se pudo enseñar. */
  'ad-failed': { slot: AdSlot };
  /** Las reglas dejaban ofrecerlo y no había anuncio listo. */
  'ad-empty': { slot: AdSlot };
```

En `game/src/core/eventCatalog.ts`, dentro de `CATALOG`, después de `ajustes`:

```ts
  anuncio: ['anuncio-ofrece', 'anuncio-acepta', 'anuncio-no', 'anuncio-visto', 'anuncio-cortado', 'anuncio-fallo', 'anuncio-vacio'],
```

En `game/src/systems/analyticsEvents.ts`, dentro de `start()`, después del bloque de `quit-answered`:

```ts
    // Publicidad: el hueco y el tramo de saldo viajan juntos en el nombre, para leer el cruce sin segmentos.
    const adName = (slot: string, balance: number): string => part(slot, coinsBucket(balance));
    on('ad-offered', ({ slot, coins, balance }) => this.send('anuncio', 'anuncio-ofrece', adName(slot, balance), coins));
    on('ad-accepted', ({ slot, balance }) => this.send('anuncio', 'anuncio-acepta', adName(slot, balance)));
    on('ad-declined', ({ slot, balance }) => this.send('anuncio', 'anuncio-no', adName(slot, balance)));
    on('ad-watched', ({ slot, coins, balance }) => this.send('anuncio', 'anuncio-visto', adName(slot, balance), coins));
    on('ad-cut', ({ slot }) => this.send('anuncio', 'anuncio-cortado', slot));
    on('ad-failed', ({ slot }) => this.send('anuncio', 'anuncio-fallo', slot));
    on('ad-empty', ({ slot }) => this.send('anuncio', 'anuncio-vacio', slot));
```

- [x] **Step 4: Lanzar y ver que pasan**

Run: `npx vitest run tests/unit/eventCatalog.test.ts tests/unit/analyticsEvents.test.ts && npm run typecheck`
Expected: PASS y sin errores de tipos.

- [x] **Step 5: Commit**

```bash
git add game/src/systems/events.ts game/src/core/eventCatalog.ts game/src/systems/analyticsEvents.ts game/tests/unit/eventCatalog.test.ts game/tests/unit/analyticsEvents.test.ts
git commit -m "feat: eventos y estadísticas de la publicidad"
```

---

### Task 5: Configuración y la clase `Ads`

**Files:**
- Create: `game/src/core/adConfig.ts`, `game/src/systems/ads.ts`
- Modify: `game/src/systems/audio.ts` (`PauseReason`), `game/.env.example`
- Test: `game/tests/unit/adConfig.test.ts`, `game/tests/unit/ads.test.ts`

**Interfaces:**
- Consumes: todo lo de la Tarea 3; `adReward` (Tarea 2); los eventos `ad-*` (Tarea 4); `dayKey` de `core/activity`; `KeyValueStore` de `core/save`.
- Produces:
  - `core/adConfig.ts`: `interface AdEnv { VITE_ADMOB_REWARDED?: string; VITE_ADMOB_REWARDED_INTERSTITIAL?: string; VITE_ADMOB_TESTING?: string }`, `interface AdConfig { units: Partial<Record<AdSlot, string>>; testing: boolean }`, `TEST_UNITS`, `parseAdConfig(env: AdEnv, dev: boolean): AdConfig | null`, `configuredSlots(config: AdConfig): AdSlot[]`.
  - `systems/ads.ts`: `interface AdProvider { load(slot: AdSlot): Promise<boolean>; show(slot: AdSlot): Promise<{ shown: boolean; rewarded: boolean }> }`, `type AdResult = 'visto' | 'cortado' | 'fallo'`, `interface AdsDeps`, `class Ads` con `start(): Promise<void>`, `tick(seconds: number): void`, `setBackground(hidden: boolean): void`, `canOffer(slot): boolean`, `offer(slot): number`, `accept(slot): Promise<AdResult>`, `decline(slot): void`, `isReady(slot): boolean`, `settled(): Promise<void>`, `readonly showing: boolean`; `getAds(): Ads | null`, `setAds(ads: Ads | null): void`.
  - `PauseReason` gana `'ad'`.

- [x] **Step 1: Pruebas de la configuración**

`game/tests/unit/adConfig.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { TEST_UNITS, configuredSlots, parseAdConfig } from '../../src/core/adConfig';

const REWARDED = 'ca-app-pub-1234567890123456/1111111111';
const INTERSTITIAL = 'ca-app-pub-1234567890123456/2222222222';

describe('configuración de la publicidad', () => {
  it('sin nada configurado no hay publicidad', () => {
    expect(parseAdConfig({}, false)).toBeNull();
    expect(parseAdConfig({ VITE_ADMOB_REWARDED: '', VITE_ADMOB_REWARDED_INTERSTITIAL: '  ' }, false)).toBeNull();
  });

  it('con los dos bloques hay dos huecos', () => {
    const config = parseAdConfig({ VITE_ADMOB_REWARDED: REWARDED, VITE_ADMOB_REWARDED_INTERSTITIAL: ` ${INTERSTITIAL} ` }, false);
    expect(config).toEqual({ units: { tienda: REWARDED, pausa: INTERSTITIAL }, testing: false });
    expect(configuredSlots(config!)).toEqual(['tienda', 'pausa']);
  });

  it('si falta un bloque, ese hueco no existe', () => {
    expect(configuredSlots(parseAdConfig({ VITE_ADMOB_REWARDED: REWARDED }, false)!)).toEqual(['tienda']);
    expect(configuredSlots(parseAdConfig({ VITE_ADMOB_REWARDED_INTERSTITIAL: INTERSTITIAL }, false)!)).toEqual(['pausa']);
  });

  it.each(['ca-app-pub-123/456', 'ca-app-pub-1234567890123456~1111111111', 'cualquier cosa'])('un bloque mal escrito (%s) no cuenta', (unit) => {
    expect(parseAdConfig({ VITE_ADMOB_REWARDED: unit }, false)).toBeNull();
  });

  it('en desarrollo se piden los anuncios de prueba de Google, haya o no configuración', () => {
    expect(parseAdConfig({}, true)).toEqual({ units: TEST_UNITS, testing: true });
    expect(parseAdConfig({ VITE_ADMOB_REWARDED: REWARDED }, true)).toEqual({ units: TEST_UNITS, testing: true });
  });

  it('en producción, VITE_ADMOB_TESTING=1 también pide los de prueba', () => {
    expect(parseAdConfig({ VITE_ADMOB_REWARDED: REWARDED, VITE_ADMOB_TESTING: '1' }, false)).toEqual({ units: TEST_UNITS, testing: true });
    expect(parseAdConfig({ VITE_ADMOB_REWARDED: REWARDED, VITE_ADMOB_TESTING: '0' }, false)?.testing).toBe(false);
  });
});
```

- [x] **Step 2: Lanzarlas y ver que fallan**

Run: `npx vitest run tests/unit/adConfig.test.ts`
Expected: FAIL, no existe `src/core/adConfig`.

- [x] **Step 3: Implementar la configuración**

`game/src/core/adConfig.ts`:

```ts
import { AD_SLOTS, type AdSlot } from './adPacing';

/** Variables de compilación (`.env.production.local`, que no se sube al repositorio). */
export interface AdEnv {
  VITE_ADMOB_REWARDED?: string;
  VITE_ADMOB_REWARDED_INTERSTITIAL?: string;
  VITE_ADMOB_TESTING?: string;
}

export interface AdConfig {
  /** Bloque de anuncios de cada hueco. Un hueco sin bloque no existe. */
  units: Partial<Record<AdSlot, string>>;
  /** Se piden anuncios de prueba: nunca dan dinero y se pueden tocar. */
  testing: boolean;
}

/** Bloques públicos de prueba de Google: bonificado e intersticial bonificado. */
export const TEST_UNITS: Readonly<Record<AdSlot, string>> = {
  tienda: 'ca-app-pub-3940256099942544/5224354917',
  pausa: 'ca-app-pub-3940256099942544/5354046379',
};

const UNIT = /^ca-app-pub-\d{16}\/\d{10}$/;
const ENV_OF: Record<AdSlot, keyof AdEnv> = { tienda: 'VITE_ADMOB_REWARDED', pausa: 'VITE_ADMOB_REWARDED_INTERSTITIAL' };

/** `null`: no hay publicidad. En desarrollo, o con `VITE_ADMOB_TESTING=1`, solo anuncios de prueba. */
export function parseAdConfig(env: AdEnv, dev: boolean): AdConfig | null {
  if (dev || env.VITE_ADMOB_TESTING === '1') return { units: { ...TEST_UNITS }, testing: true };
  const units: Partial<Record<AdSlot, string>> = {};
  for (const slot of AD_SLOTS) {
    const unit = env[ENV_OF[slot]]?.trim();
    if (unit && UNIT.test(unit)) units[slot] = unit;
  }
  return Object.keys(units).length > 0 ? { units, testing: false } : null;
}

export function configuredSlots(config: AdConfig): AdSlot[] {
  return AD_SLOTS.filter((slot) => config.units[slot] !== undefined);
}
```

Al final de `game/.env.example`:

```
# Publicidad con premio (solo Android). Bloques de anuncios de AdMob: ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
# Si falta uno, ese hueco no existe; si faltan los dos, no hay publicidad.
VITE_ADMOB_REWARDED=
VITE_ADMOB_REWARDED_INTERSTITIAL=
# Opcional. Con 1, la compilación de producción pide los anuncios de prueba de Google (para probar en el móvil).
VITE_ADMOB_TESTING=
```

Run: `npx vitest run tests/unit/adConfig.test.ts`
Expected: PASS.

- [x] **Step 4: Pruebas de `Ads` con un proveedor falso**

`game/tests/unit/ads.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ADS_KEY, type AdPacingState, type AdSlot } from '../../src/core/adPacing';
import { initialState, type GameState } from '../../src/core/economy';
import type { KeyValueStore } from '../../src/core/save';
import { Ads, type AdProvider } from '../../src/systems/ads';
import { EventBus, type GameEvents } from '../../src/systems/events';
import { createMemoryStore } from '../../src/systems/storage';

const AD_EVENTS = ['ad-offered', 'ad-accepted', 'ad-declined', 'ad-watched', 'ad-cut', 'ad-failed', 'ad-empty'] as const;
const MIN = 60_000;
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function setup(opts: { slots?: AdSlot[]; store?: KeyValueStore; provider?: Partial<AdProvider>; state?: GameState } = {}) {
  const events = new EventBus<GameEvents>();
  const log: string[] = [];
  for (const name of AD_EVENTS) events.on(name, () => log.push(name));
  const clock = { time: new Date(2026, 9, 12, 10, 0, 0).getTime() };
  const calls = { load: [] as AdSlot[], show: [] as AdSlot[], sound: [] as boolean[], coins: [] as number[] };
  const answers = { load: true, show: { shown: true, rewarded: true } };
  const game = { state: opts.state ?? initialState() };
  const provider: AdProvider = {
    load: async (slot) => {
      calls.load.push(slot);
      return answers.load;
    },
    show: async (slot) => {
      calls.show.push(slot);
      return answers.show;
    },
    ...opts.provider,
  };
  const store = opts.store ?? createMemoryStore();
  const ads = new Ads({
    provider,
    slots: opts.slots ?? ['tienda', 'pausa'],
    store,
    events,
    now: () => new Date(clock.time),
    state: () => game.state,
    earnCoins: async (amount) => {
      calls.coins.push(amount);
    },
    pauseSound: (paused) => calls.sound.push(paused),
  });
  /** Pasan segundos de juego y se espera a que terminen las cargas pedidas. */
  const play = async (seconds: number): Promise<void> => {
    ads.tick(seconds);
    await ads.settled();
  };
  const saved = async (): Promise<AdPacingState | null> => {
    const raw = await store.get(ADS_KEY);
    return raw === null ? null : (JSON.parse(raw) as AdPacingState);
  };
  return { ads, events, log, clock, calls, answers, game, store, play, saved };
}

describe('Ads: cuándo pide un anuncio', () => {
  it('sin huecos configurados no pide ni ofrece nada', async () => {
    const t = setup({ slots: [] });
    await t.ads.start();
    await t.play(5000);
    expect(t.calls.load).toEqual([]);
    expect(t.ads.canOffer('tienda')).toBe(false);
    expect(t.log).toEqual([]);
  });

  it('un hueco sin configurar no existe aunque el otro sí', async () => {
    const t = setup({ slots: ['tienda'] });
    await t.ads.start();
    await t.play(5000);
    expect(t.calls.load).toEqual(['tienda']);
    expect(t.ads.canOffer('pausa')).toBe(false);
    expect(t.log).toEqual([]);
  });

  it('no carga hasta que falta un minuto o menos', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(239);
    expect(t.calls.load).toEqual([]);
    await t.play(1);
    expect(t.calls.load).toEqual(['tienda']);
    expect(t.ads.canOffer('tienda')).toBe(false);
    await t.play(60);
    expect(t.calls.load).toEqual(['tienda']);
    expect(t.ads.canOffer('tienda')).toBe(true);
  });

  it('una partida corta no pide ningún anuncio', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(200);
    expect(t.calls.load).toEqual([]);
  });

  it('si la carga falla, vuelve a probar a los 2 minutos', async () => {
    const t = setup();
    t.answers.load = false;
    await t.ads.start();
    await t.play(300);
    expect(t.calls.load).toEqual(['tienda']);
    t.clock.time += 2 * MIN - 1000;
    await t.play(1);
    expect(t.calls.load).toEqual(['tienda']);
    t.answers.load = true;
    t.clock.time += 1000;
    await t.play(1);
    expect(t.calls.load).toEqual(['tienda', 'tienda']);
    expect(t.ads.canOffer('tienda')).toBe(true);
  });

  it('un anuncio cargado hace más de 50 minutos se vuelve a pedir', async () => {
    const t = setup({ slots: ['tienda'] });
    await t.ads.start();
    await t.play(300);
    t.clock.time += 50 * MIN;
    expect(t.ads.isReady('tienda')).toBe(false);
    await t.play(1);
    expect(t.calls.load).toEqual(['tienda', 'tienda']);
    expect(t.ads.canOffer('tienda')).toBe(true);
  });

  it('sin anuncio listo no ofrece y avisa una sola vez', async () => {
    const t = setup({ slots: ['tienda'] });
    t.answers.load = false;
    await t.ads.start();
    await t.play(300);
    expect(t.ads.canOffer('tienda')).toBe(false);
    expect(t.ads.canOffer('tienda')).toBe(false);
    expect(t.log).toEqual(['ad-empty']);
  });

  it('si las reglas no lo permiten, que no haya anuncio no es noticia', async () => {
    const t = setup();
    t.answers.load = false;
    await t.ads.start();
    await t.play(100);
    expect(t.ads.canOffer('tienda')).toBe(false);
    expect(t.log).toEqual([]);
  });
});

describe('Ads: el panel', () => {
  it('visto entero: paga, cuenta y avisa', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(300);
    expect(t.ads.canOffer('tienda')).toBe(true);
    expect(t.ads.offer('tienda')).toBe(10);
    expect(await t.ads.accept('tienda')).toBe('visto');
    expect(t.calls.show).toEqual(['tienda']);
    expect(t.calls.coins).toEqual([10]);
    expect(t.calls.sound).toEqual([true, false]);
    expect(t.log).toEqual(['ad-offered', 'ad-accepted', 'ad-watched']);
    expect(await t.saved()).toEqual({ sinceLast: 0, day: '2026-10-12', shown: 1 });
    expect(t.ads.canOffer('tienda')).toBe(false);
  });

  it('los avisos llevan el premio y el saldo que había al saltar el panel', async () => {
    const t = setup({ state: { ...initialState(), coins: 37 } });
    const seen: unknown[] = [];
    t.events.on('ad-offered', (payload) => seen.push(payload));
    t.events.on('ad-watched', (payload) => seen.push(payload));
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    t.game.state = { ...t.game.state, coins: 999 };
    await t.ads.accept('tienda');
    expect(seen).toEqual([{ slot: 'tienda', coins: 10, balance: 37 }, { slot: 'tienda', coins: 10, balance: 37 }]);
  });

  it('el premio se fija al abrir el panel aunque el zoo cambie antes de cobrar', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(300);
    expect(t.ads.offer('tienda')).toBe(10);
    const counts = { ...t.game.state.counts, pantera: 1, panda: 1, estanque: 1 };
    t.game.state = { ...t.game.state, counts };
    await t.ads.accept('tienda');
    expect(t.calls.coins).toEqual([10]);
  });

  it('cerrado antes de tiempo: no paga, pero cuenta en el día', async () => {
    const t = setup();
    t.answers.show = { shown: true, rewarded: false };
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    expect(await t.ads.accept('tienda')).toBe('cortado');
    expect(t.calls.coins).toEqual([]);
    expect(t.log).toEqual(['ad-offered', 'ad-accepted', 'ad-cut']);
    expect(await t.saved()).toEqual({ sinceLast: 0, day: '2026-10-12', shown: 1 });
  });

  it('no se pudo enseñar: no paga ni cuenta en el día, pero empieza la espera', async () => {
    const t = setup();
    t.answers.show = { shown: false, rewarded: false };
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    expect(await t.ads.accept('tienda')).toBe('fallo');
    expect(t.calls.coins).toEqual([]);
    expect(t.calls.sound).toEqual([true, false]);
    expect(t.log).toEqual(['ad-offered', 'ad-accepted', 'ad-failed']);
    expect(await t.saved()).toEqual({ sinceLast: 0, day: '2026-10-12', shown: 0 });
    expect(t.ads.canOffer('tienda')).toBe(false);
  });

  it('un premio sin anuncio enseñado no se paga', async () => {
    const t = setup();
    t.answers.show = { shown: false, rewarded: true };
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    expect(await t.ads.accept('tienda')).toBe('fallo');
    expect(t.calls.coins).toEqual([]);
  });

  it('la X: ni anuncio ni monedas, y empieza la espera', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    t.ads.decline('tienda');
    expect(t.calls.show).toEqual([]);
    expect(t.log).toEqual(['ad-offered', 'ad-declined']);
    expect(await t.saved()).toEqual({ sinceLast: 0, day: '2026-10-12', shown: 0 });
    expect(t.ads.canOffer('tienda')).toBe(false);
  });

  it('tras la espera vuelve a pedir un anuncio y a ofrecerlo', async () => {
    const t = setup({ slots: ['tienda'] });
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    await t.ads.accept('tienda');
    await t.play(839);
    expect(t.calls.load).toEqual(['tienda']);
    await t.play(1);
    expect(t.calls.load).toEqual(['tienda', 'tienda']);
    await t.play(60);
    expect(t.ads.canOffer('tienda')).toBe(true);
  });

  it('doble toque: un solo anuncio y un solo resultado', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    const first = t.ads.accept('tienda');
    const second = t.ads.accept('tienda');
    t.ads.decline('tienda');
    expect(await second).toBe('fallo');
    expect(await first).toBe('visto');
    expect(t.calls.show).toEqual(['tienda']);
    expect(t.calls.coins).toEqual([10]);
    expect(t.log).toEqual(['ad-offered', 'ad-accepted', 'ad-watched']);
    expect((await t.saved())?.shown).toBe(1);
  });

  it('la X dos veces cuenta una', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    t.ads.decline('tienda');
    t.ads.decline('tienda');
    expect(t.log).toEqual(['ad-offered', 'ad-declined']);
  });

  it('aceptar o rechazar sin panel abierto no hace nada', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(300);
    t.ads.decline('tienda');
    expect(await t.ads.accept('tienda')).toBe('fallo');
    expect(t.calls.show).toEqual([]);
    expect(t.log).toEqual([]);
    expect(t.ads.canOffer('tienda')).toBe(true);
  });

  it('con un panel abierto no se ofrece otro', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(900);
    t.ads.offer('tienda');
    expect(t.ads.canOffer('pausa')).toBe(false);
  });

  it('mientras se ve el anuncio no corre el tiempo de juego', async () => {
    let finish: (result: { shown: boolean; rewarded: boolean }) => void = () => {};
    const t = setup({ provider: { show: () => new Promise((resolve) => (finish = resolve)) } });
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    const pending = t.ads.accept('tienda');
    expect(t.ads.showing).toBe(true);
    t.ads.tick(500);
    finish({ shown: true, rewarded: true });
    await pending;
    expect(t.ads.showing).toBe(false);
    await t.play(899);
    expect(t.ads.canOffer('tienda')).toBe(false);
  });
});

describe('Ads: la pausa y la partida', () => {
  it('la pausa salta una vez por partida', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(900);
    expect(t.ads.canOffer('pausa')).toBe(true);
    t.ads.offer('pausa');
    t.ads.decline('pausa');
    await t.play(900);
    expect(t.ads.canOffer('pausa')).toBe(false);
    expect(t.ads.canOffer('tienda')).toBe(true);
  });

  it('la pausa no salta si en la partida ya se ha visto un anuncio', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    await t.ads.accept('tienda');
    await t.play(900);
    expect(t.ads.canOffer('pausa')).toBe(false);
  });

  it('tras 30 minutos en segundo plano empieza otra partida', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    await t.ads.accept('tienda');
    await t.play(900);
    expect(t.ads.canOffer('pausa')).toBe(false);
    t.ads.setBackground(true);
    t.clock.time += 30 * MIN;
    t.ads.setBackground(false);
    await t.play(899);
    expect(t.ads.canOffer('pausa')).toBe(false);
    await t.play(1);
    expect(t.ads.canOffer('pausa')).toBe(true);
  });

  it('con 29 minutos en segundo plano sigue la misma partida', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(900);
    t.ads.offer('pausa');
    t.ads.decline('pausa');
    t.ads.setBackground(true);
    t.clock.time += 29 * MIN;
    t.ads.setBackground(false);
    await t.play(900);
    expect(t.ads.canOffer('pausa')).toBe(false);
  });

  it('al ir a segundo plano se guarda la espera', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    t.ads.decline('tienda');
    await t.play(10);
    t.ads.setBackground(true);
    await settle();
    expect((await t.saved())?.sinceLast).toBe(10);
  });

  it('la espera se guarda cada 30 segundos de juego', async () => {
    const t = setup();
    await t.ads.start();
    await t.play(300);
    t.ads.offer('tienda');
    t.ads.decline('tienda');
    await t.play(29);
    await settle();
    expect((await t.saved())?.sinceLast).toBe(0);
    await t.play(1);
    await settle();
    expect((await t.saved())?.sinceLast).toBe(30);
  });

  it('respeta lo guardado: con 4 anuncios hoy no ofrece más', async () => {
    const store = createMemoryStore({ [ADS_KEY]: JSON.stringify({ sinceLast: 5000, day: '2026-10-12', shown: 4 }) });
    const t = setup({ store });
    await t.ads.start();
    await t.play(900);
    expect(t.calls.load).toEqual([]);
    expect(t.ads.canOffer('tienda')).toBe(false);
  });

  it('al día siguiente vuelve a ofrecer', async () => {
    const store = createMemoryStore({ [ADS_KEY]: JSON.stringify({ sinceLast: 5000, day: '2026-10-12', shown: 4 }) });
    const t = setup({ store });
    await t.ads.start();
    t.clock.time += 24 * 60 * MIN;
    await t.play(300);
    expect(t.ads.canOffer('tienda')).toBe(true);
  });
});

describe('Ads: nunca rompe el juego', () => {
  it('si el almacén falla al leer, no se ofrece nada en la partida', async () => {
    const store: KeyValueStore = {
      get: async () => {
        throw new Error('almacén roto');
      },
      set: async () => {},
    };
    const t = setup({ store });
    await t.ads.start();
    await t.play(900);
    expect(t.calls.load).toEqual([]);
    expect(t.ads.canOffer('tienda')).toBe(false);
    expect(t.log).toEqual([]);
  });

  it('si el almacén falla al escribir, no se ofrece nada más en la partida', async () => {
    const store: KeyValueStore = {
      get: async () => null,
      set: async () => {
        throw new Error('almacén roto');
      },
    };
    const t = setup({ store });
    await t.ads.start();
    await t.play(30);
    await settle();
    await t.play(300);
    expect(t.ads.canOffer('tienda')).toBe(false);
  });

  it('un proveedor que lanza al cargar o al enseñar acaba en «no hay anuncio»', async () => {
    const loads = setup({ provider: { load: () => Promise.reject(new Error('sin red')) } });
    await loads.ads.start();
    await loads.play(300);
    expect(loads.ads.canOffer('tienda')).toBe(false);

    const shows = setup({
      provider: {
        show: () => {
          throw new Error('SDK roto');
        },
      },
    });
    await shows.ads.start();
    await shows.play(300);
    shows.ads.offer('tienda');
    expect(await shows.ads.accept('tienda')).toBe('fallo');
    expect(shows.calls.sound).toEqual([true, false]);
    expect(shows.calls.coins).toEqual([]);
  });

  it('un oyente del bus que lanza no rompe el panel', async () => {
    const t = setup();
    t.events.on('ad-offered', () => {
      throw new Error('oyente roto');
    });
    t.events.on('ad-watched', () => {
      throw new Error('oyente roto');
    });
    await t.ads.start();
    await t.play(300);
    expect(t.ads.offer('tienda')).toBe(10);
    expect(await t.ads.accept('tienda')).toBe('visto');
    expect(t.calls.coins).toEqual([10]);
  });

  it('si falla el pago, el anuncio visto se cuenta igual y no lanza', async () => {
    const t = setup();
    const ads = new Ads({
      provider: { load: async () => true, show: async () => ({ shown: true, rewarded: true }) },
      slots: ['tienda'],
      store: t.store,
      events: t.events,
      now: () => new Date(t.clock.time),
      state: () => t.game.state,
      earnCoins: () => Promise.reject(new Error('no se pudo guardar')),
      pauseSound: () => {},
    });
    await ads.start();
    ads.tick(300);
    await ads.settled();
    ads.offer('tienda');
    expect(await ads.accept('tienda')).toBe('visto');
  });
});
```

- [x] **Step 5: Lanzarlas y ver que fallan**

Run: `npx vitest run tests/unit/ads.test.ts`
Expected: FAIL, no existe `src/systems/ads`.

- [x] **Step 6: Implementar `Ads`**

En `game/src/systems/audio.ts`, sustituir el comentario y el tipo `PauseReason`:

```ts
/** Motivos por los que la música se para: menú de ajustes, app en segundo plano, móvil en vertical, anuncio en pantalla. */
export type PauseReason = 'menu' | 'background' | 'rotate' | 'ad';
```

`game/src/systems/ads.ts`:

```ts
import { dayKey } from '../core/activity';
import {
  ADS_KEY, AD_SLOTS, SESSION_GAP_S,
  canOffer, newAdSession, parsePacing, resolvePanel, rollDay, secondsUntil, tick,
  type AdOutcome, type AdPacingState, type AdSessionState, type AdSlot,
} from '../core/adPacing';
import { adReward, type GameState } from '../core/economy';
import type { KeyValueStore } from '../core/save';
import type { EventBus, GameEvents } from './events';

/** Quien de verdad carga y enseña los anuncios. En las pruebas, uno falso. */
export interface AdProvider {
  /** Carga un anuncio. `true` si queda listo. */
  load(slot: AdSlot): Promise<boolean>;
  /** Enseña el anuncio cargado y resuelve cuando se cierra. */
  show(slot: AdSlot): Promise<{ shown: boolean; rewarded: boolean }>;
}

/** Cómo acabó un panel aceptado. */
export type AdResult = 'visto' | 'cortado' | 'fallo';

export interface AdsDeps {
  provider: AdProvider;
  /** Huecos con bloque de anuncios configurado. */
  slots: readonly AdSlot[];
  store: KeyValueStore;
  events: EventBus<GameEvents>;
  now: () => Date;
  state: () => GameState;
  earnCoins: (amount: number) => Promise<void>;
  pauseSound: (paused: boolean) => void;
}

/** Se pide el anuncio cuando falta esto o menos para que las reglas dejen ofrecerlo. */
const PRELOAD_S = 60;
/** Tras una carga fallida no se vuelve a probar antes de esto. */
const RETRY_MS = 120_000;
/** Un anuncio cargado hace más de esto se vuelve a pedir: Google los caduca a la hora. */
const STALE_MS = 50 * 60_000;
/** Cada cuántos segundos de juego se guarda la espera. */
const SAVE_EVERY_S = 30;

interface SlotLoad {
  loadedAt: number | null;
  failedAt: number | null;
  loading: Promise<void> | null;
  /** Ya se avisó de que no había anuncio en esta ocasión. */
  emptyTold: boolean;
}

const idle = (): SlotLoad => ({ loadedAt: null, failedAt: null, loading: null, emptyTold: false });

/**
 * La publicidad con premio: cuándo se pide un anuncio, cuándo se puede ofrecer y qué pasa al aceptarlo.
 * Nunca lanza: todo fallo acaba en «no hay anuncio». La publicidad nunca impide jugar.
 */
export class Ads {
  /** `null`: el almacén ha fallado (o aún no se ha leído) y no se ofrece nada. */
  private pacing: AdPacingState | null = null;
  private session: AdSessionState = newAdSession();
  private readonly loads: Record<AdSlot, SlotLoad> = { tienda: idle(), pausa: idle() };
  /** El panel abierto: su premio y el saldo que había, fijados al abrirlo. */
  private pending: { slot: AdSlot; amount: number; balance: number } | null = null;
  private busy = false;
  private unsaved = 0;
  private hiddenAt: number | null = null;

  constructor(private readonly deps: AdsDeps) {}

  async start(): Promise<void> {
    this.pacing = await this.read();
  }

  /** Hay un anuncio en pantalla. */
  get showing(): boolean {
    return this.busy;
  }

  /** Pasan `seconds` de juego: el juego en pantalla y la partida empezada. */
  tick(seconds: number): void {
    if (this.busy || !this.pacing) return;
    try {
      const next = tick(rollDay(this.pacing, this.today()), this.session, seconds);
      this.pacing = next.state;
      this.session = next.session;
      this.unsaved += seconds;
      if (this.unsaved >= SAVE_EVERY_S) this.persist();
      for (const slot of this.deps.slots) this.preload(slot);
    } catch {
      // La publicidad nunca impide jugar.
    }
  }

  /** Al ir a segundo plano se guarda la espera; al volver tras un rato largo empieza otra partida. */
  setBackground(hidden: boolean): void {
    try {
      const now = this.time();
      if (hidden) {
        this.hiddenAt ??= now;
        this.persist();
        return;
      }
      const since = this.hiddenAt;
      this.hiddenAt = null;
      if (since === null || now - since < SESSION_GAP_S * 1000) return;
      this.session = newAdSession();
      for (const slot of AD_SLOTS) this.loads[slot].emptyTold = false;
      // Una partida nueva vuelve a intentar leer el almacén si antes falló.
      if (!this.pacing) void this.read().then((pacing) => (this.pacing = pacing));
    } catch {
      // Igual que arriba.
    }
  }

  /** Reglas de ritmo cumplidas y anuncio listo. Si lo único que falta es el anuncio, lo avisa una vez por ocasión. */
  canOffer(slot: AdSlot): boolean {
    try {
      if (this.busy || this.pending || !this.pacing || !this.deps.slots.includes(slot)) return false;
      if (!canOffer(slot, this.pacing, this.session, this.today())) return false;
      if (this.isReady(slot)) return true;
      const load = this.loads[slot];
      if (!load.emptyTold) {
        load.emptyTold = true;
        this.emit('ad-empty', { slot });
      }
      return false;
    } catch {
      return false;
    }
  }

  isReady(slot: AdSlot): boolean {
    const at = this.loads[slot].loadedAt;
    return at !== null && this.time() - at < STALE_MS;
  }

  /** Se abre el panel: devuelve el premio y lo deja fijado. */
  offer(slot: AdSlot): number {
    const state = this.deps.state();
    const amount = adReward(state);
    this.pending = { slot, amount, balance: state.coins };
    this.emit('ad-offered', { slot, coins: amount, balance: state.coins });
    return amount;
  }

  /** El niño quiere ver el anuncio: se enseña y, solo si se ve entero, se pagan las monedas. */
  async accept(slot: AdSlot): Promise<AdResult> {
    const pending = this.pending;
    if (!pending || pending.slot !== slot || this.busy) return 'fallo';
    this.pending = null;
    this.busy = true;
    this.emit('ad-accepted', { slot, balance: pending.balance });
    this.sound(true);
    let result = { shown: false, rewarded: false };
    try {
      result = await this.deps.provider.show(slot);
    } catch {
      // Se queda en «no se pudo enseñar».
    }
    this.sound(false);
    this.busy = false;
    this.loads[slot].loadedAt = null;
    const shown = result?.shown === true;
    this.resolve(slot, shown ? 'shown' : 'failed');
    if (!shown) {
      this.emit('ad-failed', { slot });
      return 'fallo';
    }
    if (result.rewarded !== true) {
      this.emit('ad-cut', { slot });
      return 'cortado';
    }
    try {
      await this.deps.earnCoins(pending.amount);
    } catch {
      // El anuncio se ha visto: se cuenta aunque el guardado falle.
    }
    this.emit('ad-watched', { slot, coins: pending.amount, balance: pending.balance });
    return 'visto';
  }

  /** El niño toca la X. */
  decline(slot: AdSlot): void {
    const pending = this.pending;
    if (!pending || pending.slot !== slot || this.busy) return;
    this.pending = null;
    this.resolve(slot, 'declined');
    this.emit('ad-declined', { slot, balance: pending.balance });
  }

  /** Resuelve cuando no queda ninguna carga en marcha (pruebas). */
  settled(): Promise<void> {
    return Promise.all(AD_SLOTS.map((slot) => this.loads[slot].loading)).then(() => undefined);
  }

  // --- Por dentro ---

  private preload(slot: AdSlot): void {
    const load = this.loads[slot];
    if (!this.pacing || load.loading) return;
    if (secondsUntil(slot, this.pacing, this.session, this.today()) > PRELOAD_S) return;
    const now = this.time();
    if (load.loadedAt !== null && now - load.loadedAt < STALE_MS) return;
    if (load.failedAt !== null && now - load.failedAt < RETRY_MS) return;
    load.loading = this.load(slot).finally(() => {
      load.loading = null;
    });
  }

  private async load(slot: AdSlot): Promise<void> {
    let ok = false;
    try {
      ok = (await this.deps.provider.load(slot)) === true;
    } catch {
      ok = false;
    }
    const now = this.time();
    this.loads[slot].loadedAt = ok ? now : null;
    this.loads[slot].failedAt = ok ? null : now;
  }

  private resolve(slot: AdSlot, outcome: AdOutcome): void {
    if (this.pacing) {
      const next = resolvePanel(slot, outcome, this.pacing, this.session, this.today());
      this.pacing = next.state;
      this.session = next.session;
    }
    for (const each of AD_SLOTS) this.loads[each].emptyTold = false;
    this.persist();
  }

  private async read(): Promise<AdPacingState | null> {
    try {
      return parsePacing(await this.deps.store.get(ADS_KEY), this.today());
    } catch {
      return null;
    }
  }

  /** Si el almacén falla al escribir, no se ofrece nada más en la partida. */
  private persist(): void {
    this.unsaved = 0;
    const pacing = this.pacing;
    if (!pacing) return;
    const broken = (): void => {
      this.pacing = null;
    };
    try {
      void this.deps.store.set(ADS_KEY, JSON.stringify(pacing)).catch(broken);
    } catch {
      broken();
    }
  }

  private sound(paused: boolean): void {
    try {
      this.deps.pauseSound(paused);
    } catch {
      // Sin sonido antes que un error.
    }
  }

  private emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    try {
      this.deps.events.emit(event, payload);
    } catch {
      // Un oyente roto no rompe el panel.
    }
  }

  private time(): number {
    return this.deps.now().getTime();
  }

  private today(): string {
    return dayKey(this.deps.now());
  }
}

let current: Ads | null = null;

export function setAds(ads: Ads | null): void {
  current = ads;
}

/** `null` en la web, sin configuración o antes de arrancar: no hay publicidad. */
export function getAds(): Ads | null {
  return current;
}
```

- [x] **Step 7: Lanzar y ver que pasan**

Run: `npx vitest run tests/unit/ads.test.ts tests/unit/adConfig.test.ts tests/unit/audio.test.ts && npm run typecheck`
Expected: PASS y sin errores de tipos.

Si la prueba «un oyente del bus que lanza» falla porque `EventBus.emit` corta al primer oyente que lanza y el registro de `setup` no llega a apuntar el evento, no es un fallo de `Ads`: esa prueba no mira `t.log`.

- [x] **Step 8: Commit**

```bash
git add game/src/core/adConfig.ts game/src/systems/ads.ts game/src/systems/audio.ts game/.env.example game/tests/unit/adConfig.test.ts game/tests/unit/ads.test.ts
git commit -m "feat: sistema de anuncios con proveedor inyectado"
```

---

### Task 6: Del SDK al proveedor (`adProvider`)

**Files:**
- Create: `game/src/systems/adProvider.ts`
- Test: `game/tests/unit/adProvider.test.ts`

**Interfaces:**
- Consumes: `AdProvider` (Tarea 5), `AdConfig` (Tarea 5), `AdSlot`.
- Produces:
  - `type AdMobEvent = 'showed' | 'failed' | 'dismissed' | 'rewarded'`
  - `interface AdMobLike { initialize(testing: boolean): Promise<void>; prepare(slot: AdSlot, adId: string, testing: boolean): Promise<void>; show(slot: AdSlot): Promise<void>; on(slot: AdSlot, event: AdMobEvent, handler: () => void): Promise<{ remove(): Promise<void> }> }`
  - `type Wait = (ms: number, fn: () => void) => () => void`
  - `createAdMobProvider(admob: AdMobLike, config: AdConfig, wait?: Wait): AdProvider`
  - `SHOW_TIMEOUT_MS = 10_000`

`AdMobLike` es una fachada mínima sobre el complemento; quien la implementa de verdad es `capacitorAdMob()` en la Tarea 8. `initialize` siempre arranca el SDK en modo infantil.

- [x] **Step 1: Escribir las pruebas que fallan**

`game/tests/unit/adProvider.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { AdConfig } from '../../src/core/adConfig';
import { SHOW_TIMEOUT_MS, createAdMobProvider, type AdMobLike, type Wait } from '../../src/systems/adProvider';

const config: AdConfig = { units: { tienda: 'unidad-tienda', pausa: 'unidad-pausa' }, testing: true };
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function fake(unitConfig: AdConfig = config) {
  const handlers = new Map<string, () => void>();
  const calls: string[] = [];
  const fail = { initialize: false, prepare: false, show: false, on: false };
  const timers: { ms: number; fn: () => void }[] = [];
  const admob: AdMobLike = {
    initialize: async (testing) => {
      calls.push(`init:${testing}`);
      if (fail.initialize) throw new Error('sin SDK');
    },
    prepare: async (slot, adId, testing) => {
      calls.push(`prepare:${slot}:${adId}:${testing}`);
      if (fail.prepare) throw new Error('sin anuncio');
    },
    show: async (slot) => {
      calls.push(`show:${slot}`);
      if (fail.show) throw new Error('no se abre');
    },
    on: async (slot, event, handler) => {
      if (fail.on) throw new Error('sin avisos');
      const key = `${slot}:${event}`;
      handlers.set(key, handler);
      return {
        remove: async () => {
          handlers.delete(key);
        },
      };
    },
  };
  const wait: Wait = (ms, fn) => {
    const timer = { ms, fn };
    timers.push(timer);
    return () => {
      const at = timers.indexOf(timer);
      if (at >= 0) timers.splice(at, 1);
    };
  };
  const fire = (key: string): void => handlers.get(key)?.();
  const provider = createAdMobProvider(admob, unitConfig, wait);
  return { provider, calls, fail, timers, handlers, fire };
}

describe('proveedor de AdMob: cargar', () => {
  it('inicia el SDK justo antes de la primera carga, y solo una vez', async () => {
    const t = fake();
    expect(t.calls).toEqual([]);
    expect(await t.provider.load('tienda')).toBe(true);
    expect(await t.provider.load('pausa')).toBe(true);
    expect(t.calls).toEqual(['init:true', 'prepare:tienda:unidad-tienda:true', 'prepare:pausa:unidad-pausa:true']);
  });

  it('dos cargas a la vez comparten el mismo inicio', async () => {
    const t = fake();
    await Promise.all([t.provider.load('tienda'), t.provider.load('pausa')]);
    expect(t.calls.filter((call) => call.startsWith('init'))).toHaveLength(1);
  });

  it('si el SDK no arranca, no hay anuncio y se vuelve a intentar en la siguiente carga', async () => {
    const t = fake();
    t.fail.initialize = true;
    expect(await t.provider.load('tienda')).toBe(false);
    t.fail.initialize = false;
    expect(await t.provider.load('tienda')).toBe(true);
    expect(t.calls).toEqual(['init:true', 'init:true', 'prepare:tienda:unidad-tienda:true']);
  });

  it('si la carga falla, no hay anuncio', async () => {
    const t = fake();
    t.fail.prepare = true;
    expect(await t.provider.load('tienda')).toBe(false);
  });

  it('un hueco sin bloque no carga ni inicia el SDK', async () => {
    const t = fake({ units: { tienda: 'unidad-tienda' }, testing: false });
    expect(await t.provider.load('pausa')).toBe(false);
    expect(t.calls).toEqual([]);
  });
});

describe('proveedor de AdMob: enseñar', () => {
  it('visto entero: el premio sale del aviso «rewarded»', async () => {
    const t = fake();
    const shown = t.provider.show('tienda');
    await settle();
    expect(t.calls).toEqual(['show:tienda']);
    t.fire('tienda:showed');
    t.fire('tienda:rewarded');
    t.fire('tienda:dismissed');
    expect(await shown).toEqual({ shown: true, rewarded: true });
  });

  it('cerrado antes de tiempo: enseñado, sin premio', async () => {
    const t = fake();
    const shown = t.provider.show('pausa');
    await settle();
    t.fire('pausa:showed');
    t.fire('pausa:dismissed');
    expect(await shown).toEqual({ shown: true, rewarded: false });
  });

  it('escucha los avisos de su hueco, no los del otro', async () => {
    const t = fake();
    const shown = t.provider.show('pausa');
    await settle();
    expect([...t.handlers.keys()].every((key) => key.startsWith('pausa:'))).toBe(true);
    t.fire('pausa:dismissed');
    await shown;
  });

  it('no se pudo enseñar', async () => {
    const t = fake();
    const shown = t.provider.show('tienda');
    await settle();
    t.fire('tienda:failed');
    expect(await shown).toEqual({ shown: false, rewarded: false });
  });

  it('si la llamada falla antes de abrirse, no se enseñó', async () => {
    const t = fake();
    t.fail.show = true;
    expect(await t.provider.show('tienda')).toEqual({ shown: false, rewarded: false });
  });

  it('si no se pueden escuchar los avisos, no se enseña nada', async () => {
    const t = fake();
    t.fail.on = true;
    expect(await t.provider.show('tienda')).toEqual({ shown: false, rewarded: false });
    expect(t.calls).toEqual([]);
  });

  it('vigilante: si el SDK no avisa de que se abrió, a los 10 segundos se da por fallido', async () => {
    const t = fake();
    const shown = t.provider.show('tienda');
    await settle();
    expect(t.timers.map((timer) => timer.ms)).toEqual([SHOW_TIMEOUT_MS]);
    t.timers[0]!.fn();
    expect(await shown).toEqual({ shown: false, rewarded: false });
  });

  it('una vez abierto el anuncio, el vigilante se retira', async () => {
    const t = fake();
    const shown = t.provider.show('tienda');
    await settle();
    t.fire('tienda:showed');
    expect(t.timers).toEqual([]);
    t.fire('tienda:dismissed');
    expect(await shown).toEqual({ shown: true, rewarded: false });
  });

  it('al acabar deja de escuchar y un aviso tardío no cambia nada', async () => {
    const t = fake();
    const shown = t.provider.show('tienda');
    await settle();
    t.fire('tienda:showed');
    t.fire('tienda:dismissed');
    const result = await shown;
    await settle();
    expect(t.handlers.size).toBe(0);
    expect(t.timers).toEqual([]);
    expect(result).toEqual({ shown: true, rewarded: false });
  });

  it('un premio que llega sin cierre no resuelve: se espera al cierre', async () => {
    const t = fake();
    let done = false;
    const shown = t.provider.show('tienda').then((result) => {
      done = true;
      return result;
    });
    await settle();
    t.fire('tienda:showed');
    t.fire('tienda:rewarded');
    await settle();
    expect(done).toBe(false);
    t.fire('tienda:dismissed');
    expect(await shown).toEqual({ shown: true, rewarded: true });
  });
});
```

- [x] **Step 2: Lanzarlas y ver que fallan**

Run: `npx vitest run tests/unit/adProvider.test.ts`
Expected: FAIL, no existe `src/systems/adProvider`.

- [x] **Step 3: Implementar**

`game/src/systems/adProvider.ts`:

```ts
import type { AdConfig } from '../core/adConfig';
import type { AdSlot } from '../core/adPacing';
import type { AdProvider } from './ads';

/** Avisos del SDK que interesan: se abrió, no se pudo abrir, se cerró, el premio está ganado. */
export type AdMobEvent = 'showed' | 'failed' | 'dismissed' | 'rewarded';

/** Lo mínimo del complemento de AdMob que usa el juego (se sustituye en las pruebas). */
export interface AdMobLike {
  /** Arranca el SDK en modo infantil. */
  initialize(testing: boolean): Promise<void>;
  /** Carga el anuncio de un hueco: bonificado en la tienda, intersticial bonificado en la pausa. */
  prepare(slot: AdSlot, adId: string, testing: boolean): Promise<void>;
  show(slot: AdSlot): Promise<void>;
  on(slot: AdSlot, event: AdMobEvent, handler: () => void): Promise<{ remove(): Promise<void> }>;
}

/** Temporizador: devuelve cómo cancelarlo. */
export type Wait = (ms: number, fn: () => void) => () => void;

/** Si en este tiempo el SDK no avisa de que el anuncio se abrió, se da por fallido: el juego no se queda parado. */
export const SHOW_TIMEOUT_MS = 10_000;

const timeout: Wait = (ms, fn) => {
  const id = setTimeout(fn, ms);
  return () => clearTimeout(id);
};

/**
 * Convierte el complemento en un `AdProvider`. Trabaja con los avisos del SDK y no con lo que devuelven
 * sus llamadas: el premio solo existe si llega «rewarded», y «dismissed» solo indica que se cerró.
 */
export function createAdMobProvider(admob: AdMobLike, config: AdConfig, wait: Wait = timeout): AdProvider {
  let started: Promise<boolean> | null = null;
  /** El SDK se inicia justo antes de la primera carga, no al abrir el juego. Si falla, la siguiente carga lo reintenta. */
  const start = (): Promise<boolean> => {
    started ??= Promise.resolve()
      .then(() => admob.initialize(config.testing))
      .then(
        () => true,
        () => {
          started = null;
          return false;
        },
      );
    return started;
  };

  return {
    async load(slot) {
      const adId = config.units[slot];
      if (!adId) return false;
      if (!(await start())) return false;
      try {
        await admob.prepare(slot, adId, config.testing);
        return true;
      } catch {
        return false;
      }
    },

    show(slot) {
      return new Promise((resolve) => {
        let shown = false;
        let rewarded = false;
        let done = false;
        let cancel: () => void = () => {};
        const handles: Promise<{ remove(): Promise<void> }>[] = [];
        const finish = (result: { shown: boolean; rewarded: boolean }): void => {
          if (done) return;
          done = true;
          cancel();
          for (const handle of handles) void handle.then((h) => h.remove()).catch(() => {});
          resolve(result);
        };
        const failed = (): void => finish({ shown: false, rewarded: false });
        const listen = (event: AdMobEvent, handler: () => void): void => {
          handles.push(Promise.resolve().then(() => admob.on(slot, event, handler)));
        };
        listen('rewarded', () => {
          rewarded = true;
        });
        listen('showed', () => {
          shown = true;
          cancel();
        });
        listen('failed', failed);
        listen('dismissed', () => finish({ shown: true, rewarded }));
        // Primero los avisos, luego el anuncio: así no se escapa ninguno.
        Promise.all(handles)
          .then(() => {
            cancel = wait(SHOW_TIMEOUT_MS, () => {
              if (!shown) failed();
            });
            return admob.show(slot);
          })
          .catch(() => {
            // Con el anuncio ya abierto se sigue esperando su cierre.
            if (!shown) failed();
          });
      });
    },
  };
}
```

- [x] **Step 4: Lanzar y ver que pasan**

Run: `npx vitest run tests/unit/adProvider.test.ts && npm run typecheck`
Expected: PASS y sin errores de tipos.

- [x] **Step 5: Commit**

```bash
git add game/src/systems/adProvider.ts game/tests/unit/adProvider.test.ts
git commit -m "feat: proveedor de AdMob guiado por los avisos del SDK"
```

---

### Task 7: Botón atrás con el panel abierto (`decideBack`)

**Files:**
- Modify: `game/src/core/back.ts`, `game/src/systems/platform.ts` (una línea, para que siga compilando)
- Test: `game/tests/unit/back.test.ts`

**Interfaces:**
- Produces: `BackContext` gana `adOfferOpen: boolean`; `BackAction` gana `'close-ad'`. `Platform.backAction()` ya pasa `adOfferOpen`; el caso `'close-ad'` de `Platform.back()` llega en la Tarea 8, con la escena.

- [x] **Step 1: Escribir la prueba que falla**

En `game/tests/unit/back.test.ts`, la base gana el campo nuevo:

```ts
const base: BackContext = { quitDialogOpen: false, settingsOpen: false, overlayOpen: false, adOfferOpen: false, screen: 'world' };
```

y dentro del `describe`:

```ts
  it('con el panel del anuncio abierto, atrás equivale a la X', () => {
    expect(decideBack({ ...base, adOfferOpen: true })).toBe('close-ad');
  });

  it('el panel del anuncio va antes que la tienda sobre la que se abrió', () => {
    expect(decideBack({ ...base, adOfferOpen: true, overlayOpen: true })).toBe('close-ad');
  });
```

- [x] **Step 2: Lanzarla y ver que falla**

Run: `npx vitest run tests/unit/back.test.ts`
Expected: FAIL (`close-ad` no se devuelve).

- [x] **Step 3: Implementar**

`game/src/core/back.ts` queda así:

```ts
/** Qué hay abierto cuando se pulsa el botón atrás de Android. */
export interface BackContext {
  quitDialogOpen: boolean;
  settingsOpen: boolean;
  /** Tienda o primer plano de dar de comer. */
  overlayOpen: boolean;
  /** Panel que ofrece ver un anuncio. */
  adOfferOpen: boolean;
  screen: 'title' | 'world' | 'other';
}

export type BackAction = 'close-quit' | 'close-settings' | 'close-ad' | 'close-overlay' | 'ask-quit' | 'exit' | 'none';

/** Nunca cierra de golpe desde el juego: primero cierra lo abierto y en el mundo pregunta. */
export function decideBack(ctx: BackContext): BackAction {
  if (ctx.quitDialogOpen) return 'close-quit';
  if (ctx.settingsOpen) return 'close-settings';
  // El panel del anuncio se abre encima de la tienda o del mapa: atrás lo rechaza, como la X.
  if (ctx.adOfferOpen) return 'close-ad';
  if (ctx.overlayOpen) return 'close-overlay';
  if (ctx.screen === 'world') return 'ask-quit';
  if (ctx.screen === 'title') return 'exit';
  return 'none';
}
```

En `game/src/systems/platform.ts`, en `backAction()`, el objeto que recibe `decideBack` gana esta línea después de `overlayOpen`. La escena `AdOffer` aún no existe y `active()` da falso: no cambia nada hasta la Tarea 8.

```ts
      adOfferOpen: this.active('AdOffer'),
```

- [x] **Step 4: Lanzar y ver que pasa**

Run: `npx vitest run tests/unit/back.test.ts && npm run typecheck`
Expected: PASS y sin errores de tipos.

- [x] **Step 5: Commit**

```bash
git add game/src/core/back.ts game/src/systems/platform.ts game/tests/unit/back.test.ts
git commit -m "feat: el botón atrás rechaza el panel del anuncio"
```

---

### Task 8: El panel y el arranque

**Files:**
- Create: `game/src/scenes/AdOfferScene.ts`, `game/src/systems/adsInstall.ts`
- Modify: `game/src/data/strings/es.ts`, `game/src/data/strings/en.ts`, `game/src/main.ts`, `game/src/systems/platform.ts`, `game/src/systems/analyticsInstall.ts`, `game/src/scenes/PreloadScene.ts`, `game/src/systems/testHooks.ts`

**Interfaces:**
- Consumes: `Ads`, `getAds`, `setAds`, `AdProvider` (Tarea 5); `createAdMobProvider`, `AdMobLike` (Tarea 6); `parseAdConfig`, `configuredSlots` (Tarea 5); `'close-ad'` y `adOfferOpen` (Tarea 7).
- Produces:
  - Escena `'AdOffer'` con `interface AdOfferSceneData { slot: AdSlot; resume: 'Shop' | 'World'; amount?: number; left?: number; busy?: boolean }` y métodos públicos `decline(): void`, `yesPos(): Vec | null`, `noPos(): Vec | null`, `offeredAmount(): number`, `countdownLeft(): number | null`.
  - `installAds(game: Phaser.Game): Promise<void>` y `startAds(game: Phaser.Game, provider: AdProvider, slots: readonly AdSlot[]): Promise<Ads>` en `adsInstall.ts`.
  - Textos `ad.offer`, `ad.thanks`, `ad.none`.
  - En `window.__ZOO__`: `adsFake(outcome: 'visto' | 'cortado' | 'fallo', ready?: boolean): Promise<void>`, `adsAdvance(seconds: number): Promise<void>`, `adOfferPos(key: 'yes' | 'no'): Vec | null`, `adOfferAmount(): number | null`, `adOfferCountdown(): number | null`.

Esta tarea no tiene prueba propia que falle primero: lo que dibuja se comprueba con las pruebas de juego de la Tarea 9. Aquí se exige `npm run typecheck`, las pruebas unitarias de textos y que el juego arranque.

- [x] **Step 1: Textos**

En `game/src/data/strings/es.ts`, junto a las claves `toast.*`:

```ts
  'ad.offer': '¡Mira un anuncio y gana {n} monedas!',
  'ad.thanks': '¡{n} monedas para ti!',
  'ad.none': 'Ahora no hay anuncio',
```

En `game/src/data/strings/en.ts`, en el mismo sitio:

```ts
  'ad.offer': 'Watch an ad and get {n} coins!',
  'ad.thanks': '{n} coins for you!',
  'ad.none': 'No ad right now',
```

- [x] **Step 2: La escena del panel**

`game/src/scenes/AdOfferScene.ts`:

```ts
import * as Phaser from 'phaser';
import type { AdSlot } from '../core/adPacing';
import type { Vec } from '../core/movement';
import { t } from '../data/strings';
import { getAds } from '../systems/ads';
import { sfx } from '../systems/audio';
import { bus } from '../systems/events';
import { addUiText } from '../ui/text';
import { UI, textStyle } from '../ui/theme';
import { addCloseBadge, addPanel, addPillButton, addVeil, coinImage } from '../ui/widgets';

export interface AdOfferSceneData {
  slot: AdSlot;
  /** Escena que abrió el panel: queda en pausa y se reanuda al cerrarlo. */
  resume: 'Shop' | 'World';
  /** Solo al volver a montarse (cambio de tamaño): el premio ya fijado, lo que queda de cuenta atrás y si el anuncio está en pantalla. */
  amount?: number;
  left?: number;
  busy?: boolean;
}

/** En la pausa el anuncio empieza solo al acabar esta cuenta atrás; la X se lo salta. */
const COUNTDOWN_MS = 5000;
const RING = 0xffd23c;

/**
 * Panel que ofrece ver un anuncio a cambio de monedas. No depende de leer: monedas, número grande,
 * botón verde con ▶ y una X. Tocar fuera no hace nada, para que no se cierre sin querer.
 */
export class AdOfferScene extends Phaser.Scene {
  private slot: AdSlot = 'tienda';
  private resumeKey: 'Shop' | 'World' = 'World';
  private amount = 0;
  private left = COUNTDOWN_MS;
  private busy = false;
  private fresh = true;
  private yes: Phaser.GameObjects.Container | null = null;
  private no: Phaser.GameObjects.Container | null = null;
  private ring: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super('AdOffer');
  }

  init(data: AdOfferSceneData): void {
    this.slot = data.slot;
    this.resumeKey = data.resume;
    this.busy = data.busy ?? false;
    this.left = data.left ?? COUNTDOWN_MS;
    // El premio se fija una vez, al abrir el panel: es el que se enseña y el que se paga.
    this.fresh = data.amount === undefined;
    this.amount = data.amount ?? getAds()?.offer(data.slot) ?? 0;
    this.yes = null;
    this.no = null;
    this.ring = null;
  }

  create(): void {
    const { width, height } = this.scale;
    addVeil(this);
    const restart = (): void => {
      const data: AdOfferSceneData = { slot: this.slot, resume: this.resumeKey, amount: this.amount, left: this.left, busy: this.busy };
      this.scene.restart(data);
    };
    this.scale.once(Phaser.Scale.Events.RESIZE, restart);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, restart));
    if (!getAds()) {
      this.finish();
      return;
    }
    // Con el anuncio en pantalla solo queda el velo: el panel ya se contestó.
    if (this.busy) return;

    const panelW = Math.min(width * 0.72, 560);
    const panelH = Math.min(height * 0.84, 440);
    const cx = width / 2;
    const cy = height / 2;
    addPanel(this, cx, cy, panelW, panelH);

    // Monedas apiladas y la cantidad en grande.
    const coin = Phaser.Math.Clamp(panelH * 0.17, 32, 68);
    const top = cy - panelH * 0.3;
    const label = addUiText(this, 0, top, `+${this.amount}`, textStyle(Math.round(coin * 1.25), '#ffffff', '#5a3210')).setOrigin(0, 0.5);
    const stackW = coin * 1.5;
    const gap = coin * 0.3;
    const left = cx - (stackW + gap + label.width) / 2;
    [0.22, 0, -0.22].forEach((dy, i) => coinImage(this, coin).setPosition(left + coin / 2 + i * coin * 0.25, top + dy * coin));
    label.setX(left + stackW + gap).setDepth(1);

    // Botón verde redondo con ▶, sin texto.
    const button = Phaser.Math.Clamp(panelH * 0.3, 64, 124);
    const buttonY = cy + panelH * 0.06;
    if (this.slot === 'pausa') this.ring = this.add.graphics();
    this.yes = addPillButton(this, cx, buttonY, button, button, { color: 'green', icon: 'play', onTap: () => void this.accept() });
    this.no = addCloseBadge(this, cx + panelW / 2 - 18, cy - panelH / 2 + 18, () => this.decline(), 52);

    let size = Phaser.Math.Clamp(Math.round(panelH * 0.075), 16, 30);
    const phrase = addUiText(this, cx, cy + panelH * 0.38, t('ad.offer', { n: this.amount }), textStyle(size, UI.brown, UI.cream)).setOrigin(0.5);
    while (phrase.width > panelW * 0.88 && size > 12) {
      size -= 2;
      phrase.setStyle(textStyle(size, UI.brown, UI.cream));
    }

    if (this.fresh) sfx.play('coin');
    this.drawRing();
  }

  override update(_time: number, delta: number): void {
    if (this.busy || !this.ring) return;
    this.left = Math.max(0, this.left - delta);
    this.drawRing();
    if (this.left === 0) void this.accept();
  }

  /** Anillo de la cuenta atrás alrededor del botón verde: se vacía en 5 segundos. */
  private drawRing(): void {
    const ring = this.ring;
    const yes = this.yes;
    if (!ring || !yes) return;
    const radius = yes.width * 0.64;
    const thick = Math.max(6, yes.width * 0.09);
    const start = -Math.PI / 2;
    ring.clear();
    ring.lineStyle(thick, 0xffffff, 0.35);
    ring.strokeCircle(yes.x, yes.y, radius);
    if (this.left <= 0) return;
    ring.lineStyle(thick, RING, 1);
    ring.beginPath();
    ring.arc(yes.x, yes.y, radius, start, start + Math.PI * 2 * (this.left / COUNTDOWN_MS), false);
    ring.strokePath();
  }

  /** Botón verde, o cuenta atrás a cero: se enseña el anuncio. */
  private async accept(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    sfx.play('tap');
    const amount = this.amount;
    const result = (await getAds()?.accept(this.slot)) ?? 'fallo';
    this.finish();
    if (result === 'visto') {
      sfx.play('coin');
      bus.emit('toast', { text: t('ad.thanks', { n: amount }) });
    } else if (result === 'fallo') {
      bus.emit('toast', { text: t('ad.none') });
    }
  }

  /** La X (y el botón atrás de Android): no se ve el anuncio. */
  decline(): void {
    if (this.busy || !this.scene.isActive()) return;
    this.busy = true;
    sfx.play('tap');
    getAds()?.decline(this.slot);
    this.finish();
  }

  private finish(): void {
    this.scene.stop();
    this.scene.resume(this.resumeKey);
  }

  // --- API para pruebas ---

  yesPos(): Vec | null {
    return this.yes ? { x: this.yes.x, y: this.yes.y } : null;
  }

  noPos(): Vec | null {
    return this.no ? { x: this.no.x, y: this.no.y } : null;
  }

  offeredAmount(): number {
    return this.amount;
  }

  /** Milisegundos que quedan de cuenta atrás; `null` si este panel no la tiene. */
  countdownLeft(): number | null {
    return this.ring ? this.left : null;
  }
}
```

- [x] **Step 3: El arranque (único archivo que toca el complemento)**

`game/src/systems/adsInstall.ts`. Los nombres del complemento se comprueban contra los `.d.ts` apuntados en la Tarea 1; si alguno se llama distinto, se corrige solo dentro de `capacitorAdMob`:

```ts
import { AdMob, MaxAdContentRating, RewardAdPluginEvents, RewardInterstitialAdPluginEvents } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import type * as Phaser from 'phaser';
import { configuredSlots, parseAdConfig, type AdEnv } from '../core/adConfig';
import type { AdSlot } from '../core/adPacing';
import { createAdMobProvider, type AdMobEvent, type AdMobLike } from './adProvider';
import { Ads, setAds, type AdProvider } from './ads';
import { sfx } from './audio';
import { createStore } from './createStore';
import { bus } from './events';
import { getSession } from './session';

/** Avisos del complemento para cada hueco: bonificado en la tienda, intersticial bonificado en la pausa. */
const EVENTS: Record<AdSlot, Record<AdMobEvent, string>> = {
  tienda: {
    showed: RewardAdPluginEvents.Showed,
    failed: RewardAdPluginEvents.FailedToShow,
    dismissed: RewardAdPluginEvents.Dismissed,
    rewarded: RewardAdPluginEvents.Rewarded,
  },
  pausa: {
    showed: RewardInterstitialAdPluginEvents.Showed,
    failed: RewardInterstitialAdPluginEvents.FailedToShow,
    dismissed: RewardInterstitialAdPluginEvents.Dismissed,
    rewarded: RewardInterstitialAdPluginEvents.Rewarded,
  },
};

/** El complemento de verdad, visto como `AdMobLike`. */
function capacitorAdMob(): AdMobLike {
  return {
    // Modo infantil: dirigido a niños y solo anuncios para todos los públicos. No se marca «menor de la edad de
    // consentimiento» (Google pide no activar las dos) ni se llama a la plataforma de consentimiento.
    initialize: (testing) =>
      AdMob.initialize({ initializeForTesting: testing, tagForChildDirectedTreatment: true, maxAdContentRating: MaxAdContentRating.General }),
    prepare: async (slot, adId, testing) => {
      const options = { adId, isTesting: testing };
      if (slot === 'tienda') await AdMob.prepareRewardVideoAd(options);
      else await AdMob.prepareRewardInterstitialAd(options);
    },
    show: async (slot) => {
      if (slot === 'tienda') await AdMob.showRewardVideoAd();
      else await AdMob.showRewardInterstitialAd();
    },
    // El complemento tipa cada aviso por separado; aquí llegan por nombre.
    on: (slot, event, handler) => AdMob.addListener(EVENTS[slot][event] as never, handler as never),
  };
}

let timer: ReturnType<typeof setInterval> | null = null;

/** Tiempo de juego: el juego en pantalla y la partida empezada (ya se ha salido de la portada). */
function playing(game: Phaser.Game): boolean {
  return !document.hidden && (game.scene.isActive('World') || game.scene.isPaused('World'));
}

/** Monta la publicidad con un proveedor dado y arranca el reloj de juego. Las pruebas pasan uno falso. */
export async function startAds(game: Phaser.Game, provider: AdProvider, slots: readonly AdSlot[]): Promise<Ads> {
  const ads = new Ads({
    provider,
    slots,
    store: createStore(),
    events: bus,
    now: () => new Date(),
    state: () => getSession().state,
    earnCoins: (amount) => getSession().earnCoins(amount),
    pauseSound: (paused) => sfx.setPaused('ad', paused),
  });
  await ads.start();
  setAds(ads);
  if (timer !== null) clearInterval(timer);
  timer = setInterval(() => {
    if (playing(game)) ads.tick(1);
  }, 1000);
  return ads;
}

/** Arranca la publicidad. Fuera de Android nativo o sin configuración no instala nada. Nunca lanza. */
export async function installAds(game: Phaser.Game): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
    const config = parseAdConfig(import.meta.env as AdEnv, import.meta.env.DEV);
    if (!config) return;
    await startAds(game, createAdMobProvider(capacitorAdMob(), config), configuredSlots(config));
  } catch {
    // La publicidad nunca impide jugar.
  }
}
```

- [x] **Step 4: Enchufar la escena, el botón atrás, las estadísticas y el arranque**

`game/src/main.ts`: importar la escena y ponerla después de `HudScene` (se dibuja encima del contador de monedas, y debajo de ajustes, salir y girar):

```ts
import { AdOfferScene } from './scenes/AdOfferScene';
```

```ts
  // El orden importa: Hud se dibuja encima de Feed/Shop; el panel del anuncio, ajustes, salir y girar, encima de todo.
  scene: [BootScene, PreloadScene, TitleScene, WorldScene, FeedScene, ShopScene, BookScene, HudScene, AdOfferScene, SettingsScene, QuitScene, RotateScene],
```

`game/src/systems/platform.ts`:

```ts
import type { AdOfferScene } from '../scenes/AdOfferScene';
import { getAds } from './ads';
```

(`adOfferOpen` ya se pasa a `decideBack` desde la Tarea 7.) En `back()`, un caso más en el `switch`, después de `'close-settings'`:

```ts
      case 'close-ad':
        scene<AdOfferScene>('AdOffer').decline();
        break;
```

En `setBackground()`, después de `getAnalytics()?.setBackground(hidden);`:

```ts
    getAds()?.setBackground(hidden);
```

`game/src/systems/analyticsInstall.ts`, en `SCREENS`, después de `Quit: 'salir',`:

```ts
  AdOffer: 'anuncio',
```

`game/src/scenes/PreloadScene.ts`: importar e instalar después de las estadísticas:

```ts
import { installAds } from '../systems/adsInstall';
```

```ts
    await installAnalytics(this.game);
    // Después de las estadísticas: los avisos de la publicidad ya tienen quien los escuche.
    await installAds(this.game);
    this.scene.start('Title');
```

- [x] **Step 5: Ganchos de prueba**

`game/src/systems/testHooks.ts`. Imports nuevos:

```ts
import { AD_SLOTS } from '../core/adPacing';
import type { AdOfferScene } from '../scenes/AdOfferScene';
import { getAds } from './ads';
import { startAds } from './adsInstall';
```

En `ZooTestApi`, antes de `busLog()`:

```ts
  /** Monta la publicidad con un proveedor falso. `outcome`: qué pasa al enseñar el anuncio; `ready`: si hay anuncio que cargar. */
  adsFake(outcome: 'visto' | 'cortado' | 'fallo', ready?: boolean): Promise<void>;
  /** Hace pasar segundos de juego para la publicidad y espera a que terminen las cargas. */
  adsAdvance(seconds: number): Promise<void>;
  /** Con el panel del anuncio abierto: dónde están el botón verde y la X. */
  adOfferPos(key: 'yes' | 'no'): Vec | null;
  adOfferAmount(): number | null;
  /** Milisegundos que quedan de cuenta atrás; `null` si no hay panel o no la tiene. */
  adOfferCountdown(): number | null;
```

En la lista `logged`, añadir al final:

```ts
    'ad-offered', 'ad-accepted', 'ad-declined', 'ad-watched', 'ad-cut', 'ad-failed', 'ad-empty',
```

En `window.__ZOO__ = { ... }`, antes de `busLog`:

```ts
    adsFake: async (outcome, ready = true) => {
      await startAds(
        game,
        { load: async () => ready, show: async () => ({ shown: outcome !== 'fallo', rewarded: outcome === 'visto' }) },
        AD_SLOTS,
      );
    },
    adsAdvance: async (seconds) => {
      const ads = getAds();
      if (!ads) return;
      ads.tick(seconds);
      await ads.settled();
    },
    adOfferPos: (key) => {
      const scene = activeScene<AdOfferScene>('AdOffer');
      return (key === 'yes' ? scene?.yesPos() : scene?.noPos()) ?? null;
    },
    adOfferAmount: () => activeScene<AdOfferScene>('AdOffer')?.offeredAmount() ?? null,
    adOfferCountdown: () => activeScene<AdOfferScene>('AdOffer')?.countdownLeft() ?? null,
```

- [x] **Step 6: Comprobar**

Run: `npm run typecheck && npx vitest run tests/unit/strings.test.ts tests/unit/back.test.ts tests/unit/analyticsWiring.test.ts tests/unit/hud.test.ts`
Expected: sin errores de tipos y PASS.

Si `typecheck` se queja de un nombre del complemento, corregirlo dentro de `capacitorAdMob()` con el nombre real de los `.d.ts`. No tocar `AdMobLike` ni `createAdMobProvider`.

Run: `npm run build`
Expected: compila y `check-dist: sin tokens en la compilación.` (la web sigue compilando con el complemento instalado).

- [x] **Step 7: Commit**

```bash
git add game/src/scenes/AdOfferScene.ts game/src/systems/adsInstall.ts game/src/data/strings/es.ts game/src/data/strings/en.ts game/src/main.ts game/src/systems/platform.ts game/src/systems/analyticsInstall.ts game/src/scenes/PreloadScene.ts game/src/systems/testHooks.ts
git commit -m "feat: panel que ofrece el anuncio y arranque de la publicidad en Android"
```

---

### Task 9: Dónde salta, con pruebas de juego

**Files:**
- Modify: `game/src/scenes/ShopScene.ts`, `game/src/scenes/WorldScene.ts`, `game/src/scenes/FeedScene.ts`
- Test: `game/tests/e2e/ads.spec.ts` (nuevo)

**Interfaces:**
- Consumes: `getAds().canOffer(slot)`, escena `'AdOffer'` con `AdOfferSceneData`, ganchos `adsFake`, `adsAdvance`, `adOfferPos`, `adOfferAmount`, `adOfferCountdown` (Tarea 8).
- Produces: `FeedScene.close()` reanuda el mapa con `{ from: 'feed' }`.

- [x] **Step 1: Escribir las pruebas de juego que fallan**

`game/tests/e2e/ads.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test';

async function canvasBox(page: Page) {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('No hay canvas');
  return box;
}

async function startGame(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
  const box = await canvasBox(page);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.62);
  await page.waitForFunction(() => {
    const scenes = window.__ZOO__?.activeScenes() ?? [];
    return scenes.includes('World') && scenes.includes('Hud');
  });
}

const log = (page: Page): Promise<string[]> => page.evaluate(() => window.__ZOO__!.busLog());
const scenes = (page: Page): Promise<string[]> => page.evaluate(() => window.__ZOO__!.activeScenes());
const coins = (page: Page): Promise<string | null> => page.evaluate(() => window.__ZOO__!.hudCoinsText());
const panelOpen = (page: Page) => page.waitForFunction(() => window.__ZOO__!.adOfferPos('yes') !== null);

async function tap(page: Page, key: 'yes' | 'no'): Promise<void> {
  const pos = (await page.evaluate((k) => window.__ZOO__!.adOfferPos(k), key))!;
  const box = await canvasBox(page);
  await page.mouse.click(box.x + pos.x, box.y + pos.y);
}

/** Abre la tienda y espera a que pase el medio segundo en el que el panel podría saltar. */
async function enterShop(page: Page): Promise<void> {
  await page.evaluate(() => window.__ZOO__!.openShop());
  await page.waitForFunction(() => window.__ZOO__!.shopCardScreenPos('pantera') !== null);
}

test('sin publicidad montada (la web), la tienda es la de siempre', async ({ page }) => {
  await startGame(page);
  await enterShop(page);
  await page.waitForTimeout(1500);
  expect(await scenes(page)).not.toContain('AdOffer');
  expect((await log(page)).filter((name) => name.startsWith('ad-'))).toEqual([]);
});

test('antes de 5 minutos de juego no salta el panel', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.adsFake('visto'));
  await page.evaluate(() => window.__ZOO__!.adsAdvance(200));
  await enterShop(page);
  await page.waitForTimeout(1500);
  expect(await scenes(page)).not.toContain('AdOffer');
});

test('sin anuncio listo no salta el panel y se avisa una vez', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.adsFake('visto', false));
  await page.evaluate(() => window.__ZOO__!.adsAdvance(300));
  await enterShop(page);
  await page.waitForTimeout(1500);
  expect(await scenes(page)).not.toContain('AdOffer');
  expect((await log(page)).filter((name) => name === 'ad-empty')).toHaveLength(1);
});

test('al entrar en la tienda salta el panel y el botón verde da las monedas', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.adsFake('visto'));
  await page.evaluate(() => window.__ZOO__!.adsAdvance(300));
  await enterShop(page);
  await panelOpen(page);
  expect(await page.evaluate(() => window.__ZOO__!.adOfferAmount())).toBe(10);
  expect(await page.evaluate(() => window.__ZOO__!.adOfferCountdown())).toBeNull();
  // La tienda queda en pausa debajo del panel.
  expect(await scenes(page)).not.toContain('Shop');
  // Sin tocar nada el anuncio no empieza: en la tienda no hay cuenta atrás.
  await page.waitForTimeout(1500);
  expect(await coins(page)).toBe('0');

  await tap(page, 'yes');
  await expect.poll(() => coins(page)).toBe('10');
  await expect.poll(() => scenes(page)).toContain('Shop');
  expect(await scenes(page)).not.toContain('AdOffer');
  expect((await log(page)).filter((name) => name.startsWith('ad-'))).toEqual(['ad-offered', 'ad-accepted', 'ad-watched']);
});

test('la X cierra el panel sin anuncio ni monedas, y no vuelve a saltar al momento', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.adsFake('visto'));
  await page.evaluate(() => window.__ZOO__!.adsAdvance(300));
  await enterShop(page);
  await panelOpen(page);
  await tap(page, 'no');
  await expect.poll(() => scenes(page)).toContain('Shop');
  expect(await scenes(page)).not.toContain('AdOffer');
  expect(await coins(page)).toBe('0');
  expect((await log(page)).filter((name) => name.startsWith('ad-'))).toEqual(['ad-offered', 'ad-declined']);

  // Salir y volver a entrar enseguida: hay que esperar 15 minutos de juego.
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('World'));
  await page.evaluate(() => window.__ZOO__!.adsAdvance(600));
  await enterShop(page);
  await page.waitForTimeout(1500);
  expect(await scenes(page)).not.toContain('AdOffer');
});

test('tocar fuera del panel no lo cierra', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.adsFake('visto'));
  await page.evaluate(() => window.__ZOO__!.adsAdvance(300));
  await enterShop(page);
  await panelOpen(page);
  const box = await canvasBox(page);
  await page.mouse.click(box.x + 20, box.y + box.height - 20);
  await page.waitForTimeout(500);
  expect(await scenes(page)).toContain('AdOffer');
  expect(await log(page)).not.toContain('ad-declined');
});

test('el botón atrás de Android equivale a la X', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.adsFake('visto'));
  await page.evaluate(() => window.__ZOO__!.adsAdvance(300));
  await enterShop(page);
  await panelOpen(page);
  expect(await page.evaluate(() => window.__ZOO__!.back())).toBe('close-ad');
  await expect.poll(() => scenes(page)).toContain('Shop');
  expect(await log(page)).toContain('ad-declined');
  expect(await coins(page)).toBe('0');
});

test('un anuncio cerrado antes de tiempo no da monedas', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.adsFake('cortado'));
  await page.evaluate(() => window.__ZOO__!.adsAdvance(300));
  await enterShop(page);
  await panelOpen(page);
  await tap(page, 'yes');
  await expect.poll(() => log(page)).toContain('ad-cut');
  await expect.poll(() => scenes(page)).toContain('Shop');
  expect(await coins(page)).toBe('0');
});

test('cambiar el tamaño con el panel abierto no repite la oferta ni cambia el premio', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.adsFake('visto'));
  await page.evaluate(() => window.__ZOO__!.adsAdvance(300));
  await enterShop(page);
  await panelOpen(page);
  await page.setViewportSize({ width: 1100, height: 640 });
  await page.waitForTimeout(600);
  await panelOpen(page);
  expect(await page.evaluate(() => window.__ZOO__!.adOfferAmount())).toBe(10);
  expect((await log(page)).filter((name) => name === 'ad-offered')).toHaveLength(1);
  await tap(page, 'yes');
  await expect.poll(() => coins(page)).toBe('10');
  expect((await log(page)).filter((name) => name === 'ad-watched')).toHaveLength(1);
});

test('pausa: al volver al mapa tras 15 minutos salta el panel y el anuncio empieza solo', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.adsFake('visto'));
  await page.evaluate(() => window.__ZOO__!.adsAdvance(900));
  await page.evaluate(() => window.__ZOO__!.openFeed('bills'));
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('Feed'));
  await page.keyboard.press('Escape');
  await panelOpen(page);
  const left = await page.evaluate(() => window.__ZOO__!.adOfferCountdown());
  expect(left).not.toBeNull();
  expect(left!).toBeGreaterThan(3000);
  // El mapa queda en pausa debajo del panel.
  expect(await scenes(page)).not.toContain('World');
  // Sin tocar nada: a los 5 segundos empieza el anuncio.
  await expect.poll(() => coins(page), { timeout: 12_000 }).toBe('10');
  await expect.poll(() => scenes(page)).toContain('World');
  expect((await log(page)).filter((name) => name.startsWith('ad-'))).toEqual(['ad-offered', 'ad-accepted', 'ad-watched']);
});

test('pausa: la X se salta el anuncio', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.adsFake('visto'));
  await page.evaluate(() => window.__ZOO__!.adsAdvance(900));
  await page.evaluate(() => window.__ZOO__!.openFeed('bills'));
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('Feed'));
  await page.keyboard.press('Escape');
  await panelOpen(page);
  await tap(page, 'no');
  await expect.poll(() => scenes(page)).toContain('World');
  await page.waitForTimeout(6000);
  expect(await coins(page)).toBe('0');
  expect((await log(page)).filter((name) => name.startsWith('ad-'))).toEqual(['ad-offered', 'ad-declined']);
});

test('pausa: no salta al volver de Ajustes', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.adsFake('visto'));
  await page.evaluate(() => window.__ZOO__!.adsAdvance(900));
  await page.evaluate(() => window.__ZOO__!.openSettings());
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('Settings'));
  expect(await page.evaluate(() => window.__ZOO__!.back())).toBe('close-settings');
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('World'));
  await page.waitForTimeout(1200);
  expect(await scenes(page)).not.toContain('AdOffer');
});
```

- [x] **Step 2: Lanzarlas y ver que fallan**

Run: `npx playwright test tests/e2e/ads.spec.ts`
Expected: las tres primeras pasan (no salta nada) y fallan las que esperan el panel, por tiempo agotado en `panelOpen`.

- [x] **Step 3: La tienda**

En `game/src/scenes/ShopScene.ts`, imports nuevos:

```ts
import { getAds } from '../systems/ads';
import type { AdOfferSceneData } from './AdOfferScene';
```

Una constante junto a las demás, arriba:

```ts
/** El panel del anuncio salta medio segundo después de entrar. */
const AD_OFFER_MS = 500;
```

En `create()`, justo después de la línea de `restartOnResize(...)`:

```ts
    // Solo al entrar de verdad: al volver a montarse por un giro no se repite.
    if (!this.restored) this.time.delayedCall(AD_OFFER_MS, () => this.offerAd());
```

Y el método, junto a `close()`:

```ts
  /** Si toca y hay anuncio listo, se ofrece: la tienda queda en pausa debajo del panel. */
  private offerAd(): void {
    if (this.closing || !this.scene.isActive() || this.scene.isActive('Book')) return;
    if (!getAds()?.canOffer('tienda')) return;
    const data: AdOfferSceneData = { slot: 'tienda', resume: 'Shop' };
    this.scene.pause();
    this.scene.launch('AdOffer', data);
  }
```

- [x] **Step 4: El mapa y la pantalla de dar de comer**

En `game/src/scenes/FeedScene.ts`, en `close()`, la última línea pasa a ser:

```ts
    this.scene.resume('World', { from: 'feed' });
```

En `game/src/scenes/WorldScene.ts`, imports nuevos:

```ts
import { getAds } from '../systems/ads';
import type { AdOfferSceneData } from './AdOfferScene';
```

Una constante junto a las demás, arriba:

```ts
/** El panel de la pausa salta un momento después de volver al mapa: deja acabar el fundido de la tienda. */
const AD_OFFER_MS = 300;
```

`onResume` queda así, y debajo el método nuevo:

```ts
  private onResume(_sys: Phaser.Scenes.Systems, data?: { from?: string }): void {
    if (data?.from === 'shop') this.leaveShop();
    this.refresh();
    // Una pausa natural: se vuelve de dar de comer o de la tienda. De Ajustes, del libro o de «¿Salir?», no.
    if (data?.from === 'shop' || data?.from === 'feed') this.time.delayedCall(AD_OFFER_MS, () => this.offerAd());
  }

  /** Si toca y hay anuncio listo, se ofrece: el mundo queda en pausa debajo del panel. */
  private offerAd(): void {
    if (!this.scene.isActive()) return;
    if (!getAds()?.canOffer('pausa')) return;
    const data: AdOfferSceneData = { slot: 'pausa', resume: 'World' };
    this.stopWalking();
    this.scene.pause();
    this.scene.launch('AdOffer', data);
  }
```

- [x] **Step 5: Lanzar las pruebas de juego**

Run: `npx playwright test tests/e2e/ads.spec.ts`
Expected: PASS, 12 pruebas.

Run: `npx playwright test tests/e2e/shop.spec.ts tests/e2e/stats.spec.ts`
Expected: PASS (la tienda y dar de comer siguen igual sin publicidad montada).

- [x] **Step 6: Commit**

```bash
git add game/src/scenes/ShopScene.ts game/src/scenes/WorldScene.ts game/src/scenes/FeedScene.ts game/tests/e2e/ads.spec.ts
git commit -m "feat: el panel del anuncio salta en la tienda y al volver al mapa"
```

---

### Task 10: Apartado «Anuncios» del resumen de estadísticas

**Files:**
- Modify: `tools/matomo/lib.mjs`, `tools/matomo/resumen.mjs`
- Test: `tools/matomo/lib.test.mjs`

**Interfaces:**
- Produces: `adTotals(index, slot): { offered, accepted, declined, watched, cut, failed, empty, coins }` y `adByBalance(index, buckets): { bucket, offered, declined }[]` en `lib.mjs`. `index` es lo que devuelve `byAction`.

Los comandos de esta tarea se lanzan desde la raíz del repositorio.

- [x] **Step 1: Escribir la prueba que falla**

Al final de `tools/matomo/lib.test.mjs`:

```js
import { adByBalance, adTotals } from './lib.mjs';

const adRow = (action, name, events, sum = 0) => ({ action, name, events, visits: events, sum, avg: 0, min: 0, max: 0 });
const adIndex = () => byAction([
  adRow('anuncio-ofrece', 'tienda/0-19', 10, 100),
  adRow('anuncio-ofrece', 'tienda/50-149', 6, 150),
  adRow('anuncio-ofrece', 'pausa/50-149', 4, 100),
  adRow('anuncio-acepta', 'tienda/0-19', 8),
  adRow('anuncio-acepta', 'pausa/50-149', 3),
  adRow('anuncio-no', 'tienda/0-19', 2),
  adRow('anuncio-no', 'tienda/50-149', 6),
  adRow('anuncio-no', 'pausa/50-149', 1),
  adRow('anuncio-visto', 'tienda/0-19', 5, 50),
  adRow('anuncio-visto', 'pausa/50-149', 2, 50),
  adRow('anuncio-cortado', 'tienda', 2),
  adRow('anuncio-fallo', 'tienda', 1),
  adRow('anuncio-vacio', 'tienda', 7),
  adRow('anuncio-vacio', 'pausa', 9),
]);

test('adTotals suma por hueco, con o sin tramo de saldo en el nombre', () => {
  assert.deepEqual(adTotals(adIndex(), 'tienda'), { offered: 16, accepted: 8, declined: 8, watched: 5, cut: 2, failed: 1, empty: 7, coins: 50 });
  assert.deepEqual(adTotals(adIndex(), 'pausa'), { offered: 4, accepted: 3, declined: 1, watched: 2, cut: 0, failed: 0, empty: 9, coins: 50 });
});

test('adTotals sin datos da ceros', () => {
  assert.deepEqual(adTotals(byAction([]), 'tienda'), { offered: 0, accepted: 0, declined: 0, watched: 0, cut: 0, failed: 0, empty: 0, coins: 0 });
});

test('adByBalance cruza paneles y rechazos por tramo de saldo, sumando los huecos', () => {
  assert.deepEqual(adByBalance(adIndex(), ['0-19', '20-49', '50-149']), [
    { bucket: '0-19', offered: 10, declined: 2 },
    { bucket: '20-49', offered: 0, declined: 0 },
    { bucket: '50-149', offered: 10, declined: 7 },
  ]);
});
```

- [x] **Step 2: Lanzarla y ver que falla**

Run: `node --test tools/matomo/lib.test.mjs`
Expected: FAIL, `adTotals` no existe en `lib.mjs`.

- [x] **Step 3: Implementar**

Al final de `tools/matomo/lib.mjs`:

```js
const rowsOf = (index, action) => [...(index.get(action)?.values() ?? [])];

/** Cifras de publicidad de un hueco. El nombre es el hueco solo (`tienda`) o con el tramo de saldo (`tienda/50-149`). */
export function adTotals(index, slot) {
  const sum = (action, key = 'events') =>
    rowsOf(index, action).filter((row) => row.name === slot || row.name.startsWith(`${slot}/`)).reduce((total, row) => total + row[key], 0);
  return {
    offered: sum('anuncio-ofrece'),
    accepted: sum('anuncio-acepta'),
    declined: sum('anuncio-no'),
    watched: sum('anuncio-visto'),
    cut: sum('anuncio-cortado'),
    failed: sum('anuncio-fallo'),
    empty: sum('anuncio-vacio'),
    /** Monedas repartidas: la suma del valor de los anuncios vistos enteros. */
    coins: sum('anuncio-visto', 'sum'),
  };
}

/** Paneles y rechazos según las monedas que tenía el niño, sumando los huecos. */
export function adByBalance(index, buckets) {
  const sum = (action, bucket) => rowsOf(index, action).filter((row) => row.name.endsWith(`/${bucket}`)).reduce((total, row) => total + row.events, 0);
  return buckets.map((bucket) => ({ bucket, offered: sum('anuncio-ofrece', bucket), declined: sum('anuncio-no', bucket) }));
}
```

En `tools/matomo/resumen.mjs`, añadir `adByBalance` y `adTotals` al import de `./lib.mjs`, y antes de `writeFileSync(...)`:

```js
const AD_SLOTS = ['tienda', 'pausa'];
// Los tramos de `coinsBucket` del juego (src/core/eventCatalog.ts).
const AD_BALANCES = ['0-19', '20-49', '50-149', '150-399', '400-899', '900-1599', '1600+'];
out.push('## Anuncios', '', 'Solo Android. El dinero real no sale aquí: los ingresos están en el panel de AdMob. «Sin anuncio listo» dice cuántas veces tocaba ofrecer uno y Google no había dado ninguno.', '', table(
  ['Hueco', 'Paneles', 'Aceptados', 'Rechazados (X)', 'Vistos enteros (de los aceptados)', 'Cortados', 'Fallos', 'Sin anuncio listo', 'Monedas repartidas'],
  AD_SLOTS.map((slot) => {
    const a = adTotals(index, slot);
    return [slot, a.offered, share(a.accepted, a.offered), share(a.declined, a.offered), share(a.watched, a.accepted), a.cut, a.failed, a.empty, a.coins];
  }),
), '', table(
  ['Monedas que tenía', 'Paneles', 'Rechazados (X)'],
  adByBalance(index, AD_BALANCES).map((row) => [row.bucket, row.offered, share(row.declined, row.offered)]),
), '');
```

- [x] **Step 4: Lanzar y ver que pasa**

Run: `node --test tools/matomo/lib.test.mjs`
Expected: PASS.

Run: `node --check tools/matomo/resumen.mjs`
Expected: sin salida (la sintaxis es correcta).

- [x] **Step 5: Commit**

```bash
git add tools/matomo/lib.mjs tools/matomo/lib.test.mjs tools/matomo/resumen.mjs
git commit -m "feat: apartado de anuncios en el resumen de estadísticas"
```

---

### Task 11: Textos legales

**Files:**
- Modify: `game/public/privacidad.html`, `game/public/privacidad-en.html`

**Interfaces:** ninguna. Es texto legal: **David lo tiene que leer y dar por bueno antes de publicar**, y la página pública de davidpladel.com debe decir lo mismo (paso manual).

Si la lista de permisos apuntada en la Tarea 1 trae alguno que este texto no cubre (por ejemplo, el estado de la red), ajustar la frase de «Permisos» para que lo nombre.

- [x] **Step 1: Página en español**

En `game/public/privacidad.html`:

La fecha pasa a ser (poner la del día en que se publique la 2.6.0):

```html
      <p><strong>Última actualización: 12 de octubre de 2026</strong></p>
```

«En pocas palabras» queda:

```html
      <h2>En pocas palabras</h2>
      <p>
        Zoo Esponji es un juego para niños. <strong>No pide ni guarda datos personales</strong>: no hay que registrarse ni
        escribir el nombre, y el juego no tiene compras, chat ni redes sociales. Cuenta, de forma anónima, cuánto y
        cómo se juega; se puede apagar en Ajustes. En Android enseña de vez en cuando un anuncio con premio, que
        siempre se puede rechazar; los sirve Google, que para ello recibe algunos datos técnicos del aparato (ver
        «Publicidad»). La versión web no tiene anuncios.
      </p>
```

Apartado nuevo, entre «Estadísticas anónimas» y «Permisos»:

```html
      <h2>Publicidad</h2>
      <p>
        Solo en la versión de Android. De vez en cuando el juego ofrece ver un anuncio a cambio de monedas del
        juego: como mucho uno cada 15 minutos de juego y cuatro al día, nunca al abrir el juego, y siempre con un
        botón para decir que no. No hay ningún otro tipo de anuncio.
      </p>
      <p>
        Los anuncios los sirve Google AdMob. El juego le indica a Google que se dirige a niños y que solo acepta
        anuncios para todos los públicos, así que no se personalizan. El juego no usa el identificador de publicidad
        del dispositivo ni pide permiso para usarlo. Para enseñar el anuncio y evitar fraudes, Google recibe la
        dirección de internet (de la que se deduce la zona aproximada), datos técnicos del aparato y de la
        aplicación, cómo se interactúa con el anuncio y datos de diagnóstico. Google trata esos datos según su
        propia política de privacidad: policies.google.com/privacy.
      </p>
```

«Permisos» queda:

```html
      <h2>Permisos</h2>
      <p>
        El juego no usa la cámara, el micrófono, la ubicación, los contactos ni las fotos del dispositivo. En
        Android solo usa la conexión a internet, para las estadísticas anónimas y los anuncios, y no pide el
        permiso del identificador de publicidad.
      </p>
```

En «Niños», añadir una frase al final del párrafo:

```html
        Los anuncios de la versión de Android se piden a Google marcados como dirigidos a niños.
```

En «Tus derechos», después de «las estadísticas anónimas se apagan en Ajustes.», añadir:

```html
        Sobre los datos técnicos que trata Google al servir los anuncios, consulta su política (policies.google.com/privacy).
```

«Cambios en esta página» queda:

```html
      <h2>Cambios en esta página</h2>
      <p>
        Si el juego cambia y pasa a recoger algún dato más, esta página se actualizará antes, explicando qué se recoge y
        para qué. Último cambio (12 de octubre de 2026): se añade el apartado «Publicidad» por los anuncios con premio
        de la versión de Android.
      </p>
```

- [x] **Step 2: Página en inglés**

En `game/public/privacidad-en.html`, los mismos cambios:

```html
      <p><strong>Last updated: 12 October 2026</strong></p>
```

```html
      <h2>In a nutshell</h2>
      <p>
        Zoo Esponji is a game for children. <strong>It does not ask for or store personal data</strong>: there is no
        sign-up and no need to type a name, and the game has no purchases, chat or social networks. It counts,
        anonymously, how much and how the game is played; you can turn that off in Settings. On Android it shows a
        rewarded ad from time to time, which can always be declined; the ads are served by Google, which receives
        some technical data about the device to do so (see “Advertising”). The web version has no ads.
      </p>
```

Entre «Anonymous statistics» y «Permissions»:

```html
      <h2>Advertising</h2>
      <p>
        Only in the Android version. From time to time the game offers to watch an ad in exchange for in-game coins:
        at most one every 15 minutes of play and four a day, never when the game opens, and always with a button to
        say no. There is no other kind of ad.
      </p>
      <p>
        The ads are served by Google AdMob. The game tells Google that it is directed to children and that it only
        accepts ads suitable for all audiences, so they are not personalised. The game does not use the device's
        advertising ID and does not ask for permission to use it. To show the ad and prevent fraud, Google receives
        the internet address (from which the approximate area is derived), technical data about the device and the
        app, how the ad is interacted with, and diagnostic data. Google handles that data under its own privacy
        policy: policies.google.com/privacy.
      </p>
```

```html
      <h2>Permissions</h2>
      <p>
        The game does not use the device's camera, microphone, location, contacts or photos. On Android it only uses
        the internet connection, for the anonymous statistics and the ads, and it does not request the advertising
        ID permission.
      </p>
```

En «Children», al final del párrafo:

```html
        Ads in the Android version are requested from Google flagged as directed to children.
```

En «Your rights», después de la frase que dice que las estadísticas se apagan en Ajustes:

```html
        For the technical data Google handles when serving ads, see its policy (policies.google.com/privacy).
```

```html
      <h2>Changes to this page</h2>
      <p>
        If the game changes and starts collecting any further data, this page will be updated first, explaining what is
        collected and why. Latest change (12 October 2026): the “Advertising” section is added because of the rewarded
        ads in the Android version.
      </p>
```

- [x] **Step 3: Comprobar**

Run: `npx vitest run tests/unit/legal.test.ts`
Expected: PASS.

Abrir las dos páginas en el navegador (`npm run dev` y `http://localhost:5173/privacidad.html`, `.../privacidad-en.html`) y comprobar que se leen bien y que no ha quedado ninguna frase que diga que el juego «no tiene anuncios» / «has no ads».

- [x] **Step 4: Commit**

```bash
git add game/public/privacidad.html game/public/privacidad-en.html
git commit -m "docs: la página de privacidad explica la publicidad de Android"
```

---

### Task 12: Versión, documentación y tanda completa

**Files:**
- Modify: `game/package.json`, `game/package-lock.json`, `game/android/app/build.gradle`, `README.md`, `game/README.md`, `docs/superpowers/specs/2026-10-12-publicidad-design.md`, `docs/superpowers/specs/2026-09-27-motor-phaser-v3-design.md`, `docs/privado/play-store.md`, este plan (casillas marcadas)

- [x] **Step 1: Versión**

`game/package.json`: `"version": "2.6.0"`. Lanzar `npm install --package-lock-only` para que `package-lock.json` la recoja.

`game/android/app/build.gradle`:

```groovy
        versionCode 7
        versionName "2.6.0"
```

- [x] **Step 2: `README.md` (raíz)**

- Línea 11, «Pensado para niños de 6 a 9 años: sin textos largos, sin perder y sin anuncios.» pasa a: «Pensado para niños de 6 a 9 años: sin textos largos y sin perder. En Android hay algún anuncio con premio, pocos y siempre rechazables; la web no tiene anuncios.»
- La línea de «Google Play (Families Policy)» pasa a: «**Google Play (Families Policy):** en Android, solo anuncios con premio de Google AdMob (red certificada para Familias), marcados como dirigidos a niños, sin personalizar, sin permiso `AD_ID` y sin formulario de consentimiento; como mucho uno cada 15 minutos de juego y cuatro al día. Sin enlaces externos. Estadísticas anónimas hacia un Matomo propio (sin cookies ni identificadores; se apagan en Ajustes)».
- En la tabla «Documentación de desarrollo», después de la fila de la analítica detallada:

```markdown
| [Spec](docs/superpowers/specs/2026-10-12-publicidad-design.md) y [plan publicidad](docs/superpowers/plans/2026-10-12-publicidad.md) | Publicidad con premio para niños (2.6.0, solo Android): panel que no depende de leer, ritmo, premio que crece con el zoo, AdMob en modo infantil y estadísticas de anuncios |
```

- En «Hoja de ruta», después del párrafo de la 2.5.1:

```markdown
🚧 **2.6.0** (en la rama `feat/publicidad`, sin publicar): publicidad con premio en Android. Un panel con monedas, un botón verde y una X ofrece ver un anuncio al entrar en la tienda (a partir de 5 minutos de juego) y, una vez por partida, al volver al mapa (a partir de 15 minutos, con cuenta atrás). Como mucho un panel cada 15 minutos de juego y 4 anuncios al día; el premio crece con el zoo. Probado con un proveedor falso; faltan los pasos de David en AdMob y Play Console y la prueba en el móvil con anuncios de prueba.
```

- En «Pendiente, por orden», añadir al principio: «pasos de David para la 2.6.0 (cuenta de AdMob, identificadores, Play Console y prueba en el móvil con anuncios de prueba);».

- [x] **Step 3: `game/README.md`**

- En «Comandos», añadir: «`npm run check:manifest` — comprueba el manifiesto fusionado de Android (sin identificador de publicidad, con el identificador de AdMob). Con `-- --publicar` exige el identificador real. Hay que compilar antes con Gradle.»
- En «Estructura»: en `src/core/` añadir «`adPacing` (ritmo de la publicidad), `adConfig` (configuración de AdMob)»; en `src/systems/` añadir «`ads` (publicidad con premio: cuándo se pide y se ofrece un anuncio), `adProvider` (avisos del SDK), `adsInstall` (único archivo que toca el complemento de AdMob; solo instala en Android)»; en `src/scenes/` añadir «AdOffer (panel que ofrece un anuncio)».
- Apartado nuevo antes de «Versión»:

```markdown
## Publicidad (solo Android)

Anuncios con premio de AdMob, en modo infantil. Sin configuración no hay publicidad: el juego es el de siempre.

- `game/.env.production.local` (no se sube): `VITE_ADMOB_REWARDED` y `VITE_ADMOB_REWARDED_INTERSTITIAL`, los dos bloques de anuncios. Con `VITE_ADMOB_TESTING=1` la compilación pide los anuncios de prueba de Google.
- `game/android/admob.properties` (no se sube), con una línea `appId=ca-app-pub-...~...`, o la variable `ZOO_ADMOB_APP_ID`. Sin ninguno, el paquete lleva el identificador de pruebas de Google y `npm run check:manifest -- --publicar` falla.
- **Nunca tocar anuncios reales en el propio móvil:** AdMob lo cuenta como tráfico no válido. Para probar, `VITE_ADMOB_TESTING=1`.
- En el navegador se prueba con un proveedor falso: `window.__ZOO__.adsFake('visto')` y `window.__ZOO__.adsAdvance(300)`.
```

- «Versión»: «**2.6.0**»; el `versionCode` **7** es la 2.6.0; la siguiente será el 8.

- [x] **Step 4: Las specs**

En `docs/superpowers/specs/2026-10-12-publicidad-design.md`:

- La línea de estado pasa a: «Fecha: 2026-10-12 · Estado: implementada en la rama `feat/publicidad` (2.6.0); faltan los pasos manuales de David y la prueba en Android.»
- Al final, dos apartados nuevos:

```markdown
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
```

En `docs/superpowers/specs/2026-09-27-motor-phaser-v3-design.md`, en su apartado de estado actual, añadir: «2.6.0 (rama `feat/publicidad`): publicidad con premio en Android. Ver `2026-10-12-publicidad-design.md` y su plan. Cambia la política de Play: la app pasa a declarar anuncios.»

- [x] **Step 5: `docs/privado/play-store.md`**

- En «1. Subir la versión», añadir al historial: «→ 5 (2.3.0) → 6 (2.5.1) → **7** (2.6.0, primera con anuncios)».
- En «2. Comprobaciones previas», añadir: «Para la 2.6.0 en adelante hacen falta `game/.env.production.local` con los dos bloques de AdMob y `game/android/admob.properties` con `appId=`. Ninguno de los dos se sube.»
- En «3. Compilar el AAB firmado», después del bloque de compilación:

````markdown
Después de compilar, comprobar el paquete (no saltarse: es lo que mira Google con una app para niños):

```powershell
cd C:\Projects\games\zooesponji\game
npm run check:manifest -- --publicar
```

Tiene que decir `check-manifest: correcto`. Si dice que lleva el identificador de pruebas, falta `android/admob.properties`.
````

- Apartado nuevo al final, «9. Publicidad (desde la 2.6.0)», con los «Pasos manuales de David» de este plan copiados tal cual.

- [ ] **Step 6: Pedir a David la tanda completa**

Avisar a David de que toca pasar las pruebas en una ventana aparte, con estos comandos:

```powershell
cd C:\Projects\games\zooesponji\game
npm run typecheck
```

```powershell
npm test
```

```powershell
npm run test:e2e
```

```powershell
cd C:\Projects\games\zooesponji
node --test tools/matomo/lib.test.mjs
```

Expected: todo en verde. Las unitarias suben en unas 150 pruebas respecto a la 2.5.1 y las de juego en 12 (`ads.spec.ts`).

- [x] **Step 7: Marcar las casillas de este plan y commit**

```bash
git add game/package.json game/package-lock.json game/android/app/build.gradle README.md game/README.md docs/superpowers/specs/2026-10-12-publicidad-design.md docs/superpowers/specs/2026-09-27-motor-phaser-v3-design.md docs/privado/play-store.md docs/superpowers/plans/2026-10-12-publicidad.md
git commit -m "docs: versión 2.6.0 y documentación de la publicidad"
```

---

## Pasos manuales de David

Ninguno bloquea las tareas 1 a 12: el código se prueba con un proveedor falso y con los anuncios de prueba de Google. Hacen falta para publicar.

**Regla de oro: no tocar nunca un anuncio real en tu propio móvil.** AdMob lo cuenta como tráfico no válido y puede cerrar la cuenta. Las pruebas se hacen siempre con anuncios de prueba.

### A. AdMob (admob.google.com)

1. Crear la cuenta de AdMob con la cuenta de Google del juego.
2. Añadir la app: plataforma Android. Mientras no esté pública en Play, decir que «no está en una tienda»; se enlaza cuando salga a producción.
3. Apuntar el **identificador de la app** (tiene esta forma: `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`, con `~`).
4. Crear dos bloques de anuncios y apuntar el identificador de cada uno (forma `ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX`, con `/`):
   - Uno de tipo **Bonificado** (Rewarded). Es el de la tienda.
   - Uno de tipo **Intersticial bonificado** (Rewarded interstitial). Es el de la pausa.
   - El premio que pida configurar da igual: el juego usa el suyo.
5. En la configuración de la app, fijar la **clasificación máxima del contenido de los anuncios en «G»** y marcar la app como dirigida a niños.
6. Revisar los **controles de bloqueo**: bloquear las categorías que no quieras que vea un niño.
7. En «Dispositivos de prueba», **registrar tu móvil**.
8. Publicar el archivo `app-ads.txt` en `davidpladel.com/app-ads.txt` con la línea que te da AdMob.

### B. Pasar los identificadores (no se suben al repositorio)

Crear el archivo `C:\Projects\games\zooesponji\game\.env.production.local` (si ya existe por Matomo, añadir las líneas):

```
VITE_ADMOB_REWARDED=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
VITE_ADMOB_REWARDED_INTERSTITIAL=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
```

Crear el archivo `C:\Projects\games\zooesponji\game\android\admob.properties`:

```
appId=ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX
```

### C. Probar en el móvil, con anuncios de prueba

Añadir a `.env.production.local` la línea `VITE_ADMOB_TESTING=1`, compilar e instalar como siempre, y comprobar:

- [ ] A los 5 minutos de juego, al entrar en la tienda sale el panel. El botón verde enseña un anuncio que pone «Test Ad».
- [ ] Al verlo entero llegan las monedas y el aviso. Al cerrarlo antes, no llegan.
- [ ] La X cierra el panel sin anuncio. El botón atrás del móvil hace lo mismo.
- [ ] La música para durante el anuncio y vuelve después.
- [ ] Tras un panel, no sale otro hasta 15 minutos de juego después.
- [ ] A los 15 minutos de una partida sin anuncios, al cerrar la pantalla de dar de comer sale el panel con cuenta atrás, y a los 5 segundos empieza el anuncio solo. La X se lo salta.
- [ ] Sin conexión (modo avión) no sale ningún panel y el juego va igual.
- [ ] Tocar el anuncio abre el navegador; al volver, el juego sigue donde estaba.
- [ ] El anuncio a pantalla completa se puede cerrar a los 5 segundos.

**Antes de compilar la versión para Play, quitar la línea `VITE_ADMOB_TESTING=1`.**

### D. Play Console

1. «Contenido de la app» → **Anuncios: sí, la app contiene anuncios.**
2. **Seguridad de los datos**, rehacerla con lo que recoge el SDK de anuncios: ubicación aproximada, interacciones con la app, datos de diagnóstico e identificadores del dispositivo o de otro tipo; finalidad: publicidad, análisis y prevención del fraude. El identificador de publicidad sigue en **«No»**.
3. «Público objetivo y contenido»: sigue solo para niños. Revisar que el cuestionario de anuncios diga que se usa una red certificada para Familias (Google AdMob).
4. Subir el AAB de la 2.6.0 a la prueba cerrada.

### E. Textos

1. Leer `game/public/privacidad.html` y `privacidad-en.html` y dar el visto bueno (o pedir cambios).
2. Poner el mismo texto en la página pública de privacidad de davidpladel.com.
3. Revisar la ficha de Play: si dice «sin anuncios», quitarlo.

### F. Después de publicar

- Enlazar la app en AdMob con su ficha de Play cuando esté en producción; AdMob la revisa en un par de días y hasta entonces sirve pocos anuncios reales.
- Mirar `anuncio-vacio` en el resumen de Matomo: dice si faltan anuncios. Si el intersticial bonificado no tiene, decidir si `pausa` pasa al formato bonificado (ver «Riesgos» en la spec).
