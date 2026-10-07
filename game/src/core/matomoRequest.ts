/** Lo que se le cuenta a Matomo: una pantalla o un evento. Solo ids, nunca nombres ni textos del juego. */
export type Hit =
  | { kind: 'screen'; name: string }
  | { kind: 'event'; category: string; action: string; name?: string; value?: number };

/** Ids de las dimensiones personalizadas (de visita) creadas en el sitio de Matomo. */
export interface DimensionIds {
  version: number;
  platform: number;
  language: number;
  sessions: number;
  age: number;
}

export interface MatomoConfig {
  /** Dirección de Matomo, sin barra final. */
  url: string;
  siteId: number;
  dimensions: DimensionIds;
}

export interface MatomoEnv {
  VITE_MATOMO_URL?: string;
  VITE_MATOMO_SITE?: string;
  /** Cinco ids separados por comas: versión, plataforma, idioma, sesión, antigüedad. */
  VITE_MATOMO_DIMS?: string;
}

export interface HitContext {
  /** 16 hexadecimales al azar, nuevos en cada sesión: agrupan la visita y no identifican a nadie. */
  visitorId: string;
  rand: string;
  /** Pantalla en la que está el jugador. */
  screen: string;
  version: string;
  platform: 'android' | 'web';
  language: string;
  sessions: string;
  age: string;
}

/** Matomo pide una dirección por acción: la de la web del juego más la pantalla. */
const BASE_URL = 'https://davidpladel.com/zoo/';

/** Sin configuración completa y válida no se mide (desarrollo, tests). */
export function parseConfig(env: MatomoEnv): MatomoConfig | null {
  const url = (env.VITE_MATOMO_URL ?? '').trim().replace(/\/+$/, '');
  const siteId = Number(env.VITE_MATOMO_SITE);
  const dims = (env.VITE_MATOMO_DIMS ?? '').split(',').map((x) => Number(x.trim()));
  const valid = (n: number): boolean => Number.isInteger(n) && n > 0;
  if (!url.startsWith('https://') || !valid(siteId) || dims.length !== 5 || !dims.every(valid)) return null;
  const [version, platform, language, sessions, age] = dims as [number, number, number, number, number];
  return { url, siteId, dimensions: { version, platform, language, sessions, age } };
}

export function trackerUrl(config: MatomoConfig): string {
  return `${config.url}/matomo.php`;
}

/** Cadena de consulta de la API de seguimiento de Matomo para una pantalla o un evento. */
export function toQuery(hit: Hit, config: MatomoConfig, context: HitContext): string {
  const p = new URLSearchParams({
    idsite: String(config.siteId),
    rec: '1',
    apiv: '1',
    rand: context.rand,
    _id: context.visitorId,
    url: BASE_URL + context.screen,
  });
  if (hit.kind === 'screen') {
    p.set('action_name', hit.name);
  } else {
    p.set('e_c', hit.category);
    p.set('e_a', hit.action);
    if (hit.name !== undefined) p.set('e_n', hit.name);
    if (hit.value !== undefined) p.set('e_v', String(hit.value));
  }
  const d = config.dimensions;
  p.set(`dimension${d.version}`, context.version);
  p.set(`dimension${d.platform}`, context.platform);
  p.set(`dimension${d.language}`, context.language);
  p.set(`dimension${d.sessions}`, context.sessions);
  p.set(`dimension${d.age}`, context.age);
  return `?${p.toString()}`;
}

/** Cuerpo del seguimiento por lotes. Sin `token_auth`: no se usa ningún parámetro que lo pida. */
export function toBulkBody(queries: readonly string[]): string {
  return JSON.stringify({ requests: queries });
}
