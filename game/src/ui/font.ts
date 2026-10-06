import { withVersion } from '../core/cacheBust';
import { FONT, FONT_FILE } from './theme';

/** Carga la letra antes de pintar nada. Si falla o tarda, se sigue con la letra del sistema. */
export async function loadUiFont(timeoutMs = 2000): Promise<boolean> {
  if (typeof FontFace === 'undefined') return false;
  const face = new FontFace(FONT, `url(${withVersion(FONT_FILE)})`, { weight: '800' });
  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs));
  const load = face.load().then(
    (loaded) => {
      document.fonts.add(loaded);
      return true;
    },
    () => false,
  );
  return Promise.race([load, timeout]);
}
