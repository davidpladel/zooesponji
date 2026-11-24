import { dayKey } from '../core/activity';
import {
  REVIEW_KEY, addPlay, isDue, markAttempt, parseReview, shouldRequest, type ReviewMemory,
} from '../core/reviewPrompt';
import type { KeyValueStore } from '../core/save';
import type { EventBus, GameEvents } from './events';

/** Quien de verdad llama a la API de reseñas de Play. En las pruebas, uno falso. */
export interface Reviewer {
  /** Resuelve cuando Play termina (no dice si salió la tarjeta ni si valoró). */
  request(): Promise<void>;
}

export interface ReviewDeps {
  reviewer: Reviewer;
  store: KeyValueStore;
  events: EventBus<GameEvents>;
  now: () => Date;
  /** Tiempo máximo con la tarjeta abierta: si Play no contesta, el juego sigue. */
  timeoutMs?: number;
}

/** Lo que mira el mapa en este momento. */
export interface ReviewAt {
  boughtAnimal: boolean;
  tutorialReady: boolean;
  panelOpen: boolean;
  natural: boolean;
}

/** Si Play no contesta en este rato, el juego sigue igual. */
export const CARD_TIMEOUT_MS = 60_000;
/** Cada cuántos segundos de juego se guarda el contador. */
export const SAVE_EVERY_S = 60;

/**
 * La petición de valoración en Google Play: cuenta el juego, recuerda los avisos de esta partida y pide con la
 * tarjeta de Google encima. Nunca lanza: la valoración nunca impide jugar.
 */
export class Review {
  /** `null`: el almacén ha fallado (o aún no se ha leído) y no se pide nada. */
  private memory: ReviewMemory | null = null;
  /** Segundos de juego de esta partida (solo en memoria). */
  private sessionPlay = 0;
  private lastNotice: number | null = null;
  private lastAd: number | null = null;
  /** Segundos de juego de la partida en que empezó a cumplir las condiciones. */
  private dueSince: number | null = null;
  /** `canRequest` acaba de decir que sí: `request` solo pide entonces. */
  private armed = false;
  private showing = false;
  private unsaved = 0;

  constructor(private readonly deps: ReviewDeps) {
    const notice = () => (this.lastNotice = this.sessionPlay);
    deps.events.on('poll-notice', notice);
    deps.events.on('poll-winner-notice', notice);
    deps.events.on('update-offered', notice);
    deps.events.on('ad-offered', () => (this.lastAd = this.sessionPlay));
  }

  async start(): Promise<void> {
    try {
      this.memory = parseReview(await this.deps.store.get(REVIEW_KEY));
    } catch {
      this.memory = null;
    }
  }

  /** La tarjeta de Google está (o puede estar) en pantalla. */
  get open(): boolean {
    return this.showing;
  }

  /** Pasan `seconds` de juego. Con la tarjeta abierta no cuenta. */
  tick(seconds: number): void {
    if (this.showing || !this.memory) return;
    try {
      const next = addPlay(this.memory, seconds);
      const added = next.playSeconds - this.memory.playSeconds;
      if (added <= 0) return;
      this.memory = next;
      this.sessionPlay += added;
      this.unsaved += added;
      if (this.unsaved >= SAVE_EVERY_S) void this.persist();
    } catch {
      // La valoración nunca impide jugar.
    }
  }

  /** Al ir a segundo plano (o cerrar) se guarda el contador. */
  setBackground(hidden: boolean): void {
    if (hidden) void this.persist();
  }

  /** ¿Toca pedirla ahora? Si dice que sí, la siguiente `request()` pide. */
  canRequest(at: ReviewAt): boolean {
    this.armed = false;
    try {
      if (this.showing || !this.memory) return false;
      const today = dayKey(this.deps.now());
      if (!isDue(this.memory, at.boughtAnimal, today)) {
        this.dueSince = null;
        return false;
      }
      this.dueSince ??= this.sessionPlay;
      const since = (at0: number | null) => (at0 === null ? null : this.sessionPlay - at0);
      this.armed = shouldRequest(this.memory, {
        ...at,
        dueFor: this.sessionPlay - this.dueSince,
        sinceNotice: since(this.lastNotice),
        sinceAd: since(this.lastAd),
        today,
      });
      return this.armed;
    } catch {
      return false;
    }
  }

  /**
   * Pide la valoración: marca y guarda el intento antes de llamar a Play y espera a que termine (o al tiempo
   * máximo). Si Play falla, solo se avisa en el bus; el niño no ve nada.
   */
  async request(): Promise<void> {
    if (!this.armed || this.showing || !this.memory) return;
    this.armed = false;
    this.showing = true;
    let attempt = 0;
    try {
      this.memory = markAttempt(this.memory, dayKey(this.deps.now()));
      attempt = this.memory.attempts;
      this.dueSince = null;
      await this.persist();
      this.deps.events.emit('review-requested', { attempt });
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<'tiempo'>((resolve) => {
        timer = setTimeout(() => resolve('tiempo'), this.deps.timeoutMs ?? CARD_TIMEOUT_MS);
      });
      try {
        await Promise.race([this.deps.reviewer.request(), timeout]);
      } finally {
        clearTimeout(timer);
      }
    } catch {
      if (attempt > 0) this.safeEmit(attempt);
    } finally {
      this.showing = false;
    }
  }

  private safeEmit(attempt: number): void {
    try {
      this.deps.events.emit('review-failed', { attempt });
    } catch {
      // Igual que arriba.
    }
  }

  private async persist(): Promise<void> {
    if (!this.memory) return;
    this.unsaved = 0;
    try {
      await this.deps.store.set(REVIEW_KEY, JSON.stringify(this.memory));
    } catch {
      // Se vuelve a intentar al siguiente minuto de juego.
    }
  }
}

let current: Review | null = null;

/** `null` fuera de Android (o antes de montarla): no se pide nada. */
export function getReview(): Review | null {
  return current;
}

export function setReview(review: Review | null): void {
  current = review;
}
