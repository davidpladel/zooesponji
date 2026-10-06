declare const __APP_VERSION__: string;

/** Versión del juego (la de package.json); vacía fuera de Vite. */
export const APP_VERSION = typeof __APP_VERSION__ === 'undefined' ? '' : __APP_VERSION__;
