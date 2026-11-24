import { expect, test, type Page } from '@playwright/test';

// Valoración en Google Play (spec 2026-11-21-valoracion-en-play). El juego no dibuja nada: se comprueba la llamada
// al Play falso, que el mapa queda en pausa mientras «está la tarjeta» y que después se sigue jugando.

async function startGame(page: Page, query = '?sin-tutorial'): Promise<void> {
  await page.goto(`/${query}`);
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
  const box = (await page.locator('canvas').first().boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.62);
  await page.waitForFunction(() => {
    const scenes = window.__ZOO__?.activeScenes() ?? [];
    return scenes.includes('World') && scenes.includes('Hud');
  });
}

const scenes = (page: Page): Promise<string[]> => page.evaluate(() => window.__ZOO__!.activeScenes());
const calls = (page: Page): Promise<number> => page.evaluate(() => window.__ZOO__!.reviewCalls());
const log = (page: Page): Promise<string[]> => page.evaluate(() => window.__ZOO__!.busLog());

/** Partida lista para la valoración: tutorial ya ofrecido, Play falso y, si se pide, los minutos y el animal. */
async function ready(page: Page, opts: { result?: 'ok' | 'fallo' | 'colgada'; seconds?: number; animal?: boolean } = {}): Promise<void> {
  await page.evaluate(() => window.__ZOO__!.tutorialOffered());
  await page.evaluate(([result, seconds]) => window.__ZOO__!.reviewFake(result, seconds), [opts.result ?? 'ok', opts.seconds ?? 600] as const);
  if (opts.animal ?? true) await page.evaluate(() => window.__ZOO__!.buy('extra-cabra'));
}

async function backFromFeed(page: Page): Promise<void> {
  await page.evaluate(() => window.__ZOO__!.openFeed('bills'));
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('Feed'));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('World') || window.__ZOO__!.reviewOpen());
}

async function keeperMoves(page: Page): Promise<void> {
  const before = await page.evaluate(() => window.__ZOO__!.keeperPosition());
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(600);
  await page.keyboard.up('ArrowRight');
  const after = await page.evaluate(() => window.__ZOO__!.keeperPosition());
  expect(after).not.toEqual(before);
}

test('sin la valoración montada (la web): nada', async ({ page }) => {
  await startGame(page);
  await backFromFeed(page);
  await page.waitForTimeout(1000);
  expect((await log(page)).filter((name) => name.startsWith('review-'))).toEqual([]);
});

test('10 min y animal comprado: al volver de dar de comer se pide, con el mapa en pausa, y luego se sigue jugando', async ({ page }) => {
  await startGame(page);
  await ready(page, { result: 'colgada' });
  await backFromFeed(page);
  await expect.poll(() => calls(page)).toBe(1);
  expect(await page.evaluate(() => window.__ZOO__!.reviewOpen())).toBe(true);
  expect(await scenes(page)).not.toContain('World');
  expect((await log(page)).filter((name) => name.startsWith('review-'))).toEqual(['review-requested']);
});

test('al terminar Play el mapa vuelve y la cuidadora se mueve', async ({ page }) => {
  await startGame(page);
  await ready(page);
  await backFromFeed(page);
  await expect.poll(() => calls(page)).toBe(1);
  await expect.poll(() => scenes(page)).toContain('World');
  expect(await page.evaluate(() => window.__ZOO__!.reviewOpen())).toBe(false);
  await keeperMoves(page);
  // Una vez: al volver otra vez de comer no se vuelve a pedir.
  await backFromFeed(page);
  await page.waitForTimeout(1000);
  expect(await calls(page)).toBe(1);
});

test('si Play falla, el juego sigue y se apunta el fallo', async ({ page }) => {
  await startGame(page);
  await ready(page, { result: 'fallo' });
  await backFromFeed(page);
  await expect.poll(() => log(page)).toContain('review-failed');
  await expect.poll(() => scenes(page)).toContain('World');
  await keeperMoves(page);
});

test('al salir de la tienda tras comprar el primer animal', async ({ page }) => {
  await startGame(page);
  await ready(page, { animal: false });
  await page.evaluate(() => window.__ZOO__!.openShop());
  await page.waitForFunction(() => window.__ZOO__!.shopCardScreenPos('pantera') !== null);
  await page.evaluate(() => window.__ZOO__!.buy('extra-cabra'));
  await page.keyboard.press('Escape');
  await expect.poll(() => calls(page)).toBe(1);
});

test('sin los 10 min: no se pide', async ({ page }) => {
  await startGame(page);
  await ready(page, { seconds: 599 });
  await backFromFeed(page);
  await page.waitForTimeout(1000);
  expect(await calls(page)).toBe(0);
});

test('sin animal comprado: no se pide', async ({ page }) => {
  await startGame(page);
  await ready(page, { animal: false });
  await backFromFeed(page);
  await page.waitForTimeout(1000);
  expect(await calls(page)).toBe(0);
});

test('sin el aviso del tutorial ofrecido: no se pide', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.reviewFake('ok', 600));
  await page.evaluate(() => window.__ZOO__!.buy('extra-cabra'));
  await backFromFeed(page);
  await page.waitForTimeout(1000);
  expect(await calls(page)).toBe(0);
});

test('valoración y anuncio de la pausa a la vez: va la valoración y el anuncio en la pausa siguiente', async ({ page }) => {
  await startGame(page);
  await ready(page);
  await page.evaluate(() => window.__ZOO__!.adsFake('visto'));
  await page.evaluate(() => window.__ZOO__!.adsAdvance(900));
  await backFromFeed(page);
  await expect.poll(() => calls(page)).toBe(1);
  await expect.poll(() => scenes(page)).toContain('World');
  expect(await scenes(page)).not.toContain('AdOffer');
  await backFromFeed(page);
  await page.waitForFunction(() => window.__ZOO__!.adOfferPos('yes') !== null);
});

test('anuncio ofrecido hace menos de 3 min: no se pide; a los 3 min, sí', async ({ page }) => {
  await startGame(page);
  await ready(page, { seconds: 590 });
  await page.evaluate(() => window.__ZOO__!.adsFake('visto'));
  await page.evaluate(() => window.__ZOO__!.adsAdvance(900));
  // Primero sale el anuncio (aún sin los 10 min de la valoración) y se salta con la X.
  await backFromFeed(page);
  await page.waitForFunction(() => window.__ZOO__!.adOfferPos('no') !== null);
  const pos = (await page.evaluate(() => window.__ZOO__!.adOfferPos('no')))!;
  const box = (await page.locator('canvas').first().boundingBox())!;
  await page.mouse.click(box.x + pos.x, box.y + pos.y);
  await expect.poll(() => scenes(page)).toContain('World');
  // Ya con los 10 min, pero a pocos segundos de juego del anuncio.
  await page.evaluate(() => window.__ZOO__!.reviewAdvance(10));
  await backFromFeed(page);
  await page.waitForTimeout(1000);
  expect(await calls(page)).toBe(0);
  // A los 3 min de juego desde el anuncio, en la pausa siguiente, sí.
  await page.evaluate(() => window.__ZOO__!.reviewAdvance(180));
  await backFromFeed(page);
  await expect.poll(() => calls(page)).toBe(1);
});

test('al salir de la tienda con una lección por ofrecer, sale la lección y no la valoración', async ({ page }) => {
  await startGame(page, '?sin-tutorial&lecciones');
  await ready(page);
  await page.evaluate(() => window.__ZOO__!.openShop());
  await page.waitForFunction(() => window.__ZOO__!.shopCardScreenPos('pantera') !== null);
  await page.evaluate(async () => {
    await window.__ZOO__!.addCoins(5000);
    await window.__ZOO__!.buy('cerdos');
  });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('TutorialOffer'));
  expect(await calls(page)).toBe(0);
});

test('sin pausa natural: a los 5 min de cumplir, en un momento tranquilo', async ({ page }) => {
  await startGame(page);
  await ready(page);
  // La primera mirada (cada 5 s) apunta desde cuándo cumple; después pasan 5 min de juego.
  await page.waitForTimeout(5500);
  expect(await calls(page)).toBe(0);
  await page.evaluate(() => window.__ZOO__!.reviewAdvance(300));
  await expect.poll(() => calls(page), { timeout: 10_000 }).toBe(1);
});

test('pantalla baja apaisada: se pide y el juego sigue jugable', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await startGame(page);
  await ready(page);
  await backFromFeed(page);
  await expect.poll(() => calls(page)).toBe(1);
  await expect.poll(() => scenes(page)).toContain('World');
  await keeperMoves(page);
});
