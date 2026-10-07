import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv, redact } from './lib.mjs';

export const HERE = dirname(fileURLToPath(import.meta.url));
export const DATA = join(HERE, 'data');
const ENV_FILE = join(HERE, '.env.local');

function fail(message) {
  console.error(message);
  process.exit(1);
}

/** Lee la configuración. Se niega a seguir si el fichero del token podría acabar en el repositorio. */
export function loadConfig() {
  if (!existsSync(ENV_FILE)) fail('Falta tools/matomo/.env.local. Copia .env.example y rellénalo.');
  try {
    execFileSync('git', ['check-ignore', '-q', ENV_FILE], { cwd: HERE, stdio: 'ignore' });
  } catch {
    fail('tools/matomo/.env.local NO está ignorado por git. No sigo: el token podría subirse al repositorio.');
  }
  const env = parseEnv(readFileSync(ENV_FILE, 'utf8'));
  const url = (env.MATOMO_URL ?? '').replace(/\/+$/, '');
  const site = env.MATOMO_SITE ?? '';
  const token = env.MATOMO_TOKEN ?? '';
  if (!url.startsWith('https://') || !/^\d+$/.test(site) || token.length < 16) {
    fail('tools/matomo/.env.local está incompleto: hacen falta MATOMO_URL (https), MATOMO_SITE y MATOMO_TOKEN.');
  }
  return { url, site, token };
}

/**
 * Llama a la API de informes. El token va en el cuerpo del POST, nunca en la dirección.
 * Ningún error que salga de aquí contiene el token ni la dirección del servidor: los fallos de red
 * traen la dirección en su causa, así que se descartan y se lanza un mensaje genérico.
 */
export async function api(config, method, params = {}) {
  const body = new URLSearchParams({ module: 'API', method, format: 'JSON', idSite: config.site, token_auth: config.token, filter_limit: '-1', ...params });
  let response;
  try {
    response = await fetch(`${config.url}/index.php`, { method: 'POST', body });
  } catch {
    throw new Error(`No se pudo contactar con Matomo en ${method}`);
  }
  if (!response.ok) throw new Error(`Matomo respondió ${response.status} a ${method}`);
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Respuesta no válida de Matomo en ${method}`);
  }
  if (data && data.result === 'error') {
    let host = '';
    try { host = new URL(config.url).host; } catch { /* la dirección ya se validó al cargar */ }
    throw new Error(`Matomo rechazó ${method}: ${redact(String(data.message), [config.token, config.url, host])}`);
  }
  return data;
}
