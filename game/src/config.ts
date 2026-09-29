export const TILE_SIZE = 16;

/** Velocidad del cuidador en píxeles de mundo por segundo (4 tiles/s). */
export const KEEPER_SPEED = 64;

export const TEXTURES = {
  tiles: 'tiles-placeholder',
  keeper: 'keeper-placeholder',
  marker: 'marker-placeholder',
} as const;

export const MAPS = {
  test: 'test-map',
  zoo: 'zoo-map',
  shop: 'shop-map',
} as const;
