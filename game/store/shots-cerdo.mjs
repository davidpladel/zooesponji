// Ráfaga del cerdito durante el cepillado (se va girando: de frente, un lado, el otro y culete), para la ficha.
// Necesita `npm run dev` (puerto 5173). Uso (desde game/store):  node shots-cerdo.mjs [es|en]
// Salida: out/<idioma>-cerdo-<n>.png
import { chromium } from '@playwright/test';

const LANG = process.argv[2] === 'en' ? 'en' : 'es';
const OUT = new URL('./out/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: LANG === 'en' ? 'en-US' : 'es-ES' });
const page = await ctx.newPage();
const zoo = (fn, arg) => page.evaluate(fn, arg);
const box = () => page.locator('canvas').boundingBox();

await page.goto('http://localhost:5173/?sin-tutorial', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'), null, { timeout: 90000 });
const b0 = await box();
await page.mouse.click(b0.x + b0.width / 2, b0.y + b0.height * 0.62);
await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('World'));
await zoo(async () => {
  await window.__ZOO__.addCoins(500);
  await window.__ZOO__.buy('cerdos');
  await window.__ZOO__.forceSoil('rosita');
  window.__ZOO__.openClean('rosita');
});
await page.waitForFunction(() => window.__ZOO__.cleanState() !== null);
await page.waitForTimeout(1200);

let n = 0;
for (let guard = 0; guard < 200; guard++) {
  const state = await zoo(() => window.__ZOO__.cleanState());
  if (!state || state.step === 'hecho' || state.step === 'jabon') break;
  const t = await zoo(() => window.__ZOO__.cleanTargets());
  if (!t?.tool) break;
  const b = await box();
  const a = t.animal;
  // Un frotado corto; en el cepillado, foto después de cada uno para pillar cada giro.
  await page.mouse.move(b.x + t.tool.x, b.y + t.tool.y);
  await page.mouse.down();
  for (const dx of [-30, 30, -30, 30]) await page.mouse.move(b.x + a.x + dx, b.y + a.y, { steps: 3 });
  // Foto con el cepillo todavía encima del animal (antes de soltar), junto a la cara.
  if (state.step === 'cepillo') {
    await page.mouse.move(b.x + a.x + 40, b.y + a.y - 20, { steps: 3 });
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${OUT}${LANG}-cerdo-${String(++n).padStart(2, '0')}.png` });
  }
  await page.mouse.up();
  await page.waitForTimeout(350);
}
await browser.close();
console.log('Hecho:', LANG, n, 'tomas');
