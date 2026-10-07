import * as Phaser from 'phaser';
import { withVersion } from '../core/cacheBust';
import { smooth } from './paint';

export const ICONS = ['play', 'close', 'music', 'volume', 'joystick', 'gear', 'lock', 'shield', 'door', 'left', 'right', 'heart', 'chart'] as const;
export type IconName = (typeof ICONS)[number];

const iconKey = (name: IconName): string => `ui-icon-${name}`;

/** Encola los iconos en el cargador de la escena (se rasterizan a 128 px). */
export function queueIcons(scene: Phaser.Scene): void {
  for (const name of ICONS) scene.load.svg(iconKey(name), withVersion(`assets/ui/icons/${name}.svg`), { width: 128, height: 128 });
}

/** Tras cargar: filtro lineal para que no se vean dentados. */
export function smoothIcons(scene: Phaser.Scene): void {
  for (const name of ICONS) if (scene.textures.exists(iconKey(name))) smooth(scene, iconKey(name));
}

/** Icono blanco teñido de `tint`, de `size` px de lado. */
export function addIcon(scene: Phaser.Scene, x: number, y: number, name: IconName, size: number, tint = 0xffffff): Phaser.GameObjects.Image {
  return scene.add.image(x, y, iconKey(name)).setDisplaySize(size, size).setTint(tint);
}
