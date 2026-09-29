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
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('World'));
}

async function walkTo(page: Page, x: number, y: number): Promise<void> {
  await page.evaluate(([tx, ty]) => window.__ZOO__!.goToTile(tx!, ty!), [x, y]);
  const cx = x * 16 + 8;
  const cy = y * 16 + 8;
  await expect
    .poll(() => page.evaluate(() => window.__ZOO__!.keeperPosition()), { timeout: 20_000 })
    .toEqual({ x: cx, y: cy });
}

async function dragFood(page: Page, food: string): Promise<void> {
  const targets = await page.evaluate(() => window.__ZOO__!.feedTargets());
  if (!targets) throw new Error('La escena de comer no está abierta');
  const box = await canvasBox(page);
  const from = (targets.foods as Record<string, { x: number; y: number }>)[food]!;
  await page.mouse.move(box.x + from.x, box.y + from.y);
  await page.mouse.down();
  await page.mouse.move(box.x + targets.animal.x, box.y + targets.animal.y, { steps: 12 });
  await page.mouse.up();
  // Dar tiempo a que Phaser procese el dragend y marque la escena como ocupada.
  await page.waitForTimeout(150);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.isFeedBusy())).toBe(false);
}

test('ir al león: al llegar a su puerta se abre la comida y se le da arrastrando', async ({ page }) => {
  await startGame(page);
  const approach = await page.evaluate(() => window.__ZOO__!.gateApproachTile('leon'));
  // Nada más pisar el camino pegado a la puerta se abre la ventana de dar de comer (sin tocar nada).
  await page.evaluate(([x, y]) => window.__ZOO__!.goToTile(x!, y!), [approach!.x, approach!.y]);
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Feed'), undefined, { timeout: 20_000 });

  await dragFood(page, 'carne');
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.hudCoinsText())).toBe('🪙 1');

  await dragFood(page, 'piedra');
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.hudCoinsText())).toBe('🪙 1');

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => {
    const scenes = window.__ZOO__?.activeScenes() ?? [];
    return scenes.includes('World') && !scenes.includes('Feed');
  });
  // Sigue en la puerta: no se vuelve a abrir sola hasta que se aparte.
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__ZOO__!.activeScenes())).not.toContain('Feed');
});

test('soltar la comida lejos no da monedas', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.openFeed('leon'));
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Feed'));
  const targets = await page.evaluate(() => window.__ZOO__!.feedTargets());
  const box = await canvasBox(page);
  await page.mouse.move(box.x + targets!.foods.carne.x, box.y + targets!.foods.carne.y);
  await page.mouse.down();
  await page.mouse.move(box.x + 20, box.y + box.height - 20, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__ZOO__!.hudCoinsText())).toBe('🪙 0');
});

/** En la tienda: tocar el animal (el cuidador va andando) y luego el bocadillo de compra. */
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

test('con 60 monedas se entra en la tienda y se compra la pantera', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.addCoins(60));
  // Al pisar la puerta se abre la tienda y el mundo se pausa: se espera a la tienda, no a la posición.
  const door = await page.evaluate(() => window.__ZOO__!.shopDoorTile());
  await page.evaluate(([x, y]) => window.__ZOO__!.goToTile(x!, y!), [door!.x, door!.y]);
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Shop'), undefined, { timeout: 20_000 });

  await buyInShop(page, 'pantera');

  await expect.poll(() => page.evaluate(() => window.__ZOO__!.hudCoinsText())).toBe('🪙 10');
  expect(await page.evaluate(() => window.__ZOO__!.unlocked())).toContain('pantera');

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__ZOO__?.activeScenes().includes('Shop'));

  await page.reload();
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
  expect(await page.evaluate(() => window.__ZOO__!.unlocked())).toContain('pantera');
});

test('sin 20 monedas la tienda no se abre', async ({ page }) => {
  await startGame(page);
  const door = await page.evaluate(() => window.__ZOO__!.shopDoorTile());
  await walkTo(page, door!.x, door!.y);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__ZOO__!.activeScenes())).not.toContain('Shop');
});
