import { expect, test, type Page } from '@playwright/test';

// El mapa es grande: la cuidadora tarda en cruzarlo.
test.setTimeout(120_000);

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

async function dragFood(page: Page, food: string): Promise<void> {
  const targets = await page.evaluate(() => window.__ZOO__!.feedTargets());
  if (!targets) throw new Error('La escena de comer no está abierta');
  const box = await canvasBox(page);
  const from = (targets.foods as Record<string, { x: number; y: number }>)[food]!;
  await page.mouse.move(box.x + from.x, box.y + from.y);
  await page.mouse.down();
  await page.mouse.move(box.x + targets.animal.x, box.y + targets.animal.y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.isFeedBusy())).toBe(false);
}

/** Toca a un animal (la cuidadora va andando hasta él) y espera a que se abra la comida. */
async function feed(page: Page, residentId: string): Promise<void> {
  expect(await page.evaluate((id) => window.__ZOO__!.feedResident(id), residentId)).toBe(true);
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Feed'), undefined, { timeout: 90_000 });
}

async function closeFeed(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__ZOO__?.activeScenes().includes('Feed'));
}

const coins = (page: Page) => page.evaluate(() => window.__ZOO__!.hudCoinsText());

test('se compra el estanque, la cuidadora entra y da de comer a un pato', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.addCoins(200));
  expect(await page.evaluate(() => window.__ZOO__!.buy('estanque'))).toBe(true);
  expect(await page.evaluate(() => window.__ZOO__!.animalsInPen('estanque'))).toBe(1);

  await feed(page, 'cuac');
  expect(await page.evaluate(() => window.__ZOO__!.keeperInPen('estanque'))).toBe(true);
  await dragFood(page, 'maiz');
  // 200 − 150 del estanque + 3 del pato.
  await expect.poll(() => coins(page)).toBe('🪙 53');
  // El pan les sienta mal: no da monedas.
  await dragFood(page, 'pan');
  await expect.poll(() => coins(page)).toBe('🪙 53');
});

test('en la sabana se da de comer a una jirafa y a una cebra, cada una con su bandeja', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.addCoins(1100));
  expect(await page.evaluate(() => window.__ZOO__!.buy('sabana'))).toBe(true);
  expect(await page.evaluate(() => window.__ZOO__!.buy('extra-sabana'))).toBe(true); // Raya, la cebra: 120
  expect(await page.evaluate(() => window.__ZOO__!.animalsInPen('sabana'))).toBe(2);

  await feed(page, 'lola');
  expect(await page.evaluate(() => window.__ZOO__!.keeperInPen('sabana'))).toBe(true);
  let foods = Object.keys((await page.evaluate(() => window.__ZOO__!.feedTargets()))!.foods);
  expect(foods.sort()).toEqual(['calcetin', 'carne', 'lechuga', 'manzana', 'platano']);
  await dragFood(page, 'lechuga');
  // 1100 − 900 − 120 + 8 de la jirafa.
  await expect.poll(() => coins(page)).toBe('🪙 88');
  await closeFeed(page);

  await feed(page, 'raya');
  foods = Object.keys((await page.evaluate(() => window.__ZOO__!.feedTargets()))!.foods);
  expect(foods.sort()).toEqual(['lechuga', 'manzana', 'pescado', 'piedra', 'zanahoria']);
  await dragFood(page, 'zanahoria');
  // + 6 de la cebra.
  await expect.poll(() => coins(page)).toBe('🪙 94');
});

test('un visitante entra en el recinto de las ovejas y salen corazones', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.addCoins(300));
  expect(await page.evaluate(() => window.__ZOO__!.buy('ovejas'))).toBe(true);

  // La cuidadora se acerca a la puerta: los recintos que no se ven no se actualizan.
  const approach = await page.evaluate(() => window.__ZOO__!.gateApproachTile('ovejas'));
  await page.evaluate(([x, y]) => window.__ZOO__!.goToTile(x!, y!), [approach!.x, approach!.y]);
  await expect
    .poll(() => page.evaluate(() => window.__ZOO__!.keeperPosition()), { timeout: 60_000 })
    .toEqual({ x: approach!.x * 16 + 8, y: approach!.y * 16 + 8 });

  expect(await page.evaluate(() => window.__ZOO__!.sendVisitorInside('ovejas'))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.visitorsInPen('ovejas')), { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.petHearts()), { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
  expect(await page.evaluate(() => window.__ZOO__!.visitorsInPen('ovejas'))).toBeLessThanOrEqual(3);
});

test('sin comprar las ovejas, ningún visitante entra en su recinto', async ({ page }) => {
  await startGame(page);
  expect(await page.evaluate(() => window.__ZOO__!.sendVisitorInside('ovejas'))).toBe(false);
  expect(await page.evaluate(() => window.__ZOO__!.visitorsInPen('ovejas'))).toBe(0);
});
