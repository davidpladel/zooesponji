import { ANIMAL_IDS, type AnimalId } from './animals';
import type { StringKey } from './strings';

export const PEN_IDS = [
  'leon', 'cabra', 'pantera', 'panda',
  // En el orden en que se ofrecen en la tienda.
  'estanque', 'ovejas', 'establo', 'pinguinos', 'sabana', 'elefantes-africanos', 'elefantes-asiaticos',
] as const;
export type PenId = (typeof PEN_IDS)[number];

/** Un animal concreto. Su id es también el de su página del libro. */
export interface ResidentDef {
  id: string;
  species: AnimalId;
  /** Hoja de sprites que usa: la de su especie o la suya propia (`cabra-gordi`). */
  look: string;
}

export interface PenDef {
  id: PenId;
  nameKey: StringKey;
  /** Precio en la tienda. Sin precio: el recinto viene abierto de inicio. */
  cost?: number;
  /** Por orden de llegada: el primero viene con el recinto, el resto se compran de uno en uno. */
  residents: readonly ResidentDef[];
  /** Granja de contacto: los visitantes también entran. */
  visitors?: boolean;
}

const residents = (species: AnimalId, ...ids: string[]): ResidentDef[] =>
  ids.map((id) => ({ id, species, look: species }));

/** Un residente con aspecto propio: `one('lucero', 'caballo', 'lucero')` usa la hoja `caballo-lucero`. */
const one = (id: string, species: AnimalId, look?: string): ResidentDef => ({ id, species, look: look ? `${species}-${look}` : species });

export const PENS: Record<PenId, PenDef> = {
  leon: { id: 'leon', nameKey: 'animal.leon', residents: residents('leon', 'bills') },
  cabra: {
    id: 'cabra',
    nameKey: 'animal.cabra',
    residents: [
      { id: 'gordi', species: 'cabra', look: 'cabra-gordi' },
      { id: 'nube', species: 'cabra', look: 'cabra' },
      { id: 'galleta', species: 'cabra', look: 'cabra-galleta' },
      { id: 'tolon', species: 'cabra', look: 'cabra-tolon' },
      { id: 'chispa', species: 'cabra', look: 'cabra-chispa' },
    ],
  },
  pantera: { id: 'pantera', nameKey: 'animal.pantera', cost: 50, residents: residents('pantera', 'noche', 'sombra') },
  panda: { id: 'panda', nameKey: 'animal.panda', cost: 100, residents: residents('panda', 'mochi', 'pompon') },
  estanque: {
    id: 'estanque',
    nameKey: 'pen.estanque',
    cost: 150,
    residents: [one('cuac', 'pato'), one('charco', 'pato', 'charco'), one('pluma', 'pato', 'pluma'), one('remo', 'pato', 'remo'), one('pio', 'pato', 'pio')],
  },
  ovejas: {
    id: 'ovejas',
    nameKey: 'pen.ovejas',
    cost: 250,
    visitors: true,
    residents: [one('lana', 'oveja'), one('bolita', 'oveja', 'bolita'), one('trueno', 'oveja', 'trueno'), one('algodon', 'oveja', 'algodon'), one('rizos', 'oveja', 'rizos')],
  },
  establo: {
    id: 'establo',
    nameKey: 'pen.establo',
    cost: 400,
    residents: [
      one('canela', 'caballo'),
      one('pepa', 'gallina'),
      one('lucero', 'caballo', 'lucero'),
      one('kiko', 'gallo'),
      one('clo', 'gallina', 'clo'),
      one('tizon', 'caballo', 'tizon'),
      one('miga', 'gallina', 'miga'),
      one('mancha', 'caballo', 'mancha'),
    ],
  },
  pinguinos: {
    id: 'pinguinos',
    nameKey: 'pen.pinguinos',
    cost: 600,
    residents: [one('pingu', 'pinguino'), one('copito', 'pinguino', 'copito'), one('frac', 'pinguino', 'frac'), one('tobogan', 'pinguino', 'tobogan'), one('hielo', 'pinguino', 'hielo')],
  },
  sabana: {
    id: 'sabana',
    nameKey: 'pen.sabana',
    cost: 900,
    residents: [
      one('lola', 'jirafa'),
      one('raya', 'cebra'),
      one('brisa', 'gacela'),
      one('pecas', 'jirafa', 'pecas'),
      one('zigzag', 'cebra', 'zigzag'),
      one('salto', 'gacela', 'salto'),
      one('miel', 'gacela', 'miel'),
      one('pipa', 'gacela', 'pipa'),
    ],
  },
  'elefantes-africanos': {
    id: 'elefantes-africanos',
    nameKey: 'pen.elefantes-africanos',
    cost: 1300,
    residents: [one('tembo', 'elefante-africano'), one('kali', 'elefante-africano', 'kali')],
  },
  'elefantes-asiaticos': {
    id: 'elefantes-asiaticos',
    nameKey: 'pen.elefantes-asiaticos',
    cost: 1600,
    residents: [one('raja', 'elefante-asiatico'), one('mali', 'elefante-asiatico', 'mali')],
  },
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
