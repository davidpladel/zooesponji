/** Ventanas con las que el engranaje se esconde. */
const OVERLAYS = ['Shop', 'Book', 'Feed', 'Settings', 'Quit'] as const;

/** El engranaje solo se ve mientras la cuidadora anda por el zoo. */
export function gearVisible(activeScenes: readonly string[]): boolean {
  return activeScenes.includes('World') && !OVERLAYS.some((key) => activeScenes.includes(key));
}
