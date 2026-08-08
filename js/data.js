const ANIMALS = ['leon', 'cabra'];
const FOODS = ['piedra', 'carne', 'conejo', 'zanahoria'];

const ANIMAL_LABELS = { leon: 'León', cabra: 'Cabra' };
const ANIMAL_EMOJI = { leon: '🦁', cabra: '🐐' };

const ANIMAL_STATE_IMAGE = {
  leon: {
    normal: 'assets/img/leon-normal.png',
    come: 'assets/img/leon-contentos.png',
    rechaza: 'assets/img/leon-enfadado.png',
  },
  cabra: {
    normal: 'assets/img/cabras-normal.png',
    come: 'assets/img/cabras-contentas.png',
    rechaza: 'assets/img/cabras-enfadadas.png',
    especial: 'assets/img/cabras-con-el-conejo-especial.png',
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
};

const ZOO_MAP_IMAGE = 'assets/img/mapa-zoo-2-zonas.png';

const ZOO_HOTSPOTS = {
  leon: { left: 2, top: 2, width: 44, height: 44 },
  cabra: { left: 54, top: 2, width: 44, height: 44 },
};

function getReaction(animal, food) {
  const animalReactions = REACTIONS[animal];
  if (!animalReactions || !(food in animalReactions)) {
    throw new Error(`Reacción no definida para animal="${animal}" comida="${food}"`);
  }
  return animalReactions[food];
}

if (typeof module !== 'undefined') {
  module.exports = {
    ANIMALS,
    FOODS,
    ANIMAL_LABELS,
    ANIMAL_EMOJI,
    ANIMAL_STATE_IMAGE,
    FOOD_LABELS,
    FOOD_EMOJI,
    FOOD_IMAGE,
    REACTIONS,
    getReaction,
    ZOO_MAP_IMAGE,
    ZOO_HOTSPOTS,
  };
}
