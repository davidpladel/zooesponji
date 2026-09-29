import * as Phaser from 'phaser';
import { ART_KEYS } from '../art/art';
import { DIRT_BLOCK, FENCE_BLOCK, GRASS_TILE, type Block } from '../art/terrainCatalog';
import { a2Quarters, quartersKey, type Quarters } from '../core/autotile';
import { GROUND_LAYER, type TiledMap, type TiledTileLayer } from '../core/tiledmap';

const TILE = 16;
const QUARTER = 8;
const PATH_GIDS = new Set([2, 4]); // camino y puerta (tileset lógico "placeholder")
const FENCE_GID = 3;
const COMPOSED_KEY = 'art-terrain-composed';
/** Más que suficiente: un autotile A2 genera como mucho 47 combinaciones distintas por terreno. */
const MAX_TILES = 128;

/** Compone tiles de 16 px a partir de cuartos de 8 px del autotile A2 y los reutiliza. */
class TileComposer {
  private readonly canvas: Phaser.Textures.CanvasTexture;
  private readonly source: CanvasImageSource;
  private readonly cache = new Map<string, number>();
  private next = 0;

  constructor(scene: Phaser.Scene) {
    if (scene.textures.exists(COMPOSED_KEY)) scene.textures.remove(COMPOSED_KEY);
    const canvas = scene.textures.createCanvas(COMPOSED_KEY, TILE * MAX_TILES, TILE);
    if (!canvas) throw new Error('No se pudo crear la textura de terreno');
    this.canvas = canvas;
    this.source = scene.textures.get(ART_KEYS.terrain).getSourceImage() as CanvasImageSource;
  }

  /** Tile completo copiado tal cual del autotile. */
  whole(tileX: number, tileY: number): number {
    return this.slot(`whole:${tileX},${tileY}`, (ctx, dx) =>
      ctx.drawImage(this.source, tileX * TILE, tileY * TILE, TILE, TILE, dx, 0, TILE, TILE),
    );
  }

  compose(block: Block, quarters: Quarters): number {
    return this.slot(`${block.x},${block.y}:${quartersKey(quarters)}`, (ctx, dx) => {
      quarters.forEach(([col, row], i) => {
        const sx = block.x * TILE + col * QUARTER;
        const sy = block.y * TILE + row * QUARTER;
        ctx.drawImage(this.source, sx, sy, QUARTER, QUARTER, dx + (i % 2) * QUARTER, Math.floor(i / 2) * QUARTER, QUARTER, QUARTER);
      });
    });
  }

  finish(): string {
    this.canvas.refresh();
    return COMPOSED_KEY;
  }

  private slot(key: string, draw: (ctx: CanvasRenderingContext2D, dx: number) => void): number {
    const known = this.cache.get(key);
    if (known !== undefined) return known;
    if (this.next >= MAX_TILES) throw new Error('Demasiadas combinaciones de terreno');
    const index = this.next++;
    draw(this.canvas.getContext(), index * TILE);
    this.cache.set(key, index);
    return index;
  }
}

export const TerrainArt = {
  /** Suelo (césped + caminos) y vallas con el arte real, a partir del mapa lógico. */
  build(scene: Phaser.Scene, mapData: TiledMap): void {
    const ground = mapData.layers.find(
      (l): l is TiledTileLayer => l.type === 'tilelayer' && l.name === GROUND_LAYER,
    );
    if (!ground) return;
    const { width, height } = ground;
    const gid = (x: number, y: number): number =>
      x < 0 || y < 0 || x >= width || y >= height ? 0 : (ground.data[y * width + x] ?? 0) & 0x1fffffff;
    const isDirt = (x: number, y: number) => PATH_GIDS.has(gid(x, y));
    const isFence = (x: number, y: number) => gid(x, y) === FENCE_GID;

    const composer = new TileComposer(scene);
    const grass = composer.whole(GRASS_TILE.x, GRASS_TILE.y);
    const soilTiles: number[] = [];
    const fenceTiles: (number | null)[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dirt = a2Quarters(isDirt, x, y);
        soilTiles.push(dirt ? composer.compose(DIRT_BLOCK, dirt) : grass);
        const fence = a2Quarters(isFence, x, y);
        fenceTiles.push(fence ? composer.compose(FENCE_BLOCK, fence) : null);
      }
    }

    const map = scene.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width, height });
    const tileset = map.addTilesetImage('terrain', composer.finish(), TILE, TILE, 0, 0, 0);
    if (!tileset) throw new Error('No se pudo crear el tileset de terreno');
    const soil = map.createBlankLayer('art-suelo', tileset);
    const fences = map.createBlankLayer('art-vallas', tileset);
    if (!soil || !fences) throw new Error('No se pudieron crear las capas de terreno');
    soil.setDepth(0);
    fences.setDepth(2);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        soil.putTileAt(soilTiles[y * width + x]!, x, y);
        const fence = fenceTiles[y * width + x];
        if (fence !== null && fence !== undefined) fences.putTileAt(fence, x, y);
      }
    }
  },
};
