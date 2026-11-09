import { expect, test, type Page } from '@playwright/test';

test.setTimeout(150_000);

async function startGame(page: Page): Promise<void> {
  await page.goto('/?sin-tutorial');
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.62);
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('World'));
}

const gap = (page: Page) =>
  page.evaluate(() => {
    const pet = window.__ZOO__!.petPosition();
    const keeper = window.__ZOO__!.keeperPosition();
    return pet && keeper ? Math.hypot(pet.x - keeper.x, pet.y - keeper.y) : null;
  });

async function buyLuna(page: Page): Promise<void> {
  await page.evaluate(() => window.__ZOO__!.addCoins(200));
  expect(await page.evaluate(() => window.__ZOO__!.buy('luna'))).toBe(true);
}

test('sin comprarla no hay Luna; comprada, aparece junto a la cuidadora y la sigue', async ({ page }) => {
  await startGame(page);
  expect(await page.evaluate(() => window.__ZOO__!.petPosition())).toBeNull();
  await buyLuna(page);
  expect(await gap(page)).toBeLessThan(40);
  // La cuidadora sube por el camino central hasta la plaza.
  expect(await page.evaluate(() => window.__ZOO__!.goToTile(47, 40))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.keeperPosition()!.y), { timeout: 60_000 }).toBeLessThan(41 * 16);
  await expect.poll(() => gap(page), { timeout: 10_000 }).toBeLessThan(40);
});

test('cuando la cuidadora entra en un recinto, Luna espera en la puerta', async ({ page }) => {
  await startGame(page);
  await buyLuna(page);
  expect(await page.evaluate(() => window.__ZOO__!.buy('pantera'))).toBe(true);
  // La puerta se pide antes: con la comida abierta, el mapa está en pausa.
  const door = await page.evaluate(() => window.__ZOO__!.gateApproachTile('pantera'));
  expect(await page.evaluate(() => window.__ZOO__!.feedResident('noche'))).toBe(true);
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Feed'), undefined, { timeout: 90_000 });
  const pet = await page.evaluate(() => window.__ZOO__!.petPosition());
  expect(Math.hypot(pet!.x - (door!.x * 16 + 8), pet!.y - (door!.y * 16 + 8))).toBeLessThan(40);
});

test('en la tienda Luna curiosea a su aire y al salir vuelve con la cuidadora', async ({ page }) => {
  await startGame(page);
  await buyLuna(page);
  await page.evaluate(() => window.__ZOO__!.openShop());
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Shop'));
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.shopPetPosition())).not.toBeNull();
  const first = await page.evaluate(() => window.__ZOO__!.shopPetPosition());
  await page.waitForTimeout(1500);
  const seen = new Set<string>();
  for (let i = 0; i < 12; i++) {
    const p = await page.evaluate(() => window.__ZOO__!.shopPetPosition());
    seen.add(`${Math.round(p!.x)},${Math.round(p!.y)}`);
    await page.waitForTimeout(500);
  }
  expect(seen.size).toBeGreaterThan(1);
  expect(seen.has(`${Math.round(first!.x)},${Math.round(first!.y)}`) && seen.size === 1).toBe(false);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__ZOO__?.activeScenes().includes('Shop'));
  await expect.poll(() => gap(page)).toBeLessThan(40);
});

test('Luna entra en la clínica detrás de la cuidadora, curiosea y sale con ella; sin Luna, no hay perrita', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.giveClinic());
  // Sin Luna comprada, en la clínica no hay perrita.
  await page.evaluate(() => window.__ZOO__!.openClinic());
  await page.waitForFunction(() => window.__ZOO__!.clinicBeds() !== null);
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__ZOO__!.clinicPetPosition())).toBeNull();
  await page.evaluate(() => window.__ZOO__!.back());
  await page.waitForFunction(() => !window.__ZOO__?.activeScenes().includes('Clinic'));

  await buyLuna(page);
  await page.evaluate(() => window.__ZOO__!.openClinic());
  await page.waitForFunction(() => window.__ZOO__!.clinicBeds() !== null);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.clinicPetPosition())).not.toBeNull();
  // Curiosea: no se queda quieta en un sitio.
  await page.waitForTimeout(1500);
  const seen = new Set<string>();
  for (let i = 0; i < 12; i++) {
    const p = await page.evaluate(() => window.__ZOO__!.clinicPetPosition());
    seen.add(`${Math.round(p!.x)},${Math.round(p!.y)}`);
    await page.waitForTimeout(500);
  }
  expect(seen.size).toBeGreaterThan(1);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__ZOO__?.activeScenes().includes('Clinic'));
  await expect.poll(() => gap(page)).toBeLessThan(40);
});
