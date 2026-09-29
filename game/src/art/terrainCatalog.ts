/**
 * Posiciones en vectoraith_tileset_terrains_temperate_autotile_rpgmaker.png (formato RPG Maker A2,
 * 16 columnas de 16 px). Cada terreno es un bloque de 2×3 tiles; ver core/autotile.ts.
 */
export interface Block {
  /** Columna del bloque, en tiles. */
  x: number;
  /** Fila del bloque, en tiles. */
  y: number;
}

/** Césped liso: un tile interior del bloque de césped. */
export const GRASS_TILE = { x: 0, y: 1 } as const;
/** Camino de tierra sobre césped. */
export const DIRT_BLOCK: Block = { x: 2, y: 3 };
/** Valla de madera (fondo transparente, va en una capa encima). */
export const FENCE_BLOCK: Block = { x: 12, y: 0 };
