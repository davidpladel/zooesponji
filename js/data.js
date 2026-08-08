const ANIMALS = ['leon', 'cabra'];
const FOODS = ['piedra', 'carne', 'conejo', 'zanahoria'];

const ANIMAL_LABELS = { leon: 'León', cabra: 'Cabra' };
const ANIMAL_EMOJI = { leon: '🦁', cabra: '🐐' };

const FOOD_LABELS = { piedra: 'Piedra', carne: 'Carne', conejo: 'Conejo', zanahoria: 'Zanahoria' };
const FOOD_EMOJI = { piedra: '🪨', carne: '🥩', conejo: '🐇', zanahoria: '🥕' };

const REACTIONS = {
  leon: { carne: 'come', conejo: 'come', piedra: 'rechaza', zanahoria: 'rechaza' },
  cabra: { carne: 'rechaza', conejo: 'especial', piedra: 'come', zanahoria: 'come' },
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
    FOOD_LABELS,
    FOOD_EMOJI,
    REACTIONS,
    getReaction,
  };
}
