export type Language = 'es' | 'en';

/** Cualquier variante de español (es, es-ES, es-MX…) da español; todo lo demás, inglés. Solo cuenta el primer idioma. */
export function detectLanguage(languages: readonly string[] | undefined): Language {
  return /^es([-_]|$)/i.test(languages?.[0] ?? '') ? 'es' : 'en';
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

export function otherLanguage(lang: Language): Language {
  return lang === 'es' ? 'en' : 'es';
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
