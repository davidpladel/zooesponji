import type { Facing } from './facing';

/**
 * Los 5 pasos de la limpieza, en el orden que eligieron los niños (2026-11-09). Cada paso se llena pasando
 * el dedo por encima del animal con la herramienta que toca; las demás están apagadas.
 */
export const CLEAN_STEPS = ['cacahuete', 'cepillo', 'jabon', 'agua', 'toalla'] as const;
export type CleanStep = (typeof CLEAN_STEPS)[number];

/** Con el cepillo el animal gira solo: de frente, un lateral, el otro y culete (igual el cerdo y los elefantes). */
export const FACES = ['frente', 'lateral-izquierdo', 'lateral-derecho', 'culete'] as const;
export type Face = (typeof FACES)[number];

/** Recorrido del dedo (px) que llena cada paso; en el cepillo, cada cara. Decisión del plan, ajustable. */
export const CLEAN_EFFORT: Readonly<Record<CleanStep, number>> = { cacahuete: 150, cepillo: 200, jabon: 250, agua: 250, toalla: 200 };

export interface CleaningState {
  readonly step: CleanStep | 'hecho';
  readonly progress: number;
  readonly face: Face;
}

export const startCleaning = (): CleaningState => ({ step: 'cacahuete', progress: 0, face: 'frente' });

export const isDone = (state: CleaningState): boolean => state.step === 'hecho';

export const isStepEnabled = (state: CleaningState, step: CleanStep): boolean => state.step === step;

/**
 * El dedo ha recorrido `distance` px sobre el animal. Llena el paso (o la cara) actual y, si lo acaba, pasa
 * al siguiente con la barra vacía: lo que sobra se descarta, así nadie se salta un paso sin verlo.
 */
export function stroke(state: CleaningState, distance: number): CleaningState {
  if (state.step === 'hecho' || !(distance > 0)) return state;
  const progress = state.progress + distance;
  if (progress < CLEAN_EFFORT[state.step]) return { ...state, progress };
  if (state.step === 'cepillo') {
    const next = FACES[FACES.indexOf(state.face) + 1];
    if (next) return { step: 'cepillo', progress: 0, face: next };
  }
  const following = CLEAN_STEPS[CLEAN_STEPS.indexOf(state.step) + 1] ?? 'hecho';
  return { step: following, progress: 0, face: 'frente' };
}

const FACING: Readonly<Record<Face, Facing>> = { frente: 'down', 'lateral-izquierdo': 'left', 'lateral-derecho': 'right', culete: 'up' };

/** Fila del dibujo que enseña esa cara. */
export const faceFacing = (face: Face): Facing => FACING[face];
