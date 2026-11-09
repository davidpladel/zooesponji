/**
 * La toalla del último paso de la limpieza (secar), a píxeles: no hay emoji de toalla. Toalla doblada azul
 * con rayas blancas, contorno oscuro como el arte del pack y flecos abajo. Una letra por píxel; «.» es
 * transparente. Sin Phaser, para poder probarla.
 */
export const TOWEL_ROWS: readonly string[] = [
  '................',
  '................',
  '..OOOOOOOOOOOO..',
  '.OLLLLLLLLLLLLLO',
  '.OBBBBBBBBBBBBBO',
  '.ODDDDDDDDDDDDDO',
  '.OBBBBBBBBBBBBBO',
  '.OWWWWWWWWWWWWWO',
  '.OBBBBBBBBBBBBBO',
  '.OWWWWWWWWWWWWWO',
  '.OBBBBBBBBBBBBBO',
  '.OBBBBBBBBBBBBBO',
  '.ODDDDDDDDDDDDDO',
  '..OOOOOOOOOOOOO.',
  '..W.W.W.W.W.W.W.',
  '................',
];

export const TOWEL_COLORS: Readonly<Record<string, number>> = {
  O: 0x414040,
  L: 0xb3e5fc,
  B: 0x4fc3f7,
  D: 0x0288d1,
  W: 0xffffff,
};
