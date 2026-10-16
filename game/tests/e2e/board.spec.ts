import { expect, test, type Page, type Route } from '@playwright/test';

const BASE = 'https://comunidad.test';

const OPEN = {
  hoy: '2026-11-03', ideas: 127,
  votacion: {
    id: '2026-11-a', abre: '2026-11-01', cierra: '2026-11-15', ganadora: null, abierta: true,
    opciones: [
      { id: 'delfines', titulo: { es: 'Delfines', en: 'Dolphins' }, dibujo: 'delfines.png', ideaDe: 'Lucía' },
      { id: 'koalas', titulo: { es: 'Koalas', en: 'Koalas' }, dibujo: 'koalas.png' },
    ],
    reparto: { delfines: 50, koalas: 50 },
  },
  muro: [{ titulo: { es: 'Pingüinos', en: 'Penguins' }, dibujo: 'pinguinos.png', ideaDe: 'Adrián', estado: 'hecha', recinto: 'pinguinos' }],
};

interface Fake { votes: unknown[]; status: unknown; offline: boolean; delayMs: number }

async function fakeServer(page: Page, initial: Partial<Fake> = {}): Promise<Fake> {
  const fake: Fake = { votes: [], status: OPEN, offline: false, delayMs: 0, ...initial };
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };
  await page.route(`${BASE}/**`, async (route: Route) => {
    if (fake.offline) return route.abort('internetdisconnected');
    if (fake.delayMs) await new Promise((r) => setTimeout(r, fake.delayMs));
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (path === '/estado.php') return route.fulfill({ status: 200, headers: cors, json: fake.status });
    if (path === '/voto.php') {
      fake.votes.push(request.postDataJSON());
      return route.fulfill({ status: 200, headers: cors, json: { ok: true, reparto: { delfines: 65, koalas: 35 } } });
    }
    // Dibujos: no hay; el juego pone el de reserva.
    return route.fulfill({ status: 404, headers: cors, body: '' });
  });
  return fake;
}

async function canvasBox(page: Page) {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('No hay canvas');
  return box;
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

async function click(page: Page, pos: { x: number; y: number } | null): Promise<void> {
  if (!pos) throw new Error('No hay dónde tocar');
  const box = await canvasBox(page);
  await page.mouse.click(box.x + pos.x, box.y + pos.y);
}

const scenes = (page: Page) => page.evaluate(() => window.__ZOO__!.activeScenes());
const log = (page: Page) => page.evaluate(() => window.__ZOO__!.busLog());

async function closeNoticeIfAny(page: Page): Promise<void> {
  // El aviso tarda ~1-2 s tras la respuesta: se espera por condición.
  await expect.poll(() => log(page), { timeout: 10_000 }).toContain('poll-notice');
  await page.waitForFunction(() => window.__ZOO__!.pollNoticePos('no') !== null);
  await click(page, await page.evaluate(() => window.__ZOO__!.pollNoticePos('no')));
  await expect.poll(() => scenes(page)).not.toContain('PollNotice');
  await expect.poll(() => scenes(page)).toContain('World');
}

test('sin tablón configurado no hay tablón ni aviso', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => { if (r.url().startsWith(BASE)) requests.push(r.url()); });
  await startGame(page);
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.__ZOO__!.boardTile())).toBeNull();
  expect(await scenes(page)).not.toContain('PollNotice');
  expect(requests).toEqual([]);
});

test('el aviso salta una vez, y el botón verde lleva al tablón', async ({ page }) => {
  await fakeServer(page);
  await startGame(page);
  await page.evaluate((b) => window.__ZOO__!.communityStart(b), BASE);
  await page.waitForFunction(() => window.__ZOO__!.pollNoticePos('yes') !== null);
  await click(page, await page.evaluate(() => window.__ZOO__!.pollNoticePos('yes')));
  await page.waitForFunction(() => window.__ZOO__!.boardView() === 'cards');
  await page.evaluate(() => window.__ZOO__!.back());
  await expect.poll(() => scenes(page)).toContain('World');
  // Vuelta al mapa desde la tienda: no vuelve a saltar.
  await page.evaluate(() => window.__ZOO__!.openShop());
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__ZOO__!.back());
  await page.waitForTimeout(1500);
  expect(await scenes(page)).not.toContain('PollNotice');
  expect((await log(page)).filter((n) => n === 'poll-notice')).toHaveLength(1);
});

test('se vota con dos toques, salen las barras y se puede cambiar', async ({ page }) => {
  const fake = await fakeServer(page);
  await startGame(page);
  await page.evaluate((b) => window.__ZOO__!.communityStart(b), BASE);
  await closeNoticeIfAny(page);
  await page.evaluate(() => window.__ZOO__!.openBoard());
  await page.waitForFunction(() => window.__ZOO__!.boardView() === 'cards');
  expect(await page.evaluate(() => window.__ZOO__!.boardConfirmPos())).toBeNull();
  await click(page, await page.evaluate(() => window.__ZOO__!.boardOptionPos('delfines')));
  await click(page, await page.evaluate(() => window.__ZOO__!.boardConfirmPos()));
  await page.waitForFunction(() => window.__ZOO__!.boardView() === 'bars');
  expect(fake.votes).toEqual([{ votacion: '2026-11-a', opcion: 'delfines' }]);

  await click(page, await page.evaluate(() => window.__ZOO__!.boardChangePos()));
  await page.waitForFunction(() => window.__ZOO__!.boardView() === 'cards');
  // Al cambiar no queda marcada la ya votada: se elige otra vez y «Votar» sigue gris.
  expect(await page.evaluate(() => window.__ZOO__!.boardPicked())).toBeNull();
  expect(await page.evaluate(() => window.__ZOO__!.boardConfirmPos())).toBeNull();
  await click(page, await page.evaluate(() => window.__ZOO__!.boardOptionPos('koalas')));
  await click(page, await page.evaluate(() => window.__ZOO__!.boardConfirmPos()));
  await page.waitForFunction(() => window.__ZOO__!.boardView() === 'bars');
  expect(fake.votes[1]).toEqual({ votacion: '2026-11-a', opcion: 'koalas', anterior: 'delfines' });
});

test('girar el móvil con una tarjeta marcada la conserva y no envía nada', async ({ page }) => {
  const fake = await fakeServer(page);
  await startGame(page);
  await page.evaluate((b) => window.__ZOO__!.communityStart(b), BASE);
  await closeNoticeIfAny(page);
  await page.evaluate(() => window.__ZOO__!.openBoard());
  await page.waitForFunction(() => window.__ZOO__!.boardView() === 'cards');
  await click(page, await page.evaluate(() => window.__ZOO__!.boardOptionPos('koalas')));
  await page.evaluate(() => window.__ZOO__!.boardResize());
  await page.waitForFunction(() => window.__ZOO__!.boardView() === 'cards');
  expect(await page.evaluate(() => window.__ZOO__!.boardPicked())).toBe('koalas');
  expect(await page.evaluate(() => window.__ZOO__!.boardConfirmPos())).not.toBeNull();
  expect(fake.votes).toEqual([]);
});

test('sin conexión y sin nada guardado: pantalla de sin internet y no se vota', async ({ page }) => {
  const fake = await fakeServer(page, { offline: true });
  await startGame(page);
  await page.evaluate((b) => window.__ZOO__!.communityStart(b), BASE);
  await page.evaluate(() => window.__ZOO__!.openBoard());
  await page.waitForFunction(() => window.__ZOO__!.boardView() === 'offline');
  await expect.poll(() => log(page)).toContain('board-offline');
  expect(await page.evaluate(() => window.__ZOO__!.boardTile())).toBeNull();
  expect(fake.votes).toEqual([]);
});

test('con lo guardado y sin conexión: se ve el tablón pero no deja votar', async ({ page }) => {
  const fake = await fakeServer(page);
  await startGame(page);
  await page.evaluate((b) => window.__ZOO__!.communityStart(b), BASE);
  await closeNoticeIfAny(page);
  fake.offline = true;
  await page.evaluate(() => window.__ZOO__!.openBoard());
  await page.waitForFunction(() => window.__ZOO__!.boardView() === 'cards');
  await expect.poll(() => log(page)).toContain('board-opened');
  await click(page, await page.evaluate(() => window.__ZOO__!.boardOptionPos('delfines')));
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.__ZOO__!.boardConfirmPos())).toBeNull();
  expect(fake.votes).toEqual([]);
});

test('la respuesta tarda y el tablón aparece después, con estrellita', async ({ page }) => {
  await fakeServer(page, { delayMs: 2500 });
  await startGame(page);
  void page.evaluate((b) => window.__ZOO__!.communityStart(b), BASE);
  expect(await page.evaluate(() => window.__ZOO__!.boardTile())).toBeNull();
  await page.waitForFunction(() => window.__ZOO__!.boardTile() !== null, undefined, { timeout: 15_000 });
  expect(await page.evaluate(() => window.__ZOO__!.boardSparkling())).toBe(true);
  await page.waitForFunction(() => window.__ZOO__!.pollNoticePos('yes') !== null, undefined, { timeout: 10_000 });
});

test('se pasa al muro de ideas y el QR se cuenta', async ({ page }) => {
  await fakeServer(page);
  await startGame(page);
  await page.evaluate((b) => window.__ZOO__!.communityStart(b), BASE);
  await closeNoticeIfAny(page);
  await page.evaluate(() => window.__ZOO__!.openBoard());
  await page.waitForFunction(() => window.__ZOO__!.boardView() !== null);
  await click(page, await page.evaluate(() => window.__ZOO__!.boardZonePos('wall')));
  await page.waitForFunction(() => window.__ZOO__!.boardZone() === 'wall');
  await click(page, await page.evaluate(() => window.__ZOO__!.boardZonePos('idea')));
  await expect.poll(() => log(page)).toContain('board-qr');
});

test('andando a la casilla del tablón se abre', async ({ page }) => {
  await fakeServer(page);
  await startGame(page);
  await page.evaluate((b) => window.__ZOO__!.communityStart(b), BASE);
  await closeNoticeIfAny(page);
  const tile = (await page.evaluate(() => window.__ZOO__!.boardTile()))!;
  await page.evaluate(({ x, y }) => window.__ZOO__!.goToTile(x, y), tile);
  await expect.poll(() => scenes(page), { timeout: 30_000 }).toContain('Board');
});

test('el aviso no salta encima del panel del anuncio, y sale al cerrarlo', async ({ page }) => {
  await fakeServer(page);
  await startGame(page);
  await page.evaluate(() => window.__ZOO__!.adsFake('visto'));
  await page.evaluate(() => window.__ZOO__!.adsAdvance(300));
  await page.evaluate(() => window.__ZOO__!.openShop());
  await page.waitForFunction(() => window.__ZOO__!.adOfferPos('yes') !== null);
  await page.evaluate((b) => window.__ZOO__!.communityStart(b), BASE);
  await page.waitForFunction(() => window.__ZOO__!.communityPhase() === 'open');
  await page.waitForTimeout(2000);
  expect(await scenes(page)).not.toContain('PollNotice');
  expect(await page.evaluate(() => window.__ZOO__!.adOfferPos('yes'))).not.toBeNull();
  // Se cierra el panel (X), se sale de la tienda y entonces sí salta el aviso.
  await click(page, await page.evaluate(() => window.__ZOO__!.adOfferPos('no')));
  await expect.poll(() => scenes(page)).toContain('Shop');
  await page.evaluate(() => window.__ZOO__!.back());
  await page.waitForFunction(() => window.__ZOO__!.pollNoticePos('yes') !== null, undefined, { timeout: 10_000 });
});
