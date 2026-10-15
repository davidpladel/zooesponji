import { Community, setCommunity } from './community';
import { createStore } from './createStore';
import { bus } from './events';

export { communityUrl } from '../core/community';
import { communityUrl } from '../core/community';

/** Monta el tablón contra un servidor. Las pruebas lo llaman con uno falso. */
export async function startCommunity(baseUrl: string): Promise<Community> {
  const community = new Community({
    baseUrl,
    fetch: (url, init) => fetch(url, init),
    store: createStore(),
    events: bus,
  });
  setCommunity(community);
  await community.start();
  return community;
}

/** Sin `VITE_COMMUNITY_URL` no hay tablón. No espera a la red: el juego arranca igual. Nunca lanza. */
export async function installCommunity(): Promise<void> {
  try {
    const url = communityUrl(import.meta.env as { VITE_COMMUNITY_URL?: string });
    if (!url) return;
    void startCommunity(url).catch(() => setCommunity(null));
  } catch {
    // El tablón nunca impide jugar.
  }
}
