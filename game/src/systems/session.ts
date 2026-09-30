import { addCoins, purchase, type GameState, type PurchaseResult } from '../core/economy';
import { resolveFeeding, type FeedResult } from '../core/reactions';
import { loadSave, parseSave, writeSave, type BookProgress, type KeyValueStore, type SaveData, type Settings } from '../core/save';
import { ANIMAL_IDS, type AnimalId } from '../data/animals';
import type { FoodId } from '../data/foods';
import { bus, type EventBus, type GameEvents } from './events';

export class Session {
  private constructor(
    private readonly store: KeyValueStore,
    private data: SaveData,
    private readonly events: EventBus<GameEvents>,
  ) {}

  static async load(store: KeyValueStore, events: EventBus<GameEvents> = bus): Promise<Session> {
    return new Session(store, await loadSave(store), events);
  }

  get state(): GameState {
    return this.data.state;
  }

  get settings(): Settings {
    return this.data.settings;
  }

  async update(change: (state: GameState) => GameState): Promise<void> {
    const previous = this.data.state;
    const next = change(previous);
    this.data = { ...this.data, state: next };
    if (next.coins !== previous.coins) this.events.emit('coins-changed', { coins: next.coins });
    if (!previous.shopUnlocked && next.shopUnlocked) this.events.emit('shop-unlocked', {});
    for (const animalId of ANIMAL_IDS) {
      const before = previous.counts[animalId];
      const count = next.counts[animalId];
      if (count <= before) continue;
      if (before === 0) this.events.emit('animal-unlocked', { animalId });
      else this.events.emit('animal-added', { animalId, count });
    }
    await writeSave(this.store, this.data);
  }

  /** Guarda tal cual (p. ej. antes de ir a segundo plano o salir). */
  save(): Promise<void> {
    return writeSave(this.store, this.data);
  }

  /** Guarda solo si el estado en memoria pasa la validación (tras un error puede estar corrupto). */
  async saveIfValid(): Promise<boolean> {
    let valid = false;
    try {
      valid = parseSave(JSON.parse(JSON.stringify(this.data))) !== null;
    } catch {
      valid = false;
    }
    if (valid) await this.save();
    return valid;
  }

  earnCoins(amount: number): Promise<void> {
    return this.update((state) => addCoins(state, amount));
  }

  async feed(animalId: AnimalId, foodId: FoodId): Promise<FeedResult> {
    const result = resolveFeeding(animalId, foodId);
    this.events.emit('animal-fed', { animalId, reaction: result.reaction });
    if (result.coins > 0) await this.earnCoins(result.coins);
    return result;
  }

  async buy(itemId: string): Promise<PurchaseResult> {
    const result = purchase(this.data.state, itemId);
    if (result.ok) await this.update(() => result.state);
    return result;
  }

  get book(): BookProgress {
    return this.data.book;
  }

  /** Marca páginas del libro como leídas (ids). */
  async readPages(ids: readonly string[]): Promise<void> {
    const seen = new Set(this.data.book.seen);
    if (ids.every((id) => seen.has(id))) return;
    for (const id of ids) seen.add(id);
    this.data = { ...this.data, book: { ...this.data.book, seen: [...seen] } };
    await writeSave(this.store, this.data);
  }

  /** Página donde se ha quedado el libro. */
  async setBookPage(id: string): Promise<void> {
    if (this.data.book.page === id) return;
    this.data = { ...this.data, book: { ...this.data.book, page: id } };
    await writeSave(this.store, this.data);
  }

  /** El tendero ya ha contado lo del libro secreto: no lo repite. */
  async markBookHinted(): Promise<void> {
    if (this.data.book.hinted) return;
    this.data = { ...this.data, book: { ...this.data.book, hinted: true } };
    await writeSave(this.store, this.data);
  }

  async updateSettings(change: Partial<Settings>): Promise<void> {
    this.data = { ...this.data, settings: { ...this.data.settings, ...change } };
    this.events.emit('settings-changed', { settings: this.data.settings });
    await writeSave(this.store, this.data);
  }
}

let current: Session | null = null;

export function setSession(session: Session): void {
  current = session;
}

export function getSession(): Session {
  if (!current) throw new Error('La sesión de juego aún no está cargada');
  return current;
}
