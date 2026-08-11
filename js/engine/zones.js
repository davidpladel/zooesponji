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
  { x: 1, y: 34, w: 48 },
  { x: 12, y: 24, w: 14 },
  { x: 12, y: 14, w: 26 },
  { x: 1, y: 1, w: 14 },
  { x: 25, y: 1, w: 13 },
  { x: 37, y: 1, w: 12 },
  { x: 10, y: 6, w: 4 },
  { x: 34, y: 6, w: 4 },
  { x: 8, y: 20, w: 5 },
];

var PATHS_V = [
  { x: 25, y: 6, h: 29 },
  { x: 12, y: 2, h: 23 },
  { x: 37, y: 2, h: 13 },
  { x: 12, y: 14, h: 5 },
];