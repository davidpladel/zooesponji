// Varios aspectos de animal juntos (de frente y de lado), ampliados sobre césped, para ver si se distinguen.
// Uso: npm run art:compare -- <nombre> <aspecto> [aspecto...]
// La imagen va al repo privado (art-work/plantillas/<nombre>_juntos_para_ver.png), nunca a este.
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildLook } from './looks.ts';
import { assertPrivateRepo, config, privateRepo } from './source.ts';

assertPrivateRepo();
const [name, ...ids] = process.argv.slice(2);
const unknown = ids.filter((id) => !config.animals[id]);
if (!name || ids.length === 0 || unknown.length > 0) {
  console.error(`Uso: npm run art:compare -- <nombre> <aspecto> [aspecto...]\n${unknown.length > 0 ? `Aspectos desconocidos: ${unknown.join(', ')}` : ''}`);
  process.exit(1);
}
const k = 6;
const pad = 12;
const sheets = ids.map((id) => buildLook(id, config.animals[id]!).png);
const cell = Math.max(...sheets.map((s) => s.width / 3)) * k + pad;
const width = cell * 2 * sheets.length;
const img = new PNG({ width, height: cell });
for (let i = 0; i < img.data.length; i += 4) img.data.set([120, 170, 110, 255], i);
sheets.forEach((png, n) => {
  const fw = png.width / 3;
  const fh = png.height / 4;
  // Fotograma quieto de la fila de frente (0) y de la fila derecha (2), apoyados abajo.
  [0, 2].forEach((row, j) => {
    const ox = (n * 2 + j) * cell + Math.floor((cell - fw * k) / 2);
    const oy = cell - fh * k - pad / 2;
    for (let y = 0; y < fh * k; y++) {
      for (let x = 0; x < fw * k; x++) {
        const si = ((row * fh + Math.floor(y / k)) * png.width + fw + Math.floor(x / k)) * 4;
        if (png.data[si + 3] === 0) continue;
        img.data.set(png.data.subarray(si, si + 4), ((oy + y) * width + ox + x) * 4);
      }
    }
  });
});
const outDir = join(privateRepo, 'art-work/plantillas');
mkdirSync(outDir, { recursive: true });
const out = join(outDir, `${name}_juntos_para_ver.png`);
writeFileSync(out, PNG.sync.write(img));
console.log(out);
