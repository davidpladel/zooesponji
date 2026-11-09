import * as Phaser from 'phaser';
import { TOWEL_COLORS, TOWEL_ROWS } from './towelArt';

const KEY = 'ui-towel';

/** La toalla a píxeles como imagen de `size` px de ancho. La textura se crea una vez. */
export function addTowel(scene: Phaser.Scene, x: number, y: number, size: number): Phaser.GameObjects.Image {
  if (!scene.textures.exists(KEY)) {
    const g = scene.make.graphics({}, false);
    TOWEL_ROWS.forEach((row, ty) => {
      [...row].forEach((c, tx) => {
        const color = TOWEL_COLORS[c];
        if (color === undefined) return;
        g.fillStyle(color, 1).fillRect(tx, ty, 1, 1);
      });
    });
    g.generateTexture(KEY, TOWEL_ROWS[0]!.length, TOWEL_ROWS.length);
    g.destroy();
  }
  const image = scene.add.image(x, y, KEY);
  return image.setScale(size / image.width);
}
