import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from './lib.mjs';

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

/** Llama a la API de informes. El token va en el cuerpo del POST, nunca en la dirección, y nunca se imprime. */
export async function api(config, method, params = {}) {
  const body = new URLSearchParams({ module: 'API', method, format: 'JSON', idSite: config.site, token_auth: config.token, filter_limit: '-1', ...params });
  const response = await fetch(`${config.url}/index.php`, { method: 'POST', body });
  if (!response.ok) throw new Error(`Matomo respondió ${response.status} a ${method}`);
  const data = await response.json();
  if (data && data.result === 'error') throw new Error(`Matomo rechazó ${method}: ${String(data.message).replaceAll(config.token, '***')}`);
  return data;
}
