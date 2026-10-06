// Genera public/assets/maps/zoo.tmj: el zoo de verdad (96x60), lógico (césped/camino/valla/puerta/edificio).
// El arte real lo pone el autotiler en el juego; este mapa también sirve en modo provisional.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 96;
const H = 60;
const T = 16;
/** El parque de siempre (48x35) queda en el centro: lo suyo se escribe en sus coordenadas de antes. */
const OX = 24;
const OY = 20;
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
/** Igual, en coordenadas del parque de siempre. */
const pfill = (x0, y0, x1, y1, gid) => fill(x0 + OX, y0 + OY, x1 + OX, y1 + OY, gid);

// Parque. Caminos de 2 de ancho: anillo exterior y cruz central.
pfill(2, 2, 45, 3, PATH);
pfill(2, 30, 45, 31, PATH);
pfill(2, 2, 3, 31, PATH);
pfill(44, 2, 45, 31, PATH);
pfill(2, 16, 45, 17, PATH);
pfill(23, 2, 24, 31, PATH);
// Entrada: el camino central baja hasta el portón, en el borde de abajo del mapa.
fill(23 + OX, 32 + OY, 24 + OX, H - 1, PATH);
// Plaza en el cruce (8x8) con la fuente en medio sobre una isla de césped de 4x4, como el parque de la v1.
pfill(20, 13, 27, 20, PATH);
pfill(22, 15, 25, 18, GRASS);

// Avenidas a las zonas nuevas.
fill(12, 17, 79, 18, PATH); // norte: sabana y elefantes
fill(23 + OX, 19, 24 + OX, OY + 1, PATH); // baja de la avenida norte a la cruz central
fill(5, 16 + OY, 1 + OX, 17 + OY, PATH); // oeste (polo): sigue el camino del medio
fill(46 + OX, 16 + OY, 93, 17 + OY, PATH); // este (granja)

const objects = [];
let nextId = 1;
// Alto por defecto; la pantera es más alta (10) para que quepa la catarata entera.
const DEFAULT_EH = 8;
/** Recinto del parque de siempre, en sus coordenadas de antes. */
const park = (e) => ({ ...e, x: e.x + OX, y: e.y + OY, gateX: e.gateX + OX, gateRow: e.gateRow + OY, link: [e.link[0] + OY, e.link[1] + OY] });
// ew: ancho; eh: alto; gateRow: fila de la valla con la puerta; link: filas de camino hasta la avenida.
// En el parque el pasillo central deja solo 2 casillas de césped a cada lado para que al andar se vea el
// interior: pantera y panda son más anchos (15) y el león se arrima al centro. La cabra no se mueve: a su
// lado está el puesto de la tienda.
const enclosures = [
  park({ penId: 'leon', biome: 'savannah', x: 9, y: 5, ew: 12, gateX: 14, gateRow: 12, link: [13, 15] }),
  park({ penId: 'cabra', biome: 'alpine', x: 30, y: 5, ew: 12, gateX: 35, gateRow: 12, link: [13, 15] }),
  park({ penId: 'pantera', biome: 'rainforest', x: 6, y: 19, ew: 15, eh: 10, gateX: 12, gateRow: 19, link: [18, 18] }),
  park({ penId: 'panda', biome: 'bamboo', x: 27, y: 21, ew: 15, gateX: 33, gateRow: 21, link: [18, 20] }),
  // Norte, sabana: el recinto grande y, al lado, dos jaulas de elefantes con un pasillo de césped (64-65).
  { penId: 'sabana', biome: 'savannah', x: 14, y: 3, ew: 22, eh: 12, gateX: 24, gateRow: 14, link: [15, 16] },
  { penId: 'elefantes-africanos', biome: 'savannah', x: 52, y: 5, ew: 12, eh: 10, gateX: 57, gateRow: 14, link: [15, 16] },
  { penId: 'elefantes-asiaticos', biome: 'savannah', x: 66, y: 5, ew: 12, eh: 10, gateX: 71, gateRow: 14, link: [15, 16] },
  // Oeste, polo.
  { penId: 'pinguinos', biome: 'tundra', x: 5, y: 25, ew: 16, eh: 10, gateX: 12, gateRow: 34, link: [35, 35] },
  // Este, granja: ovejas y estanque arriba de la avenida, establo debajo.
  { penId: 'ovejas', biome: 'grassland', x: 72, y: 25, ew: 11, eh: 10, gateX: 77, gateRow: 34, link: [35, 35] },
  // El estanque es más alto que sus vecinos: arriba le cabe un lago de verdad.
  { penId: 'estanque', biome: 'grassland', x: 84, y: 22, ew: 10, eh: 13, gateX: 88, gateRow: 34, link: [35, 35] },
  { penId: 'establo', biome: 'grassland', x: 74, y: 39, ew: 16, eh: 10, gateX: 81, gateRow: 39, link: [38, 38] },
];
for (const e of enclosures) {
  const EW = e.ew;
  const EH = e.eh ?? DEFAULT_EH;
  fill(e.x, e.y, e.x + EW - 1, e.y, FENCE);
  fill(e.x, e.y + EH - 1, e.x + EW - 1, e.y + EH - 1, FENCE);
  fill(e.x, e.y, e.x, e.y + EH - 1, FENCE);
  fill(e.x + EW - 1, e.y, e.x + EW - 1, e.y + EH - 1, FENCE);
  fill(e.gateX, e.gateRow, e.gateX + 1, e.gateRow, GATE);
  fill(e.gateX, e.link[0], e.gateX + 1, e.link[1], PATH);
  const penProp = [{ name: 'penId', type: 'string', value: e.penId }];
  objects.push({
    id: nextId++, name: `recinto-${e.penId}`, type: 'recinto',
    x: e.x * T, y: e.y * T, width: EW * T, height: EH * T, rotation: 0, visible: true,
    properties: [...penProp, { name: 'biome', type: 'string', value: e.biome }],
  });
  objects.push({
    id: nextId++, name: `puerta-${e.penId}`, type: 'puerta',
    x: e.gateX * T, y: e.gateRow * T, width: 2 * T, height: T, rotation: 0, visible: true, properties: penProp,
  });
}

// Tienda: puesto de mercado 5x5 con la puerta (2 casillas) debajo y conexión al camino.
pfill(25, 4, 29, 8, BUILDING);
pfill(27, 9, 28, 9, GATE);
pfill(27, 10, 28, 13, PATH);
objects.push({ id: nextId++, name: 'tienda', type: 'tienda', x: (25 + OX) * T, y: (4 + OY) * T, width: 5 * T, height: 5 * T, rotation: 0, visible: true });
objects.push({ id: nextId++, name: 'puerta-tienda', type: 'puertaTienda', x: (27 + OX) * T, y: (9 + OY) * T, width: 2 * T, height: T, rotation: 0, visible: true });

// Props de decoración: x,y = punto de apoyo (centro de la base) en px.
// blockW/blockH: rectángulo que el animal no puede pisar (centrado en la base); flat: pieza plana
// (agua, meseta) que se dibuja pegada al suelo, por debajo de animales y personas; zone: zona que
// anuncia un cartel de zona.
const prop = (name, px, py, { block = null, flat = false, z = 0, zone = null } = {}) => {
  const properties = [
    { name: 'prop', type: 'string', value: name },
    { name: 'blocks', type: 'bool', value: block !== null },
    { name: 'flat', type: 'bool', value: flat },
    { name: 'z', type: 'int', value: z },
  ];
  if (block) properties.push({ name: 'blockW', type: 'int', value: block[0] }, { name: 'blockH', type: 'int', value: block[1] });
  if (zone) properties.push({ name: 'zone', type: 'string', value: zone });
  objects.push({ id: nextId++, name: `${name}-${nextId}`, type: 'prop', x: px, y: py, width: 0, height: 0, rotation: 0, visible: true, properties });
};
/** Prop apoyado en la casilla (tx,ty) del mapa: centro horizontal de la casilla, borde inferior. */
const at = (name, tx, ty, opts) => prop(name, tx * T + T / 2, (ty + 1) * T, opts);
/** Lo mismo, en coordenadas del parque de siempre. */
const pat = (name, tx, ty, opts) => at(name, tx + OX, ty + OY, opts);
const pprop = (name, px, py, opts) => prop(name, px + OX * T, py + OY * T, opts);
/** Piezas que se pisan (el animal pasa por encima): hierba y flores. */
const WALKABLE = /^(grass-tall-dry|flowers)/;
/** Ancho (px) de las piezas con volumen que no dan su bloqueo: se bloquea su base (ancho × 1 casilla). */
const BASE_W = {
  'rock-grey': 16, 'rock-grey-big': 32, 'pine-small': 16, 'rock-savannah': 16, 'rock-savannah-big': 32, 'jungle-tree': 32, 'bush-jungle': 32,
  'rock-snow': 16, 'rock-snow-big': 32, 'pine-snow-small': 16, sunflowers: 16, stump: 32, bush: 16,
};
/**
 * Igual, en coordenadas del interior de un recinto (0,0 = primera casilla dentro de la valla).
 * Dentro de un recinto toda pieza no plana bloquea (su base), salvo las pisables.
 */
const inPen = (e) => (name, cx, cy, opts = {}) => {
  const solid = !opts.flat && !WALKABLE.test(name) && !opts.block;
  if (solid && !BASE_W[name]) throw new Error(`Falta el ancho de la base de "${name}" en BASE_W`);
  at(name, e.x + 1 + cx, e.y + 1 + cy, solid ? { ...opts, block: [BASE_W[name], T] } : opts);
};

const [leon, cabra, pantera, panda, sabana, africanos, asiaticos, pinguinos, ovejas, estanque, establo] = enclosures.map(inPen);
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
// roca y el agua al pie, montada con las casillas 16x16 del terrain como pide el autor (catarata
// arriba/medio/abajo alineada con el acantilado C/D y empalmando con el agua E). 112x112 (7x7).
pantera('waterfall', 9, 7, { flat: true, block: [112, 104] });
pantera('lilypad', 10, 6, { flat: true, z: 2 });
pantera('palm', 1, 2, { block: [16, 8] });
pantera('palm', 2, 7, { block: [16, 8] });
pantera('bush-jungle', 1, 5);
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
// 🦒 Sabana grande (interior 20x10, puerta abajo en las columnas 9-10: esa franja queda libre).
sabana('acacia', 3, 3, { block: [32, 16] });
sabana('acacia', 15, 2, { block: [32, 16] });
sabana('acacia-small', 13, 6, { block: [16, 16] });
sabana('rock-savannah-big', 7, 1);
sabana('rock-savannah', 17, 7);
sabana('rock-savannah', 1, 8);
for (const [cx, cy] of [[5, 2], [11, 3], [14, 8], [2, 5], [18, 4]]) sabana('grass-tall-dry', cx, cy);
sabana('grass-tall-dry-big', 0, 1);
// 🐘 Elefantes (interior 10x8, puerta abajo en las columnas 4-5): poca cosa, que los elefantes son grandes.
africanos('acacia', 1, 2, { block: [32, 16] });
africanos('rock-savannah-big', 7, 1);
for (const [cx, cy] of [[4, 1], [8, 5]]) africanos('grass-tall-dry', cx, cy);
asiaticos('acacia-small', 8, 3, { block: [16, 16] });
asiaticos('rock-savannah', 1, 1);
asiaticos('rock-savannah-big', 1, 6);
for (const [cx, cy] of [[5, 2], [7, 6]]) asiaticos('grass-tall-dry', cx, cy);
// 🐧 Polo (interior 14x8, puerta abajo en las columnas 6-7): nieve y una charca.
pinguinos('pond-tundra', 10, 3, { flat: true, block: [48, 40] });
pinguinos('rock-snow-big', 1, 1);
pinguinos('rock-snow', 3, 5);
pinguinos('pine-snow-small', 0, 6);
pinguinos('pine-snow', 13, 6, { block: [16, 16] });
// 🐑 Ovejas (interior 9x8, puerta abajo en las columnas 4-5). Aquí entran también los visitantes.
ovejas('sunflowers', 0, 1);
ovejas('stump', 7, 1);
for (const [cx, cy] of [[3, 2], [6, 5]]) ovejas('flowers', cx, cy);
// 🦆 Estanque (interior 8x11, puerta abajo en las columnas 3-4): un lago de 6x6 casillas arriba y
// la orilla debajo, por donde pasean los patos y entra la cuidadora.
const lakeLeft = (enclosures[9].x + 2) * T;
const lakeTop = (enclosures[9].y + 2) * T;
prop('lake-grassland', lakeLeft + 48, lakeTop + 96, { flat: true, block: [96, 96] });
estanque('lilypad', 2, 2, { flat: true, z: 2 });
estanque('lilypad-flower', 5, 4, { flat: true, z: 2 });
estanque('lilypad', 3, 5, { flat: true, z: 2 });
estanque('sunflowers', 7, 8);
estanque('flowers', 0, 9);
// 🐴 Establo (interior 14x8, puerta arriba en las columnas 6-7).
establo('stump', 1, 6);
establo('log', 11, 6, { block: [32, 16] });
establo('sunflowers', 13, 1);
establo('bush', 0, 1);
for (const [cx, cy] of [[3, 3], [10, 2]]) establo('flowers', cx, cy);

// Parque.
// La fuente animada en el centro de la plaza (80x64: tapa la isla de césped de 4x4).
pprop('fountain', 24 * T, 19 * T);
for (const [x, y] of [[4, 6], [4, 13], [6, 8], [6, 11], [4, 22], [4, 26], [21, 7], [21, 11], [21, 23], [22, 27], [26, 23], [25, 27], [42, 6], [42, 11], [42, 22], [42, 27], [33, 4], [39, 4]]) {
  pat('tree', x, y);
}
for (const [x, y] of [[7, 13], [22, 22], [26, 25], [43, 14], [10, 4], [15, 29], [36, 29]]) pat('bush', x, y);
for (const [x, y] of [[13, 13], [34, 13], [11, 18], [32, 20]]) pat('sign', x, y);
for (const [x, y] of [[22, 9], [25, 11], [22, 25], [25, 25]]) pat('lamp', x, y);
for (const [x, y] of [[17, 14], [7, 14], [29, 19], [39, 19]]) pprop('bench', (x + 1) * T, (y + 1) * T);
pprop('flowerbed', 22 * T, 5 * T);
pat('barrel', 26, 9);
pat('crate-fruit', 29, 9);

// Zonas nuevas: cartel de cada recinto junto a su puerta y cartel de zona a la entrada.
for (const [x, y] of [[23, 15], [56, 15], [70, 15], [11, 35], [76, 35], [87, 35], [80, 38]]) at('sign', x, y);
at('sign-zone', 49, 20, { zone: 'sabana' });
at('sign-zone', 24, 35, { zone: 'polo' });
at('sign-zone', 70, 35, { zone: 'granja' });
for (const [x, y] of [
  [10, 6], [10, 12], [38, 6], [38, 12], [44, 9], [50, 9], [80, 6], [80, 12], [30, 20], [64, 20], [8, 20], [86, 20],
  [3, 30], [23, 30], [8, 40], [16, 42], [22, 46], [4, 50], [14, 52],
  [71, 44], [92, 42], [80, 52], [90, 52], [74, 22],
]) {
  at('tree', x, y);
}
for (const [x, y] of [[12, 20], [40, 16], [62, 16], [6, 38], [90, 38]]) at('bush', x, y);
for (const [x, y] of [[30, 16], [10, 38], [72, 38]]) prop('bench', (x + 1) * T, (y + 1) * T);

// Muro del parque (madera sobre piedra) alrededor de todo, con el portón abajo, donde acaba el camino central.
const gatePx = (24 + OX) * T;
for (let x = 0; x < W * T; x += 32) prop('park-wall', x + 16, 2 * T);
for (let x = 0; x < W * T; x += 32) if (x + 32 <= gatePx - 2 * T || x >= gatePx + 2 * T) prop('park-wall', x + 16, H * T);
for (let y = 3; y <= H - 3; y++) {
  prop('park-wall-side', T, y * T);
  prop('park-wall-side', (W - 1) * T, y * T);
}
prop('park-gate', gatePx, H * T);

objects.push({
  id: nextId++, name: 'inicio', type: 'punto', point: true,
  x: (23 + OX) * T + T / 2, y: (33 + OY) * T + T / 2, width: 0, height: 0, rotation: 0, visible: true,
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
