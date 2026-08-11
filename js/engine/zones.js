var ZONES = [
  {
    id: 'leon',
    animalId: 'leon',
    label: 'Zona del León',
    enclosure: { x: 3, y: 3, w: 12, h: 10 },
    gates: [{ x: 7, y: 2 }],
    unlockedByDefault: true,
    shopItem: null,
  },
  {
    id: 'cabra',
    animalId: 'cabra',
    label: 'Zona de la Cabra',
    enclosure: { x: 27, y: 3, w: 12, h: 10 },
    gates: [{ x: 31, y: 2 }],
    unlockedByDefault: true,
    shopItem: null,
  },
  {
    id: 'pantera',
    animalId: 'pantera',
    label: 'Zona de la Pantera Negra',
    enclosure: { x: 3, y: 21, w: 12, h: 10 },
    gates: [{ x: 7, y: 20 }],
    unlockedByDefault: false,
    shopItem: { cost: 50, desc: '¡Desbloquea la zona de las panteras negras! Misma mecánica que el león pero más monedas.' },
  },
  {
    id: 'panda',
    animalId: 'panda',
    label: 'Zona del Oso Panda',
    enclosure: { x: 39, y: 3, w: 9, h: 8 },
    gates: [{ x: 42, y: 2 }],
    unlockedByDefault: false,
    shopItem: { cost: 100, desc: '¡Desbloquea la zona de los osos panda! Solo comen zanahorias... y les encantan los conejos.' },
  },
];

var FUTURE_SHOP_ITEMS = [
  { id: 'comida_especial', label: 'Comida especial', cost: '???', image: '🎁', desc: 'Próximamente...' },
  { id: 'delfines', label: 'Zona Delfines', cost: '???', image: '🐬', desc: 'Próximamente...' },
];

var PATHS_H = [
{ x: 2, y: 31, w: 29 },
{ x: 4, y: 31, w: 8 },
{ x: 14, y: 31, w: 1 },
{ x: 16, y: 31, w: 4 },
{ x: 2, y: 32, w: 9 },
{ x: 6, y: 32, w: 3 },
{ x: 15, y: 32, w: 16 },
{ x: 19, y: 32, w: 2 },
{ x: 19, y: 32, w: 1 },
{ x: 24, y: 32, w: 2 },
{ x: 6, y: 33, w: 6 },
{ x: 8, y: 33, w: 2 },
{ x: 13, y: 33, w: 6 },
{ x: 15, y: 33, w: 1 },
{ x: 20, y: 33, w: 25 },
{ x: 22, y: 33, w: 1 },
{ x: 24, y: 33, w: 1 },
{ x: 26, y: 33, w: 3 },
{ x: 33, y: 33, w: 5 },
{ x: 39, y: 33, w: 4 },
{ x: 5, y: 34, w: 5 },
{ x: 6, y: 34, w: 2 },
{ x: 16, y: 34, w: 1 },
{ x: 16, y: 34, w: 1 },
{ x: 18, y: 34, w: 1 },
{ x: 20, y: 34, w: 1 },
{ x: 27, y: 34, w: 1 },
{ x: 29, y: 34, w: 16 },
{ x: 36, y: 34, w: 1 },
{ x: 39, y: 34, w: 1 },
{ x: 41, y: 34, w: 2 },
{ x: 31, y: 35, w: 4 },
{ x: 32, y: 35, w: 1 },
{ x: 32, y: 35, w: 1 },
{ x: 34, y: 35, w: 1 }
];

var PATHS_V = [
  { x: 5, y: 31, h: 4 },
   { x: 10, y: 31, h: 4 },
   { x: 11, y: 31, h: 4 },
   { x: 11, y: 31, h: 3 },
   { x: 13, y: 31, h: 4 },
   { x: 13, y: 31, h: 3 },
   { x: 14, y: 31, h: 4 },
   { x: 3, y: 32, h: 3 },
   { x: 4, y: 32, h: 4 },
   { x: 12, y: 32, h: 3 },
   { x: 12, y: 32, h: 2 },
   { x: 15, y: 32, h: 3 },
   { x: 17, y: 32, h: 3 },
   { x: 19, y: 32, h: 3 },
   { x: 2, y: 33, h: 3 },
   { x: 4, y: 33, h: 2 },
   { x: 28, y: 33, h: 2 },
   { x: 30, y: 33, h: 3 },
   { x: 31, y: 33, h: 3 },
   { x: 35, y: 33, h: 3 },
  { x: 30, y: 21, h: 3 },
   { x: 31, y: 21, h: 3 },
   { x: 31, y: 21, h: 2 },
   { x: 27, y: 22, h: 4 },
   { x: 29, y: 22, h: 3 },
   { x: 22, y: 23, h: 5 },
   { x: 24, y: 23, h: 8 },
   { x: 25, y: 23, h: 8 },
   { x: 21, y: 24, h: 2 },
   { x: 23, y: 24, h: 7 },  
 { x: 29, y: 17, w: 4 },
{ x: 29, y: 18, w: 4 },
{ x: 29, y: 19, w: 4 },
{ x: 29, y: 20, w: 4 },
{ x: 30, y: 22, w: 1 },
{ x: 18, y: 23, w: 12 },
{ x: 24, y: 23, w: 3 },
{ x: 18, y: 24, w: 11 },
{ x: 21, y: 24, w: 1 },
{ x: 23, y: 24, w: 1 },
{ x: 23, y: 24, w: 1 },
{ x: 23, y: 24, w: 1 },
{ x: 26, y: 25, w: 1 },
{ x: 22, y: 27, w: 1 },
{ x: 24, y: 27, w: 1 },
{ x: 21, y: 30, w: 2 },
{ x: 24, y: 30, w: 1 },
{ x: 26, y: 30, w: 1 }
];

function getZoneForAnimal(animalId) {
  for (var i = 0; i < ZONES.length; i++) {
    if (ZONES[i].animalId === animalId) return ZONES[i];
  }
  return null;
}

function getZoneAt(tx, ty) {
  for (var i = 0; i < ZONES.length; i++) {
    var e = ZONES[i].enclosure;
    if (tx >= e.x && tx < e.x + e.w && ty >= e.y && ty < e.y + e.h) {
      return ZONES[i];
    }
  }
  return null;
}

function zoneCenterGameCoords(zone) {
  var e = zone.enclosure;
  return {
    x: (e.x + e.w / 2) * TILE_SIZE,
    y: (e.y + e.h / 2) * TILE_SIZE,
  };
}