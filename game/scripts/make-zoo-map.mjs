// Genera public/assets/maps/zoo.tmj: el zoo de verdad (117x75), lógico (césped/camino/valla/puerta/edificio).
// El arte real lo pone el autotiler en el juego; este mapa también sirve en modo provisional.
//
// Trazado del 2026-11-06 (plaza grande y recintos de al menos 14x9 por dentro): el parque del centro pasó de
// 48x35 a 55x49 casillas, con una plaza de 15x13 en el cruce. Lo de fuera (sabana arriba, polo a la izquierda,
// granja a la derecha) conserva su sitio respecto al parque; las avenidas y atajos se alargan con él.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 117;
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
// El dibujo tiene el mostrador con fruta en las casillas 2-3 y la puerta en la 4 (px 48-64): la puerta del mapa
// empieza en la 4 (2026-11-07; antes caía bajo el mostrador). Es de 2 casillas, como el camino que baja de ella.
const SHOP = { x: 28, y: 4 };
/** Primera casilla (en el parque) de la puerta de la tienda y del camino que baja de ella. */
const SHOP_DOOR_X = SHOP.x + 3;
pfill(SHOP.x, SHOP.y, SHOP.x + 4, SHOP.y + 4, BUILDING);
pfill(SHOP_DOOR_X, SHOP.y + 5, SHOP_DOOR_X + 1, SHOP.y + 5, GATE);
pfill(SHOP_DOOR_X, SHOP.y + 6, SHOP_DOOR_X + 1, PLAZA.y0 - 1, PATH);
// Abajo cae sobre la esquina recortada de la plaza: un codo de 2 de alto lo lleva a la izquierda, donde ya es plaza.
pfill(SHOP_DOOR_X - 2, PLAZA.y0 - 2, SHOP_DOOR_X - 1, PLAZA.y0 - 1, PATH);
objects.push({ id: nextId++, name: 'tienda', type: 'tienda', x: (SHOP.x + OX) * T, y: (SHOP.y + OY) * T, width: 5 * T, height: 5 * T, rotation: 0, visible: true });
objects.push({ id: nextId++, name: 'puerta-tienda', type: 'puertaTienda', x: (SHOP_DOOR_X + OX) * T, y: (SHOP.y + 5 + OY) * T, width: 2 * T, height: T, rotation: 0, visible: true });

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
const WALK = /^(grass|flowers|sunflowers|rock|boulder|plateau|cave|lilypad|pebble|daisies|fern|cattails|reeds)/;
const prop = (name, px, py, { block = null, flat = false, z = 0, zone = null, solid = false, flip = false } = {}) => {
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
  if (flip) properties.push({ name: 'flip', type: 'bool', value: true });
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
/**
 * Farola en la casilla (tx,ty). El dibujo mide 32 px con el poste a la izquierda y el brazo hacia la derecha:
 * se apoya en el borde derecho de la casilla para que el pie del poste caiga entero en ella (en el césped) y
 * no en la tierra del camino de al lado. Si el camino queda a su izquierda (y no a su derecha), se dibuja
 * volteada (`flip`): el poste sigue en la misma casilla y el farol cuelga sobre el camino (David, 2026-11-07).
 */
const isPathTile = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (data[y * W + x] === PATH || data[y * W + x] === GATE);
// Qué farola según dónde va el camino (David, 2026-11-08, con las 4 del pack):
// - a un lado: la de brazo, con el farol hacia él (D, o B volteada);
// - por debajo: la de frente (C), el farol hacia el camino;
// - por encima: la de espaldas (A), el farol hacia atrás, sobre el camino.
const lampAt = (tx, ty) => {
  const left = isPathTile(tx - 1, ty);
  const right = isPathTile(tx + 1, ty);
  if (left || right) return prop('lamp', (tx + 1) * T, (ty + 1) * T, { flip: left && !right });
  const below = [1, 2, 3].find((d) => isPathTile(tx, ty + d)) ?? Infinity;
  const above = [1, 2, 3].find((d) => isPathTile(tx, ty - d)) ?? Infinity;
  return at(above < below ? 'lamp-back' : 'lamp-front', tx, ty);
};
/** Prop apoyado en la casilla (tx,ty) del mapa: centro horizontal de la casilla, borde inferior. */
const at = (name, tx, ty, opts) => prop(name, tx * T + T / 2, (ty + 1) * T, opts);
/** Lo mismo, en coordenadas del parque de siempre. */
const pat = (name, tx, ty, opts) => at(name, tx + OX, ty + OY, opts);
const pprop = (name, px, py, opts) => prop(name, px + OX * T, py + OY * T, opts);
/** Ancho (px) de las piezas con volumen que no dan su bloqueo: se bloquea su base (ancho × 1 casilla). */
const BASE_W = {
  'pine-small': 16, 'jungle-tree': 32, 'bush-jungle': 32, 'pine-snow-small': 16, stump: 32, bush: 16,
  'log-savannah': 48, 'log-alpine': 48, 'log-moss': 48, 'tree-grassland': 16, 'jungle-tree-vines': 32,
  shelter: 48, trough: 16, barrel: 16, pumpkin: 16, scarecrow: 16, well: 16,
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
/**
 * Charca de 48x48 (pieza plana y animada) con su zona de agua de 3x3 casillas, en coordenadas del interior.
 * `rows`: alto del agua en casillas (la cascada de hielo mide 5).
 */
const pondIn = (e, place) => (name, cx, cy, rows = 3) => {
  place(name, cx, cy, { flat: true });
  water('agua', e.x + 1 + cx - 1, e.y + 1 + cy - rows + 1, e.x + 1 + cx + 1, e.y + 1 + cy);
};
const pond = Object.fromEntries(enclosures.map((e, i) => [e.penId, pondIn(e, [leon, cabra, pantera, panda, sabana, africanos, asiaticos, pinguinos, ovejas, estanque, establo][i])]));

// Paisaje de cada especie (2026-11-06). Interior de 14x9 casillas salvo la sabana (20x10), la pantera
// (14x10) y el estanque (14x11). Criterios: sombra (árbol) en una esquina del fondo, un sitio alto (rocas,
// meseta) que se vea desde el camino, el agua lejos de la puerta, la puerta y su frente despejados, y lo alto
// (bambú, árboles) al fondo para no tapar a los animales. El fondo es el lado contrario a la puerta.

// 🦁 Leones (puerta abajo, columnas 6-7): sabana seca con una acacia grande de sombra y su roca para tumbarse.
leon('acacia', 2, 3, { block: [32, 16] });
leon('acacia-small', 12, 2, { block: [16, 16] });
leon('rock-savannah-big', 9, 4);
leon('rock-savannah', 5, 2);
leon('log-savannah', 11, 6);
for (const [cx, cy] of [[4, 6], [1, 7], [7, 1], [10, 1], [13, 5]]) leon('grass-tall-dry', cx, cy);
leon('grass-tall-dry-big', 1, 5);
// 🐐 Cabras (puerta abajo): montaña con meseta y cueva para trepar, pino de sombra y flores alpinas.
cabra('plateau', 11, 5, { flat: true });
cabra('cave', 4, 2);
cabra('pine', 1, 2, { block: [16, 16] });
cabra('pine-small', 12, 8);
cabra('rock-grey', 7, 3);
cabra('rock-grey-big', 5, 6);
cabra('boulder-alpine', 9, 7);
cabra('log-alpine', 2, 8);
cabra('flowers-alpine-red', 2, 6);
cabra('flowers-alpine-white', 8, 1);
cabra('flowers-alpine-purple', 13, 1);
// 🐆 Pantera (puerta arriba): selva con catarata al fondo a la derecha. La catarata (7x7) está montada como
// enseña el autor del pack: acantilado a cada lado, la cascada en medio y el agua al pie.
pantera('waterfall', 10, 9, { flat: true });
{
  // Casilla de apoyo de la catarata (centro abajo de la pieza): la cascada son las 3 columnas del medio
  // (5 filas) y la poza, las 2 filas de abajo de esas columnas. Los lados son roca: se pisan.
  const tx = enclosures[2].x + 1 + 10;
  const ty = enclosures[2].y + 1 + 9;
  water('agua', tx - 1, ty - 6, tx + 1, ty - 2);
  water('agua', tx - 1, ty - 1, tx + 1, ty);
}
pantera('lilypad', 11, 8, { flat: true, z: 2 });
pantera('jungle-tree-vines', 2, 9, { block: [32, 16] });
pantera('palm', 4, 6, { block: [16, 8] });
pantera('bush-jungle', 1, 7);
pantera('rock-moss-big', 4, 2);
pantera('rock-moss', 11, 1);
for (const [cx, cy] of [[2, 1], [5, 8], [13, 1]]) pantera('fern', cx, cy);
pantera('flowers-red', 9, 1);
pantera('flowers-red', 3, 4);
// 🐼 Panda (puerta arriba): bosquecillo de bambú al fondo, charca, tronco y rocas con musgo.
panda('bamboo-big', 12, 8, { block: [32, 16] });
panda('bamboo-mid', 9, 8, { block: [32, 16] });
panda('bamboo-small', 3, 8, { block: [16, 16] });
pond.panda('pond-rainforest', 11, 4);
panda('log', 3, 4, { block: [32, 16] });
panda('stump', 8, 5);
panda('rock-moss', 1, 2);
panda('rock-moss-big', 5, 6);
panda('flowers', 3, 1);
panda('flowers-red', 9, 2);
// 🦒 Sabana grande (interior 20x10, puerta abajo en las columnas 9-10): acacias, charca y hierba alta.
sabana('acacia', 3, 3, { block: [32, 16] });
sabana('acacia', 16, 2, { block: [32, 16] });
sabana('acacia-small', 13, 6, { block: [16, 16] });
pond.sabana('water-savannah', 16, 8);
sabana('rock-savannah-big', 8, 2);
sabana('rock-savannah', 12, 8);
sabana('rock-savannah', 1, 8);
for (const [cx, cy] of [[5, 2], [11, 3], [2, 6], [19, 4], [7, 7]]) sabana('grass-tall-dry', cx, cy);
sabana('grass-tall-dry-big', 1, 1);
// 🐘 Elefantes africanos: charca para refrescarse al fondo, acacia de sombra, roca y tronco.
pond['elefantes-africanos']('water-savannah', 11, 4);
africanos('acacia', 2, 3, { block: [32, 16] });
africanos('rock-savannah-big', 6, 2);
africanos('log-savannah', 10, 7);
for (const [cx, cy] of [[4, 6], [13, 1]]) africanos('grass-tall-dry', cx, cy);
// 🐘 Elefantes asiáticos: selva de Asia con charca, palmeras, bambú y rocas con musgo.
pond['elefantes-asiaticos']('water-savannah', 11, 4); // la charca alpina trae suelo gris: no casa con la sabana
asiaticos('palm', 1, 3, { block: [16, 8] });
asiaticos('palm', 8, 2, { block: [16, 8] });
asiaticos('jungle-tree', 5, 2);
asiaticos('bamboo-small', 12, 8, { block: [16, 16] });
asiaticos('rock-moss', 4, 5);
asiaticos('rock-moss-big', 9, 6);
// 🐧 Pingüinos (puerta abajo): cascada de hielo al fondo que cae en la charca, placa de hielo y nieve.
pond.pinguinos('ice-waterfall', 11, 4, 5);
pond.pinguinos('pond-tundra', 11, 7);
pinguinos('ice-floe', 3, 4, { flat: true });
pinguinos('rock-snow-big', 7, 2);
pinguinos('rock-snow', 1, 7);
pinguinos('rock-snow', 8, 6);
pinguinos('pine-snow', 1, 2, { block: [16, 16] });
pinguinos('pine-snow-small', 0, 5);
// 🐑 Ovejas (puerta abajo): pradera de margaritas y girasoles con un árbol de sombra. Aquí entran también
// los visitantes.
ovejas('tree-grassland', 1, 2);
ovejas('stump', 5, 2);
ovejas('rock-grassland', 8, 4);
ovejas('rock-grassland-big', 11, 4);
for (const [cx, cy] of [[3, 4], [9, 2], [11, 7], [4, 7], [13, 1]]) ovejas('daisies', cx, cy);
ovejas('sunflowers', 12, 2);
ovejas('sunflowers', 0, 6);
ovejas('flowers', 2, 2);
// 🦆 Estanque (interior 14x11, puerta abajo en las columnas 6-7): un lago de 6x6 casillas arriba con
// juncos en la orilla, y la orilla de abajo, por donde pasean los patos y entra la cuidadora.
const lakeLeft = (enclosures[9].x + 2) * T;
const lakeTop = (enclosures[9].y + 2) * T;
prop('lake-grassland', lakeLeft + 48, lakeTop + 96, { flat: true });
water('agua', lakeLeft / T, lakeTop / T, lakeLeft / T + 5, lakeTop / T + 5);
estanque('lilypad', 2, 2, { flat: true, z: 2 });
estanque('lilypad-flower', 5, 4, { flat: true, z: 2 });
estanque('lilypad', 3, 5, { flat: true, z: 2 });
estanque('cattails', 7, 3);
estanque('reeds', 7, 6);
estanque('cattails', 0, 5);
estanque('reeds', 4, 7);
estanque('rock-wetland', 9, 2);
estanque('rock-wetland', 12, 6);
estanque('sunflowers', 12, 9);
estanque('flowers', 0, 9);
// 🐴 Establo (puerta arriba): granja con cobertizo al fondo, bebedero, barril, calabazas y espantapájaros.
establo('shelter', 11, 8);
establo('trough', 8, 7);
establo('barrel', 13, 8);
establo('pumpkin', 2, 7);
establo('pumpkin', 4, 8);
establo('scarecrow', 2, 4);
establo('bush', 0, 1);
establo('sunflowers', 13, 2);
for (const [cx, cy] of [[4, 3], [10, 3]]) establo('flowers', cx, cy);

// Parque.
// La fuente animada en el centro de la plaza (80x64): su isla de césped es del mismo tamaño, así que su bloqueo
// (sólida: la cuidadora no se mete en el agua) no tapa camino.
pprop('fountain', (ISLAND.x0 + ISLAND.x1 + 1) / 2 * T, (ISLAND.y1 + 1) * T, { block: [80, 64], solid: true });
// Plaza: una farola en cada esquina recortada y dos bancos a cada lado, en el césped junto al borde.
// Arriba van en la casilla de debajo de la esquina (también recortada): en la esquina misma la farola, que mide
// 3 de alto, se montaría sobre la valla de los leones y de las cabras.
for (const [x, y] of [[PLAZA.x0, PLAZA.y0 + 1], [PLAZA.x1, PLAZA.y0 + 1]]) lampAt(x + OX, y + OY);
// Abajo, en la casilla de al lado de la esquina, con el farol hacia la plaza: la izquierda mira a la derecha (D) y
// la derecha, volteada, a la izquierda (B) (David, 2026-11-08).
prop('lamp', (PLAZA.x0 + 1 + OX + 1) * T, (PLAZA.y1 + OY + 1) * T);
prop('lamp', (PLAZA.x1 - 1 + OX + 1) * T, (PLAZA.y1 + OY + 1) * T, { flip: true });
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
pat('crate-fruit', SHOP.x + 1, SHOP.y + 5); // bajo el mostrador de la fruta (la puerta está a la derecha)

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

// Entrada: una farola a cada lado del camino nada más pasar el portón, con el farol hacia el camino (David,
// 2026-11-08: la que salía detrás del portón no pegaba). Con ellas, el reparto de abajo ya no pone otra allí.
// Una casilla apartadas del camino, como las de los cruces: el farol cuelga sobre el césped de su borde.
prop('lamp', (CX - 3 + OX + 1) * T, (PH + OY + 1) * T);
prop('lamp', (CX + 2 + OX + 1) * T, (PH + OY + 1) * T, { flip: true });

// Farolas por todo el zoo (David, 2026-11-06: «si hay farolas en la plaza, hay que poner más por los caminos»).
// Se reparten solas: recorriendo los caminos, donde no hay ninguna farola a 7 casillas se pone una en el césped
// de al lado, fuera de los recintos, lejos del muro y sin pegarse a otro adorno.
{
  const isPath = isPathTile;
  const tileOf = (o) => ({ x: Math.floor((o.x - 1) / T), y: Math.floor((o.y - 1) / T) });
  const props = objects.filter((o) => o.type === 'prop').map(tileOf);
  const lamps = objects.filter((o) => o.type === 'prop' && o.properties[0].value.startsWith('lamp')).map(tileOf);
  const pens = enclosures.map((e) => ({ x0: e.x, y0: e.y, x1: e.x + e.ew - 1, y1: e.y + e.eh - 1 }));
  const board = objects.find((o) => o.type === 'tablon');
  const boardStand = { x: Math.floor(board.x / T), y: Math.floor(board.y / T) - 1 };
  const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  const free = (x, y) =>
    // Con su dibujo (2x3 casillas) lejos del muro: a la derecha cabe del todo, arriba no toca la fila del muro.
    x >= 2 && x + 1 <= W - 3 && y >= 4 && y <= H - 3 &&
    data[y * W + x] === GRASS &&
    !(x > U.x0 + 1 && x < U.x1 - 1 && y > U.top + 1 && y < NORTH) && // el jardín de la U es solo de flores
    // Ni dentro de un recinto ni con su valla encima: el dibujo mide 3 de alto y el brazo sale hacia un lado.
    !pens.some((r) => x + 1 >= r.x0 && x <= r.x1 && y >= r.y0 && y - 2 <= r.y1) && // ocupa su casilla y la de la derecha
    !props.some((p) => cheb(p, { x, y }) <= 2) &&
    cheb(boardStand, { x, y }) > 1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!isPath(x, y) || lamps.some((l) => cheb(l, { x, y }) <= 7)) continue;
      const spot = [[0, -1], [-1, 0], [1, 0], [0, 1]].map(([dx, dy]) => ({ x: x + dx, y: y + dy })).find((c) => free(c.x, c.y));
      if (!spot) continue;
      lampAt(spot.x, spot.y);
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
      lampAt(spot.x, spot.y);
      lamps.push(spot);
      props.push(spot);
    }
}

// Muro del parque (madera sobre piedra) alrededor de todo, con el portón abajo, donde acaba el camino central.
const gatePx = (CX + OX) * T;
for (let x = 0; x < W * T; x += 32) prop('park-wall', x + 16, 2 * T);
// Abajo, los tramos (32 px) salen de los dos lados del portón (64 px), pegados a él: en la rejilla fija de 32 px
// quedaba un hueco de media pieza junto al portón (David, 2026-11-08).
const GATE_HALF = 32;
for (let x = gatePx - GATE_HALF - 16; x > -16; x -= 32) prop('park-wall', x, H * T);
for (let x = gatePx + GATE_HALF + 16; x < W * T + 16; x += 32) prop('park-wall', x, H * T);
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
