// Dibuja el mapa lógico del zoo en PNG, para comparar los caminos con un plano a mano.
// Uso: npm run map:preview -- [--antes <tmj>] [--salida <png>]
// Con --antes, las casillas que ahora son camino y antes no lo eran salen en rojo.
import { PNG } from 'pngjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const game = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

interface TmjObject { type: string; x: number; y: number; width: number; height: number; properties?: { name: string; value: unknown }[] }
interface Tmj { width: number; height: number; layers: { type: string; data?: number[]; objects?: TmjObject[] }[] }

const read = (file: string): Tmj => JSON.parse(readFileSync(file, 'utf8')) as Tmj;
const ground = (m: Tmj): number[] => m.layers.find((l) => l.type === 'tilelayer')!.data!;

const map = read(join(game, 'public/assets/maps/zoo.tmj'));
const before = option('--antes') ? ground(read(option('--antes')!)) : null;
const out = option('--salida') ?? join(game, '../docs/superpowers/mockups/2026-11-01-caminos-nuevos.png');

const PX = 8;
const PATH = 2;
const COLORS: Record<number, [number, number, number]> = {
  1: [120, 176, 92], // césped
  2: [226, 204, 160], // camino
  3: [122, 84, 52], // valla
  4: [240, 200, 60], // puerta
  5: [196, 72, 60], // tienda
};
const NEW_PATH: [number, number, number] = [220, 40, 40];
const FLOWER: [number, number, number] = [236, 120, 190];

const data = ground(map);
const png = new PNG({ width: map.width * PX, height: map.height * PX });
const paint = (tx: number, ty: number, rgb: [number, number, number], inset = 0) => {
  for (let y = inset; y < PX - inset; y++)
    for (let x = inset; x < PX - inset; x++) png.data.set([...rgb, 255], ((ty * PX + y) * png.width + tx * PX + x) * 4);
};
for (let ty = 0; ty < map.height; ty++) {
  for (let tx = 0; tx < map.width; tx++) {
    const gid = data[ty * map.width + tx]!;
    const fresh = before !== null && gid === PATH && before[ty * map.width + tx] !== PATH;
    paint(tx, ty, fresh ? NEW_PATH : (COLORS[gid] ?? [0, 0, 0]));
  }
}
// Flores (jardín de la U y demás macizos): un punto rosa en su casilla.
const objects = map.layers.find((l) => l.type === 'objectgroup')?.objects ?? [];
for (const o of objects) {
  const prop = o.properties?.find((p) => p.name === 'prop')?.value;
  if (typeof prop !== 'string' || !/^(flowers|sunflowers|flowerbed|cherry-tree|pink-bush)/.test(prop)) continue;
  paint(Math.floor((o.x - 1) / 16), Math.floor((o.y - 1) / 16), FLOWER, 2);
}
writeFileSync(out, PNG.sync.write(png));
console.log(out);
