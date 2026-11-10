import { trayFoods, ANIMALS, type AnimalId } from '../data/animals';
import type { FoodId } from '../data/foods';

/** Las lecciones: la de inicio (aprender a jugar), la de la limpieza y la de la clínica. */
export type LessonId = 'inicio' | 'limpieza' | 'clinica';

/** Pasos del tutorial, en el orden que fijó David: moverse, tocar, arrastrar la comida, monedas y tienda. */
export const TUTORIAL_STEPS = ['move', 'tap-animal', 'drag-food', 'coins', 'shop'] as const;
export type TutorialStep = (typeof TUTORIAL_STEPS)[number];

export type TutorialEvent =
  | { type: 'moved' }
  | { type: 'feed-opened' }
  | { type: 'feed-closed' }
  | { type: 'fed'; coins: number }
  | { type: 'coins-shown' }
  | { type: 'shop-opened' };

/** Px que tiene que andar la cuidadora para dar por aprendido el paso de moverse. */
export const MOVE_DISTANCE = 48;
/** Lo que la mano señala el contador tras ganar monedas. */
export const COINS_SHOW_MS = 2500;

/** Cada paso solo avanza cuando el jugador hace el gesto que enseña. */
export function advance(step: TutorialStep, event: TutorialEvent): TutorialStep | 'done' {
  switch (step) {
    case 'move':
      if (event.type === 'moved') return 'tap-animal';
      // Ya se ha movido y ha tocado a un animal por su cuenta: adelante.
      if (event.type === 'feed-opened') return 'drag-food';
      return step;
    case 'tap-animal':
      return event.type === 'feed-opened' ? 'drag-food' : step;
    case 'drag-food':
      if (event.type === 'fed' && event.coins > 0) return 'coins';
      if (event.type === 'feed-closed') return 'tap-animal';
      return step;
    case 'coins':
      // Al cerrar la comida (o pasado un rato) la mano lleva a la tienda.
      return event.type === 'coins-shown' || event.type === 'feed-closed' ? 'shop' : step;
    case 'shop':
      return event.type === 'shop-opened' ? 'done' : step;
  }
}

/** Comida de la bandeja que el animal se come (la primera que no rechaza): la que arrastra la mano. */
/** Comidas de sorpresa (la piedra, el conejo): el tutorial no empieza por ellas (David, 2026-11-08). */
const SURPRISE_FOODS: readonly FoodId[] = ['piedra', 'conejo'];

export function goodFood(species: AnimalId): FoodId {
  const foods = trayFoods(species);
  const reaction = (f: FoodId) => ANIMALS[species].reactions[f];
  return (
    foods.find((f) => reaction(f) === 'come' && !SURPRISE_FOODS.includes(f)) ??
    foods.find((f) => reaction(f) === 'come') ??
    foods.find((f) => reaction(f) !== 'rechaza') ??
    foods[0]!
  );
}
