// Reglas sobre el paquete de Google Play (AAB) compilado con R8. Sin dependencias.

export const R8_METADATA = 'BUNDLE-METADATA/com.android.tools/r8.json';
export const D8_METADATA = 'BUNDLE-METADATA/com.android.tools/d8.json';
export const MAPPING = 'BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map';

export interface AabEntry {
  name: string;
  /** Bytes sin comprimir. */
  size: number;
}

/**
 * Lo que incumple el paquete: que R8 no se ejecutara, que falte el archivo de desofuscación,
 * o que alguna librería apague R8 para todo el paquete (`configuration` es la configuración final de R8; `null`: no existe).
 */
export function aabProblems(names: string[], configuration: string | null): string[] {
  const problems: string[] = [];
  if (!names.includes(R8_METADATA)) problems.push(`Falta ${R8_METADATA}: R8 no se ejecutó.`);
  if (names.includes(D8_METADATA)) problems.push(`Está ${D8_METADATA}: el código se compiló sin optimizar.`);
  if (!names.includes(MAPPING)) problems.push(`Falta el archivo de desofuscación (${MAPPING}).`);
  if (configuration === null) {
    problems.push('Falta la configuración final de R8 (mapping/release/configuration.txt).');
  } else {
    for (const line of configuration.split(/\r?\n/)) {
      const option = /^\s*(-dontoptimize|-dontobfuscate|-dontshrink)\b/.exec(line)?.[1];
      if (option) problems.push(`Una regla apaga R8 para todo el paquete: ${option}`);
    }
  }
  return problems;
}

/** Los archivos de código Android (`.dex`) del paquete y lo que pesan entre todos, sin comprimir. */
export function dexSizes(entries: AabEntry[]): { files: AabEntry[]; total: number } {
  const files = entries.filter((entry) => entry.name.endsWith('.dex')).sort((a, b) => a.name.localeCompare(b.name));
  return { files, total: files.reduce((sum, entry) => sum + entry.size, 0) };
}
