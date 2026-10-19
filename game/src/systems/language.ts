/** Los idiomas del juego, en el orden en que se recorren con el botón de Ajustes. */
export const LANGUAGES = ['es', 'en', 'fr', 'pt-BR', 'pt-PT', 'it', 'ru', 'ar', 'hi', 'zh', 'ja'] as const;

export type Language = (typeof LANGUAGES)[number];

/** Lo que pone en el botón de idioma de Ajustes. */
export const LANGUAGE_CHIP: Record<Language, string> = {
  es: 'ES',
  en: 'EN',
  fr: 'FR',
  'pt-BR': 'BR',
  'pt-PT': 'PT',
  it: 'IT',
  ru: 'RU',
  ar: 'AR',
  hi: 'HI',
  zh: 'ZH',
  ja: 'JA',
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/**
 * El idioma del juego que corresponde al primer idioma del dispositivo. Cuenta el idioma, no la región,
 * salvo en portugués: pt-PT es de Portugal y cualquier otro portugués, de Brasil. El chino es el simplificado.
 * Si no lo tenemos, inglés.
 */
export function detectLanguage(languages: readonly string[] | undefined): Language {
  const [base = '', region = ''] = (languages?.[0] ?? '').toLowerCase().split(/[-_]/);
  if (base === 'pt') return region === 'pt' ? 'pt-PT' : 'pt-BR';
  return isLanguage(base) ? base : 'en';
}

/** Idiomas del dispositivo. El WebView de Android refleja aquí el idioma del móvil. */
export function deviceLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  if (navigator.languages?.length) return navigator.languages;
  return navigator.language ? [navigator.language] : [];
}

/** El idioma elegido en Ajustes; si no hay ninguno, el del dispositivo. */
export function resolveLanguage(saved: Language | undefined, languages: readonly string[]): Language {
  return saved ?? detectLanguage(languages);
}

/** El siguiente idioma de la lista; después del último, vuelta al primero. */
export function nextLanguage(lang: Language): Language {
  return LANGUAGES[(LANGUAGES.indexOf(lang) + 1) % LANGUAGES.length]!;
}

/** ¿Se escribe de derecha a izquierda? */
export function isRtl(lang: Language): boolean {
  return lang === 'ar';
}

let current: Language = 'en';

export function getLanguage(): Language {
  return current;
}

export function setLanguage(lang: Language): void {
  current = lang;
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}

// Desde el primer momento: la pantalla de error puede salir antes de cargar la partida.
setLanguage(detectLanguage(deviceLanguages()));
