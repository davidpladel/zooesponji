/**
 * Dibujos en píxeles para guiar al niño hasta la tienda (2026-11-07): la tiendita, el bocadillo del borde de la
 * pantalla y la huella de Luna. Sacados píxel a píxel de la maqueta que aprobó David. Cada fila es una cadena;
 * cada letra, un color de `GUIDE_PALETTE`; el punto es transparente.
 */

export const GUIDE_PALETTE: Readonly<Record<string, string>> = {
  b: '#5b3a2e', // contorno del bocadillo
  c: '#fff8e6', // crema
  j: '#e8d6b4', // sombra de abajo del bocadillo
  f: '#414040', // contorno de la tiendita
  g: '#e5b24a', // toldo
  h: '#f5efe6', // rayas claras
  i: '#5b6770', // rayas oscuras
  k: '#bf8753', // pared
  l: '#d9534f', // fruta roja
  m: '#7cb342', // fruta verde
  n: '#ffd54a', // fruta amarilla
  o: '#3c3c3c', // puerta
  p: '#fff6dc', // huella
};

/** La tiendita: toldo amarillo, rayas, mostrador con fruta y puerta (14x11). */
export const SHOP_ICON: readonly string[] = [
  '...ffffffff...',
  '..fggggggggf..',
  '.fggggggggggf.',
  'ffffffffffffff',
  'fhihihihihihif',
  'ffffffffffffff',
  '.fkkkkkkkkkkf.',
  '.fklmnkkkookf.',
  '.fkmlmkkkookf.',
  '.fkffffkkookf.',
  '.ffffffffffff.',
];

/** La cruz roja del botón de la clínica, con borde claro y contorno (11x11, del alto de la tiendita). */
export const CLINIC_ICON: readonly string[] = [
  '..fffffff..',
  '..fhhhhhf..',
  'fffhlllhfff',
  'fhhhlllhhhf',
  'fhlllllllhf',
  'fhlllllllhf',
  'fhlllllllhf',
  'fhhhlllhhhf',
  'fffhlllhfff',
  '..fhhhhhf..',
  '..fffffff..',
];

/** Huella de perro: cuatro dedos en arco y almohadilla (9x9), apuntando hacia arriba. */
export const PAW: readonly string[] = [
  '..pp.pp..',
  '..pp.pp..',
  'pp.....pp',
  'pp.....pp',
  '...ppp...',
  '.ppppppp.',
  'ppppppppp',
  'ppppppppp',
  '.ppp.ppp.',
];

export type BubbleSide = 'up' | 'down' | 'left' | 'right';

/** Lado del bocadillo (32x32). */
export const BUBBLE_SIZE = 32;
/** Centro del círculo del bocadillo, en sus píxeles: ahí va el dibujo de dentro. */
export const BUBBLE_CENTER = 16;
const RADIUS = 11.5;

/**
 * Bocadillo crema con contorno marrón y sombra abajo; con `tail`, una colita hacia ese lado (la punta toca el
 * borde del dibujo). Sin colita es el botón de la tienda. No se gira la imagen (el pixel art girado se ve mal):
 * se dibuja cada lado.
 */
export function bubbleRows(tail: BubbleSide | null): string[] {
  const n = BUBBLE_SIZE;
  const inside = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= n || y >= n) return false;
    if (Math.hypot(x + 0.5 - BUBBLE_CENTER, y + 0.5 - BUBBLE_CENTER) <= RADIUS) return true;
    if (!tail) return false;
    // Colita hacia arriba (filas 0-5, cada vez más ancha) y se lleva a su lado.
    const [ux, uy] = tail === 'up' ? [x, y] : tail === 'down' ? [x, n - 1 - y] : tail === 'left' ? [y, x] : [y, n - 1 - x];
    if (uy > 6) return false;
    const half = Math.floor(uy / 2);
    return ux >= BUBBLE_CENTER - 1 - half && ux <= BUBBLE_CENTER + half;
  };
  const rows: string[] = [];
  for (let y = 0; y < n; y++) {
    let row = '';
    for (let x = 0; x < n; x++) {
      if (!inside(x, y)) row += '.';
      else if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) row += 'b';
      else if (y >= BUBBLE_CENTER && Math.hypot(x + 0.5 - BUBBLE_CENTER, y + 0.5 - BUBBLE_CENTER) >= RADIUS - 2.2) row += 'j';
      else row += 'c';
    }
    rows.push(row);
  }
  return rows;
}

/** Píxeles de un dibujo con color (para pruebas y para pintarlo). */
export function pixelsOf(rows: readonly string[]): { x: number; y: number; color: string }[] {
  const out: { x: number; y: number; color: string }[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!;
      if (ch === '.') continue;
      const color = GUIDE_PALETTE[ch];
      if (!color) throw new Error(`Color desconocido "${ch}"`);
      out.push({ x, y, color });
    }
  });
  return out;
}

/**
 * Lado de la pantalla por el que se sale un punto y dónde va el bocadillo (su centro), a `margin` px del borde.
 * Null si el punto se ve (con ese margen). `rect`: zona de la pantalla.
 */
export function edgeHint(
  target: { x: number; y: number },
  width: number,
  height: number,
  margin: number,
): { side: BubbleSide; x: number; y: number } | null {
  const x = Math.min(Math.max(target.x, margin), width - margin);
  const y = Math.min(Math.max(target.y, margin), height - margin);
  if (x === target.x && y === target.y) return null;
  const dx = target.x - x;
  const dy = target.y - y;
  const side: BubbleSide = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  return { side, x, y };
}
