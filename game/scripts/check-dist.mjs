// Falla si la app compilada lleva algo que huela a token de Matomo. Se lanza al final de `npm run build`.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const FORBIDDEN = ['token_auth', 'MATOMO_TOKEN'];
const TEXT = new Set(['.js', '.mjs', '.css', '.html', '.json', '.map', '.txt', '.webmanifest']);

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (TEXT.has(extname(name))) yield path;
  }
}

const found = [];
for (const path of files(DIST)) {
  const text = readFileSync(path, 'utf8');
  for (const word of FORBIDDEN) if (text.includes(word)) found.push(`${path}: ${word}`);
}
if (found.length > 0) {
  console.error(`La compilación contiene texto prohibido:\n${found.join('\n')}`);
  process.exit(1);
}
console.log('check-dist: sin tokens en la compilación.');
