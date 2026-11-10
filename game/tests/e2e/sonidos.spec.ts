import { expect, test, type Page } from '@playwright/test';

// Sonidos de comer, limpiar y curar elegidos por David el 2026-11-10 (core/sounds.ts).
test.setTimeout(150_000);

async function startGame(page: Page): Promise<void> {
  await page.goto('/?sin-tutorial');
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.62);
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('World'));
}

async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps = 12): Promise<void> {
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.move(box.x + from.x, box.y + from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) await page.mouse.move(box.x + from.x + ((to.x - from.x) * i) / steps, box.y + from.y + ((to.y - from.y) * i) / steps);
  await page.mouse.up();
}

const sounds = (page: Page) => page.evaluate(() => window.__ZOO__!.soundsPlayed());

async function feed(page: Page, residentId: string, food: string): Promise<void> {
  await page.evaluate((id) => window.__ZOO__!.openFeed(id), residentId);
  await page.waitForFunction(() => window.__ZOO__!.feedFoodsHome());
  const t = (await page.evaluate(() => window.__ZOO__!.feedTargets()))!;
  await page.evaluate(() => window.__ZOO__!.clearSounds());
  await drag(page, (t.foods as Record<string, { x: number; y: number }>)[food]!, t.animal);
}

test('comer: la zanahoria cruje', async ({ page }) => {
  await startGame(page);
  await feed(page, 'gordi', 'zanahoria');
  await expect.poll(() => sounds(page)).toContain('comer-crujiente');
  expect(await sounds(page)).not.toContain('comer-blanda');
});

test('comer: la carne se traga', async ({ page }) => {
  await startGame(page);
  await feed(page, 'bills', 'carne');
  await expect.poll(() => sounds(page)).toContain('comer-blanda');
  expect(await sounds(page)).not.toContain('comer-crujiente');
});

test('limpiar: cada herramienta suena al frotar (el cepillo, aún sin sonido)', async ({ page }) => {
  await startGame(page);
  await page.evaluate(async () => {
    await window.__ZOO__!.addCoins(500);
    await window.__ZOO__!.buy('cerdos');
    await window.__ZOO__!.forceSoil('rosita');
  });
  // Como jugando: la cuidadora va andando hasta el cerdo y se abre la limpieza.
  expect(await page.evaluate(() => window.__ZOO__!.feedResident('rosita'))).toBe(true);
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('Clean'), null, { timeout: 60_000 });
  const heard: Record<string, string[]> = {};
  for (let guard = 0; guard < 40; guard++) {
    const state = await page.evaluate(() => window.__ZOO__!.cleanState());
    if (!state || state.step === 'hecho') break;
    await page.evaluate(() => window.__ZOO__!.clearSounds());
    const t = (await page.evaluate(() => window.__ZOO__!.cleanTargets()))!;
    const a = t.animal;
    const path = [a, { x: a.x - 30, y: a.y }, { x: a.x + 30, y: a.y }, { x: a.x - 30, y: a.y + 10 }, { x: a.x + 30, y: a.y + 10 }];
    const box = (await page.locator('canvas').boundingBox())!;
    await page.mouse.move(box.x + t.tool!.x, box.y + t.tool!.y);
    await page.mouse.down();
    for (const p of path) for (let i = 0; i < 6; i++) await page.mouse.move(box.x + p.x + (i % 2) * 8, box.y + p.y + (i % 3) * 4);
    await page.mouse.up();
    heard[state.step] = [...(heard[state.step] ?? []), ...(await sounds(page))];
  }
  expect(heard.cacahuete).toContain('limpiar-cacahuete');
  expect(heard.jabon).toContain('limpiar-jabon');
  expect(heard.agua).toContain('limpiar-agua');
  expect(heard.toalla).toContain('limpiar-toalla');
  // Cada herramienta, solo su sonido: el del agua no suena con el jabón.
  expect(heard.jabon).not.toContain('limpiar-agua');
  expect(heard.cepillo?.some((id) => id.startsWith('limpiar-')) ?? false).toBe(false);
});

test('curar: cada medicina suena distinto', async ({ page }) => {
  await startGame(page);
  await page.evaluate(async () => {
    await window.__ZOO__!.addCoins(500);
    await window.__ZOO__!.buy('cerdos');
    await window.__ZOO__!.giveClinic();
    await window.__ZOO__!.forceSick('rosita');
  });
  await page.evaluate(() => window.__ZOO__!.openClinic());
  await page.waitForFunction(() => window.__ZOO__!.clinicBeds() !== null);
  const bed = (await page.evaluate(() => window.__ZOO__!.clinicBedPos(0)))!;
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.click(box.x + bed.x, box.y + bed.y);
  await page.waitForFunction(() => window.__ZOO__!.cureDoses() !== null, null, { timeout: 20_000 });
  for (const medicine of ['pastilla', 'vendaje', 'jarabe', 'termometro']) {
    await page.evaluate(() => window.__ZOO__!.clearSounds());
    const cure = (await page.evaluate(() => window.__ZOO__!.cureTargets()))!;
    const doses = (await page.evaluate(() => window.__ZOO__!.cureDoses()))!;
    await drag(page, (cure.medicines as Record<string, { x: number; y: number }>)[medicine]!, cure.animal);
    await expect.poll(() => sounds(page)).toContain(`curar-${medicine}`);
    expect(await sounds(page)).not.toContain('come');
    await page.waitForFunction((n) => window.__ZOO__!.cureDoses() === n + 1, doses);
    // La medicina vuelve a su sitio antes de coger la siguiente.
    await page.waitForTimeout(800);
  }
});

test('barro y malito: suenan si el animal está a la vista, no si está lejos', async ({ page }) => {
  await startGame(page);
  await page.evaluate(async () => {
    await window.__ZOO__!.addCoins(5000);
    await window.__ZOO__!.buy('cerdos');
    await window.__ZOO__!.buy('elefantes-africanos');
  });
  // Mirando al recinto de los cerdos: lo que les pasa a ellos suena; a los elefantes, lejos y fuera de la pantalla, no.
  const puddle = (await page.evaluate(() => window.__ZOO__!.puddleOf('cerdos')))!;
  await page.evaluate(({ x, y }) => window.__ZOO__!.lookAtTile(Math.floor(x / 16), Math.floor(y / 16)), puddle);
  await page.waitForTimeout(300);
  const off = (await page.evaluate(() => window.__ZOO__!.residentScreenPos('tembo')))!;
  expect(off.y < 0 || off.x < 0 || off.x > 1280 || off.y > 720).toBe(true);

  await page.evaluate(() => window.__ZOO__!.clearSounds());
  await page.evaluate(() => window.__ZOO__!.forceSoil('tembo', true));
  await page.waitForTimeout(300);
  expect(await sounds(page)).not.toContain('barro');
  await page.evaluate(() => window.__ZOO__!.forceSoil('rosita', true));
  await expect.poll(() => sounds(page)).toContain('barro');

  await page.waitForTimeout(900);
  await page.evaluate(() => window.__ZOO__!.clearSounds());
  await page.evaluate(() => window.__ZOO__!.forceSick('tembo', true));
  await page.waitForTimeout(300);
  expect(await sounds(page)).not.toContain('malito');
  await page.evaluate(() => window.__ZOO__!.forceSick('rosita', true));
  await expect.poll(() => sounds(page)).toContain('malito');
});
