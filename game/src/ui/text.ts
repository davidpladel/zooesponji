import * as Phaser from 'phaser';

/**
 * Texto de la interfaz nueva. El juego usa pixelArt, y Phaser vuelve a subir la textura del texto a la
 * GPU con filtro «vecino» cada vez que se actualiza (setText, setStyle...), así que el filtro lineal hay
 * que reponerlo después de cada pintado: así no tiembla mientras un botón late o se encoge.
 * El redondeo de vértices se deja como viene (safeAuto): quieto se ajusta a píxeles enteros y se ve
 * nítido; mientras se escala, Phaser ya no lo redondea.
 */
export class UiText extends Phaser.GameObjects.Text {
  constructor(scene: Phaser.Scene, x: number, y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle) {
    super(scene, x, y, text, style);
  }

  override updateText(): this {
    super.updateText();
    // La textura del texto es propia de este objeto: se puede tocar su filtro sin afectar a nadie.
    this.frame.source.setFilter(Phaser.Textures.FilterMode.LINEAR);
    return this;
  }
}

/** Crea un texto de la interfaz (suave al escalar) y lo añade a la escena. */
export function addUiText(scene: Phaser.Scene, x: number, y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle): UiText {
  return scene.add.existing(new UiText(scene, x, y, text, style));
}
