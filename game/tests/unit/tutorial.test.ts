import { describe, expect, it } from 'vitest';
import { ANIMAL_IDS, ANIMALS } from '../../src/data/animals';
import { advance, advanceClean, advanceClinic, goodFood, lessonStepName, type CleanLessonStep, type ClinicLessonStep, type LessonEvent, type TutorialEvent, type TutorialStep } from '../../src/core/tutorial';

describe('pasos del tutorial', () => {
  it.each<[TutorialStep, TutorialEvent, TutorialStep | 'done']>([
    ['move', { type: 'moved' }, 'tap-animal'],
    ['move', { type: 'feed-opened' }, 'drag-food'],
    ['tap-animal', { type: 'feed-opened' }, 'drag-food'],
    ['drag-food', { type: 'fed', coins: 2 }, 'coins'],
    ['drag-food', { type: 'feed-closed' }, 'tap-animal'],
    ['coins', { type: 'coins-shown' }, 'shop'],
    ['coins', { type: 'feed-closed' }, 'shop'],
    ['shop', { type: 'shop-opened' }, 'done'],
  ])('%s + %o → %s', (step, event, next) => {
    expect(advance(step, event)).toBe(next);
  });

  it('una comida que no gusta (sin monedas) no cuenta: la mano repite el arrastre', () => {
    expect(advance('drag-food', { type: 'fed', coins: 0 })).toBe('drag-food');
  });

  it('lo que no toca deja el paso igual', () => {
    expect(advance('tap-animal', { type: 'moved' })).toBe('tap-animal');
    expect(advance('coins', { type: 'shop-opened' })).toBe('coins');
    expect(advance('move', { type: 'coins-shown' })).toBe('move');
  });

  it('la mano arrastra una comida que el animal se come', () => {
    expect(goodFood('leon')).toBe('carne');
    // A la cabra, algo normal: ni la piedra ni el conejo (que son de sorpresa).
    expect(['zanahoria', 'lechuga']).toContain(goodFood('cabra'));
    for (const id of ANIMAL_IDS) expect(ANIMALS[id].reactions[goodFood(id)], id).not.toBe('rechaza');
  });
});

describe('pasos de las lecciones de limpieza y clínica', () => {
  it.each<[CleanLessonStep, LessonEvent, CleanLessonStep | 'done']>([
    ['tap-dirty', { type: 'clean-opened' }, 'cacahuete'],
    ['cacahuete', { type: 'clean-step', step: 'cepillo' }, 'cepillo'],
    ['cepillo', { type: 'clean-step', step: 'jabon' }, 'jabon'],
    ['agua', { type: 'clean-step', step: 'toalla' }, 'toalla'],
    ['toalla', { type: 'clean-step', step: 'hecho' }, 'done'],
    ['jabon', { type: 'clean-step', step: 'jabon' }, 'jabon'],
    ['jabon', { type: 'clean-closed', done: true }, 'done'],
    ['jabon', { type: 'clean-closed', done: false }, 'tap-dirty'],
    ['jabon', { type: 'feed-opened' }, 'jabon'],
  ])('limpieza: %s + %o → %s', (step, event, next) => {
    expect(advanceClean(step, event)).toBe(next);
  });

  it.each<[ClinicLessonStep, LessonEvent, ClinicLessonStep | 'done']>([
    ['tap-sick', { type: 'feed-opened' }, 'drag-food'],
    ['drag-food', { type: 'sick-refused' }, 'cross'],
    ['drag-food', { type: 'feed-closed' }, 'tap-sick'],
    ['cross', { type: 'feed-closed' }, 'tap-sick'],
    ['cross', { type: 'clinic-requested' }, 'bed'],
    ['bed', { type: 'cure-opened' }, 'cure'],
    ['bed', { type: 'clinic-closed' }, 'back-to-clinic'],
    ['back-to-clinic', { type: 'clinic-opened' }, 'bed'],
    ['cure', { type: 'cure-closed', done: true }, 'done'],
    ['cure', { type: 'cure-closed', done: false }, 'bed'],
    ['bed', { type: 'sick-refused' }, 'bed'],
  ])('clínica: %s + %o → %s', (step, event, next) => {
    expect(advanceClinic(step, event)).toBe(next);
  });

  it('nombres de los pasos en Matomo: los de inicio no cambian y los nuevos llevan su lección delante', () => {
    expect(lessonStepName('inicio', 'move')).toBe('moverse');
    expect(lessonStepName('limpieza', 'tap-dirty')).toBe('limpieza/tocar-animal');
    expect(lessonStepName('limpieza', 'cepillo')).toBe('limpieza/cepillo');
    expect(lessonStepName('clinica', 'tap-sick')).toBe('clinica/tocar-animal');
    expect(lessonStepName('clinica', 'drag-food')).toBe('clinica/comida');
    expect(lessonStepName('clinica', 'back-to-clinic')).toBe('clinica/volver');
    expect(lessonStepName('clinica', 'cure')).toBe('clinica/curar');
  });
});
