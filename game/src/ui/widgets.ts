import * as Phaser from 'phaser';
import type { Vec } from '../core/movement';
import { addIcon, type IconName } from './icons';
import { coinTexture, panelTexture, pillTexture, ribbonTexture, shadowOf, tileTexture } from './paint';
import { makePressable } from './press';
import { PILL, UI, textStyle, type PillColor } from './theme';

type Tap = (pointer: Phaser.Input.Pointer) => void;

/** Centro de la moneda del contador, en pantalla. Ahí vuelan las monedas al dar de comer. */
export const HUD_COIN: Vec = { x: 38, y: 38 };

/** Las texturas llevan la sombra por debajo: el origen se sube para que (x, y) sea el centro del cuerpo. */
function centered(image: Phaser.GameObjects.Image, bodyH: number): Phaser.GameObjects.Image {
  return image.setOrigin(0.5, Math.round(bodyH) / 2 / image.height);
}

export function pillImage(scene: Phaser.Scene, w: number, h: number, color: PillColor, radius?: number): Phaser.GameObjects.Image {
  return centered(scene.add.image(0, 0, pillTexture(scene, w, h, color, radius)), h);
}

export function tileImage(scene: Phaser.Scene, w: number, h: number): Phaser.GameObjects.Image {
  return centered(scene.add.image(0, 0, tileTexture(scene, w, h)), h);
}

export function coinImage(scene: Phaser.Scene, diameter: number): Phaser.GameObjects.Image {
  return centered(scene.add.image(0, 0, coinTexture(scene, diameter)), diameter);
}

export interface PillOptions {
  color: PillColor;
  icon?: IconName;
  label?: string;
  /** Precio: dibuja una moneda y este texto detrás de la etiqueta. */
  coin?: string;
  /** Radio de las esquinas; por defecto, píldora. */
  radius?: number;
  onTap?: Tap;
}

/** Botón píldora. El contenido (icono, texto, moneda y precio) se encoge hasta caber. */
export function addPillButton(scene: Phaser.Scene, x: number, y: number, w: number, h: number, o: PillOptions): Phaser.GameObjects.Container {
  const button = scene.add.container(x, y);
  button.add(pillImage(scene, w, h, o.color, o.radius));
  const cy = -Math.round(h * 0.045); // el canto de abajo sube el centro visual
  const stroke = PILL[o.color].stroke;
  const texts: Phaser.GameObjects.Text[] = [];
  const marks: Phaser.GameObjects.Image[] = [];
  const row: (Phaser.GameObjects.Text | Phaser.GameObjects.Image)[] = [];
  const text = (value: string): void => {
    const item = scene.add.text(0, cy, value, textStyle(10, '#ffffff', stroke)).setOrigin(0, 0.5);
    texts.push(item);
    row.push(item);
  };
  if (o.icon) {
    const icon = addIcon(scene, 0, cy, o.icon, 10).setOrigin(0, 0.5);
    marks.push(icon);
    row.push(icon);
  }
  if (o.label) text(o.label);
  if (o.coin !== undefined) {
    const coin = coinImage(scene, Math.round(h * 0.56)).setOrigin(0, 0.5).setY(cy);
    marks.push(coin);
    row.push(coin);
    text(o.coin);
  }
  const alone = row.length === 1 && marks.length === 1;
  let size = Math.round(h * (alone ? 0.58 : 0.46));
  const lay = (): number => {
    for (const item of texts) item.setStyle(textStyle(size, '#ffffff', stroke));
    for (const mark of marks) mark.setDisplaySize(alone ? size : size * 1.1, alone ? size : size * 1.1);
    const gap = size * 0.3;
    const total = row.reduce((sum, item) => sum + item.displayWidth, 0) + gap * (row.length - 1);
    let cursor = -total / 2;
    for (const item of row) {
      item.setX(cursor);
      cursor += item.displayWidth + gap;
    }
    return total;
  };
  while (lay() > w * 0.84 && size > 10) size -= 2;
  button.add(row);
  button.setSize(w, h);
  if (o.onTap) makePressable(button, o.onTap);
  return button;
}

/** Panel crema. Se traga los toques para que no lleguen al velo de detrás. */
export function addPanel(scene: Phaser.Scene, x: number, y: number, w: number, h: number): Phaser.GameObjects.Image {
  const panel = centered(scene.add.image(x, y, panelTexture(scene, w, h)), h);
  scene.add.zone(x, y, w, h).setInteractive();
  return panel;
}

/** Cartel de título, pensado para montarse sobre el borde de arriba del panel. */
export function addRibbonTitle(scene: Phaser.Scene, x: number, y: number, w: number, h: number, text: string): Phaser.GameObjects.Container {
  const ribbon = scene.add.container(x, y);
  ribbon.add(centered(scene.add.image(0, 0, ribbonTexture(scene, w, h)), h));
  const label = scene.add.text(0, 0, '', textStyle(10)).setOrigin(0.5);
  ribbon.add(label);
  ribbon.setSize(w, h).setData('label', label).setDepth(25);
  setRibbonText(ribbon, text);
  return ribbon;
}

/** Cambia el texto del cartel y encoge la letra hasta que quepa. */
export function setRibbonText(ribbon: Phaser.GameObjects.Container, text: string): void {
  const label = ribbon.getData('label') as Phaser.GameObjects.Text;
  let size = Math.round(ribbon.height * 0.52);
  label.setText(text).setStyle(textStyle(size));
  while (label.width > ribbon.width * 0.88 && size > 12) {
    size -= 2;
    label.setStyle(textStyle(size));
  }
}

/** Chapa roja de cerrar. Se ve de `size` px, pero responde en al menos 64 px. */
export function addCloseBadge(scene: Phaser.Scene, x: number, y: number, onClose: () => void, size = 52): Phaser.GameObjects.Container {
  const badge = scene.add.container(x, y);
  badge.add(pillImage(scene, size, size, 'red'));
  badge.add(addIcon(scene, 0, -Math.round(size * 0.045), 'close', size * 0.56));
  const hit = Math.max(64, size);
  badge.setSize(hit, hit).setDepth(30);
  makePressable(badge, onClose);
  return badge;
}

/** Ficha blanca; pulsable si se le pasa `onTap`. */
export function addTile(scene: Phaser.Scene, x: number, y: number, w: number, h: number, onTap?: Tap): Phaser.GameObjects.Container {
  const tile = scene.add.container(x, y);
  tile.add(tileImage(scene, w, h));
  tile.setSize(w, h);
  if (onTap) makePressable(tile, onTap);
  return tile;
}

export interface CoinCounter {
  container: Phaser.GameObjects.Container;
  set(coins: number, pop?: boolean): void;
  label(): string;
}

/** Moneda y número. (x, y) es el centro de la moneda. */
export function addCoinCounter(scene: Phaser.Scene, x: number, y: number, size = 44): CoinCounter {
  const container = scene.add.container(x, y);
  const text = scene.add.text(size * 0.72, 0, '0', textStyle(Math.round(size * 0.8), '#ffffff', '#5a3210')).setOrigin(0, 0.5);
  container.add([coinImage(scene, size), text]);
  return {
    container,
    set(coins, pop = false) {
      text.setText(String(coins));
      if (!pop) return;
      scene.tweens.killTweensOf(container);
      container.setScale(1);
      scene.tweens.add({ targets: container, scale: 1.3, duration: 120, yoyo: true });
    },
    label: () => text.text,
  };
}

/** Velo verde oscuro translúcido que tapa el juego y bloquea los toques. */
export function addVeil(scene: Phaser.Scene, onTap?: () => void): Phaser.GameObjects.Rectangle {
  const veil = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, UI.veil, 0.4).setOrigin(0).setInteractive();
  if (onTap) veil.on('pointerup', onTap);
  return veil;
}

/** Texto centrado en x con un corazón amarillo detrás. */
export function addHeartLine(scene: Phaser.Scene, x: number, y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text {
  const size = parseInt(String(style.fontSize), 10);
  const label = scene.add.text(x - size * 0.6, y, text, style).setOrigin(0.5);
  addIcon(scene, label.x + label.width / 2 + size * 0.7, y, 'heart', size * 1.1, 0xffd23c);
  return label;
}

/** Superposiciones (tienda, comida, menú): al cambiar el tamaño de la pantalla se vuelven a montar. */
export function restartOnResize(scene: Phaser.Scene, data?: () => object): void {
  const restart = () => scene.scene.restart(data?.());
  scene.scale.once(Phaser.Scale.Events.RESIZE, restart);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, restart));
}

export { shadowOf };
