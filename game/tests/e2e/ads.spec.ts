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
  expect((await log(page)).filter((name) => name.startsWith('ad-'))).toEqual(['ad-offered', 'ad-accepted', 'ad-closed', 'ad-watched']);
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
  expect((await log(page)).filter((name) => name.startsWith('ad-'))).toEqual(['ad-offered', 'ad-accepted', 'ad-closed', 'ad-watched']);
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

test('si la pantalla cambia de tamaño justo al cerrarse el panel, el juego no se queda tapado', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.adsFake('visto'));
  await page.evaluate(() => window.__ZOO__!.adsAdvance(300));
  await enterShop(page);
  await panelOpen(page);
  await page.evaluate(() => window.__ZOO__!.adOfferDeclineAndResize());
  await page.waitForTimeout(800);
  const active = await scenes(page);
  expect(active).not.toContain('AdOffer');
  expect(active).toContain('Shop');
});

test('con el panel abierto solo se ve una X: la de la tienda se esconde y vuelve al cerrarlo', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.adsFake('visto'));
  await enterShop(page);
  expect(await page.evaluate(() => window.__ZOO__!.shopCloseVisible())).toBe(true);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__ZOO__!.activeScenes().includes('Shop'));
  await page.evaluate(() => window.__ZOO__!.adsAdvance(300));
  await enterShop(page);
  await panelOpen(page);
  expect(await page.evaluate(() => window.__ZOO__!.shopCloseVisible())).toBe(false);
  await page.setViewportSize({ width: 1100, height: 640 });
  await page.waitForTimeout(600);
  await panelOpen(page);
  expect(await page.evaluate(() => window.__ZOO__!.shopCloseVisible())).toBe(false);
  await tap(page, 'no');
  await page.waitForFunction(() => !window.__ZOO__!.activeScenes().includes('AdOffer'));
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.shopCloseVisible())).toBe(true);
});

