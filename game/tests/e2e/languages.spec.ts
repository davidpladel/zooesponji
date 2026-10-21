import { expect, test, type Page } from '@playwright/test';

async function canvasBox(page: Page) {
  const box = await page.locator('canvas').first().boundingBox();
  if (!box) throw new Error('No hay canvas');
  return box;
}

async function tap(page: Page, pos: { x: number; y: number } | null): Promise<void> {
  if (!pos) throw new Error('Posición desconocida');
  const box = await canvasBox(page);
  await page.mouse.click(box.x + pos.x, box.y + pos.y);
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

// El idioma del móvil decide el del juego; si no lo tenemos, inglés.
for (const [locale, expected, play] of [
  ['fr-FR', 'fr', 'Jouer'],
  ['pt-PT', 'pt-PT', 'Jogar'],
  ['pt-BR', 'pt-BR', 'Jogar'],
  ['it-IT', 'it', 'Gioca'],
  ['ru-RU', 'ru', 'Играть'],
  ['ar-SA', 'ar', 'العب'],
  ['hi-IN', 'hi', 'खेलो'],
  ['zh-CN', 'zh', '开始玩'],
  ['ja-JP', 'ja', 'あそぶ'],
  ['de-DE', 'en', 'Play'],
] as const) {
  test.describe(`móvil en ${locale}`, () => {
    test.use({ locale });

    test(`el juego sale en ${expected}`, async ({ page }) => {
      await page.goto('/');
      await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
      expect(await page.evaluate(() => window.__ZOO__!.language())).toBe(expected);
      expect(await page.evaluate(() => window.__ZOO__!.titlePlayLabel())).toBe(play);
      await expect(page.locator('html')).toHaveAttribute('lang', expected);
    });
  });
}

test.describe('lista de idiomas', () => {
  test.use({ locale: 'fr-FR' });

  test('tocar fuera la cierra sin cambiar; elegir japonés lo cambia y se guarda', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => window.__ZOO__!.openSettings());
    await page.waitForFunction(() => window.__ZOO__!.settingsLanguagePos() !== null);
    expect(await page.evaluate(() => window.__ZOO__!.settingsLanguageLabel())).toBe('Français');

    await tap(page, await page.evaluate(() => window.__ZOO__!.settingsLanguagePos()));
    await page.waitForFunction(() => window.__ZOO__!.settingsLanguageOptionPos('ja') !== null);
    // Esquina de arriba a la izquierda: fuera de la lista.
    await tap(page, { x: 4, y: 4 });
    await page.waitForFunction(() => window.__ZOO__!.settingsLanguageOptionPos('ja') === null);
    expect(await page.evaluate(() => window.__ZOO__!.language())).toBe('fr');
    expect(await page.evaluate(() => window.__ZOO__!.activeScenes())).toContain('Settings');

    await tap(page, await page.evaluate(() => window.__ZOO__!.settingsLanguagePos()));
    await page.waitForFunction(() => window.__ZOO__!.settingsLanguageOptionPos('ja') !== null);
    await tap(page, await page.evaluate(() => window.__ZOO__!.settingsLanguageOptionPos('ja')));
    await expect.poll(() => page.evaluate(() => window.__ZOO__!.language())).toBe('ja');
    await page.waitForFunction(() => window.__ZOO__!.settingsLanguageLabel() === '日本語');
    expect(await page.evaluate(() => window.__ZOO__!.settings().language)).toBe('ja');

    await page.reload();
    await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
    expect(await page.evaluate(() => window.__ZOO__!.titlePlayLabel())).toBe('あそぶ');
  });
});
