import type { Settings } from '../core/save';
import type { Reaction } from '../data/animals';
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

export interface GameEvents {
  'coins-changed': { coins: number };
  'shop-unlocked': Record<string, never>;
  'animal-unlocked': { penId: PenId };
  /** Un residente más en un recinto que ya estaba abierto. */
  'animal-added': { penId: PenId; count: number; residentId: string };
  /** Se ha dado de comer a un residente: su recinto entero lo celebra. */
  'animal-fed': { penId: PenId; residentId: string; reaction: Reaction };
  'settings-changed': { settings: Settings };
  toast: { text: string };
}

export const bus = new EventBus<GameEvents>();
