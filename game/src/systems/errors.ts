import { t } from '../data/strings';
import { getAnalytics } from './analytics';
import { getSession } from './session';

let shown = false;

/**
 * Pantalla "¡Ups! 🐾" con un botón grande 🔄 que recarga. Es HTML encima del canvas, no una escena
 * de Phaser: si el error rompió el bucle del juego, una escena ya no se dibujaría.
 */
function showErrorScreen(): void {
  if (shown) return;
  shown = true;
  const screen = document.createElement('div');
  screen.id = 'error-screen';
  screen.setAttribute('role', 'alert');
  screen.style.cssText =
    'position:fixed;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4vh;' +
    'background:#1d2b1f;color:#ffd54a;font-family:sans-serif;text-align:center;';
  const title = document.createElement('div');
  title.textContent = t('error.title');
  title.style.cssText = 'font-size:min(14vh,12vw);font-weight:bold;';
  const art = document.createElement('div');
  art.textContent = '🐼🩹';
  art.style.cssText = 'font-size:min(20vh,18vw);';
  const retry = document.createElement('button');
  retry.id = 'error-retry';
  retry.textContent = '🔄';
  retry.setAttribute('aria-label', t('error.retry'));
  retry.style.cssText =
    'font-size:min(12vh,10vw);min-width:96px;min-height:96px;padding:2vh 6vh;border:0;border-radius:24px;background:#43a047;cursor:pointer;';
  retry.addEventListener('click', () => window.location.reload());
  screen.append(title, art, retry);
  document.body.append(screen);
}

async function handle(error: unknown): Promise<void> {
  console.error('[ZooEsponji] Error no controlado:', error);
  // A las estadísticas anónimas solo va un mensaje corto, sin traza.
  getAnalytics()?.reportError(error);
  try {
    await getSession().saveIfValid();
  } catch {
    // Sin sesión o sin almacenamiento: no hay nada que guardar.
  }
  showErrorScreen();
}

export function installErrorHandlers(): void {
  window.addEventListener('error', (event) => void handle(event.error ?? event.message));
  window.addEventListener('unhandledrejection', (event) => void handle(event.reason));
}
