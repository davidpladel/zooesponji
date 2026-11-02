import { expect, test } from '@playwright/test';

test('con el joystick: arrastrar mueve a la cuidadora y al soltar se para, también fuera del juego', async ({ page }) => {
  await page.goto('/?sin-tutorial');
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.62);
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Hud'));
  // Se enciende el joystick desde Ajustes.
  await page.evaluate(() => window.__ZOO__!.openSettings());
  await page.waitForFunction(() => window.__ZOO__!.settingsTogglePos('joystick') !== null);
  const toggle = (await page.evaluate(() => window.__ZOO__!.settingsTogglePos('joystick')))!;
  await page.mouse.click(box.x + toggle.x, box.y + toggle.y);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.settings().joystick)).toBe(true);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__ZOO__!.activeScenes().includes('Settings'));

  const pos = () => page.evaluate(() => window.__ZOO__!.keeperPosition()!);
  const start = await pos();
  const origin = { x: box.x + box.width * 0.2, y: box.y + box.height * 0.75 };
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  await page.mouse.move(origin.x, origin.y - 60, { steps: 5 });
  await expect.poll(async () => (await pos()).y, { timeout: 10_000 }).toBeLessThan(start.y - 10);
  // Se suelta fuera del juego (por encima del lienzo): tiene que pararse igual.
  await page.mouse.move(origin.x, box.y - 5, { steps: 3 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const stopped = await pos();
  await page.waitForTimeout(800);
  expect(await pos()).toEqual(stopped);
});
