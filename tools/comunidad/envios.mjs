// node tools/comunidad/envios.mjs [--desde=AAAA-MM-DD]
// Descarga los envíos a tools/comunidad/data/ (ignorado por git). Llevan nombres de menores: no salen de esta máquina.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from '../matomo/lib.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const ENV = join(AQUI, '.env.local');
const DATOS = join(AQUI, 'data');

function fallo(mensaje) {
  console.error(mensaje);
  process.exit(1);
}

if (!existsSync(ENV)) fallo('Falta tools/comunidad/.env.local. Copia .env.example y rellénalo.');
for (const ruta of [ENV, join(DATOS, 'envios.json')]) {
  try {
    execFileSync('git', ['check-ignore', '-q', ruta], { cwd: AQUI, stdio: 'ignore' });
  } catch {
    fallo(`${ruta} NO está ignorado por git. No sigo: podría subirse al repositorio.`);
  }
}
const env = parseEnv(readFileSync(ENV, 'utf8'));
const destino = env.COMUNIDAD_SSH ?? '';
const clave = env.COMUNIDAD_SSH_CLAVE ?? '';
const app = (env.COMUNIDAD_APP ?? '').replace(/\/+$/, '');
// Lo que viaja dentro de la orden remota se limita a caracteres que la shell no interpreta.
if (!/^[a-z_][a-z0-9_-]*@[A-Za-z0-9.-]+$/.test(destino) || !existsSync(clave) || !/^[A-Za-z0-9._\/-]+$/.test(app)) {
  fallo('.env.local incompleto: hacen falta COMUNIDAD_SSH (usuario@servidor), COMUNIDAD_SSH_CLAVE (ruta que exista) y COMUNIDAD_APP.');
}

const arg = process.argv.find((a) => a.startsWith('--desde='))?.slice(8);
const desde = arg ?? new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(desde)) fallo('--desde tiene que ser AAAA-MM-DD.');

// Sin dirección web: los envíos llevan nombres de menores y solo se piden por SSH.
let salida;
try {
  salida = execFileSync('ssh', ['-i', clave, '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes', '-o', 'StrictHostKeyChecking=yes', destino, `php ${app}/exportar.php ${desde}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch {
  fallo('No se han podido pedir los envíos por SSH. Revisa .env.local, la clave y que tu IP esté permitida en el cortafuegos.');
}
const { envios } = JSON.parse(salida);
mkdirSync(DATOS, { recursive: true });
writeFileSync(join(DATOS, 'envios.json'), JSON.stringify(envios, null, 2));
const ideas = envios.filter((e) => e.idea !== '').length;
const fallos = envios.filter((e) => e.fallo !== '').length;
console.log(`${envios.length} envíos desde ${desde} (${ideas} con idea, ${fallos} con fallo) en tools/comunidad/data/envios.json`);
