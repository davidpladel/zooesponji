/** Qué hay abierto cuando se pulsa el botón atrás de Android. */
export interface BackContext {
  quitDialogOpen: boolean;
  settingsOpen: boolean;
  /** Tienda o primer plano de dar de comer. */
  overlayOpen: boolean;
  /** Panel que ofrece ver un anuncio. */
  adOfferOpen: boolean;
  screen: 'title' | 'world' | 'other';
  /** Aviso para actualizar: la ventana suave (`soft`) o la pantalla de bloqueo (`block`). */
  updateNotice?: 'none' | 'soft' | 'block';
}

export type BackAction = 'close-quit' | 'close-settings' | 'close-ad' | 'close-overlay' | 'ask-quit' | 'exit' | 'none';

/** Nunca cierra de golpe desde el juego: primero cierra lo abierto y en el mundo pregunta. */
export function decideBack(ctx: BackContext): BackAction {
  if (ctx.quitDialogOpen) return 'close-quit';
  // Bloqueo: la única salida es la puerta («¿Salir?»); atrás no lo cierra. La ventana suave se rechaza como la X.
  if (ctx.updateNotice === 'block') return 'ask-quit';
  if (ctx.updateNotice === 'soft') return 'close-ad';
  if (ctx.settingsOpen) return 'close-settings';
  // El panel del anuncio se abre encima de la tienda o del mapa: atrás lo rechaza, como la X.
  if (ctx.adOfferOpen) return 'close-ad';
  if (ctx.overlayOpen) return 'close-overlay';
  if (ctx.screen === 'world') return 'ask-quit';
  if (ctx.screen === 'title') return 'exit';
  return 'none';
}
