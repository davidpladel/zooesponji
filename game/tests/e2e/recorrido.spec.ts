import { expect, test, type Page } from '@playwright/test';

// La cuidadora recorre a pie, tocando la pantalla como un niño, todas las casillas de camino del zoo y, con los
// recintos abiertos, todo su interior. Luna la sigue. Tarda varios minutos.
test.setTimeout(30 * 60_000);
// 630 px de alto: zoom 3 (computeZoom, base 160), así un punto a 6 pasos de la cuidadora (288 px) siempre cae
// en pantalla.
test.use({ viewport: { width: 1280, height: 630 }, screenshot: 'only-on-failure' });

const PEN_IDS = [
  'leon', 'cabra', 'pantera', 'panda', 'sabana', 'elefantes-africanos', 'elefantes-asiaticos', 'pinguinos', 'ovejas', 'estanque', 'establo',
];

async function startGame(page: Page): Promise<void> {
  await page.goto('/?sin-tutorial');
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'));
  const box = (await page.locator('canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.62);
  await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('World'));
}

/** Si al pisar algo se abrió otra pantalla (tienda, tablón, comer), se vuelve al mapa como haría un niño. */
async function backToMap(page: Page): Promise<string[]> {
  const closed: string[] = [];
  for (let i = 0; i < 4; i++) {
    const scenes = await page.evaluate(() => window.__ZOO__!.activeScenes());
    if (scenes.includes('World') && scenes.every((s) => s === 'World' || s === 'Hud')) return closed;
    closed.push(...scenes.filter((s) => s !== 'World' && s !== 'Hud'));
    await page.evaluate(() => window.__ZOO__!.back());
    await page.waitForTimeout(600);
  }
  return closed;
}

const tileGap = (page: Page) =>
  page.evaluate(() => {
    const pet = window.__ZOO__!.petPosition();
    const keeper = window.__ZOO__!.keeperPosition();
    return pet && keeper ? Math.max(Math.abs(pet.x - keeper.x), Math.abs(pet.y - keeper.y)) / 16 : null;
  });

async function walkTour(page: Page, withPens: boolean): Promise<void> {
  const points = await page.evaluate((pens) => window.__ZOO__!.tourWaypoints(6, pens), withPens);
  expect(points.length).toBeGreaterThan(0);
  const box = (await page.locator('canvas').boundingBox())!;
  for (const [i, p] of points.entries()) {
    const where = `punto ${i + 1}/${points.length} (${p.x},${p.y})`;
    for (let attempt = 0; ; attempt++) {
      // Al pisar la puerta de la tienda o el tablón se abre su pantalla: se cierra y cuenta como llegado.
      const closed = await backToMap(page);
      const at = await page.evaluate(() => window.__ZOO__!.keeperTile());
      if (at && at.x === p.x && at.y === p.y) break;
      // Al pisar la puerta de la tienda o el tablón se abre su pantalla; al salir de la tienda la cuidadora queda
      // una casilla por debajo de la puerta. Cuenta como llegado. (Si se abrió la de comer, se vuelve a tocar.)
      const door = closed.some((n) => n === 'Shop' || n === 'Board');
      if (door && at && Math.abs(at.x - p.x) + Math.abs(at.y - p.y) <= 2) break;
      // Si el toque cayó sobre un animal que está encima del punto, se espera a que se aparte.
      if (closed.includes('Feed')) await page.waitForTimeout(4_000);
      expect(attempt, `${where}: la cuidadora no llega (está en ${at?.x},${at?.y})`).toBeLessThan(8);
      const s = await page.evaluate(([x, y]) => window.__ZOO__!.tileToScreen(x!, y!), [p.x, p.y]);
      // Null: se acaba de abrir otra pantalla (p. ej. comer, al llegar junto a un animal tocado); se cierra arriba.
      if (!s) continue;
      // Si se quedó lejos (un toque fue a parar a un animal), se toca hacia el punto en el borde de la pantalla.
      const cx = box.width / 2;
      const cy = box.height / 2;
      const m = Math.max(Math.abs(s.x - cx) / (cx * 0.8), Math.abs(s.y - cy) / (cy * 0.8), 1);
      const onScreen = s.x > 0 && s.y > 0 && s.x < box.width && s.y < box.height;
      if (attempt === 0) expect(onScreen, `${where} fuera de la pantalla: ${s.x},${s.y}`).toBe(true);
      if (onScreen) await page.mouse.click(box.x + s.x, box.y + s.y);
      else await page.mouse.click(box.x + cx + (s.x - cx) / m, box.y + cy + (s.y - cy) / m);
      await expect
        .poll(
          async () => {
            const scenes = await page.evaluate(() => window.__ZOO__!.activeScenes());
            if (scenes.some((n) => n !== 'World' && n !== 'Hud')) return 'otra pantalla';
            const k = await page.evaluate(() => window.__ZOO__!.keeperTile());
            return k && k.x === p.x && k.y === p.y ? 'llegó' : 'andando';
          },
          { timeout: 8_000, intervals: [100] },
        )
        .not.toBe('andando')
        .catch(() => undefined);
    }
    // Dentro de un recinto Luna espera en la puerta: solo se mira por los caminos.
    if (!withPens) await expect.poll(() => tileGap(page), { message: `${where}: Luna se queda atrás`, timeout: 3_000 }).toBeLessThanOrEqual(3);
    expect(await page.evaluate(() => window.__ZOO__!.walkPropsAbove()), `${where}: algo que se pisa queda encima`).toEqual([]);
  }
}

test('la cuidadora recorre todos los caminos tocando la pantalla y Luna la sigue', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.addCoins(200));
  expect(await page.evaluate(() => window.__ZOO__!.buy('luna'))).toBe(true);
  await walkTour(page, false);
});

test('con todos los recintos abiertos, la cuidadora recorre sus interiores', async ({ page }) => {
  await startGame(page);
  await page.evaluate(async (ids) => {
    await window.__ZOO__!.addCoins(100_000);
    await window.__ZOO__!.buy('luna');
    for (const id of ids) await window.__ZOO__!.buy(id);
  }, PEN_IDS);
  await walkTour(page, true);
});
