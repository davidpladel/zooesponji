import { clinicVisited, type ClinicProgress } from './save';

/** Ventanas con las que el engranaje se esconde. */
const OVERLAYS = ['Shop', 'Book', 'Board', 'Feed', 'PollNotice', 'TutorialOffer', 'Settings', 'Quit'] as const;

/** El engranaje solo se ve mientras la cuidadora anda por el zoo. */
export function gearVisible(activeScenes: readonly string[]): boolean {
  return activeScenes.includes('World') && !OVERLAYS.some((key) => activeScenes.includes(key));
}

/** El botón de la clínica: como el engranaje, y solo después de haber entrado alguna vez en ella. */
export function clinicButtonVisible(activeScenes: readonly string[], clinic: ClinicProgress): boolean {
  return gearVisible(activeScenes) && clinicVisited(clinic);
}
