// Uso: node tools/matomo/pull.mjs [--date=last30]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA, api, loadConfig } from './config.mjs';

const date = process.argv.find((arg) => arg.startsWith('--date='))?.slice(7) ?? 'last30';
if (!/^(last\d{1,3}|\d{4}-\d{2}-\d{2},\d{4}-\d{2}-\d{2})$/.test(date)) {
  console.error('Fecha no válida. Usa --date=last30 o --date=2026-10-01,2026-10-31');
  process.exit(1);
}

const config = loadConfig();
const eventsReport = { secondaryDimension: 'eventName', flat: '1' };
const downloads = [
  ['events.json', 'Events.getAction', { period: 'range', date, ...eventsReport }],
  ['actions.json', 'Events.getAction', { period: 'range', date }],
  ['events-daily.json', 'Events.getAction', { period: 'day', date, ...eventsReport }],
  ['visits-daily.json', 'VisitsSummary.get', { period: 'day', date }],
];

mkdirSync(DATA, { recursive: true });
try {
  for (const [file, method, params] of downloads) {
    const data = await api(config, method, params);
    writeFileSync(join(DATA, file), JSON.stringify(data, null, 2));
    console.log(`${file}: ${Array.isArray(data) ? data.length : Object.keys(data).length} filas`);
  }
  writeFileSync(join(DATA, 'meta.json'), JSON.stringify({ date, pulledAt: new Date().toISOString() }, null, 2));
  console.log(`Hecho. Periodo: ${date}. Datos en tools/matomo/data/ (ignorado por git).`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Fallo desconocido');
  process.exit(1);
}
