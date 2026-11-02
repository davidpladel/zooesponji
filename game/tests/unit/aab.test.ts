import { describe, expect, it } from 'vitest';
import { D8_METADATA, MAPPING, R8_METADATA, aabProblems, dexSizes } from '../../scripts/aabRules.ts';

const GOOD = ['base/manifest/AndroidManifest.xml', 'base/dex/classes.dex', R8_METADATA, MAPPING];
const CONFIG = '-keepattributes SourceFile,LineNumberTable\n-keep public class * extends com.getcapacitor.Plugin { *; }\n';

describe('paquete de Google Play (AAB) con R8', () => {
  it('un paquete correcto no tiene problemas', () => {
    expect(aabProblems(GOOD, CONFIG)).toEqual([]);
  });

  it('exige que R8 se ejecutara', () => {
    const problems = aabProblems(GOOD.filter((name) => name !== R8_METADATA), CONFIG);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('r8.json');
  });

  it('rechaza el código compilado sin optimizar', () => {
    const problems = aabProblems([...GOOD.filter((name) => name !== R8_METADATA), D8_METADATA], CONFIG);
    expect(problems).toHaveLength(2);
    expect(problems.join()).toContain('d8.json');
  });

  it('exige el archivo de desofuscación', () => {
    expect(aabProblems(GOOD.filter((name) => name !== MAPPING), CONFIG)).toHaveLength(1);
  });

  it('exige la configuración final de R8', () => {
    expect(aabProblems(GOOD, null)).toHaveLength(1);
  });

  it.each(['-dontoptimize', '-dontobfuscate', '-dontshrink'])('rechaza %s en cualquier regla', (option) => {
    const problems = aabProblems(GOOD, `${CONFIG}# de una librería\r\n  ${option}\r\n`);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(option);
  });

  it('no confunde un comentario con la opción', () => {
    expect(aabProblems(GOOD, `${CONFIG}# no usar -dontoptimize\n`)).toEqual([]);
  });

  it('suma lo que pesan los .dex', () => {
    const sizes = dexSizes([
      { name: 'base/dex/classes2.dex', size: 300 },
      { name: 'base/assets/public/index.html', size: 50 },
      { name: 'base/dex/classes.dex', size: 700 },
    ]);
    expect(sizes.files.map((file) => file.name)).toEqual(['base/dex/classes.dex', 'base/dex/classes2.dex']);
    expect(sizes.total).toBe(1000);
  });
});
