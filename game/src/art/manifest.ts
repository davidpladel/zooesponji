import { ANIMAL_IDS, type AnimalId } from '../data/animals';
import { FOOD_IDS, type FoodId } from '../data/foods';

export interface SheetInfo {
  file: string;
  frameWidth: number;
  frameHeight: number;
}

export interface ImageInfo {
  file: string;
  width: number;
  height: number;
}

/** Pieza de decoración; si es animada, `file` es una hoja horizontal de `frames` fotogramas de `width`. */
export interface PropImage extends ImageInfo {
  frames?: number;
  fps?: number;
}

export const DECOR_KINDS = ['shop', 'fountain', 'tree', 'bush'] as const;
export type DecorKind = (typeof DECOR_KINDS)[number];

export interface ArtManifest {
  version: 1;
  terrain: { file: string; columns: number };
  keeper: SheetInfo;
  shopkeeper: SheetInfo;
  visitors: SheetInfo[];
  /** Hojas de animal por aspecto (`cabra`, `cabra-gordi`…). Las de especie están siempre. */
  animals: Record<string, SheetInfo>;
  decor: Record<DecorKind, ImageInfo>;
  /** Piezas de decoración por nombre (opcional en manifiestos antiguos). */
  props: Record<string, PropImage>;
  /** Iconos de comida; la que falte se dibuja con emoji. */
  foods: Partial<Record<FoodId, ImageInfo>>;
  /** Animales decorativos que pasean con el principal (p. ej. la leona). */
  companions: Partial<Record<AnimalId, SheetInfo>>;
  /** Piezas del interior de la tienda (suelo, pared, muebles); vacío = tienda con colores. */
  interior: Record<string, ImageInfo>;
}

type Loose = Record<string, unknown>;
const isObject = (v: unknown): v is Loose => typeof v === 'object' && v !== null && !Array.isArray(v);
const isPositive = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0;

function asSheet(v: unknown): SheetInfo | null {
  if (!isObject(v) || typeof v.file !== 'string' || !isPositive(v.frameWidth) || !isPositive(v.frameHeight)) return null;
  return { file: v.file, frameWidth: v.frameWidth, frameHeight: v.frameHeight };
}

function asImage(v: unknown): ImageInfo | null {
  if (!isObject(v) || typeof v.file !== 'string' || !isPositive(v.width) || !isPositive(v.height)) return null;
  return { file: v.file, width: v.width, height: v.height };
}

export function parseManifest(value: unknown): ArtManifest | null {
  if (!isObject(value) || value.version !== 1) return null;
  const terrain = value.terrain;
  if (!isObject(terrain) || typeof terrain.file !== 'string' || !isPositive(terrain.columns)) return null;
  const keeper = asSheet(value.keeper);
  const shopkeeper = asSheet(value.shopkeeper);
  if (!keeper || !shopkeeper) return null;
  if (!Array.isArray(value.visitors) || value.visitors.length === 0) return null;
  const visitors = value.visitors.map(asSheet);
  if (visitors.some((v) => v === null)) return null;

  if (!isObject(value.animals)) return null;
  const animals: Record<string, SheetInfo> = {};
  for (const [look, raw] of Object.entries(value.animals)) {
    const s = asSheet(raw);
    if (!s) return null;
    animals[look] = s;
  }
  // La hoja de cada especie es obligatoria; las de aspectos concretos, no (ver `resolveLook`).
  if (ANIMAL_IDS.some((id) => !animals[id])) return null;

  if (!isObject(value.decor)) return null;
  const decor = {} as Record<DecorKind, ImageInfo>;
  for (const kind of DECOR_KINDS) {
    const img = asImage(value.decor[kind]);
    if (!img) return null;
    decor[kind] = img;
  }

  const props: Record<string, PropImage> = {};
  if (value.props !== undefined) {
    if (!isObject(value.props)) return null;
    for (const [name, raw] of Object.entries(value.props)) {
      const img = asImage(raw);
      if (!img || !isObject(raw)) return null;
      if (raw.frames === undefined) {
        props[name] = img;
        continue;
      }
      if (!isPositive(raw.frames) || !isPositive(raw.fps)) return null;
      props[name] = { ...img, frames: raw.frames, fps: raw.fps };
    }
  }
  const foods: Partial<Record<FoodId, ImageInfo>> = {};
  if (isObject(value.foods)) {
    for (const id of FOOD_IDS) {
      if (value.foods[id] === undefined) continue;
      const img = asImage(value.foods[id]);
      if (!img) return null;
      foods[id] = img;
    }
  }
  const companions: Partial<Record<AnimalId, SheetInfo>> = {};
  if (isObject(value.companions)) {
    for (const id of ANIMAL_IDS) {
      if (value.companions[id] === undefined) continue;
      const s = asSheet(value.companions[id]);
      if (!s) return null;
      companions[id] = s;
    }
  }

  const interior: Record<string, ImageInfo> = {};
  if (value.interior !== undefined) {
    if (!isObject(value.interior)) return null;
    for (const [name, raw] of Object.entries(value.interior)) {
      const img = asImage(raw);
      if (!img) return null;
      interior[name] = img;
    }
  }

  return {
    props,
    interior,
    foods,
    companions,
    version: 1,
    terrain: { file: terrain.file, columns: terrain.columns },
    keeper,
    shopkeeper,
    visitors: visitors as SheetInfo[],
    animals,
    decor,
  };
}

/** El aspecto si su hoja está en el manifiesto; si no, el de su especie (arte importado antes de añadirlo). */
export function resolveLook(m: ArtManifest | null, look: string, species: AnimalId): string {
  return m?.animals[look] ? look : species;
}
