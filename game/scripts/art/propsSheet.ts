// Tablón con todos los props y comidas importados (public/art), para revisar los recortes.
// Uso: npm run art:props-sheet -- <salida.png>
import { PNG } from 'pngjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './source.ts';

const out = process.argv[2];
if (!out) {
  console.error('Uso: npm run art:props-sheet -- <salida.png>');
  process.exit(1);
}
const artDir = join(root, 'public/art');
const manifest = JSON.parse(readFileSync(join(artDir, 'manifest.json'), 'utf8')) as {
  props?: Record<string, { file: string }>;
  foods?: Record<string, { file: string }>;
};
const files = [...Object.values(manifest.props ?? {}), ...Object.values(manifest.foods ?? {})].map((p) => p.file);
const images = files.map((f) => PNG.sync.read(readFileSync(join(artDir, f))));
const k = 3;
const pad = 12;
const perRow = 8;
const rows: PNG[][] = [];
for (let i = 0; i < images.length; i += perRow) rows.push(images.slice(i, i + perRow));
const rowHeights = rows.map((r) => Math.max(...r.map((p) => p.height * k)));
const width = Math.max(...rows.map((r) => r.reduce((s, p) => s + p.width * k + pad, pad)));
const height = rowHeights.reduce((s, h) => s + h + pad, pad);
const sheet = new PNG({ width, height });
for (let i = 0; i < sheet.data.length; i += 4) sheet.data.set([246, 241, 228, 255], i);
let oy = pad;
rows.forEach((row, r) => {
  let ox = pad;
  for (const p of row) {
    for (let y = 0; y < p.height * k; y++) {
      for (let x = 0; x < p.width * k; x++) {
        const i = (Math.floor(y / k) * p.width + Math.floor(x / k)) * 4;
        const a = p.data[i + 3]!;
        if (!a) continue;
        const j = ((oy + y) * width + ox + x) * 4;
        for (let c = 0; c < 3; c++) sheet.data[j + c] = Math.round((p.data[i + c]! * a + sheet.data[j + c]! * (255 - a)) / 255);
      }
    }
    ox += p.width * k + pad;
  }
  oy += rowHeights[r]! + pad;
});
writeFileSync(out, PNG.sync.write(sheet));
console.log(`${files.length} piezas → ${out}`);
