import { MUD_PENS, fallSick, makeMuddy, sickCandidates, soil, type CareState } from './care';
import { isPenOpen, penCount, type GameState } from './economy';
import type { TutorialProgress } from './save';
import type { LessonId } from './tutorial';
import { findResident, residentsIn, type PenId } from '../data/pens';

/**
 * Las lecciones de la limpieza y de la clínica (diseño del 2026-11-10): cuándo sale su aviso y con qué animal
 * se practica. Puro: quien llama guarda el `care` que devuelve.
 */

const hasMudPen = (state: GameState): boolean => MUD_PENS.some((penId) => isPenOpen(state, penId));

/**
 * Avisos que tocan al salir de la tienda: no se guarda una lista de pendientes, se deduce de lo que tiene abierto
 * y de los avisos que ya salieron (así entran también quienes ya tenían elefantes). Siempre la limpieza primero.
 */
export function pendingLessonOffers(state: GameState, progress: TutorialProgress): ('limpieza' | 'clinica')[] {
  const out: ('limpieza' | 'clinica')[] = [];
  if (hasMudPen(state) && !progress.cleanOffered) out.push('limpieza');
  if (state.clinic && !progress.clinicOffered) out.push('clinica');
  return out;
}

/** El botón Aprender del menú: la de inicio y, detrás, las que ya tenga desbloqueadas. */
export function menuLessons(state: GameState): LessonId[] {
  const out: LessonId[] = ['inicio'];
  if (hasMudPen(state)) out.push('limpieza');
  if (state.clinic) out.push('clinica');
  return out;
}

/** El animal de la práctica: `already` si ya estaba sucio o malito (no se ha tocado nada). */
export interface PracticeTarget {
  residentId: string;
  penId: PenId;
  already: boolean;
}

export type Practice = { target: PracticeTarget; care: CareState };

const penOf = (residentId: string): PenId | null => {
  const found = findResident(residentId);
  return found && !found.companion ? found.penId : null;
};

/**
 * Limpieza: si ya hay uno sucio en un recinto abierto, ese. Si no, el primer recinto de barro abierto con un
 * animal que no esté malito: el charco se pone de barro y ese animal se mancha, al momento. Null si no hay.
 */
export function cleanPractice(care: CareState, state: GameState): Practice | null {
  for (const residentId of care.dirty) {
    const penId = penOf(residentId);
    if (penId && isPenOpen(state, penId)) return { target: { residentId, penId, already: true }, care };
  }
  for (const penId of MUD_PENS) {
    if (!isPenOpen(state, penId)) continue;
    for (const resident of residentsIn(penId, penCount(state, penId))) {
      const next = soil(makeMuddy(care, penId), penId, resident.id);
      if (next.dirty.includes(resident.id)) return { target: { residentId: resident.id, penId, already: false }, care: next };
    }
  }
  return null;
}

/** Clínica: si ya hay un enfermo, ese. Si no, se pone malito el primero que pueda (con las normas de siempre). */
export function sickPractice(care: CareState, state: GameState): Practice | null {
  for (const residentId of care.sick) {
    const penId = penOf(residentId);
    if (penId) return { target: { residentId, penId, already: true }, care };
  }
  const residentId = sickCandidates(care, state)[0];
  const penId = residentId ? penOf(residentId) : null;
  if (!residentId || !penId) return null;
  return { target: { residentId, penId, already: false }, care: fallSick(care, residentId) };
}
