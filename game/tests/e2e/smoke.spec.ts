import { expect, test, type Page } from '@playwright/test';

async function canvasBox(page: Page) {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('No hay canvas');
  return box;
}

async function startGame(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
  const box = await canvasBox(page);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.62);
  await page.waitForFunction(() => {
    const scenes = window.__ZOO__?.activeScenes() ?? [];
    return scenes.includes('World') && scenes.includes('Hud');
  });
}

test('tocar el camino mueve al cuidador hasta allí', async ({ page }) => {
  await page.goto('/');
  await startGame(page);

  const spawn = await page.evaluate(() => window.__ZOO__!.spawnTile());
  const tx = spawn!.x + 3; // 3 casillas a la derecha por el camino principal
  const target = await page.evaluate(([x, y]) => window.__ZOO__!.tileToScreen(x!, y!), [tx, spawn!.y]);
  const box = await canvasBox(page);
  await page.mouse.click(box.x + target!.x, box.y + target!.y);

  await expect
    .poll(() => page.evaluate(() => window.__ZOO__!.keeperPosition()?.x ?? 0), { timeout: 5_000 })
    .toBeCloseTo(tx * 16 + 8, 0);
  expect(await page.evaluate(() => window.__ZOO__!.keeperPosition()?.y)).toBeCloseTo(spawn!.y * 16 + 8, 0);
});

test('las monedas se muestran y sobreviven a recargar', async ({ page }) => {
  await page.goto('/');
  await startGame(page);

  await page.evaluate(() => window.__ZOO__!.addCoins(3));
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.hudCoinsText())).toBe('🪙 3');

  await page.reload();
  await startGame(page);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.hudCoinsText())).toBe('🪙 3');
});

test('sin errores en la consola al arrancar', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    // Sin arte importado (CI), art/manifest.json da 404: es el comportamiento esperado.
    if (message.type() === 'error' && !message.location().url.includes('/art/')) errors.push(message.text());
  });
  await page.goto('/');
  await startGame(page);
  expect(errors).toEqual([]);
});
