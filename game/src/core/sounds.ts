import type { MedicineId } from './care';
import type { CleanStep } from './cleaning';
import type { FoodId } from '../data/foods';

/**
 * Sonidos de comer, limpiar y curar (2026-11-10, votados por David entre sonidos CC0 de OpenGameArt y algunos
 * hechos por nosotros; origen de cada uno en public/audio/CREDITS.md). Todos son wav en public/audio.
 */
export const CARE_SOUND_IDS = [
  'comer-crujiente',
  'comer-blanda',
  'limpiar-cacahuete',
  'limpiar-cepillo',
  'limpiar-jabon',
  'limpiar-agua',
  'limpiar-toalla',
  'curar-pastilla',
  'curar-vendaje',
  'curar-jarabe',
  'curar-termometro',
  'barro',
  'malito',
] as const;
export type CareSoundId = (typeof CARE_SOUND_IDS)[number];

const CRUNCHY: ReadonlySet<FoodId> = new Set<FoodId>(['zanahoria', 'lechuga', 'maiz', 'manzana', 'piedra']);

/** Lo crujiente cruje; lo demás (carne, pescado, pan, huevo, plátano…) se traga. */
export function eatSound(food: FoodId): CareSoundId {
  return CRUNCHY.has(food) ? 'comer-crujiente' : 'comer-blanda';
}

/** Lo que suena mientras se frota con cada herramienta. */
const TOOL_SOUND: Readonly<Record<CleanStep, CareSoundId | null>> = {
  cacahuete: 'limpiar-cacahuete',
  cepillo: 'limpiar-cepillo',
  jabon: 'limpiar-jabon',
  agua: 'limpiar-agua',
  toalla: 'limpiar-toalla',
};

export function toolSound(step: CleanStep): CareSoundId | null {
  return TOOL_SOUND[step];
}

/** Al frotar, cada cuánto vuelve a sonar la herramienta (más o menos lo que dura su sonido, para que no se pisen). */
export const RUB_SOUND_GAP_MS: Readonly<Record<CleanStep, number>> = {
  cacahuete: 280,
  cepillo: 380,
  jabon: 420,
  agua: 780,
  toalla: 220,
};

export function medicineSound(id: MedicineId): CareSoundId {
  return `curar-${id}`;
}
