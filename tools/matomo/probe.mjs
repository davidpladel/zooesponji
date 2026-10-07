// Envía cuatro eventos de prueba al seguimiento, igual que la app (lote, sin token), con fechas distintas.
// Uso: node tools/matomo/probe.mjs
import { randomBytes } from 'node:crypto';
import { loadConfig } from './config.mjs';

const config = loadConfig();
const hex = () => randomBytes(8).toString('hex');
const visitor = hex();
const cdt = (hoursAgo) => new Date(Date.now() - hoursAgo * 3_600_000).toISOString().slice(0, 19).replace('T', ' ');
const hit = (name, hoursAgo) => {
  const p = new URLSearchParams({ idsite: config.site, rec: '1', apiv: '1', rand: hex(), _id: visitor, url: 'https://davidpladel.com/zoo/prueba', e_c: 'prueba', e_a: 'sonda', e_n: name });
  if (hoursAgo > 0) p.set('cdt', cdt(hoursAgo));
  return `?${p.toString()}`;
};
const body = (requests) => JSON.stringify({ requests });
const post = async (label, requests) => {
  const response = await fetch(`${config.url}/matomo.php`, { method: 'POST', body: body(requests), headers: { 'Content-Type': 'text/plain' } });
  console.log(`${label}: HTTP ${response.status} — ${(await response.text()).slice(0, 200)}`);
};

await post('Lote 1 (ahora, hace 3 h, hace 20 h)', [hit('ahora', 0), hit('hace-3h', 3), hit('hace-20h', 20)]);
await post('Lote 2 (uno bueno y uno de hace 30 h)', [hit('junto-a-uno-viejo', 0), hit('hace-30h', 30)]);
console.log('Mira en Matomo → Comportamiento → Eventos (categoría «prueba») de hoy y de ayer qué ha llegado y en qué hora.');
