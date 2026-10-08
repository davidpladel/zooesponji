// game/src/core/eventCatalog.ts
import { findResident } from '../data/pens';

/** Pasos del embudo de inicio. Cada uno se envía una vez en la vida de la instalación. */
export const STEPS = [
  'primer-paso', 'primer-toque-animal', 'primera-ventana', 'primera-comida', 'tienda-abierta',
  'primera-tienda', 'primera-compra', 'primer-libro', 'libro-completo', 'zoo-completo',
] as const;
export type Step = (typeof STEPS)[number];

/**
 * Todo lo que se le cuenta a Matomo, por categoría. Ninguna acción se repite en el catálogo entero:
 * así el informe «acción × nombre» se lee sin segmentos (en modo CNIL los segmentos se redondean).
 */
export const CATALOG = {
  sesion: ['inicio', 'fin', 'rato-comidas', 'rato-animales'],
  activo: ['nuevo', 'dia', 'semana', 'mes', 'vuelve-d1', 'vuelve-d7', 'vuelve-d30'],
  progreso: ['recinto', 'animal', 'monedas'],
  comer: ['toca-animal', 'ventana', 'come', 'rechaza', 'especial', 'fuera', 'ventana-fin', 'ventana-tiempo', 'ventana-vacia'],
  mapa: ['cerca', 'cerca-cerrado', 'toca-cerrado', 'tienda-cerrada', 'control'],
  tienda: ['mira', 'compra', 'sin-monedas', 'tienda-fin', 'tienda-sin-compra'],
  libro: ['abre', 'lee', 'hojea', 'bloqueada', 'indice', 'libro-fin'],
  ajustes: ['musica', 'sonidos', 'joystick', 'idioma', 'privacidad', 'salir-pregunta', 'salir-si', 'salir-no'],
  tiene: ['tiene-recinto', 'tiene-animal', 'tiene-saldo', 'tiene-paginas', 'tiene-ajuste'],
  alcance: [
    'dia-animal', 'semana-animal', 'vida-animal',
    'dia-comida', 'semana-comida', 'vida-comida',
    'dia-recinto', 'semana-recinto', 'vida-recinto',
    'dia-pagina', 'semana-pagina', 'vida-pagina',
    'dia-pantalla', 'semana-pantalla', 'vida-pantalla',
    'vida-especial',
  ],
  embudo: STEPS,
  calidad: ['perdidos', 'pendientes'],
  error: ['no-controlado'],
} as const;

export type Category = keyof typeof CATALOG;
export type ActionOf<C extends Category> = (typeof CATALOG)[C][number];

export type ReachKind = 'animal' | 'comida' | 'recinto' | 'pagina' | 'pantalla';
export type ReachScope = 'dia' | 'semana' | 'vida';

export function reachAction(scope: ReachScope, kind: ReachKind): `${ReachScope}-${ReachKind}` {
  return `${scope}-${kind}`;
}

/** Nombre combinado: el cruce viaja ya hecho. */
export function part(...parts: string[]): string {
  return parts.join('/');
}

/** Un residente se nombra con su recinto delante (`cabra/gordi`): los datos se leen sin el catálogo del juego. */
export function residentName(residentId: string): string {
  const found = findResident(residentId);
  return found ? part(found.penId, residentId) : residentId;
}

type Edges = readonly (readonly [max: number, label: string])[];

function bucket(value: number, edges: Edges, last: string): string {
  for (const [max, label] of edges) if (value <= max) return label;
  return last;
}

/** Matomo guarda el nombre «0» como vacío y lo pierde en los informes: el tramo de cero lleva otro nombre. */
const ZERO = 'cero';

/** Comidas dadas en un rato de juego. */
export const feedsBucket = (n: number): string => bucket(n, [[0, ZERO], [2, '1-2'], [5, '3-5'], [10, '6-10'], [20, '11-20']], '21+');
/** Animales distintos alimentados en un rato de juego. */
export const animalsBucket = (n: number): string => bucket(n, [[0, ZERO], [1, '1'], [3, '2-3'], [6, '4-6']], '7+');
/** Páginas leídas en una apertura del libro. */
export const pagesBucket = (n: number): string => bucket(n, [[0, ZERO], [1, '1'], [3, '2-3'], [7, '4-7']], '8+');
/** Páginas del libro leídas en total. */
export const bookBucket = (n: number): string => bucket(n, [[0, ZERO], [5, '1-5'], [15, '6-15'], [30, '16-30']], '31+');
export const durationBucket = (seconds: number): string => bucket(seconds, [[59, '<1m'], [179, '1-3m'], [599, '3-10m'], [1799, '10-30m']], '30m+');
/** Alineado con los precios de la tienda: dice qué se puede permitir el jugador. */
export const coinsBucket = (coins: number): string =>
  bucket(coins, [[19, '0-19'], [49, '20-49'], [149, '50-149'], [399, '150-399'], [899, '400-899'], [1599, '900-1599']], '1600+');
const HOUR_MS = 3_600_000;
/** Edad del evento más viejo que esperaba en el dispositivo. */
export const pendingBucket = (ms: number): string =>
  bucket(ms, [[HOUR_MS - 1, '<1h'], [6 * HOUR_MS - 1, '1-6h'], [24 * HOUR_MS - 1, '6-24h'], [72 * HOUR_MS - 1, '1-3d'], [168 * HOUR_MS - 1, '3-7d']], '7d+');
