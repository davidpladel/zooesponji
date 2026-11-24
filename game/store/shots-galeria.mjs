// Galería de candidatas para la ficha: cada especie comiendo en primer plano y vistas de cada zona del parque.
// Necesita `npm run dev` (puerto 5173). Uso (desde game/store):  node shots-galeria.mjs [es|en]
// Salida: out/galeria/<idioma>-comer-<residente>.png y out/galeria/<idioma>-zona-<recinto>-<n>.png
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const LANG = process.argv[2] === 'en' ? 'en' : 'es';
const OUT = new URL('./out/galeria/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: LANG === 'en' ? 'en-US' : 'es-ES' });
const page = await ctx.newPage();
const zoo = (fn, arg) => page.evaluate(fn, arg);
const wait = (ms) => page.waitForTimeout(ms);
const box = () => page.locator('canvas').boundingBox();
const shot = (n) => page.screenshot({ path: `${OUT}${LANG}-${n}.png` });

const PENS = ['cabra', 'pantera', 'panda', 'estanque', 'ovejas', 'cerdos', 'establo', 'pinguinos', 'sabana', 'elefantes-africanos', 'elefantes-asiaticos'];
// Residente y la comida que le gusta (la especial cuando la hay: reacciona con más ganas).
const COMER = [
  ['gordi', 'zanahoria'], ['noche', 'carne'], ['lola', 'platano'], ['raya', 'manzana'], ['brisa', 'maiz'],
  ['pingu', 'pescado'], ['lana', 'lechuga'], ['canela', 'manzana'], ['pepa', 'pan'], ['cuac', 'pescado'],
  ['raja', 'manzana'], ['rosita', 'manzana'], ['tembo', 'platano'],
];
// Un residente de cada recinto, para centrar la cámara en él.
const ZONAS = [
  ['leon', 'bills'], ['cabra', 'gordi'], ['pantera', 'noche'], ['panda', 'mochi'], ['estanque', 'cuac'], ['ovejas', 'lana'],
  ['cerdos', 'rosita'], ['establo', 'canela'], ['pinguinos', 'pingu'], ['sabana', 'lola'], ['elefantes-africanos', 'tembo'],
  ['elefantes-asiaticos', 'raja'],
];

await page.goto('http://localhost:5173/?sin-tutorial', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'), null, { timeout: 90000 });
const b0 = await box();
await page.mouse.click(b0.x + b0.width / 2, b0.y + b0.height * 0.62);
await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('World'));
await wait(1500);
await shot('zona-entrada');
await zoo(async (pens) => {
  await window.__ZOO__.addCoins(100000);
  for (const p of pens) await window.__ZOO__.buy(p);
  for (const p of ['leon', ...pens]) for (let i = 0; i < 10; i++) if (!(await window.__ZOO__.buy('extra-' + p))) break;
  await window.__ZOO__.giveClinic();
}, PENS);
await wait(3000);

// Vistas de cada zona: la cámara centrada en un animal del recinto (de pantalla a casilla con tileToScreen).
for (const [pen, resident] of ZONAS) {
  const tile = await zoo((r) => {
    const z = window.__ZOO__;
    const p = z.residentScreenPos(r);
    const a = z.tileToScreen(0, 0);
    const b = z.tileToScreen(1, 1);
    if (!p || !a || !b) return null;
    return { x: Math.round((p.x - a.x) / (b.x - a.x)), y: Math.round((p.y - a.y) / (b.y - a.y)) };
  }, resident);
  if (!tile) continue;
  await zoo(([x, y]) => window.__ZOO__.lookAtTile(x, y), [tile.x, tile.y]);
  for (let n = 1; n <= 3; n++) {
    await wait(1400);
    await shot(`zona-${pen}-${n}`);
  }
}

// Cada especie comiendo en primer plano.
for (const [resident, food] of COMER) {
  await zoo((r) => window.__ZOO__.openFeed(r), resident);
  await page.waitForFunction(() => window.__ZOO__.feedFoodsHome(), null, { timeout: 30000 }).catch(() => {});
  await wait(800);
  const t = await zoo(() => window.__ZOO__.feedTargets());
  if (t) {
    const f = t.foods[food] ?? Object.values(t.foods)[0];
    const b = await box();
    await page.mouse.move(b.x + f.x, b.y + f.y);
    await page.mouse.down();
    for (let i = 1; i <= 14; i++) await page.mouse.move(b.x + f.x + ((t.animal.x - f.x) * i) / 14, b.y + f.y + ((t.animal.y - f.y) * i) / 14);
    await page.mouse.up();
    await wait(600);
    await shot(`comer-${resident}`);
  }
  await wait(2000);
  await zoo(() => window.__ZOO__.back());
  await page.waitForFunction(() => !window.__ZOO__.activeScenes().includes('Feed')).catch(() => {});
  await wait(800);
}
await browser.close();
console.log('Hecho:', LANG);
