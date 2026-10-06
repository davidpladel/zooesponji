import { withVersion } from '../core/cacheBust';
import { t } from '../data/strings';

const ID = 'legal';

const STYLE = `
#${ID} { position: fixed; inset: 0; z-index: 10; display: flex; flex-direction: column; background: #fff8e1; color: #3e2723; font-family: sans-serif; }
#${ID} header { display: flex; justify-content: flex-end; background: #6d4c41; padding: 8px max(12px, env(safe-area-inset-right)) 8px 12px; }
#${ID} button { min-width: 64px; min-height: 48px; border: 3px solid #3e2723; border-radius: 6px; background: #c62828; color: #fff; font-size: 24px; }
#${ID} article { flex: 1; overflow-y: auto; touch-action: pan-y; -webkit-overflow-scrolling: touch; padding: 8px max(20px, env(safe-area-inset-right)) 32px max(20px, env(safe-area-inset-left)); font-size: 17px; line-height: 1.5; }
#${ID} article > * { max-width: 720px; margin-left: auto; margin-right: auto; }
#${ID} h1 { font-size: 26px; } #${ID} h2 { font-size: 20px; margin-top: 1.4em; color: #6d4c41; }
`;

/**
 * Página de privacidad por encima del juego, sin salir de él (un peque no acaba en el navegador).
 * Es la misma `privacidad.html` que se enlaza desde la ficha de la tienda.
 */
export function openLegal(): void {
  if (document.getElementById(ID)) return;
  const overlay = document.createElement('div');
  overlay.id = ID;
  const style = document.createElement('style');
  style.textContent = STYLE;
  const header = document.createElement('header');
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '✖';
  close.setAttribute('aria-label', t('legal.close'));
  close.addEventListener('click', () => closeLegal());
  header.append(close);
  const article = document.createElement('article');
  overlay.append(style, header, article);
  document.body.append(overlay);
  void load(article);
}

/** Cierra la página; devuelve si estaba abierta. */
export function closeLegal(): boolean {
  const overlay = document.getElementById(ID);
  overlay?.remove();
  return overlay !== null;
}

async function load(article: HTMLElement): Promise<void> {
  try {
    const response = await fetch(withVersion('privacidad.html'));
    if (!response.ok) throw new Error(`privacidad.html: ${response.status}`);
    const page = new DOMParser().parseFromString(await response.text(), 'text/html');
    article.replaceChildren(...(page.querySelector('main')?.children ?? []));
  } catch {
    article.textContent = t('legal.error');
  }
}
