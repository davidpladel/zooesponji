// node tools/comunidad/check.mjs <comunidad.json> [carpeta-de-dibujos]
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dibujos, validar } from './lib.mjs';

const [archivo, carpeta] = process.argv.slice(2);
if (!archivo) {
  console.error('Uso: node tools/comunidad/check.mjs <comunidad.json> [carpeta-de-dibujos]');
  process.exit(2);
}
let datos;
try {
  datos = JSON.parse(readFileSync(archivo, 'utf8').replace(/^\uFEFF/, ''));
} catch (error) {
  console.error(`No se puede leer como JSON: ${error.message}`);
  process.exit(1);
}
const errores = validar(datos);
if (carpeta && errores.length === 0) {
  for (const dibujo of dibujos(datos)) {
    if (!existsSync(join(carpeta, dibujo))) errores.push(`Falta el dibujo ${dibujo} en ${carpeta}.`);
  }
}
if (errores.length > 0) {
  console.error(errores.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log('✓ El archivo vale. Ya se puede subir.');
