import { ACTIVITY_KEY, ageBucket, dayKey, nextActivity, parseActivity, sessionBucket, type ActivityFlag } from '../core/activity';
import { toBulkBody, toQuery, trackerUrl, type Hit, type MatomoConfig } from '../core/matomoRequest';
import type { KeyValueStore, Settings } from '../core/save';
import type { EventBus, GameEvents } from './events';

export const QUEUE_LIMIT = 50;
/** Más de media hora en segundo plano: al volver cuenta como otra sesión. */
export const SESSION_GAP_MS = 30 * 60 * 1000;

const COIN_STEPS = [100, 500, 1000, 5000] as const;
const TOGGLE_ACTIONS = { music: 'musica', sfx: 'sonidos', joystick: 'joystick' } as const;

export interface AnalyticsDeps {
  /** Sin configuración no se mide (desarrollo, tests). */
  config: MatomoConfig | null;
  store: KeyValueStore;
  events: EventBus<GameEvents>;
  send: (url: string, body: string) => void;
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

/**
 * Estadísticas anónimas hacia Matomo: sin cookies y sin identificador guardado. El id de visita se
 * crea al azar en cada sesión y vive solo en memoria. Medir nunca rompe el juego: todo fallo se traga.
 */
export class Analytics {
  private queue: string[] = [];
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

  async start(): Promise<void> {
    if (!this.deps.config) return;
    const { events } = this.deps;
    events.on('settings-changed', ({ settings }) => this.onSettings(settings));
    events.on('coins-changed', ({ coins }) => this.onCoins(coins));
    events.on('shop-unlocked', () => this.event('progreso', 'tienda-abierta'));
    events.on('animal-unlocked', ({ penId }) => this.event('progreso', 'recinto', penId));
    events.on('animal-added', ({ penId, count }) => this.event('progreso', 'animal', penId, count));
    events.on('animal-fed', ({ penId, reaction }) => this.event('juego', `comida-${reaction}`, penId));
    events.on('book-page', ({ pageId }) => this.event('libro', 'pagina', pageId));
    await this.beginSession();
  }

  track(hit: Hit): void {
    const { config } = this.deps;
    if (!config || !this.settings.stats) return;
    this.queue.push(
      toQuery(hit, config, {
        visitorId: this.visitorId,
        rand: this.deps.randomId(),
        screen: this.screen,
        version: this.deps.version,
        platform: this.deps.platform,
        language: this.deps.language(),
        sessions: this.sessions,
        age: this.age,
      }),
    );
    if (this.queue.length > QUEUE_LIMIT) this.queue.shift();
  }

  /** Pantalla nueva. Las escenas se montan de nuevo al girar o redimensionar: la misma no se repite. */
  screenView(name: string): void {
    if (name === this.screen) return;
    this.screen = name;
    this.track({ kind: 'screen', name });
  }

  flush(): void {
    const { config } = this.deps;
    if (!config || this.queue.length === 0) return;
    const body = toBulkBody(this.queue);
    this.queue = [];
    try {
      this.deps.send(trackerUrl(config), body);
    } catch {
      // Sin red o sin permiso: el lote se pierde.
    }
  }

  /** El aviso puede llegar dos veces (Capacitor y navegador): solo cuenta el cambio. */
  setBackground(hidden: boolean): void {
    const now = this.deps.now().getTime();
    if (hidden) {
      if (this.hiddenAt !== null) return;
      this.hiddenAt = now;
      this.event('sesion', 'fin', undefined, Math.round((now - this.startedAt) / 1000));
      this.flush();
      return;
    }
    if (this.hiddenAt === null) return;
    const away = now - this.hiddenAt;
    this.hiddenAt = null;
    if (away >= SESSION_GAP_MS) void this.beginSession();
    else this.startedAt = now;
  }

  /** Solo el mensaje, sin traza ni direcciones, y se envía ya: tras un error puede no haber otra ocasión. */
  reportError(error: unknown): void {
    const raw = error instanceof Error ? error.message : String(error);
    const message = raw.replace(/\S+:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 100);
    this.event('error', 'no-controlado', message || 'desconocido');
    this.flush();
  }

  private event(category: string, action: string, name?: string, value?: number): void {
    this.track({ kind: 'event', category, action, ...(name !== undefined ? { name } : {}), ...(value !== undefined ? { value } : {}) });
  }

  private async beginSession(): Promise<void> {
    if (!this.deps.config || !this.settings.stats) return;
    const now = this.deps.now();
    this.visitorId = this.deps.randomId();
    this.startedAt = now.getTime();
    this.coinSteps.clear();
    const today = dayKey(now);
    let flags: readonly ActivityFlag[] = [];
    try {
      const next = nextActivity(parseActivity(await this.deps.store.get(ACTIVITY_KEY)), today);
      await this.deps.store.set(ACTIVITY_KEY, JSON.stringify(next.state));
      this.sessions = sessionBucket(next.state.sessions);
      this.age = ageBucket(next.state.firstDay, today);
      flags = next.flags;
    } catch {
      // Sin almacén no se sabe si es nuevo: mejor no contar que contar de más.
    }
    this.event('sesion', 'inicio');
    for (const flag of flags) this.event('activo', flag);
    if (this.screen) this.track({ kind: 'screen', name: this.screen });
  }

  private onSettings(next: Settings): void {
    const before = this.settings;
    this.settings = next;
    if (!next.stats) {
      this.queue = [];
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
