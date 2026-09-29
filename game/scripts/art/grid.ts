// Hoja de un pack ampliada con rejilla, para leer coordenadas de recorte.
// Uso: npm run art:grid -- <clave-zip> "<archivo en el zip>" <salida.png> [x y w h] [escala]
// Líneas magenta cada 16 px; líneas cian cada 64 px (4 tiles). La salida va fuera del repo.
import { PNG } from 'pngjs';
import { writeFileSync } from 'node:fs';
import { assertPrivateRepo, readSource } from './source.ts';

assertPrivateRepo();
const [zip, file, out, x0 = '0', y0 = '0', w0 = '0', h0 = '0', k0 = '4'] = process.argv.slice(2);
if (!zip || !file || !out) {
  console.error('Uso: npm run art:grid -- <clave-zip> "<archivo>" <salida.png> [x y w h] [escala]');
  process.exit(1);
}
const src = readSource({ zip, file });
const X = Number(x0);
const Y = Number(y0);
const W = Number(w0) || src.width - X;
const H = Number(h0) || src.height - Y;
const k = Number(k0);
const img = new PNG({ width: W * k, height: H * k });
for (let y = 0; y < H * k; y++) {
  for (let x = 0; x < W * k; x++) {
    const sx = X + Math.floor(x / k);
    const sy = Y + Math.floor(y / k);
    const i = (sy * src.width + sx) * 4;
    let px: number[] = [src.data[i]!, src.data[i + 1]!, src.data[i + 2]!, src.data[i + 3]!];
    if (px[3] === 0) {
      const c = ((x >> 3) + (y >> 3)) & 1 ? 205 : 230;
      px = [c, c, c, 255];
    }
    const gx = (X * k + x) % (16 * k) === 0;
    const gy = (Y * k + y) % (16 * k) === 0;
    const Gx = (X * k + x) % (64 * k) === 0;
    const Gy = (Y * k + y) % (64 * k) === 0;
    if (Gx || Gy) px = [0, 200, 220, 255];
    else if (gx || gy) px = [255, 0, 255, 255];
    img.data.set(px, (y * img.width + x) * 4);
  }
}
writeFileSync(out, PNG.sync.write(img));
console.log(`${file}: ${src.width}×${src.height} px (${src.width / 16}×${src.height / 16} tiles) → ${out}`);
