import * as Phaser from 'phaser';

export function textStyle(
  size: number,
  color = '#ffffff',
  stroke = '#1b5e20',
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: 'sans-serif',
    fontSize: `${size}px`,
    color,
    stroke,
    strokeThickness: Math.max(3, Math.round(size / 8)),
  };
}

/** Botón rojo "✖" arriba a la derecha (≥ 64 px). */
export function addCloseButton(scene: Phaser.Scene, onClose: () => void): Phaser.GameObjects.Text {
  const button = scene.add
    .text(scene.scale.width - 20, 20, '✖', {
      fontFamily: 'sans-serif',
      fontSize: '40px',
      color: '#ffffff',
      backgroundColor: '#c62828',
      padding: { x: 18, y: 10 },
    })
    .setOrigin(1, 0)
    .setDepth(30)
    .setInteractive({ useHandCursor: true });
  button.on('pointerup', onClose);
  return button;
}

const WOOD = { edge: 0x4e2f14, board: 0xb9834a, grain: 0xa16d38, light: 0xd9a868, nail: 0xf0d9a8 };

/** Tablero de madera con vetas, cerco y clavos en las esquinas. Se traga los toques. */
export function addWoodPanel(scene: Phaser.Scene, x: number, y: number, width: number, height: number): Phaser.GameObjects.Graphics {
  const edge = Math.max(4, Math.round(Math.min(width, height) * 0.02));
  const left = x - width / 2;
  const top = y - height / 2;
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.35).fillRect(left + edge, top + edge * 2, width, height);
  g.fillStyle(WOOD.edge).fillRect(left, top, width, height);
  g.fillStyle(WOOD.board).fillRect(left + edge, top + edge, width - edge * 2, height - edge * 2);
  g.fillStyle(WOOD.light).fillRect(left + edge, top + edge, width - edge * 2, edge);
  // Vetas: una raya entre tabla y tabla.
  const boards = Math.max(2, Math.round(height / 70));
  g.fillStyle(WOOD.grain);
  for (let i = 1; i < boards; i++) g.fillRect(left + edge, top + Math.round((height * i) / boards), width - edge * 2, Math.max(2, edge / 2));
  if (Math.min(width, height) > edge * 14) {
    g.lineStyle(Math.max(2, edge / 2), WOOD.edge, 0.55).strokeRect(left + edge * 3, top + edge * 3, width - edge * 6, height - edge * 6);
    g.fillStyle(WOOD.nail);
    for (const cx of [left + edge * 3, left + width - edge * 3]) {
      for (const cy of [top + edge * 3, top + height - edge * 3]) g.fillRect(cx - edge, cy - edge, edge * 2, edge * 2);
    }
  }
  scene.add.zone(x, y, width, height).setInteractive();
  return g;
}

/** Botón de piedra clara con letras oscuras, como los de un cartel. */
export function addPlateButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  onTap: () => void,
): Phaser.GameObjects.Container {
  const lip = Math.max(3, Math.round(height * 0.1));
  const button = scene.add.container(x, y);
  button.add(scene.add.rectangle(0, 0, width, height, WOOD.edge));
  button.add(scene.add.rectangle(0, -lip / 2, width - lip * 2, height - lip * 3, 0xf3e9d2));
  button.add(
    scene.add
      .text(0, -lip / 2, label, { fontFamily: 'sans-serif', fontStyle: 'bold', fontSize: `${Math.round(height * 0.42)}px`, color: '#3e2723' })
      .setOrigin(0.5),
  );
  button.setSize(width, height).setInteractive({ useHandCursor: true });
  button.on('pointerup', onTap);
  return button;
}

/** Superposiciones (tienda, comida, menú): al cambiar el tamaño de la pantalla se vuelven a montar. */
export function restartOnResize(scene: Phaser.Scene, data?: () => object): void {
  const restart = () => scene.scene.restart(data?.());
  scene.scale.once(Phaser.Scale.Events.RESIZE, restart);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, restart));
}
