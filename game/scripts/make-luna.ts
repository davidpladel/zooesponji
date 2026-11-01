// Dibuja a Luna, la perrita de la cuidadora: hoja de 48×64 (3×4 fotogramas de 16×16) en game/art/luna.png.
// Dibujo propio (a partir de las fotos de David), así que va al repo público.
// Uso: npm run make:luna -- [--force] [--vista <png>]
import { PNG } from 'pngjs';
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type Rgba = [number, number, number, number];
const COLORS: Record<string, Rgba> = {
  '.': [0, 0, 0, 0],
  o: [28, 26, 30, 255], // contorno
  k: [43, 40, 48, 255], // negro
  g: [74, 70, 82, 255], // brillo del pelo
  w: [244, 243, 242, 255], // mancha blanca del pecho y patas
  e: [15, 14, 16, 255], // ojo
  s: [255, 255, 255, 255], // brillo del ojo
  n: [15, 14, 16, 255], // nariz
  h: [0, 0, 0, 60], // sombra
};

/** Pose quieta de cada dirección y las dos filas de las patas al andar (paso A y paso B). */
interface Pose {
  idle: string[];
  stepA: [string, string];
  stepB: [string, string];
}

// De frente: orejas caídas (la izquierda algo más levantada), mancha blanca en el pecho y en las patas.
const DOWN: Pose = {
  idle: [
    '................',
    '................',
    '......oooo......',
    '....ookggkoo....',
    '.okkokkkkkkooo..',
    '..okokkkkkkokko.',
    '..okoeskkesokko.',
    '..oookkkkkkooo..',
    '....okknnkko....',
    '.....okkkko.....',
    '....okkwwkko....',
    '...okkwwwwkko...',
    '...okkwwwwkko...',
    '...okokkkkoko...',
    '...owo.oo.owo...',
    '....hhhhhhhh....',
  ],
  stepA: ['...okokkkkoko...', '...owo....owo...'],
  stepB: ['...okokkkkoko...', '....o.....owo...'],
};

// De perfil, mirando a la izquierda: hocico, oreja caída, rabo fino hacia arriba.
const LEFT: Pose = {
  idle: [
    '................',
    '................',
    '................',
    '...oooo.........',
    '..okkggo.....o..',
    '.okkkkkoo....o..',
    'oeskkkokko...o..',
    'nkkkkkokko..o...',
    '.ooookkkkooooo..',
    '.....okwkkkkkko.',
    '.....owwkkkkkko.',
    '.....owkkkkkkko.',
    '.....okkoookkko.',
    '.....oko...okko.',
    '.....owo...owo..',
    '.....hhhhhhhhh..',
  ],
  stepA: ['.....oko...okko.', '....owo.....owo.'],
  stepB: ['.....oko...okko.', '......owo.owo...'],
};

// De espaldas: orejas y rabo.
const UP: Pose = {
  idle: [
    '................',
    '................',
    '......oooo......',
    '....ookggkoo....',
    '.okkokkkkkkooo..',
    '..okokgkkkkokko.',
    '..okokkkkkkokko.',
    '..oookkkkkkooo..',
    '....okkkkkko....',
    '.....okkkko..o..',
    '....okkkkkko.o..',
    '...okkkkkkkko...',
    '...okkkkkkkko...',
    '...okokkkkoko...',
    '...owo.oo.owo...',
    '....hhhhhhhh....',
  ],
  stepA: ['...okokkkkoko...', '...owo....owo...'],
  stepB: ['...okokkkkoko...', '....o.....owo...'],
};

const mirrorRow = (row: string): string => [...row].reverse().join('');
const mirror = (pose: Pose): Pose => ({
  idle: pose.idle.map(mirrorRow),
  stepA: [mirrorRow(pose.stepA[0]), mirrorRow(pose.stepA[1])],
  stepB: [mirrorRow(pose.stepB[0]), mirrorRow(pose.stepB[1])],
});

/** Fotograma con las filas 13 y 14 (las patas) cambiadas. */
const withLegs = (idle: string[], legs: [string, string]): string[] => [...idle.slice(0, 13), legs[0], legs[1], ...idle.slice(15)];

/** Filas como en `FACING_ROWS`: abajo, izquierda, derecha, arriba. Columnas: paso A, quieta, paso B. */
export function lunaFrames(): string[][][] {
  return [DOWN, LEFT, mirror(LEFT), UP].map((pose) => [withLegs(pose.idle, pose.stepA), pose.idle, withLegs(pose.idle, pose.stepB)]);
}

export function lunaSheet(): PNG {
  const png = new PNG({ width: 48, height: 64 });
  png.data.fill(0);
  lunaFrames().forEach((cols, row) =>
    cols.forEach((frame, col) =>
      frame.forEach((line, y) => {
        if (line.length !== 16) throw new Error(`Fila ${y} del fotograma ${row},${col}: ${line.length} píxeles`);
        [...line].forEach((c, x) => {
          const color = COLORS[c];
          if (!color) throw new Error(`Color desconocido: ${c}`);
          png.data.set(color, ((row * 16 + y) * 48 + col * 16 + x) * 4);
        });
      }),
    ),
  );
  return png;
}

/** Vista ampliada sobre césped, para mirarla. */
function preview(sheet: PNG, k: number): PNG {
  const out = new PNG({ width: sheet.width * k, height: sheet.height * k });
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const i = (Math.floor(y / k) * sheet.width + Math.floor(x / k)) * 4;
      const a = sheet.data[i + 3]! / 255;
      const grass = [120, 176, 92];
      const px = [0, 1, 2].map((c) => Math.round(sheet.data[i + c]! * a + grass[c]! * (1 - a)));
      out.data.set([...px, 255], (y * out.width + x) * 4);
    }
  }
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const out = join(dirname(fileURLToPath(import.meta.url)), '../art/luna.png');
  const sheet = lunaSheet();
  const view = args.indexOf('--vista');
  if (view >= 0 && args[view + 1]) {
    writeFileSync(args[view + 1]!, PNG.sync.write(preview(sheet, 10)));
    console.log(args[view + 1]);
  }
  if (existsSync(out) && !args.includes('--force')) {
    console.log(`Ya existe ${out}: no se toca (usa --force).`);
  } else {
    writeFileSync(out, PNG.sync.write(sheet));
    console.log(out);
  }
}
