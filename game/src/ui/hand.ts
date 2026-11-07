import type * as Phaser from 'phaser';
import { withVersion } from '../core/cacheBust';
import { addEmoji } from './text';

/**
 * Mano que señala del tutorial: «Pixel Hand Gesture Cursor Asset» de Lintnaya (CC0), la quinta de la primera
 * fila (16x16, dedo hacia arriba). Se dibuja a escala entera para que no se emborrone.
 */
export const HAND_KEY = 'ui-hand';
/** Punta del dedo dentro del dibujo (px): ahí está el (x, y) de la mano. */
const TIP = { x: 5.5, y: 2 };
const SIZE = 16;
/** Escala de la mano en las pantallas de interfaz: 64 px, como el emoji de antes. */
export const HAND_SCALE = 4;

export function queueHand(scene: Phaser.Scene): void {
  scene.load.image(HAND_KEY, withVersion('assets/ui/hand.png'));
}

/** La mano con la punta del dedo en (x, y). Si el dibujo no cargó, el emoji de siempre. */
export function addHand(scene: Phaser.Scene, scale = HAND_SCALE): Phaser.GameObjects.Image | Phaser.GameObjects.Text {
  if (scene.textures.exists(HAND_KEY)) {
    return scene.add.image(0, 0, HAND_KEY).setOrigin(TIP.x / SIZE, TIP.y / SIZE).setScale(scale);
  }
  const emoji = addEmoji(scene, 0, 0, '👆', 52).setOrigin(0.35, 0.05);
  emoji.setShadow(2, 3, '#00000066', 4, false, true);
  return emoji;
}
