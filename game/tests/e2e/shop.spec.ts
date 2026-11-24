import { expect, test, type Page } from '@playwright/test';

async function canvasBox(page: Page) {
  const box = await page.locator('canvas').first().boundingBox();
  if (!box) throw new Error('No hay canvas');
  return box;
}

async function startGame(page: Page): Promise<void> {
  await page.goto('/?sin-tutorial');
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
  const box = await canvasBox(page);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.62);
  await page.waitForFunction(() => {
    const scenes = window.__ZOO__?.activeScenes() ?? [];
    return scenes.includes('World') && scenes.includes('Hud');
  });
}

/** En la tienda: tocar el animal (la cuidadora va andando) y esperar su bocadillo de compra. */
async function walkToProduct(page: Page, itemId: string) {
  const box = await canvasBox(page);
  const card = await page.evaluate((id) => window.__ZOO__!.shopCardScreenPos(id), itemId);
  await page.mouse.click(box.x + card!.x, box.y + card!.y);
  await page.waitForFunction(
    (id) => window.__ZOO__!.shopActiveItem() === id && window.__ZOO__!.shopBuyBubblePos() !== null,
    itemId,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(300); // que termine de aparecer
  return (await page.evaluate(() => window.__ZOO__!.shopBuyBubblePos()))!;
}

test('fase B: la cuidadora entra andando, compra con el bocadillo y sale por el felpudo', async ({ page }) => {
  test.setTimeout(60_000); // anda de verdad por la tienda: con la máquina cargada tarda
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.addCoins(60));
  // Entrar de verdad: la cuidadora pisa la puerta del puesto.
  const door = await page.evaluate(() => window.__ZOO__!.shopDoorTile());
  await page.evaluate(([x, y]) => window.__ZOO__!.goToTile(x!, y!), [door!.x, door!.y]);
  await page.waitForFunction(() => window.__ZOO__!.shopCardScreenPos('pantera') !== null, undefined, { timeout: 20_000 });

  // El tendero saluda y la cuidadora entra andando hasta pasar el felpudo (sin salir otra vez).
  expect(await page.evaluate(() => window.__ZOO__!.shopBubble())).toBe('¡Hola! ¿Qué animal quieres hoy?');
  const matY = (await page.evaluate(() => window.__ZOO__!.shopDoorScreenPos()))!.y;
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.shopKeeperScreenPos()!.y)).toBeLessThan(matY - 20);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__ZOO__!.activeScenes())).toContain('Shop');

  // Tocar la pantera no la compra: la cuidadora va hasta ella y el tendero habla de ella.
  const box = await canvasBox(page);
  const bubble = await walkToProduct(page, 'pantera');
  expect(await page.evaluate(() => window.__ZOO__!.shopCardStatus('pantera'))).toBe('buy');
  expect(await page.evaluate(() => window.__ZOO__!.shopBubble())).toBe('¡La pantera es rapidísima!');

  // El bocadillo sí compra.
  await page.mouse.click(box.x + bubble.x, box.y + bubble.y);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.shopCardStatus('extra-pantera'))).toBe('buy');
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.shopBubble())).toBe('¡Gracias! ¡Cuídalo mucho!');

  // Sin monedas para el panda: bocadillo gris y el tendero avisa.
  const panda = await walkToProduct(page, 'panda');
  await page.mouse.click(box.x + panda.x, box.y + panda.y);
  // Dice cuántas faltan y cómo se ganan (los jugadores con IA no lo sabían).
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.shopBubble())).toMatch(/^¡Te faltan \d+ monedas! Dales de comer a los animales/);
  expect(await page.evaluate(() => window.__ZOO__!.shopCardStatus('panda'))).toBe('buy');

  // Tocar el felpudo: la cuidadora va andando, sale y aparece delante de la puerta del puesto.
  const mat = await page.evaluate(() => window.__ZOO__!.shopDoorScreenPos());
  await page.mouse.click(box.x + mat!.x, box.y + mat!.y);
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('World'), undefined, { timeout: 10_000 });
  const keeper = await page.evaluate(() => window.__ZOO__!.keeperPosition());
  expect(Math.floor(keeper!.y / 16)).toBe(door!.y + 1);
  // No vuelve a entrar solo.
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__ZOO__!.activeScenes())).not.toContain('Shop');
});

test('fase B: si el peque no se mueve, salen huellas que señalan qué comprar', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.addCoins(60));
  await page.evaluate(() => window.__ZOO__!.openShop());
  await page.waitForFunction(() => window.__ZOO__!.shopCardScreenPos('pantera') !== null);
  expect(await page.evaluate(() => window.__ZOO__!.shopHintVisible())).toBe(false);
  // 6 s de juego quieto tras el paseo de entrada; en CI el reloj del juego va más lento que el de verdad.
  await page.waitForFunction(() => window.__ZOO__!.shopHintVisible(), undefined, { timeout: 30_000 });

  // En cuanto se mueve, desaparecen.
  await page.keyboard.down('ArrowLeft');
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.shopHintVisible())).toBe(false);
  await page.keyboard.up('ArrowLeft');
});

test('fase B: ESC sigue cerrando la tienda', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.addCoins(20));
  await page.evaluate(() => window.__ZOO__!.openShop());
  await page.waitForFunction(() => window.__ZOO__!.shopCardScreenPos('pantera') !== null);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__ZOO__?.activeScenes().includes('Shop'));
});

test('libro: se abre desde la estantería y al comprar la pantera aparece Noche', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.addCoins(60));
  await page.evaluate(() => window.__ZOO__!.openShop());
  await page.waitForFunction(() => window.__ZOO__!.shopBookPos() !== null);
  const box = await canvasBox(page);

  // El libro está escondido: tocar la estantería lleva hasta ella y el libro salta fuera.
  const openBook = async () => {
    // Si ya está a la vista (se abrió una vez), se toca directamente; si no, la estantería lo hace saltar.
    if (!(await page.evaluate(() => window.__ZOO__!.shopBookNotice()))) {
      const shelf = (await page.evaluate(() => window.__ZOO__!.shopBookPos()))!;
      await page.mouse.click(box.x + shelf.x, box.y + shelf.y);
      await page.waitForFunction(() => window.__ZOO__!.shopBookOut(), undefined, { timeout: 10_000 });
      await page.waitForTimeout(400);
    }
    const book = (await page.evaluate(() => window.__ZOO__!.shopBookPos()))!;
    await page.mouse.click(box.x + book.x, box.y + book.y);
    await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('Book'));
  };
  expect(await page.evaluate(() => window.__ZOO__!.shopBookOut())).toBe(false);
  await openBook();
  expect(await page.evaluate(() => window.__ZOO__!.bookPage())).toBe('cover');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__ZOO__!.activeScenes().includes('Book'));

  const bubble = await walkToProduct(page, 'pantera');
  await page.mouse.click(box.x + bubble.x, box.y + bubble.y);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.shopCardStatus('extra-pantera'))).toBe('buy');

  // El libro se abre por la página nueva.
  await openBook();
  expect(await page.evaluate(() => window.__ZOO__!.bookPage())).toBe('noche');
  expect(await page.evaluate(() => window.__ZOO__!.bookText())).toContain('Noche es negra como el carbón');
});

test('libro: sin abrirlo nunca, aunque se compre, empieza por la primera hoja', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.addCoins(60));
  await page.evaluate(() => window.__ZOO__!.openShop());
  await page.waitForFunction(() => window.__ZOO__!.shopBookPos() !== null);
  const box = await canvasBox(page);
  const bubble = await walkToProduct(page, 'pantera');
  await page.mouse.click(box.x + bubble.x, box.y + bubble.y);
  await expect.poll(() => page.evaluate(() => window.__ZOO__!.shopCardStatus('extra-pantera'))).toBe('buy');

  const shelf = (await page.evaluate(() => window.__ZOO__!.shopBookPos()))!;
  await page.mouse.click(box.x + shelf.x, box.y + shelf.y);
  await page.waitForFunction(() => window.__ZOO__!.shopBookOut(), undefined, { timeout: 10_000 });
  await page.waitForTimeout(400);
  const book = (await page.evaluate(() => window.__ZOO__!.shopBookPos()))!;
  await page.mouse.click(box.x + book.x, box.y + book.y);
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('Book'));
  expect(await page.evaluate(() => window.__ZOO__!.bookPage())).toBe('cover');
});

test('libro: desde la 3.ª visita se ve parpadeando, y ya siempre', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.addCoins(30));
  const visit = async () => {
    await page.evaluate(() => window.__ZOO__!.openShop());
    await page.waitForFunction(() => window.__ZOO__!.shopBookPos() !== null);
    // Como un niño: no se sale en los primeros milisegundos (tras un giro, la tienda aún puede reiniciarse).
    await page.waitForTimeout(500);
  };
  const leave = async () => {
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.__ZOO__!.activeScenes().includes('Shop'));
  };
  await visit();
  expect(await page.evaluate(() => window.__ZOO__!.shopBookNotice())).toBe(false);
  // Girar el móvil dentro de la tienda no cuenta como otra visita.
  await page.setViewportSize({ width: 900, height: 600 });
  await page.waitForTimeout(800);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__ZOO__!.shopBookNotice())).toBe(false);
  await leave();
  await visit();
  expect(await page.evaluate(() => window.__ZOO__!.shopBookNotice())).toBe(false);
  await leave();
  await visit();
  expect(await page.evaluate(() => window.__ZOO__!.shopBookNotice())).toBe(true);

  // A la vista aunque la cuidadora esté en la puerta: tocarlo lo abre.
  const box = await canvasBox(page);
  const book = (await page.evaluate(() => window.__ZOO__!.shopBookPos()))!;
  await page.mouse.click(box.x + book.x, box.y + book.y);
  await page.waitForFunction(() => window.__ZOO__!.activeScenes().includes('Book'));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__ZOO__!.activeScenes().includes('Book'));
  // Una vez que ha salido, ya no se esconde.
  expect(await page.evaluate(() => window.__ZOO__!.shopBookNotice())).toBe(true);
  await leave();
  await visit();
  expect(await page.evaluate(() => window.__ZOO__!.shopBookNotice())).toBe(true);
});

/** Todos los mensajes del tendero, con el bocadillo de comprar a la vista (spec 2026-11-24-avisos-y-tienda). */
const KEEPER_LINES: [string, Record<string, number>?][] = [
  ['shop.hello'], ['shop.bookHint'], ['shop.boardHint'], ['shop.about.pantera'], ['shop.about.elefante-asiatico'],
  ['shop.about.luna'], ['shop.about.clinic'], ['shop.owned'], ['shop.full'], ['shop.needCoinsHow', { n: 120 }], ['shop.thanks'],
];

for (const size of [null, { width: 740, height: 340 }]) {
  test(`el tendero no queda tapado por el botón de comprar con ninguno de sus mensajes${size ? ' (apaisado bajo)' : ''}`, async ({ page }) => {
    test.setTimeout(90_000);
    if (size) await page.setViewportSize(size);
    await startGame(page);
    await page.evaluate(() => window.__ZOO__!.addCoins(60));
    await page.evaluate(() => window.__ZOO__!.openShop());
    await page.waitForFunction(() => window.__ZOO__!.shopCardScreenPos('pantera') !== null, undefined, { timeout: 20_000 });
    await walkToProduct(page, 'pantera');
    const canvas = await canvasBox(page);
    for (const [key, params] of KEEPER_LINES) {
      await page.evaluate(([k, p]) => window.__ZOO__!.shopSay(k as string, p as Record<string, number> | undefined), [key, params] as const);
      await page.waitForTimeout(260);
      const bubble = await page.evaluate(() => window.__ZOO__!.shopBubbleRect());
      const buy = await page.evaluate(() => window.__ZOO__!.shopBuyBubbleRect());
      expect(bubble, key).not.toBeNull();
      expect(buy, key).not.toBeNull();
      const apart = Math.abs(bubble!.x - buy!.x) >= (bubble!.w + buy!.w) / 2 || Math.abs(bubble!.y - buy!.y) >= (bubble!.h + buy!.h) / 2;
      expect(apart, `${key}: el globo pisa el botón de comprar`).toBe(true);
      expect(bubble!.x - bubble!.w / 2, key).toBeGreaterThanOrEqual(0);
      expect(bubble!.x + bubble!.w / 2, key).toBeLessThanOrEqual(canvas.width + 1);
      expect(bubble!.y + bubble!.h / 2, key).toBeLessThanOrEqual(canvas.height + 1);
      expect(await page.evaluate(() => window.__ZOO__!.shopBubbleAbove()), key).toBe(true);
    }
  });
}

async function buyPanteraAndWatchToast(page: Page) {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.addCoins(60));
  await page.evaluate(() => window.__ZOO__!.openShop());
  await page.waitForFunction(() => window.__ZOO__!.shopCardScreenPos('pantera') !== null, undefined, { timeout: 20_000 });
  const box = await canvasBox(page);
  const buy = await walkToProduct(page, 'pantera');
  const buyRect = (await page.evaluate(() => window.__ZOO__!.shopBuyBubbleRect()))!;
  await page.mouse.click(box.x + buy.x, box.y + buy.y);
  await page.waitForFunction(() => window.__ZOO__!.hudToastRect() !== null, undefined, { timeout: 5_000 });
  const shownAt = Date.now();
  const toast = (await page.evaluate(() => window.__ZOO__!.hudToastRect()))!;
  const keeper = await page.evaluate(() => window.__ZOO__!.shopBubbleRect());
  return { box, toast, keeper, buyRect, shownAt };
}

const apart = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  Math.abs(a.x - b.x) >= (a.w + b.w) / 2 || Math.abs(a.y - b.y) >= (a.h + b.h) / 2;

for (const size of [null, { width: 740, height: 340 }]) {
  test(`el aviso de página nueva sale a la derecha y dura más${size ? ' (apaisado bajo)' : ''}`, async ({ page }) => {
    test.setTimeout(60_000);
    if (size) await page.setViewportSize(size);
    const { box, toast, keeper, buyRect, shownAt } = await buyPanteraAndWatchToast(page);
    // A la derecha; en pantalla baja manda no pisar el botón ni el globo, aunque tenga que moverse.
    if (!size) expect(toast.x).toBeGreaterThan(box.width / 2);
    expect(toast.x - toast.w / 2).toBeGreaterThanOrEqual(0);
    expect(toast.x + toast.w / 2).toBeLessThanOrEqual(box.width + 1);
    expect(apart(toast, buyRect)).toBe(true);
    expect(toast.y - toast.h / 2, 'por debajo de la X de salir').toBeGreaterThan(76);
    if (keeper) expect(apart(toast, keeper)).toBe(true);
    await page.waitForTimeout(Math.max(0, 3000 - (Date.now() - shownAt)));
    expect(await page.evaluate(() => window.__ZOO__!.hudToast())).not.toBeNull();
    await expect.poll(() => page.evaluate(() => window.__ZOO__!.hudToast()), { timeout: 3_000 }).toBeNull();
  });
}

test.describe('en árabe', () => {
  test.use({ locale: 'ar-SA' });
  test('el aviso de página nueva también va a la derecha y cabe en pantalla', async ({ page }) => {
    test.setTimeout(60_000);
    const { box, toast } = await buyPanteraAndWatchToast(page);
    expect(toast.x).toBeGreaterThan(box.width / 2);
    expect(toast.x - toast.w / 2).toBeGreaterThanOrEqual(0);
    expect(toast.x + toast.w / 2).toBeLessThanOrEqual(box.width + 1);
  });
});

test('los demás avisos siguen saliendo en el centro', async ({ page }) => {
  await startGame(page);
  const box = await canvasBox(page);
  await page.evaluate(() => window.__ZOO__!.emitToast('¡Prueba!'));
  await page.waitForFunction(() => window.__ZOO__!.hudToastRect() !== null);
  const toast = (await page.evaluate(() => window.__ZOO__!.hudToastRect()))!;
  expect(Math.abs(toast.x - box.width / 2)).toBeLessThan(2);
});
