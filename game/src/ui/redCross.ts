import Phaser from 'phaser';

const RED = 0xe53935;
const WHITE = 0xffffff;
const OUTLINE = 0x4e342e;

/**
 * Cruz roja de la clínica, con borde blanco y contorno oscuro para que se vea sobre cualquier fondo. Se
 * dibuja con `Graphics` (no hace falta arte). `x`, `y` es el centro; `size`, el ancho total de la cruz.
 */
export function addRedCross(scene: Phaser.Scene, x: number, y: number, size: number): Phaser.GameObjects.Container {
  const g = scene.add.graphics();
  const arm = size / 3;
  const half = size / 2;
  const plus = (inset: number, color: number): void => {
    g.fillStyle(color, 1);
    g.fillRect(-arm / 2 + inset, -half + inset, arm - 2 * inset, size - 2 * inset);
    g.fillRect(-half + inset, -arm / 2 + inset, size - 2 * inset, arm - 2 * inset);
  };
  const border = Math.max(2, Math.round(size / 10));
  plus(-border, OUTLINE);
  plus(0, WHITE);
  plus(border, RED);
  const box = size + 2 * border;
  return scene.add.container(x, y, [g]).setSize(box, box);
}
