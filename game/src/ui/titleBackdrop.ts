import * as Phaser from 'phaser';
import { t } from '../data/strings';
import { UI, textStyle } from './theme';
import { addUiText } from './text';

export const TITLE_BG = 'title-bg';
/** Punto de la imagen (0 arriba, 1 abajo) que se conserva al recortar en pantallas alargadas. */
const FOCUS_Y = 0.42;

export interface TitleLayout {
  nameY: number;
  nameSize: number;
  buttonY: number;
  buttonW: number;
  buttonH: number;
}

/** Mismas medidas en la carga y en el título, para que el paso de una a otra no se note. */
export function titleLayout(width: number, height: number): TitleLayout {
  const buttonH = Phaser.Math.Clamp(height * 0.22, 56, 130);
  return {
    nameY: height * 0.24,
    nameSize: Math.round(Phaser.Math.Clamp(Math.min(height * 0.24, width * 0.11), 36, 130)),
    buttonY: height * 0.62,
    buttonW: Math.min(width * 0.6, buttonH * 3.2),
    buttonH,
  };
}

/** Fondo pintado a pantalla completa y el nombre del juego con doble contorno. */
export function addTitleBackdrop(scene: Phaser.Scene): TitleLayout {
  const { width, height } = scene.scale;
  const layout = titleLayout(width, height);
  scene.cameras.main.setBackgroundColor(UI.sky);
  if (scene.textures.exists(TITLE_BG)) {
    const bg = scene.add.image(width / 2, 0, TITLE_BG).setOrigin(0.5, 0);
    bg.setScale(Math.max(width / bg.width, height / bg.height));
    bg.setY(-(bg.displayHeight - height) * FOCUS_Y);
  }
  const name = t('title.name');
  const outer = textStyle(layout.nameSize, UI.logo, '#ffffff');
  addUiText(scene, width / 2, layout.nameY, name, { ...outer, strokeThickness: Math.round(layout.nameSize * 0.3) }).setOrigin(0.5);
  addUiText(scene, width / 2, layout.nameY, name, { ...textStyle(layout.nameSize, UI.logo, '#8a3b12'), strokeThickness: Math.round(layout.nameSize * 0.13) }).setOrigin(0.5);
  return layout;
}
