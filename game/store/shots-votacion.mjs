// Capturas del final de una votación: el aviso grande de la ganadora al entrar al parque y el tablón con la ganadora
// y el confeti. Con la votación real del servidor (2026-11: ganó la clínica), para tenerlo guardado y poder enseñarlo.
// Necesita `npm run dev` (puerto 5173) y la dirección de la comunidad en la variable COMMUNITY_URL (la misma que
// VITE_COMMUNITY_URL del paquete; no se escribe en el repo). Solo lee el estado: no vota ni envía nada.
// Uso (desde game/store):  COMMUNITY_URL=… node shots-votacion.mjs [es|en]     Salida: out/<idioma>-votacion-*.png
import { chromium } from '@playwright/test';

const LANG = process.argv[2] === 'en' ? 'en' : 'es';
const URL_COMUNIDAD = process.env.COMMUNITY_URL;
if (!URL_COMUNIDAD) throw new Error('Falta COMMUNITY_URL');
const OUT = new URL('./out/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: LANG === 'en' ? 'en-US' : 'es-ES' });
const page = await ctx.newPage();
const shot = (n) => page.screenshot({ path: `${OUT}${LANG}-votacion-${n}.png` });
const box = () => page.locator('canvas').boundingBox();

// El aviso de la ganadora no sale el primer día: la partida dice que empezó antes.
await page.addInitScript(() => {
  localStorage.setItem('zooesponji_v3_community', JSON.stringify({ firstDay: '2026-11-01' }));
});
// El servidor solo admite el origen del juego: Playwright pide por su cuenta y añade el permiso para localhost.
await page.route(`${URL_COMUNIDAD}/**`, async (route) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };
  if (route.request().method() !== 'GET') return route.fulfill({ status: 204, headers: cors });
  const res = await route.fetch();
  return route.fulfill({ response: res, headers: { ...res.headers(), ...cors } });
});

await page.goto('http://localhost:5173/?sin-tutorial', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('Title'), null, { timeout: 90000 });
const b0 = await box();
await page.mouse.click(b0.x + b0.width / 2, b0.y + b0.height * 0.62);
await page.waitForFunction(() => window.__ZOO__?.activeScenes().includes('World'));
await page.waitForTimeout(1500);
await page.evaluate((u) => window.__ZOO__.communityStart(u), URL_COMUNIDAD);
console.log('fase:', await page.evaluate(() => window.__ZOO__.communityPhase()));

// 1. El aviso grande al entrar.
await page.waitForFunction(() => window.__ZOO__.pollNoticePos('yes') !== null, null, { timeout: 20000 });
await page.waitForTimeout(1500);
await shot('aviso');
// 2. «Sí» lleva al tablón: la ganadora con confeti. Ráfaga para pillar el confeti en el aire.
const yes = await page.evaluate(() => window.__ZOO__.pollNoticePos('yes'));
const b1 = await box();
await page.mouse.click(b1.x + yes.x, b1.y + yes.y);
await page.waitForFunction(() => window.__ZOO__.boardView() === 'winner', null, { timeout: 20000 });
for (let i = 1; i <= 8; i++) {
  await shot(`tablon-${i}`);
  await page.waitForTimeout(250);
}
await browser.close();
console.log('Hecho:', LANG);
