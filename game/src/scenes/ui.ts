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

/** Superposiciones (tienda, comida, menú): al cambiar el tamaño de la pantalla se vuelven a montar. */
export function restartOnResize(scene: Phaser.Scene, data?: () => object): void {
  const restart = () => scene.scene.restart(data?.());
  scene.scale.once(Phaser.Scale.Events.RESIZE, restart);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, restart));
}
