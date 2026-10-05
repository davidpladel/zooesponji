import { createGrid, type Point, type WalkGrid } from './pathfinding';

export interface TiledProperty {
  name: string;
  type: string;
  value: unknown;
}

export interface TiledTile {
  id: number;
  properties?: TiledProperty[];
}

export interface TiledTileset {
  firstgid: number;
  name: string;
  tilecount: number;
  tiles?: TiledTile[];
}

export interface TiledObject {
  id: number;
  name: string;
  type?: string;
  class?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  point?: boolean;
  properties?: TiledProperty[];
}

export interface TiledTileLayer {
  type: 'tilelayer';
  name: string;
  width: number;
  height: number;
  data: number[];
}

export interface TiledObjectLayer {
  type: 'objectgroup';
  name: string;
  objects: TiledObject[];
}

export type TiledLayer = TiledTileLayer | TiledObjectLayer;

export interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  tilesets: TiledTileset[];
}

export interface EnclosureInfo {
  /** Id del recinto (`PenId`). */
  penId: string;
  /** Ambiente del recinto (savannah, alpine, rainforest, bamboo, tundra, grassland) o null si no tiene. */
  biome: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GateInfo {
  penId: string;
  tile: Point;
}

export const GROUND_LAYER = 'suelo';
export const OBJECTS_LAYER = 'objetos';

/** Los 3 bits altos del gid de Tiled indican volteos/rotación. */
const GID_MASK = 0x1fffffff;

function getProperty(properties: TiledProperty[] | undefined, name: string): unknown {
  return properties?.find((p) => p.name === name)?.value;
}

function objectKind(object: TiledObject): string | undefined {
  return object.type || object.class;
}

function objectsOf(map: TiledMap): TiledObject[] {
  const layer = map.layers.find(
    (l): l is TiledObjectLayer => l.type === 'objectgroup' && l.name === OBJECTS_LAYER,
  );
  return layer?.objects ?? [];
}

function penIdOf(object: TiledObject): string | null {
  const value = getProperty(object.properties, 'penId');
  return typeof value === 'string' ? value : null;
}

export function buildWalkGrid(map: TiledMap): WalkGrid {
  const layer = map.layers.find(
    (l): l is TiledTileLayer => l.type === 'tilelayer' && l.name === GROUND_LAYER,
  );
  if (!layer) throw new Error(`El mapa no tiene la capa de tiles "${GROUND_LAYER}"`);

  const walkableGids = new Set<number>();
  for (const tileset of map.tilesets) {
    for (const tile of tileset.tiles ?? []) {
      if (getProperty(tile.properties, 'walkable') === true) walkableGids.add(tileset.firstgid + tile.id);
    }
  }
  return createGrid(layer.width, layer.height, (x, y) => {
    const gid = (layer.data[y * layer.width + x] ?? 0) & GID_MASK;
    return walkableGids.has(gid);
  });
}

export function readEnclosures(map: TiledMap): EnclosureInfo[] {
  const result: EnclosureInfo[] = [];
  for (const object of objectsOf(map)) {
    const penId = penIdOf(object);
    if (objectKind(object) !== 'recinto' || !penId) continue;
    const biome = getProperty(object.properties, 'biome');
    result.push({
      penId,
      biome: typeof biome === 'string' ? biome : null,
      x: object.x,
      y: object.y,
      width: object.width,
      height: object.height,
    });
  }
  return result;
}

export function readGates(map: TiledMap): GateInfo[] {
  const result: GateInfo[] = [];
  for (const object of objectsOf(map)) {
    const penId = penIdOf(object);
    if (objectKind(object) !== 'puerta' || !penId) continue;
    result.push({
      penId,
      tile: { x: Math.floor(object.x / map.tilewidth), y: Math.floor(object.y / map.tileheight) },
    });
  }
  return result;
}

export function readSpawn(map: TiledMap): Point {
  const spawn = objectsOf(map).find((o) => o.name === 'inicio');
  if (!spawn) throw new Error('El mapa no tiene el punto "inicio" en la capa "objetos"');
  return { x: Math.floor(spawn.x / map.tilewidth), y: Math.floor(spawn.y / map.tileheight) };
}

export interface ShopInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Casilla izquierda de la puerta. */
  door: Point;
  /** Ancho de la puerta en casillas: pisar cualquiera de ellas abre la tienda. */
  doorWidth: number;
}

/** ¿La casilla es de la puerta de la tienda? */
export function isShopDoor(shop: ShopInfo, tile: Point): boolean {
  return tile.y === shop.door.y && tile.x >= shop.door.x && tile.x < shop.door.x + shop.doorWidth;
}

export function readShop(map: TiledMap): ShopInfo | null {
  const objects = objectsOf(map);
  const building = objects.find((o) => objectKind(o) === 'tienda');
  const door = objects.find((o) => objectKind(o) === 'puertaTienda');
  if (!building || !door) return null;
  return {
    x: building.x,
    y: building.y,
    width: building.width,
    height: building.height,
    door: { x: Math.floor(door.x / map.tilewidth), y: Math.floor(door.y / map.tileheight) },
    doorWidth: Math.max(1, Math.round(door.width / map.tilewidth)),
  };
}

export interface DecorInfo {
  kind: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function readDecor(map: TiledMap): DecorInfo[] {
  const result: DecorInfo[] = [];
  for (const object of objectsOf(map)) {
    const kind = getProperty(object.properties, 'kind');
    if (objectKind(object) !== 'decor' || typeof kind !== 'string') continue;
    result.push({ kind, x: object.x, y: object.y, width: object.width, height: object.height });
  }
  return result;
}

export interface PropInfo {
  /** Nombre de la pieza en el manifiesto de arte. */
  prop: string;
  /** Punto de apoyo: centro de la base, en px. */
  x: number;
  y: number;
  /** Pieza plana (agua, meseta): se dibuja pegada al suelo, bajo animales y personas. */
  flat: boolean;
  /** Orden entre piezas planas. */
  z: number;
  /** Zona que el animal no puede pisar (centrada en la base) o null. */
  block: { x: number; y: number; width: number; height: number } | null;
}

export function readProps(map: TiledMap): PropInfo[] {
  const result: PropInfo[] = [];
  for (const object of objectsOf(map)) {
    const prop = getProperty(object.properties, 'prop');
    if (objectKind(object) !== 'prop' || typeof prop !== 'string') continue;
    const num = (name: string) => {
      const v = getProperty(object.properties, name);
      return typeof v === 'number' ? v : 0;
    };
    const blocks = getProperty(object.properties, 'blocks') === true;
    const w = num('blockW');
    const h = num('blockH');
    result.push({
      prop,
      x: object.x,
      y: object.y,
      flat: getProperty(object.properties, 'flat') === true,
      z: num('z'),
      block: blocks && w > 0 && h > 0 ? { x: object.x - w / 2, y: object.y - h, width: w, height: h } : null,
    });
  }
  return result;
}

/** Tipos de tile del interior de la tienda (mapa lógico, el arte lo pone ShopInterior). */
export const INTERIOR_GIDS = { floor: 1, wall: 2, furniture: 3 } as const;

export interface InteriorDeco {
  piece: string;
  /** Base de la pieza en px (centro abajo). */
  x: number;
  y: number;
  /** Cuánto se eleva al pintarla (p. ej. velas encima del mostrador). */
  z: number;
  /** Plana en el suelo (alfombra): siempre debajo de todo. */
  flat: boolean;
}

export interface InteriorSpots {
  /** Pies del tendero (px). */
  shopkeeper: Point;
  /** Base de cada peana (px), en orden de `orden`. */
  pedestals: Point[];
  /** Felpudo de salida (px) y su tile (entrada de la cuidadora en la fase B). */
  door: Point;
  doorTile: Point;
  decos: InteriorDeco[];
}

export function readInteriorSpots(map: TiledMap): InteriorSpots | null {
  const objects = objectsOf(map);
  const keeper = objects.find((o) => objectKind(o) === 'tendero');
  const door = objects.find((o) => objectKind(o) === 'puertaInterior');
  if (!keeper || !door) return null;
  const num = (o: TiledObject, name: string): number => {
    const v = getProperty(o.properties, name);
    return typeof v === 'number' ? v : 0;
  };
  const pedestals = objects
    .filter((o) => objectKind(o) === 'peana')
    .sort((a, b) => num(a, 'orden') - num(b, 'orden'))
    .map((o) => ({ x: o.x, y: o.y }));
  const decos: InteriorDeco[] = [];
  for (const o of objects) {
    const piece = getProperty(o.properties, 'pieza');
    if (objectKind(o) !== 'deco' || typeof piece !== 'string') continue;
    decos.push({ piece, x: o.x, y: o.y, z: num(o, 'z'), flat: getProperty(o.properties, 'flat') === true });
  }
  return {
    shopkeeper: { x: keeper.x, y: keeper.y },
    pedestals,
    door: { x: door.x, y: door.y },
    doorTile: { x: Math.floor(door.x / map.tilewidth), y: Math.floor(door.y / map.tileheight) },
    decos,
  };
}

/** Filas de pared arriba del todo (mirando la primera columna de la capa de suelo). */
export function wallRows(map: TiledMap): number {
  const layer = map.layers.find((l): l is TiledTileLayer => l.type === 'tilelayer' && l.name === GROUND_LAYER);
  if (!layer) return 0;
  let rows = 0;
  while (rows < layer.height && ((layer.data[rows * layer.width] ?? 0) & GID_MASK) === INTERIOR_GIDS.wall) rows++;
  return rows;
}
