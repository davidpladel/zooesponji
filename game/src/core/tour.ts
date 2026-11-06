import { findPath, isWalkable, type Point, type WalkGrid } from './pathfinding';

const DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/**
 * Puntos para recorrer a pie todas las casillas pisables de `grid` a las que se llega desde `start`.
 * Yendo de cada punto al siguiente con `findPath` (como la cuidadora al tocar la pantalla) se pisan todas,
 * y entre dos puntos seguidos hay como mucho `maxStep` pasos: así cada punto está en pantalla al tocarlo.
 *
 * Con `only`, solo hace falta pisar las casillas que cumplan (p. ej. los interiores de los recintos); las
 * demás se usan para ir de un sitio a otro.
 *
 * Voraz: desde donde se está, se va a la casilla sin pisar más cercana; si está lejos, se ponen puntos
 * intermedios por el camino cada `maxStep` pasos. Lo pisado se marca con el `findPath` de cada tramo.
 */
export function tourWaypoints(grid: WalkGrid, start: Point, maxStep: number, only?: (p: Point) => boolean): Point[] {
  const { width, height } = grid;
  const index = (p: Point): number => p.y * width + p.x;
  const pending = new Uint8Array(width * height);
  let left = 0;
  {
    // Lo alcanzable desde el inicio es lo que queda por pisar.
    const queue = [start];
    const seen = new Uint8Array(width * height);
    seen[index(start)] = 1;
    const mark = (p: Point): void => {
      if (only && !only(p)) return;
      pending[index(p)] = 1;
      left++;
    };
    mark(start);
    while (queue.length > 0) {
      const p = queue.shift()!;
      for (const [dx, dy] of DIRECTIONS) {
        const n = { x: p.x + dx, y: p.y + dy };
        if (!isWalkable(grid, n.x, n.y) || seen[index(n)]) continue;
        seen[index(n)] = 1;
        mark(n);
        queue.push(n);
      }
    }
  }
  const tread = (p: Point): void => {
    if (pending[index(p)]) {
      pending[index(p)] = 0;
      left--;
    }
  };
  tread(start);

  const points: Point[] = [];
  let current = start;
  while (left > 0) {
    // BFS hasta la casilla sin pisar más cercana, guardando de dónde se viene.
    const from = new Int32Array(width * height).fill(-1);
    from[index(current)] = index(current);
    const queue = [current];
    let target: Point | null = null;
    while (queue.length > 0 && !target) {
      const p = queue.shift()!;
      for (const [dx, dy] of DIRECTIONS) {
        const n = { x: p.x + dx, y: p.y + dy };
        if (!isWalkable(grid, n.x, n.y) || from[index(n)] !== -1) continue;
        from[index(n)] = index(p);
        if (pending[index(n)]) {
          target = n;
          break;
        }
        queue.push(n);
      }
    }
    if (!target) break;

    // El tramo hasta ella y, si cabe, sigue recto por lo que falta pisar (en una sala no va casilla a casilla).
    const route: Point[] = [];
    for (let i = index(target); i !== index(current); i = from[i]!) route.unshift({ x: i % width, y: Math.floor(i / width) });
    const last = route[route.length - 1]!;
    const before = route[route.length - 2] ?? current;
    const dx = last.x - before.x;
    const dy = last.y - before.y;
    while (route.length % maxStep !== 0) {
      const tip = route[route.length - 1]!;
      const next = { x: tip.x + dx, y: tip.y + dy };
      if (!isWalkable(grid, next.x, next.y) || !pending[index(next)]) break;
      route.push(next);
      target = next;
    }
    const stops: Point[] = [];
    for (let i = maxStep - 1; i < route.length - 1; i += maxStep) stops.push(route[i]!);
    stops.push(target);

    for (const stop of stops) {
      const path = findPath(grid, current, stop);
      if (!path) break;
      for (const q of path) tread(q);
      points.push(stop);
      current = stop;
    }
  }
  return points;
}
