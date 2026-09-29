declare const __BUILD_ID__: string;

/** Añade la versión de la compilación a un fichero de public/ para que el navegador no use una copia vieja. */
export const withVersion = (path: string): string =>
  typeof __BUILD_ID__ === 'undefined' ? path : `${path}?v=${__BUILD_ID__}`;
