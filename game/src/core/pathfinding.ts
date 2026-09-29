export interface Point {
  x: number;
  y: number;
}

export interface WalkGrid {
  readonly width: number;
  readonly height: number;
  /** 1 = transitable, 0 = bloqueado. Índice = y * width + x. */
  readonly cells: Uint8Array;
}

const DIRECTIONS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function createGrid(
  width: number,
  height: number,
  walkable: (x: number, y: number) => boolean,
): WalkGrid {
  const cells = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells[y * width + x] = walkable(x, y) ? 1 : 0;
    }
  }
  return { width, height, cells };
}

export function isWalkable(grid: WalkGrid, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < grid.width && y < grid.height && grid.cells[y * grid.width + x] === 1;
}

function manhattan(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function findPath(grid: WalkGrid, start: Point, goal: Point): Point[] | null {
  if (!isWalkable(grid, start.x, start.y) || !isWalkable(grid, goal.x, goal.y)) return null;

  const width = grid.width;
  const startIndex = start.y * width + start.x;
  const goalIndex = goal.y * width + goal.x;

  const cost = new Map<number, number>([[startIndex, 0]]);
  const cameFrom = new Map<number, number>();
  const closed = new Set<number>();
  const open: { index: number; f: number }[] = [{ index: startIndex, f: manhattan(start, goal) }];

  while (open.length > 0) {
    // Extraer el nodo con menor f (búsqueda lineal: suficiente para mapas de este tamaño).
    let best = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i]!.f < open[best]!.f) best = i;
    }
    const current = open[best]!;
    open[best] = open[open.length - 1]!;
    open.pop();

    if (current.index === goalIndex) return reconstruct(cameFrom, goalIndex, width);
    if (closed.has(current.index)) continue;
    closed.add(current.index);

    const cx = current.index % width;
    const cy = Math.floor(current.index / width);
    const currentCost = cost.get(current.index) ?? 0;

    for (const [dx, dy] of DIRECTIONS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!isWalkable(grid, nx, ny)) continue;
      const next = ny * width + nx;
      if (closed.has(next)) continue;
      const nextCost = currentCost + 1;
      if (nextCost < (cost.get(next) ?? Number.POSITIVE_INFINITY)) {
        cost.set(next, nextCost);
        cameFrom.set(next, current.index);
        open.push({ index: next, f: nextCost + manhattan({ x: nx, y: ny }, goal) });
      }
    }
  }
  return null;
}

function reconstruct(cameFrom: Map<number, number>, end: number, width: number): Point[] {
  const path: Point[] = [];
  let current: number | undefined = end;
  while (current !== undefined) {
    path.unshift({ x: current % width, y: Math.floor(current / width) });
    current = cameFrom.get(current);
  }
  return path;
}

export function findPathOrNearest(grid: WalkGrid, start: Point, goal: Point): Point[] | null {
  const direct = findPath(grid, start, goal);
  if (direct) return direct;
  if (!isWalkable(grid, start.x, start.y)) return null;

  // BFS por todo lo alcanzable y quedarse con la celda más cercana al destino.
  const seen = new Uint8Array(grid.width * grid.height);
  const queue: Point[] = [start];
  seen[start.y * grid.width + start.x] = 1;
  let nearest = start;
  let nearestDistance = manhattan(start, goal);

  for (let i = 0; i < queue.length; i++) {
    const point = queue[i]!;
    const distance = manhattan(point, goal);
    if (distance < nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
    for (const [dx, dy] of DIRECTIONS) {
      const nx = point.x + dx;
      const ny = point.y + dy;
      if (!isWalkable(grid, nx, ny) || seen[ny * grid.width + nx]) continue;
      seen[ny * grid.width + nx] = 1;
      queue.push({ x: nx, y: ny });
    }
  }
  return findPath(grid, start, nearest);
}
