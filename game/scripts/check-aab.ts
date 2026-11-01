// Uso: node scripts/check-aab.ts [ruta del AAB]
// Comprueba que el paquete de Google Play salió de R8 y enseña lo que pesa el código. Hay que compilar antes con Gradle.
import AdmZip from 'adm-zip';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { aabProblems, dexSizes } from './aabRules.ts';

const aab = process.argv[2] ?? fileURLToPath(new URL('../android/app/build/outputs/bundle/release/app-release.aab', import.meta.url));
const configFile = fileURLToPath(new URL('../android/app/build/outputs/mapping/release/configuration.txt', import.meta.url));

if (!existsSync(aab)) {
  console.error(`No está el AAB (${aab}). Compila antes con Gradle (ver docs/privado/play-store.md).`);
  process.exit(1);
}
const entries = new AdmZip(aab).getEntries().map((entry) => ({ name: entry.entryName, size: entry.header.size }));
const mb = (bytes: number): string => `${(bytes / 1_000_000).toFixed(2)} MB`;

const { files, total } = dexSizes(entries);
console.log(`AAB: ${mb(statSync(aab).size)}`);
for (const file of files) console.log(`  ${file.name}: ${mb(file.size)}`);
console.log(`  Código Android (sin comprimir): ${mb(total)}`);

const problems = aabProblems(entries.map((entry) => entry.name), existsSync(configFile) ? readFileSync(configFile, 'utf8') : null);
if (problems.length > 0) {
  console.error(`El AAB no pasa (${aab}):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('check-aab: correcto.');
