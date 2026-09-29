// Genera public/assets/maps/test-map.tmj: mapa de prueba 40x30 con caminos,
// 4 recintos vallados con puerta y punto de inicio. Tileset "placeholder"
// de 4 tiles (la textura se genera en código en BootScene).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 40;
const H = 30;
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
const hLine = (y, x0, x1, gid) => {
  for (let x = x0; x <= x1; x++) set(x, y, gid);
};
const vLine = (x, y0, y1, gid) => {
  for (let y = y0; y <= y1; y++) set(x, y, gid);
};

// Caminos: anillo exterior + cruz central de 2 tiles de ancho.
hLine(2, 2, 37, PATH);
hLine(27, 2, 37, PATH);
vLine(2, 2, 27, PATH);
vLine(37, 2, 27, PATH);
hLine(14, 2, 37, PATH);
hLine(15, 2, 37, PATH);
vLine(19, 2, 27, PATH);
vLine(20, 2, 27, PATH);

const enclosures = [
  { animalId: 'leon', x: 5, y: 5, gate: { x: 10, y: 11 }, link: [{ x: 10, y: 12 }, { x: 10, y: 13 }] },
  { animalId: 'cabra', x: 24, y: 5, gate: { x: 29, y: 11 }, link: [{ x: 29, y: 12 }, { x: 29, y: 13 }] },
  { animalId: 'pantera', x: 5, y: 18, gate: { x: 10, y: 18 }, link: [{ x: 10, y: 16 }, { x: 10, y: 17 }] },
  { animalId: 'panda', x: 24, y: 18, gate: { x: 29, y: 18 }, link: [{ x: 29, y: 16 }, { x: 29, y: 17 }] },
];
const EW = 11;
const EH = 7;

const objects = [];
let nextId = 1;
for (const e of enclosures) {
  hLine(e.y, e.x, e.x + EW - 1, FENCE);
  hLine(e.y + EH - 1, e.x, e.x + EW - 1, FENCE);
  vLine(e.x, e.y, e.y + EH - 1, FENCE);
  vLine(e.x + EW - 1, e.y, e.y + EH - 1, FENCE);
  set(e.gate.x, e.gate.y, GATE);
  for (const p of e.link) set(p.x, p.y, PATH);

  const animalProp = [{ name: 'animalId', type: 'string', value: e.animalId }];
  objects.push({
    id: nextId++, name: `recinto-${e.animalId}`, type: 'recinto',
    x: e.x * T, y: e.y * T, width: EW * T, height: EH * T,
    rotation: 0, visible: true, properties: animalProp,
  });
  objects.push({
    id: nextId++, name: `puerta-${e.animalId}`, type: 'puerta',
    x: e.gate.x * T, y: e.gate.y * T, width: T, height: T,
    rotation: 0, visible: true, properties: animalProp,
  });
}
// Tienda: edificio 3x3 junto a la cruz central, con la puerta hacia el camino (col 19).
for (let y = 5; y <= 7; y++) hLine(y, 16, 18, BUILDING);
set(18, 6, GATE);
objects.push({
  id: nextId++, name: 'tienda', type: 'tienda',
  x: 16 * T, y: 5 * T, width: 3 * T, height: 3 * T, rotation: 0, visible: true,
});
objects.push({
  id: nextId++, name: 'puerta-tienda', type: 'puertaTienda',
  x: 18 * T, y: 6 * T, width: T, height: T, rotation: 0, visible: true,
});
objects.push({
  id: nextId++, name: 'inicio', type: 'punto', point: true,
  x: 19 * T + T / 2, y: 15 * T + T / 2, width: 0, height: 0, rotation: 0, visible: true,
});

const walkable = [{ name: 'walkable', type: 'bool', value: true }];
const map = {
  compressionlevel: -1,
  width: W,
  height: H,
  tilewidth: T,
  tileheight: T,
  infinite: false,
  orientation: 'orthogonal',
  renderorder: 'right-down',
  tiledversion: '1.11.0',
  type: 'map',
  version: '1.10',
  nextlayerid: 3,
  nextobjectid: nextId,
  layers: [
    { id: 1, name: 'suelo', type: 'tilelayer', width: W, height: H, x: 0, y: 0, opacity: 1, visible: true, data },
    { id: 2, name: 'objetos', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true, objects },
  ],
  tilesets: [
    {
      firstgid: 1,
      name: 'placeholder',
      image: '../tiles/placeholder.png',
      imagewidth: T * 5,
      imageheight: T,
      tilewidth: T,
      tileheight: T,
      tilecount: 5,
      columns: 5,
      margin: 0,
      spacing: 0,
      // id = gid - firstgid: 1 = camino, 3 = puerta
      tiles: [
        { id: PATH - 1, properties: walkable },
        { id: GATE - 1, properties: walkable },
      ],
    },
  ],
};

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../public/assets/maps/test-map.tmj');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 1) + '\n');
console.log('Mapa generado en', out);
