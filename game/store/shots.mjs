// Saca capturas 1920x1080 del juego para la ficha de Play (necesita `npm run dev`).
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const OUT = new URL('./out/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'es-ES' });
const page = await ctx.newPage();
const zoo = (fn, arg) => page.evaluate(fn, arg);
const wait = (ms) => page.waitForTimeout(ms);
const box = () => page.locator('canvas').boundingBox();
const shot = (n) => page.screenshot({ path: OUT + n + '.png' });
const scene = (n, t = 90000) => page.waitForFunction((n) => window.__ZOO__?.activeScenes().includes(n), n, { timeout: t });
const noScene = (n) => page.waitForFunction((n) => !window.__ZOO__?.activeScenes().includes(n), n);

/** La cuidadora entra en el recinto y se abre la ventana de dar de comer. */
async function goFeed(resident) {
  await zoo((r) => window.__ZOO__.feedResident(r), resident);
  await scene('Feed');
  await wait(1200);
}
/** Varias tomas seguidas: los animales pasean y no siempre quedan a la vista. */
async function burst(name, n = 8) {
  for (let i = 1; i <= n; i++) {
    await shot(`${name}-${i}`);
    await wait(1300);
  }
}
async function closeFeed() {
  await page.keyboard.press('Escape');
  await noScene('Feed');
  await wait(1500);
}
async function drag(food) {
  const tg = await zoo(() => window.__ZOO__.feedTargets());
  const b = await box();
  const f = tg.foods[food];
  await page.mouse.move(b.x + f.x, b.y + f.y);
  await page.mouse.down();
  await page.mouse.move(b.x + tg.animal.x, b.y + tg.animal.y, { steps: 20 });
  await page.mouse.up();
}

await page.goto('http://localhost:5173/');
await page.evaluate(() => localStorage.clear());
await page.reload();
await scene('Title');
await wait(1500);
await shot('titulo');
const b = await box();
await page.mouse.click(b.x + b.width / 2, b.y + b.height * 0.62);
await scene('World');
await wait(2000);
await shot('entrada');

await zoo(() => window.__ZOO__.addCoins(400));
for (const item of ['extra-cabra', 'extra-cabra', 'extra-cabra', 'extra-cabra', 'pantera', 'extra-pantera']) {
  await zoo((i) => window.__ZOO__.buy(i), item);
}
await wait(1500);

await goFeed('bills');
await closeFeed();
await burst('leones');

await goFeed('gordi');
await closeFeed();
await burst('cabras');

await goFeed('noche');
await shot('pantera-bandeja');
await drag('carne');
await wait(650);
await shot('pantera-comiendo');
await wait(2500);
await closeFeed();
await burst('panteras');

const door = await zoo(() => window.__ZOO__.shopDoorTile());
await zoo(([x, y]) => window.__ZOO__.goToTile(x, y), [door.x, door.y]);
await scene('Shop');
await wait(3000);
await shot('tienda');

await zoo(() => window.__ZOO__.openBook('mary'));
await scene('Book');
await wait(1500);
await shot('libro-mary');
await browser.close();
