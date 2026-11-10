import { trayFoods, ANIMALS, type AnimalId } from '../data/animals';
import type { FoodId } from '../data/foods';
import type { CleanStep } from './cleaning';

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

/** Lección de limpieza: tocar al animal sucio y, dentro, cada herramienta en su orden. */
export const CLEAN_LESSON_STEPS = ['tap-dirty', 'cacahuete', 'cepillo', 'jabon', 'agua', 'toalla'] as const;
export type CleanLessonStep = (typeof CLEAN_LESSON_STEPS)[number];

/**
 * Lección de clínica: tocar al enfermo, darle comida (sale el «¡puaj!» y la cruz), tocar la cruz, tocar su cama
 * en la clínica y curarlo. `back-to-clinic`: salió de la clínica sin curarlo, la mano señala el botón para volver.
 */
export const CLINIC_LESSON_STEPS = ['tap-sick', 'drag-food', 'cross', 'bed', 'back-to-clinic', 'cure'] as const;
export type ClinicLessonStep = (typeof CLINIC_LESSON_STEPS)[number];

export type LessonEvent =
  | { type: 'clean-opened' }
  | { type: 'clean-step'; step: CleanStep | 'hecho' }
  | { type: 'clean-closed'; done: boolean }
  | { type: 'feed-opened' }
  | { type: 'feed-closed' }
  | { type: 'sick-refused' }
  | { type: 'clinic-requested' }
  | { type: 'clinic-opened' }
  | { type: 'clinic-closed' }
  | { type: 'cure-opened' }
  | { type: 'cure-closed'; done: boolean };

/** Cada paso de la limpieza avanza cuando ese paso se completa; si cierra a medias, vuelve a tocar al animal. */
export function advanceClean(step: CleanLessonStep, event: LessonEvent): CleanLessonStep | 'done' {
  if (step === 'tap-dirty') return event.type === 'clean-opened' ? 'cacahuete' : step;
  if (event.type === 'clean-step') return event.step === 'hecho' ? 'done' : event.step;
  if (event.type === 'clean-closed') return event.done ? 'done' : 'tap-dirty';
  return step;
}

export function advanceClinic(step: ClinicLessonStep, event: LessonEvent): ClinicLessonStep | 'done' {
  switch (step) {
    case 'tap-sick':
      return event.type === 'feed-opened' ? 'drag-food' : step;
    case 'drag-food':
      if (event.type === 'sick-refused') return 'cross';
      return event.type === 'feed-closed' ? 'tap-sick' : step;
    case 'cross':
      if (event.type === 'clinic-requested') return 'bed';
      return event.type === 'feed-closed' ? 'tap-sick' : step;
    case 'bed':
      if (event.type === 'cure-opened') return 'cure';
      return event.type === 'clinic-closed' ? 'back-to-clinic' : step;
    case 'back-to-clinic':
      return event.type === 'clinic-opened' ? 'bed' : step;
    case 'cure':
      if (event.type === 'cure-closed') return event.done ? 'done' : 'bed';
      return step;
  }
}

/** Nombre de cada paso del tutorial de inicio en Matomo (en español, como el resto de nombres). */
const START_STEP_NAMES: Record<string, string> = {
  move: 'moverse', 'tap-animal': 'tocar-animal', 'drag-food': 'arrastrar-comida', coins: 'monedas', shop: 'tienda',
};
const CLINIC_STEP_NAMES: Record<string, string> = {
  'tap-sick': 'tocar-animal', 'drag-food': 'comida', cross: 'cruz', bed: 'cama', 'back-to-clinic': 'volver', cure: 'curar',
};

/** Los de inicio conservan sus nombres de siempre; los nuevos llevan delante su lección (`limpieza/cepillo`). */
export function lessonStepName(lesson: LessonId, step: string): string {
  switch (lesson) {
    case 'inicio':
      return START_STEP_NAMES[step] ?? step;
    case 'limpieza':
      return `limpieza/${step === 'tap-dirty' ? 'tocar-animal' : step}`;
    case 'clinica':
      return `clinica/${CLINIC_STEP_NAMES[step] ?? step}`;
  }
}
