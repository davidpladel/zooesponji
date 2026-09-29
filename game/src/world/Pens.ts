import * as Phaser from 'phaser';
import { getArt } from '../art/art';
import { TILE_SIZE } from '../config';
import { animalCount, isAnimalUnlocked, type GameState } from '../core/economy';
import { penSpace, spreadPositions, stepRoamer, type PenSpace, type Roamer } from '../core/flock';
import { gateAtDoorstep, rectContains, type Rect } from '../core/interaction';
import type { Vec } from '../core/movement';
import type { Point } from '../core/pathfinding';
import type { EnclosureInfo, GateInfo, PropInfo } from '../core/tiledmap';
import { ANIMALS, isAnimalId, type AnimalId, type Reaction } from '../data/animals';
import { shopItemForAnimal } from '../data/shop';
import { t } from '../data/strings';
import { createAnimal, createCompanion, type Walker } from './Actors';

/** Algo que pasea dentro de un recinto: un animal o su acompañante (la leona). */
interface Wanderer {
  walker: Walker;
  roam: Roamer;
  /** Sin arte: punto alrededor del que se balancea, y desfase del balanceo. */
  base: Vec;
  phase: number;
}

interface Pen {
  id: AnimalId;
  rect: Rect;
  space: PenSpace;
  gate: Point;
  home: Vec;
  /** Animales del recinto (el primero existe siempre; si está cerrado, se ve en fantasma). */
  animals: Wanderer[];
  companion: Wanderer | null;
  lock: Phaser.GameObjects.Text;
  shown: boolean;
}

/** Por encima de cualquier cosa del mundo ordenada por Y. */
const UI_DEPTH = 10000;
const LOCKED_ALPHA = 0.25;
const REACTION_EMOJI: Record<Reaction, string> = { come: '😋', rechaza: '🤢', especial: '🤩' };

const LABEL_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'sans-serif',
  fontSize: '9px',
  color: '#ffffff',
  stroke: '#000000',
  strokeThickness: 2,
};

const wanderer = (walker: Walker, rest = Math.random() * 2000): Wanderer => ({
  walker,
  roam: { pos: { x: walker.x, y: walker.y }, target: null, rest },
  base: { x: walker.x, y: walker.y },
  phase: Math.random() * Math.PI * 2,
});

/** Lo que pasa al pisar el camino delante de la puerta de un recinto. */
export interface DoorstepEvent {
  animalId: AnimalId;
  locked: boolean;
}

/** Recintos: animales, candado con precio y la puerta donde se da de comer. */
export class Pens {
  private readonly pens: Pen[] = [];
  private readonly sparklePool: Phaser.GameObjects.Text[] = [];
  /** Recinto en cuya puerta está el cuidador (para avisar solo al llegar, no en cada fotograma). */
  private atDoorstep: AnimalId | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    enclosures: EnclosureInfo[],
    gates: GateInfo[],
    state: GameState,
    props: PropInfo[] = [],
  ) {
    for (const enclosure of enclosures) {
      if (!isAnimalId(enclosure.animalId)) continue;
      const id = enclosure.animalId;
      const gate = gates.find((g) => g.animalId === id);
      if (!gate) continue;
      const def = ANIMALS[id];
      const home = { x: enclosure.x + enclosure.width / 2, y: enclosure.y + enclosure.height / 2 };
      const unlocked = isAnimalUnlocked(state, id);
      const price = shopItemForAnimal(id)?.cost;
      const rect = { x: enclosure.x, y: enclosure.y, width: enclosure.width, height: enclosure.height };
      const space = penSpace(rect, props, TILE_SIZE);

      // Con arte, el nombre va en el cartel de madera de la puerta (Decor).
      if (!getArt()) scene.add.text(home.x, enclosure.y + 11, t(def.nameKey), LABEL_STYLE).setOrigin(0.5).setResolution(4).setDepth(UI_DEPTH);
      const lock = scene.add
        .text(home.x, home.y + 14, price ? `🔒 ${price}🪙` : '🔒', {
          fontFamily: 'sans-serif',
          fontSize: '10px',
          color: '#ffffff',
          backgroundColor: '#000000aa',
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5)
        .setResolution(4)
        .setDepth(UI_DEPTH)
        .setVisible(!unlocked);

      const count = Math.max(1, animalCount(state, id));
      const hasCompanion = Boolean(getArt()?.companions[id]);
      const spots = spreadPositions(space, count + (hasCompanion ? 1 : 0), Math.random);
      const spot = (i: number): Vec => spots[i] ?? home;
      const animals = Array.from({ length: count }, (_v, i) => {
        const p = spot(i);
        return wanderer(createAnimal(scene, id, p.x, p.y));
      });
      const companionAt = spot(count);
      const companionWalker = hasCompanion ? createCompanion(scene, id, companionAt.x, companionAt.y) : null;
      const companion = companionWalker ? wanderer(companionWalker, 500 + Math.random() * 1500) : null;
      for (const w of [...animals, ...(companion ? [companion] : [])]) w.walker.object.setAlpha(unlocked ? 1 : LOCKED_ALPHA);

      this.pens.push({ id, rect, space, gate: gate.tile, home, animals, companion, lock, shown: unlocked });
    }
  }

  /** Con arte, los animales pasean por su recinto sin pisarse; sin arte, se balancean en su sitio. */
  update(time: number, delta: number): void {
    const art = getArt() !== null;
    for (const pen of this.pens) {
      const all = this.members(pen);
      for (const w of all) {
        if (art) this.roam(pen, w, all, delta);
        else
          w.walker.moveTo(
            w.base.x + Math.sin(time / 1300 + w.phase) * 6,
            w.base.y + Math.sin(time / 450 + w.phase) * 1.5,
          );
      }
    }
  }

  private members(pen: Pen): Wanderer[] {
    return pen.companion ? [...pen.animals, pen.companion] : pen.animals;
  }

  private roam(pen: Pen, w: Wanderer, all: Wanderer[], delta: number): void {
    const others = all.filter((o) => o !== w).map((o) => o.roam);
    const next = stepRoamer(w.roam, others, pen.space, delta, Math.random);
    const moved = next.pos.x !== w.roam.pos.x || next.pos.y !== w.roam.pos.y;
    w.roam = next;
    if (moved) w.walker.moveTo(next.pos.x, next.pos.y);
    else w.walker.stop();
  }

  /**
   * Al llegar al camino pegado a la puerta de un recinto: su animal (y si está cerrado).
   * Solo al llegar; no se repite hasta que el cuidador se aparte de la puerta.
   */
  onKeeperTile(keeperTile: Point, state: GameState): DoorstepEvent | null {
    const gate = gateAtDoorstep(keeperTile, this.pens.map((pen) => ({ animalId: pen.id, tile: pen.gate })));
    const id = gate?.animalId ?? null;
    if (id === this.atDoorstep) return null;
    this.atDoorstep = id;
    return id ? { animalId: id, locked: !isAnimalUnlocked(state, id) } : null;
  }

  lockedPenAt(point: Vec, state: GameState): AnimalId | null {
    const pen = this.pens.find((p) => !isAnimalUnlocked(state, p.id) && rectContains(p.rect, point));
    return pen?.id ?? null;
  }

  /** Nº de animales que hay en el mundo en cada recinto (para pruebas). */
  animalsIn(id: AnimalId): number {
    return this.pen(id).animals.length;
  }

  /** Anima los recintos recién comprados y añade los animales extra (se llama al volver de la tienda). */
  syncUnlocks(state: GameState): void {
    for (const pen of this.pens) {
      if (!isAnimalUnlocked(state, pen.id)) continue;
      if (!pen.shown) {
        pen.shown = true;
        this.playUnlock(pen);
      }
      while (pen.animals.length < animalCount(state, pen.id)) this.addAnimal(pen);
    }
  }

  /** Todos los animales del recinto reaccionan a la comida que se les ha dado. */
  celebrate(id: AnimalId, reaction: Reaction): void {
    const pen = this.pens.find((p) => p.id === id);
    if (!pen) return;
    for (const w of pen.animals) {
      const object = w.walker.object;
      const emoji = this.sparkle(REACTION_EMOJI[reaction]).setPosition(w.walker.x, w.walker.y - 16);
      this.scene.tweens.add({ targets: emoji, y: emoji.y - 10, alpha: 0, duration: 1200, onComplete: () => emoji.setVisible(false) });
      if (reaction === 'rechaza') {
        this.scene.tweens.add({ targets: object, angle: 12, duration: 70, yoyo: true, repeat: 3, onComplete: () => object.setAngle(0) });
      } else {
        this.scene.tweens.add({ targets: object, scaleY: 0.8, duration: 110, yoyo: true, repeat: reaction === 'especial' ? 3 : 1 });
      }
    }
  }

  /** Nuevo animal en la puerta del recinto, con el mismo efecto que al desbloquear. */
  private addAnimal(pen: Pen): void {
    const inner = pen.space.inner;
    const entry = {
      x: Phaser.Math.Clamp((pen.gate.x + 1) * TILE_SIZE, inner.x + 8, inner.x + inner.width - 8),
      y: Phaser.Math.Clamp((pen.gate.y + 0.5) * TILE_SIZE, inner.y + 8, inner.y + inner.height - 8),
    };
    const w = wanderer(createAnimal(this.scene, pen.id, entry.x, entry.y), 800);
    pen.animals.push(w);
    w.walker.object.setScale(0);
    this.scene.tweens.add({ targets: w.walker.object, scale: 1, duration: 600, delay: 300, ease: 'Back.easeOut' });
    this.burst(entry);
  }

  private playUnlock(pen: Pen): void {
    this.scene.tweens.add({
      targets: pen.lock,
      scale: 1.8,
      alpha: 0,
      duration: 400,
      onComplete: () => pen.lock.setVisible(false),
    });
    const first = pen.animals[0]!;
    first.walker.object.setAlpha(1).setScale(0);
    pen.companion?.walker.object.setAlpha(1);
    this.scene.tweens.add({ targets: first.walker.object, scale: 1, duration: 600, delay: 300, ease: 'Back.easeOut' });
    this.burst({ x: first.walker.x, y: first.walker.y });
  }

  private burst(at: Vec): void {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const sparkle = this.sparkle('✨').setPosition(at.x, at.y);
      this.scene.tweens.add({
        targets: sparkle,
        x: at.x + Math.cos(angle) * 30,
        y: at.y + Math.sin(angle) * 30,
        alpha: 0,
        delay: 300,
        duration: 700,
        onComplete: () => sparkle.setVisible(false),
      });
    }
  }

  private sparkle(text: string): Phaser.GameObjects.Text {
    let item = this.sparklePool.find((s) => !s.visible);
    if (!item) {
      item = this.scene.add.text(0, 0, '', { fontSize: '10px' }).setOrigin(0.5).setResolution(4).setDepth(UI_DEPTH);
      this.sparklePool.push(item);
    }
    return item.setText(text).setVisible(true).setAlpha(1);
  }

  private pen(id: AnimalId): Pen {
    const pen = this.pens.find((p) => p.id === id);
    if (!pen) throw new Error(`Recinto desconocido: ${id}`);
    return pen;
  }
}
