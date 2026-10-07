// game/src/systems/analyticsEvents.ts
import { dayKey, type ActivityFlag } from '../core/activity';
import { isBookComplete } from '../core/book';
import { initialCounts, openPens, type GameState } from '../core/economy';
import {
  animalsBucket, bookBucket, coinsBucket, feedsBucket, pagesBucket, part, reachAction, residentName,
  type ActionOf, type Category, type ReachKind, type Step,
} from '../core/eventCatalog';
import { REACH_KEY, addPlay, emptyReach, markEver, markReach, markStep, parseReach, seedSteps, type ReachState } from '../core/reach';
import type { BookProgress, KeyValueStore, Settings } from '../core/save';
import { BOOK_BACK_ID } from '../data/book';
import { PEN_IDS, PENS, findResident, penCapacity } from '../data/pens';
import type { AnalyticsHooks } from './analytics';
import type { BookPageKind, EventBus, GameEvents } from './events';

/** Lo que el tracker necesita de `Analytics`. */
export interface EventSink {
  readonly active: boolean;
  event<C extends Category>(category: C, action: ActionOf<C>, name?: string, value?: number): void;
}

export interface TrackerDeps {
  sink: EventSink;
  events: EventBus<GameEvents>;
  store: KeyValueStore;
  now: () => Date;
  state: () => GameState;
  settings: () => Settings;
  book: () => BookProgress;
}

/** Menos de esto en una página es pasar la hoja, no leerla. */
const READ_MS = 1000;
const REACH_SCREENS: readonly string[] = ['tienda', 'libro', 'ajustes'];
const SETTING_LABELS = [['music', 'musica'], ['sfx', 'sonidos'], ['joystick', 'joystick']] as const;

function zooComplete(state: GameState): boolean {
  return PEN_IDS.every((id) => state.counts[id] >= penCapacity(id));
}

/** Pasos del embudo que una partida ya empezada tiene dados: se apuntan sin avisar, para no falsear tiempos. */
export function knownSteps(state: GameState, book: BookProgress): Step[] {
  const initial = initialCounts();
  const bought = PEN_IDS.some((id) => state.counts[id] > initial[id]);
  const steps: Step[] = [];
  if (state.coins > 0 || state.shopUnlocked || bought) steps.push('primer-paso', 'primer-toque-animal', 'primera-ventana', 'primera-comida');
  if (state.shopUnlocked) steps.push('tienda-abierta');
  if (bought) steps.push('primera-tienda', 'primera-compra');
  if (book.seen.length > 0) steps.push('primer-libro');
  if (isBookComplete(state)) steps.push('libro-completo');
  if (zooComplete(state)) steps.push('zoo-completo');
  return steps;
}

/**
 * Traduce lo que pasa en el juego (eventos del bus) a eventos del catálogo, y lleva las cuentas que
 * hacen falta para ello: la ventana de comer abierta, la visita a la tienda, la lectura del libro,
 * el rato de juego y el alcance guardado en el dispositivo.
 */
export class GameTracker implements AnalyticsHooks {
  /** `null` si el almacén ha fallado: sin él no se sabe qué es «primera vez» y no se cuenta. */
  private reach: ReachState | null = null;
  private started = false;
  private stretchAt = 0;
  /** Instante en que el juego se fue a segundo plano; `null` en primer plano. */
  private awayAt: number | null = null;
  private feeds = 0;
  private readonly fedAnimals = new Set<string>();
  private readonly controls = new Set<string>();
  private feedWindow: { residentId: string; at: number; given: number } | null = null;
  private shop: { at: number; bought: number; looked: Set<string> } | null = null;
  private reading: { at: number; read: Set<string>; page: { id: string; kind: BookPageKind; at: number } | null } | null = null;

  constructor(private readonly deps: TrackerDeps) {}

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    const { events, store } = this.deps;
    this.stretchAt = this.time();
    // Los avisos se registran antes de esperar al almacén: lo que pase mientras carga no se pierde.
    const on = <K extends keyof GameEvents>(event: K, handler: (payload: GameEvents[K]) => void): void => {
      events.on(event, (payload) => {
        this.safely(() => {
          if (!this.deps.sink.active) {
            // Nada de ventanas a medias de antes de apagar: no deben cerrarse al volver a encender.
            this.feedWindow = null;
            this.shop = null;
            this.reading = null;
            return;
          }
          handler(payload);
        });
      });
    };

    on('animal-tapped', ({ residentId }) => {
      this.send('comer', 'toca-animal', residentName(residentId));
      this.step('primer-toque-animal');
    });
    on('feed-opened', ({ residentId }) => {
      this.feedWindow = { residentId, at: this.time(), given: 0 };
      this.send('comer', 'ventana', residentName(residentId));
      this.step('primera-ventana');
    });
    on('animal-fed', (fed) => this.onFed(fed));
    on('food-missed', ({ residentId, foodId }) => this.send('comer', 'fuera', part(residentName(residentId), foodId)));
    on('feed-closed', () => this.closeFeed());

    on('pen-near', ({ penId, locked }) => {
      this.send('mapa', locked ? 'cerca-cerrado' : 'cerca', penId);
      if (!locked) this.touch('recinto', penId);
    });
    on('locked-tap', ({ penId }) => this.send('mapa', 'toca-cerrado', penId));
    on('shop-locked', ({ missing }) => this.send('mapa', 'tienda-cerrada', undefined, missing));
    on('control-used', ({ mode }) => {
      if (this.controls.has(mode)) return;
      this.controls.add(mode);
      this.send('mapa', 'control', mode);
      this.step('primer-paso');
    });

    on('shop-unlocked', () => this.step('tienda-abierta'));
    on('shop-opened', () => {
      this.shop = { at: this.time(), bought: 0, looked: new Set() };
      this.step('primera-tienda');
    });
    on('shop-look', ({ itemId }) => {
      if (this.shop?.looked.has(itemId)) return;
      this.shop?.looked.add(itemId);
      this.send('tienda', 'mira', itemId);
    });
    on('shop-denied', ({ itemId, missing }) => this.send('tienda', 'sin-monedas', itemId, missing));
    on('purchase', ({ itemId, penId, residentId, cost }) => {
      if (this.shop) this.shop.bought += 1;
      this.send('tienda', 'compra', part(penId, residentId), cost);
      // El estado del día ya salió al empezar: sin esto, lo comprado hoy se alimenta sin constar como tenido.
      if (itemId === penId) this.send('tiene', 'tiene-recinto', penId, 1);
      this.send('tiene', 'tiene-animal', part(penId, residentId));
      this.step('primera-compra');
      if (zooComplete(this.deps.state())) this.step('zoo-completo');
    });
    on('shop-closed', () => {
      const shop = this.shop;
      this.shop = null;
      if (!shop) return;
      this.send('tienda', 'tienda-fin', undefined, this.secondsSince(shop.at));
      if (shop.bought === 0) this.send('tienda', 'tienda-sin-compra');
    });

    on('book-opened', ({ pageId }) => {
      this.reading = { at: this.time(), read: new Set(), page: null };
      this.send('libro', 'abre', pageId);
      this.step('primer-libro');
    });
    on('book-page-shown', ({ pageId, kind }) => this.showPage(pageId, kind));
    on('book-index', ({ chapter }) => this.send('libro', 'indice', chapter));
    on('book-closed', () => {
      this.leavePage();
      const reading = this.reading;
      this.reading = null;
      if (reading) this.send('libro', 'libro-fin', pagesBucket(reading.read.size), this.secondsSince(reading.at));
    });

    on('legal-opened', () => this.send('ajustes', 'privacidad'));
    on('quit-asked', () => this.send('ajustes', 'salir-pregunta'));
    on('quit-answered', ({ leave }) => this.send('ajustes', leave ? 'salir-si' : 'salir-no'));

    try {
      const saved = parseReach(await store.get(REACH_KEY));
      this.reach = saved ?? seedSteps(emptyReach(this.today()), knownSteps(this.deps.state(), this.deps.book()));
    } catch {
      this.reach = null;
    }
  }

  // --- Avisos de Analytics ---

  sessionStarted(flags: readonly ActivityFlag[]): void {
    this.safely(() => {
      // Una ausencia larga vuelve por aquí y no por `resumed`.
      this.skipAway();
      this.stretchAt = this.time();
      this.controls.clear();
      this.feeds = 0;
      this.fedAnimals.clear();
      if (this.deps.sink.active && flags.includes('dia')) this.dailyState();
    });
  }

  goingBackground(seconds: number): void {
    this.safely(() => {
      this.awayAt = this.time();
      if (!this.deps.sink.active) return;
      this.send('sesion', 'rato-comidas', feedsBucket(this.feeds), this.feeds);
      this.send('sesion', 'rato-animales', animalsBucket(this.fedAnimals.size), this.fedAnimals.size);
      this.feeds = 0;
      this.fedAnimals.clear();
      if (this.reach) {
        this.reach = addPlay(this.reach, seconds);
        this.save();
      }
      this.stretchAt = this.time();
    });
  }

  resumed(): void {
    this.safely(() => {
      this.skipAway();
      this.stretchAt = this.time();
    });
  }

  screenShown(name: string): void {
    this.safely(() => {
      if (this.deps.sink.active && REACH_SCREENS.includes(name)) this.touch('pantalla', name);
    });
  }

  // --- Por dentro ---

  /**
   * El rato en segundo plano no es tiempo de ventana, de tienda ni de lectura: lo que estuviera abierto
   * empieza tanto más tarde como se haya estado fuera. Una tableta bloqueada horas no hincha las medias.
   */
  private skipAway(): void {
    const since = this.awayAt;
    this.awayAt = null;
    if (since === null) return;
    const away = this.time() - since;
    if (away <= 0) return;
    if (this.feedWindow) this.feedWindow.at += away;
    if (this.shop) this.shop.at += away;
    if (this.reading) {
      this.reading.at += away;
      if (this.reading.page) this.reading.page.at += away;
    }
  }

  private onFed({ residentId, foodId, reaction, coins }: GameEvents['animal-fed']): void {
    const resident = residentName(residentId);
    this.send('comer', reaction, part(resident, foodId), reaction === 'rechaza' ? undefined : coins);
    if (this.feedWindow) this.feedWindow.given += 1;
    this.feeds += 1;
    this.fedAnimals.add(residentId);
    this.touch('animal', resident);
    this.touch('comida', foodId);
    this.step('primera-comida');
    if (reaction !== 'especial' || !this.reach) return;
    const species = findResident(residentId)?.resident.species;
    if (!species) return;
    const combo = part(species, foodId);
    const { state, first } = markEver(this.reach, `especial:${combo}`);
    if (!first) return;
    this.reach = state;
    this.send('alcance', 'vida-especial', combo);
    this.save();
  }

  private closeFeed(): void {
    const open = this.feedWindow;
    this.feedWindow = null;
    if (!open) return;
    const resident = residentName(open.residentId);
    this.send('comer', 'ventana-fin', resident, open.given);
    this.send('comer', 'ventana-tiempo', resident, this.secondsSince(open.at));
    if (open.given === 0) this.send('comer', 'ventana-vacia', resident);
  }

  private showPage(pageId: string, kind: BookPageKind): void {
    // El libro también se abre sin pasar por la estantería (pruebas): la lectura empieza aquí.
    this.reading ??= { at: this.time(), read: new Set(), page: null };
    if (this.reading.page?.id === pageId) return;
    this.leavePage();
    this.reading.page = { id: pageId, kind, at: this.time() };
    if (kind === 'bloqueada') this.send('libro', 'bloqueada', pageId);
    if (pageId === BOOK_BACK_ID) this.step('libro-completo');
  }

  private leavePage(): void {
    const reading = this.reading;
    const page = reading?.page;
    if (!reading || !page) return;
    reading.page = null;
    if (page.kind !== 'contenido') return;
    const ms = this.time() - page.at;
    if (ms < READ_MS) {
      this.send('libro', 'hojea', page.id);
      return;
    }
    this.send('libro', 'lee', page.id, Math.round(ms / 1000));
    reading.read.add(page.id);
    this.touch('pagina', page.id);
  }

  /** Lo que tiene el jugador hoy: el denominador para comparar cada animal solo entre quienes lo tienen. */
  private dailyState(): void {
    const state = this.deps.state();
    const settings = this.deps.settings();
    for (const penId of openPens(state)) {
      this.send('tiene', 'tiene-recinto', penId, state.counts[penId]);
      // Uno por animal: el quinto de un recinto lo tienen menos jugadores que el primero.
      for (const resident of PENS[penId].residents.slice(0, state.counts[penId])) this.send('tiene', 'tiene-animal', part(penId, resident.id));
    }
    this.send('tiene', 'tiene-saldo', coinsBucket(state.coins));
    this.send('tiene', 'tiene-paginas', bookBucket(this.deps.book().seen.length));
    for (const [key, label] of SETTING_LABELS) this.send('tiene', 'tiene-ajuste', `${label}-${settings[key] ? 'on' : 'off'}`);
  }

  private touch(kind: ReachKind, id: string): void {
    if (!this.reach) return;
    const { state, scopes } = markReach(this.reach, kind, id, this.today());
    if (scopes.length === 0) return;
    this.reach = state;
    for (const scope of scopes) this.send('alcance', reachAction(scope, kind), id);
    this.save();
  }

  private step(step: Step): void {
    if (!this.reach) return;
    const { state, first } = markStep(this.reach, step);
    if (!first) return;
    this.reach = state;
    this.send('embudo', step, undefined, Math.floor((state.playSeconds + this.secondsSince(this.stretchAt)) / 60));
    this.save();
  }

  private save(): void {
    if (!this.reach) return;
    try {
      void this.deps.store.set(REACH_KEY, JSON.stringify(this.reach)).catch(() => {});
    } catch {
      // Medir nunca rompe el juego.
    }
  }

  /** Medir nunca rompe el juego: lo que falle aquí se descarta. */
  private safely(fn: () => void): void {
    try {
      fn();
    } catch {
      // Descartado a propósito.
    }
  }

  private send<C extends Category>(category: C, action: ActionOf<C>, name?: string, value?: number): void {
    this.deps.sink.event(category, action, name, value);
  }

  private time(): number {
    return this.deps.now().getTime();
  }

  private today(): string {
    return dayKey(this.deps.now());
  }

  private secondsSince(at: number): number {
    return Math.max(0, Math.round((this.time() - at) / 1000));
  }
}
