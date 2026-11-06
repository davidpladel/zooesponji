// Guarda la «foto» de las casillas de camino del mapa del zoo en tests/unit/data/caminos.json.
// La prueba caminos.test.ts falla si un cambio del mapa quita alguna: si es a propósito, se vuelve a lanzar esto.
// Uso: npm run map:snapshot
import { registerHooks } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// El código del juego importa sin extensión (como pide Vite): aquí se prueba con «.ts».
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.startsWith('.') && !/\.\w+$/.test(specifier)) return nextResolve(`${specifier}.ts`, context);
      throw error;
    }
  },
});

const { pathTiles } = await import('../src/core/mapCheck.ts');
const game = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const map = JSON.parse(readFileSync(resolve(game, 'public/assets/maps/zoo.tmj'), 'utf8'));
const tiles = pathTiles(map);
const out = resolve(game, 'tests/unit/data/caminos.json');
let before: string[] = [];
try {
  before = (JSON.parse(readFileSync(out, 'utf8')) as { tiles: string[] }).tiles;
} catch {
  // Primera foto.
}
writeFileSync(out, JSON.stringify({ width: map.width, height: map.height, tiles }, null, 0) + '\n');
const now = new Set(tiles);
const old = new Set(before);
console.log(`Foto guardada: ${tiles.length} casillas de camino (${tiles.filter((t) => !old.has(t)).length} nuevas, ${before.filter((t) => !now.has(t)).length} quitadas).`);
