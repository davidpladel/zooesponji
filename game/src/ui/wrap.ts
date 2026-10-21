import type * as Phaser from 'phaser';

/** Chino, japonés y signos de ancho completo: se puede cortar la línea entre dos caracteres cualesquiera. */
const CJK = /[　-ヿ㐀-䶿一-鿿＀-￯]/;
/** Signos que nunca empiezan una línea (van pegados al carácter de antes). */
const NO_START = /[、。，．！？）」』】〕〉》：；…ー,.!?:;)]/;

/** Trozos que no se pueden partir: una palabra latina con su espacio, o un carácter CJK con su puntuación. */
function pieces(paragraph: string): string[] {
  const out: string[] = [];
  for (const ch of paragraph) {
    const last = out.length - 1;
    const prev = out[last];
    if (prev !== undefined && NO_START.test(ch)) out[last] = prev + ch;
    else if (CJK.test(ch) || prev === undefined || CJK.test(prev.slice(-1)) || /\s$/.test(prev)) {
      // Un espacio se queda al final del trozo anterior.
      if (/\s/.test(ch) && prev !== undefined) out[last] = prev + ch;
      else out.push(ch);
    } else out[last] = prev + ch;
  }
  return out;
}

/**
 * Parte un texto en líneas de como mucho `width` píxeles. Corta por espacios y, en chino y japonés
 * (que no los usan), entre caracteres. Una palabra más ancha que la línea se queda entera.
 */
export function wrapLines(text: string, width: number, measure: (s: string) => number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const piece of pieces(paragraph)) {
      if (line !== '' && measure((line + piece).trimEnd()) > width) {
        lines.push(line.trimEnd());
        line = piece.trimStart();
      } else line += piece;
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

/** `wordWrap` de Phaser que también sabe cortar chino y japonés. */
export function wrapStyle(width: number): Phaser.Types.GameObjects.Text.TextWordWrap {
  return {
    width,
    callback: (text: string, object: Phaser.GameObjects.Text) => wrapLines(text, width, (s) => object.context.measureText(s).width),
  };
}
