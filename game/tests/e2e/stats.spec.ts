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

const log = (page: Page): Promise<string[]> => page.evaluate(() => window.__ZOO__!.busLog());

test('dar de comer deja rastro: visita, ventana, comida, comida fuera y cierre', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.feedResident('bills'));
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Feed'), undefined, { timeout: 30_000 });
  expect(await log(page)).toContain('feed-opened');

  const targets = (await page.evaluate(() => window.__ZOO__!.feedTargets()))!;
  const box = await canvasBox(page);
  const from = (targets.foods as Record<string, { x: number; y: number }>).carne!;
  // Arrastrar y soltar lejos del animal: comida fuera.
  await page.mouse.move(box.x + from.x, box.y + from.y);
  await page.mouse.down();
  await page.mouse.move(box.x + 30, box.y + 30, { steps: 10 });
  await page.mouse.up();
  await expect.poll(() => log(page)).toContain('food-missed');
  // Ahora sí, sobre el animal.
  await page.waitForTimeout(400);
  await page.mouse.move(box.x + from.x, box.y + from.y);
  await page.mouse.down();
  await page.mouse.move(box.x + targets.animal.x, box.y + targets.animal.y, { steps: 12 });
  await page.mouse.up();
  await expect.poll(() => log(page)).toContain('animal-fed');
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.isFeedBusy())).toBe(false);

  await page.keyboard.press('Escape');
  await expect.poll(() => log(page)).toContain('feed-closed');
  // La cuidadora se ha quedado junto al león más de dos segundos.
  await expect.poll(() => log(page), { timeout: 10_000 }).toContain('pen-near');
});

test('tocar un animal y moverse con el dedo deja rastro', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.feedResident('bills'));
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Feed'), undefined, { timeout: 30_000 });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__ZOO__?.activeScenes().includes('Feed'));
  const pos = (await page.evaluate(() => window.__ZOO__!.residentScreenPos('bills')))!;
  const box = await canvasBox(page);
  await page.mouse.click(box.x + pos.x, box.y + pos.y);
  await expect.poll(() => log(page)).toEqual(expect.arrayContaining(['animal-tapped', 'control-used']));
});
