// Graba una partida guionizada a 1920x1080 y apunta en marks.json cuándo pasa cada cosa.
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const OUT = new URL('./out/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
});
const page = await ctx.newPage();
const t0 = Date.now();
const marks = {};
const mark = (k) => { marks[k] = (Date.now() - t0) / 1000; console.log(k, marks[k]); };
const zoo = (fn, arg) => page.evaluate(fn, arg);
const wait = (ms) => page.waitForTimeout(ms);
const box = async () => page.locator('canvas').boundingBox();

async function scene(name, timeout = 30000) {
  await page.waitForFunction((n) => window.__ZOO__?.activeScenes().includes(n), name, { timeout });
}
async function walk(x, y) {
  await zoo(([x, y]) => window.__ZOO__.goToTile(x, y), [x, y]);
  await page.waitForFunction(([x, y]) => {
    const p = window.__ZOO__.keeperPosition();
    return !p || (p.x === x * 16 + 8 && p.y === y * 16 + 8);
  }, [x, y], { timeout: 40000 }).catch(() => {});
}
async function feedAt(animal, foods) {
  const t = await zoo((a) => window.__ZOO__.gateApproachTile(a), animal);
  mark(animal + '_walk');
  await zoo(([x, y]) => window.__ZOO__.goToTile(x, y), [t.x, t.y]);
  await scene('Feed', 40000);
  mark(animal + '_feed');
  await wait(900);
  for (const food of foods) {
    const tg = await zoo(() => window.__ZOO__.feedTargets());
    const b = await box();
    const f = tg.foods[food];
    await page.mouse.move(b.x + f.x, b.y + f.y);
    await page.mouse.down();
    await page.mouse.move(b.x + tg.animal.x, b.y + tg.animal.y, { steps: 25 });
    await page.mouse.up();
    mark(animal + '_' + food);
    await wait(2200);
  }
  await page.keyboard.press('Escape');
  await wait(600);
}

await page.goto('http://localhost:5173/');
await page.evaluate(() => localStorage.clear());
await page.reload();
await scene('Title');
mark('title');
await wait(4000);
let b = await box();
await page.mouse.click(b.x + b.width / 2, b.y + b.height * 0.62);
await scene('World');
mark('world');
await wait(2500);
await feedAt('leon', ['carne', 'piedra', 'conejo']);
await feedAt('cabra', ['zanahoria', 'conejo']);
await zoo(() => window.__ZOO__.addCoins(130));
const door = await zoo(() => window.__ZOO__.shopDoorTile());
mark('shop_walk');
await zoo(([x, y]) => window.__ZOO__.goToTile(x, y), [door.x, door.y]);
await scene('Shop', 40000);
mark('shop');
await wait(1200);
b = await box();
const card = await zoo(() => window.__ZOO__.shopCardScreenPos('panda'));
await page.mouse.click(b.x + card.x, b.y + card.y);
await page.waitForFunction(() => window.__ZOO__.shopBuyBubblePos() !== null, null, { timeout: 15000 });
await wait(500);
const bub = await zoo(() => window.__ZOO__.shopBuyBubblePos());
await page.mouse.click(b.x + bub.x, b.y + bub.y);
mark('panda_bought');
await wait(3000);
await page.keyboard.press('Escape');
await wait(800);
await feedAt('panda', ['zanahoria', 'conejo']);
mark('end');
await wait(1500);
await ctx.close();
fs.renameSync(await page.video().path(), OUT + 'gameplay.webm');
fs.writeFileSync(OUT + 'marks.json', JSON.stringify(marks, null, 2));
await browser.close();
