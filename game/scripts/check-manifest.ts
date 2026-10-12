// Uso: node scripts/check-manifest.ts [--publicar]
// Comprueba el manifiesto fusionado de la compilación de publicación. Hay que compilar antes con Gradle.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { manifestProblems } from './manifestRules.ts';

const ROOT = fileURLToPath(new URL('../android/app/build/intermediates/', import.meta.url));

function find(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) find(path, found);
    else if (name === 'AndroidManifest.xml' && path.includes('merged_manifest') && path.includes(`${sep}release${sep}`)) found.push(path);
  }
  return found;
}

const files = existsSync(ROOT) ? find(ROOT) : [];
if (files.length === 0) {
  console.error('No hay manifiesto fusionado de publicación. Compila antes con Gradle (ver docs/privado/play-store.md).');
  process.exit(1);
}
const newest = files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0]!;
const problems = manifestProblems(readFileSync(newest, 'utf8'), { release: process.argv.includes('--publicar') });
if (problems.length > 0) {
  console.error(`El manifiesto no pasa (${newest}):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`check-manifest: correcto (${newest}).`);
