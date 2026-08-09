const APP_VERSION = (typeof window !== 'undefined' && window.APP_VERSION) || '1.0.0';
const IMG_V = APP_VERSION;

const ANIMALS = ['leon', 'cabra', 'pantera', 'panda'];
const FOODS = ['piedra', 'carne', 'conejo', 'zanahoria'];

const ANIMAL_LABELS = { leon: 'León', cabra: 'Cabra', pantera: 'Pantera negra', panda: 'Oso panda' };
const ANIMAL_EMOJI = { leon: '🦁', cabra: '🐐', pantera: '🐆', panda: '🐼' };

const ANIMAL_STATE_IMAGE = {
  leon: {
    normal: `assets/img/leon-normal.png?v=${IMG_V}`,
    come: `assets/img/leon-contentos.png?v=${IMG_V}`,
    rechaza: `assets/img/leon-enfadado.png?v=${IMG_V}`,
  },
  cabra: {
    normal: `assets/img/cabras-normal.png?v=${IMG_V}`,
    come: `assets/img/cabras-contentas.png?v=${IMG_V}`,
    rechaza: `assets/img/cabras-enfadadas.png?v=${IMG_V}`,
    especial: `assets/img/cabras-con-el-conejo-especial.png?v=${IMG_V}`,
  },
  pantera: {
    normal: `assets/img/pantera-normal.png?v=${IMG_V}`,
    come: `assets/img/pantera-contenta.png?v=${IMG_V}`,
    rechaza: `assets/img/pantera-enfadada.png?v=${IMG_V}`,
  },
  panda: {
    normal: `assets/img/panda-normal.png?v=${IMG_V}`,
    come: `assets/img/panda-contento.png?v=${IMG_V}`,
    rechaza: `assets/img/panda-enfadado.png?v=${IMG_V}`,
    especial: `assets/img/panda-conejo-especial.png?v=${IMG_V}`,
  },
};

const FOOD_LABELS = { piedra: 'Piedra', carne: 'Carne', conejo: 'Conejo', zanahoria: 'Zanahoria' };
const FOOD_EMOJI = { piedra: '🪨', carne: '🥩', conejo: '🐇', zanahoria: '🥕' };
const FOOD_IMAGE = {
  piedra: 'assets/img/piedra.png',
  carne: 'assets/img/carne.png',
  conejo: 'assets/img/conejo.png',
  zanahoria: 'assets/img/zanahoria.png',
};

const REACTIONS = {
  leon: { carne: 'come', conejo: 'come', piedra: 'rechaza', zanahoria: 'rechaza' },
  cabra: { carne: 'rechaza', conejo: 'especial', piedra: 'come', zanahoria: 'come' },
  pantera: { carne: 'come', conejo: 'come', piedra: 'rechaza', zanahoria: 'rechaza' },
  panda: { carne: 'rechaza', conejo: 'especial', piedra: 'rechaza', zanahoria: 'come' },
};

const ANIMAL_COINS = {
  leon: { come: 1 },
  cabra: { come: 1, especial: 2 },
  pantera: { come: 2 },
  panda: { come: 2, especial: 4 },
};

const ZOO_MAP_IMAGE = `assets/img/mapa-zoo-2-zonas-mapa-todo-activo.png?v=${IMG_V}`;
const ZOO_LOCK_IMAGE = `assets/img/candado-1.png?v=${IMG_V}`;
const SHOP_IMAGE = `assets/img/tienda-para-desbloquear.png?v=${IMG_V}`;

const ZOO_HOTSPOTS = {
  leon: { left: 2, top: 2, width: 44, height: 44 },
  cabra: { left: 54, top: 2, width: 44, height: 44 },
  pantera: { left: 2, top: 35, width: 44, height: 44 },
  panda: { left: 54, top: 35, width: 44, height: 44 },
  shop: { left: 50, top: 75, width: 28, height: 18 },
};

const SHOP_UNLOCK_COST = 20;

const SHOP_ITEMS = [
  { id: 'pantera', label: 'Zona Pantera Negra', cost: 50, image: '🐆', desc: '¡Desbloquea la zona de las panteras negras! Misma mecánica que el león pero más monedas.' },
  { id: 'panda', label: 'Zona Osos Panda', cost: 100, image: '🐼', desc: '¡Desbloquea la zona de los osos panda! Solo comen zanahorias... y les encantan los conejos.' },
  { id: 'comida_especial', label: 'Comida especial', cost: '???', image: '🎁', desc: 'Próximamente...' },
  { id: 'delfines', label: 'Zona Delfines', cost: '???', image: '🐬', desc: 'Próximamente...' },
];

function getReaction(animal, food) {
  const animalReactions = REACTIONS[animal];
  if (!animalReactions || !(food in animalReactions)) {
    throw new Error(`Reacción no definida para animal="${animal}" comida="${food}"`);
  }
  return animalReactions[food];
}

if (typeof module !== 'undefined') {
  module.exports = {
    APP_VERSION,
    ANIMALS,
    FOODS,
    ANIMAL_LABELS,
    ANIMAL_EMOJI,
    ANIMAL_STATE_IMAGE,
    FOOD_LABELS,
    FOOD_EMOJI,
    FOOD_IMAGE,
    REACTIONS,
    ANIMAL_COINS,
    getReaction,
    ZOO_MAP_IMAGE,
    ZOO_LOCK_IMAGE,
    SHOP_IMAGE,
    ZOO_HOTSPOTS,
    SHOP_UNLOCK_COST,
    SHOP_ITEMS,
  };
}