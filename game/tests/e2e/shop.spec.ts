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

/** En la tienda: tocar el animal (el cuidador va andando) y esperar su bocadillo de compra. */
async function walkToProduct(page: Page, itemId: string) {
  const box = await canvasBox(page);
  const card = await page.evaluate((id) => window.__ZOO__!.shopCardScreenPos(id), itemId);
  await page.mouse.click(box.x + card!.x, box.y + card!.y);
  await page.waitForFunction(
    (id) => window.__ZOO__!.shopActiveItem() === id && window.__ZOO__!.shopBuyBubblePos() !== null,
    itemId,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(300); // que termine de aparecer
  return (await page.evaluate(() => window.__ZOO__!.shopBuyBubblePos()))!;
}

test('fase B: el cuidador entra andando, compra con el bocadillo y sale por el felpudo', async ({ page }) => {
  test.setTimeout(60_000); // anda de verdad por la tienda: con la máquina cargada tarda
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.addCoins(60));
  // Entrar de verdad: el cuidador pisa la puerta del puesto.
  const door = await page.evaluate(() => window.__ZOO__!.shopDoorTile());
  await page.evaluate(([x, y]) => window.__ZOO__!.goToTile(x!, y!), [door!.x, door!.y]);
  await page.waitForFunction(() => window.__ZOO__!.shopCardScreenPos('pantera') !== null, undefined, { timeout: 20_000 });

  // El tendero saluda y el cuidador entra andando hasta pasar el felpudo (sin salir otra vez).
  expect(await page.evaluate(() => window.__ZOO__!.shopBubble())).toBe('¡Hola! ¿Qué animal quieres hoy?');
  const matY = (await page.evaluate(() => window.__ZOO__!.shopDoorScreenPos()))!.y;
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.shopKeeperScreenPos()!.y)).toBeLessThan(matY - 20);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__ZOO__!.activeScenes())).toContain('Shop');

  // Tocar la pantera no la compra: el cuidador va hasta ella y el tendero habla de ella.
  const box = await canvasBox(page);
  const bubble = await walkToProduct(page, 'pantera');
  expect(await page.evaluate(() => window.__ZOO__!.shopCardStatus('pantera'))).toBe('buy');
  expect(await page.evaluate(() => window.__ZOO__!.shopBubble())).toBe('¡La pantera es rapidísima!');

  // El bocadillo sí compra.
  await page.mouse.click(box.x + bubble.x, box.y + bubble.y);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.shopCardStatus('pantera'))).toBe('owned');
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.shopBubble())).toBe('¡Gracias! ¡Cuídalo mucho!');

  // Sin monedas para el panda: bocadillo gris y el tendero avisa.
  const panda = await walkToProduct(page, 'panda');
  await page.mouse.click(box.x + panda.x, box.y + panda.y);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.shopBubble())).toBe('¡Te faltan monedas!');
  expect(await page.evaluate(() => window.__ZOO__!.shopCardStatus('panda'))).toBe('buy');

  // Tocar el felpudo: el cuidador va andando, sale y aparece delante de la puerta del puesto.
  const mat = await page.evaluate(() => window.__ZOO__!.shopDoorScreenPos());
  await page.mouse.click(box.x + mat!.x, box.y + mat!.y);
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('World'), undefined, { timeout: 10_000 });
  const keeper = await page.evaluate(() => window.__ZOO__!.keeperPosition());
  expect(Math.floor(keeper!.y / 16)).toBe(door!.y + 1);
  // No vuelve a entrar solo.
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__ZOO__!.activeScenes())).not.toContain('Shop');
});

test('fase B: si el peque no se mueve, salen huellas que señalan qué comprar', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.addCoins(60));
  await page.evaluate(() => window.__ZOO__!.openShop());
  await page.waitForFunction(() => window.__ZOO__!.shopCardScreenPos('pantera') !== null);
  expect(await page.evaluate(() => window.__ZOO__!.shopHintVisible())).toBe(false);
  await page.waitForFunction(() => window.__ZOO__!.shopHintVisible(), undefined, { timeout: 12_000 });

  // En cuanto se mueve, desaparecen.
  await page.keyboard.down('ArrowLeft');
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.shopHintVisible())).toBe(false);
  await page.keyboard.up('ArrowLeft');
});

test('fase B: ESC sigue cerrando la tienda', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.addCoins(20));
  await page.evaluate(() => window.__ZOO__!.openShop());
  await page.waitForFunction(() => window.__ZOO__!.shopCardScreenPos('pantera') !== null);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__ZOO__?.activeScenes().includes('Shop'));
});
