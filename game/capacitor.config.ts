import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.davidpladel.zooesponji',
  appName: 'Zoo Esponji',
  webDir: 'dist',
  // Azul cielo: es lo que se ve en el WebView antes de que pinte la página (sin saltos al verde oscuro).
  android: { backgroundColor: '#58b0f0' },
  // Las barras se ocultan desde MainActivity (modo inmersivo); el plugin por defecto las volvería a mostrar al cargar.
  plugins: { SystemBars: { hidden: true } },
};

export default config;
