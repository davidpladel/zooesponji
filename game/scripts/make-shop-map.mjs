// Genera public/assets/maps/tienda.tmj: el interior de la tienda (20x12), lógico (suelo/pared/mueble).
// El arte lo pone ShopInterior en el juego; sin arte se pinta con colores. La cuidadora anda por aquí (fase B).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 20;
const H = 12;
const T = 16;
const FLOOR = 1;
const WALL = 2;
const FURNITURE = 3;

const data = new Array(W * H).fill(FLOOR);
const fill = (x0, y0, x1, y1, gid) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) data[y * W + x] = gid;
};
fill(0, 0, W - 1, 3, WALL); // pared de fondo (64 px)
fill(5, 4, W - 1, 4, FURNITURE); // estanterías contra la pared
fill(1, 4, 4, 6, FURNITURE); // mostrador y el hueco del tendero
fill(0, 10, 4, 10, FURNITURE); // cajas de fruta abajo a la izquierda
fill(19, 8, 19, 9, FURNITURE); // barril
fill(0, 11, 0, 11, FURNITURE); // planta de la esquina izquierda
fill(19, 11, 19, 11, FURNITURE); // planta de la esquina derecha

const objects = [];
let nextId = 1;
const point = (type, x, y, properties = []) =>
  objects.push({ id: nextId++, name: `${type}-${nextId}`, type, point: true, x, y, width: 0, height: 0, rotation: 0, visible: true, properties });
const deco = (pieza, x, y, extra = {}) => {
  const properties = [{ name: 'pieza', type: 'string', value: pieza }];
  if (extra.z) properties.push({ name: 'z', type: 'int', value: extra.z });
  if (extra.flat) properties.push({ name: 'flat', type: 'bool', value: true });
  point('deco', x, y, properties);
};

point('tendero', 48, 92);
point('puertaInterior', 192, 186);
// Peanas en arco, de izquierda a derecha, bien arriba para que quede sitio delante de la puerta.
[[112, 126], [152, 114], [192, 108], [232, 114], [272, 126]].forEach(([x, y], orden) =>
  point('peana', x, y, [{ name: 'orden', type: 'int', value: orden }]),
);

// Pared: ventanas (de ellas sale la luz), reloj y cuadros. Arriba en el centro cuelga el cartel.
deco('window', 40, 38);
deco('window', 120, 36);
deco('window', 224, 36);
deco('clock', 80, 34);
deco('frames', 272, 34);
// Muebles contra la pared (base en y=80).
deco('plant', 88, 80);
deco('shelf-wide', 128, 80);
deco('shelf-a', 176, 80);
deco('bookcase', 216, 80);
deco('shelf-b', 256, 80);
deco('shelf-wide', 296, 80);
// Mostrador con velas y cesta de pan encima.
deco('counter', 48, 112);
deco('candles', 64, 114, { z: 30 });
deco('bread', 30, 114, { z: 30 });
// Alfombra bajo las peanas.
deco('rug', 192, 118, { flat: true });
// Esquinas: fruta, barril y plantas.
deco('crate-green', 16, 176);
deco('crate-yellow', 32, 176);
deco('crate-red', 48, 176);
deco('barrel', 308, 150);
deco('plant', 10, 190);
deco('plant', 308, 190);
// Flores (piezas del zoo) junto a las plantas y el barril.
deco('flowers', 28, 192);
deco('flowers', 290, 192);
deco('flowers-red', 292, 160);

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
    firstgid: 1, name: 'interior', image: '../tiles/placeholder.png', imagewidth: T * 3, imageheight: T,
    tilewidth: T, tileheight: T, tilecount: 3, columns: 3, margin: 0, spacing: 0,
    tiles: [{ id: FLOOR - 1, properties: walkable }],
  }],
};

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../public/assets/maps/tienda.tmj');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 1) + '\n');
console.log('Mapa generado en', out);
