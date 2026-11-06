import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { pathTiles, solidOverPath } from '../../src/core/mapCheck';
import { readSpawn, type TiledMap } from '../../src/core/tiledmap';

const map = JSON.parse(readFileSync(fileURLToPath(new URL('../../public/assets/maps/zoo.tmj', import.meta.url)), 'utf8')) as TiledMap;
const snapshot = JSON.parse(readFileSync(fileURLToPath(new URL('./data/caminos.json', import.meta.url)), 'utf8')) as {
  width: number;
  height: number;
  tiles: string[];
};

describe('caminos del zoo', () => {
  it('no se ha quitado ningún camino sin actualizar la foto', () => {
    const now = new Set(pathTiles(map));
    const lost = snapshot.tiles.filter((t) => !now.has(t));
    expect(lost, 'caminos quitados: si es a propósito, npm run map:snapshot').toEqual([]);
  });

  it('desde el inicio se llega a todas las casillas de camino', () => {
    const tiles = new Set(pathTiles(map));
    const start = readSpawn(map);
    const seen = new Set([`${start.x},${start.y}`]);
    const queue = [start];
    while (queue.length > 0) {
      const p = queue.shift()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const k = `${p.x + dx},${p.y + dy}`;
        if (seen.has(k) || !tiles.has(k)) continue;
        seen.add(k);
        queue.push({ x: p.x + dx, y: p.y + dy });
      }
    }
    expect([...tiles].filter((t) => !seen.has(t)), 'casillas de camino sueltas').toEqual([]);
  });

  it('nada sólido tapa camino', () => {
    expect(solidOverPath(map)).toEqual([]);
  });
});
