import { expect, test, type Page, type Route } from '@playwright/test';

// Aviso para actualizar (spec 2026-11-19-actualizacion-obligatoria). En el navegador no hay Play: se usa uno falso
// (`updateFake`) y un servidor de comunidad falso que lleva la clave `actualizacion`.

const BASE = 'https://comunidad.test';
const SMALL = { minima: 10, ultima: 14, grande: false };
const BIG = { minima: 10, ultima: 14, grande: true };
const BROKEN = { minima: 13, ultima: 14, grande: false };

type Key = typeof SMALL;
type Result = 'actualizada' | 'cancelada' | 'fallo' | 'no-disponible';
interface FakePlay { available?: boolean; allowed?: boolean; versionCode?: number; results?: Result[]; today?: string }

async function fakeServer(page: Page, key: Key, offline = false): Promise<void> {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };
  // Sin votación: así no sale el aviso del tablón por medio.
  const status = { hoy: '2026-11-20', ideas: 3, votacion: null, muro: [], actualizacion: key };
  await page.route(`${BASE}/**`, async (route: Route) => {
    if (offline) return route.abort('internetdisconnected');
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (new URL(request.url()).pathname === '/estado.php') return route.fulfill({ status: 200, headers: cors, json: status });
    return route.fulfill({ status: 404, headers: cors, body: '' });
  });
}

async function canvasBox(page: Page) {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('No hay canvas');
  return box;
}

async function click(page: Page, pos: { x: number; y: number } | null): Promise<void> {
  if (!pos) throw new Error('No hay dónde tocar');
  const box = await canvasBox(page);
  await page.mouse.click(box.x + pos.x, box.y + pos.y);
}

const scenes = (page: Page) => page.evaluate(() => window.__ZOO__!.activeScenes());
const state = (page: Page) => page.evaluate(() => window.__ZOO__!.updateState());
const mode = async (page: Page) => (await state(page)).mode;
const log = (page: Page) => page.evaluate(() => window.__ZOO__!.busLog());
const pos = (page: Page, key: 'yes' | 'no' | 'exit') => page.evaluate((k) => window.__ZOO__!.updatePos(k), key);

/** Abre el juego en el título, con Play falso, y monta el tablón (la respuesta trae la clave). */
async function atTitle(page: Page, key: Key, play: FakePlay = {}, offline = false): Promise<void> {
  await fakeServer(page, key, offline);
  await page.goto('/?sin-tutorial');
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
  await page.evaluate((o) => window.__ZOO__!.updateFake(o), play);
  await page.evaluate((b) => window.__ZOO__!.communityStart(b), BASE);
}

async function play(page: Page): Promise<void> {
  const box = await canvasBox(page);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.62);
  await page.waitForFunction(() => {
    const s = window.__ZOO__?.activeScenes() ?? [];
    return s.includes('World') && s.includes('Hud');
  });
}

async function expectInside(page: Page, p: { x: number; y: number } | null): Promise<void> {
  const box = await canvasBox(page);
  expect(p).not.toBeNull();
  expect(p!.x).toBeGreaterThan(0);
  expect(p!.y).toBeGreaterThan(0);
  expect(p!.x).toBeLessThan(box.width);
  expect(p!.y).toBeLessThan(box.height);
}

test('pequeña: sale en el título y «luego» deja jugar', async ({ page }) => {
  await atTitle(page, SMALL);
  await expect.poll(() => mode(page)).toBe('suave');
  await click(page, await pos(page, 'no'));
  await expect.poll(() => mode(page)).toBeNull();
  expect((await state(page)).memory).toMatchObject({ ultima: 14, aplazadas: 1, ultimoAviso: '2026-11-20' });
  expect(await log(page)).toEqual(expect.arrayContaining(['update-offered', 'update-later']));
  await play(page);
  // El mismo día no vuelve a salir.
  await page.evaluate(() => window.__ZOO__!.updateCheck());
  expect(await mode(page)).toBeNull();
});

test('«atrás» en la ventana suave es «luego»', async ({ page }) => {
  await atTitle(page, SMALL);
  await expect.poll(() => mode(page)).toBe('suave');
  await page.evaluate(() => window.__ZOO__!.back());
  await expect.poll(() => mode(page)).toBeNull();
  expect((await state(page)).memory?.aplazadas).toBe(1);
  expect(await scenes(page)).toContain('Title');
});

test('«actualizar» en la suave abre la ventana de Play; si se cancela, se sigue jugando', async ({ page }) => {
  await atTitle(page, SMALL, { results: ['cancelada'] });
  await expect.poll(() => mode(page)).toBe('suave');
  await click(page, await pos(page, 'yes'));
  await expect.poll(async () => (await state(page)).immediate).toEqual(['cancelada']);
  expect(await mode(page)).toBeNull();
  expect(await log(page)).toEqual(expect.arrayContaining(['update-accepted', 'update-failed']));
  await play(page);
});

test('grande: dos «luego» en días distintos y a la tercera, obligatoria; cancelarla deja el bloqueo', async ({ page }) => {
  await atTitle(page, BIG, { results: ['cancelada'] });
  await expect.poll(() => mode(page)).toBe('suave');
  await click(page, await pos(page, 'no'));
  await page.evaluate(() => window.__ZOO__!.updateSetToday('2026-11-21'));
  await page.evaluate(() => window.__ZOO__!.updateCheck());
  await expect.poll(() => mode(page)).toBe('suave');
  await page.evaluate(() => window.__ZOO__!.back());
  await expect.poll(() => mode(page)).toBeNull();
  await page.evaluate(() => window.__ZOO__!.updateSetToday('2026-11-22'));
  await page.evaluate(() => window.__ZOO__!.updateCheck());
  await expect.poll(() => mode(page)).toBe('bloqueo');
  expect((await state(page)).immediate).toEqual(['cancelada']);
  expect(await log(page)).toEqual(expect.arrayContaining(['update-forced', 'update-failed']));
});

test('rota: el bloqueo tiene puerta de salida, atrás no lo cierra y pulsar la flecha vuelve a intentar', async ({ page }) => {
  await atTitle(page, BROKEN, { results: ['cancelada'] });
  await expect.poll(() => mode(page)).toBe('bloqueo');
  // La puerta abre «¿Salir?» encima del bloqueo.
  await click(page, await pos(page, 'exit'));
  await expect.poll(() => scenes(page)).toContain('Quit');
  // Atrás cierra «¿Salir?», pero el bloqueo sigue.
  await page.evaluate(() => window.__ZOO__!.back());
  await expect.poll(() => scenes(page)).not.toContain('Quit');
  expect(await mode(page)).toBe('bloqueo');
  // Atrás sobre el bloqueo: otra vez «¿Salir?» (nunca se cierra el bloqueo).
  await page.evaluate(() => window.__ZOO__!.back());
  await expect.poll(() => scenes(page)).toContain('Quit');
  await page.evaluate(() => window.__ZOO__!.back());
  await expect.poll(() => scenes(page)).not.toContain('Quit');
  // La flecha: vuelve a abrir la ventana de Play; cancelada otra vez, el bloqueo sigue.
  await click(page, await pos(page, 'yes'));
  await expect.poll(async () => (await state(page)).immediate).toEqual(['cancelada', 'cancelada']);
  expect(await mode(page)).toBe('bloqueo');
});

test('rota: si Play acepta desde el bloqueo, el bloqueo se va', async ({ page }) => {
  await atTitle(page, BROKEN, { results: ['cancelada', 'actualizada'] });
  await expect.poll(() => mode(page)).toBe('bloqueo');
  await click(page, await pos(page, 'yes'));
  await expect.poll(() => mode(page)).toBeNull();
});

test('no sale con la tienda abierta; sí al cerrarla, y al cerrarlo el mundo sigue', async ({ page }) => {
  await fakeServer(page, SMALL);
  await page.goto('/?sin-tutorial');
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
  await play(page);
  await page.evaluate(() => window.__ZOO__!.openShop());
  await expect.poll(() => scenes(page)).toContain('Shop');
  await page.evaluate(() => window.__ZOO__!.updateFake({}));
  await page.evaluate((b) => window.__ZOO__!.communityStart(b), BASE);
  await page.evaluate(() => window.__ZOO__!.updateCheck());
  await page.waitForTimeout(1000);
  expect(await mode(page)).toBeNull();
  expect((await state(page)).memory?.ultimoAviso).toBeNull();
  await page.evaluate(() => window.__ZOO__!.back());
  await expect.poll(() => scenes(page)).not.toContain('Shop');
  await page.evaluate(() => window.__ZOO__!.updateCheck());
  await expect.poll(() => mode(page)).toBe('suave');
  expect(await page.evaluate(() => window.__ZOO__!.activeScenes())).not.toContain('World');
  await click(page, await pos(page, 'no'));
  await expect.poll(() => scenes(page)).toContain('World');
});

test('sin conexión no sale', async ({ page }) => {
  await atTitle(page, BROKEN, {}, true);
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__ZOO__!.updateCheck());
  expect(await mode(page)).toBeNull();
  expect((await state(page)).immediate).toEqual([]);
});

test('Play dice que no se puede: ni aviso ni bloqueo, ni siquiera con la rota', async ({ page }) => {
  for (const play of [{ allowed: false }, { available: false }]) {
    await page.unrouteAll();
    await atTitle(page, BROKEN, play);
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__ZOO__!.updateCheck());
    expect(await mode(page), JSON.stringify(play)).toBeNull();
    expect((await state(page)).immediate).toEqual([]);
  }
});

for (const size of [{ width: 568, height: 320 }, { width: 667, height: 375 }]) {
  test.describe(`pantalla baja apaisada ${size.width}×${size.height}`, () => {
    test.use({ viewport: size });

    test('la suave y el bloqueo caben y se pueden tocar', async ({ page }) => {
      await atTitle(page, BIG, { results: ['cancelada'] });
      await expect.poll(() => mode(page)).toBe('suave');
      await expectInside(page, await pos(page, 'yes'));
      await expectInside(page, await pos(page, 'no'));
      const fit = await page.evaluate(() => window.__ZOO__!.updateTitleFit());
      expect(fit!.width).toBeLessThanOrEqual(fit!.max + 1);
      await click(page, await pos(page, 'no'));
      await page.evaluate(() => window.__ZOO__!.updateSetToday('2026-11-21'));
      await page.evaluate(() => window.__ZOO__!.updateCheck());
      await expect.poll(() => mode(page)).toBe('suave');
      await click(page, await pos(page, 'no'));
      await page.evaluate(() => window.__ZOO__!.updateSetToday('2026-11-22'));
      await page.evaluate(() => window.__ZOO__!.updateCheck());
      await expect.poll(() => mode(page)).toBe('bloqueo');
      await expectInside(page, await pos(page, 'yes'));
      await expectInside(page, await pos(page, 'exit'));
    });
  });
}

// Los 11 idiomas: el texto cabe en la ventana suave sin quedarse diminuto (árabe de derecha a izquierda incluido).
for (const [locale, lang] of [
  ['es-ES', 'es'], ['en-US', 'en'], ['fr-FR', 'fr'], ['pt-PT', 'pt-PT'], ['pt-BR', 'pt-BR'], ['it-IT', 'it'],
  ['ru-RU', 'ru'], ['ar-SA', 'ar'], ['hi-IN', 'hi'], ['zh-CN', 'zh'], ['ja-JP', 'ja'],
] as const) {
  test.describe(`idioma ${lang}`, () => {
    test.use({ locale, viewport: { width: 568, height: 320 } });

    test('el texto del aviso cabe', async ({ page }) => {
      await atTitle(page, SMALL);
      await expect.poll(() => mode(page)).toBe('suave');
      expect(await page.evaluate(() => window.__ZOO__!.language())).toBe(lang);
      const fit = await page.evaluate(() => window.__ZOO__!.updateTitleFit());
      expect(fit!.width).toBeLessThanOrEqual(fit!.max + 1);
      expect(fit!.size).toBeGreaterThanOrEqual(14);
    });
  });
}
