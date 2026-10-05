// Dibuja el icono del calcetín (16×16) en el repo privado, si los niños no han hecho ya el suyo.
// Uso: npm run make:calcetin
import { PNG } from 'pngjs';
import { existsSync, writeFileSync } from 'node:fs';
import { finished } from './art/looks.ts';
import { assertPrivateRepo } from './art/source.ts';

assertPrivateRepo();
const ROWS = [
  '................',
  '....oooooo......',
  '...owwwwwwo.....',
  '...owwwwwwo.....',
  '...orrrrrro.....',
  '...orrrrrro.....',
  '...owwwwwwo.....',
  '...orrrrrro.....',
  '...orrrrrro.....',
  '...orrrrrrooo...',
  '...orrrrrrrrroo.',
  '...odrrrrrrrrwwo',
  '...oddrrrrrrrwwo',
  '....odddrrrrwwo.',
  '.....ooooooooo..',
  '................',
];
const COLORS: Record<string, [number, number, number, number]> = {
  '.': [0, 0, 0, 0],
  o: [58, 46, 46, 255],
  w: [244, 243, 242, 255],
  r: [217, 83, 79, 255],
  d: [176, 58, 55, 255],
};
const out = finished('calcetin.png');
if (existsSync(out)) {
  console.log(`Ya existe ${out}: no se toca.`);
} else {
  const png = new PNG({ width: 16, height: 16 });
  ROWS.forEach((row, y) => [...row].forEach((c, x) => png.data.set(COLORS[c]!, (y * 16 + x) * 4)));
  writeFileSync(out, PNG.sync.write(png));
  console.log(out);
}
