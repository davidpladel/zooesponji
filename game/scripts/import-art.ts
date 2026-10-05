// Extrae de los packs (repo privado) solo lo que usa el juego y lo deja en public/art/ (ignorado por git).
// Uso: npm run art:import
import { PNG } from 'pngjs';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { animatedStrip, composedStrip, characterSheet, crop, erase } from './art/pngTools.ts';
import { buildLook, finished } from './art/looks.ts';
import { assertPrivateRepo, config, readSource, root } from './art/source.ts';

assertPrivateRepo();
const outDir = join(root, 'public/art');

const sheet = (png: PNG) => ({ frameWidth: png.width / 3, frameHeight: png.height / 4 });
function save(png: PNG, file: string): string {
  writeFileSync(join(outDir, file), PNG.sync.write(png));
  return file;
}
const image = (png: PNG, file: string) => ({ file: save(png, file), width: png.width, height: png.height });

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const terrain = readSource(config.terrain);
const decor: Record<string, { file: string; width: number; height: number }> = {};
for (const [name, d] of Object.entries(config.decor)) {
  decor[name] = image(crop(readSource(d), d.x, d.y, d.w, d.h), `decor-${name}.png`);
}

const keeper = characterSheet(readSource(config.keeper), config.keeper.character);
const shopkeeper = characterSheet(readSource(config.shopkeeper), config.shopkeeper.character);
const visitors = config.visitors.map((v, i) => {
  const png = characterSheet(readSource(v), v.character);
  return { file: save(png, `visitor-${i}.png`), ...sheet(png) };
});

const animals: Record<string, { file: string; frameWidth: number; frameHeight: number }> = {};
for (const [id, look] of Object.entries(config.animals)) {
  const { png, fromOverride } = buildLook(id, look);
  if (fromOverride) console.log(`  ${id}: usando el dibujo de los niños (${look.override})`);
  animals[id] = { file: save(png, `animal-${id}.png`), ...sheet(png) };
}

const props: Record<string, { file: string; width: number; height: number; frames?: number; fps?: number }> = {};
for (const [name, p] of Object.entries(config.props ?? {})) {
  if (p.compose) {
    const strip = composedStrip(readSource(p), p.w, p.h, p.compose);
    props[name] = { file: save(strip, `prop-${name}.png`), width: p.w, height: p.h, frames: p.compose.frames, fps: p.compose.fps ?? 4 };
    continue;
  }
  if (p.animate) {
    // Hoja de fotogramas (agua): cada fotograma del tamaño de la pieza fija.
    const strip = animatedStrip(readSource(p), p, p.animate);
    props[name] = { file: save(strip, `prop-${name}.png`), width: p.w, height: p.h, frames: p.animate.count, fps: p.animate.fps ?? 4 };
    continue;
  }
  props[name] = image(erase(crop(readSource(p), p.x, p.y, p.w, p.h), p.erase ?? []), `prop-${name}.png`);
}

const foods: Record<string, { file: string; width: number; height: number }> = {};
for (const [id, f] of Object.entries(config.foods ?? {})) {
  if ('override' in f) {
    if (!existsSync(finished(f.override))) continue; // sin dibujo todavía: el juego usa el emoji
    foods[id] = image(PNG.sync.read(readFileSync(finished(f.override))), `food-${id}.png`);
    console.log(`  comida ${id}: usando el dibujo de los niños (${f.override})`);
  } else {
    foods[id] = image(crop(readSource(f), f.x, f.y, f.w, f.h), `food-${id}.png`);
  }
}

const companions: Record<string, { file: string; frameWidth: number; frameHeight: number }> = {};
for (const [id, c] of Object.entries(config.companions ?? {})) {
  const png = readSource(c);
  companions[id] = { file: save(png, `companion-${id}.png`), ...sheet(png) };
}

const interior: Record<string, { file: string; width: number; height: number }> = {};
for (const [name, p] of Object.entries(config.interior ?? {})) {
  interior[name] = image(crop(readSource(p), p.x, p.y, p.w, p.h), `interior-${name}.png`);
}

const manifest = {
  version: 1,
  terrain: { file: save(terrain, 'terrain.png'), columns: config.terrain.columns },
  keeper: { file: save(keeper, 'keeper.png'), ...sheet(keeper) },
  shopkeeper: { file: save(shopkeeper, 'shopkeeper.png'), ...sheet(shopkeeper) },
  visitors,
  animals,
  decor,
  props,
  foods,
  companions,
  interior,
};
writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Arte importado en ${outDir}`);
