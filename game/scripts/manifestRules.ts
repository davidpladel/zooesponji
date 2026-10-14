// Reglas sobre el manifiesto fusionado de Android (el que de verdad va en el paquete). Sin dependencias.

/** Identificador público de pruebas de Google: vale para compilar y probar, nunca para publicar. */
export const TEST_APP_ID = 'ca-app-pub-3940256099942544~3347511713';

const APP_ID = /^ca-app-pub-\d{16}~\d{10}$/;
const APP_ID_NAME = 'com.google.android.gms.ads.APPLICATION_ID';
const DELAY_NAME = 'com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT';

function metaValue(xml: string, name: string): string | null {
  for (const [tag] of xml.matchAll(/<meta-data\b[^>]*>/g)) {
    if (!tag.includes(`android:name="${name}"`)) continue;
    return /android:value="([^"]*)"/.exec(tag)?.[1] ?? null;
  }
  return null;
}

/** Lo que incumple el manifiesto. Con `release`, además exige el identificador real de AdMob. */
export function manifestProblems(xml: string, opts: { release?: boolean } = {}): string[] {
  const problems: string[] = [];
  for (const match of xml.matchAll(/<uses-permission(?:-sdk-23)?\b[^>]*android:name="([^"]+)"/g)) {
    const name = match[1] ?? '';
    // Una app para niños no puede pedir el identificador de publicidad ni los permisos de «AdServices».
    if (/AD_ID|ADSERVICES/.test(name)) problems.push(`Permiso de publicidad que no debe estar: ${name}`);
  }
  const appId = metaValue(xml, APP_ID_NAME);
  if (appId === null) problems.push(`Falta el identificador de la app de AdMob (${APP_ID_NAME}).`);
  else if (!APP_ID.test(appId)) problems.push(`El identificador de la app de AdMob no tiene la forma esperada: ${appId}`);
  else if (opts.release && appId === TEST_APP_ID) {
    problems.push('El paquete lleva el identificador de pruebas de Google: falta android/admob.properties o la variable ZOO_ADMOB_APP_ID.');
  }
  if (metaValue(xml, DELAY_NAME) !== 'true') problems.push(`Falta retrasar la medición del SDK (${DELAY_NAME} = true).`);
  return problems;
}

const UNIT = /^ca-app-pub-\d{16}\/\d{10}$/;
const TEST_PUBLISHER = 'ca-app-pub-3940256099942544';
const UNIT_KEYS = ['VITE_ADMOB_REWARDED', 'VITE_ADMOB_REWARDED_INTERSTITIAL'];

/** Lo que impide publicar en `.env.production.local` (`null`: no existe): anuncios de prueba encendidos o bloques reales que faltan. */
export function envProblems(text: string | null): string[] {
  const env = new Map<string, string>();
  for (const line of (text ?? '').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (match) env.set(match[1]!, match[2]!);
  }
  const problems: string[] = [];
  if (env.get('VITE_ADMOB_TESTING') === '1') problems.push('VITE_ADMOB_TESTING=1: el paquete pediría anuncios de prueba. Quita esa línea antes de publicar.');
  const missing = UNIT_KEYS.filter((key) => {
    const unit = env.get(key) ?? '';
    return !UNIT.test(unit) || unit.startsWith(TEST_PUBLISHER);
  });
  if (missing.length > 0) problems.push(`Falta el bloque real de AdMob en .env.production.local: ${missing.join(', ')}.`);
  return problems;
}
