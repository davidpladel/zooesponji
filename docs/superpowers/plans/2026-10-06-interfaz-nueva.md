# Interfaz nueva: menús, botones y portada — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Todos los menús y ventanas del juego pasan a una interfaz lisa y brillante (píldoras de colores, paneles crema, carteles, letra Baloo 2, iconos propios y efecto al pulsar), con portada pintada, pantalla de carga a juego y modo inmersivo en Android.

**Architecture:** Un juego de piezas en `src/ui/` que todas las escenas usan. Las piezas se pintan con Canvas 2D en texturas y se muestran como imágenes (Phaser arranca con `pixelArt: true`, que deja `Graphics` sin suavizado). La lógica que se puede probar sin Phaser (efecto al pulsar, visibilidad del engranaje) vive en `src/core/`. El arranque (`Boot` → `Preload` → `Title`) comparte un mismo fondo para que carga y título se vean como una sola pantalla.

**Tech Stack:** TypeScript, Phaser 4.2.1, Capacitor 8 (Android), Vitest, Playwright, Python + Pillow (solo para el splash). Todo dentro de `game/`.

**Spec:** `docs/superpowers/specs/2026-10-06-interfaz-nueva-design.md` (la sección «Ajustes al planificar» manda sobre el resto).

**Bocetos:** `docs/superpowers/mockups/boceto-titulo.html` y `boceto-resto.html`. Mandan en colores, proporciones y composición.

**Estado:** tareas 1 a 11 implementadas en la rama `interfaz-nueva` y documentación al día (2026-10-07): tipos limpios, 976 pruebas unitarias y e2e 29 pasadas + 1 omitida (la de capturas en inglés, solo a mano); el Java de Android compila. Pendiente: que David pruebe en el móvil el modo inmersivo, el splash y el arranque completo; subir versión; capturas nuevas para Google Play; fusionar en `main`. Una revisión final del código está en marcha y puede añadir arreglos.

## Global Constraints

- Rama de trabajo: `interfaz-nueva`. No se fusiona en `main` ni se sube a GitHub sin que David lo pida.
- Comandos siempre desde `game/`: `npm run typecheck`, `npm test`, `npm run test:e2e`.
- **Pruebas completas:** `npm test` entero y `npm run test:e2e` los lanza David en una ventana aparte al final de cada bloque (puntos «PARAR»). Dentro de una tarea sí se ejecutan `npm run typecheck` y el archivo de pruebas unitarias que toca la tarea.
- `core/` no importa Phaser.
- Ningún texto visible fuera de `src/data/strings/` (lo vigila `tests/unit/strings.test.ts` en `scenes/` y `world/`).
- Nada de emojis en la interfaz nueva. Los emojis del mundo y los de reserva de comidas y animales no se tocan.
- El botón «Jugar» sigue centrado en `(width / 2, height * 0.62)`: las pruebas e2e lo pulsan ahí.
- Zonas de toque mínimas: engranaje 48 px, cerrar 64 px.
- No se cambia `backgroundColor` de la configuración de Phaser (`#1d2b1f`): el mundo lo usa alrededor del mapa.
- No se toca la lógica de juego, el guardado ni `SAVE_VERSION`.
- Colores exactos: los de `src/ui/theme.ts` (tarea 3). Azul cielo `#58B0F0`.
- Las tareas 2 y 11 descargan archivos de terceros (npm y el repositorio de Google Fonts en GitHub). Si la sesión no tiene permiso para descargar, parar y pedírselo a David.

## Mapa de archivos

| Archivo | Cambio | Responsabilidad |
|---|---|---|
| `src/core/press.ts` | Nuevo | Regla pura del efecto al pulsar |
| `src/core/hud.ts` | Nuevo | Regla pura: cuándo se ve el engranaje |
| `scripts/make-ui-assets.mjs` | Nuevo | Copia la letra y los iconos a `public/` |
| `public/fonts/baloo-2-latin-800-normal.woff2` | Nuevo | Letra |
| `public/assets/ui/icons/*.svg` | Nuevo | 12 iconos blancos |
| `public/assets/ui/title-bg.webp` | Nuevo | Fondo de la portada |
| `src/ui/theme.ts` | Nuevo | Colores, fuente, `textStyle` |
| `src/ui/font.ts` | Nuevo | Carga de la letra con tope de 2 s |
| `src/ui/paint.ts` | Nuevo | Pintores Canvas 2D → texturas |
| `src/ui/icons.ts` | Nuevo | Carga y uso de iconos |
| `src/ui/press.ts` | Nuevo | Conecta `core/press` a Phaser |
| `src/ui/widgets.ts` | Nuevo | Píldora, panel, cartel, cerrar, ficha, monedas, velo |
| `src/ui/titleBackdrop.ts` | Nuevo | Fondo y nombre compartidos por carga y título |
| `src/scenes/ui.ts` | Se elimina (tarea 10) | — |
| `src/scenes/BootScene.ts`, `PreloadScene.ts`, `TitleScene.ts` | Modificar | Arranque |
| `src/scenes/HudScene.ts` | Modificar | Monedas, engranaje, aviso |
| `src/scenes/SettingsScene.ts`, `QuitScene.ts` | Modificar | Ventanas |
| `src/scenes/FeedScene.ts`, `BookScene.ts`, `ShopScene.ts` | Modificar | Ventanas |
| `src/world/ShopInterior.ts` | Modificar | Solo el import de `textStyle` |
| `src/data/strings/es.ts`, `en.ts` | Modificar | Textos |
| `src/systems/testHooks.ts` | Modificar | `hudGearVisible`, `quitStayPos` |
| `android/.../MainActivity.java`, `res/values/styles.xml`, `index.html` | Modificar | Inmersivo y azul cielo |
| `store/make_icon.py`, `store/fonts/` | Modificar / nuevo | Splash |
| `THIRD_PARTY_NOTICES.md`, `README.md`, `game/README.md` | Modificar | Avisos y documentación |

---

## Bloque A — Piezas comunes

### Task 1: Reglas puras (pulsar y engranaje)

**Files:**
- Create: `game/src/core/press.ts`, `game/src/core/hud.ts`
- Test: `game/tests/unit/press.test.ts`, `game/tests/unit/hud.test.ts`

**Interfaces:**
- Produces: `pressStep(state: PressState, event: PressEvent): PressStep`; `gearVisible(activeScenes: readonly string[]): boolean`.

- [x] **Step 1: Escribir las pruebas que fallan**

`game/tests/unit/press.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { pressStep } from '../../src/core/press';

describe('efecto al pulsar', () => {
  it('bajar el dedo aprieta sin ejecutar', () => {
    expect(pressStep('idle', 'down')).toEqual({ state: 'down', fire: false });
  });

  it('soltar dentro ejecuta', () => {
    expect(pressStep('down', 'up')).toEqual({ state: 'idle', fire: true });
  });

  it('salir con el dedo apretado cancela', () => {
    expect(pressStep('down', 'out')).toEqual({ state: 'idle', fire: false });
  });

  it('soltar sin haber apretado aquí no ejecuta', () => {
    expect(pressStep('idle', 'up')).toEqual({ state: 'idle', fire: false });
  });

  it('salir y volver a soltar encima no ejecuta', () => {
    const out = pressStep('down', 'out');
    expect(pressStep(out.state, 'up').fire).toBe(false);
  });
});
```

`game/tests/unit/hud.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { gearVisible } from '../../src/core/hud';

describe('engranaje de ajustes', () => {
  it('se ve andando por el zoo', () => {
    expect(gearVisible(['World', 'Hud'])).toBe(true);
  });

  it.each(['Shop', 'Book', 'Feed', 'Settings', 'Quit'])('no se ve con %s abierta', (overlay) => {
    expect(gearVisible(['World', 'Hud', overlay])).toBe(false);
  });

  it('no se ve si el mundo no está en marcha', () => {
    expect(gearVisible(['Hud'])).toBe(false);
    expect(gearVisible(['Hud', 'Shop'])).toBe(false);
  });
});
```

- [x] **Step 2: Ejecutarlas y ver que fallan**

Run: `npx vitest run tests/unit/press.test.ts tests/unit/hud.test.ts`
Expected: FAIL, no se encuentran `../../src/core/press` ni `../../src/core/hud`.

- [x] **Step 3: Implementar**

`game/src/core/press.ts`:

```ts
export type PressState = 'idle' | 'down';
export type PressEvent = 'down' | 'up' | 'out';

export interface PressStep {
  state: PressState;
  /** Hay que ejecutar la acción del botón. */
  fire: boolean;
}

/** Un botón solo se ejecuta si el dedo bajó y se soltó sobre él sin salir entre medias. */
export function pressStep(state: PressState, event: PressEvent): PressStep {
  if (event === 'down') return { state: 'down', fire: false };
  if (event === 'up') return { state: 'idle', fire: state === 'down' };
  return { state: 'idle', fire: false };
}
```

`game/src/core/hud.ts`:

```ts
/** Ventanas con las que el engranaje se esconde. */
const OVERLAYS = ['Shop', 'Book', 'Feed', 'Settings', 'Quit'] as const;

/** El engranaje solo se ve mientras la cuidadora anda por el zoo. */
export function gearVisible(activeScenes: readonly string[]): boolean {
  return activeScenes.includes('World') && !OVERLAYS.some((key) => activeScenes.includes(key));
}
```

- [x] **Step 4: Ejecutarlas y ver que pasan**

Run: `npx vitest run tests/unit/press.test.ts tests/unit/hud.test.ts`
Expected: PASS (5 + 7 pruebas).

- [x] **Step 5: Commit**

```bash
git add game/src/core/press.ts game/src/core/hud.ts game/tests/unit/press.test.ts game/tests/unit/hud.test.ts
git commit -m "feat: reglas puras del efecto al pulsar y del engranaje"
```

### Task 2: Letra, iconos y fondo

**Files:**
- Create: `game/scripts/make-ui-assets.mjs`, `game/public/fonts/baloo-2-latin-800-normal.woff2`, `game/public/assets/ui/icons/*.svg` (12), `game/public/assets/ui/title-bg.webp`
- Modify: `game/package.json` (devDependencies y script), `THIRD_PARTY_NOTICES.md`

**Interfaces:**
- Produces: los archivos de `public/` con esos nombres exactos. Iconos: `play`, `close`, `music`, `volume`, `joystick`, `gear`, `lock`, `shield`, `door`, `left`, `right`, `heart` (`.svg`, trazo o relleno blanco).

- [x] **Step 1: Instalar las fuentes de los recursos**

Run (desde `game/`): `npm install --save-dev @fontsource/baloo-2 @tabler/icons`
Expected: se añaden las dos a `devDependencies`.

- [x] **Step 2: Escribir el script**

`game/scripts/make-ui-assets.mjs`:

```js
// Copia la letra y los iconos de la interfaz desde node_modules a public/.
// Los iconos de Tabler usan currentColor: aquí se dejan en blanco para teñirlos en el juego.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const tabler = `${root}node_modules/@tabler/icons/icons/`;

/** Nombre en el juego → nombre en Tabler. */
const ICONS = {
  play: 'player-play',
  close: 'x',
  music: 'music',
  volume: 'volume',
  joystick: 'device-gamepad-2',
  gear: 'settings',
  lock: 'lock',
  shield: 'shield-lock',
  door: 'door-exit',
  left: 'caret-left',
  right: 'caret-right',
  heart: 'heart',
};
/** Estos se quieren de trazo aunque exista la versión rellena. */
const OUTLINE = new Set(['close', 'door']);

mkdirSync(`${root}public/assets/ui/icons`, { recursive: true });
for (const [name, source] of Object.entries(ICONS)) {
  const filled = `${tabler}filled/${source}.svg`;
  const outline = `${tabler}outline/${source}.svg`;
  const useFilled = !OUTLINE.has(name) && existsSync(filled);
  const path = useFilled ? filled : outline;
  if (!existsSync(path)) throw new Error(`No existe el icono de Tabler: ${source}`);
  let svg = readFileSync(path, 'utf8').replaceAll('currentColor', '#ffffff');
  if (!useFilled) svg = svg.replace('stroke-width="2"', 'stroke-width="2.6"');
  writeFileSync(`${root}public/assets/ui/icons/${name}.svg`, svg);
  console.log(`${name}.svg ← ${useFilled ? 'filled' : 'outline'}/${source}`);
}

mkdirSync(`${root}public/fonts`, { recursive: true });
const font = 'baloo-2-latin-800-normal.woff2';
copyFileSync(`${root}node_modules/@fontsource/baloo-2/files/${font}`, `${root}public/fonts/${font}`);
console.log(font);
```

En `game/package.json`, dentro de `"scripts"`, tras `"make:calcetin"`:

```json
    "make:ui-assets": "node scripts/make-ui-assets.mjs",
```

- [x] **Step 3: Ejecutarlo**

Run: `npm run make:ui-assets`
Expected: 12 líneas `nombre.svg ← …` y `baloo-2-latin-800-normal.woff2`. Si lanza «No existe el icono de Tabler», buscar el nombre correcto en `node_modules/@tabler/icons/icons/outline/` y corregir el mapa `ICONS`.

- [x] **Step 4: Copiar el fondo de la portada**

Run (desde `game/`): `cp ../docs/superpowers/mockups/titulo-fondo-prueba.webp public/assets/ui/title-bg.webp`
Expected: `public/assets/ui/title-bg.webp` existe (unos 290 KB).

- [x] **Step 5: Anotar las licencias**

En `THIRD_PARTY_NOTICES.md`, añadir estas filas al final de la tabla (después de la fila de la música):

```markdown
| Letra [Baloo 2](https://fonts.google.com/specimen/Baloo+2) (Ek Type) | SIL Open Font License 1.1 |
| Iconos [Tabler Icons](https://tabler.io/icons) | MIT |
```

Y debajo del párrafo del arte de VectoRaith, añadir:

```markdown
El fondo de la portada (`game/public/assets/ui/title-bg.webp`) es una imagen propia de davidpladel, generada con ChatGPT.
```

- [x] **Step 6: Commit**

```bash
git add game/scripts/make-ui-assets.mjs game/package.json game/package-lock.json game/public/fonts game/public/assets/ui THIRD_PARTY_NOTICES.md
git commit -m "feat: letra Baloo 2, iconos y fondo de portada para la interfaz nueva"
```

### Task 3: Juego de piezas (`src/ui/`)

**Files:**
- Create: `game/src/ui/theme.ts`, `font.ts`, `paint.ts`, `icons.ts`, `press.ts`, `widgets.ts`

**Interfaces:**
- Consumes: `pressStep` (tarea 1); archivos de `public/` (tarea 2); `withVersion(path: string): string` de `src/core/cacheBust.ts`.
- Produces (los usan todas las tareas siguientes):
  - `theme.ts`: `FONT_STACK`, `UI`, `PILL`, `type PillColor = 'yellow' | 'green' | 'blue' | 'red' | 'gray' | 'sand'`, `textStyle(size: number, color?: string, stroke?: string)`.
  - `font.ts`: `loadUiFont(timeoutMs?: number): Promise<boolean>`.
  - `icons.ts`: `type IconName`, `queueIcons(scene)`, `smoothIcons(scene)`, `addIcon(scene, x, y, name, size, tint?)`.
  - `paint.ts`: `pillTexture`, `panelTexture`, `ribbonTexture`, `tileTexture`, `coinTexture`, `sceneryTexture`, `smooth(scene, key)`.
  - `press.ts`: `makePressable(target, onTap: (pointer: Phaser.Input.Pointer) => void): void`.
  - `widgets.ts`: `HUD_COIN`, `pillImage`, `tileImage`, `coinImage`, `addPillButton`, `addPanel`, `addRibbonTitle`, `setRibbonText`, `addCloseBadge`, `addTile`, `addCoinCounter`, `addVeil`, `addHeartLine`, `restartOnResize`.

Esta tarea no tiene prueba unitaria propia (todo depende de Phaser y el entorno de Vitest es `node`): se comprueba con `npm run typecheck` aquí y a la vista en las tareas 4 a 10. `src/scenes/ui.ts` sigue existiendo hasta la tarea 10, así que el juego compila en todo momento.

- [x] **Step 1: `theme.ts`**

```ts
import type * as Phaser from 'phaser';

export const FONT = 'Baloo 2';
export const FONT_STACK = `"${FONT}", "Arial Rounded MT Bold", sans-serif`;
export const FONT_FILE = 'fonts/baloo-2-latin-800-normal.woff2';

export const UI = {
  cream: '#fff6e0',
  frame: '#f0b24a',
  outline: '#8a4a18',
  brown: '#7a4a1c',
  rim: '#fff6dc',
  shadow: 'rgba(60,30,0,0.35)',
  ribbonTop: '#ff9d2e',
  ribbonBottom: '#f27612',
  sky: '#58b0f0',
  logo: '#ffd23c',
  veil: 0x142814,
} as const;

export type PillColor = 'yellow' | 'green' | 'blue' | 'red' | 'gray' | 'sand';

/** Degradado del cuerpo (top → bottom), canto de abajo y contorno del texto de cada color. */
export const PILL: Record<PillColor, { top: string; bottom: string; lip: string; stroke: string }> = {
  yellow: { top: '#ffd83a', bottom: '#ffab0a', lip: '#e08600', stroke: '#8a3b12' },
  green: { top: '#8fe04a', bottom: '#4fb52a', lip: '#358a18', stroke: '#24600f' },
  blue: { top: '#4cc3ff', bottom: '#1e8fe8', lip: '#1569b8', stroke: '#134a86' },
  red: { top: '#ff7a6b', bottom: '#e63a34', lip: '#b02320', stroke: '#7d1512' },
  gray: { top: '#d8d2c6', bottom: '#b3ab9c', lip: '#8f8777', stroke: '#5f584c' },
  sand: { top: '#ffe9b8', bottom: '#ffd98a', lip: '#e9b860', stroke: '#7a4a1c' },
};

/** Letra de la interfaz: gordita, con contorno. */
export function textStyle(size: number, color = '#ffffff', stroke: string = UI.outline): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_STACK,
    fontStyle: '800',
    fontSize: `${size}px`,
    color,
    stroke,
    strokeThickness: Math.max(3, Math.round(size / 6)),
  };
}
```

- [x] **Step 2: `font.ts`**

```ts
import { withVersion } from '../core/cacheBust';
import { FONT, FONT_FILE } from './theme';

/** Carga la letra antes de pintar nada. Si falla o tarda, se sigue con la letra del sistema. */
export async function loadUiFont(timeoutMs = 2000): Promise<boolean> {
  if (typeof FontFace === 'undefined') return false;
  const face = new FontFace(FONT, `url(${withVersion(FONT_FILE)})`, { weight: '800' });
  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs));
  const load = face.load().then(
    (loaded) => {
      document.fonts.add(loaded);
      return true;
    },
    () => false,
  );
  return Promise.race([load, timeout]);
}
```

- [x] **Step 3: `paint.ts`**

```ts
import * as Phaser from 'phaser';
import { FONT_STACK, PILL, UI, type PillColor } from './theme';

type Ctx = CanvasRenderingContext2D;

/** Rectángulo redondeado con arcTo (también en WebView sin roundRect). */
function roundedPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

function fill(ctx: Ctx, style: string | CanvasGradient, x: number, y: number, w: number, h: number, r: number): void {
  ctx.fillStyle = style;
  roundedPath(ctx, x, y, w, h, r);
  ctx.fill();
}

function vertical(ctx: Ctx, y0: number, y1: number, top: string, bottom: string): CanvasGradient {
  const gradient = ctx.createLinearGradient(0, y0, 0, y1);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  return gradient;
}

/** Alto de la sombra que cuelga por debajo de una pieza de alto `h`. */
export function shadowOf(h: number): number {
  return Math.max(2, Math.round(h * 0.09));
}

/** El juego usa pixelArt (filtro «vecino»): las piezas lisas piden filtro lineal. */
export function smooth(scene: Phaser.Scene, key: string): void {
  scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
}

/** Crea la textura una sola vez por clave. */
function ensure(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void): string {
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)));
  if (!texture) throw new Error(`No se pudo crear la textura ${key}`);
  draw(texture.context);
  texture.refresh();
  smooth(scene, key);
  return key;
}

/** Píldora (o ficha de color si `radius` es pequeño): reborde claro, cuerpo en degradado, brillo y canto. */
export function pillTexture(scene: Phaser.Scene, w: number, h: number, color: PillColor, radius = h / 2): string {
  const W = Math.round(w);
  const H = Math.round(h);
  const R = Math.round(radius);
  const s = shadowOf(H);
  return ensure(scene, `ui-pill-${color}-${W}x${H}-${R}`, W, H + s, (ctx) => {
    const c = PILL[color];
    const rim = Math.max(2, Math.round(H * 0.06));
    const lip = Math.max(2, Math.round(H * 0.09));
    fill(ctx, UI.shadow, 0, s, W, H, R);
    fill(ctx, UI.rim, 0, 0, W, H, R);
    fill(ctx, c.lip, rim, rim, W - 2 * rim, H - 2 * rim, R - rim);
    fill(ctx, vertical(ctx, rim, H - rim - lip, c.top, c.bottom), rim, rim, W - 2 * rim, H - 2 * rim - lip, R - rim);
    const glossH = (H - 2 * rim) * 0.36;
    fill(ctx, 'rgba(255,255,255,0.35)', rim + W * 0.04, rim + H * 0.05, W - 2 * rim - W * 0.08, glossH, Math.min(glossH / 2, R));
  });
}

/** Panel crema con marco naranja y contorno marrón. */
export function panelTexture(scene: Phaser.Scene, w: number, h: number): string {
  const W = Math.round(w);
  const H = Math.round(h);
  const side = Math.min(W, H);
  const s = Math.max(4, Math.round(side * 0.03));
  return ensure(scene, `ui-panel-${W}x${H}`, W, H + s, (ctx) => {
    const r = side * 0.09;
    const line = Math.max(2, Math.round(side * 0.012));
    const frame = Math.max(4, Math.round(side * 0.022));
    fill(ctx, UI.shadow, 0, s, W, H, r);
    fill(ctx, UI.outline, 0, 0, W, H, r);
    fill(ctx, UI.frame, line, line, W - 2 * line, H - 2 * line, r - line);
    fill(ctx, UI.cream, line + frame, line + frame, W - 2 * (line + frame), H - 2 * (line + frame), r - line - frame);
  });
}

/** Cartel naranja del título. */
export function ribbonTexture(scene: Phaser.Scene, w: number, h: number): string {
  const W = Math.round(w);
  const H = Math.round(h);
  const s = shadowOf(H);
  return ensure(scene, `ui-ribbon-${W}x${H}`, W, H + s, (ctx) => {
    const r = H * 0.22;
    const line = Math.max(2, Math.round(H * 0.07));
    fill(ctx, UI.shadow, 0, s, W, H, r);
    fill(ctx, UI.outline, 0, 0, W, H, r);
    fill(ctx, vertical(ctx, line, H - line, UI.ribbonTop, UI.ribbonBottom), line, line, W - 2 * line, H - 2 * line, r - line);
    fill(ctx, 'rgba(255,255,255,0.35)', line * 2, line * 1.6, W - line * 4, (H - 2 * line) * 0.22, H * 0.1);
  });
}

/** Ficha blanca con marco naranja. */
export function tileTexture(scene: Phaser.Scene, w: number, h: number): string {
  const W = Math.round(w);
  const H = Math.round(h);
  const side = Math.min(W, H);
  const s = Math.max(2, Math.round(side * 0.05));
  return ensure(scene, `ui-tile-${W}x${H}`, W, H + s, (ctx) => {
    const r = side * 0.18;
    const frame = Math.max(2, Math.round(side * 0.045));
    fill(ctx, 'rgba(60,30,0,0.25)', 0, s, W, H, r);
    fill(ctx, UI.frame, 0, 0, W, H, r);
    fill(ctx, '#f3dfb4', frame, frame, W - 2 * frame, H - 2 * frame, r - frame);
    fill(ctx, '#ffffff', frame, frame, W - 2 * frame, H - 2 * frame - Math.max(2, Math.round(side * 0.05)), r - frame);
  });
}

/** Moneda dorada con aro y un «1». */
export function coinTexture(scene: Phaser.Scene, diameter: number): string {
  const D = Math.round(diameter);
  const s = Math.max(2, Math.round(D * 0.08));
  return ensure(scene, `ui-coin-${D}`, D, D + s, (ctx) => {
    const c = D / 2;
    const disc = (radius: number, style: string | CanvasGradient, cy = c) => {
      ctx.fillStyle = style;
      ctx.beginPath();
      ctx.arc(c, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    };
    disc(c, 'rgba(60,30,0,0.4)', c + s);
    disc(c, '#a86200');
    const gold = ctx.createRadialGradient(D * 0.35, D * 0.3, D * 0.05, c, c, c);
    gold.addColorStop(0, '#fff2a8');
    gold.addColorStop(0.6, '#ffc21a');
    gold.addColorStop(1, '#f29a00');
    disc(c * 0.9, gold);
    ctx.strokeStyle = '#c97f00';
    ctx.lineWidth = Math.max(1, D * 0.05);
    ctx.beginPath();
    ctx.arc(c, c, c * 0.66, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#c97f00';
    ctx.font = `800 ${Math.round(D * 0.56)}px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1', c, c + D * 0.04);
  });
}

/** Ventana con cielo y prado donde se asoma el animal al darle de comer. */
export function sceneryTexture(scene: Phaser.Scene, w: number, h: number): string {
  const W = Math.round(w);
  const H = Math.round(h);
  return ensure(scene, `ui-scenery-${W}x${H}`, W, H, (ctx) => {
    const r = Math.min(W, H) * 0.12;
    const frame = Math.max(3, Math.round(Math.min(W, H) * 0.025));
    fill(ctx, UI.frame, 0, 0, W, H, r);
    ctx.save();
    roundedPath(ctx, frame, frame, W - 2 * frame, H - 2 * frame, r - frame);
    ctx.clip();
    ctx.fillStyle = vertical(ctx, 0, H * 0.55, '#8fd3f7', '#cdeeff');
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#a5dc6c';
    ctx.fillRect(0, H * 0.55, W, H);
    ctx.fillStyle = '#8ecb58';
    ctx.fillRect(0, H * 0.86, W, H);
    ctx.restore();
  });
}
```

- [x] **Step 4: `icons.ts`**

```ts
import * as Phaser from 'phaser';
import { withVersion } from '../core/cacheBust';
import { smooth } from './paint';

export const ICONS = ['play', 'close', 'music', 'volume', 'joystick', 'gear', 'lock', 'shield', 'door', 'left', 'right', 'heart'] as const;
export type IconName = (typeof ICONS)[number];

const iconKey = (name: IconName): string => `ui-icon-${name}`;

/** Encola los iconos en el cargador de la escena (se rasterizan a 128 px). */
export function queueIcons(scene: Phaser.Scene): void {
  for (const name of ICONS) scene.load.svg(iconKey(name), withVersion(`assets/ui/icons/${name}.svg`), { width: 128, height: 128 });
}

/** Tras cargar: filtro lineal para que no se vean dentados. */
export function smoothIcons(scene: Phaser.Scene): void {
  for (const name of ICONS) if (scene.textures.exists(iconKey(name))) smooth(scene, iconKey(name));
}

/** Icono blanco teñido de `tint`, de `size` px de lado. */
export function addIcon(scene: Phaser.Scene, x: number, y: number, name: IconName, size: number, tint = 0xffffff): Phaser.GameObjects.Image {
  return scene.add.image(x, y, iconKey(name)).setDisplaySize(size, size).setTint(tint);
}
```

- [x] **Step 5: `press.ts`**

```ts
import * as Phaser from 'phaser';
import { pressStep, type PressEvent, type PressState } from '../core/press';

const PRESS_SCALE = 0.92;
const PRESS_TINT = 0xd9d9d9;

type Pressable = Phaser.GameObjects.Container | Phaser.GameObjects.Image;

/**
 * Hace pulsable una pieza: encoge y se oscurece mientras se aprieta, rebota al soltar y solo
 * ejecuta `onTap` si el dedo se suelta encima. Un contenedor debe tener tamaño (`setSize`).
 */
export function makePressable(target: Pressable, onTap: (pointer: Phaser.Input.Pointer) => void): void {
  const scene = target.scene;
  if (!target.input) target.setInteractive({ useHandCursor: true });
  let state: PressState = 'idle';
  let base = 1;
  let tween: Phaser.Tweens.Tween | null = null;

  const shade = (on: boolean): void => {
    const parts: Phaser.GameObjects.GameObject[] = target instanceof Phaser.GameObjects.Container ? target.list : [target];
    for (const part of parts) {
      const tintable = part as Partial<Pick<Phaser.GameObjects.Image, 'setTint' | 'clearTint'>>;
      if (on) tintable.setTint?.(PRESS_TINT);
      else tintable.clearTint?.();
    }
  };

  const step = (event: PressEvent, pointer?: Phaser.Input.Pointer): void => {
    const next = pressStep(state, event);
    if (next.state !== state) {
      tween?.stop();
      if (next.state === 'down') {
        base = target.scale;
        shade(true);
        tween = scene.tweens.add({ targets: target, scale: base * PRESS_SCALE, duration: 60 });
      } else {
        shade(false);
        tween = scene.tweens.add({ targets: target, scale: base, duration: 140, ease: 'Back.easeOut' });
      }
    }
    state = next.state;
    if (next.fire && pointer) {
      onTap(pointer);
      // La acción puede haber destruido la pieza (pasar de página, cerrar la ventana).
      if (!target.active) tween?.stop();
    }
  };

  target.on('pointerdown', (pointer: Phaser.Input.Pointer) => step('down', pointer));
  target.on('pointerup', (pointer: Phaser.Input.Pointer) => step('up', pointer));
  target.on('pointerout', () => step('out'));
}
```

Nota: `shade(false)` quita el tinte de todos los hijos. Por eso los iconos dentro de piezas pulsables van siempre en blanco (sin tinte propio) y se atenúan con `setAlpha`, no con tinte.

- [x] **Step 6: `widgets.ts`**

```ts
import * as Phaser from 'phaser';
import type { Vec } from '../core/movement';
import { addIcon, type IconName } from './icons';
import { coinTexture, panelTexture, pillTexture, ribbonTexture, shadowOf, tileTexture } from './paint';
import { makePressable } from './press';
import { PILL, UI, textStyle, type PillColor } from './theme';

type Tap = (pointer: Phaser.Input.Pointer) => void;

/** Centro de la moneda del contador, en pantalla. Ahí vuelan las monedas al dar de comer. */
export const HUD_COIN: Vec = { x: 38, y: 38 };

/** Las texturas llevan la sombra por debajo: el origen se sube para que (x, y) sea el centro del cuerpo. */
function centered(image: Phaser.GameObjects.Image, bodyH: number): Phaser.GameObjects.Image {
  return image.setOrigin(0.5, Math.round(bodyH) / 2 / image.height);
}

export function pillImage(scene: Phaser.Scene, w: number, h: number, color: PillColor, radius?: number): Phaser.GameObjects.Image {
  return centered(scene.add.image(0, 0, pillTexture(scene, w, h, color, radius)), h);
}

export function tileImage(scene: Phaser.Scene, w: number, h: number): Phaser.GameObjects.Image {
  return centered(scene.add.image(0, 0, tileTexture(scene, w, h)), h);
}

export function coinImage(scene: Phaser.Scene, diameter: number): Phaser.GameObjects.Image {
  return centered(scene.add.image(0, 0, coinTexture(scene, diameter)), diameter);
}

export interface PillOptions {
  color: PillColor;
  icon?: IconName;
  label?: string;
  /** Precio: dibuja una moneda y este texto detrás de la etiqueta. */
  coin?: string;
  /** Radio de las esquinas; por defecto, píldora. */
  radius?: number;
  onTap?: Tap;
}

/** Botón píldora. El contenido (icono, texto, moneda y precio) se encoge hasta caber. */
export function addPillButton(scene: Phaser.Scene, x: number, y: number, w: number, h: number, o: PillOptions): Phaser.GameObjects.Container {
  const button = scene.add.container(x, y);
  button.add(pillImage(scene, w, h, o.color, o.radius));
  const cy = -Math.round(h * 0.045); // el canto de abajo sube el centro visual
  const stroke = PILL[o.color].stroke;
  const texts: Phaser.GameObjects.Text[] = [];
  const marks: Phaser.GameObjects.Image[] = [];
  const row: (Phaser.GameObjects.Text | Phaser.GameObjects.Image)[] = [];
  const text = (value: string): void => {
    const item = scene.add.text(0, cy, value, textStyle(10, '#ffffff', stroke)).setOrigin(0, 0.5);
    texts.push(item);
    row.push(item);
  };
  if (o.icon) {
    const icon = addIcon(scene, 0, cy, o.icon, 10).setOrigin(0, 0.5);
    marks.push(icon);
    row.push(icon);
  }
  if (o.label) text(o.label);
  if (o.coin !== undefined) {
    const coin = coinImage(scene, Math.round(h * 0.56)).setOrigin(0, 0.5).setY(cy);
    marks.push(coin);
    row.push(coin);
    text(o.coin);
  }
  const alone = row.length === 1 && marks.length === 1;
  let size = Math.round(h * (alone ? 0.58 : 0.46));
  const lay = (): number => {
    for (const item of texts) item.setStyle(textStyle(size, '#ffffff', stroke));
    for (const mark of marks) mark.setDisplaySize(alone ? size : size * 1.1, alone ? size : size * 1.1);
    const gap = size * 0.3;
    const total = row.reduce((sum, item) => sum + item.displayWidth, 0) + gap * (row.length - 1);
    let cursor = -total / 2;
    for (const item of row) {
      item.setX(cursor);
      cursor += item.displayWidth + gap;
    }
    return total;
  };
  while (lay() > w * 0.84 && size > 10) size -= 2;
  button.add(row);
  button.setSize(w, h);
  if (o.onTap) makePressable(button, o.onTap);
  return button;
}

/** Panel crema. Se traga los toques para que no lleguen al velo de detrás. */
export function addPanel(scene: Phaser.Scene, x: number, y: number, w: number, h: number): Phaser.GameObjects.Image {
  const panel = centered(scene.add.image(x, y, panelTexture(scene, w, h)), h);
  scene.add.zone(x, y, w, h).setInteractive();
  return panel;
}

/** Cartel de título, pensado para montarse sobre el borde de arriba del panel. */
export function addRibbonTitle(scene: Phaser.Scene, x: number, y: number, w: number, h: number, text: string): Phaser.GameObjects.Container {
  const ribbon = scene.add.container(x, y);
  ribbon.add(centered(scene.add.image(0, 0, ribbonTexture(scene, w, h)), h));
  const label = scene.add.text(0, 0, '', textStyle(10)).setOrigin(0.5);
  ribbon.add(label);
  ribbon.setSize(w, h).setData('label', label).setDepth(25);
  setRibbonText(ribbon, text);
  return ribbon;
}

/** Cambia el texto del cartel y encoge la letra hasta que quepa. */
export function setRibbonText(ribbon: Phaser.GameObjects.Container, text: string): void {
  const label = ribbon.getData('label') as Phaser.GameObjects.Text;
  let size = Math.round(ribbon.height * 0.52);
  label.setText(text).setStyle(textStyle(size));
  while (label.width > ribbon.width * 0.88 && size > 12) {
    size -= 2;
    label.setStyle(textStyle(size));
  }
}

/** Chapa roja de cerrar. Se ve de `size` px, pero responde en al menos 64 px. */
export function addCloseBadge(scene: Phaser.Scene, x: number, y: number, onClose: () => void, size = 52): Phaser.GameObjects.Container {
  const badge = scene.add.container(x, y);
  badge.add(pillImage(scene, size, size, 'red'));
  badge.add(addIcon(scene, 0, -Math.round(size * 0.045), 'close', size * 0.56));
  const hit = Math.max(64, size);
  badge.setSize(hit, hit).setDepth(30);
  makePressable(badge, onClose);
  return badge;
}

/** Ficha blanca; pulsable si se le pasa `onTap`. */
export function addTile(scene: Phaser.Scene, x: number, y: number, w: number, h: number, onTap?: Tap): Phaser.GameObjects.Container {
  const tile = scene.add.container(x, y);
  tile.add(tileImage(scene, w, h));
  tile.setSize(w, h);
  if (onTap) makePressable(tile, onTap);
  return tile;
}

export interface CoinCounter {
  container: Phaser.GameObjects.Container;
  set(coins: number, pop?: boolean): void;
  label(): string;
}

/** Moneda y número. (x, y) es el centro de la moneda. */
export function addCoinCounter(scene: Phaser.Scene, x: number, y: number, size = 44): CoinCounter {
  const container = scene.add.container(x, y);
  const text = scene.add.text(size * 0.72, 0, '0', textStyle(Math.round(size * 0.8), '#ffffff', '#5a3210')).setOrigin(0, 0.5);
  container.add([coinImage(scene, size), text]);
  return {
    container,
    set(coins, pop = false) {
      text.setText(String(coins));
      if (!pop) return;
      scene.tweens.killTweensOf(container);
      container.setScale(1);
      scene.tweens.add({ targets: container, scale: 1.3, duration: 120, yoyo: true });
    },
    label: () => text.text,
  };
}

/** Velo verde oscuro translúcido que tapa el juego y bloquea los toques. */
export function addVeil(scene: Phaser.Scene, onTap?: () => void): Phaser.GameObjects.Rectangle {
  const veil = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, UI.veil, 0.4).setOrigin(0).setInteractive();
  if (onTap) veil.on('pointerup', onTap);
  return veil;
}

/** Texto centrado en x con un corazón amarillo detrás. */
export function addHeartLine(scene: Phaser.Scene, x: number, y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text {
  const size = parseInt(String(style.fontSize), 10);
  const label = scene.add.text(x - size * 0.6, y, text, style).setOrigin(0.5);
  addIcon(scene, label.x + label.width / 2 + size * 0.7, y, 'heart', size * 1.1, 0xffd23c);
  return label;
}

/** Superposiciones (tienda, comida, menú): al cambiar el tamaño de la pantalla se vuelven a montar. */
export function restartOnResize(scene: Phaser.Scene, data?: () => object): void {
  const restart = () => scene.scene.restart(data?.());
  scene.scale.once(Phaser.Scale.Events.RESIZE, restart);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, restart));
}

export { shadowOf };
```

- [x] **Step 7: Comprobar tipos**

Run: `npm run typecheck`
Expected: sin errores. Si Phaser 4 no expone `clearTint`, `setStyle` o `Textures.FilterMode.LINEAR` con ese nombre, buscar el equivalente en `node_modules/phaser/types/phaser.d.ts` y ajustar solo esa llamada.

- [x] **Step 8: Commit**

```bash
git add game/src/ui
git commit -m "feat: juego de piezas de la interfaz nueva (src/ui)"
```

---

## Bloque B — Arranque y título

### Task 4: Carga y título con el mismo fondo

**Files:**
- Create: `game/src/ui/titleBackdrop.ts`
- Modify: `game/src/scenes/BootScene.ts`, `game/src/scenes/PreloadScene.ts`, `game/src/scenes/TitleScene.ts`, `game/src/data/strings/es.ts`, `game/src/data/strings/en.ts`, `game/index.html`

**Interfaces:**
- Consumes: `loadUiFont`, `queueIcons`, `smoothIcons`, `smooth`, `pillImage`, `addPillButton`, `addHeartLine`, `restartOnResize`, `textStyle`, `UI`.
- Produces: `TITLE_BG`, `titleLayout(width, height)`, `addTitleBackdrop(scene)`.

- [x] **Step 1: `titleBackdrop.ts`**

```ts
import * as Phaser from 'phaser';
import { t } from '../data/strings';
import { UI, textStyle } from './theme';

export const TITLE_BG = 'title-bg';
/** Punto de la imagen (0 arriba, 1 abajo) que se conserva al recortar en pantallas alargadas. */
const FOCUS_Y = 0.42;

export interface TitleLayout {
  nameY: number;
  nameSize: number;
  buttonY: number;
  buttonW: number;
  buttonH: number;
}

/** Mismas medidas en la carga y en el título, para que el paso de una a otra no se note. */
export function titleLayout(width: number, height: number): TitleLayout {
  const buttonH = Phaser.Math.Clamp(height * 0.22, 56, 130);
  return {
    nameY: height * 0.24,
    nameSize: Math.round(Phaser.Math.Clamp(Math.min(height * 0.24, width * 0.11), 36, 130)),
    buttonY: height * 0.62,
    buttonW: Math.min(width * 0.6, buttonH * 3.2),
    buttonH,
  };
}

/** Fondo pintado a pantalla completa y el nombre del juego con doble contorno. */
export function addTitleBackdrop(scene: Phaser.Scene): TitleLayout {
  const { width, height } = scene.scale;
  const layout = titleLayout(width, height);
  scene.cameras.main.setBackgroundColor(UI.sky);
  if (scene.textures.exists(TITLE_BG)) {
    const bg = scene.add.image(width / 2, 0, TITLE_BG).setOrigin(0.5, 0);
    bg.setScale(Math.max(width / bg.width, height / bg.height));
    bg.setY(-(bg.displayHeight - height) * FOCUS_Y);
  }
  const name = t('title.name');
  const outer = textStyle(layout.nameSize, UI.logo, '#ffffff');
  scene.add.text(width / 2, layout.nameY, name, { ...outer, strokeThickness: Math.round(layout.nameSize * 0.3) }).setOrigin(0.5);
  scene.add.text(width / 2, layout.nameY, name, { ...textStyle(layout.nameSize, UI.logo, '#8a3b12'), strokeThickness: Math.round(layout.nameSize * 0.13) }).setOrigin(0.5);
  return layout;
}
```

«Zoo Esponji» no se traduce, así que da igual que el idioma aún no esté resuelto durante la carga.

- [x] **Step 2: `BootScene.ts`: cargar letra y fondo antes de seguir**

Añadir los imports:

```ts
import { withVersion } from '../core/cacheBust';
import { loadUiFont } from '../ui/font';
import { smooth } from '../ui/paint';
import { TITLE_BG } from '../ui/titleBackdrop';
```

Añadir el método `preload` antes de `create`, y sustituir `create`:

```ts
  preload(): void {
    this.load.image(TITLE_BG, withVersion('assets/ui/title-bg.webp'));
  }

  create(): void {
    this.makeTiles();
    this.makeKeeper();
    this.makeMarker();
    if (this.textures.exists(TITLE_BG)) smooth(this, TITLE_BG);
    // La letra tiene que estar antes del primer texto; si no llega en 2 s, se sigue sin ella.
    void loadUiFont().then(() => this.scene.start('Preload'));
  }
```

- [x] **Step 3: `PreloadScene.ts`: pantalla de carga**

Añadir los imports:

```ts
import { queueIcons, smoothIcons } from '../ui/icons';
import { addTitleBackdrop } from '../ui/titleBackdrop';
import { pillImage } from '../ui/widgets';
```

Añadir a la clase dos campos, sustituir `preload` entero y añadir `showProgress`:

```ts
  private bar: Phaser.GameObjects.Image | null = null;
  /** 0: mapas, sonido e iconos (hasta el 40 %). 1: arte (el resto). */
  private phase = 0;

  preload(): void {
    const { width } = this.scale;
    const layout = addTitleBackdrop(this);
    const trackH = layout.buttonH * 0.5;
    pillImage(this, layout.buttonW, trackH, 'sand').setPosition(width / 2, layout.buttonY);
    this.bar = pillImage(this, layout.buttonW - trackH * 0.3, trackH * 0.62, 'yellow').setPosition(width / 2, layout.buttonY - trackH * 0.03);
    this.phase = 0;
    this.showProgress(0);
    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => this.showProgress(this.phase === 0 ? value * 0.4 : 0.4 + value * 0.6));
    this.load.tilemapTiledJSON(MAPS.zoo, withVersion('assets/maps/zoo.tmj'));
    this.load.tilemapTiledJSON(MAPS.shop, withVersion('assets/maps/tienda.tmj'));
    this.load.image('logo', withVersion('logo.png'));
    queueIcons(this);
    queueAudio(this);
  }

  /** La barra nunca retrocede: se recorta la píldora amarilla de izquierda a derecha. */
  private showProgress(value: number): void {
    const bar = this.bar;
    if (!bar) return;
    bar.setCrop(0, 0, bar.width * Phaser.Math.Clamp(value, 0, 1), bar.height);
  }
```

En `create`, añadir como primera línea `smoothIcons(this);`.

En `loadArt`, marcar la segunda fase. Queda así:

```ts
  private async loadArt(): Promise<void> {
    const manifest = parseManifest(await fetchManifest());
    this.phase = 1;
    if (!manifest) {
      this.showProgress(1);
      setArt(null);
      void this.startSession();
      return;
    }
    queueArt(this, manifest);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      registerArtAnims(this, manifest);
      setArt(manifest);
      void this.startSession();
    });
    this.load.start();
  }
```

- [x] **Step 4: Textos: el corazón deja de ser emoji**

En `es.ts`: `'title.credits': 'Hecho por Daniela y Adrián',`
En `en.ts`: `'title.credits': 'Made by Daniela and Adrián',`

(`credits.madeBy` se cambia en la tarea 6, con Ajustes.)

- [x] **Step 5: `TitleScene.ts` entero**

```ts
import * as Phaser from 'phaser';
import { t } from '../data/strings';
import { sfx } from '../systems/audio';
import { textStyle } from '../ui/theme';
import { addTitleBackdrop } from '../ui/titleBackdrop';
import { addHeartLine, addPillButton, restartOnResize } from '../ui/widgets';

export class TitleScene extends Phaser.Scene {
  private started = false;

  constructor() {
    super('Title');
  }

  init(): void {
    this.started = false;
  }

  /** Texto del botón de jugar (para pruebas). */
  playLabel(): string {
    return t('title.play');
  }

  create(): void {
    const { width, height } = this.scale;
    const layout = addTitleBackdrop(this);

    // El botón va dentro de un contenedor que late; así el latido no pelea con el efecto al pulsar.
    const pulse = this.add.container(width / 2, layout.buttonY).setScale(0.8);
    pulse.add(addPillButton(this, 0, 0, layout.buttonW, layout.buttonH, { color: 'yellow', icon: 'play', label: t('title.play'), onTap: () => this.play() }));
    this.tweens.add({
      targets: pulse,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => this.tweens.add({ targets: pulse, scale: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' }),
    });

    const creditSize = Math.round(Math.max(16, height * 0.05));
    addHeartLine(this, width / 2, height * 0.89, t('title.credits'), textStyle(creditSize, '#ffffff', '#5a3210'));
    const copySize = Math.round(Math.max(11, height * 0.032));
    this.add
      .text(width / 2, height * 0.89 + creditSize * 1.05, t('credits.copyright'), { ...textStyle(copySize, '#ffffff', '#5a3210'), fontFamily: 'sans-serif', fontStyle: 'normal' })
      .setOrigin(0.5);
    restartOnResize(this);
  }

  private play(): void {
    if (this.started) return;
    this.started = true;
    sfx.unlock();
    this.scene.start('World');
    this.scene.launch('Hud');
  }
}
```

- [x] **Step 6: `index.html`: fondo azul cielo**

En el bloque `html, body`, cambiar `background: #1d2b1f;` por `background: #58b0f0;`.

- [x] **Step 7: Comprobar**

Run: `npm run typecheck`
Expected: sin errores.

Run: `npx vitest run tests/unit/content.test.ts tests/unit/strings.test.ts`
Expected: PASS.

A la vista: `npm run dev`, abrir `http://localhost:5173` con la ventana apaisada y comparar con `boceto-titulo.html`:
- Durante la carga: fondo pintado, nombre amarillo con doble contorno y barra amarilla que se llena de izquierda a derecha sin retroceder.
- Al terminar: el botón «Jugar» aparece donde estaba la barra, sin pantallazo oscuro ni cambio de fondo, y late.
- Al mantenerlo pulsado encoge y se oscurece; al soltar entra al juego.
- La letra es Baloo 2 (redonda y gorda), no la del sistema.

- [x] **Step 8: Commit**

```bash
git add game/src/ui/titleBackdrop.ts game/src/scenes/BootScene.ts game/src/scenes/PreloadScene.ts game/src/scenes/TitleScene.ts game/src/data/strings game/index.html
git commit -m "feat: pantalla de carga y título con el fondo pintado y el botón nuevo"
```

**PARAR — pruebas y nitidez.** David lanza `npm run typecheck`, `npm test` y `npm run test:e2e` (todo en verde: ningún e2e depende aún de textos cambiados). Además conviene instalar esta versión en el móvil (`npm run build`, `npx cap sync android`, `npx cap open android`, ▶ Run) y mirar la portada: si los bordes de la letra y de la píldora, o el fondo, se ven dentados o borrosos de forma molesta, anotarlo en la spec («Riesgo de nitidez») antes de seguir. El resto del plan no cambia por ello.

---

## Bloque C — Dentro del juego, Ajustes y ¿Salir?

### Task 5: Monedas, engranaje y aviso (`HudScene`)

**Files:**
- Modify: `game/src/scenes/HudScene.ts`, `game/src/systems/testHooks.ts`, `game/tests/e2e/*.spec.ts` (texto de monedas)
- Test: `game/tests/e2e/polish.spec.ts`

**Interfaces:**
- Consumes: `gearVisible` (tarea 1), `addCoinCounter`, `addPillButton`, `HUD_COIN`, `textStyle`.
- Produces: `HudScene.coinsLabel(): string` devuelve solo el número (`'25'`); `HudScene.gearVisible(): boolean`; hook `window.__ZOO__.hudGearVisible(): boolean`.

- [x] **Step 1: Escribir la prueba e2e que falla**

Al final de `game/tests/e2e/polish.spec.ts`:

```ts
test('el engranaje solo se ve andando por el zoo', async ({ page }) => {
  await startGame(page);
  const gear = () => page.evaluate(() => window.__ZOO__!.hudGearVisible());
  await expect.poll(gear).toBe(true);

  await page.evaluate(() => window.__ZOO__!.openFeed('bills'));
  await expect.poll(gear).toBe(false);
  await page.evaluate(() => window.__ZOO__!.back());
  await expect.poll(gear).toBe(true);

  await page.evaluate(() => window.__ZOO__!.openShop());
  await expect.poll(gear).toBe(false);
  await page.evaluate(() => window.__ZOO__!.openBook());
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.activeScenes())).toContain('Book');
  expect(await gear()).toBe(false);
  await page.evaluate(() => window.__ZOO__!.back()); // cierra el libro
  expect(await gear()).toBe(false); // sigue la tienda
  await page.evaluate(() => window.__ZOO__!.back()); // sale de la tienda
  await expect.poll(gear, { timeout: 15_000 }).toBe(true);

  await page.evaluate(() => window.__ZOO__!.openSettings());
  await expect.poll(gear).toBe(false);
});
```

- [x] **Step 2: Hook de pruebas**

En `game/src/systems/testHooks.ts`, en la interfaz `ZooTestApi`, tras `hudCoinsText(): string | null;`:

```ts
  /** El engranaje de ajustes se ve (solo andando por el zoo). */
  hudGearVisible(): boolean;
```

Y en el objeto, tras la línea de `hudCoinsText`:

```ts
    hudGearVisible: () => activeScene<HudScene>('Hud')?.gearVisible() ?? false,
```

- [x] **Step 3: `HudScene.ts`**

Cambiar los imports: quitar `import { textStyle } from './ui';` y añadir:

```ts
import { gearVisible } from '../core/hud';
import { textStyle } from '../ui/theme';
import { HUD_COIN, addCoinCounter, addPillButton, type CoinCounter } from '../ui/widgets';
```

Sustituir los campos `coinsText` y `gear`:

```ts
  private coins!: CoinCounter;
  private gear!: Phaser.GameObjects.Container;
```

En `create`, sustituir el bloque que crea `this.coinsText` (hasta `this.renderCoins(...)` incluido) por:

```ts
    this.coins = addCoinCounter(this, HUD_COIN.x, HUD_COIN.y);
    this.renderCoins(getSession().state.coins);
```

Sustituir la creación de `this.toastText` por:

```ts
    this.toastText = this.add
      .text(this.scale.width / 2, 90, '', textStyle(28))
      .setOrigin(0.5)
      .setDepth(50)
      .setVisible(false);
```

Sustituir el bloque del engranaje (comentario incluido) por:

```ts
    // Menú de ajustes: abajo a la izquierda (a la derecha están los botones de Android).
    this.gear = addPillButton(this, 0, 0, 56, 56, { color: 'blue', icon: 'gear', onTap: () => this.openSettings() });
    this.layout();
```

Sustituir `coinsLabel` y `renderCoins`, y añadir `gearVisible` y `update`:

```ts
  coinsLabel(): string {
    return this.coins.label();
  }

  gearVisible(): boolean {
    return this.gear.visible;
  }

  update(): void {
    this.gear.setVisible(gearVisible(this.scene.manager.getScenes(true).map((scene) => scene.scene.key)));
  }

  private renderCoins(coins: number, pop = false): void {
    this.coins.set(coins, pop);
  }
```

En `layout`, la posición del engranaje pasa a su centro:

```ts
    this.gear.setPosition(16 + 28, this.scale.height - 16 - 28);
```

En `onPointerDown`, el engranaje solo bloquea el joystick si se ve:

```ts
    if (this.gear.visible && this.gear.getBounds().contains(point.x, point.y)) return; // la rueda no arranca el joystick
```

- [x] **Step 4: Las pruebas e2e leen las monedas sin emoji**

En `tests/e2e/english.spec.ts`, `play.spec.ts`, `polish.spec.ts`, `smoke.spec.ts` y `zoo-grande.spec.ts`, sustituir cada `toBe('🪙 ` por `toBe('` (por ejemplo `toBe('🪙 25')` → `toBe('25')`).

Run: `grep -rn "🪙" tests/e2e`
Expected: ninguna línea.

- [x] **Step 5: Comprobar**

Run: `npm run typecheck`
Expected: sin errores.

Run: `npx playwright test tests/e2e/polish.spec.ts -g "engranaje"`
Expected: PASS.

A la vista (`npm run dev`, entrar a jugar): moneda dorada con «1» y número blanco arriba a la izquierda; engranaje azul redondo abajo a la izquierda que encoge al apretarlo y abre Ajustes.

- [x] **Step 6: Commit**

```bash
git add game/src/scenes/HudScene.ts game/src/systems/testHooks.ts game/tests/e2e
git commit -m "feat: monedas y engranaje nuevos; el engranaje solo se ve andando por el zoo"
```

### Task 6: Ajustes

**Files:**
- Modify: `game/src/scenes/SettingsScene.ts`, `game/src/data/strings/es.ts`, `game/src/data/strings/en.ts`

**Interfaces:**
- Consumes: piezas de `src/ui/`.
- Produces: se mantienen `togglePos`, `buttonPos`, `languagePos`, `languageLabel`; `creditsText()` devuelve solo `t('credits.madeBy')`.

- [x] **Step 1: Textos**

En `es.ts`: cambiar `'credits.madeBy'` a `'Hecho con cariño por Daniela y Adrián',` y **borrar** la línea de `'credits.art'`.
En `en.ts`: cambiar `'credits.madeBy'` a `'Made with love by Daniela and Adrián',` y **borrar** la línea de `'credits.art'`.

- [x] **Step 2: Imports y constantes de `SettingsScene.ts`**

Sustituir las líneas 1–25 (imports, `TOGGLES`, `FLAGS`, `OVERLAYS`, `ButtonKey`) por:

```ts
import { Capacitor } from '@capacitor/core';
import * as Phaser from 'phaser';
import type { Vec } from '../core/movement';
import type { ToggleKey } from '../core/save';
import { APP_VERSION } from '../core/version';
import { t, type StringKey } from '../data/strings';
import { sfx } from '../systems/audio';
import { getLanguage, otherLanguage, setLanguage } from '../systems/language';
import { openLegal } from '../systems/legal';
import { askQuit } from '../systems/platform';
import { getSession } from '../systems/session';
import { addIcon, type IconName } from '../ui/icons';
import { makePressable } from '../ui/press';
import { PILL, UI, textStyle, type PillColor } from '../ui/theme';
import { addCloseBadge, addHeartLine, addPanel, addPillButton, addRibbonTitle, addVeil, pillImage, restartOnResize } from '../ui/widgets';

const TOGGLES: readonly { key: ToggleKey; icon: IconName; label: StringKey }[] = [
  { key: 'music', icon: 'music', label: 'settings.music' },
  { key: 'sfx', icon: 'volume', label: 'settings.sfx' },
  { key: 'joystick', icon: 'joystick', label: 'settings.joystick' },
];

/** Ventanas que pueden estar abiertas debajo del menú; sus textos ya están pintados en el idioma anterior. */
const OVERLAYS = ['Book', 'Shop', 'Feed'] as const;

type ButtonKey = 'privacy' | 'quit';

const BUTTONS: Record<ButtonKey, { color: PillColor; icon: IconName }> = {
  privacy: { color: 'blue', icon: 'shield' },
  quit: { color: 'red', icon: 'door' },
};

interface Chip {
  color: PillColor;
  label: string;
  icon?: IconName;
  text?: string;
  dim?: boolean;
}
```

Actualizar el comentario de la clase a:

```ts
/**
 * Menú de ajustes: música, sonido, joystick, idioma, privacidad, salir y créditos.
 * Sin puerta parental: la privacidad se lee dentro del juego y nada lleva fuera de él.
 */
```

- [x] **Step 3: `create`**

Sustituir el método `create` entero por:

```ts
  create(): void {
    sfx.setPaused('menu', true);
    const { width, height } = this.scale;
    // Tocar fuera del panel cierra.
    addVeil(this, () => this.close());
    const panelW = Math.min(width * 0.88, height * 1.75, 820);
    const panelH = height * 0.84;
    const panelY = height * 0.55;
    const top = panelY - panelH / 2;
    addPanel(this, width / 2, panelY, panelW, panelH);
    addRibbonTitle(this, width / 2, top, Math.min(panelW * 0.5, 380), Phaser.Math.Clamp(height * 0.15, 44, 84), t('settings.title'));
    const badge = Phaser.Math.Clamp(height * 0.13, 44, 64);
    addCloseBadge(this, width / 2 + panelW / 2 - badge * 0.35, top + badge * 0.35, () => this.close(), badge);

    // Cuatro fichas en fila: los tres interruptores y el idioma.
    const slots = TOGGLES.length + 1;
    const size = Phaser.Math.Clamp(Math.min(height * 0.2, (panelW - 80) / (slots * 1.3)), 56, 140);
    const gap = Math.min(40, size * 0.4);
    const slotX = (i: number): number => width / 2 + (i - (slots - 1) / 2) * (size + gap);
    const rowY = height * 0.36;
    TOGGLES.forEach((toggle, i) => {
      const chip = this.add.container(slotX(i), rowY).setSize(size, size);
      makePressable(chip, () => void this.flip(toggle.key));
      this.toggles.set(toggle.key, chip);
      this.renderToggle(toggle.key);
    });
    this.language = this.add.container(slotX(TOGGLES.length), rowY).setSize(size, size);
    makePressable(this.language, () => void this.switchLanguage());
    this.paintChip(this.language, { color: 'blue', text: getLanguage().toUpperCase(), label: t('settings.language') });

    this.addButtons(height * 0.7, panelW);
    const creditSize = Math.round(Math.min(height * 0.045, panelW * 0.036));
    addHeartLine(this, width / 2, height * 0.82, t('credits.madeBy'), textStyle(creditSize, UI.brown, UI.cream));
    const footer = APP_VERSION ? `${t('credits.copyright')} · v${APP_VERSION}` : t('credits.copyright');
    const footerSize = Math.round(Math.max(10, Math.min(height * 0.03, panelW * 0.028)));
    this.add.text(width / 2, height * 0.9, footer, { fontFamily: 'sans-serif', fontSize: `${footerSize}px`, color: '#9a7a55' }).setOrigin(0.5);

    this.input.keyboard?.on('keydown-ESC', this.close, this);
    restartOnResize(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown-ESC', this.close, this));
  }
```

- [x] **Step 4: Resto de métodos**

`creditsText` queda:

```ts
  /** Texto de créditos visible (para pruebas). */
  creditsText(): string {
    return t('credits.madeBy');
  }
```

Sustituir `flip`, `renderToggle` y `paintToggle` por:

```ts
  private async flip(key: ToggleKey): Promise<void> {
    const session = getSession();
    await session.updateSettings({ [key]: !session.settings[key] });
    sfx.play('tap');
    this.renderToggle(key);
  }

  /** Encendido: ficha verde. Apagado: gris con el icono atenuado. */
  private renderToggle(key: ToggleKey): void {
    const chip = this.toggles.get(key);
    const toggle = TOGGLES.find((x) => x.key === key);
    if (!chip || !toggle) return;
    const on = getSession().settings[key];
    this.paintChip(chip, { color: on ? 'green' : 'gray', icon: toggle.icon, label: t(toggle.label), dim: !on });
    chip.setData('on', on);
  }

  /** Repinta una ficha cuadrada (el contenedor se conserva: es el que recibe los toques). */
  private paintChip(chip: Phaser.GameObjects.Container, o: Chip): void {
    const size = chip.width;
    const cy = -size * 0.04;
    chip.removeAll(true);
    chip.add(pillImage(this, size, size, o.color, size * 0.26));
    if (o.icon) chip.add(addIcon(this, 0, cy, o.icon, size * 0.56).setAlpha(o.dim ? 0.55 : 1));
    if (o.text) chip.add(this.add.text(0, cy, o.text, textStyle(Math.round(size * 0.4), '#ffffff', PILL[o.color].stroke)).setOrigin(0.5));
    chip.add(this.add.text(0, size * 0.72, o.label, textStyle(Math.round(size * 0.22), UI.brown, UI.cream)).setOrigin(0.5));
  }
```

`switchLanguage` no cambia.

Sustituir `addButtons` por:

```ts
  /** Privacidad siempre; Salir solo en la app (una web no se puede cerrar a sí misma). */
  private addButtons(y: number, panelW: number): void {
    const { width, height } = this.scale;
    const keys: ButtonKey[] = Capacitor.isNativePlatform() ? ['privacy', 'quit'] : ['privacy'];
    const h = Phaser.Math.Clamp(height * 0.13, 44, 72);
    const w = Math.min((panelW - 96) / 2, h * 4);
    keys.forEach((key, i) => {
      const x = width / 2 + (i - (keys.length - 1) / 2) * (w + 24);
      const button = addPillButton(this, x, y, w, h, { ...BUTTONS[key], label: t(`settings.${key}`), onTap: () => this.press(key) });
      this.buttons.set(key, button);
    });
  }
```

`press` no cambia. **Borrar** el método `addCredits` entero.

- [x] **Step 5: Comprobar**

Run: `npm run typecheck`
Expected: sin errores (si queda algún import sin usar, quitarlo).

Run: `npx vitest run tests/unit/content.test.ts tests/unit/strings.test.ts`
Expected: PASS.

Run: `npx playwright test tests/e2e/polish.spec.ts -g "menú"`
Expected: PASS (2 pruebas: sonido y créditos; privacidad).

A la vista, comparar con el boceto de Ajustes: orden interruptores → Privacidad → «Hecho con cariño…» con corazón → copyright; sin panda ni pantera; el joystick apagado sale gris; la ficha de idioma dice «ES» y al pulsarla pasa a «EN».

- [x] **Step 6: Commit**

```bash
git add game/src/scenes/SettingsScene.ts game/src/data/strings
git commit -m "feat: Ajustes con la interfaz nueva y sin la línea del panda y la pantera"
```

### Task 7: ¿Salir?

**Files:**
- Modify: `game/src/scenes/QuitScene.ts`, `game/src/data/strings/es.ts`, `game/src/data/strings/en.ts`, `game/src/systems/testHooks.ts`
- Test: `game/tests/e2e/polish.spec.ts`

**Interfaces:**
- Produces: `QuitScene.yesPos(): Vec` (botón que sale), `QuitScene.stayPos(): Vec`; hook `quitStayPos(): Vec | null`; claves `quit.stay`, `quit.leave`.

- [x] **Step 1: Prueba e2e que falla**

En `polish.spec.ts`, sustituir la prueba `'botón atrás en el mundo pregunta "¿Salir?" y ❌ vuelve al juego'` por:

```ts
test('botón atrás en el mundo pregunta si salir; atrás o «Seguir jugando» vuelven al juego', async ({ page }) => {
  await startGame(page);
  expect(await page.evaluate(() => window.__ZOO__!.back())).toBe('ask-quit');
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('Quit'));
  expect(await page.evaluate(() => window.__ZOO__!.back())).toBe('close-quit');
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('World'));

  await page.evaluate(() => window.__ZOO__!.back());
  await page.waitForFunction(() => window.__ZOO__!.quitStayPos() !== null);
  await tap(page, await page.evaluate(() => window.__ZOO__!.quitStayPos()));
  await page.waitForFunction(() => {
    const scenes = window.__ZOO__!.activeScenes();
    return scenes.includes('World') && !scenes.includes('Quit');
  });
});
```

- [x] **Step 2: Hook**

En `testHooks.ts`: añadir `import type { QuitScene } from '../scenes/QuitScene';`, en la interfaz:

```ts
  /** Con «¿Salir?» abierto: dónde está el botón de seguir jugando. */
  quitStayPos(): Vec | null;
```

y en el objeto:

```ts
    quitStayPos: () => activeScene<QuitScene>('Quit')?.stayPos() ?? null,
```

- [x] **Step 3: Textos**

En `es.ts`: `'quit.ask': '¿Salir del zoo?',` y, debajo, añadir:

```ts
  'quit.stay': 'Seguir jugando',
  'quit.leave': 'Salir',
```

En `en.ts`: `'quit.ask': 'Leave the zoo?',` y, debajo:

```ts
  'quit.stay': 'Keep playing',
  'quit.leave': 'Quit',
```

- [x] **Step 4: `QuitScene.ts` entero**

```ts
import * as Phaser from 'phaser';
import type { Vec } from '../core/movement';
import { t } from '../data/strings';
import { sfx } from '../systems/audio';
import { addPanel, addPillButton, addRibbonTitle, addVeil, restartOnResize } from '../ui/widgets';

export interface QuitSceneData {
  /** Guarda y cierra la app. */
  onConfirm: () => void;
}

/** «¿Salir del zoo?»: seguir jugando (grande, verde) o salir (rojo). Se abre con atrás en Android o con «Salir» en ajustes. */
export class QuitScene extends Phaser.Scene {
  private onConfirm: () => void = () => {};
  private yes!: Phaser.GameObjects.Container;
  private stay!: Phaser.GameObjects.Container;

  constructor() {
    super('Quit');
  }

  init(data: QuitSceneData): void {
    if (data?.onConfirm) this.onConfirm = data.onConfirm;
  }

  create(): void {
    const { width, height } = this.scale;
    if (this.scene.isActive('World')) this.scene.pause('World');
    addVeil(this, () => this.close());
    const panelW = Math.min(width * 0.8, 600);
    const panelH = height * 0.56;
    const panelY = height * 0.56;
    addPanel(this, width / 2, panelY, panelW, panelH);
    addRibbonTitle(this, width / 2, panelY - panelH / 2, Math.min(panelW * 0.8, 440), Phaser.Math.Clamp(height * 0.15, 44, 84), t('quit.ask'));

    const stayH = Phaser.Math.Clamp(height * 0.19, 52, 96);
    const stayW = Math.min(panelW * 0.54, stayH * 3.8);
    const leaveH = stayH * 0.78;
    const leaveW = Math.min(panelW * 0.3, leaveH * 2.6);
    const gap = panelW * 0.04;
    const left = width / 2 - (stayW + gap + leaveW) / 2;
    const y = panelY + panelH * 0.08;
    this.stay = addPillButton(this, left + stayW / 2, y, stayW, stayH, { color: 'green', icon: 'play', label: t('quit.stay'), onTap: () => this.close() });
    this.yes = addPillButton(this, left + stayW + gap + leaveW / 2, y, leaveW, leaveH, { color: 'red', label: t('quit.leave'), onTap: () => this.onConfirm() });
    restartOnResize(this);
  }

  /** Botón que confirma la salida. */
  yesPos(): Vec {
    return { x: this.yes.x, y: this.yes.y };
  }

  stayPos(): Vec {
    return { x: this.stay.x, y: this.stay.y };
  }

  close(): void {
    if (!this.scene.isActive()) return;
    sfx.play('tap');
    this.scene.stop();
    this.scene.resume('World');
  }
}
```

- [x] **Step 5: Comprobar**

Run: `npm run typecheck`
Expected: sin errores.

Run: `npx vitest run tests/unit/content.test.ts tests/unit/strings.test.ts`
Expected: PASS.

Run: `npx playwright test tests/e2e/polish.spec.ts -g "salir"`
Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add game/src/scenes/QuitScene.ts game/src/data/strings game/src/systems/testHooks.ts game/tests/e2e/polish.spec.ts
git commit -m "feat: «¿Salir del zoo?» con botones de seguir jugando y salir"
```

**PARAR — pruebas.** David lanza `npm run typecheck`, `npm test` y `npm run test:e2e`. Todo en verde antes de seguir.

---

## Bloque D — Dar de comer, libro y tienda

### Task 8: Dar de comer

**Files:**
- Modify: `game/src/scenes/FeedScene.ts`

**Interfaces:**
- Consumes: `HUD_COIN`, `addCloseBadge`, `addPanel`, `addRibbonTitle`, `addTile`, `addVeil`, `restartOnResize`, `sceneryTexture`, `textStyle`.
- Produces: sin cambios en la API de la escena (`targetsOnScreen`, `isBusy`, `close`).

- [x] **Step 1: Imports y destino de las monedas**

Sustituir `import { addCloseButton, restartOnResize, textStyle } from './ui';` por:

```ts
import { sceneryTexture } from '../ui/paint';
import { textStyle } from '../ui/theme';
import { HUD_COIN, addCloseBadge, addPanel, addRibbonTitle, addTile, addVeil, restartOnResize } from '../ui/widgets';
```

Borrar la constante `COIN_TARGET` y su comentario. En `flyCoins`, sustituir `COIN_TARGET.x` y `COIN_TARGET.y` por `HUD_COIN.x` y `HUD_COIN.y`.

- [x] **Step 2: Cabecera de `create`**

Sustituir desde `const { width, height } = this.scale;` hasta `restartOnResize(this);` (ambos incluidos) por:

```ts
    const { width, height } = this.scale;

    // El velo bloquea los toques al mundo.
    addVeil(this);
    const panelW = Math.min(width * 0.88, 780);
    const panelH = height * 0.86;
    const panelY = height * 0.55;
    const top = panelY - panelH / 2;
    addPanel(this, width / 2, panelY, panelW, panelH);
    // Ventana con cielo y prado donde se asoma el animal.
    this.add.image(width / 2, height * 0.37, sceneryTexture(this, panelW * 0.9, height * 0.44));
    this.animal = animalPortrait(this, this.animalId, width / 2, height * 0.37, height * 0.3, this.look);
    this.baseScale = this.animal.scaleX;
    const title = t(`book.page.${this.residentId}.title` as StringKey);
    addRibbonTitle(this, width / 2, top, Math.min(panelW * 0.6, 440), Phaser.Math.Clamp(height * 0.14, 40, 80), title);
    this.speech = this.add
      .text(width / 2 + height * 0.22, height * 0.2, '', textStyle(Math.round(height * 0.06), '#ffffff', '#4e342e'))
      .setOrigin(0.5)
      .setDepth(15)
      .setVisible(false);

    this.createTray(width, height, panelW);
    const badge = Phaser.Math.Clamp(height * 0.13, 44, 64);
    addCloseBadge(this, width / 2 + panelW / 2 - badge * 0.35, top + badge * 0.35, () => this.close(), badge);
    restartOnResize(this);
```

- [x] **Step 3: Bandeja: cada comida en su ficha**

Sustituir `createTray` por:

```ts
  private createTray(width: number, height: number, panelW: number): void {
    const tray = trayFoods(this.animalId);
    const size = Phaser.Math.Clamp(Math.round(height * 0.12), 56, 96);
    const tile = Math.round(size * 1.45);
    const trayY = height * 0.79;
    const gap = Math.min((panelW * 0.9) / tray.length, tile * 1.2);
    tray.forEach((id, index) => {
      const x = width / 2 + (index - (tray.length - 1) / 2) * gap;
      // La ficha es solo el hueco: la comida se arrastra, no se pulsa.
      addTile(this, x, trayY, tile, tile);
      const icon = getArt()?.foods[id];
      // Icono del pack con escala entera (nítido); si no hay, el emoji.
      const food: Food = icon
        ? this.add.image(x, trayY, foodKey(id)).setScale(Math.max(1, Math.floor(size / icon.height)))
        : this.add.text(x, trayY, FOODS[id].emoji, { fontSize: `${size}px` }).setOrigin(0.5);
      food.setInteractive({ draggable: true, useHandCursor: true });
      food.setData('food', id);
      food.setData('baseScale', food.scaleX);
      this.foods.set(id, food);
      this.homes.set(id, { x, y: trayY });
    });
  }
```

- [x] **Step 4: Comprobar**

Run: `npm run typecheck`
Expected: sin errores.

Run: `npx playwright test tests/e2e/smoke.spec.ts tests/e2e/play.spec.ts`
Expected: PASS (dar de comer arrastrando sigue funcionando y las monedas suben).

A la vista, comparar con el boceto «Dar de comer»: nombre del animal en el cartel, animal dentro de la ventana de cielo y prado, comidas sobre fichas blancas, chapa roja en la esquina del panel. Arrastrar una comida al animal y comprobar que las monedas vuelan hasta la moneda del contador.

- [x] **Step 5: Commit**

```bash
git add game/src/scenes/FeedScene.ts
git commit -m "feat: dar de comer con panel, cartel y fichas de la interfaz nueva"
```

### Task 9: Libro

**Files:**
- Modify: `game/src/scenes/BookScene.ts`

**Interfaces:**
- Consumes: `addCloseBadge`, `addPanel`, `addPillButton`, `addRibbonTitle`, `setRibbonText`, `addVeil`, `pillImage`, `tileImage`, `makePressable`, `restartOnResize`, `textStyle`.
- Produces: sin cambios en la API (`pageId`, `pageText`, `indexPos`, `next`, `prev`, `close`).

El libro sigue siendo una página por pantalla. Cambia el marco, el encabezado pasa al cartel, las filas del índice son píldoras y las flechas son botones azules.

- [x] **Step 1: Imports y campos**

Sustituir `import { addCloseButton, restartOnResize, textStyle } from './ui';` por:

```ts
import { makePressable } from '../ui/press';
import { textStyle } from '../ui/theme';
import { addCloseBadge, addPanel, addPillButton, addRibbonTitle, addVeil, pillImage, restartOnResize, setRibbonText, tileImage } from '../ui/widgets';
```

Cambiar el campo `arrows` y añadir `ribbon`:

```ts
  private arrows: Phaser.GameObjects.Container[] = [];
  private ribbon!: Phaser.GameObjects.Container;
```

- [x] **Step 2: Marco en `create`**

Sustituir desde `this.add.rectangle(0, 0, width, height, 0x000000, 0.65)...` hasta `addCloseButton(this, () => this.close());` (ambos incluidos) por:

```ts
    addVeil(this);

    const panelH = height * 0.84;
    const panelW = Math.min(width * 0.78, panelH * 1.3);
    const panelY = height * 0.55;
    this.panel = new Phaser.Geom.Rectangle(width / 2 - panelW / 2, panelY - panelH / 2, panelW, panelH);
    addPanel(this, width / 2, panelY, panelW, panelH);
    // El encabezado de cada página va en el cartel.
    this.ribbon = addRibbonTitle(this, width / 2, this.panel.y, panelW * 0.76, Phaser.Math.Clamp(height * 0.14, 40, 80), '');

    const arrowSize = Math.round(Phaser.Math.Clamp(height * 0.14, 48, 88));
    this.arrows = [
      addPillButton(this, this.panel.x - arrowSize * 0.7, height / 2, arrowSize, arrowSize, { color: 'blue', icon: 'left', onTap: () => this.turn(-1) }).setDepth(20),
      addPillButton(this, this.panel.right + arrowSize * 0.7, height / 2, arrowSize, arrowSize, { color: 'blue', icon: 'right', onTap: () => this.turn(1) }).setDepth(20),
    ];

    const badge = Phaser.Math.Clamp(height * 0.13, 44, 64);
    addCloseBadge(this, this.panel.right - badge * 0.35, this.panel.y + badge * 0.35, () => this.close(), badge);
```

**Borrar** el método privado `arrow(...)` entero.

- [x] **Step 3: Encabezado al cartel**

Sustituir `heading` por:

```ts
  private heading(text: string): void {
    setRibbonText(this.ribbon, text);
  }
```

Y ajustar sus tres llamadas:
- en `showIndex`: `this.heading(t('book.index.title'));`
- en `showDivider`: `this.heading(t(chapterTitleKey(page.chapter)));`
- en `showContent`: `this.heading(unlocked ? t(pageTitleKey(page.id)) : t('book.locked'));`

- [x] **Step 4: Filas del índice como píldoras**

En `showIndex`, sustituir desde `const rowH = ...` hasta el final del `forEach` por:

```ts
    const rowH = (p.height * 0.78) / chapters.length;
    const rowW = p.width * 0.82;
    const top = p.y + p.height * 0.14;
    chapters.forEach((chapter, i) => {
      const y = top + i * rowH + rowH / 2;
      const { n, total } = chapterProgress(state, chapter);
      const row = this.add.container(p.centerX, y).setSize(rowW, rowH * 0.82);
      row.add(pillImage(this, rowW, rowH * 0.82, 'sand'));
      const edge = rowW / 2 - rowW * 0.07;
      const rowSize = Math.round(Math.min(size * 0.85, rowH * 0.4));
      row.add(this.add.text(-edge, 0, t(chapterTitleKey(chapter)), textStyle(rowSize, '#5d4037', '#ffe9b8')).setOrigin(0, 0.5));
      row.add(this.add.text(edge, 0, t('book.count', { n, total }), textStyle(Math.round(rowSize * 0.75), '#8d6e63', '#ffe9b8')).setOrigin(1, 0.5));
      // Un deslizamiento pasa página; solo un toque abre el capítulo.
      makePressable(row, (pointer) => {
        if (pointer.getDistance() <= SWIPE_PX) this.goTo(chapterPageId(chapter));
      });
      this.content.push(row);
      this.indexRows.set(chapter, { x: p.centerX, y });
    });
```

- [x] **Step 5: Dibujo más arriba y en ficha girada**

En `showDivider` y en `showContent`, la llamada a `this.picture(...)` pasa de `p.y + p.height * 0.47, p.height * 0.36` a `p.y + p.height * 0.4, p.height * 0.4` (el encabezado ya no ocupa sitio dentro de la página).

En `picture`, sustituir el bloque del marco (desde el comentario `// Marco tipo cromo detrás del dibujo.` hasta `this.children.moveBelow(frame, obj);`) por:

```ts
    // Cromo: ficha blanca un poco girada detrás del dibujo.
    const frame = tileImage(this, obj.displayWidth + 30, obj.displayHeight + 30).setPosition(x, y).setAngle(-3);
    this.children.moveBelow(frame, obj);
```

- [x] **Step 6: Comprobar**

Run: `npm run typecheck`
Expected: sin errores (quitar `size` de `showDivider`/`showContent` solo si deja de usarse; en ambos se sigue usando para el texto).

Run: `npx playwright test tests/e2e/zoo-grande.spec.ts tests/e2e/shop.spec.ts`
Expected: PASS (abrir un capítulo desde el índice y pasar página siguen funcionando).

A la vista (abrir el libro desde la estantería de la tienda): cartel con el nombre de la página, flechas azules a los lados que se esconden en la primera y la última página, filas del índice que encogen al apretarlas, deslizar sigue pasando página.

- [x] **Step 7: Commit**

```bash
git add game/src/scenes/BookScene.ts
git commit -m "feat: libro del zoo con panel, cartel, índice en píldoras y flechas nuevas"
```

### Task 10: Tienda y retirada de `scenes/ui.ts`

**Files:**
- Modify: `game/src/scenes/ShopScene.ts`, `game/src/world/ShopInterior.ts`, `game/src/data/strings/es.ts`, `game/src/data/strings/en.ts`, `game/tests/unit/content.test.ts`
- Delete: `game/src/scenes/ui.ts`

**Interfaces:**
- Consumes: `addCloseBadge`, `addPillButton` (opción `coin`), `restartOnResize`, `textStyle`.
- Produces: `shop.buy` ya no lleva `{cost}`. Tras esta tarea nadie importa `scenes/ui`.

- [x] **Step 1: Prueba unitaria del texto (falla)**

En `tests/unit/content.test.ts`: `expect(t('shop.buy', { cost: 50 })).toBe('¡Comprar! 🪙 50');` pasa a `expect(t('shop.buy')).toBe('¡Comprar!');`, y `expect(t('shop.buy', { cost: 50 })).toBe('Buy! 🪙 50');` pasa a `expect(t('shop.buy')).toBe('Buy!');`.

Run: `npx vitest run tests/unit/content.test.ts`
Expected: FAIL en esas dos comprobaciones.

- [x] **Step 2: Textos**

En `es.ts`: `'shop.buy': '¡Comprar!',`. En `en.ts`: `'shop.buy': 'Buy!',`.

Run: `npx vitest run tests/unit/content.test.ts`
Expected: PASS.

- [x] **Step 3: Imports**

En `ShopScene.ts`, sustituir `import { addCloseButton, restartOnResize, textStyle } from './ui';` por:

```ts
import { textStyle } from '../ui/theme';
import { addCloseBadge, addPillButton, restartOnResize } from '../ui/widgets';
```

En `src/world/ShopInterior.ts`, sustituir `import { textStyle } from '../scenes/ui';` por `import { textStyle } from '../ui/theme';`.

- [x] **Step 4: Botón de cerrar**

En `create`, sustituir `addCloseButton(this, () => this.close());` por:

```ts
    addCloseBadge(this, width - 16 - 32, 16 + 32, () => this.close(), 56).setDepth(4000);
```

- [x] **Step 5: Sello de agotado y etiqueta de precio**

En `addProduct`, sustituir el bloque `if (done) { ... } else { ... }` (el que crea `stamp` o `sign`) por:

```ts
    // Como en otras tiendas: se compra → precio; no quedan → sello AGOTADO sobre el animal en gris.
    if (done) {
      const stampH = Math.round(Math.max(24, 9 * s));
      parts.push(addPillButton(this, pos.x, pos.y - 12 * s, stampH * 4.2, stampH, { color: 'red', label: t('shop.soldOut') }).setAngle(-12).setDepth(1500));
    } else {
      const cost = String(entry.cost);
      const signH = Math.round(Math.max(26, 11 * s));
      const signW = signH * (1.9 + 0.36 * cost.length);
      parts.push(addPillButton(this, pos.x, pos.y + 12 * s + signH / 2, signW, signH, { color: affordable ? 'green' : 'gray', coin: cost }).setDepth(1500));
    }
```

- [x] **Step 6: Bocadillo de compra**

Sustituir el cuerpo de `showBuyBubble` por:

```ts
    const s = this.interior.layout.scale;
    const entry = product.entry;
    const affordable = getSession().state.coins >= entry.cost;
    const h = Math.round(Math.max(40, 15 * s));
    const w = h * 4.4;
    const lift = entry.kind === 'extra' ? 12 * s : 0; // por encima de la chapita ➕ n/max
    const y = Math.max(h / 2 + 4, product.animal.y - product.animal.displayHeight - 8 * s - h / 2 - lift);
    const bubble = addPillButton(this, product.hit.x, y, w, h, {
      color: affordable ? 'green' : 'gray',
      label: t('shop.buy'),
      coin: String(entry.cost),
      onTap: (pointer) => {
        if (this.isTap(pointer)) void this.onBuy(entry);
      },
    })
      .setDepth(3100)
      .setScale(0);
    this.tweens.add({ targets: bubble, scale: 1, duration: 200, ease: 'Back.Out' });
    this.tweens.add({ targets: bubble, y: y - 2 * s, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 200 });
    this.buyBubble = bubble;
```

(El comentario de documentación del método se conserva.)

- [x] **Step 7: Retirar el archivo viejo**

Run: `grep -rn "scenes/ui'\|from './ui'" src`
Expected: ninguna línea. Si queda alguna, cambiar ese import a `../ui/theme` o `../ui/widgets` según lo que use.

Run: `git rm src/scenes/ui.ts`

- [x] **Step 8: Comprobar**

Run: `npm run typecheck`
Expected: sin errores.

Run: `npx playwright test tests/e2e/shop.spec.ts tests/e2e/polish.spec.ts`
Expected: PASS (comprar con el bocadillo, sello AGOTADO, cerrar la tienda, engranaje oculto).

A la vista, comparar con el boceto «Tienda»: chapa roja arriba a la derecha, precios en píldoras verdes con moneda (grises si no llega el dinero), bocadillo «¡Comprar! (moneda) 50» que encoge al apretarlo, y sin engranaje.

- [x] **Step 9: Commit**

```bash
git add -A game/src game/tests/unit/content.test.ts
git commit -m "feat: tienda con cerrar, precios y compra nuevos; se retira scenes/ui.ts"
```

**PARAR — pruebas.** David lanza `npm run typecheck`, `npm test` y `npm run test:e2e`. Todo en verde antes de seguir.

---

## Bloque E — Android

### Task 11: Modo inmersivo y splash azul cielo

**Files:**
- Modify: `game/android/app/src/main/java/com/davidpladel/zooesponji/MainActivity.java`, `game/android/app/src/main/res/values/styles.xml`, `game/store/make_icon.py`, `game/android/app/src/main/res/drawable*/splash.png` (11, regenerados)
- Create: `game/store/fonts/Baloo2.ttf`, `game/store/fonts/OFL.txt`

**Interfaces:**
- Produces: nada que use otro código.

No hay prueba automática: se comprueba en el móvil.

- [x] **Step 1: `MainActivity.java` entero**

```java
package com.davidpladel.zooesponji;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        hideSystemBars();
    }

    /** Android restaura las barras al volver a la app o al cerrar un diálogo: se esconden otra vez. */
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    /**
     * Modo inmersivo: sin barra de estado ni de navegación mientras se juega, para no tocarlas
     * sin querer al andar. Reaparecen un momento al deslizar desde el borde.
     */
    private void hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }
}
```

- [x] **Step 2: Color del splash del sistema**

En `styles.xml`, dentro de `AppTheme.NoActionBarLaunch`: `<item name="windowSplashScreenBackground">#58B0F0</item>`.

- [x] **Step 3: Letra para el script del splash**

Pillow no lee `.woff2`: hace falta el `.ttf`. Desde `game/` (PowerShell):

```powershell
New-Item -ItemType Directory -Force store/fonts
Invoke-WebRequest -Uri "https://github.com/google/fonts/raw/main/ofl/baloo2/Baloo2%5Bwght%5D.ttf" -OutFile "store/fonts/Baloo2.ttf"
Invoke-WebRequest -Uri "https://github.com/google/fonts/raw/main/ofl/baloo2/OFL.txt" -OutFile "store/fonts/OFL.txt"
```

Expected: `store/fonts/Baloo2.ttf` (fuente variable, varios cientos de KB) y `OFL.txt`.

- [x] **Step 4: `make_icon.py`: fondo azul y letra nueva**

Debajo de la línea `FONT = 'C:/Windows/Fonts/ariblk.ttf'`, añadir:

```python
SPLASH_FONT = 'fonts/Baloo2.ttf'  # variable; se fija el peso 800
SKY = (88, 176, 240, 255)  # #58B0F0, el cielo de la portada
```

Sustituir la función `splash` y su comentario por:

```python
    # Splash: azul cielo de la portada + león + título
    def splash(w, h, path):
        im = Image.new('RGBA', (w, h), SKY)
        side = int(min(w, h) * 0.56)
        canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        place(canvas, lion_img, 0.96)
        im.alpha_composite(canvas, ((w - side) // 2, int(h * 0.5 - side * 0.66)))
        d = ImageDraw.Draw(im)
        f = ImageFont.truetype(SPLASH_FONT, int(min(w, h) * 0.12))
        f.set_variation_by_axes([800])
        d.text((w / 2, h * 0.5 + side * 0.6), 'Zoo Esponji', font=f, fill=(255, 210, 60), anchor='mm',
               stroke_width=max(2, int(min(w, h) * 0.014)), stroke_fill=(138, 59, 18))
        im.convert('RGB').save(path)
```

- [x] **Step 5: Regenerar**

Run (desde `game/store/`): `python make_icon.py`
Expected: `ok`.

Run: `git status --short`
Expected: cambian los 11 `splash.png`. Si también aparecen como modificados iconos (`mipmap-*`, `play/icono-512.png`, `out/…`) sin que se vean distintos, deshacerlos con `git checkout -- <ruta>`: aquí solo se cambia el splash.

Abrir `android/app/src/main/res/drawable-land-xhdpi/splash.png` y comprobar: fondo azul cielo, león y «Zoo Esponji» en letra redonda amarilla con contorno marrón.

- [x] **Step 6: Commit**

```bash
git add game/android/app/src/main/java game/android/app/src/main/res game/store/make_icon.py game/store/fonts
git commit -m "feat: modo inmersivo en Android y splash azul cielo con la letra nueva"
```

**PARAR — móvil.** David instala la versión (`npm run build`, `npx cap sync android`, `npx cap open android`, ▶ Run) y comprueba:
- Arranque: splash azul → carga → título, sin pantallazos oscuros ni saltos de color.
- Las barras de Android no se ven al andar; aparecen al deslizar desde el borde y se van solas; siguen ocultas al volver a la app desde otra.
- No queda una franja negra en el lado de la cámara frontal.
- El botón atrás sigue abriendo «¿Salir del zoo?».
- Todas las pantallas en español y en inglés: ningún texto cortado ni fuera de su botón.

---

## Bloque F — Cierre

### Task 12: Documentación al día

**Files:**
- Modify: `README.md`, `game/README.md`, `docs/superpowers/specs/2026-10-06-interfaz-nueva-design.md`, este plan

- [x] **Step 1: Spec**

En la primera línea de estado de la spec, cambiar «diseño aprobado, sin implementar» por «implementada (fecha de hoy); pendiente de publicar». Añadir al final una sección `## Decisiones tomadas durante la implementación` con una línea por cada cosa que se haya hecho distinta de lo escrito (nombres de API de Phaser ajustados, iconos de Tabler sustituidos, resultado de la comprobación de nitidez en el móvil).

- [x] **Step 2: `game/README.md`**

En «Comandos», añadir bajo `npm run build`:

```bash
npm run make:ui-assets # copia la letra y los iconos de la interfaz a public/ (solo si cambian)
```

Actualizar el número de pruebas e2e de esa lista (suma una: la del engranaje). En el párrafo «Icono y ficha de Play», añadir que el splash usa `store/fonts/Baloo2.ttf` y el azul cielo `#58B0F0`. Añadir una sección corta:

```markdown
## Interfaz

Las piezas de los menús (píldoras, paneles, carteles, chapa de cerrar, monedas) están en `src/ui/`. Se pintan con Canvas 2D en texturas porque el juego usa `pixelArt: true`. Todo botón pasa por `makePressable` (`src/ui/press.ts`), que le da el efecto al pulsar. Los bocetos de referencia están en `docs/superpowers/mockups/`.
```

- [x] **Step 3: `README.md` raíz**

En la tabla de versiones y el roadmap, añadir la interfaz nueva como trabajo terminado en la rama `interfaz-nueva`, pendiente de versión (la siguiente a la 2.4.0) y de capturas nuevas para Google Play.

- [x] **Step 4: Este plan**

Marcar las casillas hechas y actualizar la línea **Estado** de la cabecera.

- [x] **Step 5: Commit**

```bash
git add README.md game/README.md docs/superpowers
git commit -m "docs: interfaz nueva implementada; README, spec y plan al día"
```
