/**
 * Monedas de regalo para probar una versión en el móvil (2026-11-10). Solo en las versiones con anuncios de prueba
 * (`VITE_ADMOB_TESTING=1`), nunca en la de Play, y una sola vez por cantidad: suma a lo que ya tiene el jugador,
 * nunca quita nada.
 */
export interface TestGiftEnv {
  VITE_ADMOB_TESTING?: string;
  VITE_REGALO_PRUEBA?: string;
}

/** Clave guardada en el móvil al dar el regalo, para no darlo dos veces. */
export function testGiftKey(amount: number): string {
  return `zoo-regalo-prueba-${amount}`;
}

/** Cuántas monedas regalar ahora (0 si nada). */
export function testGiftAmount(env: TestGiftEnv, alreadyGiven: (key: string) => boolean): number {
  if (env.VITE_ADMOB_TESTING !== '1') return 0;
  const amount = Number(env.VITE_REGALO_PRUEBA);
  if (!Number.isInteger(amount) || amount <= 0) return 0;
  return alreadyGiven(testGiftKey(amount)) ? 0 : amount;
}
