import { dayKey } from '../core/activity';
import type { KeyValueStore } from '../core/save';
import {
  UPDATE_KEY, afterLater, afterOffer, decideUpdate, emptyUpdateMemory, isSafeMoment, parseUpdateMemory,
  type UpdateKey, type UpdateKind, type UpdateMemory,
} from '../core/updatePolicy';
import type { UpdateNoticeData } from '../scenes/UpdateNoticeScene';
import type { PlayUpdater } from './appUpdate';
import type { EventBus, GameEvents } from './events';

export interface UpdateNoticeDeps {
  /** Solo en Android nativo hay ventana de Play. */
  native: boolean;
  store: KeyValueStore;
  events: EventBus<GameEvents>;
  /** El tablón: de él sale la clave `actualizacion` (solo la de esta sesión). */
  community: () => { liveUpdateKey(): UpdateKey | null } | null;
  play: () => PlayUpdater | null;
  /** Escenas activas ahora (para saber si es un momento seguro). */
  activeScenes: () => string[];
  /** Abre la escena del aviso. */
  show: (data: UpdateNoticeData) => void;
  /** Cierra la pantalla de bloqueo. */
  close: () => void;
  /** Día de hoy en el móvil (`AAAA-MM-DD`). */
  today?: () => string;
}

/**
 * Junta servidor, Play y momento seguro, y decide si sale el aviso. Nunca lanza.
 * Nunca bloquea si Play no confirma ahora que la actualización inmediata está disponible y permitida.
 */
export class UpdateNotice {
  private mem: UpdateMemory = emptyUpdateMemory();
  private ready: Promise<void> | null = null;
  /** Hay una comprobación en marcha o un aviso abierto: otra llamada no hace nada. */
  private busy = false;

  constructor(private readonly deps: UpdateNoticeDeps) {}

  start(): Promise<void> {
    this.ready ??= (async () => {
      try {
        this.mem = parseUpdateMemory(await this.deps.store.get(UPDATE_KEY));
      } catch {
        this.mem = emptyUpdateMemory();
      }
    })();
    return this.ready;
  }

  get memory(): Readonly<UpdateMemory> {
    return this.mem;
  }

  /** Se llama en los momentos en que podría tocar: título, respuesta del servidor y vuelta a la app. */
  async check(): Promise<void> {
    if (!this.deps.native || this.busy) return;
    this.busy = true;
    let keepBusy = false;
    try {
      await this.start();
      keepBusy = await this.evaluate();
    } catch {
      // El aviso nunca impide jugar.
    } finally {
      if (!keepBusy) this.busy = false;
    }
  }

  /** Devuelve `true` si queda un aviso abierto (o Play en marcha). */
  private async evaluate(): Promise<boolean> {
    const key = this.deps.community()?.liveUpdateKey() ?? null;
    if (!key || !this.safe()) return false;
    const play = this.deps.play();
    if (!play) return false;
    const info = await play.info();
    if (!info.available || !info.immediateAllowed || info.versionCode === null) return false;
    const decision = decideUpdate({ code: info.versionCode, key, memory: this.mem, today: this.today() });
    // Play tarda: el niño puede haber abierto algo mientras tanto.
    if (decision.action === 'nada' || !this.safe()) return false;
    this.mem = afterOffer(this.mem, key, this.today());
    this.persist();
    if (decision.action === 'suave') {
      this.showSoft(decision.kind, key, play);
      return true;
    }
    return this.force(decision.kind, play);
  }

  private showSoft(kind: UpdateKind, key: UpdateKey, play: PlayUpdater): void {
    this.emit('update-offered', { kind });
    this.deps.show({
      mode: 'suave',
      kind,
      onAccept: () => {
        this.emit('update-accepted', { kind });
        void play.immediate().then((result) => {
          if (result === 'cancelada' || result === 'fallo') {
            this.emit('update-failed', { kind });
            // Dijo que sí y luego canceló: cuenta como una vez aplazada.
            if (result === 'cancelada') {
              this.mem = afterLater(this.mem, key, this.today());
              this.persist();
            }
          }
        }).finally(() => { this.busy = false; });
      },
      onLater: () => {
        this.mem = afterLater(this.mem, key, this.today());
        this.persist();
        this.emit('update-later', { kind, deferred: this.mem.aplazadas });
        this.busy = false;
      },
    });
  }

  /** La ventana de Play que no deja seguir. Si el jugador la cancela, la pantalla de bloqueo. Si Play falla, se deja jugar. */
  private async force(kind: UpdateKind, play: PlayUpdater): Promise<boolean> {
    this.emit('update-forced', { kind: kind === 'rota' ? 'rota' : 'grande' });
    const result = await play.immediate();
    if (result !== 'cancelada') {
      if (result === 'fallo') this.emit('update-failed', { kind });
      return false;
    }
    this.emit('update-failed', { kind });
    if (!this.safe()) return false;
    this.emit('update-offered', { kind });
    this.deps.show({
      mode: 'bloqueo',
      kind,
      onAccept: () => {
        this.emit('update-accepted', { kind });
        void play.immediate().then((again) => {
          if (again === 'cancelada') {
            this.emit('update-failed', { kind });
            return;
          }
          if (again === 'fallo') this.emit('update-failed', { kind });
          // Actualizada (la app se reinicia), o Play ya no puede: nunca se deja a nadie atrapado.
          this.deps.close();
          this.busy = false;
        });
      },
      onLater: () => undefined,
    });
    return true;
  }

  private safe(): boolean {
    return isSafeMoment(this.deps.activeScenes());
  }

  private today(): string {
    return this.deps.today?.() ?? dayKey(new Date());
  }

  private persist(): void {
    try {
      void this.deps.store.set(UPDATE_KEY, JSON.stringify(this.mem)).catch(() => undefined);
    } catch {
      // Sin memoria: lo peor es que el aviso vuelva a salir otro día.
    }
  }

  private emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    try {
      this.deps.events.emit(event, payload);
    } catch {
      // Un oyente roto no rompe el aviso.
    }
  }
}
