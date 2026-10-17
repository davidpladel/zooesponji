// Capturas 1920x886 (proporción de móvil, donde el tablón se ve como en el juego) del muro del Tablón del zoo, con las ideas reales del servidor, en español e inglés (necesita `npm run dev`).
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const OUT = new URL('./out/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const API = 'https://api.zooesponji.com';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
for (const [lang, locale] of [['es', 'es-ES'], ['en', 'en-US']]) {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 443 }, deviceScaleFactor: 2, locale });
  const page = await ctx.newPage();
  const scene = (n) => page.waitForFunction((n) => window.__ZOO__?.activeScenes().includes(n), n, { timeout: 90000 });
  await page.goto('http://localhost:5173/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await scene('Title');
  const b = await page.locator('canvas').boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height * 0.62);
  await scene('World');
  await page.waitForTimeout(1500);
  await page.evaluate((u) => window.__ZOO__.communityStart(u), API);
  await page.waitForTimeout(4000);
  // Si salta el aviso de votación, se cierra.
  const no = await page.evaluate(() => window.__ZOO__.pollNoticePos('no'));
  if (no) await page.mouse.click(b.x + no.x, b.y + no.y);
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.__ZOO__.openBoard());
  await scene('Board');
  await page.waitForTimeout(1000);
  const wall = await page.evaluate(() => window.__ZOO__.boardZonePos('wall'));
  if (wall && (await page.evaluate(() => window.__ZOO__.boardZone())) !== 'wall') await page.mouse.click(b.x + wall.x, b.y + wall.y);
  await page.waitForTimeout(8000);
  await page.screenshot({ path: `${OUT}tablon-${lang}.png` });
  await ctx.close();
}
await browser.close();
