import * as Phaser from 'phaser';
import { depthForY } from '../core/depth';
import type { GameState } from '../core/economy';
import type { ClinicInfo } from '../core/tiledmap';
import { CLINIC_COST } from '../data/shop';
import { t } from '../data/strings';
import { addPillButton } from '../ui/widgets';

const OUTLINE = 0x4e342e;
const WALL = 0xf5efe6;
const WALL_SHADE = 0xe0d6c8;
const ROOF = 0xd84343;
const ROOF_DARK = 0xa83232;
const DOOR = 0x6d8fb3;
const GLASS = 0xbbdefb;
const CROSS = 0xe53935;

/**
 * La clínica en el mapa, junto a la plaza. No hay dibujo en los packs: se pinta a píxeles con el estilo del
 * resto (contorno oscuro, colores planos). Paredes claras, tejado rojo, cruz roja encima de la puerta.
 * Mientras no se compra, lleva el candado con su precio, como los recintos.
 */
export class ClinicBuilding {
  private readonly lock: Phaser.GameObjects.Container;

  constructor(
    scene: Phaser.Scene,
    readonly info: ClinicInfo,
    state: GameState,
    zoom = 1,
  ) {
    const { x, y, width: w, height: h } = info;
    const g = scene.add.graphics().setDepth(depthForY(y + h));
    const roofH = Math.round(h * 0.4);
    // Sombra en el suelo.
    g.fillStyle(0x000000, 0.18).fillRect(x + 3, y + h - 2, w - 2, 4);
    // Paredes, con el lado derecho un poco más oscuro.
    g.fillStyle(OUTLINE).fillRect(x + 2, y + roofH - 2, w - 4, h - roofH + 2);
    g.fillStyle(WALL).fillRect(x + 3, y + roofH - 1, w - 6, h - roofH);
    g.fillStyle(WALL_SHADE).fillRect(x + w - 10, y + roofH - 1, 7, h - roofH);
    // Tejado a dos colores, que vuela un poco por los lados.
    g.fillStyle(OUTLINE).fillRect(x, y + 2, w, roofH);
    g.fillStyle(ROOF).fillRect(x + 1, y + 3, w - 2, roofH - 2);
    for (let ry = y + 6; ry < y + roofH - 1; ry += 4) g.fillStyle(ROOF_DARK).fillRect(x + 1, ry, w - 2, 1);
    g.fillStyle(OUTLINE).fillRect(x + 4, y, w - 8, 3);
    // Puerta (sobre las casillas de la puerta del mapa) y una ventana a cada lado.
    const doorX = info.door.x * 16 + 16 - 9;
    g.fillStyle(OUTLINE).fillRect(doorX - 1, y + h - 21, 20, 21);
    g.fillStyle(DOOR).fillRect(doorX, y + h - 20, 18, 20);
    g.fillStyle(OUTLINE).fillRect(doorX + 8, y + h - 20, 2, 20);
    g.fillStyle(0xffd54f).fillRect(doorX + 5, y + h - 10, 2, 2).fillRect(doorX + 11, y + h - 10, 2, 2);
    for (const wx of [x + 7, x + w - 19]) {
      g.fillStyle(OUTLINE).fillRect(wx - 1, y + roofH + 4, 14, 12);
      g.fillStyle(GLASS).fillRect(wx, y + roofH + 5, 12, 10);
      g.fillStyle(OUTLINE).fillRect(wx + 5, y + roofH + 5, 2, 10);
    }
    // La cruz roja en una placa blanca del tejado, encima de la puerta: se reconoce de lejos.
    const cx = doorX + 9;
    const cy = y + Math.round(roofH / 2) + 1;
    g.fillStyle(OUTLINE).fillRect(cx - 8, cy - 8, 16, 16);
    g.fillStyle(0xffffff).fillRect(cx - 7, cy - 7, 14, 14);
    g.fillStyle(CROSS).fillRect(cx - 2, cy - 5, 4, 10).fillRect(cx - 5, cy - 2, 10, 4);
    scene.add
      .text(x + w / 2, y - 6, t('shop.clinic.name'), { fontFamily: 'sans-serif', fontSize: '9px', color: '#ffffff', stroke: '#000000', strokeThickness: 2 })
      .setOrigin(0.5)
      .setResolution(4)
      .setDepth(10000);
    // Candado con precio delante de la puerta, a tamaño de pantalla (como el de los recintos).
    this.lock = addPillButton(scene, x + w / 2, y + h + 6, 44 * zoom, 15 * zoom, { color: 'gray', icon: 'lock', coin: String(CLINIC_COST) })
      .setScale(1 / zoom)
      .setDepth(10000)
      .setVisible(!state.clinic);
  }

  /** Recién comprada: el candado se va. */
  sync(state: GameState): void {
    if (!state.clinic || !this.lock.visible) return;
    this.lock.scene.tweens.add({ targets: this.lock, scale: this.lock.scale * 1.8, alpha: 0, duration: 400, onComplete: () => this.lock.setVisible(false) });
  }
}
