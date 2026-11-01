import { expect, test, type Page } from '@playwright/test';
import { goodFood } from '../../src/core/tutorial';

test.setTimeout(150_000);

async function canvasBox(page: Page) {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('No hay canvas');
  return box;
}

/** Partida nueva, sin `?sin-tutorial`: al llegar al mapa sale el aviso. */
async function startGame(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
  const box = await canvasBox(page);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.62);
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Hud'));
}

const scenes = (page: Page) => page.evaluate(() => window.__ZOO__!.activeScenes());
const step = (page: Page) => page.evaluate(() => window.__ZOO__!.tutorialStep());
const hand = (page: Page) => page.evaluate(() => window.__ZOO__!.tutorialHand());

async function tapOffer(page: Page, which: 'learn' | 'skip'): Promise<void> {
  await page.waitForFunction((w) => window.__ZOO__!.tutorialOfferPos(w) !== null, which);
  const pos = (await page.evaluate((w) => window.__ZOO__!.tutorialOfferPos(w), which))!;
  const box = await canvasBox(page);
  await page.mouse.click(box.x + pos.x, box.y + pos.y);
}

async function feed(page: Page, residentId: string): Promise<void> {
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('World'));
  expect(await page.evaluate((id) => window.__ZOO__!.feedResident(id), residentId)).toBe(true);
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Feed'), undefined, { timeout: 90_000 });
}

async function dragFood(page: Page, food: string): Promise<void> {
  const targets = (await page.evaluate(() => window.__ZOO__!.feedTargets()))!;
  const box = await canvasBox(page);
  const from = (targets.foods as Record<string, { x: number; y: number }>)[food]!;
  await page.mouse.move(box.x + from.x, box.y + from.y);
  await page.mouse.down();
  await page.mouse.move(box.x + targets.animal.x, box.y + targets.animal.y, { steps: 12 });
  await page.mouse.up();
}

test('la primera vez sale el aviso; «Saltar» lo cierra y no vuelve a salir', async ({ page }) => {
  await startGame(page);
  await expect.poll(() => scenes(page)).toContain('TutorialOffer');
  expect(await page.evaluate(() => window.__ZOO__!.hudGearVisible())).toBe(false);
  await tapOffer(page, 'skip');
  await expect.poll(() => scenes(page)).not.toContain('TutorialOffer');
  expect(await step(page)).toBeNull();
  expect(await scenes(page)).toContain('World');

  await startGame(page);
  await page.waitForTimeout(1500);
  expect(await scenes(page)).not.toContain('TutorialOffer');
});

test('girar el móvil con el aviso abierto no lo rompe', async ({ page }) => {
  await startGame(page);
  await expect.poll(() => scenes(page)).toContain('TutorialOffer');
  await page.setViewportSize({ width: 900, height: 600 });
  await page.waitForTimeout(800);
  expect(await scenes(page)).toContain('TutorialOffer');
  await tapOffer(page, 'learn');
  await expect.poll(() => step(page)).toBe('move');
});

test('se aprende jugando: moverse, tocar, arrastrar la comida, monedas y tienda', async ({ page }) => {
  await startGame(page);
  await tapOffer(page, 'learn');
  await expect.poll(() => step(page)).toBe('move');
  await expect.poll(() => hand(page)).not.toBeNull();

  // Moverse: la cuidadora anda unas casillas.
  const spawn = (await page.evaluate(() => window.__ZOO__!.spawnTile()))!;
  expect(await page.evaluate(([x, y]) => window.__ZOO__!.goToTile(x, y), [spawn.x, spawn.y - 4] as const)).toBe(true);
  await expect.poll(() => step(page), { timeout: 20_000 }).toBe('tap-animal');

  // Tocar al animal abre su comida; cerrarla sin dar de comer vuelve al paso anterior.
  await feed(page, 'gordi');
  await expect.poll(() => step(page)).toBe('drag-food');
  const food = goodFood('cabra');
  const targets = (await page.evaluate(() => window.__ZOO__!.feedTargets()))!;
  const foodAt = (targets.foods as Record<string, { x: number; y: number }>)[food]!;
  await expect.poll(async () => {
    const h = await hand(page);
    return h ? Math.hypot(h.x - foodAt.x, h.y - foodAt.y) : Infinity;
  }).toBeLessThan(60);
  // Girar el móvil no cambia de paso.
  await page.setViewportSize({ width: 900, height: 600 });
  await page.waitForTimeout(600);
  expect(await step(page)).toBe('drag-food');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(600);
  await page.keyboard.press('Escape');
  await expect.poll(() => step(page)).toBe('tap-animal');

  await feed(page, 'gordi');
  await dragFood(page, food);
  await expect.poll(() => step(page)).toBe('coins');
  await expect.poll(() => step(page), { timeout: 8_000 }).toBe('shop');

  // Con menos de 20 monedas se juega libre; con 20, la mano señala la tienda.
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__ZOO__!.activeScenes().includes('Feed'));
  expect(await hand(page)).toBeNull();
  await page.evaluate(() => window.__ZOO__!.addCoins(20));
  await expect.poll(() => hand(page)).not.toBeNull();
  // Andando hasta la puerta, como el jugador: el mapa abre la tienda.
  const door = (await page.evaluate(() => window.__ZOO__!.shopDoorTile()))!;
  expect(await page.evaluate(([x, y]) => window.__ZOO__!.goToTile(x, y), [door.x, door.y] as const)).toBe(true);
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('Shop'), undefined, { timeout: 60_000 });
  await expect.poll(() => step(page)).toBeNull();
});

test('mientras se aprende no salta el panel del anuncio', async ({ page }) => {
  await startGame(page);
  await tapOffer(page, 'learn');
  await expect.poll(() => step(page)).toBe('move');
  await page.evaluate(() => window.__ZOO__!.adsFake('visto'));
  await page.evaluate(() => window.__ZOO__!.adsAdvance(900));
  await feed(page, 'gordi');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1500);
  expect(await scenes(page)).not.toContain('AdOffer');
});

test('la ✕ lo cierra a medias y desde el menú se vuelve a ver sin tocar las monedas', async ({ page }) => {
  await startGame(page);
  await tapOffer(page, 'learn');
  await expect.poll(() => step(page)).toBe('move');
  const box = await canvasBox(page);
  const close = (await page.evaluate(() => window.__ZOO__!.tutorialClosePos()))!;
  await page.mouse.click(box.x + close.x, box.y + close.y);
  await expect.poll(() => step(page)).toBeNull();

  await page.evaluate(() => window.__ZOO__!.addCoins(7));
  await page.evaluate(() => window.__ZOO__!.openSettings());
  await page.waitForFunction(() => window.__ZOO__!.settingsButtonPos('learn') !== null);
  const learn = (await page.evaluate(() => window.__ZOO__!.settingsButtonPos('learn')))!;
  await page.mouse.click(box.x + learn.x, box.y + learn.y);
  await expect.poll(() => step(page)).toBe('move');
  expect(await page.evaluate(() => window.__ZOO__!.hudCoinsText())).toBe('7');
  expect(await scenes(page)).not.toContain('Settings');
});
