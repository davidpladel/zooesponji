# Idiomas: español e inglés — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El juego sale en español o en inglés según el idioma del móvil, y en Ajustes hay un botón de madera para cambiarlo, que se queda guardado.

**Architecture:** Un módulo pequeño (`systems/language.ts`) lleva el idioma activo y lo detecta desde `navigator.languages`. Los textos se separan en `data/strings/es.ts` y `data/strings/en.ts` (este tipado como `Record<StringKey, string>`), y `t()` lee el idioma activo. El guardado gana un campo opcional `settings.language`. Al cambiar de idioma en Ajustes se guarda, se cierran las ventanas abiertas debajo y se vuelve a montar el mundo, sin recargar la página.

**Tech Stack:** TypeScript, Phaser 4.2.1, Capacitor 8 (Android), Vitest, Playwright. Todo dentro de `game/`.

**Spec:** `docs/superpowers/specs/2026-10-06-idiomas-es-en-design.md`.

**Estado:** los tres bloques están implementados (unitarios, typecheck y build en verde; el e2e final pasó: 28 en verde y la de capturas omitida). David lo probó en el móvil; sale como 2.4.0, fusionada en `main`. (Se actualiza al cerrar cada bloque: A = tareas 1-4, B = tareas 5-10, C = tareas 11-13.)

## Global Constraints

- La app es 100 % Android (Capacitor). La web es residual: no se pule nada específico de web (título de pestaña, SEO…).
- Cualquier variante de español (`es`, `es-ES`, `es-MX`, `ES`…) da español; cualquier otro idioma, o ninguno, da inglés.
- **No se traducen:** los nombres propios (Bills, Sasha, Mary, Nube, Pingu, Kiko…) ni «Zoo Esponji». **Sí se traducen:** especies, zonas, recintos y comidas («Bills, el león» → «Bills, the lion»).
- Tono del inglés: cálido y cuqui, para niños de 6 a 9 años, con onomatopeyas y juegos de palabras adaptados, no literales. Frases cortas. Ortografía británica (el botón lleva 🇬🇧): `favourite`, `Centre`, `grey`.
- Textos de página del libro: 20 palabras como mucho, también en inglés.
- Los marcadores `{n}`, `{name}`, `{total}`, `{max}`, `{cost}` se conservan idénticos en los dos idiomas.
- No sube `SAVE_VERSION` (sigue en 2): `settings.language` es opcional y ausente significa automático.
- Ningún texto visible fuera de `src/data/strings/`; el guardado solo guarda ids y el código de idioma.
- `core/` no importa Phaser. `core/save.ts` solo importa el **tipo** `Language`.
- Los imports actuales de `'../data/strings'` siguen funcionando sin tocarlos.
- El nombre de la app en Android (`strings.xml`) sigue siendo «Zoo Esponji». La ficha de Play Store queda fuera (hito 6b).
- Comandos, siempre desde `game/`: `npm test`, `npm run typecheck`, `npm run test:e2e`.
- En Node (Vitest) existe `navigator.language` y suele ser `en-US`: un test que compare textos debe llamar antes a `setLanguage(...)`.

## Inventario: texto creado una sola vez

Hecho antes de planificar, para decidir qué se reinicia al cambiar de idioma. Ajustes se abre desde la rueda ⚙️ de `HudScene`, que se dibuja encima de todo, así que debajo puede haber mundo, tienda, libro o ventana de comer.

| Dónde | Texto que se crea al montar | ¿Puede estar debajo de Ajustes? | Qué se hace al cambiar de idioma |
|---|---|---|---|
| `world/Decor.ts` | Carteles de zona (`zone.*`) y de recinto (`pen.*`); «Zoo Esponji» en el portón | Sí (mundo en pausa) | Se vuelve a montar `World` |
| `world/Pens.ts:126` | Rótulo del recinto (`def.nameKey`), solo sin arte | Sí | Se vuelve a montar `World` |
| `world/ShopBuilding.ts:29` | Rótulo `shop.label` | Sí | Se vuelve a montar `World` |
| `scenes/HudScene.ts` | Ninguno traducible: monedas (`🪙 n`) y ⚙️. Los avisos llaman a `t()` en el momento | Sí | **No se reinicia** |
| `scenes/ShopScene.ts` + `world/ShopInterior.ts` | `shop.title`, AGOTADO, «Tienes n de max», bocadillo de compra, lo que dice el tendero | Sí (activa, con el mundo en pausa) | Se cierra (`stop`) |
| `scenes/BookScene.ts` | Título y texto de la página, índice | Sí (activa, con la tienda en pausa) | Se cierra (`stop`) |
| `scenes/FeedScene.ts:73` | Nombre del animal (`book.page.<id>.title`) | Sí (activa, con el mundo en pausa) | Se cierra (`stop`) |
| `scenes/SettingsScene.ts` | Todo el menú | Es la propia escena | Se reinicia (`restart`) |
| `scenes/TitleScene.ts` | Título, Jugar, créditos | No: el HUD no existe hasta pulsar Jugar | Nada |
| `scenes/QuitScene.ts` | `quit.ask` | No: se abre al cerrar Ajustes | Nada |
| `scenes/RotateScene.ts` | Solo emojis | — | Nada |
| `systems/legal.ts`, `systems/errors.ts` | HTML que llama a `t()` al abrirse | No (la privacidad tapa el botón) | Nada |

**Decisión:** al pulsar el botón de idioma se guarda, se paran `Book`, `Shop` y `Feed` si están abiertas, `World` se monta de nuevo y se deja en pausa debajo del menú, y `Settings` se reinicia con `pausedWorld: true`. `HudScene` no se toca. La cuidadora vuelve a la entrada del zoo (su posición no es parte de la partida guardada). La spec proponía reiniciar también el HUD; el inventario demuestra que no hace falta.

Las operaciones de escena de Phaser se encolan y se aplican en orden en el siguiente paso del juego (`ScenePlugin` usa `manager.queueOp`), y `WorldScene` no tiene `preload`, así que `launch('World')` seguido de `pause('World')` deja el mundo creado y en pausa.

## Mapa de archivos

| Archivo | Cambio | Responsabilidad |
|---|---|---|
| `src/systems/language.ts` | Nuevo | Tipo `Language`, detección e idioma activo |
| `src/core/save.ts` | Modificar | `settings.language?` y tipo `ToggleKey` |
| `src/data/strings.ts` | Mover a `src/data/strings/es.ts` | Textos en español y `StringKey` |
| `src/data/strings/en.ts` | Nuevo | Textos en inglés, `Record<StringKey, string>` |
| `src/data/strings/index.ts` | Nuevo | `t`, `hasKey`, reexporta `STRINGS_ES`, `STRINGS_EN`, `StringKey` |
| `src/world/Decor.ts` | Modificar | Usa `hasKey` |
| `src/scenes/ShopScene.ts` | Modificar | Bocadillo de compra con `shop.buy` |
| `src/scenes/PreloadScene.ts` | Modificar | Resuelve el idioma al cargar la sesión |
| `src/scenes/SettingsScene.ts` | Modificar | Botón de idioma y reinicio de escenas |
| `src/scenes/TitleScene.ts` | Modificar | `playLabel()` para pruebas |
| `src/systems/legal.ts` | Modificar | Elige la página de privacidad por idioma |
| `src/systems/testHooks.ts` | Modificar | `language`, `titlePlayLabel`, `settingsLanguagePos`, `settingsLanguageLabel` |
| `public/privacidad-en.html` | Nuevo | Política de privacidad en inglés |
| `playwright.config.ts` | Modificar | `locale: 'es-ES'` |
| `tests/unit/language.test.ts` | Nuevo | Detección e idioma activo |
| `tests/unit/legal.test.ts` | Nuevo | Página por idioma y estructura de la página en inglés |
| `tests/unit/save.test.ts`, `session.test.ts`, `strings.test.ts`, `content.test.ts` | Modificar | Se adaptan, no se duplican |
| `tests/e2e/english.spec.ts` | Nuevo | Arranque en inglés, cambio a español, privacidad, capturas |

---

# Bloque A: cimientos

### Task 1: `language.ts` y detección

**Files:**
- Create: `game/src/systems/language.ts`
- Test: `game/tests/unit/language.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type Language = 'es' | 'en'`
  - `detectLanguage(languages: readonly string[] | undefined): Language`
  - `deviceLanguages(): readonly string[]`
  - `resolveLanguage(saved: Language | undefined, languages: readonly string[]): Language`
  - `getLanguage(): Language`, `setLanguage(lang: Language): void`
  - `otherLanguage(lang: Language): Language`

- [x] **Step 1: Write the failing test**

`game/tests/unit/language.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectLanguage, getLanguage, otherLanguage, resolveLanguage, setLanguage } from '../../src/systems/language';

describe('detectLanguage', () => {
  it.each([
    [['es'], 'es'],
    [['es-ES'], 'es'],
    [['es-MX', 'en-US'], 'es'],
    [['es-AR'], 'es'],
    [['ES'], 'es'],
    [['Es_419'], 'es'],
    [['en-US'], 'en'],
    [['en-US', 'es-ES'], 'en'], // solo cuenta el primero
    [['fr'], 'en'],
    [['eu-ES'], 'en'], // euskera: la región no cuenta
    [['est'], 'en'], // empieza por "es" pero no es español
    [[], 'en'],
  ] as const)('%j → %s', (languages, expected) => {
    expect(detectLanguage(languages)).toBe(expected);
  });

  it('sin lista devuelve inglés', () => {
    expect(detectLanguage(undefined)).toBe('en');
  });
});

describe('resolveLanguage', () => {
  it('el idioma guardado manda sobre el del móvil', () => {
    expect(resolveLanguage('en', ['es-ES'])).toBe('en');
    expect(resolveLanguage('es', ['en-US'])).toBe('es');
  });

  it('sin idioma guardado se detecta', () => {
    expect(resolveLanguage(undefined, ['es-MX'])).toBe('es');
    expect(resolveLanguage(undefined, ['de'])).toBe('en');
  });
});

describe('idioma activo', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('setLanguage cambia lo que devuelve getLanguage', () => {
    setLanguage('en');
    expect(getLanguage()).toBe('en');
    setLanguage('es');
    expect(getLanguage()).toBe('es');
  });

  it('setLanguage actualiza <html lang> si hay documento', () => {
    const documentElement = { lang: '' };
    vi.stubGlobal('document', { documentElement });
    setLanguage('en');
    expect(documentElement.lang).toBe('en');
  });

  it('otherLanguage alterna entre los dos', () => {
    expect(otherLanguage('es')).toBe('en');
    expect(otherLanguage('en')).toBe('es');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/language.test.ts`
Expected: FAIL, no encuentra `../../src/systems/language`.

- [x] **Step 3: Write minimal implementation**

`game/src/systems/language.ts`:

```ts
export type Language = 'es' | 'en';

/** Cualquier variante de español (es, es-ES, es-MX…) da español; todo lo demás, inglés. Solo cuenta el primer idioma. */
export function detectLanguage(languages: readonly string[] | undefined): Language {
  return /^es([-_]|$)/i.test(languages?.[0] ?? '') ? 'es' : 'en';
}

/** Idiomas del dispositivo. El WebView de Android refleja aquí el idioma del móvil. */
export function deviceLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  if (navigator.languages?.length) return navigator.languages;
  return navigator.language ? [navigator.language] : [];
}

/** El idioma elegido en Ajustes; si no hay ninguno, el del dispositivo. */
export function resolveLanguage(saved: Language | undefined, languages: readonly string[]): Language {
  return saved ?? detectLanguage(languages);
}

export function otherLanguage(lang: Language): Language {
  return lang === 'es' ? 'en' : 'es';
}

let current: Language = 'en';

export function getLanguage(): Language {
  return current;
}

export function setLanguage(lang: Language): void {
  current = lang;
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}

// Desde el primer momento: la pantalla de error puede salir antes de cargar la partida.
setLanguage(detectLanguage(deviceLanguages()));
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/language.test.ts` → PASS (18 tests).
Run: `npm run typecheck` → sin errores.

- [x] **Step 5: Commit**

```bash
git add src/systems/language.ts tests/unit/language.test.ts
git commit -m "feat: idioma activo y detección por el idioma del móvil"
```

---

### Task 2: `settings.language` en el guardado

**Files:**
- Modify: `game/src/core/save.ts:10-14` (interfaz `Settings`), `game/src/core/save.ts:106-115` (`parseSave`)
- Modify: `game/src/scenes/SettingsScene.ts` (tipos de los interruptores)
- Test: `game/tests/unit/save.test.ts`, `game/tests/unit/session.test.ts`

**Interfaces:**
- Consumes: `type Language` de `src/systems/language.ts`.
- Produces:
  - `Settings.language?: Language` (ausente = automático)
  - `type ToggleKey = 'music' | 'sfx' | 'joystick'` exportado desde `src/core/save.ts`
  - `Session.updateSettings({ language })` ya existe y lo guarda sin cambios.

- [x] **Step 1: Write the failing tests**

Al final de `game/tests/unit/save.test.ts` (añade `SAVE_VERSION` a la lista de imports de `'../../src/core/save'`):

```ts
describe('ajustes: idioma', () => {
  const withLanguage = (language: unknown) => ({ ...defaultSave(), settings: { ...defaultSave().settings, language } });

  it('sin idioma guardado queda en automático (el campo no existe)', () => {
    const parsed = parseSave(JSON.parse(JSON.stringify(defaultSave())))!;
    expect(parsed.settings.language).toBeUndefined();
    expect('language' in parsed.settings).toBe(false);
  });

  it.each(['es', 'en'] as const)('acepta %s', (language) => {
    expect(parseSave(withLanguage(language))?.settings.language).toBe(language);
  });

  it.each([['fr'], ['EN'], ['es-ES'], [3], [null], [true]])('ignora %j y queda en automático', (language) => {
    const parsed = parseSave(withLanguage(language))!;
    expect(parsed.settings.language).toBeUndefined();
    expect(parsed.settings.music).toBe(true);
  });

  it('ida y vuelta: lo que se escribe se vuelve a leer', async () => {
    const store = createMemoryStore();
    await writeSave(store, { ...defaultSave(), settings: { ...defaultSave().settings, language: 'en' } });
    expect((await loadSave(store)).settings.language).toBe('en');
  });

  it('no cambia la versión del guardado', () => {
    expect(SAVE_VERSION).toBe(2);
  });
});
```

En `game/tests/unit/session.test.ts`, dentro de `describe('Session: dar de comer, comprar y ajustes', …)`, al final:

```ts
  it('el idioma elegido se guarda y se recupera al volver a cargar', async () => {
    const { session, store } = await fresh();
    expect(session.settings.language).toBeUndefined();
    await session.updateSettings({ language: 'en' });
    expect(session.settings.language).toBe('en');
    const again = await Session.load(store, new EventBus<GameEvents>());
    expect(again.settings.language).toBe('en');
  });
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/save.test.ts tests/unit/session.test.ts`
Expected: FAIL en «acepta es», «acepta en», «ida y vuelta» y en el de la sesión (`language` llega `undefined` porque `parseSave` lo descarta).

- [x] **Step 3: Write minimal implementation**

En `game/src/core/save.ts`, añade el import de tipo y sustituye la interfaz:

```ts
import type { Language } from '../systems/language';
```

```ts
export interface Settings {
  music: boolean;
  sfx: boolean;
  joystick: boolean;
  /** Idioma elegido en Ajustes. Ausente = automático: el del móvil. */
  language?: Language;
}

/** Los ajustes que son un interruptor de sí o no. */
export type ToggleKey = 'music' | 'sfx' | 'joystick';
```

En `parseSave`, sustituye desde `const bool = …` hasta el `return`:

```ts
  const bool = (key: ToggleKey): boolean =>
    typeof rawSettings[key] === 'boolean' ? (rawSettings[key] as boolean) : defaults[key];
  // Cualquier otro valor se ignora: el idioma vuelve a ser automático.
  const language = rawSettings.language === 'es' || rawSettings.language === 'en' ? rawSettings.language : undefined;

  return {
    version: SAVE_VERSION,
    state: { coins, counts, shopUnlocked: state.shopUnlocked === true },
    settings: { music: bool('music'), sfx: bool('sfx'), joystick: bool('joystick'), ...(language ? { language } : {}) },
    book: parseBook(value.book),
  };
```

En `game/src/scenes/SettingsScene.ts`, los interruptores dejan de usar `keyof Settings` (que ahora incluye `language`). Cambia el import y todas las apariciones:

```ts
import type { ToggleKey } from '../core/save';
```

```ts
const TOGGLES: readonly { key: ToggleKey; icon: string; label: StringKey }[] = [
```

```ts
  private readonly toggles = new Map<ToggleKey, Phaser.GameObjects.Container>();
```

Y en las firmas `togglePos(key: ToggleKey)`, `flip(key: ToggleKey)` y `renderToggle(key: ToggleKey, …)`. No queda ningún `keyof Settings` en el archivo.

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/save.test.ts tests/unit/session.test.ts` → PASS.
Run: `npm run typecheck` → sin errores.
Run: `npm test` → todo en verde.

- [x] **Step 5: Commit**

```bash
git add src/core/save.ts src/scenes/SettingsScene.ts tests/unit/save.test.ts tests/unit/session.test.ts
git commit -m "feat: el guardado recuerda el idioma elegido (campo opcional)"
```

---

### Task 3: `strings.ts` pasa a `strings/es.ts` + `strings/index.ts`, con `hasKey`

Movimiento sin cambio de comportamiento: `t()` sigue dando español. El inglés se conecta en la Task 10.

**Files:**
- Move: `game/src/data/strings.ts` → `game/src/data/strings/es.ts`
- Create: `game/src/data/strings/index.ts`
- Modify: `game/src/world/Decor.ts:6`, `game/src/world/Decor.ts:29-32`
- Test: `game/tests/unit/strings.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces (todo desde `src/data/strings`, es decir `strings/index.ts`):
  - `STRINGS_ES`, `type StringKey` (reexportados de `./es`)
  - `hasKey(key: string): key is StringKey`
  - `t(key: StringKey, vars?: Record<string, string | number>): string`

- [x] **Step 1: Write the failing test**

En `game/tests/unit/strings.test.ts`, cambia el import y añade un bloque al final:

```ts
import { STRINGS_ES, hasKey } from '../../src/data/strings';
```

```ts
describe('hasKey', () => {
  it('reconoce las claves que existen', () => {
    expect(hasKey('zone.sabana')).toBe(true);
    expect(hasKey('title.name')).toBe(true);
  });

  it('rechaza las que no existen, también las heredadas de Object', () => {
    expect(hasKey('zone.luna')).toBe(false);
    expect(hasKey('toString')).toBe(false);
    expect(hasKey('')).toBe(false);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/strings.test.ts`
Expected: FAIL, `hasKey is not a function`.

- [x] **Step 3: Move the file and write the implementation**

```bash
mkdir -p src/data/strings
git mv src/data/strings.ts src/data/strings/es.ts
```

En `game/src/data/strings/es.ts`, borra la función `t` del final. El archivo termina así:

```ts
  'book.page.back.text': '¡Ayuda a hacer crecer el Zoo! Gracias por cuidar de todos, Mary.',
} as const;

export type StringKey = keyof typeof STRINGS_ES;
```

`game/src/data/strings/index.ts`:

```ts
import { STRINGS_ES, type StringKey } from './es';

export { STRINGS_ES };
export type { StringKey };

/** ¿Existe esta clave? Para las que se montan con datos del mapa (p. ej. `zone.<zona>`). */
export function hasKey(key: string): key is StringKey {
  return Object.hasOwn(STRINGS_ES, key);
}

export function t(key: StringKey, vars: Record<string, string | number> = {}): string {
  return STRINGS_ES[key].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
```

En `game/src/world/Decor.ts`:

```ts
import { hasKey, t } from '../data/strings';
```

```ts
  if (p.prop === 'sign-zone') {
    const key = `zone.${p.zone}`;
    return hasKey(key) ? t(key) : null;
  }
```

Los demás imports de `'../data/strings'` y `'./strings'` (`animals.ts`, `book.ts`, `foods.ts`, `pens.ts`, escenas, tests) resuelven solos a `strings/index.ts`: no se tocan.

- [x] **Step 4: Run tests to verify they pass**

Run: `npm run typecheck` → sin errores.
Run: `npm test` → todo en verde (incluido `hasKey`).

- [x] **Step 5: Commit**

```bash
git add -A src/data src/world/Decor.ts tests/unit/strings.test.ts
git commit -m "refactor: los textos pasan a strings/es.ts y Decor usa hasKey"
```

---

### Task 4: clave `shop.buy` (y cierre del bloque A)

**Files:**
- Modify: `game/src/data/strings/es.ts` (tras `'shop.needCoins'`)
- Modify: `game/src/scenes/ShopScene.ts:482`
- Test: `game/tests/unit/content.test.ts`
- Docs: `game/README.md`, `docs/superpowers/specs/2026-10-06-idiomas-es-en-design.md`, este plan

**Interfaces:**
- Consumes: `t` de `src/data/strings`.
- Produces: clave `'shop.buy'` con el marcador `{cost}`.

- [x] **Step 1: Write the failing test**

En `game/tests/unit/content.test.ts`, dentro de `describe('textos con variables', …)`:

```ts
  it('el bocadillo de compra lleva el precio', () => {
    expect(t('shop.buy', { cost: 50 })).toBe('¡Comprar! 🪙 50');
  });
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/content.test.ts`
Expected: FAIL (`Cannot read properties of undefined (reading 'replace')`; `npm run typecheck` también falla porque la clave no existe).

- [x] **Step 3: Write minimal implementation**

En `game/src/data/strings/es.ts`, después de `'shop.needCoins'`:

```ts
  'shop.buy': '¡Comprar! 🪙 {cost}',
```

En `game/src/scenes/ShopScene.ts`, en `showBuyBubble`:

```ts
    const text = this.add
      .text(0, 0, t('shop.buy', { cost: entry.cost }), {
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npm run typecheck` → sin errores.
Run: `npm test` → todo en verde.
Run: `npm run test:e2e` → todo en verde (la compra en la tienda sigue funcionando).

- [x] **Step 5: Docs del bloque A**

- `game/README.md`, sección «Estructura», línea de `src/data/`: sustituye «y textos (`strings.ts`: todo texto visible pasa por `t()`, preparado para multi-idioma)» por «y textos (`strings/`: una clave por texto en `es.ts`; todo texto visible pasa por `t()`, de `strings/index.ts`)».
- `game/README.md`, sección «Estructura», línea de `src/systems/`: añade «`language` (idioma activo y detección por el idioma del móvil)».
- `game/README.md`, «Añadir un animal», paso 1: «(clave de `src/data/strings.ts`)» → «(clave de `src/data/strings/es.ts`)».
- Spec, primera línea de estado: «Estado: en curso. Bloque A hecho (idioma activo, guardado, `strings/es.ts`, `shop.buy`).»
- Este plan: marca las casillas de las tareas 1-4 y cambia **Estado** a «bloque A hecho».

- [x] **Step 6: Commit**

```bash
git add src/data/strings/es.ts src/scenes/ShopScene.ts tests/unit/content.test.ts README.md ../docs/superpowers
git commit -m "feat: el bocadillo de compra sale de strings (shop.buy); docs del bloque A"
```

---

# Bloque B: inglés

`en.ts` se llena por bloques. Mientras tanto se declara con `satisfies Partial<Record<StringKey, string>>` (compila a medio hacer y avisa de claves que no existen). En la Task 10 pasa a `Record<StringKey, string>` y, desde entonces, falta una clave = no compila.

### Task 5: `en.ts`, bloque 1: textos cortos

Menús, especies, zonas, recintos, comidas, tienda, avisos y rótulos del libro. Todo menos `shop.about.*` y `book.page.*`.

**Files:**
- Create: `game/src/data/strings/en.ts`
- Test: `game/tests/unit/strings.test.ts`

**Interfaces:**
- Consumes: `type StringKey` de `./es`.
- Produces: `STRINGS_EN` (exportado desde `src/data/strings/en.ts`; `index.ts` aún no lo usa).

- [x] **Step 1: Write the failing test**

En `game/tests/unit/strings.test.ts`, añade el import y, al final, el bloque:

```ts
import { STRINGS_EN } from '../../src/data/strings/en';
```

```ts
const ES: Record<string, string> = STRINGS_ES;
const EN: Record<string, string> = STRINGS_EN;
const markers = (text: string): string[] => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();
/** De las claves que se piden, las que aún no están en inglés. */
const missing = (keys: string[]): string[] => keys.filter((key) => !(key in EN));

describe('inglés', () => {
  it.each(Object.keys(EN))('%s: existe en español, no está vacío y conserva los marcadores', (key) => {
    expect(ES[key], key).toBeDefined();
    expect(EN[key]!.trim()).not.toBe('');
    expect(markers(EN[key]!)).toEqual(markers(ES[key]!));
  });

  it('«Zoo Esponji» no se traduce', () => {
    expect(EN['title.name']).toBe('Zoo Esponji');
  });

  it('bloque 1: están todos los textos cortos', () => {
    expect(missing(Object.keys(ES).filter((key) => !/^(shop\.about|book\.page)\./.test(key)))).toEqual([]);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/strings.test.ts`
Expected: FAIL, no encuentra `../../src/data/strings/en`.

- [x] **Step 3: Write the translation**

`game/src/data/strings/en.ts`:

```ts
import type { StringKey } from './es';

/**
 * Textos en inglés, para niños de 6 a 9 años: cálidos y cortos.
 * Los nombres propios (Bills, Sasha, Mary, Nube…) y «Zoo Esponji» no se traducen.
 */
export const STRINGS_EN = {
  'title.name': 'Zoo Esponji',
  'title.play': 'Play',
  'title.credits': 'Made by Daniela and Adrián 💛',
  'settings.title': 'Settings',
  'quit.ask': 'Quit?',
  'settings.privacy': 'Privacy',
  'settings.quit': 'Quit',
  'legal.close': 'Close',
  'legal.error': 'The page could not be opened. Please try again.',
  'error.title': 'Oops! 🐾',
  'error.retry': 'Start again',
  'settings.music': 'Music',
  'settings.sfx': 'Sounds',
  'settings.joystick': 'Joystick',
  'credits.madeBy': 'Made with love by Daniela and Adrián 💛',
  'credits.copyright': '© 2026 davidpladel · All rights reserved',
  'credits.art': 'Panda and panther painted by Daniela and Adrián',
  'animal.leon': 'Lion',
  'animal.cabra': 'Goat',
  'animal.pantera': 'Black panther',
  'animal.panda': 'Giant panda',
  'animal.jirafa': 'Giraffe',
  'animal.cebra': 'Zebra',
  'animal.gacela': 'Gazelle',
  'animal.pinguino': 'Penguin',
  'animal.oveja': 'Sheep',
  'animal.caballo': 'Horse',
  'animal.gallina': 'Hen',
  'animal.gallo': 'Rooster',
  'animal.pato': 'Duck',
  'animal.elefante-africano': 'African elephant',
  'animal.elefante-asiatico': 'Asian elephant',
  'zone.sabana': 'Savanna',
  'zone.polo': 'The Pole',
  'zone.granja': 'Farm',
  'pen.estanque': 'Pond',
  'pen.ovejas': 'Sheep',
  'pen.establo': 'Stable',
  'pen.pinguinos': 'Penguins',
  'pen.sabana': 'Savanna',
  'pen.elefantes-africanos': 'African elephants',
  'pen.elefantes-asiaticos': 'Asian elephants',
  'food.piedra': 'Stone',
  'food.carne': 'Meat',
  'food.conejo': 'Rabbit',
  'food.zanahoria': 'Carrot',
  'food.lechuga': 'Lettuce',
  'food.maiz': 'Corn',
  'food.manzana': 'Apple',
  'food.platano': 'Banana',
  'food.pan': 'Bread',
  'food.huevo': 'Egg',
  'food.pescado': 'Fish',
  'food.calcetin': 'Sock',
  'food.gallina': 'Hen',
  'feed.yum': 'Yum!',
  'feed.yuck': 'Yuck!',
  'feed.wow': 'Wow!',
  'shop.title': 'Zoo shop',
  'shop.label': 'Shop',
  'shop.owned': 'It is already yours!',
  'shop.full': 'No room for more!',
  'shop.soldOut': 'SOLD OUT',
  'shop.have': 'You have {n} of {max}',
  'shop.hello': 'Hello! Which animal would you like today?',
  'shop.thanks': 'Thank you! Take good care of it!',
  'shop.needCoins': 'You need more coins!',
  'shop.buy': 'Buy! 🪙 {cost}',
  'shop.extra.cabra': 'Another goat',
  'shop.extra.pantera': 'Another panther',
  'shop.extra.panda': 'Another panda',
  'shop.extra.jirafa': 'Another giraffe',
  'shop.extra.cebra': 'Another zebra',
  'shop.extra.gacela': 'Another gazelle',
  'shop.extra.pinguino': 'Another penguin',
  'shop.extra.oveja': 'Another sheep',
  'shop.extra.caballo': 'Another horse',
  'shop.extra.gallina': 'Another hen',
  'shop.extra.gallo': 'Another rooster',
  'shop.extra.pato': 'Another duck',
  'shop.extra.elefante-africano': 'Another African elephant',
  'shop.extra.elefante-asiatico': 'Another Asian elephant',
  'toast.shopOpen': 'The shop is open!',
  'toast.shopLocked': 'The shop opens with {n} coins',
  'toast.needShop': 'Buy it at the shop 🏪',
  'toast.newAnimal': 'New animal: {name}!',
  'shop.bookHint': 'Psst! There is a secret book on the shelf…',
  'book.newPage': '📖 New page in the book!',
  'book.count': '{n} of {total}',
  'book.locked': '???',
  'book.lockedHint': 'Buy it at the shop to find out',
  'book.index.title': 'Contents',
  'book.chapter.inicio': 'The zoo',
  'book.chapter.centro': 'Centre',
  'book.chapter.montana': 'Mountain',
  'book.chapter.granja': 'Farm',
  'book.chapter.polo': 'The Pole',
  'book.chapter.sabana': 'Savanna',
  'book.chapter.count': 'You have {n} of {total}',
} satisfies Partial<Record<StringKey, string>>;
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/strings.test.ts` → PASS.
Run: `npm run typecheck` → sin errores.

- [x] **Step 5: Commit**

```bash
git add src/data/strings/en.ts tests/unit/strings.test.ts
git commit -m "feat: inglés, bloque 1: menús, especies, zonas, recintos, comidas y tienda"
```

---

### Task 6: `en.ts`, bloque 2: frases del tendero (`shop.about.*`)

**Files:**
- Modify: `game/src/data/strings/en.ts` (antes del cierre `} satisfies …`)
- Test: `game/tests/unit/strings.test.ts`

**Interfaces:**
- Consumes: `STRINGS_EN`, `missing` y `ES` del test de la Task 5.
- Produces: las 15 claves `shop.about.<especie>` en `STRINGS_EN`.

- [x] **Step 1: Write the failing test**

Dentro de `describe('inglés', …)`:

```ts
  it('bloque 2: el tendero dice algo de cada especie', () => {
    const about = Object.keys(ES).filter((key) => key.startsWith('shop.about.'));
    expect(about).toHaveLength(15);
    expect(missing(about)).toEqual([]);
  });
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/strings.test.ts -t "bloque 2"`
Expected: FAIL, faltan las 15 claves.

- [x] **Step 3: Write the translation**

En `game/src/data/strings/en.ts`, al final del objeto:

```ts
  'shop.about.leon': 'The lion is the king of the zoo!',
  'shop.about.cabra': 'Goats eat everything… even stones!',
  'shop.about.pantera': 'The panther is super speedy!',
  'shop.about.panda': 'Pandas just love bamboo!',
  'shop.about.jirafa': 'The giraffe can reach the very top leaves!',
  'shop.about.cebra': 'No two zebras have the same stripes!',
  'shop.about.gacela': 'The gazelle makes giant leaps!',
  'shop.about.pinguino': 'Penguins give each other little pebbles!',
  'shop.about.oveja': 'The sheep is as soft as a cloud!',
  'shop.about.caballo': 'Horses just love apples!',
  'shop.about.gallina': 'The hen lays an egg every day!',
  'shop.about.gallo': 'The rooster crows when the sun comes up!',
  'shop.about.pato': 'The duck swims without getting its feathers wet!',
  'shop.about.elefante-africano': 'The African elephant has enormous ears!',
  'shop.about.elefante-asiatico': 'The Asian elephant showers with its trunk!',
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/strings.test.ts` → PASS. `npm run typecheck` → sin errores.

- [x] **Step 5: Commit**

```bash
git add src/data/strings/en.ts tests/unit/strings.test.ts
git commit -m "feat: inglés, bloque 2: lo que cuenta el tendero de cada especie"
```

---

### Task 7: `en.ts`, libro A: el zoo, centro y montaña (15 páginas)

Portada, historia, Mary, leones, cabras, panteras, pandas y contraportada.

**Files:**
- Modify: `game/src/data/strings/en.ts`
- Test: `game/tests/unit/strings.test.ts`

**Interfaces:**
- Consumes: `EN`, `ES`, `missing`, `words` del test.
- Produces: 30 claves `book.page.<id>.title|text`; en el test, el ayudante `pageKeys(ids)` y dos comprobaciones generales (20 palabras, nombre propio) que valen para los bloques siguientes.

- [x] **Step 1: Write the failing tests**

Junto a `missing`, fuera del `describe`:

```ts
const pageKeys = (ids: string[]): string[] => ids.flatMap((id) => [`book.page.${id}.title`, `book.page.${id}.text`]);
/** El nombre propio de un título: lo que va antes de la coma («Bills, el león» → «Bills»). */
const properName = (title: string): string => title.split(',')[0]!;
```

Dentro de `describe('inglés', …)`:

```ts
  it('libro A: el zoo, centro y montaña', () => {
    const ids = ['cover', 'story', 'mary', 'bills', 'sasha', 'gordi', 'nube', 'galleta', 'tolon', 'chispa', 'noche', 'sombra', 'mochi', 'pompon', 'back'];
    expect(missing(pageKeys(ids))).toEqual([]);
  });

  it.each(Object.entries(EN).filter(([key]) => /^book\.page\..+\.text$/.test(key)))('%s tiene 20 palabras como mucho', (_key, text) => {
    expect(words(text)).toBeLessThanOrEqual(20);
  });

  it.each(Object.keys(EN).filter((key) => /^book\.page\..+\.title$/.test(key) && ES[key]!.includes(',')))(
    '%s conserva el nombre propio',
    (key) => {
      expect(properName(EN[key]!)).toBe(properName(ES[key]!));
    },
  );

  it('«Zoo Esponji» sigue igual dentro del libro', () => {
    expect(EN['book.page.cover.title']).toContain('Zoo Esponji');
    expect(EN['book.page.story.text']).toContain('Zoo Esponji');
  });
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/strings.test.ts -t "libro A"`
Expected: FAIL, faltan 30 claves.

- [x] **Step 3: Write the translation**

Al final del objeto de `game/src/data/strings/en.ts`:

```ts
  'book.page.cover.title': 'Discover Zoo Esponji',
  'book.page.cover.text': 'This book tells what happens at the zoo. Fill it with friends!',
  'book.page.story.title': 'The open cages',
  'book.page.story.text': 'Once upon a time, a sad zoo had locked cages. One day someone opened them… and Zoo Esponji was born!',
  'book.page.mary.title': 'Mary, the zookeeper',
  'book.page.mary.text': 'I am Mary. I feed the animals and find them a home. My favourite foods are spaghetti and chocolate!',
  'book.page.bills.title': 'Bills, the lion',
  'book.page.bills.text': 'Bills was the first to arrive. He roars very loudly… but he is scared of butterflies.',
  'book.page.sasha.title': 'Sasha, the lioness',
  'book.page.sasha.text': 'Sasha looks after Bills. When he gets scared, she gives him a big hug.',
  'book.page.gordi.title': 'Gordi, the goat',
  'book.page.gordi.text': 'Gordi gobbles up everything in sight. One day, even one of Mary’s socks!',
  'book.page.nube.title': 'Nube, the goat',
  'book.page.nube.text': 'Nube is white and fluffy, like a little cloud. She loves napping in the sun.',
  'book.page.galleta.title': 'Galleta, the goat',
  'book.page.galleta.text': 'Galleta jumps higher than anyone. Boing, boing!',
  'book.page.tolon.title': 'Tolón, the goat',
  'book.page.tolon.text': 'Tolón wears a little bell: ding-dong! So Mary always knows where to look.',
  'book.page.chispa.title': 'Chispa, the goat',
  'book.page.chispa.text': 'Chispa is the smallest of them all.',
  'book.page.noche.title': 'Noche, the panther',
  'book.page.noche.text': 'Noche is as black as the night. She runs so fast she seems to fly.',
  'book.page.sombra.title': 'Sombra, the panther',
  'book.page.sombra.text': 'Sombra plays hide-and-seek. Can you find her? She always wins!',
  'book.page.mochi.title': 'Mochi, the panda',
  'book.page.mochi.text': 'Mochi munches bamboo all day long. Yum, yum… and then another nap.',
  'book.page.pompon.title': 'Pompón, the panda',
  'book.page.pompon.text': 'Pompón does somersaults. Even the lion laughs!',
  'book.page.back.title': 'Zoo complete!',
  'book.page.back.text': 'Help the Zoo grow! Thank you for looking after everyone, Mary.',
```

Adaptaciones hechas a propósito (no «corregirlas» a literal): «Nube» se explica con *like a little cloud*; «Tolón» con *ding-dong*; «Noche» es *black as the night* en vez de *as coal*.

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/strings.test.ts` → PASS. `npm run typecheck` → sin errores.

- [x] **Step 5: Commit**

```bash
git add src/data/strings/en.ts tests/unit/strings.test.ts
git commit -m "feat: inglés, libro A: el zoo, centro y montaña"
```

---

### Task 8: `en.ts`, libro B: la granja (18 páginas)

Patos, ovejas y establo.

**Files:**
- Modify: `game/src/data/strings/en.ts`
- Test: `game/tests/unit/strings.test.ts`

**Interfaces:**
- Consumes: `missing`, `pageKeys` y las comprobaciones generales de la Task 7 (20 palabras, nombre propio), que se aplican solas a las páginas nuevas.
- Produces: 36 claves `book.page.<id>.title|text`.

- [x] **Step 1: Write the failing test**

Dentro de `describe('inglés', …)`:

```ts
  it('libro B: la granja', () => {
    const ids = ['cuac', 'charco', 'pluma', 'remo', 'pio', 'lana', 'bolita', 'trueno', 'algodon', 'rizos', 'canela', 'pepa', 'lucero', 'kiko', 'clo', 'tizon', 'miga', 'mancha'];
    expect(missing(pageKeys(ids))).toEqual([]);
  });
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/strings.test.ts -t "libro B"`
Expected: FAIL, faltan 36 claves.

- [x] **Step 3: Write the translation**

Al final del objeto de `game/src/data/strings/en.ts`:

```ts
  'book.page.cuac.title': 'Cuac, the duck',
  'book.page.cuac.text': 'Cuac is as white as milk. All day long he quacks his own name: cuac, cuac!',
  'book.page.charco.title': 'Charco, the duck',
  'book.page.charco.text': 'Charco has a shiny green head. He jumps in every puddle he sees. Splash!',
  'book.page.pluma.title': 'Pluma, the duck',
  'book.page.pluma.text': 'Pluma knows that bread is bad for ducks. She likes corn much better!',
  'book.page.remo.title': 'Remo, the duck',
  'book.page.remo.text': 'Remo swims faster than anyone. His feet paddle like two little oars!',
  'book.page.pio.title': 'Pío, the duckling',
  'book.page.pio.text': 'Pío is the smallest in the pond. He follows Cuac everywhere.',
  'book.page.lana.title': 'Lana, the sheep',
  'book.page.lana.text': 'Lana was the first sheep on the farm. Her best friend is a hen.',
  'book.page.bolita.title': 'Bolita, the sheep',
  'book.page.bolita.text': 'Bolita is round and toasty brown. When she runs, she looks like a ball of wool.',
  'book.page.trueno.title': 'Trueno, the black sheep',
  'book.page.trueno.text': 'Trueno is the black sheep. His name means thunder, but he gets scared very easily.',
  'book.page.algodon.title': 'Algodón, the sheep',
  'book.page.algodon.text': 'Algodón is as soft as cotton. Visitors never want to stop stroking him.',
  'book.page.rizos.title': 'Rizos, the sheep',
  'book.page.rizos.text': 'Rizos has grey wool full of curls. And never, ever combs it!',
  'book.page.canela.title': 'Canela, the horse',
  'book.page.canela.text': 'Canela is as brown as cinnamon. For an apple, she will follow you to the end of the world.',
  'book.page.pepa.title': 'Pepa, the hen',
  'book.page.pepa.text': 'Pepa lays an egg every morning. Then she clucks about it all over the stable.',
  'book.page.lucero.title': 'Lucero, the horse',
  'book.page.lucero.text': 'Lucero has a white patch on his forehead. It looks like a star.',
  'book.page.kiko.title': 'Kiko, the rooster',
  'book.page.kiko.text': 'Kiko crows when the sun comes up. And wakes up the whole zoo!',
  'book.page.clo.title': 'Clo, the hen',
  'book.page.clo.text': 'Clo has orange feathers. She looks for grains of corn in every corner.',
  'book.page.tizon.title': 'Tizón, the horse',
  'book.page.tizon.text': 'Tizón is as black as coal. At night you can only see his eyes.',
  'book.page.miga.title': 'Miga, the hen',
  'book.page.miga.text': 'Miga is white and fluffy. She goes crazy for a crumb of bread.',
  'book.page.mancha.title': 'Mancha, the horse',
  'book.page.mancha.text': 'Mancha has white legs. They look just like socks!',
```

Adaptaciones: «Cuac» *quacks his own name*; «Charco» gana un *Splash!*; «Trueno» se explica con *His name means thunder*; «Algodón» es *soft as cotton*; «Rizos» y «Mancha» van sin pronombre.

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/strings.test.ts` → PASS. `npm run typecheck` → sin errores.

- [x] **Step 5: Commit**

```bash
git add src/data/strings/en.ts tests/unit/strings.test.ts
git commit -m "feat: inglés, libro B: la granja"
```

---

### Task 9: `en.ts`, libro C: polo y sabana (17 páginas)

Pingüinos, jirafas, cebras, gacelas y elefantes.

**Files:**
- Modify: `game/src/data/strings/en.ts`
- Test: `game/tests/unit/strings.test.ts`

**Interfaces:**
- Consumes: `missing`, `pageKeys` y las comprobaciones generales de la Task 7.
- Produces: 34 claves `book.page.<id>.title|text`. Con ellas `STRINGS_EN` ya tiene todas las claves de `STRINGS_ES`.

- [x] **Step 1: Write the failing test**

Dentro de `describe('inglés', …)`:

```ts
  it('libro C: polo y sabana', () => {
    const ids = ['pingu', 'copito', 'frac', 'tobogan', 'hielo', 'lola', 'raya', 'brisa', 'pecas', 'zigzag', 'salto', 'miel', 'pipa', 'tembo', 'kali', 'raja', 'mali'];
    expect(missing(pageKeys(ids))).toEqual([]);
  });

  it('con el libro C ya no falta ninguna clave', () => {
    expect(missing(Object.keys(ES))).toEqual([]);
  });
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/strings.test.ts -t "libro C"`
Expected: FAIL, faltan 34 claves.

- [x] **Step 3: Write the translation**

Al final del objeto de `game/src/data/strings/en.ts`:

```ts
  'book.page.pingu.title': 'Pingu, the penguin',
  'book.page.pingu.text': 'Pingu waddles like a gentleman in a hurry. But in the water he is a rocket!',
  'book.page.copito.title': 'Copito, the penguin',
  'book.page.copito.text': 'Copito gives little pebbles to the ones he loves most. Will you give him one?',
  'book.page.frac.title': 'Frac, the penguin',
  'book.page.frac.text': 'Frac always looks so smart in his black-and-white suit. Is he off to a wedding?',
  'book.page.tobogan.title': 'Tobogán, the penguin',
  'book.page.tobogan.text': 'Tobogán slides down the snow on his tummy. Wheee!',
  'book.page.hielo.title': 'Hielo, the penguin',
  'book.page.hielo.text': 'Hielo is the smallest. His feathers are bluish, like a little ice cube.',
  'book.page.lola.title': 'Lola, the giraffe',
  'book.page.lola.text': 'Lola is so tall she can see the whole zoo. She tells everyone when food is coming.',
  'book.page.raya.title': 'Raya, the zebra',
  'book.page.raya.text': 'Raya has so many stripes that nobody has managed to count them. Will you try?',
  'book.page.brisa.title': 'Brisa, the gazelle',
  'book.page.brisa.text': 'Brisa runs so fast that you only feel a breeze as she goes by.',
  'book.page.pecas.title': 'Pecas, the giraffe',
  'book.page.pecas.text': 'Pecas has the darkest spots of all. And a super long tongue… that is blue!',
  'book.page.zigzag.title': 'Zigzag, the zebra',
  'book.page.zigzag.text': 'Zigzag never walks in a straight line. And those stripes are chocolate brown!',
  'book.page.salto.title': 'Salto, the gazelle',
  'book.page.salto.text': 'Salto does not walk: Salto bounces. Boing, boing, boing all over the savanna!',
  'book.page.miel.title': 'Miel, the gazelle',
  'book.page.miel.text': 'Miel is pale gold and as sweet as honey. Her favourite treat is corn.',
  'book.page.pipa.title': 'Pipa, the gazelle',
  'book.page.pipa.text': 'Pipa is the smallest of the gazelles. She hides behind Lola.',
  'book.page.tembo.title': 'Tembo, the African elephant',
  'book.page.tembo.text': 'Tembo has enormous ears. He fans himself with them when it gets hot.',
  'book.page.kali.title': 'Kali, the African elephant',
  'book.page.kali.text': 'Kali showers in dust from head to toe. No sunburn that way!',
  'book.page.raja.title': 'Raja, the Asian elephant',
  'book.page.raja.text': 'Raja showers with his trunk. And showers anyone who walks by!',
  'book.page.mali.title': 'Mali, the Asian elephant',
  'book.page.mali.text': 'Mali is brown and very clever. She peels bananas with her trunk.',
```

Adaptaciones: «Frac» es *his black-and-white suit*; «Brisa» deja *a breeze*; «Miel» es *sweet as honey*; «Tobogán» grita *Wheee!*.

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/strings.test.ts` → PASS. `npm run typecheck` → sin errores.

- [x] **Step 5: Commit**

```bash
git add src/data/strings/en.ts tests/unit/strings.test.ts
git commit -m "feat: inglés, libro C: polo y sabana"
```

---

### Task 10: conectar el inglés: `en.ts` tipado, `t()` por idioma y arranque (cierre del bloque B)

**Files:**
- Modify: `game/src/data/strings/en.ts` (declaración y cierre del objeto)
- Modify: `game/src/data/strings/index.ts`
- Modify: `game/src/scenes/PreloadScene.ts:62-65`
- Modify: `game/playwright.config.ts`
- Test: `game/tests/unit/strings.test.ts`, `game/tests/unit/content.test.ts`
- Docs: `game/README.md`, spec, este plan

**Interfaces:**
- Consumes: `getLanguage`, `setLanguage`, `resolveLanguage`, `deviceLanguages`, `type Language` (Task 1); `Settings.language` (Task 2); `STRINGS_EN` completo (Tasks 5-9).
- Produces:
  - `STRINGS_EN: Record<StringKey, string>` (falta una clave = no compila), reexportado desde `src/data/strings`
  - `t()` devuelve el texto del idioma activo
  - Al arrancar, el idioma activo es `settings.language` o, si no hay, el del móvil.

- [x] **Step 1: Write the failing tests**

En `game/tests/unit/content.test.ts`, cambia los imports y sustituye entero el `describe('textos con variables', …)`:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { setLanguage } from '../../src/systems/language';
```

```ts
describe('textos con variables', () => {
  afterEach(() => setLanguage('es'));

  it('en español', () => {
    setLanguage('es');
    expect(t('toast.shopLocked', { n: 20 })).toBe('La tienda abre con 20 monedas');
    expect(t('title.play')).toBe('Jugar');
    expect(t('shop.buy', { cost: 50 })).toBe('¡Comprar! 🪙 50');
    expect(t('book.page.bills.title')).toBe('Bills, el león');
  });

  it('en inglés', () => {
    setLanguage('en');
    expect(t('toast.shopLocked', { n: 20 })).toBe('The shop opens with 20 coins');
    expect(t('title.play')).toBe('Play');
    expect(t('shop.buy', { cost: 50 })).toBe('Buy! 🪙 50');
    expect(t('book.page.bills.title')).toBe('Bills, the lion');
  });

  it('el nombre del animal nuevo va traducido dentro del aviso', () => {
    setLanguage('en');
    expect(t('toast.newAnimal', { name: t('animal.pinguino') })).toBe('New animal: Penguin!');
  });

  it('una variable que no se pasa deja el marcador tal cual', () => {
    setLanguage('en');
    expect(t('shop.have', { n: 2 })).toBe('You have 2 of {max}');
  });
});
```

En `game/tests/unit/strings.test.ts`, importa `STRINGS_EN` desde el índice (`import { STRINGS_EN, STRINGS_ES, hasKey } from '../../src/data/strings';`, borrando el import de `strings/en`) y sustituye el `describe('inglés', …)` entero por la versión definitiva. Los ayudantes `ES`, `EN`, `markers` y `properName` se quedan; `missing` y `pageKeys` se borran:

```ts
describe('inglés', () => {
  it('tiene exactamente las mismas claves que el español', () => {
    expect(Object.keys(EN).sort()).toEqual(Object.keys(ES).sort());
  });

  it.each(Object.keys(ES))('%s: no está vacío y conserva los marcadores', (key) => {
    expect(EN[key]!.trim()).not.toBe('');
    expect(markers(EN[key]!)).toEqual(markers(ES[key]!));
  });

  it('«Zoo Esponji» no se traduce', () => {
    expect(EN['title.name']).toBe('Zoo Esponji');
    expect(EN['book.page.cover.title']).toContain('Zoo Esponji');
    expect(EN['book.page.story.text']).toContain('Zoo Esponji');
  });

  it.each(Object.entries(EN).filter(([key]) => /^book\.page\..+\.text$/.test(key)))('%s tiene 20 palabras como mucho', (_key, text) => {
    expect(words(text)).toBeLessThanOrEqual(20);
  });

  it.each(Object.keys(ES).filter((key) => /^book\.page\..+\.title$/.test(key) && ES[key]!.includes(',')))(
    '%s conserva el nombre propio',
    (key) => {
      expect(properName(EN[key]!)).toBe(properName(ES[key]!));
    },
  );
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/content.test.ts tests/unit/strings.test.ts`
Expected: FAIL. `strings.test.ts` no encuentra `STRINGS_EN` en el índice; en `content.test.ts`, «en inglés» recibe `'La tienda abre con 20 monedas'`.

- [x] **Step 3: Write the implementation**

En `game/src/data/strings/en.ts`, cambia la declaración y el cierre (el contenido del objeto no se toca):

```ts
export const STRINGS_EN: Record<StringKey, string> = {
```

```ts
  'book.page.mali.text': 'Mali is brown and very clever. She peels bananas with her trunk.',
};
```

`game/src/data/strings/index.ts` completo:

```ts
import { getLanguage, type Language } from '../../systems/language';
import { STRINGS_EN } from './en';
import { STRINGS_ES, type StringKey } from './es';

export { STRINGS_EN, STRINGS_ES };
export type { StringKey };

const STRINGS: Record<Language, Record<StringKey, string>> = { es: STRINGS_ES, en: STRINGS_EN };

/** ¿Existe esta clave? Para las que se montan con datos del mapa (p. ej. `zone.<zona>`). */
export function hasKey(key: string): key is StringKey {
  return Object.hasOwn(STRINGS_ES, key);
}

/** Texto en el idioma activo. Los marcadores `{nombre}` se sustituyen por `vars`. */
export function t(key: StringKey, vars: Record<string, string | number> = {}): string {
  return STRINGS[getLanguage()][key].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
```

En `game/src/scenes/PreloadScene.ts`:

```ts
import { deviceLanguages, resolveLanguage, setLanguage } from '../systems/language';
```

```ts
  private async startSession(): Promise<void> {
    const session = await Session.load(createStore());
    setSession(session);
    // El idioma elegido en Ajustes; si no hay ninguno, el del móvil.
    setLanguage(resolveLanguage(session.settings.language, deviceLanguages()));
    this.scene.start('Title');
  }
```

En `game/playwright.config.ts`, dentro de `use`, después de `viewport`: las pruebas de siempre comparan textos en español, y sin esto el navegador de Playwright es `en-US` y el juego saldría en inglés.

```ts
    viewport: { width: 1280, height: 720 },
    // Las pruebas de siempre leen textos en español; el inglés tiene su propio archivo (english.spec.ts).
    locale: 'es-ES',
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npm run typecheck` → sin errores. (Comprobación a mano de que falta-clave-no-compila: borra una línea de `en.ts`, `npm run typecheck` debe dar `Property '…' is missing in type`; deshaz el cambio.)
Run: `npm test` → todo en verde.
Run: `npm run test:e2e` → todo en verde, en español.

- [x] **Step 5: Docs del bloque B**

- `game/README.md`, «Estructura», línea de `src/data/`: «y textos (`strings/`: `es.ts` y `en.ts`, una clave por texto; `en.ts` no compila si le falta una; todo texto visible pasa por `t()`, que usa el idioma activo)».
- `game/README.md`, «Añadir un animal», paso 1: «(clave de `src/data/strings/es.ts`, con su traducción en `en.ts`)». Añade al final de la lista: «5. Textos en los dos idiomas: nombre de la especie, frase del tendero (`shop.about.*`), «otro…» (`shop.extra.*`) y título y texto de la página de cada residente (`book.page.<id>.*`). El nombre propio no se traduce.»
- Spec, estado: «Estado: en curso. Bloques A y B hechos (el juego ya sale en inglés con el móvil en inglés; falta el botón de Ajustes y la privacidad).»
- Este plan: marca las tareas 5-10 y cambia **Estado** a «bloques A y B hechos».

- [x] **Step 6: Commit**

```bash
git add src/data/strings src/scenes/PreloadScene.ts playwright.config.ts tests/unit README.md ../docs/superpowers
git commit -m "feat: el juego sale en inglés o español según el idioma del móvil"
```

---

# Bloque C: Ajustes, privacidad y repaso

### Task 11: botón de idioma en Ajustes

**Files:**
- Modify: `game/src/data/strings/es.ts`, `game/src/data/strings/en.ts` (clave `settings.language`, tras `settings.joystick`)
- Modify: `game/src/scenes/SettingsScene.ts`
- Modify: `game/src/scenes/TitleScene.ts`
- Modify: `game/src/systems/testHooks.ts`
- Test: `game/tests/unit/content.test.ts`, `game/tests/e2e/english.spec.ts` (nuevo)

**Interfaces:**
- Consumes: `getLanguage`, `setLanguage`, `otherLanguage`, `type Language` (Task 1); `ToggleKey`, `Settings.language`, `Session.updateSettings` (Task 2); `t` por idioma (Task 10).
- Produces:
  - Clave `'settings.language'`: el nombre de cada idioma en su propio idioma (`Español` / `English`)
  - `SettingsScene.languagePos(): Vec | null`, `SettingsScene.languageLabel(): string`
  - `TitleScene.playLabel(): string`
  - En `window.__ZOO__`: `language(): string`, `titlePlayLabel(): string | null`, `settingsLanguagePos(): Vec | null`, `settingsLanguageLabel(): string | null`; `settings()` pasa a devolver `Settings` (incluye `language`).

- [x] **Step 1: Write the failing tests**

En `game/tests/unit/content.test.ts`, dentro de `describe('textos con variables', …)`:

```ts
  it('cada idioma se llama a sí mismo en su idioma', () => {
    setLanguage('es');
    expect(t('settings.language')).toBe('Español');
    setLanguage('en');
    expect(t('settings.language')).toBe('English');
  });
```

`game/tests/e2e/english.spec.ts` (nuevo):

```ts
import { expect, test, type Page } from '@playwright/test';

// El resto de pruebas va en es-ES (playwright.config.ts); aquí el móvil está en inglés.
test.use({ locale: 'en-US' });

async function canvasBox(page: Page) {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('No hay canvas');
  return box;
}

async function waitForTitle(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
}

async function pressPlay(page: Page): Promise<void> {
  const box = await canvasBox(page);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.62);
  await page.waitForFunction(() => {
    const scenes = window.__ZOO__?.activeScenes() ?? [];
    return scenes.includes('World') && scenes.includes('Hud');
  });
}

async function tap(page: Page, pos: { x: number; y: number } | null): Promise<void> {
  if (!pos) throw new Error('Posición desconocida');
  const box = await canvasBox(page);
  await page.mouse.click(box.x + pos.x, box.y + pos.y);
}

async function openSettings(page: Page): Promise<void> {
  await page.evaluate(() => window.__ZOO__!.openSettings());
  await page.waitForFunction(() => window.__ZOO__!.settingsLanguagePos() !== null);
}

test('con el móvil en inglés el juego sale en inglés; Ajustes lo pasa a español y se queda guardado', async ({ page }) => {
  await page.goto('/');
  await waitForTitle(page);
  expect(await page.evaluate(() => window.__ZOO__!.language())).toBe('en');
  expect(await page.evaluate(() => window.__ZOO__!.titlePlayLabel())).toBe('Play');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  await pressPlay(page);
  await openSettings(page);
  expect(await page.evaluate(() => window.__ZOO__!.settingsLanguageLabel())).toBe('English');
  expect(await page.evaluate(() => window.__ZOO__!.settings().language)).toBeUndefined(); // automático

  await tap(page, await page.evaluate(() => window.__ZOO__!.settingsLanguagePos()));
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.language())).toBe('es');
  // El menú sigue abierto, ya en español, y el mundo se ha montado de nuevo en pausa debajo.
  await page.waitForFunction(() => {
    const scenes = window.__ZOO__!.activeScenes();
    return scenes.includes('Settings') && scenes.includes('Hud') && !scenes.includes('World');
  });
  expect(await page.evaluate(() => window.__ZOO__!.settingsLanguageLabel())).toBe('Español');
  expect(await page.evaluate(() => window.__ZOO__!.settings().language)).toBe('es');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');

  expect(await page.evaluate(() => window.__ZOO__!.back())).toBe('close-settings');
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('World'));
  expect(await page.evaluate(() => window.__ZOO__!.keeperPosition())).not.toBeNull();

  // El móvil sigue en inglés, pero manda lo elegido en Ajustes.
  await page.reload();
  await waitForTitle(page);
  expect(await page.evaluate(() => window.__ZOO__!.language())).toBe('es');
  expect(await page.evaluate(() => window.__ZOO__!.titlePlayLabel())).toBe('Jugar');
});

test('cambiar de idioma con la tienda abierta la cierra y no se pierden las monedas', async ({ page }) => {
  await page.goto('/');
  await waitForTitle(page);
  await pressPlay(page);
  await page.evaluate(() => window.__ZOO__!.addCoins(25));
  await page.evaluate(() => window.__ZOO__!.openShop());
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('Shop'));

  await openSettings(page);
  await tap(page, await page.evaluate(() => window.__ZOO__!.settingsLanguagePos()));
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.language())).toBe('es');
  await page.waitForFunction(() => {
    const scenes = window.__ZOO__!.activeScenes();
    return scenes.includes('Settings') && !scenes.includes('Shop') && !scenes.includes('World');
  });

  expect(await page.evaluate(() => window.__ZOO__!.back())).toBe('close-settings');
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('World'));
  expect(await page.evaluate(() => window.__ZOO__!.hudCoinsText())).toBe('🪙 25');
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/content.test.ts` → FAIL (la clave `settings.language` no existe).
Run: `npx playwright test tests/e2e/english.spec.ts` → FAIL (`window.__ZOO__.language is not a function`).

- [x] **Step 3: Add the key in both languages**

En `game/src/data/strings/es.ts`, tras `'settings.joystick'`:

```ts
  'settings.language': 'Español',
```

En `game/src/data/strings/en.ts`, tras `'settings.joystick'`:

```ts
  'settings.language': 'English',
```

- [x] **Step 4: Implement the button in `SettingsScene.ts`**

Imports nuevos:

```ts
import { getLanguage, otherLanguage, setLanguage, type Language } from '../systems/language';
```

Constantes, junto a `TOGGLES`:

```ts
const FLAGS: Record<Language, string> = { es: '🇪🇸', en: '🇬🇧' };
/** Ventanas que pueden estar abiertas debajo del menú; sus textos ya están pintados en el idioma anterior. */
const OVERLAYS = ['Book', 'Shop', 'Feed'] as const;
```

Campos nuevos en la clase y `init`:

```ts
  private language: Phaser.GameObjects.Container | null = null;
  /** Ya se ha pulsado el idioma: se ignoran más toques hasta que el menú se monte de nuevo. */
  private switching = false;
```

```ts
  init(data: { pausedWorld?: boolean } = {}): void {
    this.toggles.clear();
    this.buttons.clear();
    this.language = null;
    this.switching = false;
    if (data.pausedWorld !== undefined) this.pausedWorld = data.pausedWorld;
  }
```

En `create()`, sustituye el bloque que va desde `const size = …` hasta el final del `TOGGLES.forEach(…)`:

```ts
    // Cuatro botones en fila: los tres interruptores y el idioma.
    const slots = TOGGLES.length + 1;
    const size = Phaser.Math.Clamp(Math.min(height * 0.2, (panelW - 80) / (slots * 1.2)), 64, 140);
    const gap = Math.min(40, size * 0.4);
    const slotX = (i: number): number => width / 2 + (i - (slots - 1) / 2) * (size + gap);
    TOGGLES.forEach((toggle, i) => {
      const button = this.add.container(slotX(i), height * 0.35);
      button.setSize(size, size).setInteractive({ useHandCursor: true });
      button.on('pointerup', () => void this.flip(toggle.key));
      this.toggles.set(toggle.key, button);
      this.renderToggle(toggle.key, size, toggle.icon, t(toggle.label));
    });
    this.language = this.add.container(slotX(TOGGLES.length), height * 0.35);
    this.language.setSize(size, size).setInteractive({ useHandCursor: true });
    this.language.on('pointerup', () => void this.switchLanguage());
    this.paintToggle(this.language, size, FLAGS[getLanguage()], t('settings.language'), true);
```

Métodos para pruebas, junto a `buttonPos`:

```ts
  languagePos(): Vec | null {
    return this.language ? { x: this.language.x, y: this.language.y } : null;
  }

  /** Nombre del idioma que enseña el botón (para pruebas). */
  languageLabel(): string {
    return t('settings.language');
  }
```

Sustituye `renderToggle` por estos dos métodos (el dibujo es el mismo de antes, ahora compartido con el botón de idioma):

```ts
  private renderToggle(key: ToggleKey, size: number, icon: string, label: string): void {
    const button = this.toggles.get(key);
    if (button) this.paintToggle(button, size, icon, label, getSession().settings[key]);
  }

  private paintToggle(button: Phaser.GameObjects.Container, size: number, icon: string, label: string, on: boolean): void {
    button.removeAll(true);
    const lip = Math.max(4, Math.round(size * 0.07));
    button.add(this.add.rectangle(0, 0, size, size, 0x4e2f14));
    button.add(this.add.rectangle(0, -lip / 2, size - lip * 2, size - lip * 3, on ? 0xf3e9d2 : 0x9c8f7c));
    button.add(this.add.text(0, -lip / 2, icon, { fontSize: `${Math.round(size * 0.48)}px` }).setOrigin(0.5).setAlpha(on ? 1 : 0.35));
    // Apagado: una raya roja lo tacha.
    if (!on) button.add(this.add.rectangle(0, -lip / 2, size * 0.8, lip * 1.4, 0xc62828).setAngle(-45));
    button.add(this.add.text(0, size * 0.68, label, textStyle(Math.round(size * 0.2), '#ffffff', '#4e2f14')).setOrigin(0.5));
    button.setData('on', on);
  }
```

Método nuevo, después de `flip`:

```ts
  /**
   * Cambia de idioma sin recargar. Se guarda antes de tocar nada: no se pierde partida.
   * Los rótulos del mundo se pintan una sola vez al montarlo, así que el mundo se monta de nuevo
   * (la cuidadora vuelve a la entrada) y se queda en pausa debajo del menú. El HUD no tiene textos fijos.
   */
  private async switchLanguage(): Promise<void> {
    if (this.switching) return;
    this.switching = true;
    const next = otherLanguage(getLanguage());
    await getSession().updateSettings({ language: next });
    setLanguage(next);
    sfx.play('tap');
    for (const key of OVERLAYS) {
      if (this.scene.isActive(key) || this.scene.isPaused(key)) this.scene.stop(key);
    }
    // Las operaciones de escena se aplican en orden en el siguiente paso: parar, montar, pausar.
    this.scene.stop('World');
    this.scene.launch('World');
    this.scene.pause('World');
    this.scene.restart({ pausedWorld: true });
  }
```

Actualiza el comentario de la clase: «Menú de ajustes en un tablero de madera: música, sonido, joystick, idioma, créditos, privacidad y salir.»

- [x] **Step 5: `TitleScene.playLabel()` and test hooks**

En `game/src/scenes/TitleScene.ts`, dentro de la clase:

```ts
  /** Texto del botón de jugar (para pruebas). */
  playLabel(): string {
    return t('title.play');
  }
```

En `game/src/systems/testHooks.ts`, imports:

```ts
import type { Settings } from '../core/save';
import type { TitleScene } from '../scenes/TitleScene';
import { getLanguage } from './language';
```

En `ZooTestApi`, sustituye la línea de `settings()` y añade las nuevas:

```ts
  settings(): Settings;
  /** Idioma activo: 'es' o 'en'. */
  language(): string;
  titlePlayLabel(): string | null;
  settingsLanguagePos(): Vec | null;
  settingsLanguageLabel(): string | null;
```

En el objeto `window.__ZOO__`, junto a `settingsButtonPos`:

```ts
    language: () => getLanguage(),
    titlePlayLabel: () => activeScene<TitleScene>('Title')?.playLabel() ?? null,
    settingsLanguagePos: () => activeScene<SettingsScene>('Settings')?.languagePos() ?? null,
    settingsLanguageLabel: () => activeScene<SettingsScene>('Settings')?.languageLabel() ?? null,
```

- [x] **Step 6: Run tests to verify they pass**

Run: `npm run typecheck` → sin errores.
Run: `npm test` → todo en verde (incluido «ningún texto visible fuera de strings.ts»).
Run: `npx playwright test tests/e2e/english.spec.ts` → PASS (2 tests).
Run: `npm run test:e2e` → todo en verde (las dos pruebas del menú ⚙️ de `polish.spec.ts` siguen pasando con cuatro botones).

- [x] **Step 7: Commit**

```bash
git add src/data/strings src/scenes/SettingsScene.ts src/scenes/TitleScene.ts src/systems/testHooks.ts tests/unit/content.test.ts tests/e2e/english.spec.ts
git commit -m "feat: botón de idioma en Ajustes; el mundo se monta de nuevo en el idioma elegido"
```

---

### Task 12: privacidad en inglés (`legal.ts` + `privacidad-en.html`)

**Files:**
- Create: `game/public/privacidad-en.html`
- Modify: `game/src/systems/legal.ts`
- Test: `game/tests/unit/legal.test.ts` (nuevo), `game/tests/e2e/english.spec.ts`

**Interfaces:**
- Consumes: `getLanguage`, `type Language` (Task 1).
- Produces: `legalPage(lang: Language): string` exportado desde `src/systems/legal.ts` (`'privacidad.html'` o `'privacidad-en.html'`).

- [x] **Step 1: Write the failing tests**

`game/tests/unit/legal.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { legalPage } from '../../src/systems/legal';

const read = (name: string): string => readFileSync(fileURLToPath(new URL(`../../public/${name}`, import.meta.url)), 'utf8');
/** Lo que el juego enseña: el contenido de <main>. */
const main = (html: string): string => /<main>([\s\S]*)<\/main>/.exec(html)?.[1] ?? '';
const count = (html: string, tag: string): number => (main(html).match(new RegExp(`<${tag}[ >]`, 'g')) ?? []).length;

describe('página de privacidad', () => {
  it('cada idioma tiene su página', () => {
    expect(legalPage('es')).toBe('privacidad.html');
    expect(legalPage('en')).toBe('privacidad-en.html');
  });

  it('la página en inglés tiene la misma estructura que la española', () => {
    const es = read(legalPage('es'));
    const en = read(legalPage('en'));
    expect(en).toContain('<html lang="en">');
    for (const tag of ['h1', 'h2', 'p', 'strong']) expect(count(en, tag), tag).toBe(count(es, tag));
    expect(count(en, 'h2')).toBe(8);
  });

  it('sin enlaces (un peque no sale del juego) y con los mismos datos de contacto', () => {
    const en = main(read(legalPage('en')));
    expect(en).not.toContain('<a');
    expect(en).toContain('Zoo Esponji');
    expect(en).toContain('android@davidpladel.com');
    expect(en).toContain('davidpladel.com/aviso-legal');
    expect(en).toContain('aepd.es');
  });
});
```

Al final de `game/tests/e2e/english.spec.ts`:

```ts
test('en inglés la privacidad se lee en inglés, dentro del juego', async ({ page }) => {
  await page.goto('/');
  await waitForTitle(page);
  await pressPlay(page);
  await openSettings(page);

  await tap(page, await page.evaluate(() => window.__ZOO__!.settingsButtonPos('privacy')));
  await expect(page.locator('#legal h1')).toContainText('Privacy');
  await expect(page.locator('#legal h2')).toHaveCount(8);
  await expect(page.locator('#legal a')).toHaveCount(0);
  await expect(page.locator('#legal button')).toHaveAttribute('aria-label', 'Close');

  expect(await page.evaluate(() => window.__ZOO__!.back())).toBe('close-overlay');
  await expect(page.locator('#legal')).toHaveCount(0);
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/legal.test.ts` → FAIL (`legalPage is not a function`).
Run: `npx playwright test tests/e2e/english.spec.ts -g privacidad` → FAIL (el `h1` dice «Privacidad»).

- [x] **Step 3: Write the English page**

`game/public/privacidad-en.html`. Traducción fiel de `privacidad.html`: mismo `<head>`, mismos estilos, mismos ocho apartados, sin enlaces.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Zoo Esponji · Privacy and terms of use</title>
    <link rel="icon" type="image/png" href="logo.png" />
    <style>
      body {
        margin: 0;
        background: #fff8e1;
        color: #3e2723;
        font-family: sans-serif;
        font-size: 17px;
        line-height: 1.5;
      }
      main {
        max-width: 720px;
        margin: 0 auto;
        padding: 16px 20px 48px;
      }
      h1 {
        font-size: 26px;
      }
      h2 {
        font-size: 20px;
        margin-top: 1.4em;
        color: #6d4c41;
      }
    </style>
  </head>
  <body>
    <!-- The game shows the contents of <main> in its settings menu: no links, so a child never leaves the game. -->
    <main>
      <h1>Zoo Esponji · Privacy and terms of use</h1>
      <p><strong>Last updated: 6 October 2026</strong></p>

      <h2>In a nutshell</h2>
      <p>
        Zoo Esponji is a game for children and it <strong>does not collect personal data</strong>. There is no sign-up
        and no need to type a name, and the game has no ads, purchases, chat or social networks. It does not include
        any measurement or tracking tools either.
      </p>

      <h2>Who is responsible</h2>
      <p>
        David Salvador Plaza Delmarés (davidpladel). For any question about the game or about this page, write to
        android@davidpladel.com. The rest of the owner's details are in the legal notice at
        davidpladel.com/aviso-legal.
      </p>

      <h2>What the game saves</h2>
      <p>
        Only your game: the coins, the animals and enclosures you have unlocked, the pages of the book and the settings
        (music, sounds, joystick and language). It is saved <strong>on your own device</strong> and is not sent
        anywhere. It is deleted when you uninstall the game or clear its data.
      </p>

      <h2>Permissions</h2>
      <p>The game does not use the device's camera, microphone, location, contacts or photos.</p>

      <h2>Children</h2>
      <p>
        The game is designed for children aged 6 to 9 and can be played without giving any data. We do not ask for or
        store information about minors.
      </p>

      <h2>Your rights</h2>
      <p>
        Since the game does not collect personal data, we hold no data about you to look up, correct or delete. Even
        so, if you have any question you can write to android@davidpladel.com, and you can always contact the Spanish
        Data Protection Agency (aepd.es).
      </p>

      <h2>Terms of use</h2>
      <p>
        Zoo Esponji is free and is provided as is, for personal use. The game, its name and its texts belong to
        davidpladel (© 2026, all rights reserved). The art is by VectoRaith and is used under a commercial licence; the
        panda and the panther were painted by Daniela and Adrián. Copying or redistributing the game's art is not
        allowed.
      </p>

      <h2>Changes to this page</h2>
      <p>
        If the game changes and starts collecting any data, this page will be updated first, explaining what is
        collected and why.
      </p>
    </main>
  </body>
</html>
```

La página en inglés nombra el idioma entre los ajustes guardados. Para que las dos digan lo mismo, en `game/public/privacidad.html` cambia «los ajustes (música, sonidos y joystick)» por «los ajustes (música, sonidos, joystick e idioma)».

- [x] **Step 4: Implement `legalPage`**

En `game/src/systems/legal.ts`:

```ts
import { getLanguage, type Language } from './language';
```

```ts
/** La página de privacidad de cada idioma (en `public/`). */
export function legalPage(lang: Language): string {
  return lang === 'es' ? 'privacidad.html' : 'privacidad-en.html';
}
```

Actualiza el comentario de `openLegal` («Es la misma `privacidad.html` (o `privacidad-en.html`) que se enlaza desde la ficha de la tienda.») y sustituye el comienzo de `load`:

```ts
async function load(article: HTMLElement): Promise<void> {
  try {
    const file = legalPage(getLanguage());
    const response = await fetch(withVersion(file));
    if (!response.ok) throw new Error(`${file}: ${response.status}`);
```

- [x] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/unit/legal.test.ts` → PASS.
Run: `npm run typecheck` → sin errores.
Run: `npm run test:e2e` → todo en verde (la privacidad en español de `polish.spec.ts` y la nueva en inglés).

- [x] **Step 6: Commit**

```bash
git add public/privacidad-en.html public/privacidad.html src/systems/legal.ts tests/unit/legal.test.ts tests/e2e/english.spec.ts
git commit -m "feat: página de privacidad en inglés dentro del juego"
```

---

### Task 13: repaso visual en inglés y cierre

La spec avisa de que un texto en inglés más largo o más corto puede desbordar globos y botones. Aquí se sacan capturas a tamaño de móvil para mirarlas, y se cierran los documentos.

**Files:**
- Modify: `game/tests/e2e/english.spec.ts` (prueba de capturas, apagada por defecto)
- Modify (solo si una captura lo pide): `game/src/data/strings/en.ts`
- Docs: `README.md` (raíz), `game/README.md`, spec, este plan

**Interfaces:**
- Consumes: todo lo anterior y los ganchos de prueba `openShop`, `openBook`, `openFeed`, `openSettings`, `addCoins`.
- Produces: capturas en `game/test-results/` (carpeta ignorada por git).

- [x] **Step 1: Add the screenshot test**

Al final de `game/tests/e2e/english.spec.ts`:

```ts
test('capturas en inglés a tamaño de móvil, para revisarlas a ojo', async ({ page }, testInfo) => {
  test.skip(!process.env.CAPTURAS, 'Solo a mano: CAPTURAS=1');
  await page.setViewportSize({ width: 800, height: 360 });
  const shot = async (name: string): Promise<void> => {
    await page.waitForTimeout(600); // que acaben las animaciones de entrada
    await page.screenshot({ path: testInfo.outputPath(`en-${name}.png`) });
  };

  await page.goto('/');
  await waitForTitle(page);
  await shot('1-titulo');
  await pressPlay(page);
  await shot('2-mundo');

  await openSettings(page);
  await shot('3-ajustes');
  await page.evaluate(() => window.__ZOO__!.back());

  await page.evaluate(() => window.__ZOO__!.openFeed('bills'));
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('Feed'));
  await shot('4-comer');
  await page.evaluate(() => window.__ZOO__!.back());

  await page.evaluate(() => window.__ZOO__!.addCoins(500));
  await page.evaluate(() => window.__ZOO__!.openShop());
  await page.waitForFunction(() => window.__ZOO__!.shopCardScreenPos('pantera') !== null);
  await page.waitForTimeout(3500); // saludo del tendero
  await shot('5-tienda');

  for (const pageId of ['index', 'story', 'mary', 'canela']) {
    await page.evaluate((id) => window.__ZOO__!.openBook(id), pageId);
    await page.waitForFunction((id) => window.__ZOO__!.bookPage() === id, pageId);
    await shot(`6-libro-${pageId}`);
    await page.evaluate(() => window.__ZOO__!.back());
  }
});
```

- [x] **Step 2: Run it and look at the screenshots**

Run (bash): `CAPTURAS=1 npx playwright test tests/e2e/english.spec.ts -g capturas`
Run (PowerShell): `$env:CAPTURAS='1'; npx playwright test tests/e2e/english.spec.ts -g capturas; Remove-Item Env:CAPTURAS`
Expected: PASS; nueve imágenes `en-*.png` dentro de `game/test-results/`.

Abre cada imagen y comprueba:
- `en-3-ajustes`: los cuatro botones caben en el tablero, con su rótulo debajo (`Music`, `Sounds`, `Joystick`, `English`); `Privacy` cabe en su placa; el pie de copyright no se sale.
- `en-4-comer`: `Bills, the lion` cabe bajo el animal.
- `en-5-tienda`: el cartel `Zoo shop`, los precios y el bocadillo del tendero se leen enteros.
- `en-6-libro-*`: título y texto dentro de la hoja, sin pisar el pie de página; el índice no corta `Savanna` ni `Mountain`.
- `en-1-titulo` y `en-2-mundo`: nada cortado. (Los carteles de zona y de recinto solo salen con el arte importado; sin arte se ven los rótulos de recinto.)

Si un texto se desborda, se arregla **acortando la frase en `en.ts`** (no el diseño), manteniendo el tono, y se repite `npx vitest run tests/unit/strings.test.ts` y este paso. Apunta en el resumen de la tarea qué frases se han acortado, para que David las revise.

- [x] **Step 3: Full verification**

Run: `npm run typecheck` → sin errores.
Run: `npm test` → todo en verde.
Run: `npm run build` → compila.
Run: `npm run test:e2e` → todo en verde; la prueba de capturas sale como `skipped`.
Run: `npx playwright test --list` → apunta el total de pruebas para el README.

- [x] **Step 4: Docs de cierre**

- `README.md` (raíz), «Cómo se juega», línea «Menú ⚙️»: añade el idioma: «…con música, efectos, joystick, **idioma (español o inglés)**, créditos…». Añade una línea nueva: «- **Idiomas:** español e inglés. Sale el del móvil (cualquier variante de español da español; el resto, inglés) y se cambia en el menú ⚙️. Los nombres de los animales y «Zoo Esponji» no se traducen.»
- `README.md` (raíz), «Hoja de ruta», párrafo «Pendiente, por orden»: quita «multi-idioma (selector de idioma y traducciones, con su propio spec, antes de Play Store)» y añade antes del párrafo: «✅ **Idiomas español e inglés** (2026-10-06, en `main`, saldrá con la próxima versión): detección por el idioma del móvil, botón en Ajustes y privacidad en inglés. La ficha de Play en inglés queda para 6b.»
- `README.md` (raíz), «Documentación de desarrollo»: añade la spec y este plan a la lista, con el mismo formato que las demás entradas.
- `game/README.md`, «Comandos»: actualiza el número de «pruebas de juego» con el total del paso 3.
- `game/README.md`, «Estructura», línea de `src/scenes/`: «Settings (menú ⚙️: ajustes, idioma, créditos, privacidad y salir)».
- Spec, estado: «Estado: implementada (2026-10-06). Pendiente de que David revise el inglés del libro antes de publicar.» Añade bajo «Diseño → 4. Ajustes» una nota: «Resultado del inventario del plan: `HudScene` no tiene textos fijos y no se reinicia; las ventanas abiertas debajo (comida, tienda, libro) se cierran; el mundo se monta de nuevo en pausa.»
- Este plan: marca las tareas 11-13 y cambia **Estado** a «hecho».

- [x] **Step 5: Commit**

```bash
git add tests/e2e/english.spec.ts src/data/strings/en.ts README.md ../README.md ../docs/superpowers
git commit -m "docs: idiomas español e inglés terminados; capturas de repaso en inglés"
```

---

## Fuera de este plan

- Ficha de Play Store en inglés (hito 6b) y subir de versión: la spec no pide número de versión nuevo.
- Más idiomas, y cambiar de idioma sin montar de nuevo las escenas.
- Probar en un móvil Android real con el sistema en inglés: lo hace David al instalar la siguiente build (`npx cap sync android`).
