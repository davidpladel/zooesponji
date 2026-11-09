import { expect, test, type Page } from '@playwright/test';

test.setTimeout(150_000);

async function startGame(page: Page): Promise<void> {
  await page.goto('/?sin-tutorial');
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.62);
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('World'));
}

const coins = (page: Page) => page.evaluate(() => Number(window.__ZOO__!.hudCoinsText()));

/** Arrastra con el ratón de `from` a `to` en pasos, como un dedo. */
async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps = 12): Promise<void> {
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.move(box.x + from.x, box.y + from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) await page.mouse.move(box.x + from.x + ((to.x - from.x) * i) / steps, box.y + from.y + ((to.y - from.y) * i) / steps);
  await page.mouse.up();
}

test('limpieza: el cerdo manchado abre la limpieza, los 5 pasos pagan 4 y el charco vuelve a agua', async ({ page }) => {
  await startGame(page);
  await page.evaluate(async () => {
    await window.__ZOO__!.addCoins(500);
    await window.__ZOO__!.buy('cerdos');
    await window.__ZOO__!.forceSoil('rosita');
  });
  expect(await page.evaluate(() => window.__ZOO__!.careMarks('rosita'))).toEqual({ mud: true, sick: false });
  expect((await page.evaluate(() => window.__ZOO__!.puddleOf('cerdos')))?.muddy).toBe(true);
  // Tocar al cerdo (ir hasta él) abre la limpieza, no la comida.
  expect(await page.evaluate(() => window.__ZOO__!.feedResident('rosita'))).toBe(true);
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('Clean'), null, { timeout: 60_000 });
  expect(await page.evaluate(() => window.__ZOO__!.activeScenes())).not.toContain('Feed');
  const before = await coins(page);

  // Cada paso, frotando de verdad con su herramienta encima del animal; la que no toca no hace nada.
  for (let guard = 0; guard < 40; guard++) {
    const state = await page.evaluate(() => window.__ZOO__!.cleanState());
    if (!state || state.step === 'hecho') break;
    const t = (await page.evaluate(() => window.__ZOO__!.cleanTargets()))!;
    const a = t.animal;
    const path = [a, { x: a.x - 30, y: a.y }, { x: a.x + 30, y: a.y }, { x: a.x - 30, y: a.y + 10 }, { x: a.x + 30, y: a.y + 10 }];
    const box = (await page.locator('canvas').boundingBox())!;
    await page.mouse.move(box.x + t.tool!.x, box.y + t.tool!.y);
    await page.mouse.down();
    for (const p of path) for (let i = 0; i < 6; i++) await page.mouse.move(box.x + p.x + (i % 2) * 8, box.y + p.y + (i % 3) * 4);
    await page.mouse.up();
  }
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('World') && !window.__ZOO__!.activeScenes().includes('Clean'), null, { timeout: 10_000 });
  expect(await coins(page)).toBe(before + 4);
  expect(await page.evaluate(() => window.__ZOO__!.care())).toEqual({ dirty: [], sick: [], muddy: [] });
  expect(await page.evaluate(() => window.__ZOO__!.careMarks('rosita'))).toEqual({ mud: false, sick: false });
  expect((await page.evaluate(() => window.__ZOO__!.puddleOf('cerdos')))?.muddy).toBe(false);
});

test('limpieza: cerrarla a medias no paga ni limpia', async ({ page }) => {
  await startGame(page);
  await page.evaluate(async () => {
    await window.__ZOO__!.addCoins(500);
    await window.__ZOO__!.buy('cerdos');
    await window.__ZOO__!.forceSoil('rosita');
    window.__ZOO__!.openClean('rosita');
  });
  await page.waitForFunction(() => window.__ZOO__!.cleanState() !== null);
  const before = await coins(page);
  await page.evaluate(() => window.__ZOO__!.back());
  await page.waitForFunction(() => !window.__ZOO__!.activeScenes().includes('Clean'));
  expect(await coins(page)).toBe(before);
  expect((await page.evaluate(() => window.__ZOO__!.care())).dirty).toEqual(['rosita']);
});

test('clínica: comer con un malito da «¡puaj!» y la cruz; en la clínica están los dos, curar a uno deja al otro', async ({ page }) => {
  await startGame(page);
  await page.evaluate(async () => {
    await window.__ZOO__!.addCoins(5000);
    for (const id of ['cerdos', 'elefantes-africanos']) await window.__ZOO__!.buy(id);
    await window.__ZOO__!.giveClinic();
    await window.__ZOO__!.forceSick('tembo');
    await window.__ZOO__!.forceSick('rosita');
  });
  expect(await page.evaluate(() => window.__ZOO__!.careMarks('tembo'))).toEqual({ mud: false, sick: true });

  // Comer: cualquier comida le da «¡puaj!», no paga y sale la cruz.
  await page.evaluate(() => window.__ZOO__!.openFeed('tembo'));
  await page.waitForFunction(() => window.__ZOO__!.feedFoodsHome());
  const before = await coins(page);
  const feed = (await page.evaluate(() => window.__ZOO__!.feedTargets()))!;
  await drag(page, Object.values(feed.foods)[0]!, feed.animal);
  await page.waitForFunction(() => window.__ZOO__!.feedCrossPos() !== null);
  expect(await coins(page)).toBe(before);
  await page.evaluate(() => window.__ZOO__!.back());

  // En la clínica, las dos camillas ocupadas; se cura a Tembo tocando su camilla y dando las medicinas.
  await page.evaluate(() => window.__ZOO__!.openClinic());
  await page.waitForFunction(() => window.__ZOO__!.clinicBeds() !== null);
  expect(await page.evaluate(() => window.__ZOO__!.clinicBeds())).toEqual(['tembo', 'rosita']);
  const bed = (await page.evaluate(() => window.__ZOO__!.clinicBedPos(0)))!;
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.click(box.x + bed.x, box.y + bed.y);
  await page.waitForFunction(() => window.__ZOO__!.cureDoses() !== null, null, { timeout: 20_000 });
  for (let i = 0; i < 5; i++) {
    const cure = (await page.evaluate(() => window.__ZOO__!.cureTargets()))!;
    await drag(page, Object.values(cure.medicines)[i % 4]!, cure.animal);
  }
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('Clinic') && !window.__ZOO__!.activeScenes().includes('Cure'), null, { timeout: 10_000 });
  expect(await coins(page)).toBe(before + 10);
  expect(await page.evaluate(() => window.__ZOO__!.clinicBeds())).toEqual(['rosita', null]);
  expect((await page.evaluate(() => window.__ZOO__!.care())).sick).toEqual(['rosita']);
});

test('botón de la clínica: sale debajo del de la tienda tras la primera visita y lleva andando hasta ella', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.giveClinic());
  // Comprada pero sin haber entrado nunca: no hay botón.
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__ZOO__!.hudClinicButtonPos())).toBeNull();

  await page.evaluate(() => window.__ZOO__!.openClinic());
  await page.waitForFunction(() => window.__ZOO__!.clinicBeds() !== null);
  await page.evaluate(() => window.__ZOO__!.back());
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('World') && !window.__ZOO__!.activeScenes().includes('Clinic'));

  // Ya ha entrado una vez: el botón sale debajo del de la tienda.
  await page.waitForFunction(() => window.__ZOO__!.hudClinicButtonPos() !== null);
  const shop = (await page.evaluate(() => window.__ZOO__!.hudShopButtonPos()))!;
  const clinic = (await page.evaluate(() => window.__ZOO__!.hudClinicButtonPos()))!;
  expect(clinic.x).toBe(shop.x);
  expect(clinic.y).toBeGreaterThan(shop.y);

  // Tocarlo: la cuidadora va andando sola y entra.
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.click(box.x + clinic.x, box.y + clinic.y);
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('Clinic'), null, { timeout: 90_000 });
});
