import { describe, expect, it } from 'vitest';
import { parseManifest } from '../../src/art/manifest';

const sheet = (w: number, h: number) => ({ file: 'x.png', frameWidth: w, frameHeight: h });
const image = { file: 'd.png', width: 16, height: 16 };

function valid() {
  return {
    version: 1,
    terrain: { file: 'terrain.png', columns: 85 },
    keeper: sheet(16, 32),
    shopkeeper: sheet(16, 32),
    visitors: [sheet(16, 32)],
    animals: { leon: sheet(24, 24), cabra: sheet(16, 16), pantera: sheet(24, 24), panda: sheet(32, 32) },
    decor: { shop: image, fountain: image, tree: image, bush: image },
  };
}

describe('parseManifest', () => {
  it('acepta un manifiesto completo', () => {
    expect(parseManifest(valid())?.animals.panda.frameWidth).toBe(32);
  });

  it('acepta props, comidas y acompañantes opcionales', () => {
    const m = parseManifest({
      ...valid(),
      props: { acacia: image },
      foods: { zanahoria: image },
      companions: { leon: sheet(24, 24) },
    });
    expect(m?.props.acacia?.width).toBe(16);
    expect(m?.foods.zanahoria?.file).toBe('d.png');
    expect(m?.companions.leon?.frameWidth).toBe(24);
  });

  it('sin props ni comidas sigue siendo válido', () => {
    const m = parseManifest(valid());
    expect(m?.props).toEqual({});
    expect(m?.foods).toEqual({});
  });

  it('acepta piezas animadas (fotogramas y fps)', () => {
    const m = parseManifest({ ...valid(), props: { pond: { ...image, frames: 3, fps: 4 }, rock: image } });
    expect(m?.props.pond).toEqual({ ...image, frames: 3, fps: 4 });
    expect(m?.props.rock?.frames).toBeUndefined();
  });

  it('rechaza una pieza animada con fotogramas no válidos', () => {
    expect(parseManifest({ ...valid(), props: { pond: { ...image, frames: 0, fps: 4 } } })).toBeNull();
  });

  it('rechaza un prop mal formado', () => {
    expect(parseManifest({ ...valid(), props: { roto: { file: 'x.png' } } })).toBeNull();
  });

  it.each([
    ['null', null],
    ['versión distinta', { ...valid(), version: 2 }],
    ['falta un animal', { ...valid(), animals: { leon: sheet(24, 24) } }],
    ['frame sin tamaño', { ...valid(), keeper: { file: 'k.png' } }],
    ['falta decoración', { ...valid(), decor: { shop: image } }],
    ['sin visitantes', { ...valid(), visitors: [] }],
  ])('rechaza: %s', (_label, value) => {
    expect(parseManifest(value)).toBeNull();
  });
  it('acepta piezas de interior opcionales', () => {
    const m = parseManifest({ ...valid(), interior: { counter: image } });
    expect(m?.interior.counter?.width).toBe(16);
    expect(parseManifest(valid())?.interior).toEqual({});
  });

  it('rechaza una pieza de interior mal formada', () => {
    expect(parseManifest({ ...valid(), interior: { counter: { file: 'x.png' } } })).toBeNull();
  });
});
