import { dayKey } from '../core/activity';
import {
  ADS_KEY, AD_SLOTS, SESSION_GAP_S,
  canOffer, newAdSession, parsePacing, resolvePanel, rollDay, secondsUntil, tick,
  type AdOutcome, type AdPacingState, type AdSessionState, type AdSlot,
} from '../core/adPacing';
import { adReward, type GameState } from '../core/economy';
import type { KeyValueStore } from '../core/save';
import type { EventBus, GameEvents } from './events';

/** Quien de verdad carga y enseña los anuncios. En las pruebas, uno falso. */
export interface AdProvider {
  /** Carga un anuncio. `true` si queda listo. */
  load(slot: AdSlot): Promise<boolean>;
  /** Enseña el anuncio cargado y resuelve cuando se cierra. */
  show(slot: AdSlot): Promise<{ shown: boolean; rewarded: boolean }>;
}

/** Cómo acabó un panel aceptado. */
export type AdResult = 'visto' | 'cortado' | 'fallo';

export interface AdsDeps {
  provider: AdProvider;
  /** Huecos con bloque de anuncios configurado. */
  slots: readonly AdSlot[];
  store: KeyValueStore;
  events: EventBus<GameEvents>;
  now: () => Date;
  state: () => GameState;
  earnCoins: (amount: number) => Promise<void>;
  pauseSound: (paused: boolean) => void;
}

/** Se pide el anuncio cuando falta esto o menos para que las reglas dejen ofrecerlo. */
const PRELOAD_S = 60;
/** Tras una carga fallida no se vuelve a probar antes de esto. */
const RETRY_MS = 120_000;
/** Un anuncio cargado hace más de esto se vuelve a pedir: Google los caduca a la hora. */
const STALE_MS = 50 * 60_000;
/** Cada cuántos segundos de juego se guarda la espera. */
const SAVE_EVERY_S = 30;

interface SlotLoad {
  loadedAt: number | null;
  failedAt: number | null;
  loading: Promise<void> | null;
  /** Ya se avisó de que no había anuncio en esta ocasión. */
  emptyTold: boolean;
}

const idle = (): SlotLoad => ({ loadedAt: null, failedAt: null, loading: null, emptyTold: false });

/**
 * La publicidad con premio: cuándo se pide un anuncio, cuándo se puede ofrecer y qué pasa al aceptarlo.
 * Nunca lanza: todo fallo acaba en «no hay anuncio». La publicidad nunca impide jugar.
 */
export class Ads {
  /** `null`: el almacén ha fallado (o aún no se ha leído) y no se ofrece nada. */
  private pacing: AdPacingState | null = null;
  private session: AdSessionState = newAdSession();
  private readonly loads: Record<AdSlot, SlotLoad> = { tienda: idle(), pausa: idle() };
  /** El panel abierto: su premio y el saldo que había, fijados al abrirlo. */
  private pending: { slot: AdSlot; amount: number; balance: number } | null = null;
  private busy = false;
  private unsaved = 0;
  private hiddenAt: number | null = null;

  constructor(private readonly deps: AdsDeps) {}

  async start(): Promise<void> {
    this.pacing = await this.read();
  }

  /** Hay un anuncio en pantalla. */
  get showing(): boolean {
    return this.busy;
  }

  /** Pasan `seconds` de juego: el juego en pantalla y la partida empezada. */
  tick(seconds: number): void {
    if (this.busy || !this.pacing) return;
    try {
      const next = tick(rollDay(this.pacing, this.today()), this.session, seconds);
      this.pacing = next.state;
      this.session = next.session;
      this.unsaved += seconds;
      if (this.unsaved >= SAVE_EVERY_S) this.persist();
      for (const slot of this.deps.slots) this.preload(slot);
    } catch {
      // La publicidad nunca impide jugar.
    }
  }

  /** Al ir a segundo plano se guarda la espera; al volver tras un rato largo empieza otra partida. */
  setBackground(hidden: boolean): void {
    try {
      const now = this.time();
      if (hidden) {
        this.hiddenAt ??= now;
        this.persist();
        return;
      }
      const since = this.hiddenAt;
      this.hiddenAt = null;
      if (since === null || now - since < SESSION_GAP_S * 1000) return;
      this.session = newAdSession();
      for (const slot of AD_SLOTS) this.loads[slot].emptyTold = false;
      // Una partida nueva vuelve a intentar leer el almacén si antes falló.
      if (!this.pacing) void this.read().then((pacing) => (this.pacing = pacing));
    } catch {
      // Igual que arriba.
    }
  }

  /** Reglas de ritmo cumplidas y anuncio listo. Si lo único que falta es el anuncio, lo avisa una vez por ocasión. */
  canOffer(slot: AdSlot): boolean {
    try {
      if (this.busy || this.pending || !this.pacing || !this.deps.slots.includes(slot)) return false;
      if (!canOffer(slot, this.pacing, this.session, this.today())) return false;
      if (this.isReady(slot)) return true;
      const load = this.loads[slot];
      if (!load.emptyTold) {
        load.emptyTold = true;
        this.emit('ad-empty', { slot });
      }
      return false;
    } catch {
      return false;
    }
  }

  isReady(slot: AdSlot): boolean {
    const at = this.loads[slot].loadedAt;
    return at !== null && this.time() - at < STALE_MS;
  }

  /** Se abre el panel: devuelve el premio y lo deja fijado. */
  offer(slot: AdSlot): number {
    const state = this.deps.state();
    const amount = adReward(state);
    this.pending = { slot, amount, balance: state.coins };
    this.emit('ad-offered', { slot, coins: amount, balance: state.coins });
    return amount;
  }

  /** El niño quiere ver el anuncio: se enseña y, solo si se ve entero, se pagan las monedas. */
  async accept(slot: AdSlot): Promise<AdResult> {
    const pending = this.pending;
    if (!pending || pending.slot !== slot || this.busy) return 'fallo';
    this.pending = null;
    this.busy = true;
    this.emit('ad-accepted', { slot, balance: pending.balance });
    this.sound(true);
    let result = { shown: false, rewarded: false };
    try {
      result = await this.deps.provider.show(slot);
    } catch {
      // Se queda en «no se pudo enseñar».
    }
    this.sound(false);
    this.busy = false;
    this.loads[slot].loadedAt = null;
    const shown = result?.shown === true;
    this.resolve(slot, shown ? 'shown' : 'failed');
    if (!shown) {
      this.emit('ad-failed', { slot });
      return 'fallo';
    }
    if (result.rewarded !== true) {
      this.emit('ad-cut', { slot });
      return 'cortado';
    }
    try {
      await this.deps.earnCoins(pending.amount);
    } catch {
      // El anuncio se ha visto: se cuenta aunque el guardado falle.
    }
    this.emit('ad-watched', { slot, coins: pending.amount, balance: pending.balance });
    return 'visto';
  }

  /** El niño toca la X. */
  decline(slot: AdSlot): void {
    const pending = this.pending;
    if (!pending || pending.slot !== slot || this.busy) return;
    this.pending = null;
    this.resolve(slot, 'declined');
    this.emit('ad-declined', { slot, balance: pending.balance });
  }

  /** Resuelve cuando no queda ninguna carga en marcha (pruebas). */
  settled(): Promise<void> {
    return Promise.all(AD_SLOTS.map((slot) => this.loads[slot].loading)).then(() => undefined);
  }

  // --- Por dentro ---

  private preload(slot: AdSlot): void {
    const load = this.loads[slot];
    if (!this.pacing || load.loading) return;
    if (secondsUntil(slot, this.pacing, this.session, this.today()) > PRELOAD_S) return;
    const now = this.time();
    if (load.loadedAt !== null && now - load.loadedAt < STALE_MS) return;
    if (load.failedAt !== null && now - load.failedAt < RETRY_MS) return;
    load.loading = this.load(slot).finally(() => {
      load.loading = null;
    });
  }

  private async load(slot: AdSlot): Promise<void> {
    let ok = false;
    try {
      ok = (await this.deps.provider.load(slot)) === true;
    } catch {
      ok = false;
    }
    const now = this.time();
    this.loads[slot].loadedAt = ok ? now : null;
    this.loads[slot].failedAt = ok ? null : now;
  }

  private resolve(slot: AdSlot, outcome: AdOutcome): void {
    if (this.pacing) {
      const next = resolvePanel(slot, outcome, this.pacing, this.session, this.today());
      this.pacing = next.state;
      this.session = next.session;
    }
    for (const each of AD_SLOTS) this.loads[each].emptyTold = false;
    this.persist();
  }

  private async read(): Promise<AdPacingState | null> {
    try {
      return parsePacing(await this.deps.store.get(ADS_KEY), this.today());
    } catch {
      return null;
    }
  }

  /** Si el almacén falla al escribir, no se ofrece nada más en la partida. */
  private persist(): void {
    this.unsaved = 0;
    const pacing = this.pacing;
    if (!pacing) return;
    const broken = (): void => {
      this.pacing = null;
    };
    try {
      void this.deps.store.set(ADS_KEY, JSON.stringify(pacing)).catch(broken);
    } catch {
      broken();
    }
  }

  private sound(paused: boolean): void {
    try {
      this.deps.pauseSound(paused);
    } catch {
      // Sin sonido antes que un error.
    }
  }

  private emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    try {
      this.deps.events.emit(event, payload);
    } catch {
      // Un oyente roto no rompe el panel.
    }
  }

  private time(): number {
    return this.deps.now().getTime();
  }

  private today(): string {
    return dayKey(this.deps.now());
  }
}

let current: Ads | null = null;

export function setAds(ads: Ads | null): void {
  current = ads;
}

/** `null` en la web, sin configuración o antes de arrancar: no hay publicidad. */
export function getAds(): Ads | null {
  return current;
}
