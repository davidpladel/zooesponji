import { ACTIVITY_KEY, ageBucket, cohortWeek, dayKey, nextActivity, parseActivity, sessionBucket, type ActivityFlag, type ReturnFlag } from '../core/activity';
import { durationBucket, pendingBucket, type ActionOf, type Category } from '../core/eventCatalog';
import { QUEUE_KEY, ack, clearLost, emptyQueue, expire, maxAgeMs, oldestAge, parseQueue, push, stamp, takeBatch, type QueueState } from '../core/hitQueue';
import { toBulkBody, toQuery, trackerUrl, type Hit, type MatomoConfig } from '../core/matomoRequest';
import type { KeyValueStore, Settings } from '../core/save';
import type { EventBus, GameEvents } from './events';

/** Más de media hora en segundo plano: al volver cuenta como otra sesión. */
export const SESSION_GAP_MS = 30 * 60 * 1000;

const COIN_STEPS = [100, 500, 1000, 5000] as const;
const TOGGLE_ACTIONS = { music: 'musica', sfx: 'sonidos', joystick: 'joystick' } as const;

export interface AnalyticsDeps {
  /** Sin configuración no se mide (desarrollo, tests). */
  config: MatomoConfig | null;
  store: KeyValueStore;
  events: EventBus<GameEvents>;
  /** `true` si el lote salió; `false` si no hay red. Con `no-cors` no se sabe más que eso. */
  send: (url: string, body: string) => Promise<boolean>;
  now: () => Date;
  /** 16 hexadecimales al azar. */
  randomId: () => string;
  version: string;
  platform: 'android' | 'web';
  language: () => string;
  /** Ajustes y monedas al arrancar; después se siguen por el bus. */
  settings: Settings;
  coins: number;
}

/** Quien lleva el detalle del juego (`GameTracker`) se entera por aquí de la vida de la sesión. */
export interface AnalyticsHooks {
  sessionStarted(flags: readonly ActivityFlag[]): void;
  /** Segundos del rato en primer plano que acaba. Llega antes del `sesion / fin`. */
  goingBackground(seconds: number): void;
  resumed(): void;
  screenShown(name: string): void;
}

/**
 * Estadísticas anónimas hacia Matomo: sin cookies y sin identificador guardado. El id de visita se
 * crea al azar en cada sesión. Lo que no se puede enviar espera en el dispositivo y sale después con
 * su fecha real. Medir nunca rompe el juego: todo fallo se traga.
 */
export class Analytics {
  private queue: QueueState = emptyQueue();
  private dirty = false;
  private sending = false;
  private hooks: AnalyticsHooks | null = null;
  private visitorId = '';
  private screen = '';
  private sessions = '1';
  private age = 'd0';
  private settings: Settings;
  private coins: number;
  private readonly coinSteps = new Set<number>();
  private startedAt = 0;
  private hiddenAt: number | null = null;

  constructor(private readonly deps: AnalyticsDeps) {
    this.settings = deps.settings;
    this.coins = deps.coins;
  }

  /** Hay configuración y el jugador no la ha apagado. */
  get active(): boolean {
    return this.deps.config !== null && this.settings.stats;
  }

  setHooks(hooks: AnalyticsHooks): void {
    this.hooks = hooks;
  }

  async start(): Promise<void> {
    if (!this.deps.config) return;
    const { events } = this.deps;
    try {
      this.queue = parseQueue(await this.deps.store.get(QUEUE_KEY));
    } catch {
      this.queue = emptyQueue();
    }
    const waiting = this.queue.hits.length;
    const waitingAge = oldestAge(this.queue, this.deps.now().getTime());
    events.on('settings-changed', ({ settings }) => this.onSettings(settings));
    events.on('coins-changed', ({ coins }) => this.onCoins(coins));
    events.on('animal-unlocked', ({ penId }) => this.event('progreso', 'recinto', penId));
    events.on('animal-added', ({ penId, count }) => this.event('progreso', 'animal', penId, count));
    await this.beginSession();
    if (waiting > 0 && waitingAge !== null) this.event('calidad', 'pendientes', pendingBucket(waitingAge), waiting);
  }

  track(hit: Hit): void {
    const { config } = this.deps;
    if (!config || !this.settings.stats) return;
    const q = toQuery(hit, config, {
      visitorId: this.visitorId,
      rand: this.deps.randomId(),
      screen: this.screen,
      version: this.deps.version,
      platform: this.deps.platform,
      language: this.deps.language(),
      sessions: this.sessions,
      age: this.age,
    });
    this.queue = push(this.queue, { q, t: this.deps.now().getTime() });
    this.dirty = true;
  }

  event<C extends Category>(category: C, action: ActionOf<C>, name?: string, value?: number): void {
    this.track({ kind: 'event', category, action, ...(name !== undefined ? { name } : {}), ...(value !== undefined ? { value } : {}) });
  }

  /** Pantalla nueva. Las escenas se montan de nuevo al girar o redimensionar: la misma no se repite. */
  screenView(name: string): void {
    if (name === this.screen) return;
    this.screen = name;
    this.track({ kind: 'screen', name });
    this.hooks?.screenShown(name);
  }

  /**
   * Guarda la cola y la envía por lotes. Un lote solo se borra cuando ha salido; sin red se queda
   * para la próxima. Si ya hay un envío en marcha, ese mismo recoge lo que se haya añadido.
   */
  async flush(): Promise<void> {
    const { config } = this.deps;
    if (!config || this.sending) return;
    this.sending = true;
    try {
      await this.persist();
      for (;;) {
        const now = this.deps.now().getTime();
        const kept = expire(this.queue, now, maxAgeMs(config.replayHours));
        if (kept !== this.queue) {
          this.queue = kept;
          this.dirty = true;
        }
        const batch = takeBatch(this.queue);
        if (batch.length === 0) break;
        if (!(await this.trySend(trackerUrl(config), toBulkBody(batch.map((hit) => stamp(hit, now)))))) break;
        this.queue = ack(this.queue, batch);
        this.dirty = true;
        this.reportLost();
      }
      await this.persist();
    } finally {
      this.sending = false;
    }
  }

  /** El aviso puede llegar dos veces (Capacitor y navegador): solo cuenta el cambio. */
  setBackground(hidden: boolean): void {
    const now = this.deps.now().getTime();
    if (hidden) {
      if (this.hiddenAt !== null) return;
      this.hiddenAt = now;
      const seconds = Math.round((now - this.startedAt) / 1000);
      if (this.active) this.hooks?.goingBackground(seconds);
      this.event('sesion', 'fin', durationBucket(seconds), seconds);
      void this.flush();
      return;
    }
    if (this.hiddenAt === null) return;
    const away = now - this.hiddenAt;
    this.hiddenAt = null;
    if (away >= SESSION_GAP_MS) {
      void this.beginSession();
      return;
    }
    this.startedAt = now;
    if (this.active) this.hooks?.resumed();
  }

  /** Solo el mensaje, sin traza ni direcciones, y se envía ya: tras un error puede no haber otra ocasión. */
  reportError(error: unknown): void {
    const raw = error instanceof Error ? error.message : String(error);
    const message = raw.replace(/\S+:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 100);
    this.event('error', 'no-controlado', message || 'desconocido');
    void this.flush();
  }

  private async trySend(url: string, body: string): Promise<boolean> {
    try {
      return await this.deps.send(url, body);
    } catch {
      return false;
    }
  }

  private async persist(): Promise<void> {
    if (!this.dirty) return;
    this.dirty = false;
    try {
      await this.deps.store.set(QUEUE_KEY, JSON.stringify(this.queue));
    } catch {
      // Sin almacén la cola vive solo en memoria.
    }
  }

  /** Tras un envío con éxito: cuenta lo que hubo que tirar desde el anterior. */
  private reportLost(): void {
    const { full, expired } = this.queue.lost;
    if (full + expired === 0 || !this.active) return;
    this.queue = clearLost(this.queue);
    if (full > 0) this.event('calidad', 'perdidos', 'cola-llena', full);
    if (expired > 0) this.event('calidad', 'perdidos', 'caducado', expired);
  }

  private async beginSession(): Promise<void> {
    if (!this.active) return;
    const now = this.deps.now();
    this.visitorId = this.deps.randomId();
    this.startedAt = now.getTime();
    this.coinSteps.clear();
    const today = dayKey(now);
    let flags: readonly ActivityFlag[] = [];
    let returns: readonly ReturnFlag[] = [];
    let cohort: string | undefined;
    try {
      const next = nextActivity(parseActivity(await this.deps.store.get(ACTIVITY_KEY)), today);
      await this.deps.store.set(ACTIVITY_KEY, JSON.stringify(next.state));
      this.sessions = sessionBucket(next.state.sessions);
      this.age = ageBucket(next.state.firstDay, today);
      cohort = cohortWeek(next.state.firstDay);
      flags = next.flags;
      returns = next.returns;
    } catch {
      // Sin almacén no se sabe si es nuevo: mejor no contar que contar de más.
    }
    this.event('sesion', 'inicio');
    for (const flag of flags) this.event('activo', flag, flag === 'nuevo' ? cohort : undefined);
    for (const flag of returns) this.event('activo', flag, cohort);
    if (this.screen) this.track({ kind: 'screen', name: this.screen });
    this.hooks?.sessionStarted(flags);
  }

  private onSettings(next: Settings): void {
    const before = this.settings;
    this.settings = next;
    if (!next.stats) {
      this.queue = emptyQueue();
      this.dirty = true;
      void this.persist();
      return;
    }
    if (!before.stats) {
      void this.beginSession();
      return;
    }
    for (const key of ['music', 'sfx', 'joystick'] as const) {
      if (next[key] !== before[key]) this.event('ajustes', TOGGLE_ACTIONS[key], next[key] ? 'on' : 'off');
    }
    if (next.language && next.language !== before.language) this.event('ajustes', 'idioma', next.language);
  }

  private onCoins(coins: number): void {
    for (const step of COIN_STEPS) {
      if (this.coins < step && coins >= step && !this.coinSteps.has(step)) {
        this.coinSteps.add(step);
        this.event('progreso', 'monedas', String(step));
      }
    }
    this.coins = coins;
  }
}

let current: Analytics | null = null;

export function setAnalytics(analytics: Analytics | null): void {
  current = analytics;
}

/** `null` mientras no se haya instalado (o si no hay configuración). */
export function getAnalytics(): Analytics | null {
  return current;
}
