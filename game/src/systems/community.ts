import {
  COMMUNITY_KEY, drawingName, emptyMemory, hasUnseen, parseMemory, parseStatus, pollPhase, shouldNotify, wallKey,
  type CommunityMemory, type CommunityStatus, type PollPhase,
} from '../core/community';
import type { KeyValueStore } from '../core/save';
import type { EventBus, GameEvents } from './events';

export type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string; credentials?: 'omit'; cache?: 'no-store'; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export interface CommunityDeps {
  /** Sin barra al final, p. ej. `https://api.zooesponji.com`. */
  baseUrl: string;
  fetch: FetchLike;
  store: KeyValueStore;
  events: EventBus<GameEvents>;
}

/** Más que esto esperando al servidor es «sin conexión». */
const TIMEOUT_MS = 8000;

/**
 * El tablón de la comunidad: pide el estado, recuerda qué se ha votado y visto, y envía el voto.
 * Nunca lanza: todo fallo acaba en «sin conexión». Sin red, el juego sigue igual.
 */
export class Community {
  private last: CommunityStatus | null = null;
  private mem: CommunityMemory = emptyMemory();
  private ok = false;
  private voting: Promise<'ok' | 'closed' | 'offline'> | null = null;

  constructor(private readonly deps: CommunityDeps) {}

  async start(): Promise<void> {
    try {
      this.mem = parseMemory(await this.deps.store.get(COMMUNITY_KEY));
    } catch {
      this.mem = emptyMemory();
    }
    this.last = this.mem.last;
    await this.refresh();
  }

  get status(): CommunityStatus | null {
    return this.last;
  }

  get online(): boolean {
    return this.ok;
  }

  get memory(): Readonly<CommunityMemory> {
    return this.mem;
  }

  phase(): PollPhase {
    return this.last ? pollPhase(this.last, this.mem) : 'none';
  }

  unseen(): boolean {
    return this.last !== null && hasUnseen(this.last, this.mem);
  }

  notify(): boolean {
    return this.last !== null && shouldNotify(this.last, this.mem);
  }

  async refresh(): Promise<boolean> {
    try {
      const status = parseStatus(await this.request('/estado.php'));
      this.ok = status !== null;
      if (status) {
        this.last = status;
        this.mem.last = status;
        this.persist();
      }
    } catch {
      this.ok = false;
    }
    this.emit('community-updated', {});
    return this.ok;
  }

  /** Vota (o cambia el voto). Solo se anota si el servidor responde bien. */
  vote(optionId: string): Promise<'ok' | 'closed' | 'offline'> {
    this.voting ??= this.send(optionId).finally(() => {
      this.voting = null;
    });
    return this.voting;
  }

  markBoardSeen(): void {
    const status = this.last;
    if (!status) return;
    if (status.votacion?.ganadora) this.mem.winnerSeen = status.votacion.id;
    const newest = status.muro[0];
    if (newest) this.mem.wallSeen = wallKey(newest);
    this.persist();
  }

  markNoticed(): void {
    const poll = this.last?.votacion;
    if (!poll) return;
    this.mem.noticed = poll.id;
    this.persist();
  }

  markHinted(): void {
    this.mem.hinted = true;
    this.persist();
  }

  drawingUrl(name: string | null): string | null {
    const file = drawingName(name);
    return file ? `${this.deps.baseUrl}/dibujo.php?f=${file}` : null;
  }

  // --- Por dentro ---

  private async send(optionId: string): Promise<'ok' | 'closed' | 'offline'> {
    const poll = this.last?.votacion;
    if (!poll || !poll.abierta || !poll.opciones.some((o) => o.id === optionId)) return 'closed';
    const previous = this.mem.voted[poll.id] ?? null;
    if (previous === optionId) return 'ok';
    const body: Record<string, string> = { votacion: poll.id, opcion: optionId };
    if (previous) body.anterior = previous;
    let answer: { ok: boolean; status: number; body: unknown };
    try {
      answer = await this.fetchWithTimeout(
        '/voto.php',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
        (head) => {
          // En cuanto el servidor dice que sí, el voto ya está sumado: se anota antes de leer el reparto,
          // así un cuerpo que se cuelga no lo deja sin guardar.
          if (!head.ok) return;
          this.ok = true;
          this.mem.voted[poll.id] = optionId;
          this.persist();
        },
      );
    } catch {
      this.ok = false;
      return 'offline';
    }
    if (!answer.ok) {
      // 409: la votación ya está cerrada (o es otra). Se pone al día y no se anota nada.
      if (answer.status === 409 || answer.status === 400) {
        await this.refresh();
        return 'closed';
      }
      return 'offline';
    }
    const data = answer.body as { reparto?: unknown } | null;
    const share = data && typeof data.reparto === 'object' && data.reparto !== null ? (data.reparto as Record<string, unknown>) : {};
    for (const option of poll.opciones) {
      const n = share[option.id];
      if (typeof n === 'number' && Number.isFinite(n)) poll.reparto[option.id] = Math.min(100, Math.max(0, Math.round(n)));
    }
    this.mem.last = this.last;
    this.persist();
    this.emit('board-voted', { poll: poll.id, option: optionId, changed: previous !== null });
    return 'ok';
  }

  private async request(path: string): Promise<unknown> {
    const answer = await this.fetchWithTimeout(path, { method: 'GET', cache: 'no-store' });
    if (!answer.ok) throw new Error(`HTTP ${answer.status}`);
    return answer.body;
  }

  /** El límite de tiempo cubre también la lectura del cuerpo; un cuerpo que no es JSON (o se cuelga) cuenta como `null`. */
  private async fetchWithTimeout(
    path: string,
    init: { method: string; headers?: Record<string, string>; body?: string; cache?: 'no-store' },
    onHeaders?: (head: { ok: boolean; status: number }) => void,
  ): Promise<{ ok: boolean; status: number; body: unknown }> {
    const controller = typeof AbortController === 'undefined' ? null : new AbortController();
    let expire: () => void = () => undefined;
    const expired = new Promise<null>((resolve) => { expire = () => resolve(null); });
    const timer = setTimeout(() => { controller?.abort(); expire(); }, TIMEOUT_MS);
    try {
      const answer = await this.deps.fetch(`${this.deps.baseUrl}${path}`, { ...init, credentials: 'omit', signal: controller?.signal });
      try { onHeaders?.({ ok: answer.ok, status: answer.status }); } catch { /* anotar no debe romper la respuesta */ }
      const body = await Promise.race([answer.json().catch(() => null), expired]);
      return { ok: answer.ok, status: answer.status, body };
    } finally {
      clearTimeout(timer);
    }
  }

  private persist(): void {
    try {
      void this.deps.store.set(COMMUNITY_KEY, JSON.stringify(this.mem)).catch(() => undefined);
    } catch {
      // Sin memoria antes que un error: lo peor es que el aviso vuelva a salir.
    }
  }

  private emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    try {
      this.deps.events.emit(event, payload);
    } catch {
      // Un oyente roto no rompe el tablón.
    }
  }
}

let current: Community | null = null;

export function setCommunity(community: Community | null): void {
  current = community;
}

/** `null` sin configuración o antes de arrancar: no hay tablón. */
export function getCommunity(): Community | null {
  return current;
}
