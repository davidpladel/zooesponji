import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { legalPage } from '../../src/systems/legal';

const read = (name: string): string => readFileSync(fileURLToPath(new URL(`../../public/${name}`, import.meta.url)), 'utf8');
/** Lo que el juego enseña: el contenido de <main>. */
const main = (html: string): string => /<main>([\s\S]*)<\/main>/.exec(html)?.[1] ?? '';
const count = (html: string, tag: string): number => (main(html).match(new RegExp(`<${tag}[ >]`, 'g')) ?? []).length;

describe('página de privacidad', () => {
  it('cada idioma tiene su página', () => {
    expect(legalPage('es')).toBe('privacidad.html');
    expect(legalPage('en')).toBe('privacidad-en.html');
  });

  it('la página en inglés tiene la misma estructura que la española', () => {
    const es = read(legalPage('es'));
    const en = read(legalPage('en'));
    expect(en).toContain('<html lang="en">');
    for (const tag of ['h1', 'h2', 'p', 'strong']) expect(count(en, tag), tag).toBe(count(es, tag));
    expect(count(en, 'h2')).toBe(9);
  });

  it('explica las estadísticas anónimas y cómo apagarlas, en los dos idiomas', () => {
    const es = main(read(legalPage('es')));
    const en = main(read(legalPage('en')));
    expect(es).toContain('Estadísticas anónimas');
    expect(es).toContain('Ajustes');
    expect(es).not.toContain('Tampoco lleva');
    expect(en).toContain('Anonymous statistics');
    expect(en).toContain('Settings');
    expect(en).not.toContain('measurement or tracking tools either');
  });

  it('sin enlaces (un peque no sale del juego) y con los mismos datos de contacto', () => {
    const en = main(read(legalPage('en')));
    expect(en).not.toContain('<a');
    expect(en).toContain('Zoo Esponji');
    expect(en).toContain('android@davidpladel.com');
    expect(en).toContain('davidpladel.com/aviso-legal');
    expect(en).toContain('aepd.es');
  });
});
