import type { Settings } from '../core/save';
import type { Reaction } from '../data/animals';
import type { FoodId } from '../data/foods';
import type { PenId } from '../data/pens';

type Handler<T> = (payload: T) => void;

export class EventBus<E extends object> {
  private readonly handlers = new Map<keyof E, Set<Handler<never>>>();

  on<K extends keyof E>(event: K, handler: Handler<E[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<never>);
    return () => this.off(event, handler);
  }

  off<K extends keyof E>(event: K, handler: Handler<E[K]>): void {
    this.handlers.get(event)?.delete(handler as Handler<never>);
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    // Copia: permite darse de baja dentro de un handler sin saltarse a otros.
    for (const handler of [...set]) (handler as Handler<E[K]>)(payload);
  }

  clear(): void {
    this.handlers.clear();
  }
}

export type ControlMode = 'toque' | 'joystick' | 'teclado';
export type BookPageKind = 'contenido' | 'bloqueada' | 'paso';

export interface GameEvents {
  'coins-changed': { coins: number };
  'shop-unlocked': Record<string, never>;
  'animal-unlocked': { penId: PenId };
  /** Un residente más en un recinto que ya estaba abierto. */
  'animal-added': { penId: PenId; count: number; residentId: string };
  /** Se ha dado de comer a un residente: su recinto entero lo celebra. */
  'animal-fed': { penId: PenId; residentId: string; foodId: FoodId; reaction: Reaction; coins: number };
  /** Se ha tocado un animal en el mapa: la cuidadora va hacia él. */
  'animal-tapped': { residentId: string };
  'feed-opened': { residentId: string };
  'feed-closed': { residentId: string };
  /** Una comida arrastrada y soltada fuera del animal. */
  'food-missed': { residentId: string; foodId: FoodId };
  /** La cuidadora lleva un rato junto a un recinto. */
  'pen-near': { penId: PenId; locked: boolean };
  'locked-tap': { penId: PenId };
  /** Se ha pisado la puerta de la tienda sin monedas suficientes para abrirla. */
  'shop-locked': { missing: number };
  'control-used': { mode: ControlMode };
  'shop-opened': Record<string, never>;
  'shop-look': { itemId: string };
  'shop-denied': { itemId: string; missing: number };
  'purchase': { itemId: string; penId: PenId; residentId: string; cost: number };
  'shop-closed': Record<string, never>;
  'book-opened': { pageId: string };
  'book-page-shown': { pageId: string; kind: BookPageKind };
  'book-index': { chapter: string };
  'book-closed': Record<string, never>;
  'legal-opened': Record<string, never>;
  'quit-asked': Record<string, never>;
  'quit-answered': { leave: boolean };
  /** El libro se ha abierto por otra página. */
  'book-page': { pageId: string };
  'settings-changed': { settings: Settings };
  toast: { text: string };
}

export const bus = new EventBus<GameEvents>();
