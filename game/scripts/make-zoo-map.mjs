// Genera public/assets/maps/zoo.tmj: el zoo de verdad (116x75), lógico (césped/camino/valla/puerta/edificio).
// El arte real lo pone el autotiler en el juego; este mapa también sirve en modo provisional.
//
// Trazado del 2026-11-06 (plaza grande y recintos de al menos 14x9 por dentro): el parque del centro pasó de
// 48x35 a 55x49 casillas, con una plaza de 15x13 en el cruce. Lo de fuera (sabana arriba, polo a la izquierda,
// granja a la derecha) conserva su sitio respecto al parque; las avenidas y atajos se alargan con él.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 116;
const H = 75;
const T = 16;
/** El parque del centro: sus cosas se escriben en coordenadas propias (0,0 = esquina de arriba a la izquierda). */
const OX = 24;
const OY = 20;
const PW = 55;
const PH = 49;
/** Cruce del parque: columna y fila del centro de los dos caminos que llegan a la plaza (3 de ancho). */
const CX = 25;
const CY = 23;
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
/** Igual, en coordenadas del parque. */
const pfill = (x0, y0, x1, y1, gid) => fill(x0 + OX, y0 + OY, x1 + OX, y1 + OY, gid);

// Parque. Anillo de 2 de ancho y una cruz de 3 de ancho: son los caminos que llegan a la plaza.
pfill(2, 2, PW - 3, 3, PATH);
pfill(2, PH - 4, PW - 3, PH - 3, PATH);
pfill(2, 2, 3, PH - 3, PATH);
pfill(PW - 4, 2, PW - 3, PH - 3, PATH);
pfill(2, CY - 1, PW - 3, CY + 1, PATH);
pfill(CX - 1, 2, CX + 1, PH - 3, PATH);
// Entrada: de la esquina de abajo de la cruz baja hasta el portón, en el borde de abajo del mapa (2 de ancho).
fill(CX - 1 + OX, PH - 2 + OY, CX + OX, H - 1, PATH);
// Plaza de la fuente (15x13) con las esquinas recortadas en diagonal, y la isla de la fuente (5x4, el tamaño
// del dibujo) en medio: queda una vuelta de 4 casillas (5 a los lados y abajo).
const PLAZA = { x0: CX - 7, y0: CY - 6, x1: CX + 7, y1: CY + 6 };
const ISLAND = { x0: CX - 2, y0: CY - 2, x1: CX + 2, y1: CY + 1 };
pfill(PLAZA.x0, PLAZA.y0, PLAZA.x1, PLAZA.y1, PATH);
for (const [cx, cy, sx, sy] of [[PLAZA.x0, PLAZA.y0, 1, 1], [PLAZA.x1, PLAZA.y0, -1, 1], [PLAZA.x0, PLAZA.y1, 1, -1], [PLAZA.x1, PLAZA.y1, -1, -1]]) {
  for (const [dx, dy] of [[0, 0], [1, 0], [0, 1]]) pfill(cx + dx * sx, cy + dy * sy, cx + dx * sx, cy + dy * sy, GRASS);
}
pfill(ISLAND.x0, ISLAND.y0, ISLAND.x1, ISLAND.y1, GRASS);

// Las columnas y filas de fuera del parque, en el mapa.
const LEFT = 3; // camino del borde izquierdo (3-4)
const RIGHT = W - 4; // camino del borde derecho
const NORTH = 17; // avenida de arriba (17-18)
const MID = CY - 1 + OY; // avenidas del polo y de la granja: siguen la cruz del parque (2 de ancho)
const RING_L = OX + 2;
const RING_R = OX + PW - 4;
const RING_B = OY + PH - 4; // fila de arriba del anillo de abajo
const SPINE = OX + CX - 1; // columna izquierda del camino del centro (de la avenida de arriba al parque)

// Avenidas a las zonas de fuera.
fill(LEFT, NORTH, RIGHT + 1, NORTH + 1, PATH); // arriba: sabana y elefantes, de borde a borde
fill(SPINE, NORTH + 2, SPINE + 1, OY + 1, PATH); // baja de la avenida de arriba a la cruz del parque
fill(LEFT + 2, MID, RING_L - 1, MID + 1, PATH); // oeste (polo): sigue el camino del medio
fill(RING_R + 2, MID, RIGHT - 1, MID + 1, PATH); // este (granja)

// Atajos (plano a mano de David, 2026-11-01): así no hay que bajar al centro para ir de una punta a otra.
fill(LEFT, NORTH + 2, LEFT + 1, RING_B + 1, PATH); // izquierda: baja pegada al borde (cruza la avenida del polo)
fill(LEFT + 2, RING_B, RING_L - 1, RING_B + 1, PATH); //    y gira hasta la esquina de abajo a la izquierda del parque
fill(RING_L, NORTH + 2, RING_L + 1, OY + 1, PATH); // de la avenida de arriba a la esquina de arriba a la izquierda del parque
fill(RING_R, NORTH + 2, RING_R + 1, OY + 1, PATH); // y a la de arriba a la derecha
const U = { x0: SPINE - 9, x1: SPINE + 1, top: 4 }; // la «U» entre la Sabana y los elefantes (dentro, un jardín)
fill(U.x0, U.top, U.x1, U.top + 1, PATH);
fill(U.x0, U.top + 2, U.x0 + 1, NORTH - 1, PATH);
fill(U.x1 - 1, U.top + 2, U.x1, NORTH - 1, PATH); //    su pata derecha sigue en línea con el camino central
fill(RIGHT, NORTH + 2, RIGHT + 1, RING_B + 1, PATH); // derecha: baja pegada al borde (cruza la avenida de la granja)
fill(RING_R + 2, RING_B, RIGHT - 1, RING_B + 1, PATH); //    y gira hasta la esquina de abajo a la derecha del parque

const objects = [];
let nextId = 1;
/** Recinto del parque, en sus coordenadas. */
const park = (e) => ({ ...e, x: e.x + OX, y: e.y + OY, gateX: e.gateX + OX, gateRow: e.gateRow + OY, link: [e.link[0] + OY, e.link[1] + OY] });
// ew/eh: ancho y alto con la valla (al menos 16x11: 14x9 por dentro); gateRow: fila de la valla con la puerta;
// link: filas de camino de la puerta a la avenida. Los cuatro del parque se apartan de la plaza: entre ellos y
// la cruz quedan 2 casillas de césped para ver el interior al pasar. La cabra no se mueve de al lado de la tienda.
const enclosures = [
  park({ penId: 'leon', biome: 'savannah', x: 6, y: 5, ew: 16, eh: 11, gateX: 13, gateRow: 15, link: [16, CY - 2] }),
  park({ penId: 'cabra', biome: 'alpine', x: 33, y: 5, ew: 16, eh: 11, gateX: 40, gateRow: 15, link: [16, CY - 2] }),
  // La pantera es más alta (12) para que quepa la catarata entera con suelo delante.
  park({ penId: 'pantera', biome: 'rainforest', x: 6, y: 31, ew: 16, eh: 12, gateX: 13, gateRow: 31, link: [CY + 2, 30] }),
  park({ penId: 'panda', biome: 'bamboo', x: 33, y: 31, ew: 16, eh: 11, gateX: 40, gateRow: 31, link: [CY + 2, 30] }),
  // Norte, sabana: el recinto grande y, al lado, dos jaulas de elefantes con un pasillo de césped.
  { penId: 'sabana', biome: 'savannah', x: 14, y: 3, ew: 22, eh: 12, gateX: 24, gateRow: 14, link: [15, 16] },
  { penId: 'elefantes-africanos', biome: 'savannah', x: U.x1 + 4, y: 4, ew: 16, eh: 11, gateX: U.x1 + 11, gateRow: 14, link: [15, 16] },
  { penId: 'elefantes-asiaticos', biome: 'savannah', x: U.x1 + 22, y: 4, ew: 16, eh: 11, gateX: U.x1 + 29, gateRow: 14, link: [15, 16] },
  // Oeste, polo.
  { penId: 'pinguinos', biome: 'tundra', x: 5, y: MID - 12, ew: 16, eh: 11, gateX: 12, gateRow: MID - 2, link: [MID - 1, MID - 1] },
  // Este, granja: ovejas y estanque arriba de la avenida, establo debajo. El estanque deja libre el borde
  // derecho para el camino; es más alto que sus vecinos: arriba le cabe un lago de verdad.
  { penId: 'ovejas', biome: 'grassland', x: RING_R + 4, y: MID - 12, ew: 16, eh: 11, gateX: RING_R + 11, gateRow: MID - 2, link: [MID - 1, MID - 1] },
  { penId: 'estanque', biome: 'grassland', x: RING_R + 21, y: MID - 14, ew: 16, eh: 13, gateX: RING_R + 28, gateRow: MID - 2, link: [MID - 1, MID - 1] },
  { penId: 'establo', biome: 'grassland', x: RING_R + 6, y: MID + 3, ew: 16, eh: 11, gateX: RING_R + 13, gateRow: MID + 3, link: [MID + 2, MID + 2] },
];
for (const e of enclosures) {
  const EW = e.ew;
  const EH = e.eh;
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

// Tienda: puesto de mercado 5x5 pegado a las cabras, con la puerta (2 casillas) debajo y un camino a la plaza.
const SHOP = { x: 28, y: 4 };
pfill(SHOP.x, SHOP.y, SHOP.x + 4, SHOP.y + 4, BUILDING);
pfill(SHOP.x + 1, SHOP.y + 5, SHOP.x + 2, SHOP.y + 5, GATE);
pfill(SHOP.x + 1, SHOP.y + 6, SHOP.x + 2, PLAZA.y0 - 1, PATH);
objects.push({ id: nextId++, name: 'tienda', type: 'tienda', x: (SHOP.x + OX) * T, y: (SHOP.y + OY) * T, width: 5 * T, height: 5 * T, rotation: 0, visible: true });
objects.push({ id: nextId++, name: 'puerta-tienda', type: 'puertaTienda', x: (SHOP.x + 1 + OX) * T, y: (SHOP.y + 5 + OY) * T, width: 2 * T, height: T, rotation: 0, visible: true });

// Tablón de la comunidad: en la esquina de arriba a la izquierda de la plaza, junto al recorte. El objeto marca
// la casilla del camino que se pisa para abrirlo; el tablón se dibuja en el césped de encima.
objects.push({ id: nextId++, name: 'tablon', type: 'tablon', x: (PLAZA.x0 + 2 + OX) * T, y: (PLAZA.y0 + OY) * T, width: T, height: T, rotation: 0, visible: true });

// Props de decoración: x,y = punto de apoyo (centro de la base) en px.
// blockW/blockH: rectángulo que el animal no puede pisar (centrado en la base); solid: tampoco lo pisan la
// cuidadora ni los visitantes (casillas que toca el rectángulo); flat: pieza plana
// (agua, meseta) que se dibuja pegada al suelo, por debajo de animales y personas; zone: zona que
// anuncia un cartel de zona.
/**
 * Regla de pisar (David, 2026-11-06): todo lo que no sea agua se puede subir; árboles, troncos, arbustos y
 * bambú no se atraviesan. Lo que casa con esto se pisa: no lleva `block` y se dibuja por debajo de quien
 * lo pisa (propiedad `walk`).
 */
const WALK = /^(grass|flowers|sunflowers|rock|plateau|cave|lilypad|pebble|daisies)/;
const prop = (name, px, py, { block = null, flat = false, z = 0, zone = null, solid = false } = {}) => {
  const walk = WALK.test(name);
  if (walk && block) throw new Error(`"${name}" se pisa: no puede llevar block`);
  const properties = [
    { name: 'prop', type: 'string', value: name },
    { name: 'blocks', type: 'bool', value: block !== null },
    { name: 'flat', type: 'bool', value: flat },
    { name: 'z', type: 'int', value: z },
  ];
  if (walk) properties.push({ name: 'walk', type: 'bool', value: true });
  if (solid) properties.push({ name: 'solid', type: 'bool', value: true });
  if (block) properties.push({ name: 'blockW', type: 'int', value: block[0] }, { name: 'blockH', type: 'int', value: block[1] });
  if (zone) properties.push({ name: 'zone', type: 'string', value: zone });
  objects.push({ id: nextId++, name: `${name}-${nextId}`, type: 'prop', x: px, y: py, width: 0, height: 0, rotation: 0, visible: true, properties });
};
/**
 * Zona de agua (o barro) en casillas del mapa, inclusivo. El agua no la pisa nadie: ni animales ni
 * cuidadora. Las piezas de agua son planas y sin `block`: lo que no se pisa lo dice esta zona, así en
 * el risco de la pantera la roca se pisa y la cascada no. `kind`: 'agua' o 'barro' (charca de los cerdos).
 */
const water = (kind, x0, y0, x1, y1) => {
  objects.push({
    id: nextId++, name: `${kind}-${nextId}`, type: 'agua',
    x: x0 * T, y: y0 * T, width: (x1 - x0 + 1) * T, height: (y1 - y0 + 1) * T, rotation: 0, visible: true,
    properties: [{ name: 'kind', type: 'string', value: kind }],
  });
};
/** Prop apoyado en la casilla (tx,ty) del mapa: centro horizontal de la casilla, borde inferior. */
const at = (name, tx, ty, opts) => prop(name, tx * T + T / 2, (ty + 1) * T, opts);
/** Lo mismo, en coordenadas del parque de siempre. */
const pat = (name, tx, ty, opts) => at(name, tx + OX, ty + OY, opts);
const pprop = (name, px, py, opts) => prop(name, px + OX * T, py + OY * T, opts);
/** Ancho (px) de las piezas con volumen que no dan su bloqueo: se bloquea su base (ancho × 1 casilla). */
const BASE_W = {
  'pine-small': 16, 'jungle-tree': 32, 'bush-jungle': 32, 'pine-snow-small': 16, stump: 32, bush: 16,
};
/**
 * Igual, en coordenadas del interior de un recinto (0,0 = primera casilla dentro de la valla).
 * Dentro de un recinto toda pieza no plana bloquea (su base), salvo las que se pisan (`WALK`).
 */
const inPen = (e) => (name, cx, cy, opts = {}) => {
  const solid = !opts.flat && !WALK.test(name) && !opts.block;
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
// 🐐 Montaña (puerta abajo). La meseta, la cueva y las rocas se suben.
cabra('plateau', 8, 4, { flat: true });
cabra('cave', 2, 1);
cabra('pine', 1, 4, { block: [16, 16] });
cabra('pine-small', 5, 1);
cabra('rock-grey', 5, 3);
cabra('rock-grey-big', 0, 5);
// 🐆 Selva con catarata (puerta arriba), a la derecha junto al pasillo. Montada como enseña el autor
// del pack: bloque alto de acantilado a cada lado (con su remate), la catarata en medio empalmando con la
// roca y el agua al pie, montada con las casillas 16x16 del terrain como pide el autor (catarata
// arriba/medio/abajo alineada con el acantilado C/D y empalmando con el agua E). 112x112 (7x7).
pantera('waterfall', 10, 9, { flat: true });
{
  // Casilla de apoyo de la catarata (centro abajo de la pieza de 7x7): la cascada son las 3 columnas del
  // medio (5 filas) y la poza, las 2 filas de abajo de esas columnas. Los lados son roca: se pisan.
  const tx = enclosures[2].x + 1 + 10;
  const ty = enclosures[2].y + 1 + 9;
  water('agua', tx - 1, ty - 6, tx + 1, ty - 2);
  water('agua', tx - 1, ty - 1, tx + 1, ty);
}
pantera('lilypad', 11, 8, { flat: true, z: 2 });
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
pinguinos('pond-tundra', 10, 3, { flat: true });
// La charca (3x3) acaba en la casilla de apoyo (centro abajo).
water('agua', enclosures[7].x + 1 + 10 - 1, enclosures[7].y + 1 + 3 - 2, enclosures[7].x + 1 + 10 + 1, enclosures[7].y + 1 + 3);
pinguinos('rock-snow-big', 1, 1);
pinguinos('rock-snow', 3, 5);
pinguinos('pine-snow-small', 0, 6);
pinguinos('pine-snow', 13, 6, { block: [16, 16] });
// 🐑 Ovejas (interior 9x8, puerta abajo en las columnas 4-5). Aquí entran también los visitantes.
ovejas('sunflowers', 0, 1);
ovejas('stump', 5, 1);
for (const [cx, cy] of [[3, 2], [6, 5]]) ovejas('flowers', cx, cy);
// 🦆 Estanque (interior 8x11, puerta abajo en las columnas 3-4): un lago de 6x6 casillas arriba y
// la orilla debajo, por donde pasean los patos y entra la cuidadora.
const lakeLeft = (enclosures[9].x + 2) * T;
const lakeTop = (enclosures[9].y + 2) * T;
prop('lake-grassland', lakeLeft + 48, lakeTop + 96, { flat: true });
water('agua', lakeLeft / T, lakeTop / T, lakeLeft / T + 5, lakeTop / T + 5);
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
// La fuente animada en el centro de la plaza (80x64): su isla de césped es del mismo tamaño, así que su bloqueo
// (sólida: la cuidadora no se mete en el agua) no tapa camino.
pprop('fountain', (ISLAND.x0 + ISLAND.x1 + 1) / 2 * T, (ISLAND.y1 + 1) * T, { block: [80, 64], solid: true });
// Plaza: una farola en cada esquina recortada y dos bancos a cada lado, en el césped junto al borde.
for (const [x, y] of [[PLAZA.x0, PLAZA.y0], [PLAZA.x1, PLAZA.y0], [PLAZA.x0, PLAZA.y1], [PLAZA.x1, PLAZA.y1]]) pat('lamp', x, y);
for (const [x, y] of [[PLAZA.x0 - 2, PLAZA.y0 + 2], [PLAZA.x0 - 2, PLAZA.y1 - 2], [PLAZA.x1 + 1, PLAZA.y0 + 2], [PLAZA.x1 + 1, PLAZA.y1 - 2]]) {
  pprop('bench', (x + 1) * T, (y + 1) * T);
}
for (const [x, y] of [
  [4, 7], [4, 12], [4, 18], [4, 28], [4, 34], [4, 39], [22, 7], [22, 11], [22, 34], [22, 39],
  [49, 7], [49, 12], [49, 34], [49, 39], [28, 34], [31, 39], [37, 4], [45, 4],
]) {
  pat('tree', x, y);
}
for (const [x, y] of [[8, 17], [10, 27], [20, 30], [30, 30], [46, 18], [46, 28], [11, 44], [40, 44]]) pat('bush', x, y);
pprop('flowerbed', 23 * T, 5 * T);
pat('barrel', SHOP.x - 1, SHOP.y + 5);
pat('crate-fruit', SHOP.x + 3, SHOP.y + 5);

// Cartel de cada recinto junto a su puerta (a la izquierda del camino que sale de ella) y cartel de zona a la
// entrada de cada zona de fuera.
for (const e of enclosures) {
  const bottom = e.gateRow === e.y + e.eh - 1;
  at('sign', e.gateX - 1, bottom ? e.gateRow + 1 : e.gateRow - 1);
}
at('sign-zone', SPINE + 2, NORTH + 3, { zone: 'sabana' });
at('sign-zone', RING_L - 2, MID - 1, { zone: 'polo' });
at('sign-zone', RING_R + 2, MID - 1, { zone: 'granja' });
for (const [x, y] of [
  [10, 6], [10, 12], [36, 6], [36, 12], [51, 9], [88, 6], [88, 12], [32, 20], [64, 20], [8, 20], [95, 20],
  [7, 24], [23, 33], [8, 47], [16, 50], [22, 55], [7, 57], [14, 62],
  [78, 50], [99, 50], [86, 60], [97, 60], [82, 25],
]) {
  at('tree', x, y);
}
for (const [x, y] of [[12, 20], [63, 16], [6, 44], [109, 44]]) at('bush', x, y);
// Jardín dentro de la U, como lo dibujó David: cerezos a los dos lados, por dentro del pasillo, y arbustos de
// flores rosas en medio. Solo decora.
for (const [name, x, y] of [
  ['cherry-tree', U.x0 + 3, 9], ['cherry-tree', U.x0 + 3, 12], ['cherry-tree', U.x0 + 3, 15],
  ['cherry-tree', U.x1 - 3, 9], ['cherry-tree', U.x1 - 3, 12], ['cherry-tree', U.x1 - 3, 15],
  ['pink-star', U.x0 + 5, 8], ['pink-star', U.x0 + 5, 10], ['pink-star', U.x0 + 5, 12], ['pink-star', U.x0 + 5, 14],
]) at(name, x, y);
for (const [x, y] of [[30, 16], [10, MID + 2], [RING_R + 4, MID + 2]]) prop('bench', (x + 1) * T, (y + 1) * T);

// Farolas por todo el zoo (David, 2026-11-06: «si hay farolas en la plaza, hay que poner más por los caminos»).
// Se reparten solas: recorriendo los caminos, donde no hay ninguna farola a 7 casillas se pone una en el césped
// de al lado, fuera de los recintos, lejos del muro y sin pegarse a otro adorno.
{
  const isPath = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (data[y * W + x] === PATH || data[y * W + x] === GATE);
  const tileOf = (o) => ({ x: Math.floor(o.x / T), y: Math.floor((o.y - 1) / T) });
  const props = objects.filter((o) => o.type === 'prop').map(tileOf);
  const lamps = objects.filter((o) => o.type === 'prop' && o.properties[0].value === 'lamp').map(tileOf);
  const pens = enclosures.map((e) => ({ x0: e.x, y0: e.y, x1: e.x + e.ew - 1, y1: e.y + e.eh - 1 }));
  const board = objects.find((o) => o.type === 'tablon');
  const boardStand = { x: Math.floor(board.x / T), y: Math.floor(board.y / T) - 1 };
  const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  const free = (x, y) =>
    x >= 2 && x <= W - 2 && y >= 3 && y <= H - 3 &&
    data[y * W + x] === GRASS &&
    // Ni dentro de un recinto ni con su valla encima: el dibujo mide 3 de alto y el brazo sale hacia un lado.
    !pens.some((r) => x + 1 >= r.x0 && x - 1 <= r.x1 && y >= r.y0 && y - 2 <= r.y1) &&
    !props.some((p) => cheb(p, { x, y }) <= 2) &&
    cheb(boardStand, { x, y }) > 1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!isPath(x, y) || lamps.some((l) => cheb(l, { x, y }) <= 7)) continue;
      const spot = [[0, -1], [-1, 0], [1, 0], [0, 1]].map(([dx, dy]) => ({ x: x + dx, y: y + dy })).find((c) => free(c.x, c.y));
      if (!spot) continue;
      at('lamp', spot.x, spot.y);
      lamps.push(spot);
      props.push(spot);
    }
  // Segunda pasada: los tramos que quedaron lejos de toda farola (puertas entre vallas) la buscan a 3 casillas
  // del camino, en el césped que dejen libre.
  const touchesPath = (c) => [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => isPath(c.x + dx, c.y + dy)));
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!isPath(x, y) || lamps.some((l) => cheb(l, { x, y }) <= 8)) continue;
      const near = [];
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) near.push({ x: x + dx, y: y + dy });
      const spot = near
        .filter((c) => free(c.x, c.y) && touchesPath(c))
        .sort((a, b) => cheb(a, { x, y }) - cheb(b, { x, y }))[0];
      if (!spot) continue;
      at('lamp', spot.x, spot.y);
      lamps.push(spot);
      props.push(spot);
    }
}

// Muro del parque (madera sobre piedra) alrededor de todo, con el portón abajo, donde acaba el camino central.
const gatePx = (CX + OX) * T;
for (let x = 0; x < W * T; x += 32) prop('park-wall', x + 16, 2 * T);
for (let x = 0; x < W * T; x += 32) if (x + 32 <= gatePx - 2 * T || x >= gatePx + 2 * T) prop('park-wall', x + 16, H * T);
for (let y = 3; y <= H - 3; y++) {
  prop('park-wall-side', T, y * T);
  prop('park-wall-side', (W - 1) * T, y * T);
}
prop('park-gate', gatePx, H * T);

objects.push({
  id: nextId++, name: 'inicio', type: 'punto', point: true,
  x: (CX - 1 + OX) * T + T / 2, y: (RING_B + 3) * T + T / 2, width: 0, height: 0, rotation: 0, visible: true,
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
