import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas: funciona en davidpladel.com/zoo/ y dentro de Capacitor.
  base: './',
  // Versión de la compilación: se añade a arte, audio y mapa (?v=) para saltarse cachés viejas.
  define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },
  server: { port: 5173, strictPort: true },
  build: { target: 'es2022', assetsInlineLimit: 0, chunkSizeWarningLimit: 2000 },
});
