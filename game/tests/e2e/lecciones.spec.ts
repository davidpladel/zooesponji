import { expect, test, type Page } from '@playwright/test';

test.setTimeout(150_000);

/**
 * Partida nueva sin el aviso de inicio (`?sin-tutorial`), pero con los avisos de la limpieza y de la clínica
 * (`&lecciones`: el resto de pruebas los saltan).
 */
async function startGame(page: Page): Promise<void> {
  await page.goto('/?sin-tutorial&lecciones');
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.62);
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('World'));
}

async function canvasClick(page: Page, pos: { x: number; y: number }): Promise<void> {
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.click(box.x + pos.x, box.y + pos.y);
}

/** Arrastra con el ratón de `from` a `to` en pasos, como un dedo. */
async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps = 12): Promise<void> {
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.move(box.x + from.x, box.y + from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) await page.mouse.move(box.x + from.x + ((to.x - from.x) * i) / steps, box.y + from.y + ((to.y - from.y) * i) / steps);
  await page.mouse.up();
}

/** Entra en la tienda y sale con ESC, sin comprar nada en ella. */
async function visitShop(page: Page): Promise<void> {
  await page.evaluate(() => window.__ZOO__!.openShop());
  await page.waitForFunction(() => window.__ZOO__!.shopCardScreenPos('pantera') !== null);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__ZOO__?.activeScenes().includes('Shop'));
}

const offerLesson = (page: Page) => page.evaluate(() => window.__ZOO__!.tutorialOfferLesson());
const lesson = (page: Page) => page.evaluate(() => window.__ZOO__!.tutorialLesson());
const step = (page: Page) => page.evaluate(() => window.__ZOO__!.tutorialStep());

async function tapOffer(page: Page, which: 'learn' | 'skip'): Promise<void> {
  await page.waitForFunction((w) => window.__ZOO__!.tutorialOfferPos(w) !== null, which);
  await canvasClick(page, (await page.evaluate((w) => window.__ZOO__!.tutorialOfferPos(w), which))!);
}

/** Limpia frotando de verdad cada herramienta encima del animal; devuelve los pasos que la lección ha seguido. */
async function cleanAll(page: Page): Promise<string[]> {
  const seen: string[] = [];
  for (let guard = 0; guard < 40; guard++) {
    const state = await page.evaluate(() => window.__ZOO__!.cleanState());
    if (!state || state.step === 'hecho') break;
    await expect.poll(() => step(page)).toBe(state.step);
    await page.waitForFunction(() => window.__ZOO__!.tutorialHand() !== null);
    if (!seen.includes(state.step)) seen.push(state.step);
    const t = (await page.evaluate(() => window.__ZOO__!.cleanTargets()))!;
    const a = t.animal;
    const path = [a, { x: a.x - 30, y: a.y }, { x: a.x + 30, y: a.y }, { x: a.x - 30, y: a.y + 10 }, { x: a.x + 30, y: a.y + 10 }];
    const box = (await page.locator('canvas').boundingBox())!;
    await page.mouse.move(box.x + t.tool!.x, box.y + t.tool!.y);
    await page.mouse.down();
    for (const p of path) for (let i = 0; i < 6; i++) await page.mouse.move(box.x + p.x + (i % 2) * 8, box.y + p.y + (i % 3) * 4);
    await page.mouse.up();
  }
  return seen;
}

async function buy(page: Page, ...items: string[]): Promise<void> {
  await page.evaluate(async (list) => {
    await window.__ZOO__!.addCoins(5000);
    for (const item of list) await window.__ZOO__!.buy(item);
  }, items);
}

test('en la tienda no sale ningún aviso; al salir, el de la limpieza', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.openShop());
  await page.waitForFunction(() => window.__ZOO__!.shopCardScreenPos('pantera') !== null);
  await buy(page, 'elefantes-asiaticos');
  await page.waitForTimeout(1500);
  expect(await offerLesson(page)).toBeNull();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__ZOO__!.tutorialOfferLesson() === 'limpieza', null, { timeout: 10_000 });
});

test('comprar elefantes asiáticos: Aprender lleva a un elefante asiático sucio y la mano pasa por los 5 pasos', async ({ page }) => {
  await startGame(page);
  await buy(page, 'elefantes-asiaticos');
  await visitShop(page);
  await page.waitForFunction(() => window.__ZOO__!.tutorialOfferLesson() === 'limpieza', null, { timeout: 10_000 });
  await tapOffer(page, 'learn');
  await page.waitForFunction(() => window.__ZOO__!.tutorialLesson() === 'limpieza');
  expect(await step(page)).toBe('tap-dirty');
  const practice = (await page.evaluate(() => window.__ZOO__!.tutorialPractice()))!;
  expect(await page.evaluate(() => window.__ZOO__!.care().dirty)).toContain(practice);
  expect((await page.evaluate(() => window.__ZOO__!.puddleOf('elefantes-asiaticos')))?.muddy).toBe(true);
  await page.waitForFunction(() => window.__ZOO__!.tutorialHand() !== null);

  // Al tocarlo se abre la limpieza, y la lección sigue cada herramienta con la mano.
  expect(await page.evaluate((id) => window.__ZOO__!.feedResident(id), practice)).toBe(true);
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('Clean'), null, { timeout: 60_000 });
  const seen = await cleanAll(page);
  expect(seen).toEqual(['cacahuete', 'cepillo', 'jabon', 'agua', 'toalla']);
  // Limpio: la lección acaba y no queda ninguna en la cola.
  await page.waitForFunction(() => window.__ZOO__!.tutorialLesson() === null);
  expect(await page.evaluate(() => window.__ZOO__!.care().dirty)).toEqual([]);
});

test('comprar elefantes y clínica en la misma visita: limpieza primero y, al saltarla, clínica', async ({ page }) => {
  await startGame(page);
  await buy(page, 'elefantes-asiaticos', 'clinic');
  await visitShop(page);
  await page.waitForFunction(() => window.__ZOO__!.tutorialOfferLesson() === 'limpieza', null, { timeout: 10_000 });
  await tapOffer(page, 'skip');
  await page.waitForFunction(() => window.__ZOO__!.tutorialOfferLesson() === 'clinica', null, { timeout: 10_000 });
  await tapOffer(page, 'learn');
  await page.waitForFunction(() => window.__ZOO__!.tutorialLesson() === 'clinica');
  expect(await step(page)).toBe('tap-sick');
  const practice = (await page.evaluate(() => window.__ZOO__!.tutorialPractice()))!;
  expect(await page.evaluate(() => window.__ZOO__!.care().sick)).toEqual([practice]);
  // Saltada la limpieza, no se ensució nada.
  expect(await page.evaluate(() => window.__ZOO__!.care().dirty)).toEqual([]);

  // Al tocar al enfermo se abre la comida; la mano lleva una comida, sale la cruz y la mano la señala.
  expect(await page.evaluate((id) => window.__ZOO__!.feedResident(id), practice)).toBe(true);
  await page.waitForFunction(() => window.__ZOO__!.tutorialStep() === 'drag-food', null, { timeout: 60_000 });
  await page.waitForFunction(() => window.__ZOO__!.tutorialHand() !== null);
  await page.waitForTimeout(500);
  const feed = (await page.evaluate(() => window.__ZOO__!.feedTargets()))!;
  await drag(page, Object.values(feed.foods)[0]!, feed.animal);
  await page.waitForFunction(() => window.__ZOO__!.tutorialStep() === 'cross');
  await page.waitForFunction(() => window.__ZOO__!.tutorialHand() !== null);
  await canvasClick(page, (await page.evaluate(() => window.__ZOO__!.feedCrossPos()))!);

  // La cuidadora va sola a la clínica; allí la mano señala su camilla.
  await page.waitForFunction(() => window.__ZOO__!.tutorialStep() === 'bed');
  await page.waitForFunction(() => window.__ZOO__!.clinicBeds() !== null, null, { timeout: 90_000 });
  await page.waitForFunction(() => window.__ZOO__!.tutorialHand() !== null);
  const beds = (await page.evaluate(() => window.__ZOO__!.clinicBeds()))!;
  await canvasClick(page, (await page.evaluate((i) => window.__ZOO__!.clinicBedPos(i), beds.indexOf(practice)))!);

  // Curar: la mano lleva las medicinas hasta llenar la barra; curado, la lección acaba.
  await page.waitForFunction(() => window.__ZOO__!.tutorialStep() === 'cure', null, { timeout: 20_000 });
  await page.waitForFunction(() => window.__ZOO__!.cureDoses() !== null);
  await page.waitForFunction(() => window.__ZOO__!.tutorialHand() !== null);
  for (let i = 0; i < 5; i++) {
    const cure = (await page.evaluate(() => window.__ZOO__!.cureTargets()))!;
    await drag(page, Object.values(cure.medicines)[i % 4]!, cure.animal);
  }
  await page.waitForFunction(() => window.__ZOO__!.tutorialLesson() === null, null, { timeout: 10_000 });
  expect(await page.evaluate(() => window.__ZOO__!.care().sick)).toEqual([]);
});

test('quien ya tenía elefantes de antes: aviso al salir de la tienda sin comprar nada', async ({ page }) => {
  await startGame(page);
  // Como una partida de antes: elefantes abiertos sin haber pasado por el aviso.
  await buy(page, 'elefantes-africanos');
  await page.waitForTimeout(1000);
  expect(await offerLesson(page)).toBeNull();
  await visitShop(page);
  await page.waitForFunction(() => window.__ZOO__!.tutorialOfferLesson() === 'limpieza', null, { timeout: 10_000 });
  await tapOffer(page, 'skip');
  // Sale una vez: la siguiente visita a la tienda ya no lo trae.
  await page.waitForFunction(() => window.__ZOO__!.tutorialOfferLesson() === null);
  await visitShop(page);
  await page.waitForTimeout(1500);
  expect(await offerLesson(page)).toBeNull();
});

test('Aprender del menú con cerdos y clínica: inicio, limpieza y clínica seguidas', async ({ page }) => {
  await startGame(page);
  await buy(page, 'cerdos', 'clinic');
  // El botón del menú pone en la cola las tres.
  await page.evaluate(() => window.__ZOO__!.openSettings());
  await page.waitForFunction(() => window.__ZOO__!.settingsButtonPos('learn') !== null);
  await canvasClick(page, (await page.evaluate(() => window.__ZOO__!.settingsButtonPos('learn')))!);
  await page.waitForFunction(() => window.__ZOO__!.tutorialLesson() === 'inicio');
  expect(await page.evaluate(() => window.__ZOO__!.tutorialLessons())).toEqual(['inicio', 'limpieza', 'clinica']);

  // Sin pausa entre una y otra: al acabar la limpieza empieza la clínica.
  await page.evaluate(() => window.__ZOO__!.openTutorial(['limpieza', 'clinica']));
  await page.waitForFunction(() => window.__ZOO__!.tutorialLesson() === 'limpieza');
  expect(await step(page)).toBe('tap-dirty');
  const pig = (await page.evaluate(() => window.__ZOO__!.tutorialPractice()))!;
  await page.evaluate((id) => window.__ZOO__!.openClean(id), pig);
  await page.waitForFunction(() => window.__ZOO__!.cleanState() !== null);
  await cleanAll(page);
  await page.waitForFunction(() => window.__ZOO__!.tutorialLesson() === 'clinica', null, { timeout: 10_000 });
  expect(await step(page)).toBe('tap-sick');
  expect(await page.evaluate(() => window.__ZOO__!.care().sick)).toHaveLength(1);

  // La ✕ corta toda la cola.
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('World') && window.__ZOO__!.tutorialCloseVisible());
  await canvasClick(page, (await page.evaluate(() => window.__ZOO__!.tutorialClosePos()))!);
  await page.waitForFunction(() => window.__ZOO__!.tutorialLesson() === null);
});

test('quien ya lo tenía todo y no entra en la tienda: al empezar la partida, un aviso y, si lo salta, el otro al rato', async ({ page }) => {
  await startGame(page);
  await buy(page, 'elefantes-asiaticos', 'clinic');
  expect(await offerLesson(page)).toBeNull();
  // Otra partida otro día (`lecciones=rapido`: espera 1 s en vez de los minutos de verdad).
  await page.goto('/?sin-tutorial&lecciones=rapido');
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.62);
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('World'));
  await page.waitForFunction(() => window.__ZOO__!.tutorialOfferLesson() === 'limpieza', null, { timeout: 15_000 });
  await tapOffer(page, 'skip');
  // No sale seguido: espera su rato.
  await page.waitForFunction(() => window.__ZOO__!.tutorialOfferLesson() === null);
  await page.waitForTimeout(300);
  expect(await offerLesson(page)).toBeNull();
  await page.waitForFunction(() => window.__ZOO__!.tutorialOfferLesson() === 'clinica', null, { timeout: 15_000 });
  await tapOffer(page, 'skip');
  // Saltados los dos, ya no vuelven.
  await page.waitForTimeout(3000);
  expect(await offerLesson(page)).toBeNull();
  expect(await page.evaluate(() => window.__ZOO__!.activeScenes())).not.toContain('TutorialOffer');
});
