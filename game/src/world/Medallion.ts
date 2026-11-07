import type * as Phaser from 'phaser';
import { animalKey, idleFrame, lookOr } from '../art/art';
import { MEDALLION, MEDALLION_COLORS, medallionAnimal, type Pixels } from '../core/medallion';
import type { AnimalId } from '../data/animals';

/** Píxeles de un fotograma cargado (para dibujarlo reducido en el medallón). Null si no se puede leer. */
function framePixels(scene: Phaser.Scene, key: string, frame: number): Pixels | null {
  if (!scene.textures.exists(key)) return null;
  const f = scene.textures.getFrame(key, frame);
  const image = f?.source.image as CanvasImageSource | undefined;
  if (!f || !image) return null;
  const canvas = document.createElement('canvas');
  canvas.width = f.cutWidth;
  canvas.height = f.cutHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, f.cutWidth, f.cutHeight);
  const data = ctx.getImageData(0, 0, f.cutWidth, f.cutHeight);
  return { width: data.width, height: data.height, data: data.data };
}

/** Alto total del cartel (medallón y poste), en px. */
export const MEDALLION_HEIGHT = MEDALLION.size + MEDALLION.post - 2;

/**
 * Textura del cartel de un recinto: medallón (borde gris, aro de madera, fondo crema) con el animal de frente, sobre
 * un poste. Se apoya con el origen abajo en el centro.
 */
export function medallionTexture(scene: Phaser.Scene, species: AnimalId): string {
  const key = `sign-medallion-${species}`;
  if (scene.textures.exists(key)) return key;
  const size = MEDALLION.size;
  const canvas = scene.textures.createCanvas(key, size, MEDALLION_HEIGHT);
  if (!canvas) throw new Error(`No se pudo crear ${key}`);
  const ctx = canvas.getContext();
  const px = (x: number, y: number, color: string): void => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  };
  // Poste, con su contorno.
  const postLeft = (size - MEDALLION.postWidth) / 2;
  for (let y = size - 4; y < MEDALLION_HEIGHT; y++)
    for (let x = postLeft - 1; x <= postLeft + MEDALLION.postWidth; x++) {
      const edge = x === postLeft - 1 || x === postLeft + MEDALLION.postWidth || y === MEDALLION_HEIGHT - 1;
      px(x, y, edge ? MEDALLION_COLORS.outline : MEDALLION_COLORS.post);
    }
  // Medallón.
  const c = size / 2;
  const innerR = MEDALLION.inner / 2;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      if (d > c) continue;
      px(x, y, d > c - 1 ? MEDALLION_COLORS.outline : d > innerR ? MEDALLION_COLORS.wood : MEDALLION_COLORS.cream);
    }
  // El animal, centrado y sin salirse del círculo de dentro.
  const src = framePixels(scene, animalKey(lookOr(species, species)), idleFrame('down'));
  if (src) {
    const animal = medallionAnimal(src, MEDALLION.inner);
    const x0 = Math.floor(c - animal.width / 2);
    const y0 = Math.floor(c - animal.height / 2);
    for (let y = 0; y < animal.height; y++)
      for (let x = 0; x < animal.width; x++) {
        const i = (y * animal.width + x) * 4;
        if (animal.data[i + 3]! === 0) continue;
        if (Math.hypot(x0 + x + 0.5 - c, y0 + y + 0.5 - c) > innerR) continue;
        px(x0 + x, y0 + y, `rgb(${animal.data[i]},${animal.data[i + 1]},${animal.data[i + 2]})`);
      }
  }
  canvas.refresh();
  return key;
}
