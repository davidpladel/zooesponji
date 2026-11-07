import type * as Phaser from 'phaser';
import { PAW, SHOP_ICON, bubbleRows, pixelsOf, type BubbleSide } from '../core/guideArt';

/** Textura hecha con un dibujo en filas (un píxel por letra). Se crea una sola vez por clave. */
export function pixelTexture(scene: Phaser.Scene, key: string, rows: readonly string[]): string {
  if (scene.textures.exists(key)) return key;
  const width = Math.max(...rows.map((r) => r.length));
  const canvas = scene.textures.createCanvas(key, width, rows.length);
  if (!canvas) throw new Error(`No se pudo crear la textura ${key}`);
  const ctx = canvas.getContext();
  for (const p of pixelsOf(rows)) {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 1, 1);
  }
  canvas.refresh();
  return key;
}

export const shopIconTexture = (scene: Phaser.Scene): string => pixelTexture(scene, 'guide-shop-icon', SHOP_ICON);
export const pawTexture = (scene: Phaser.Scene): string => pixelTexture(scene, 'guide-paw', PAW);
export const bubbleTexture = (scene: Phaser.Scene, tail: BubbleSide | null): string =>
  pixelTexture(scene, `guide-bubble-${tail ?? 'none'}`, bubbleRows(tail));

/**
 * Bocadillo crema con un dibujo dentro (la tiendita, si no se dice otro), a escala entera `scale`. (x, y) es el
 * centro del círculo; la colita, si la hay, sale hacia `tail`.
 */
export function addShopBubble(scene: Phaser.Scene, scale: number, tail: BubbleSide | null, content?: string): Phaser.GameObjects.Container {
  const bubble = scene.add.image(0, 0, bubbleTexture(scene, tail)).setScale(scale);
  const icon = scene.add.image(0, 0, content ?? shopIconTexture(scene)).setScale(scale);
  return scene.add.container(0, 0, [bubble, icon]);
}

/** Cambia el lado de la colita de un bocadillo hecho con `addShopBubble`. */
export function setBubbleTail(container: Phaser.GameObjects.Container, tail: BubbleSide | null): void {
  const bubble = container.list[0] as Phaser.GameObjects.Image;
  bubble.setTexture(bubbleTexture(container.scene, tail));
}
