import { describe, expect, it } from 'vitest';
import {
  CLEAN_EFFORT,
  CLEAN_STEPS,
  FACES,
  faceFacing,
  isDone,
  isStepEnabled,
  startCleaning,
  stroke,
  type CleaningState,
} from '../../src/core/cleaning';

/** Pasa el dedo lo justo para acabar el paso (o la cara) actual. */
const finish = (s: CleaningState): CleaningState => (s.step === 'hecho' ? s : stroke(s, CLEAN_EFFORT[s.step] - s.progress));

describe('limpieza', () => {
  it('los pasos son los que eligieron los niños, en su orden', () => {
    expect([...CLEAN_STEPS]).toEqual(['cacahuete', 'cepillo', 'jabon', 'agua', 'toalla']);
    expect([...FACES]).toEqual(['frente', 'lateral-izquierdo', 'lateral-derecho', 'culete']);
  });

  it('empieza por la crema de cacahuete, de frente y sin progreso', () => {
    expect(startCleaning()).toEqual({ step: 'cacahuete', progress: 0, face: 'frente' });
  });

  it('acabado el cacahuete pasa al cepillo y solo el cepillo se puede usar', () => {
    const s = finish(startCleaning());
    expect(s.step).toBe('cepillo');
    expect(s.progress).toBe(0);
    for (const step of CLEAN_STEPS) expect(isStepEnabled(s, step), step).toBe(step === 'cepillo');
  });

  it('con el cepillo el animal gira solo: frente, un lateral, el otro y culete; luego jabón de frente', () => {
    let s = finish(startCleaning());
    const faces: string[] = [];
    while (s.step === 'cepillo') {
      faces.push(s.face);
      s = finish(s);
    }
    expect(faces).toEqual(['frente', 'lateral-izquierdo', 'lateral-derecho', 'culete']);
    expect(s).toEqual({ step: 'jabon', progress: 0, face: 'frente' });
  });

  it('después: jabón, agua, toalla y hecho; solo está hecho al final', () => {
    let s = startCleaning();
    const steps: string[] = [];
    while (!isDone(s)) {
      if (!steps.includes(s.step)) steps.push(s.step);
      s = finish(s);
    }
    expect(steps).toEqual(['cacahuete', 'cepillo', 'jabon', 'agua', 'toalla']);
    expect(s.step).toBe('hecho');
    for (const step of CLEAN_STEPS) expect(isStepEnabled(s, step)).toBe(false);
  });

  it('el progreso crece poco a poco con el dedo', () => {
    const s = stroke(startCleaning(), 40);
    expect(s).toEqual({ step: 'cacahuete', progress: 40, face: 'frente' });
  });

  it('sin recorrido, o negativo, no cambia nada', () => {
    const s = startCleaning();
    expect(stroke(s, 0)).toBe(s);
    expect(stroke(s, -50)).toBe(s);
  });

  it('un recorrido enorme no se salta pasos: acaba el actual y descarta el resto', () => {
    expect(stroke(startCleaning(), 99_999)).toEqual({ step: 'cepillo', progress: 0, face: 'frente' });
  });

  it('las caras miran hacia donde dicen las filas de los dibujos', () => {
    expect(FACES.map(faceFacing)).toEqual(['down', 'left', 'right', 'up']);
  });
});
