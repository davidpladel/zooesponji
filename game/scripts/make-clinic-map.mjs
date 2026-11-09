// Genera public/assets/maps/clinica.tmj: el interior de la clínica (20x12), con la misma forma que la tienda
// (make-shop-map.mjs) para reutilizar su dibujo y su paseo. Lógico (suelo/pared/mueble); el arte lo pone el juego.
// En vez de peanas hay dos camillas, y detrás del mostrador están el veterinario y la veterinaria.
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
fill(5, 4, W - 1, 4, FURNITURE); // armarios contra la pared
fill(1, 4, 4, 6, FURNITURE); // mostrador y el hueco de los veterinarios
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

// El veterinario va donde el tendero; la veterinaria, a su lado.
point('tendero', 36, 92);
point('veterinaria', 64, 92);
point('puertaInterior', 192, 186);
// Dos camillas, separadas, con sitio delante para acercarse.
[[120, 120], [264, 120]].forEach(([x, y], orden) => point('peana', x, y, [{ name: 'orden', type: 'int', value: orden }]));

deco('window', 40, 38);
deco('window', 120, 36);
deco('window', 224, 36);
deco('clock', 80, 34);
deco('frames', 272, 34);
deco('plant', 88, 80);
deco('shelf-wide', 128, 80);
deco('bookcase', 176, 80);
deco('shelf-a', 216, 80);
deco('shelf-wide', 296, 80);
deco('counter', 48, 112);
deco('barrel', 308, 150);
deco('plant', 10, 190);
deco('plant', 308, 190);
deco('flowers', 28, 192);
deco('flowers', 290, 192);

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

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../public/assets/maps/clinica.tmj');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 1) + '\n');
console.log('Mapa generado en', out);
