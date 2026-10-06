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
  expect(await page.evaluate(() => window.__ZOO__!.hudCoinsText())).toBe('25');
});

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
    await page.waitForFunction(() => !window.__ZOO__!.activeScenes().includes('Book'));
  }
});
