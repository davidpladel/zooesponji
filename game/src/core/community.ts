import type { Language } from '../systems/language';

/**
 * El tablón de la comunidad: lo que dice el servidor (`estado.php`) y lo que recuerda el aparato.
 * Todo lo que llega de fuera se trata como hostil: se valida, se recorta y lo raro se descarta.
 */

export type Localized = { es: string; en: string };

export interface PollOption {
  id: string;
  titulo: Localized;
  dibujo: string | null;
  ideaDe: string | null;
}

export interface Poll {
  id: string;
  abre: string;
  cierra: string;
  abierta: boolean;
  ganadora: string | null;
  opciones: PollOption[];
  /** Porcentaje (0-100) por opción. Sin totales. */
  reparto: Record<string, number>;
}

export interface WallEntry {
  titulo: Localized;
  dibujo: string | null;
  ideaDe: string | null;
  estado: 'elegida' | 'hecha';
  recinto: string | null;
}

export interface CommunityStatus {
  /** Día de hoy en España, según el servidor (no el reloj del móvil). */
  hoy: string;
  ideas: number;
  votacion: Poll | null;
  muro: WallEntry[];
}

export const MAX_TITLE = 30;
export const MAX_NAME = 20;
const MAX_WALL = 30;
const ID = /^[a-z0-9-]{1,40}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const DRAWING = /^[a-z0-9-]+\.png$/;

type Loose = Record<string, unknown>;
const isObject = (v: unknown): v is Loose => typeof v === 'object' && v !== null && !Array.isArray(v);
const isId = (v: unknown): v is string => typeof v === 'string' && ID.test(v);
const isDay = (v: unknown): v is string => typeof v === 'string' && DAY.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

function clip(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = Array.from(value.trim()).slice(0, max).join('');
  return text === '' ? null : text;
}

export function drawingName(name: unknown): string | null {
  return typeof name === 'string' && DRAWING.test(name) ? name : null;
}

function readLocalized(value: unknown): Localized | null {
  if (!isObject(value)) return null;
  const es = clip(value.es, MAX_TITLE);
  const en = clip(value.en, MAX_TITLE);
  return es && en ? { es, en } : null;
}

function readOption(value: unknown): PollOption | null {
  if (!isObject(value) || !isId(value.id)) return null;
  const titulo = readLocalized(value.titulo);
  if (!titulo) return null;
  return { id: value.id, titulo, dibujo: drawingName(value.dibujo), ideaDe: clip(value.ideaDe, MAX_NAME) };
}

function readPoll(value: unknown): Poll | null {
  if (!isObject(value) || !isId(value.id) || !isDay(value.abre) || !isDay(value.cierra)) return null;
  if (typeof value.abierta !== 'boolean' || !Array.isArray(value.opciones)) return null;
  const opciones = value.opciones.map(readOption);
  if (opciones.length < 2 || opciones.length > 4 || opciones.some((o) => o === null)) return null;
  const options = opciones as PollOption[];
  const ids = options.map((o) => o.id);
  if (new Set(ids).size !== ids.length) return null;
  const ganadora = isId(value.ganadora) && ids.includes(value.ganadora) ? value.ganadora : null;
  const rawShare = isObject(value.reparto) ? value.reparto : {};
  const reparto: Record<string, number> = {};
  for (const id of ids) {
    const n = rawShare[id];
    reparto[id] = typeof n === 'number' && Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0;
  }
  return { id: value.id, abre: value.abre, cierra: value.cierra, abierta: value.abierta, ganadora, opciones: options, reparto };
}

function readWallEntry(value: unknown): WallEntry | null {
  if (!isObject(value)) return null;
  const titulo = readLocalized(value.titulo);
  if (!titulo || (value.estado !== 'elegida' && value.estado !== 'hecha')) return null;
  return {
    titulo,
    dibujo: drawingName(value.dibujo),
    ideaDe: clip(value.ideaDe, MAX_NAME),
    estado: value.estado,
    recinto: isId(value.recinto) ? value.recinto : null,
  };
}

/** `null`: no es una respuesta del servidor. Una votación rota se queda en «sin votación». */
export function parseStatus(raw: unknown): CommunityStatus | null {
  if (!isObject(raw) || !isDay(raw.hoy) || !Array.isArray(raw.muro)) return null;
  const ideas = raw.ideas;
  if (typeof ideas !== 'number' || !Number.isInteger(ideas) || ideas < 0) return null;
  const muro = raw.muro.slice(0, MAX_WALL).map(readWallEntry).filter((e): e is WallEntry => e !== null);
  return { hoy: raw.hoy, ideas, votacion: readPoll(raw.votacion), muro };
}

// --- Memoria del aparato ---

export const COMMUNITY_KEY = 'zooesponji_v3_community';

/** Lo que recuerda el aparato. Ids, nunca textos escritos por personas (salvo la copia de la última respuesta). */
export interface CommunityMemory {
  /** Votación → opción votada desde este aparato. */
  voted: Record<string, string>;
  /** Última votación de la que saltó el aviso. */
  noticed: string | null;
  /** Última votación cuya ganadora se ha visto en el tablón. */
  winnerSeen: string | null;
  /** Última votación cuya ganadora se ha anunciado con el aviso grande. */
  winnerNoticed: string | null;
  /** Entrada más nueva del muro ya vista (`wallKey`). */
  wallSeen: string | null;
  /** El tendero ya habló del tablón. */
  hinted: boolean;
  /** Día (del móvil) en que este aparato abrió el juego con tablón por primera vez. */
  firstDay: string | null;
  /** Última respuesta válida del servidor, para enseñarla sin conexión. */
  last: CommunityStatus | null;
}

export function emptyMemory(): CommunityMemory {
  return { voted: {}, noticed: null, winnerSeen: null, winnerNoticed: null, wallSeen: null, hinted: false, firstDay: null, last: null };
}

export function parseMemory(raw: string | null): CommunityMemory {
  const memory = emptyMemory();
  if (!raw) return memory;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return memory;
  }
  if (!isObject(value)) return memory;
  if (isObject(value.voted)) {
    for (const [poll, option] of Object.entries(value.voted)) if (isId(poll) && isId(option)) memory.voted[poll] = option;
  }
  memory.noticed = isId(value.noticed) ? value.noticed : null;
  memory.winnerSeen = isId(value.winnerSeen) ? value.winnerSeen : null;
  memory.winnerNoticed = isId(value.winnerNoticed) ? value.winnerNoticed : null;
  memory.wallSeen = typeof value.wallSeen === 'string' ? value.wallSeen.slice(0, 200) : null;
  memory.hinted = value.hinted === true;
  memory.firstDay = typeof value.firstDay === 'string' && DAY.test(value.firstDay) ? value.firstDay : null;
  memory.last = parseStatus(value.last);
  return memory;
}

// --- Cuentas ---

export type PollPhase = 'none' | 'open' | 'voted' | 'closed';

export function pollPhase(status: CommunityStatus, memory: CommunityMemory): PollPhase {
  const poll = status.votacion;
  if (!poll) return 'none';
  if (!poll.abierta) return 'closed';
  return memory.voted[poll.id] ? 'voted' : 'open';
}

const dayNumber = (day: string): number => Math.round(Date.parse(`${day}T00:00:00Z`) / 86_400_000);

/** Días que quedan para votar contando hoy (el último día, 1). 0 si no hay votación abierta. */
export function daysLeft(status: CommunityStatus): number {
  const poll = status.votacion;
  if (!poll) return 0;
  return Math.max(0, dayNumber(poll.cierra) - dayNumber(status.hoy) + 1);
}

/** Huella de una entrada del muro: cambia si cambia el título o el estado (elegida → hecha). */
export function wallKey(entry: WallEntry): string {
  return `${entry.titulo.es}|${entry.estado}`;
}

/** ¿Brilla la estrellita? Votación abierta sin votar, ganadora nueva o entrada nueva en el muro. */
export function hasUnseen(status: CommunityStatus, memory: CommunityMemory): boolean {
  const poll = status.votacion;
  if (poll && pollPhase(status, memory) === 'open') return true;
  if (poll && poll.ganadora && memory.winnerSeen !== poll.id) return true;
  const newest = status.muro[0];
  return newest !== undefined && memory.wallSeen !== wallKey(newest);
}

/** El aviso salta una vez por votación, si está abierta y no se ha votado, y nunca el primer día de juego. */
export function shouldNotify(status: CommunityStatus, memory: CommunityMemory, today: string): boolean {
  // El primer día que se juega no: el niño aún está descubriendo el juego.
  if (memory.firstDay === null || memory.firstDay === today) return false;
  const poll = status.votacion;
  return poll !== null && pollPhase(status, memory) === 'open' && memory.noticed !== poll.id;
}

/** El aviso de la ganadora salta una vez por votación, si aún no la ha visto en el tablón, y nunca el primer día. */
export function shouldNotifyWinner(status: CommunityStatus, memory: CommunityMemory, today: string): boolean {
  if (memory.firstDay === null || memory.firstDay === today) return false;
  const poll = status.votacion;
  return poll !== null && poll.ganadora !== null && memory.winnerSeen !== poll.id && memory.winnerNoticed !== poll.id;
}

export function localized(text: Localized, lang: Language): string {
  // El servidor solo trae español e inglés: el resto de idiomas lo ve en inglés.
  return lang === 'es' ? text.es : text.en;
}

/** La dirección del servidor de comunidad. Solo HTTPS (o localhost para probar). Sin barra final. */
export function communityUrl(env: { VITE_COMMUNITY_URL?: string }): string | null {
  const url = (env.VITE_COMMUNITY_URL ?? '').trim().replace(/\/+$/, '');
  if (/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(url)) return url;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url)) return url;
  return null;
}
