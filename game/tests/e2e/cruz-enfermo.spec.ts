import { expect, test, type Page } from '@playwright/test';

// Fallo visto por David con niños: al dar de comer a un animal malito sale la cruz de la clínica pegada al
// animal, y al volver a tocar o soltar comida sobre el animal se pulsa la cruz sin querer y se sale a la clínica
// sin enterarse de que «le han pinchado». La zona táctil de la cruz (el doble que su dibujo) se mete dentro del
// animal. Estas pruebas fallan mientras eso pase.

test.setTimeout(120_000);

const SIZES = [
  { name: 'móvil apaisado 640×360', width: 640, height: 360 },
  { name: 'escritorio 1280×720', width: 1280, height: 720 },
];

type Vec = { x: number; y: number };

async function startGame(page: Page): Promise<void> {
  await page.goto('/?sin-tutorial');
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.62);
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('World'));
}

async function drag(page: Page, from: Vec, to: Vec, steps = 12): Promise<void> {
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.move(box.x + from.x, box.y + from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) await page.mouse.move(box.x + from.x + ((to.x - from.x) * i) / steps, box.y + from.y + ((to.y - from.y) * i) / steps);
  await page.mouse.up();
}

/** Abre la comida de Tembo malito, le da una comida y espera a que salga la cruz. Devuelve la cruz y su tamaño. */
async function feedSickUntilCross(page: Page): Promise<{ cross: Vec; size: number; animal: Vec }> {
  await startGame(page);
  await page.evaluate(async () => {
    await window.__ZOO__!.addCoins(5000);
    await window.__ZOO__!.buy('elefantes-africanos');
    await window.__ZOO__!.giveClinic();
    await window.__ZOO__!.forceSick('tembo');
  });
  await page.evaluate(() => window.__ZOO__!.openFeed('tembo'));
  await page.waitForFunction(() => window.__ZOO__!.feedFoodsHome());
  const feed = (await page.evaluate(() => window.__ZOO__!.feedTargets()))!;
  await drag(page, Object.values(feed.foods)[0]!, feed.animal);
  await page.waitForFunction(() => window.__ZOO__!.feedCrossPos() !== null);
  // La cruz sale botando: se espera a que la comida vuelva a su sitio y la cruz esté quieta.
  await page.waitForFunction(() => window.__ZOO__!.feedFoodsHome());
  await page.waitForTimeout(600);
  const cross = (await page.evaluate(() => window.__ZOO__!.feedCrossPos()))!;
  const height = (await page.locator('canvas').boundingBox())!.height;
  // Mismo cálculo que FeedScene.showCross.
  const size = Math.min(110, Math.max(56, height * 0.14));
  return { cross, size, animal: feed.animal };
}

const inFeed = (page: Page) => page.evaluate(() => window.__ZOO__!.activeScenes().includes('Feed'));

for (const s of SIZES) {
  test.describe(s.name, () => {
    test.use({ viewport: { width: s.width, height: s.height } });

    test('un toque en el animal, junto a la cruz pero no en ella, no abre la clínica', async ({ page }) => {
      const { cross, size } = await feedSickUntilCross(page);
      // Fuera de la cruz dibujada (su mitad es size/2 + borde) pero dentro de su zona táctil (±size).
      const outside = { x: cross.x - size * 0.8, y: cross.y };
      const box = (await page.locator('canvas').boundingBox())!;
      await page.mouse.click(box.x + outside.x, box.y + outside.y);
      await page.waitForTimeout(500);
      expect(await inFeed(page)).toBe(true);
    });

    test('volver a dar comida al animal malito, soltándola junto a la cruz, no abre la clínica', async ({ page }) => {
      const { cross, size } = await feedSickUntilCross(page);
      const outside = { x: cross.x - size * 0.8, y: cross.y };
      const feed = (await page.evaluate(() => window.__ZOO__!.feedTargets()))!;
      await drag(page, Object.values(feed.foods)[0]!, outside);
      await page.waitForTimeout(500);
      expect(await inFeed(page)).toBe(true);
    });

    test('tocar el borde del botón (dentro del disco, a media cruz del centro) también lleva a la clínica', async ({ page }) => {
      const { cross, size } = await feedSickUntilCross(page);
      const box = (await page.locator('canvas').boundingBox())!;
      // El disco mide 0,65·size de radio: a 0,5·size del centro hacia el animal aún es botón.
      await page.mouse.click(box.x + cross.x - size * 0.5, box.y + cross.y);
      await page.waitForFunction(() => !window.__ZOO__!.activeScenes().includes('Feed'), null, { timeout: 10_000 });
    });

    test('tocar la cruz de verdad sí lleva a la clínica', async ({ page }) => {
      const { cross } = await feedSickUntilCross(page);
      const box = (await page.locator('canvas').boundingBox())!;
      await page.mouse.click(box.x + cross.x, box.y + cross.y);
      await page.waitForFunction(() => !window.__ZOO__!.activeScenes().includes('Feed'), null, { timeout: 10_000 });
    });
  });
}
