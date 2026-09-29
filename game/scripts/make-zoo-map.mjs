// Genera public/assets/maps/zoo.tmj: el zoo de verdad (48x35), lógico (césped/camino/valla/puerta/edificio).
// El arte real lo pone el autotiler en el juego; este mapa también sirve en modo provisional.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 48;
const H = 35;
const T = 16;
const GRASS = 1;
const PATH = 2;
const FENCE = 3;
const GATE = 4;
const BUILDING = 5;

const data = new Array(W * H).fill(GRASS);
const set = (x, y, gid) => {
  data[y * W + x] = gid;
};
const fill = (x0, y0, x1, y1, gid) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, gid);
};

// Caminos de 2 de ancho: anillo exterior y cruz central.
fill(2, 2, 45, 3, PATH);
fill(2, 30, 45, 31, PATH);
fill(2, 2, 3, 31, PATH);
fill(44, 2, 45, 31, PATH);
fill(2, 16, 45, 17, PATH);
fill(23, 2, 24, 31, PATH);
// Entrada del parque: el camino central sale por el portón de abajo.
fill(23, 32, 24, 34, PATH);
// Plaza en el cruce (8x8) con la fuente en medio sobre una isla de césped de 4x4, como el parque de la v1.
fill(20, 13, 27, 20, PATH);
fill(22, 15, 25, 18, GRASS);

const objects = [];
let nextId = 1;
const EH = 8;
// El pasillo central deja solo 2 casillas de césped a cada lado para que al andar se vea el interior
// de los recintos: pantera y panda son más anchos (15) y el león se arrima al centro (la fuente queda
// en la esquina de fuera). La cabra no se mueve: a su lado está el puesto de la tienda.
// ew: ancho; gateRow: fila de la valla con la puerta; link: filas de camino hasta la cruz.
// Los de arriba ocupan las filas 5-12 y los de abajo 21-28; entre medias, la plaza.
const enclosures = [
  { animalId: 'leon', biome: 'savannah', x: 9, y: 5, ew: 12, gateX: 14, gateRow: 12, link: [13, 15] },
  { animalId: 'cabra', biome: 'alpine', x: 30, y: 5, ew: 12, gateX: 35, gateRow: 12, link: [13, 15] },
  { animalId: 'pantera', biome: 'rainforest', x: 6, y: 21, ew: 15, gateX: 12, gateRow: 21, link: [18, 20] },
  { animalId: 'panda', biome: 'bamboo', x: 27, y: 21, ew: 15, gateX: 33, gateRow: 21, link: [18, 20] },
];
for (const e of enclosures) {
  const EW = e.ew;
  fill(e.x, e.y, e.x + EW - 1, e.y, FENCE);
  fill(e.x, e.y + EH - 1, e.x + EW - 1, e.y + EH - 1, FENCE);
  fill(e.x, e.y, e.x, e.y + EH - 1, FENCE);
  fill(e.x + EW - 1, e.y, e.x + EW - 1, e.y + EH - 1, FENCE);
  fill(e.gateX, e.gateRow, e.gateX + 1, e.gateRow, GATE);
  fill(e.gateX, e.link[0], e.gateX + 1, e.link[1], PATH);
  const animalProp = [{ name: 'animalId', type: 'string', value: e.animalId }];
  objects.push({
    id: nextId++, name: `recinto-${e.animalId}`, type: 'recinto',
    x: e.x * T, y: e.y * T, width: EW * T, height: EH * T, rotation: 0, visible: true,
    properties: [...animalProp, { name: 'biome', type: 'string', value: e.biome }],
  });
  objects.push({
    id: nextId++, name: `puerta-${e.animalId}`, type: 'puerta',
    x: e.gateX * T, y: e.gateRow * T, width: 2 * T, height: T, rotation: 0, visible: true, properties: animalProp,
  });
}

// Tienda: puesto de mercado 5x5 con la puerta (2 casillas) debajo y conexión al camino.
fill(25, 4, 29, 8, BUILDING);
fill(27, 9, 28, 9, GATE);
fill(27, 10, 28, 13, PATH);
objects.push({ id: nextId++, name: 'tienda', type: 'tienda', x: 25 * T, y: 4 * T, width: 5 * T, height: 5 * T, rotation: 0, visible: true });
objects.push({ id: nextId++, name: 'puerta-tienda', type: 'puertaTienda', x: 27 * T, y: 9 * T, width: 2 * T, height: T, rotation: 0, visible: true });

// Props de decoración: x,y = punto de apoyo (centro de la base) en px.
// blockW/blockH: rectángulo que el animal no puede pisar (centrado en la base); flat: pieza plana
// (agua, meseta) que se dibuja pegada al suelo, por debajo de animales y personas.
const prop = (name, px, py, { block = null, flat = false, z = 0 } = {}) => {
  const properties = [
    { name: 'prop', type: 'string', value: name },
    { name: 'blocks', type: 'bool', value: block !== null },
    { name: 'flat', type: 'bool', value: flat },
    { name: 'z', type: 'int', value: z },
  ];
  if (block) properties.push({ name: 'blockW', type: 'int', value: block[0] }, { name: 'blockH', type: 'int', value: block[1] });
  objects.push({ id: nextId++, name: `${name}-${nextId}`, type: 'prop', x: px, y: py, width: 0, height: 0, rotation: 0, visible: true, properties });
};
/** Prop apoyado en la casilla (tx,ty) del mapa: centro horizontal de la casilla, borde inferior. */
const at = (name, tx, ty, opts) => prop(name, tx * T + T / 2, (ty + 1) * T, opts);
/** Piezas que se pisan (el animal pasa por encima): hierba y flores. */
const WALKABLE = /^(grass-tall-dry|flowers)/;
/** Ancho (px) de las piezas con volumen que no dan su bloqueo: se bloquea su base (ancho × 1 casilla). */
const BASE_W = { 'rock-grey': 16, 'rock-grey-big': 32, 'pine-small': 16, 'rock-savannah': 16, 'rock-savannah-big': 32, 'jungle-tree': 32, 'bush-jungle': 32 };
/**
 * Igual, en coordenadas del interior de un recinto (0,0 = primera casilla dentro de la valla).
 * Dentro de un recinto toda pieza no plana bloquea (su base), salvo las pisables.
 */
const inPen = (e) => (name, cx, cy, opts = {}) => {
  const solid = !opts.flat && !WALKABLE.test(name) && !opts.block;
  if (solid && !BASE_W[name]) throw new Error(`Falta el ancho de la base de "${name}" en BASE_W`);
  at(name, e.x + 1 + cx, e.y + 1 + cy, solid ? { ...opts, block: [BASE_W[name], T] } : opts);
};

const [leon, cabra, pantera, panda] = enclosures.map(inPen);
// 🦁 Sabana (puerta abajo: se deja libre la zona central inferior).
leon('acacia', 2, 2, { block: [32, 16] });
leon('acacia-small', 8, 5, { block: [16, 16] });
leon('rock-savannah-big', 6, 1);
leon('rock-savannah', 1, 5);
for (const [cx, cy] of [[5, 1], [9, 2], [3, 3], [7, 3]]) leon('grass-tall-dry', cx, cy);
leon('grass-tall-dry-big', 0, 1);
// 🐐 Montaña (puerta abajo). La meseta es plana: la cabra puede subir.
cabra('plateau', 8, 4, { flat: true });
cabra('cave', 2, 1, { block: [48, 16] });
cabra('pine', 1, 4, { block: [16, 16] });
cabra('pine-small', 5, 1);
cabra('rock-grey', 5, 3);
cabra('rock-grey-big', 0, 5);
// 🐆 Selva con catarata (puerta arriba), a la derecha junto al pasillo. Montada como enseña el autor
// del pack: bloque alto de acantilado a cada lado (con su remate), la catarata en medio empalmando con la
// roca y el lago al pie. Pieza de 112x96 (7x6 casillas): ocupa todo el alto del recinto.
pantera('waterfall', 9, 5, { flat: true, block: [112, 88] });
pantera('lilypad', 7, 4, { flat: true, z: 2 });
pantera('lilypad-flower', 10, 4, { flat: true, z: 2 });
pantera('palm', 1, 2, { block: [16, 8] });
pantera('palm', 2, 5, { block: [16, 8] });
pantera('bush-jungle', 1, 4);
pantera('flowers-red', 3, 1);
// 🐼 Bosquecillo de bambú en el lado de fuera y abajo (puerta arriba). El bambú mide 5-6 casillas:
// arriba taparía el camino y el cartel, en el centro escondería al panda y junto al pasillo central
// taparía el recinto; ahí solo un bambú pequeño en la esquina de abajo.
panda('bamboo-big', 12, 5, { block: [32, 16] });
panda('bamboo-big', 12, 2, { block: [32, 16] });
panda('bamboo-mid', 10, 5, { block: [32, 16] });
panda('bamboo-mid', 8, 5, { block: [32, 16] });
panda('bamboo-small', 10, 2, { block: [16, 16] });
panda('bamboo-small', 0, 5, { block: [16, 16] });
panda('log', 4, 3, { block: [32, 16] });
panda('flowers', 3, 2);
panda('flowers-red', 8, 2);

// Parque.
// La fuente animada en el centro de la plaza (80x64: tapa la isla de césped de 4x4).
prop('fountain', 24 * T, 19 * T);
for (const [x, y] of [[4, 6], [4, 13], [6, 8], [6, 11], [4, 22], [4, 26], [21, 7], [21, 11], [21, 23], [22, 27], [26, 23], [25, 27], [42, 6], [42, 11], [42, 22], [42, 27], [33, 4], [39, 4]]) {
  at('tree', x, y);
}
for (const [x, y] of [[7, 13], [22, 22], [26, 25], [43, 14], [10, 4], [15, 29], [36, 29]]) at('bush', x, y);
for (const [x, y] of [[13, 13], [34, 13], [11, 20], [32, 20]]) at('sign', x, y);
for (const [x, y] of [[22, 9], [25, 11], [22, 25], [25, 25]]) at('lamp', x, y);
for (const [x, y] of [[17, 14], [7, 14], [29, 19], [39, 19]]) prop('bench', (x + 1) * T, (y + 1) * T);
prop('flowerbed', 22 * T, 5 * T);
at('barrel', 26, 9);
at('crate-fruit', 29, 9);

// Muro del parque (madera sobre piedra) alrededor de todo, con el portón abajo en el centro.
for (let x = 0; x < W * T; x += 32) prop('park-wall', x + 16, 2 * T);
for (let x = 0; x < W * T; x += 32) if (x + 32 <= 22 * T || x >= 26 * T) prop('park-wall', x + 16, H * T);
for (let y = 3; y <= 32; y++) {
  prop('park-wall-side', T, y * T);
  prop('park-wall-side', (W - 1) * T, y * T);
}
prop('park-gate', 24 * T, H * T);

objects.push({
  id: nextId++, name: 'inicio', type: 'punto', point: true,
  x: 23 * T + T / 2, y: 30 * T + T / 2, width: 0, height: 0, rotation: 0, visible: true,
});

const walkable = [{ name: 'walkable', type: 'bool', value: true }];
const map = {
  compressionlevel: -1, width: W, height: H, tilewidth: T, tileheight: T, infinite: false,
  orientation: 'orthogonal', renderorder: 'right-down', tiledversion: '1.11.0', type: 'map', version: '1.10',
  nextlayerid: 3, nextobjectid: nextId,
  layers: [
    { id: 1, name: 'suelo', type: 'tilelayer', width: W, height: H, x: 0, y: 0, opacity: 1, visible: true, data },
    { id: 2, name: 'objetos', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true, objects },
  ],
  tilesets: [{
    firstgid: 1, name: 'placeholder', image: '../tiles/placeholder.png', imagewidth: T * 5, imageheight: T,
    tilewidth: T, tileheight: T, tilecount: 5, columns: 5, margin: 0, spacing: 0,
    tiles: [{ id: PATH - 1, properties: walkable }, { id: GATE - 1, properties: walkable }],
  }],
};

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../public/assets/maps/zoo.tmj');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 1) + '\n');
console.log('Mapa generado en', out);
