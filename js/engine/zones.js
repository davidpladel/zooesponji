var ZONES = [
  {
    id: 'leon',
    animalId: 'leon',
    label: 'Zona del León',
    enclosure: { x: 3, y: 3, w: 12, h: 10 },
    gates: [{ x: 7, y: 3 }, { x: 10, y: 3 }],
    unlockedByDefault: true,
    shopItem: null,
  },
  {
    id: 'cabra',
    animalId: 'cabra',
    label: 'Zona de la Cabra',
    enclosure: { x: 27, y: 3, w: 12, h: 10 },
    gates: [{ x: 31, y: 3 }, { x: 34, y: 3 }],
    unlockedByDefault: true,
    shopItem: null,
  },
  {
    id: 'pantera',
    animalId: 'pantera',
    label: 'Zona de la Pantera Negra',
    enclosure: { x: 3, y: 21, w: 12, h: 10 },
    gates: [{ x: 7, y: 21 }, { x: 10, y: 21 }],
    unlockedByDefault: false,
    shopItem: { cost: 50, desc: '¡Desbloquea la zona de las panteras negras! Misma mecánica que el león pero más monedas.' },
  },
  {
    id: 'panda',
    animalId: 'panda',
    label: 'Zona del Oso Panda',
    enclosure: { x: 38, y: 3, w: 10, h: 8 },
    gates: [{ x: 42, y: 3 }],
    unlockedByDefault: false,
    shopItem: { cost: 100, desc: '¡Desbloquea la zona de los osos panda! Solo comen zanahorias... y les encantan los conejos.' },
  },
];

var FUTURE_SHOP_ITEMS = [
  { id: 'comida_especial', label: 'Comida especial', cost: '???', image: '🎁', desc: 'Próximamente...' },
  { id: 'delfines', label: 'Zona Delfines', cost: '???', image: '🐬', desc: 'Próximamente...' },
];

var PATHS_H = [
  { x: 1, y: 34, w: 48 },
  { x: 14, y: 18, w: 12 },
  { x: 28, y: 12, w: 12 },
];

var PATHS_V = [
  { x: 25, y: 6, h: 29 },
  { x: 14, y: 14, h: 4 },
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