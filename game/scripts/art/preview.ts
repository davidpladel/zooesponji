// Vista ampliada de un aspecto de animal, para ajustar sus retoques mirándolo.
// Uso: npm run art:preview -- <aspecto> [escala]
// La imagen va al repo privado (art-work/plantillas/), nunca a este.
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildLook } from './looks.ts';
import { scaleUp } from './pngTools.ts';
import { assertPrivateRepo, config, privateRepo } from './source.ts';

assertPrivateRepo();
const [id, k = '8'] = process.argv.slice(2);
const look = id ? config.animals[id] : undefined;
if (!id || !look) {
  console.error(`Uso: npm run art:preview -- <aspecto> [escala]\nAspectos: ${Object.keys(config.animals).join(', ')}`);
  process.exit(1);
}
const outDir = join(privateRepo, 'art-work/plantillas');
mkdirSync(outDir, { recursive: true });
const out = join(outDir, `${id}_x${k}_para_ver.png`);
writeFileSync(out, PNG.sync.write(scaleUp(buildLook(id, look).png, Number(k))));
console.log(out);
