// Capturas 1920x1080 de los cuidados de la 2.10.0 y de animales en primer plano, para la ficha de Play.
// Necesita `npm run dev` (puerto 5173). Uso (desde game/store):  node shots-cuidados.mjs [es|en]
// Salida: out/<idioma>-<nombre>.png
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const LANG = process.argv[2] === 'en' ? 'en' : 'es';
// Animal que se cura en la clínica (3.er argumento; por defecto el león Bills). Con otro, las tomas de curar se llaman
// curar-<residente>-<n>: así la ficha no repite el león (2026-11-18).
const CURAR = process.argv[3] ?? 'bills';
const CUR = CURAR === 'bills' ? 'curar' : `curar-${CURAR}`;
const OUT = new URL('./out/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: LANG === 'en' ? 'en-US' : 'es-ES' });
const page = await ctx.newPage();
const zoo = (fn, arg) => page.evaluate(fn, arg);
const wait = (ms) => page.waitForTimeout(ms);
const box = () => page.locator('canvas').boundingBox();
const shot = (n) => page.screenshot({ path: `${OUT}${LANG}-${n}.png` });
const until = (fn, arg, timeout = 60000) => page.waitForFunction(fn, arg, { timeout });
const scene = (n) => until((n) => window.__ZOO__?.activeScenes().includes(n), n, 90000);

async function drag(from, to, steps = 14) {
  const b = await box();
  await page.mouse.move(b.x + from.x, b.y + from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) await page.mouse.move(b.x + from.x + ((to.x - from.x) * i) / steps, b.y + from.y + ((to.y - from.y) * i) / steps);
  await page.mouse.up();
}
/** Arrastra la herramienta de limpieza frotando encima del animal; para a medio camino si `half`. */
async function rub(t, half) {
  const b = await box();
  const a = t.animal;
  const path = [a, { x: a.x - 30, y: a.y }, { x: a.x + 30, y: a.y }, { x: a.x - 30, y: a.y + 10 }, { x: a.x + 30, y: a.y + 10 }];
  await page.mouse.move(b.x + t.tool.x, b.y + t.tool.y);
  await page.mouse.down();
  for (const p of half ? path.slice(0, 2) : path) for (let i = 0; i < 6; i++) await page.mouse.move(b.x + p.x + (i % 2) * 8, b.y + p.y + (i % 3) * 4);
  return () => page.mouse.up();
}

await page.goto('http://localhost:5173/?sin-tutorial');
await scene('Title');
const b0 = await box();
await page.mouse.click(b0.x + b0.width / 2, b0.y + b0.height * 0.62);
await scene('World');
await wait(1500);
await zoo(async () => {
  await window.__ZOO__.addCoins(5000);
  for (const id of ['panda', 'cerdos', 'elefantes-africanos']) await window.__ZOO__.buy(id);
});
await wait(1500);

// 1. Animales en primer plano comiendo (la ventana de dar de comer).
for (const [resident, food, name] of [['bills', 'carne', 'leon-comiendo'], ['mochi', 'zanahoria', 'panda-comiendo'], ['tembo', null, 'elefante-comiendo']]) {
  await zoo((r) => window.__ZOO__.openFeed(r), resident);
  await until(() => window.__ZOO__.feedFoodsHome());
  await wait(800);
  await shot(name + '-bandeja');
  const t = await zoo(() => window.__ZOO__.feedTargets());
  await drag(food && t.foods[food] ? t.foods[food] : Object.values(t.foods)[0], t.animal);
  for (const ms of [350, 650, 1000]) {
    await wait(ms === 350 ? 350 : ms - 350);
    await shot(`${name}-${ms}`);
  }
  await wait(2500);
  await zoo(() => window.__ZOO__.back());
  await until(() => !window.__ZOO__.activeScenes().includes('Feed'));
  await wait(800);
}

// 2. Limpieza del cerdo: una toma en cada paso, con la herramienta frotando.
await zoo(async () => {
  await window.__ZOO__.forceSoil('rosita');
  window.__ZOO__.openClean('rosita');
});
await until(() => window.__ZOO__.cleanState() !== null);
await wait(1200);
await shot('banar-0-sucio');
for (let n = 1; n <= 8; n++) {
  const state = await zoo(() => window.__ZOO__.cleanState());
  if (!state || state.step === 'hecho') break;
  const t = await zoo(() => window.__ZOO__.cleanTargets());
  if (!t?.tool) break;
  const up = await rub(t, true);
  await shot(`banar-${n}-${state.step}`);
  await up();
  const t2 = await zoo(() => window.__ZOO__.cleanTargets());
  if (t2?.tool) await (await rub(t2, false))();
  await wait(600);
}
await wait(1500);
await shot('banar-final');
await until(() => !window.__ZOO__.activeScenes().includes('Clean'), null, 15000).catch(() => {});
await wait(1000);

// 3. Clínica: el animal elegido y un cerdito malitos en las camillas; luego curar al primero.
await zoo(async (quien) => {
  await window.__ZOO__.giveClinic();
  await window.__ZOO__.forceSick(quien);
  await window.__ZOO__.forceSick('rosita');
  window.__ZOO__.openClinic();
}, CURAR);
await until(() => window.__ZOO__.clinicBeds() !== null);
await wait(2500);
await shot('clinica');
const bed = await zoo(() => window.__ZOO__.clinicBedPos(0));
const b1 = await box();
await page.mouse.click(b1.x + bed.x, b1.y + bed.y);
await until(() => window.__ZOO__.cureDoses() !== null, null, 20000);
await wait(1200);
await shot(`${CUR}-0`);
for (let i = 0; i < 5; i++) {
  const cure = await zoo(() => window.__ZOO__.cureTargets());
  if (!cure) break;
  await drag(Object.values(cure.medicines)[i % 4], cure.animal);
  await wait(500);
  await shot(`${CUR}-${i + 1}`);
}
await wait(1500);
await shot(`${CUR}-final`);
await browser.close();
console.log('Hecho:', LANG);
