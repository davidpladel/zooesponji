import * as Phaser from 'phaser';

/**
 * Texto de la interfaz nueva. El juego usa pixelArt + roundPixels, y Phaser vuelve a subir la textura
 * del texto a la GPU con filtro «vecino» cada vez que se actualiza (setText, setStyle...), así que el
 * filtro lineal hay que reponerlo después de cada pintado. Además se desactiva el redondeo de vértices
 * de esta pieza: dentro de un contenedor que late o se encoge, redondear a píxeles enteros hace que las
 * letras salten. Con el texto quieto en escala 1 no cambia nada (queda sobre píxeles enteros igual).
 */
export class UiText extends Phaser.GameObjects.Text {
  constructor(scene: Phaser.Scene, x: number, y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle) {
    super(scene, x, y, text, style);
    this.vertexRoundMode = 'off';
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
