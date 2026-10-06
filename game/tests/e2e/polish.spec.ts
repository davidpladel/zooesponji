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

async function tap(page: Page, pos: { x: number; y: number } | null): Promise<void> {
  if (!pos) throw new Error('Posición desconocida');
  const box = await canvasBox(page);
  await page.mouse.click(box.x + pos.x, box.y + pos.y);
}

/** En la tienda: tocar el animal (la cuidadora va andando) y luego el bocadillo de compra. */
async function buyInShop(page: Page, itemId: string): Promise<void> {
  const box = await canvasBox(page);
  const card = await page.evaluate((id) => window.__ZOO__!.shopCardScreenPos(id), itemId);
  await page.mouse.click(box.x + card!.x, box.y + card!.y);
  await page.waitForFunction(
    (id) => window.__ZOO__!.shopActiveItem() === id && window.__ZOO__!.shopBuyBubblePos() !== null,
    itemId,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(300); // que termine de aparecer
  const bubble = await page.evaluate(() => window.__ZOO__!.shopBuyBubblePos());
  await page.mouse.click(box.x + bubble!.x, box.y + bubble!.y);
}

test('comprar la pantera y luego otra: al completarse su peana queda AGOTADA', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.addCoins(100));
  await page.evaluate(() => window.__ZOO__!.openShop());
  await page.waitForFunction(() => window.__ZOO__!.shopCardScreenPos('pantera') !== null);

  // Con el recinto cerrado no se vende "otra pantera".
  expect(await page.evaluate(() => window.__ZOO__!.shopCardStatus('extra-pantera'))).toBeNull();
  await buyInShop(page, 'pantera');
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.shopCardStatus('extra-pantera'))).toBe('buy');

  await buyInShop(page, 'extra-pantera');
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.shopCardStatus('extra-pantera'))).toBe('full');
  expect(await page.evaluate(() => window.__ZOO__!.counts().pantera)).toBe(2);
  expect(await page.evaluate(() => window.__ZOO__!.hudCoinsText())).toBe('30');
});

test('menú ⚙️: apagar el sonido y ver los créditos', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.openSettings());
  await page.waitForFunction(() => window.__ZOO__!.settingsTogglePos('sfx') !== null);
  expect(await page.evaluate(() => window.__ZOO__!.activeScenes())).not.toContain('World'); // mundo en pausa

  await tap(page, await page.evaluate(() => window.__ZOO__!.settingsTogglePos('sfx')));
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.settings().sfx)).toBe(false);
  expect(await page.evaluate(() => window.__ZOO__!.settingsCredits())).toContain('Daniela y Adrián');

  // El botón atrás cierra el menú y el mundo sigue.
  expect(await page.evaluate(() => window.__ZOO__!.back())).toBe('close-settings');
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('World'));
});

test('menú ⚙️: la privacidad se lee dentro del juego y el botón atrás la cierra', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.openSettings());
  await page.waitForFunction(() => window.__ZOO__!.settingsButtonPos('privacy') !== null);
  // En la web no hay botón de salir: una página no se puede cerrar a sí misma.
  expect(await page.evaluate(() => window.__ZOO__!.settingsButtonPos('quit'))).toBeNull();

  await tap(page, await page.evaluate(() => window.__ZOO__!.settingsButtonPos('privacy')));
  await expect(page.locator('#legal h1')).toContainText('Privacidad');
  await expect(page.locator('#legal a')).toHaveCount(0);

  expect(await page.evaluate(() => window.__ZOO__!.back())).toBe('close-overlay');
  await expect(page.locator('#legal')).toHaveCount(0);
  expect(await page.evaluate(() => window.__ZOO__!.back())).toBe('close-settings');
});

test('botón atrás en el mundo pregunta "¿Salir?" y ❌ vuelve al juego', async ({ page }) => {
  await startGame(page);
  expect(await page.evaluate(() => window.__ZOO__!.back())).toBe('ask-quit');
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('Quit'));
  expect(await page.evaluate(() => window.__ZOO__!.back())).toBe('close-quit');
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('World'));
});

test('en vertical aparece el aviso de girar el móvil y pausa el mundo', async ({ page }) => {
  await startGame(page);
  await page.setViewportSize({ width: 400, height: 800 });
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('Rotate'));
  expect(await page.evaluate(() => window.__ZOO__!.activeScenes())).not.toContain('World');
  await page.setViewportSize({ width: 1000, height: 600 });
  await page.waitForFunction(() => {
    const scenes = window.__ZOO__!.activeScenes();
    return scenes.includes('World') && !scenes.includes('Rotate');
  });
});

test('un error no controlado muestra la pantalla "¡Ups!" con 🔄', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.crash());
  await expect(page.locator('#error-screen')).toBeVisible();
  await expect(page.locator('#error-screen')).toContainText('¡Ups!');
  await expect(page.locator('#error-retry')).toBeVisible();
  expect(errors.some((e) => e.includes('Error de prueba'))).toBe(true);
});

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
