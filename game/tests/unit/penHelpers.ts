import { penSpace } from '../../src/core/flock';
import { withPenInteriors } from '../../src/core/penGrid';
import type { WalkGrid } from '../../src/core/pathfinding';
import { buildWalkGrid, readEnclosures, readProps, readWater, withSolidProps, type TiledMap } from '../../src/core/tiledmap';

/** Rejilla de la cuidadora con el recinto `penId` abierto (como en el juego al comprarlo). */
export function penGridFor(map: TiledMap, penId: string): WalkGrid {
  const e = readEnclosures(map).find((q) => q.penId === penId)!;
  const props = readProps(map);
  const paths = withSolidProps(buildWalkGrid(map), props, map.tilewidth);
  return withPenInteriors(paths, [penSpace(e, props, map.tilewidth, readWater(map))], map.tilewidth);
}
