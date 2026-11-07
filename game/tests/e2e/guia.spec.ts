import { expect, test, type Page } from '@playwright/test';

// Llegar a la tienda y aprender a arrastrar la comida sin leer (2026-11-07).
test.setTimeout(150_000);

async function canvasBox(page: Page) {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('No hay canvas');
  return box;
}

async function startGame(page: Page): Promise<void> {
  await page.goto('/?sin-tutorial');
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
  const box = await canvasBox(page);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.62);
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Hud'));
  await page.waitForFunction(() => window.__ZOO__!.hudShopButtonPos() !== null);
}

async function tapShopButton(page: Page): Promise<void> {
  const button = (await page.evaluate(() => window.__ZOO__!.hudShopButtonPos()))!;
  const box = await canvasBox(page);
  await page.mouse.click(box.x + button.x, box.y + button.y);
}

const scenes = (page: Page) => page.evaluate(() => window.__ZOO__!.activeScenes());

test('botón de la tienda: la primera vez huellas por el camino; después la cuidadora va sola', async ({ page }) => {
  await startGame(page);
  const before = (await page.evaluate(() => window.__ZOO__!.keeperTile()))!;
  const route = await page.evaluate(() => window.__ZOO__!.shopRoute());
  await tapShopButton(page);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.shopTrailTiles().length)).toBeGreaterThan(3);
  // Las huellas van por la ruta de la cuidadora y acaban en la puerta.
  const trail = await page.evaluate(() => window.__ZOO__!.shopTrailTiles());
  const onRoute = new Set(route.map((p) => `${p.x},${p.y}`));
  for (const t of trail) expect(onRoute.has(`${t.x},${t.y}`), `huella en (${t.x},${t.y})`).toBe(true);
  expect(trail.at(-1)).toEqual(await page.evaluate(() => window.__ZOO__!.shopDoorTile()));
  // La puerta queda lejos: el bocadillo del borde la señala. La cuidadora no se ha movido sola.
  expect(await page.evaluate(() => window.__ZOO__!.hudShopEdgeVisible())).toBe(true);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__ZOO__!.keeperTile())).toEqual(before);
  // Otro toque las apaga.
  await tapShopButton(page);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.shopTrailTiles().length)).toBe(0);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.hudShopEdgeVisible())).toBe(false);

  // Se entra una vez andando y se sale.
  const door = (await page.evaluate(() => window.__ZOO__!.shopDoorTile()))!;
  await page.evaluate(([x, y]) => window.__ZOO__!.goToTile(x, y), [door.x, door.y] as const);
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('Shop'), undefined, { timeout: 60_000 });
  expect(await page.evaluate(() => window.__ZOO__!.hudShopButtonPos())).toBeNull();
  await page.evaluate(() => window.__ZOO__!.back());
  await page.waitForFunction(() => !window.__ZOO__!.activeScenes().includes('Shop'), undefined, { timeout: 20_000 });
  // Vuelve al zoo desde la plaza: el botón ya lleva andando, sin huellas.
  const spawn = (await page.evaluate(() => window.__ZOO__!.spawnTile()))!;
  await page.evaluate(([x, y]) => window.__ZOO__!.goToTile(x, y), [spawn.x, spawn.y] as const);
  await page.waitForFunction(([x, y]) => { const k = window.__ZOO__!.keeperTile(); return k?.x === x && k?.y === y; }, [spawn.x, spawn.y] as const, { timeout: 60_000 });
  await page.waitForTimeout(400);
  await tapShopButton(page);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__ZOO__!.shopTrailTiles().length)).toBe(0);
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('Shop'), undefined, { timeout: 60_000 });
});

test('tocar una comida enseña a arrastrarla; arrastrar quita la mano y el toque no es un fallo', async ({ page }) => {
  await startGame(page);
  expect(await page.evaluate(() => window.__ZOO__!.feedResident('gordi'))).toBe(true);
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Feed'), undefined, { timeout: 90_000 });
  await page.waitForTimeout(500);
  const targets = (await page.evaluate(() => window.__ZOO__!.feedTargets()))!;
  const [food, at] = Object.entries(targets.foods)[0]!;
  const box = await canvasBox(page);
  await page.mouse.click(box.x + at!.x, box.y + at!.y);
  // La mano aparece y lleva la comida hacia el animal.
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.feedDragHint())).not.toBeNull();
  await expect.poll(async () => {
    const h = await page.evaluate(() => window.__ZOO__!.feedDragHint());
    return h ? Math.hypot(h.x - targets.animal.x, h.y - targets.animal.y) : Infinity;
  }).toBeLessThan(40);
  expect(await page.evaluate(() => window.__ZOO__!.busLog())).not.toContain('food-missed');
  // Empezar a arrastrar la quita en el acto.
  await page.mouse.move(box.x + at!.x, box.y + at!.y);
  await page.mouse.down();
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.feedDragHint())).toBeNull();
  await page.mouse.move(box.x + targets.animal.x, box.y + targets.animal.y, { steps: 12 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.busLog())).toContain('animal-fed');
  expect(food).toBeTruthy();
  // Sola, la mano se va tras dos gestos.
  await page.waitForTimeout(1500);
  await page.mouse.click(box.x + at!.x, box.y + at!.y);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.feedDragHint())).not.toBeNull();
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.feedDragHint()), { timeout: 8_000 }).toBeNull();
  expect(await scenes(page)).toContain('Feed');
});

test('pantalla pequeña (640x360): botón de la tienda, ✕ del tutorial y engranaje no se pisan', async ({ page }) => {
  // El juego es apaisado (en vertical pide girar el móvil): se mira la pantalla más baja.
  await page.setViewportSize({ width: 640, height: 360 });
  await page.goto('/');
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
  const box = await canvasBox(page);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.62);
  await page.waitForFunction(() => window.__ZOO__!.tutorialOfferPos('learn') !== null);
  const learn = (await page.evaluate(() => window.__ZOO__!.tutorialOfferPos('learn')))!;
  await page.mouse.click(box.x + learn.x, box.y + learn.y);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.tutorialStep())).toBe('move');
  const button = (await page.evaluate(() => window.__ZOO__!.hudShopButtonPos()))!;
  const close = (await page.evaluate(() => window.__ZOO__!.tutorialClosePos()))!;
  expect(Math.abs(close.y - button.y)).toBeGreaterThanOrEqual(56);
  // El engranaje (56 px, abajo a la izquierda) queda por debajo de la ✕ (44 px).
  const gearTop = 360 - 16 - 56;
  expect(close.y + 22).toBeLessThan(gearTop);
});
