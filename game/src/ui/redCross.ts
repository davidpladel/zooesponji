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

/** Radio del botón redondo respecto al ancho de la cruz que lleva dentro. */
export const CROSS_BUTTON_RADIUS = 0.65;

/**
 * Cruz roja con aspecto de botón: disco blanco con borde rojo, sombra y un aro que parpadea, con la cruz dentro.
 * Es redondo y la zona táctil es justo el disco (`Phaser.Geom.Circle`), para que no se pulse por accidente al lado.
 * `x`, `y` es el centro; `size`, el ancho de la cruz. Devuelve el botón y el aro (para que la escena lo haga latir).
 */
export function addRedCrossButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
): { button: Phaser.GameObjects.Container; ring: Phaser.GameObjects.Arc; radius: number } {
  const radius = Math.round(size * CROSS_BUTTON_RADIUS);
  const shadow = scene.add.circle(0, Math.max(3, radius * 0.1), radius, 0x000000, 0.28);
  const ring = scene.add.circle(0, 0, radius * 1.18, WHITE, 0.55);
  const disc = scene.add.circle(0, 0, radius, WHITE, 1).setStrokeStyle(Math.max(3, Math.round(radius * 0.14)), RED, 1);
  const outline = scene.add.circle(0, 0, radius + Math.max(2, Math.round(radius * 0.06)), OUTLINE, 0).setStrokeStyle(2, OUTLINE, 1);
  const cross = addRedCross(scene, 0, 0, size * 0.78);
  const button = scene.add.container(x, y, [shadow, ring, disc, outline, cross]).setSize(radius * 2, radius * 2);
  return { button, ring, radius };
}
