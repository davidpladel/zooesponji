import { withVersion } from '../core/cacheBust';
import { FONT, FONT_FILE, FONT_FILE_REGULAR } from './theme';

/** Carga la letra antes de pintar nada. Si falla o tarda, se sigue con la letra del sistema. */
export async function loadUiFont(timeoutMs = 2000): Promise<boolean> {
  if (typeof FontFace === 'undefined') return false;
  const faces = [
    new FontFace(FONT, `url(${withVersion(FONT_FILE)})`, { weight: '800' }),
    new FontFace(FONT, `url(${withVersion(FONT_FILE_REGULAR)})`, { weight: '500' }),
  ];
  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs));
  const load = Promise.all(faces.map((face) => face.load())).then(
    (loaded) => {
      loaded.forEach((face) => document.fonts.add(face));
      return true;
    },
    () => false,
  );
  return Promise.race([load, timeout]);
}
