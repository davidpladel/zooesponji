/** Qué hay abierto cuando se pulsa el botón atrás de Android. */
export interface BackContext {
  quitDialogOpen: boolean;
  settingsOpen: boolean;
  /** Tienda o primer plano de dar de comer. */
  overlayOpen: boolean;
  screen: 'title' | 'world' | 'other';
}

export type BackAction = 'close-quit' | 'close-settings' | 'close-overlay' | 'ask-quit' | 'exit' | 'none';

/** Nunca cierra de golpe desde el juego: primero cierra lo abierto y en el mundo pregunta. */
export function decideBack(ctx: BackContext): BackAction {
  if (ctx.quitDialogOpen) return 'close-quit';
  if (ctx.settingsOpen) return 'close-settings';
  if (ctx.overlayOpen) return 'close-overlay';
  if (ctx.screen === 'world') return 'ask-quit';
  if (ctx.screen === 'title') return 'exit';
  return 'none';
}
