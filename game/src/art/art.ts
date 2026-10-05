import * as Phaser from 'phaser';
import type { Facing } from '../core/facing';
import { ANIMAL_IDS, type AnimalId } from '../data/animals';
import { FOOD_IDS, type FoodId } from '../data/foods';
import { withVersion } from '../core/cacheBust';
import { DECOR_KINDS, resolveLook, type ArtManifest, type DecorKind, type SheetInfo } from './manifest';

export type { Facing };

let current: ArtManifest | null = null;

export function getArt(): ArtManifest | null {
  return current;
}

export function setArt(manifest: ArtManifest | null): void {
  current = manifest;
}

export const ART_KEYS = { terrain: 'art-terrain', keeper: 'art-keeper', shopkeeper: 'art-shopkeeper' } as const;
export const animalKey = (look: string): string => `art-animal-${look}`;
export const visitorKey = (index: number): string => `art-visitor-${index}`;
export const decorKey = (kind: DecorKind): string => `art-decor-${kind}`;
export const propKey = (name: string): string => `art-prop-${name}`;
export const interiorKey = (piece: string): string => `art-interior-${piece}`;
export const propAnimKey = (name: string): string => `art-prop-${name}-anim`;
export const foodKey = (id: FoodId): string => `art-food-${id}`;
export const companionKey = (id: AnimalId): string => `art-companion-${id}`;

export const FACING_ROWS: Record<Facing, number> = { down: 0, left: 1, right: 2, up: 3 };
export const walkAnimKey = (textureKey: string, facing: Facing): string => `${textureKey}-walk-${facing}`;
/** Frame central de la fila: la pose "quieto". */
export const idleFrame = (facing: Facing): number => FACING_ROWS[facing] * 3 + 1;

const url = (file: string): string => withVersion(`art/${file}`);

export function animalSheet(m: ArtManifest, look: string): SheetInfo {
  const sheet = m.animals[look];
  if (!sheet) throw new Error(`Falta la hoja del aspecto "${look}"`);
  return sheet;
}

/** El aspecto si su hoja está cargada; si no, el de su especie. */
export function lookOr(look: string, species: AnimalId): string {
  return resolveLook(getArt(), look, species);
}

/** Encola en el loader todas las imágenes del manifiesto. */
export function queueArt(scene: Phaser.Scene, m: ArtManifest): void {
  const sheet = (key: string, s: SheetInfo) =>
    scene.load.spritesheet(key, url(s.file), { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
  scene.load.image(ART_KEYS.terrain, url(m.terrain.file));
  sheet(ART_KEYS.keeper, m.keeper);
  sheet(ART_KEYS.shopkeeper, m.shopkeeper);
  m.visitors.forEach((v, i) => sheet(visitorKey(i), v));
  for (const [look, s] of Object.entries(m.animals)) sheet(animalKey(look), s);
  for (const kind of DECOR_KINDS) scene.load.image(decorKey(kind), url(m.decor[kind].file));
  for (const [name, p] of Object.entries(m.props)) {
    if (p.frames && p.frames > 1) scene.load.spritesheet(propKey(name), url(p.file), { frameWidth: p.width, frameHeight: p.height });
    else scene.load.image(propKey(name), url(p.file));
  }
  for (const id of FOOD_IDS) {
    const food = m.foods[id];
    if (food) scene.load.image(foodKey(id), url(food.file));
  }
  for (const id of ANIMAL_IDS) {
    const companion = m.companions[id];
    if (companion) sheet(companionKey(id), companion);
  }
  for (const [piece, img] of Object.entries(m.interior)) scene.load.image(interiorKey(piece), url(img.file));
}

export function createWalkAnims(scene: Phaser.Scene, textureKey: string): void {
  for (const facing of Object.keys(FACING_ROWS) as Facing[]) {
    const key = walkAnimKey(textureKey, facing);
    if (scene.anims.exists(key)) continue;
    const start = FACING_ROWS[facing] * 3;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(textureKey, { frames: [start, start + 1, start + 2, start + 1] }),
      frameRate: 7,
      repeat: -1,
    });
  }
}

export function registerArtAnims(scene: Phaser.Scene, m: ArtManifest): void {
  createWalkAnims(scene, ART_KEYS.keeper);
  createWalkAnims(scene, ART_KEYS.shopkeeper);
  m.visitors.forEach((_v, i) => createWalkAnims(scene, visitorKey(i)));
  for (const look of Object.keys(m.animals)) createWalkAnims(scene, animalKey(look));
  for (const id of ANIMAL_IDS) if (m.companions[id]) createWalkAnims(scene, companionKey(id));
  for (const [name, p] of Object.entries(m.props)) {
    if (!p.frames || p.frames < 2 || scene.anims.exists(propAnimKey(name))) continue;
    scene.anims.create({
      key: propAnimKey(name),
      frames: scene.anims.generateFrameNumbers(propKey(name), { start: 0, end: p.frames - 1 }),
      frameRate: p.fps ?? 4,
      repeat: -1,
    });
  }
}
