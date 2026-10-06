export type PressState = 'idle' | 'down';
export type PressEvent = 'down' | 'up' | 'out';

export interface PressStep {
  state: PressState;
  /** Hay que ejecutar la acción del botón. */
  fire: boolean;
}

/** Un botón solo se ejecuta si el dedo bajó y se soltó sobre él sin salir entre medias. */
export function pressStep(state: PressState, event: PressEvent): PressStep {
  if (event === 'down') return { state: 'down', fire: false };
  if (event === 'up') return { state: 'idle', fire: state === 'down' };
  return { state: 'idle', fire: false };
}
