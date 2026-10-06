import * as Phaser from 'phaser';
import { pressStep, type PressEvent, type PressState } from '../core/press';

const PRESS_SCALE = 0.92;
const PRESS_TINT = 0xd9d9d9;

type Pressable = Phaser.GameObjects.Container | Phaser.GameObjects.Image;

/**
 * Hace pulsable una pieza: encoge y se oscurece mientras se aprieta, rebota al soltar y solo
 * ejecuta `onTap` si el dedo se suelta encima. Un contenedor debe tener tamaño (`setSize`).
 */
export function makePressable(target: Pressable, onTap: (pointer: Phaser.Input.Pointer) => void): void {
  const scene = target.scene;
  if (!target.input) target.setInteractive({ useHandCursor: true });
  let state: PressState = 'idle';
  let base = 1;
  let tween: Phaser.Tweens.Tween | null = null;

  const shade = (on: boolean): void => {
    const parts: Phaser.GameObjects.GameObject[] = target instanceof Phaser.GameObjects.Container ? target.list : [target];
    for (const part of parts) {
      const tintable = part as Partial<Pick<Phaser.GameObjects.Image, 'setTint' | 'clearTint'>>;
      if (on) tintable.setTint?.(PRESS_TINT);
      else tintable.clearTint?.();
    }
  };

  const step = (event: PressEvent, pointer?: Phaser.Input.Pointer): void => {
    const next = pressStep(state, event);
    if (next.state !== state) {
      // La escala de reposo solo se toma con la pieza quieta: si nuestro propio tween sigue en vuelo
      // (soltar y volver a pulsar enseguida), la escala actual es intermedia y se conserva la anterior.
      const inFlight = tween?.isPlaying() === true;
      tween?.stop();
      if (next.state === 'down') {
        if (!inFlight) base = target.scale;
        shade(true);
        tween = scene.tweens.add({ targets: target, scale: base * PRESS_SCALE, duration: 60 });
      } else {
        shade(false);
        tween = scene.tweens.add({ targets: target, scale: base, duration: 140, ease: 'Back.easeOut' });
      }
    }
    state = next.state;
    if (next.fire && pointer) {
      onTap(pointer);
      // La acción puede haber destruido la pieza (pasar de página, cerrar la ventana).
      if (!target.active) tween?.stop();
    }
  };

  target.on('pointerdown', (pointer: Phaser.Input.Pointer) => step('down', pointer));
  target.on('pointerup', (pointer: Phaser.Input.Pointer) => step('up', pointer));
  target.on('pointerout', () => step('out'));
}
