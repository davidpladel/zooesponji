// Saca capturas 1920x1080 del juego para la ficha de Play (necesita `npm run dev`).
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const OUT = new URL('./out/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();
const zoo = (fn, arg) => page.evaluate(fn, arg);
const wait = (ms) => page.waitForTimeout(ms);
const box = () => page.locator('canvas').boundingBox();
const shot = (n) => page.screenshot({ path: OUT + n + '.png' });
const scene = (n, t = 40000) => page.waitForFunction((n) => window.__ZOO__?.activeScenes().includes(n), n, { timeout: t });
async function feed(animal, foods) {
  const t = await zoo((a) => window.__ZOO__.gateApproachTile(a), animal);
  await zoo(([x, y]) => window.__ZOO__.goToTile(x, y), [t.x, t.y]);
  await scene('Feed');
  await wait(900);
  for (const food of foods) {
    const tg = await zoo(() => window.__ZOO__.feedTargets());
    const b = await box();
    const f = tg.foods[food];
    await page.mouse.move(b.x + f.x, b.y + f.y);
    await page.mouse.down();
    await page.mouse.move(b.x + tg.animal.x, b.y + tg.animal.y, { steps: 20 });
    await page.mouse.up();
    await wait(650);
    await shot(`${animal}-${food}`);
    await wait(1800);
  }
}
await page.goto('http://localhost:5173/');
await page.evaluate(() => localStorage.clear());
await page.reload();
await scene('Title');
await wait(1500);
await shot('1-titulo');
let b = await box();
await page.mouse.click(b.x + b.width / 2, b.y + b.height * 0.62);
await scene('World');
await wait(2500);
await shot('2-entrada');
await feed('leon', ['carne']);
await page.keyboard.press('Escape'); await wait(800);
await feed('cabra', ['conejo']);
await page.keyboard.press('Escape'); await wait(800);
await zoo(() => window.__ZOO__.addCoins(130));
const door = await zoo(() => window.__ZOO__.shopDoorTile());
await zoo(([x, y]) => window.__ZOO__.goToTile(x, y), [door.x, door.y]);
await scene('Shop');
await wait(2500);
await shot('5-tienda');
await browser.close();
