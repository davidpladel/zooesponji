import { MAX_SICK, MUD_DELAY_MS, MUD_PENS, SICK_DELAY_MS, randomDelay, sickCandidates, type CareState, type MudPenId } from './care';
import { isPenOpen, type GameState } from './economy';

export type CareEvent = { type: 'muddy'; penId: MudPenId } | { type: 'sick'; residentId: string };

/**
 * Relojes del charco y de las enfermedades. Solo cuenta el tiempo que se le da (el de juego): el mundo no
 * se lo pasa con otra ventana abierta ni con la app en segundo plano.
 */
export class CareDirector {
  /** Lo que le falta a cada charco limpio de un recinto abierto para ponerse de barro. */
  private readonly mud = new Map<MudPenId, number>();
  /** Lo que falta para que alguien se ponga malito (null: parado). */
  private sick: number | null = null;

  constructor(private readonly rng: () => number = Math.random) {}

  /** Avanza `deltaMs` de juego y devuelve lo que ha pasado. No cambia `care`: quien llama aplica los eventos. */
  update(deltaMs: number, state: GameState, care: CareState): CareEvent[] {
    if (!(deltaMs > 0)) return [];
    const events: CareEvent[] = [];
    for (const penId of MUD_PENS) {
      if (!isPenOpen(state, penId) || care.muddy.includes(penId)) {
        // Se vuelve a armar cuando el charco esté limpio: otro intervalo entero.
        this.mud.delete(penId);
        continue;
      }
      const left = (this.mud.get(penId) ?? randomDelay(MUD_DELAY_MS, this.rng)) - deltaMs;
      if (left > 0) {
        this.mud.set(penId, left);
      } else {
        this.mud.delete(penId);
        events.push({ type: 'muddy', penId });
      }
    }

    if (!state.clinic || care.sick.length >= MAX_SICK) {
      this.sick = null;
      return events;
    }
    const left = (this.sick ?? randomDelay(SICK_DELAY_MS, this.rng)) - deltaMs;
    if (left > 0) {
      this.sick = left;
      return events;
    }
    // Si no hay a quién (todos los recintos ya tienen su enfermo), se vuelve a armar.
    this.sick = null;
    const candidates = sickCandidates(care, state);
    if (candidates.length > 0) events.push({ type: 'sick', residentId: candidates[Math.floor(this.rng() * candidates.length)]! });
    return events;
  }
}
