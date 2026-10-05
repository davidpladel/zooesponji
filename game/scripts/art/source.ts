// Lectura de la configuración de arte y de las hojas dentro de los zips del repo privado.
import AdmZip from 'adm-zip';
import { PNG } from 'pngjs';
import type { Animate, Compose, SheetEdit } from './pngTools.ts';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface Source {
  zip: string;
  file: string;
}
export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Zonas del recorte (relativas a él) que se dejan transparentes: restos de piezas vecinas. */
  erase?: [number, number, number, number][];
}
/** Un aspecto de animal: hoja del pack, retoques encima y, si existe, el dibujo de los niños. */
export type LookSource = Source & {
  recolor?: 'panther';
  edits?: SheetEdit[];
  /** Lado (px) al que se reduce cada fotograma: un animal más pequeño que los de su especie. */
  shrink?: number;
  /** Archivo en `art-work/terminados/` que sustituye a todo lo demás. */
  override?: string;
  overrideRows?: number[];
};
export interface ArtConfig {
  privateRepo: string;
  zips: Record<string, string>;
  terrain: Source & { columns: number };
  decor: Record<string, Source & CropRect>;
  keeper: Source & { character: number };
  shopkeeper: Source & { character: number };
  visitors: (Source & { character: number })[];
  /** Por aspecto: el de la especie (`cabra`) y los de cada animal distinto (`cabra-gordi`). */
  animals: Record<string, LookSource>;
  props?: Record<string, Source & CropRect & { animate?: Animate; compose?: Compose }>;
  foods?: Record<string, (Source & CropRect) | { override: string }>;
  companions?: Record<string, Source>;
  interior?: Record<string, Source & CropRect>;
}

/** Carpeta `game/`. */
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const config = JSON.parse(readFileSync(join(root, 'art/art.config.json'), 'utf8')) as ArtConfig;
export const privateRepo = resolve(root, config.privateRepo);

export function assertPrivateRepo(): void {
  if (!existsSync(join(privateRepo, 'packs'))) {
    console.error(`No encuentro ${join(privateRepo, 'packs')}. Clona zooesponji-private junto a zooesponji.`);
    process.exit(1);
  }
}

const zipCache = new Map<string, AdmZip>();

export function readSource(source: Source): PNG {
  const zipName = config.zips[source.zip];
  if (!zipName) throw new Error(`Zip desconocido en la configuración: ${source.zip}`);
  let zip = zipCache.get(zipName);
  if (!zip) {
    zip = new AdmZip(join(privateRepo, 'packs', zipName));
    zipCache.set(zipName, zip);
  }
  const entry = zip.getEntry(source.file);
  if (!entry) throw new Error(`No está "${source.file}" en ${zipName}`);
  return PNG.sync.read(entry.getData());
}
