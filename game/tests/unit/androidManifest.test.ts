import { describe, expect, it } from 'vitest';
import { TEST_APP_ID, envProblems, manifestProblems } from '../../scripts/manifestRules.ts';

const manifest = (inside: string, permissions = ''): string =>
  `<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application>${inside}</application>${permissions}</manifest>`;
const appId = (value: string): string => `<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="${value}" />`;
const DELAY = '<meta-data android:name="com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT" android:value="true" />';
const REAL = 'ca-app-pub-1234567890123456~1234567890';
const permission = (name: string): string => `<uses-permission android:name="${name}" />`;

describe('manifiesto fusionado de Android', () => {
  it('un manifiesto correcto no tiene problemas', () => {
    expect(manifestProblems(manifest(appId(REAL) + DELAY, permission('android.permission.INTERNET')), { release: true })).toEqual([]);
  });

  it.each([
    'com.google.android.gms.permission.AD_ID',
    'android.permission.ACCESS_ADSERVICES_AD_ID',
    'android.permission.ACCESS_ADSERVICES_ATTRIBUTION',
    'android.permission.ACCESS_ADSERVICES_TOPICS',
  ])('rechaza el permiso %s', (name) => {
    const problems = manifestProblems(manifest(appId(REAL) + DELAY, permission(name)));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(name);
  });

  it('rechaza el permiso también en su forma «sdk-23»', () => {
    const xml = manifest(appId(REAL) + DELAY, '<uses-permission-sdk-23 android:name="com.google.android.gms.permission.AD_ID" />');
    expect(manifestProblems(xml)).toHaveLength(1);
  });

  it('exige el identificador de la app de AdMob', () => {
    expect(manifestProblems(manifest(DELAY))).toHaveLength(1);
    expect(manifestProblems(manifest(appId('${admobAppId}') + DELAY))).toHaveLength(1);
  });

  it('lee el identificador aunque el valor vaya antes que el nombre', () => {
    const swapped = `<meta-data android:value="${REAL}" android:name="com.google.android.gms.ads.APPLICATION_ID" />`;
    expect(manifestProblems(manifest(swapped + DELAY))).toEqual([]);
  });

  it('el identificador de pruebas vale para probar, no para publicar', () => {
    const xml = manifest(appId(TEST_APP_ID) + DELAY);
    expect(manifestProblems(xml)).toEqual([]);
    expect(manifestProblems(xml, { release: true })).toHaveLength(1);
  });

  it('exige retrasar la medición del SDK', () => {
    expect(manifestProblems(manifest(appId(REAL)))).toHaveLength(1);
  });
});

describe('configuración de anuncios al publicar (.env.production.local)', () => {
  const REWARDED = 'VITE_ADMOB_REWARDED=ca-app-pub-1234567890123456/1111111111';
  const INTERSTITIAL = 'VITE_ADMOB_REWARDED_INTERSTITIAL=ca-app-pub-1234567890123456/2222222222';

  it('con los dos bloques reales no hay problemas', () => {
    expect(envProblems(`# anuncios\r\n${REWARDED}\r\n${INTERSTITIAL}\r\nVITE_ADMOB_TESTING=\r\n`)).toEqual([]);
  });

  it('rechaza publicar con los anuncios de prueba encendidos', () => {
    const problems = envProblems(`${REWARDED}\n${INTERSTITIAL}\nVITE_ADMOB_TESTING=1\n`);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('VITE_ADMOB_TESTING');
  });

  it.each([
    ['sin archivo', null],
    ['vacío', ''],
    ['bloques sin valor', 'VITE_ADMOB_REWARDED=\nVITE_ADMOB_REWARDED_INTERSTITIAL=\n'],
    ['bloque mal escrito', 'VITE_ADMOB_REWARDED=ca-app-pub-123/456\n'],
    ['bloque de prueba de Google', 'VITE_ADMOB_REWARDED=ca-app-pub-3940256099942544/5224354917\n'],
  ])('rechaza publicar sin ningún bloque real (%s)', (_label, text) => {
    expect(envProblems(text)).toHaveLength(1);
  });

  it('avisa si solo hay uno de los dos huecos', () => {
    expect(envProblems(`${REWARDED}\n`)).toHaveLength(1);
  });
});
