import { describe, expect, it } from 'vitest';
import { CLINIC_SPOTS, CURE_DOSES, MEDICINES, clinicSlots, cure, emptyCare } from '../../src/core/care';

const sick = (...ids: string[]) => ({ ...emptyCare(), sick: ids });

describe('huecos de la clínica', () => {
  it('hay dos camillas', () => {
    expect(CLINIC_SPOTS).toBe(2);
  });

  it('sin enfermos, las dos vacías; con uno, la primera', () => {
    expect(clinicSlots(emptyCare())).toEqual([null, null]);
    expect(clinicSlots(sick('tembo'))).toEqual(['tembo', null]);
  });

  it('con dos, en el orden en que enfermaron', () => {
    expect(clinicSlots(sick('tembo', 'rosita'))).toEqual(['tembo', 'rosita']);
  });

  // Decisión: al curar al primero, el otro pasa a la primera camilla. Solo se guarda la lista de enfermos, y
  // «el otro sigue allí» se cumple igual: no se va de la clínica, solo se ve en la primera camilla al volver.
  it('al curar al primero, el otro sigue en la clínica (en la primera camilla)', () => {
    expect(clinicSlots(cure(sick('tembo', 'rosita'), 'tembo'))).toEqual(['rosita', null]);
  });

  it('medicinas para la bandeja y dosis para curar', () => {
    expect([...MEDICINES]).toEqual(['pastilla', 'vendaje', 'jarabe', 'termometro']);
    expect(CURE_DOSES).toBe(5);
  });
});
