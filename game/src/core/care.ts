import { ANIMALS, type AnimalId } from '../data/animals';
import { PEN_IDS, findResident, residentsIn, type PenId } from '../data/pens';
import { isPenOpen, penCount, type GameState } from './economy';
import type { PenSpace } from './flock';

/**
 * Suciedad y enfermedades (diseño del 2026-11-09). Todo puro e inmutable: quien llama guarda el resultado.
 * Nada de esto castiga: un animal sucio o malito no pierde nada, solo da algo más que hacer.
 */

/** Recintos con charco: se pone de barro y los animales que lo pisan se ensucian. */
export const MUD_PENS = ['cerdos', 'elefantes-africanos', 'elefantes-asiaticos'] as const;
export type MudPenId = (typeof MUD_PENS)[number];

/** Como mucho, dos enfermos en todo el parque, y nunca dos del mismo recinto. */
export const MAX_SICK = 2;
/** El charco se pone de barro entre 2 y 5 minutos de juego (aprobado). */
export const MUD_DELAY_MS = { min: 120_000, max: 300_000 } as const;
/** Cada cuánto, de 3 a 6 minutos de juego, puede ponerse malito un animal (decisión del plan). */
export const SICK_DELAY_MS = { min: 180_000, max: 360_000 } as const;
/** Medicinas que hay que darle para curarlo. */
export const CURE_DOSES = 5;

export interface CareState {
  /** Ids de residentes sucios. */
  readonly dirty: readonly string[];
  /** Ids de residentes enfermos, en el orden en que enfermaron. */
  readonly sick: readonly string[];
  /** Charcos que están de barro. */
  readonly muddy: readonly MudPenId[];
}

export const emptyCare = (): CareState => ({ dirty: [], sick: [], muddy: [] });

export function isMudPen(id: PenId): id is MudPenId {
  return (MUD_PENS as readonly string[]).includes(id);
}

/**
 * El dibujo del charco: la charca animada del pack del suelo del recinto (hierba en los cerdos, sabana en los
 * elefantes) y, con barro, esa misma charca con los azules cambiados a marrón (`-mud` en art.config.json).
 */
export function puddleArt(penId: MudPenId, muddy: boolean): string {
  const water = penId === 'cerdos' ? 'pond-grassland' : 'water-savannah';
  return muddy ? `${water}-mud` : water;
}

export const isDirty = (care: CareState, residentId: string): boolean => care.dirty.includes(residentId);
export const isSick = (care: CareState, residentId: string): boolean => care.sick.includes(residentId);

/** Un tiempo al azar entre `min` y `max`. */
export function randomDelay(range: { readonly min: number; readonly max: number }, rng: () => number): number {
  return range.min + Math.floor(rng() * (range.max - range.min + 1));
}

const penOf = (residentId: string): PenId | null => {
  const found = findResident(residentId);
  return found && !found.companion ? found.penId : null;
};

export function makeMuddy(care: CareState, penId: MudPenId): CareState {
  return care.muddy.includes(penId) ? care : { ...care, muddy: [...care.muddy, penId] };
}

/** El animal pisa el charco: se ensucia solo si es de barro, es de ese recinto y no está ya sucio ni malito. */
export function soil(care: CareState, penId: MudPenId, residentId: string): CareState {
  if (!care.muddy.includes(penId) || penOf(residentId) !== penId) return care;
  if (isDirty(care, residentId) || isSick(care, residentId)) return care;
  return { ...care, dirty: [...care.dirty, residentId] };
}

/** Ya está limpio. Si era el último sucio de su recinto, el charco vuelve solo a agua limpia. */
export function clean(care: CareState, penId: MudPenId, residentId: string): CareState {
  const dirty = care.dirty.filter((id) => id !== residentId);
  const anyLeft = dirty.some((id) => penOf(id) === penId);
  return { ...care, dirty, muddy: anyLeft ? care.muddy : care.muddy.filter((id) => id !== penId) };
}

/** Animales que pueden ponerse malitos ahora: con la clínica comprada, de recintos sin otro enfermo. */
export function sickCandidates(care: CareState, state: GameState): string[] {
  if (!state.clinic || care.sick.length >= MAX_SICK) return [];
  const busy = new Set(care.sick.map(penOf));
  return PEN_IDS.filter((penId) => isPenOpen(state, penId) && !busy.has(penId)).flatMap((penId) =>
    residentsIn(penId, penCount(state, penId)).map((r) => r.id),
  );
}

/** Se pone malito. Un enfermo no está sucio: al tocarlo toca curarlo, no lavarlo. */
export function fallSick(care: CareState, residentId: string): CareState {
  if (isSick(care, residentId)) return care;
  return { ...care, sick: [...care.sick, residentId], dirty: care.dirty.filter((id) => id !== residentId) };
}

export function cure(care: CareState, residentId: string): CareState {
  return { ...care, sick: care.sick.filter((id) => id !== residentId) };
}

/** Limpiar o curar paga lo mismo que darle de comer (lo dijeron los niños). */
export function careReward(species: AnimalId): number {
  return ANIMALS[species].coins.come;
}

/** Lee lo guardado: solo animales que existen y ya han llegado, sin repetir, y con las reglas de los enfermos. */
export function sanitizeCare(raw: unknown, counts: Readonly<Record<PenId, number>>): CareState {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return emptyCare();
  const loose = raw as Record<string, unknown>;
  const ids = (value: unknown): string[] => (Array.isArray(value) ? [...new Set(value.filter((v): v is string => typeof v === 'string'))] : []);
  const arrived = (residentId: string): PenId | null => {
    const found = findResident(residentId);
    if (!found || found.companion) return null;
    return found.index < (counts[found.penId] ?? 0) ? found.penId : null;
  };

  const sick: string[] = [];
  const sickPens = new Set<PenId>();
  for (const id of ids(loose.sick)) {
    const penId = arrived(id);
    if (!penId || sickPens.has(penId) || sick.length >= MAX_SICK) continue;
    sick.push(id);
    sickPens.add(penId);
  }
  const dirty = ids(loose.dirty).filter((id) => {
    const penId = arrived(id);
    return penId !== null && isMudPen(penId) && !sick.includes(id);
  });
  const muddy = ids(loose.muddy).filter((id): id is MudPenId => (MUD_PENS as readonly string[]).includes(id) && (counts[id as MudPenId] ?? 0) > 0);
  return { dirty, sick, muddy };
}

/** ¿Está el punto dentro del charco (una elipse)? */
export function insidePuddle(point: { x: number; y: number }, puddle: { x: number; y: number; rx: number; ry: number }): boolean {
  const dx = (point.x - puddle.x) / puddle.rx;
  const dy = (point.y - puddle.y) / puddle.ry;
  return dx * dx + dy * dy <= 1;
}

/** Qué se abre al tocar un animal: un enfermo va a la comida (ahí sale el «¡puaj!»), un sucio a la limpieza. */
export function pickTapScene(care: CareState, residentId: string): 'clean' | 'feed' {
  return !isSick(care, residentId) && isDirty(care, residentId) ? 'clean' : 'feed';
}

/** Un animal malito no come: cualquier comida le da «¡puaj!» y sale la cruz de la clínica. */
export function feedOutcome(care: CareState, residentId: string): 'normal' | 'sick-refuse' {
  return isSick(care, residentId) ? 'sick-refuse' : 'normal';
}

/**
 * Centro del charco (elipse de radios `rx`, `ry`) dentro del recinto, sin pisar adornos: el sitio libre más
 * cercano al centro, que es por donde más pasean los animales. Null si no cabe.
 */
export function puddleSpot(space: PenSpace, rx: number, ry: number, step = 4): { x: number; y: number } | null {
  const { inner, obstacles } = space;
  const center = { x: inner.x + inner.width / 2, y: inner.y + inner.height / 2 };
  let best: { x: number; y: number } | null = null;
  let bestDistance = Infinity;
  // Rejilla que pasa por el centro, para que en un recinto vacío salga justo ahí.
  const reachX = Math.floor((inner.width / 2 - rx) / step);
  const reachY = Math.floor((inner.height / 2 - ry) / step);
  for (let j = -reachY; j <= reachY; j++) {
    for (let i = -reachX; i <= reachX; i++) {
      const x = center.x + i * step;
      const y = center.y + j * step;
      const hit = obstacles.some((o) => x - rx < o.x + o.width && o.x < x + rx && y - ry < o.y + o.height && o.y < y + ry);
      const distance = Math.hypot(x - center.x, y - center.y);
      if (!hit && distance < bestDistance) {
        best = { x, y };
        bestDistance = distance;
      }
    }
  }
  return best;
}

/** Camillas de la clínica. */
export const CLINIC_SPOTS = 2;

/** Qué enfermo hay en cada camilla: por orden de enfermar; las que sobran, vacías (null). */
export function clinicSlots(care: CareState): (string | null)[] {
  return Array.from({ length: CLINIC_SPOTS }, (_, i) => care.sick[i] ?? null);
}

/** Lo que hay en la bandeja de curar. Da igual el orden: cada una que se le da es una dosis. */
export const MEDICINES = ['pastilla', 'vendaje', 'jarabe', 'termometro'] as const;
export type MedicineId = (typeof MEDICINES)[number];
