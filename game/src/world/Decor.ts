import * as Phaser from 'phaser';
import { getArt, propAnimKey, propKey } from '../art/art';
import { depthForY } from '../core/depth';
import { readEnclosures, readProps, type EnclosureInfo, type TiledMap } from '../core/tiledmap';
import { PENS, isPenId } from '../data/pens';
import { t } from '../data/strings';

/** Suelo del bioma: por encima del césped (0) y por debajo de las vallas (2). */
const GROUND_DEPTH = 1;
/** Piezas planas (agua, meseta): sobre el suelo y las vallas, bajo animales y personas. */
const FLAT_DEPTH = 10;
const TILE = 16;

function nearestEnclosure(enclosures: EnclosureInfo[], x: number, y: number): EnclosureInfo | null {
  let best: EnclosureInfo | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const e of enclosures) {
    const d = Math.hypot(e.x + e.width / 2 - x, e.y + e.height / 2 - y);
    if (d < bestDistance) {
      best = e;
      bestDistance = d;
    }
  }
  return best;
}

export const Decor = {
  /** Suelos de bioma, piezas de decoración y carteles con el nombre del animal (solo en modo arte). */
  build(scene: Phaser.Scene, mapData: TiledMap): void {
    const art = getArt();
    if (!art) return;
    const enclosures = readEnclosures(mapData);

    for (const e of enclosures) {
      const ground = `ground-${e.biome}`;
      if (!e.biome || !art.props[ground]) continue;
      scene.add
        .tileSprite(e.x + TILE, e.y + TILE, e.width - 2 * TILE, e.height - 2 * TILE, propKey(ground))
        .setOrigin(0)
        .setDepth(GROUND_DEPTH);
    }

    for (const p of readProps(mapData)) {
      const info = art.props[p.prop];
      if (!info) continue;
      const animated = (info.frames ?? 1) > 1;
      const piece = animated
        ? scene.add.sprite(p.x, p.y, propKey(p.prop)).play(propAnimKey(p.prop))
        : scene.add.image(p.x, p.y, propKey(p.prop));
      piece
        .setOrigin(0.5, 1)
        .setDepth(p.flat ? FLAT_DEPTH + p.z : depthForY(p.y));

      if (p.prop === 'park-gate') {
        // El nombre del zoo en el tejadillo del portón, como el arco del parque de la v1.
        scene.add
          .text(p.x, p.y - info.height + 15, 'Zoo Esponji', {
            fontFamily: 'sans-serif',
            fontSize: '9px',
            fontStyle: 'bold',
            color: '#fff8e1',
            stroke: '#4e342e',
            strokeThickness: 3,
          })
          .setOrigin(0.5)
          .setResolution(4)
          .setDepth(depthForY(p.y) + 1);
      }

      if (p.prop === 'sign') {
        const enclosure = nearestEnclosure(enclosures, p.x, p.y);
        if (enclosure && isPenId(enclosure.animalId)) {
          scene.add
            .text(p.x, p.y - TILE - 2, t(PENS[enclosure.animalId].nameKey), {
              fontFamily: 'sans-serif',
              fontSize: '6px',
              color: '#ffffff',
              stroke: '#3e2723',
              strokeThickness: 3,
            })
            .setOrigin(0.5, 1)
            .setResolution(4)
            .setDepth(depthForY(p.y) + 1);
        }
      }
    }
  },
};
