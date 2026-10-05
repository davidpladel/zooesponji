import { ANIMAL_IDS, type AnimalId } from './animals';
import type { StringKey } from './strings';

export const PEN_IDS = ['leon', 'cabra', 'pantera', 'panda'] as const;
export type PenId = (typeof PEN_IDS)[number];

/** Un animal concreto. Su id es también el de su página del libro. */
export interface ResidentDef {
  id: string;
  species: AnimalId;
  /** Hoja de sprites que usa (hoy, la de su especie). */
  look: string;
}

export interface PenDef {
  id: PenId;
  nameKey: StringKey;
  /** Precio en la tienda. Sin precio: el recinto viene abierto de inicio. */
  cost?: number;
  /** Por orden de llegada: el primero viene con el recinto, el resto se compran de uno en uno. */
  residents: readonly ResidentDef[];
}

const residents = (species: AnimalId, ...ids: string[]): ResidentDef[] =>
  ids.map((id) => ({ id, species, look: species }));

export const PENS: Record<PenId, PenDef> = {
  leon: { id: 'leon', nameKey: 'animal.leon', residents: residents('leon', 'bills') },
  cabra: {
    id: 'cabra',
    nameKey: 'animal.cabra',
    residents: residents('cabra', 'gordi', 'nube', 'galleta', 'tolon', 'chispa'),
  },
  pantera: { id: 'pantera', nameKey: 'animal.pantera', cost: 50, residents: residents('pantera', 'noche', 'sombra') },
  panda: { id: 'panda', nameKey: 'animal.panda', cost: 100, residents: residents('panda', 'mochi', 'pompon') },
};

export function isPenId(value: string): value is PenId {
  return (PEN_IDS as readonly string[]).includes(value);
}

export function penCapacity(id: PenId): number {
  return PENS[id].residents.length;
}

/** Residentes que ya están en el recinto cuando su contador vale `count`. */
export function residentsIn(id: PenId, count: number): ResidentDef[] {
  return PENS[id].residents.slice(0, Math.max(0, count));
}

/** El siguiente en llegar, o null si el recinto está lleno. */
export function nextResident(id: PenId, count: number): ResidentDef | null {
  return PENS[id].residents[count] ?? null;
}

export function findResident(residentId: string): { penId: PenId; index: number; resident: ResidentDef } | null {
  for (const penId of PEN_IDS) {
    const index = PENS[penId].residents.findIndex((r) => r.id === residentId);
    if (index >= 0) return { penId, index, resident: PENS[penId].residents[index]! };
  }
  return null;
}

/** Aspectos que el juego dibuja: el de cada especie (retratos genéricos) y el de cada residente. */
export function allLooks(): string[] {
  const looks = new Set<string>(ANIMAL_IDS);
  for (const id of PEN_IDS) for (const r of PENS[id].residents) looks.add(r.look);
  return [...looks];
}
