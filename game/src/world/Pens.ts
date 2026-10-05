import * as Phaser from 'phaser';
import { getArt } from '../art/art';
import { TILE_SIZE } from '../config';
import { penCount, isPenOpen, type GameState } from '../core/economy';
import { BODY_RADIUS, fleeTarget, followTarget, penSpace, spreadPositions, stepRoamer, type PenSpace, type Roamer } from '../core/flock';
import { gateAtDoorstep, nearestWithin, rectContains, rectsOverlap, tapDistance, type Rect } from '../core/interaction';
import { MIN_GAP } from '../core/obstacles';
import type { Vec } from '../core/movement';
import type { Point } from '../core/pathfinding';
import type { EnclosureInfo, GateInfo, PropInfo } from '../core/tiledmap';
import { ANIMALS, type AnimalId, type Reaction } from '../data/animals';
import { PENS, isPenId, residentsIn, type PenId, type ResidentDef } from '../data/pens';
import { shopItemForPen } from '../data/shop';
import { t } from '../data/strings';
import { createAnimal, createCompanion, type Walker } from './Actors';
import type { Petting } from './VisitorCrowd';

/** Algo que pasea dentro de un recinto: un animal o su acompañante (la leona). */
interface Wanderer {
  walker: Walker;
  /** Qué animal es; null en los acompañantes (la leona). */
  residentId: string | null;
  /** Su especie; null en los acompañantes. */
  species: AnimalId | null;
  /** Radio del cuerpo (px). */
  radius: number;
  /** Última vez (ms) que le salieron corazones. */
  heartAt: number;
  roam: Roamer;
  /** Sin arte: punto alrededor del que se balancea, y desfase del balanceo. */
  base: Vec;
  phase: number;
}

interface Pen {
  id: PenId;
  rect: Rect;
  space: PenSpace;
  gate: Point;
  home: Vec;
  /** Animales del recinto (el primero existe siempre; si está cerrado, se ve en fantasma). */
  animals: Wanderer[];
  companion: Wanderer | null;
  lock: Phaser.GameObjects.Text;
  /** Granja de contacto: entran visitantes y los animales reaccionan a la gente. */
  petting: boolean;
  keeperInside: boolean;
  /** Ms que les quedan de seguir a la cuidadora. */
  followLeft: number;
  shown: boolean;
}

/** Por encima de cualquier cosa del mundo ordenada por Y. */
const UI_DEPTH = 10000;
const LOCKED_ALPHA = 0.25;
/** Una oveja se aparta de quien pasa andando a menos de esto (px). */
const FLEE_RADIUS = 14;
/** Y se acerca a quien se queda quieto a menos de esto. */
const CURIOUS_RADIUS = 64;
/** Tiempo (ms) que siguen a la cuidadora desde que entra. */
const FOLLOW_MS = 5000;
/** Un visitante y una oveja a menos de esto están juntos: salen corazones, como mucho cada HEART_EVERY ms. */
const HEART_RADIUS = 22;
const HEART_EVERY = 5000;

/** Quién anda por el mundo, para los recintos donde los animales reaccionan a la gente. */
export interface People {
  keeper: Vec;
  walking: Vec[];
  standing: Vec[];
}
const REACTION_EMOJI: Record<Reaction, string> = { come: '😋', rechaza: '🤢', especial: '🤩' };

const LABEL_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'sans-serif',
  fontSize: '9px',
  color: '#ffffff',
  stroke: '#000000',
  strokeThickness: 2,
};

const wanderer = (walker: Walker, residentId: string | null, species: AnimalId | null, radius: number, rest = Math.random() * 2000): Wanderer => ({
  walker,
  residentId,
  species,
  radius,
  heartAt: -HEART_EVERY,
  roam: { pos: { x: walker.x, y: walker.y }, target: null, rest, radius },
  base: { x: walker.x, y: walker.y },
  phase: Math.random() * Math.PI * 2,
});

const radiusOf = (species: AnimalId): number => ANIMALS[species].radius ?? BODY_RADIUS;

/** Recintos: animales, candado con precio y la puerta donde se da de comer. */
export class Pens {
  private readonly pens: Pen[] = [];
  private readonly sparklePool: Phaser.GameObjects.Text[] = [];
  /** Recinto en cuya puerta está la cuidadora (para avisar solo al llegar, no en cada fotograma). */
  private atDoorstep: PenId | null = null;
  /** Residente al que va a dar de comer la cuidadora: se queda quieto esperándola. */
  private held: string | null = null;
  /** Veces que han salido corazones entre un visitante y un animal (para pruebas). */
  heartsShown = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    enclosures: EnclosureInfo[],
    gates: GateInfo[],
    state: GameState,
    props: PropInfo[] = [],
  ) {
    for (const enclosure of enclosures) {
      if (!isPenId(enclosure.penId)) continue;
      const id = enclosure.penId;
      const gate = gates.find((g) => g.penId === id);
      if (!gate) continue;
      const def = PENS[id];
      const home = { x: enclosure.x + enclosure.width / 2, y: enclosure.y + enclosure.height / 2 };
      const unlocked = isPenOpen(state, id);
      const price = shopItemForPen(id)?.cost;
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

      // El primero se dibuja siempre (en fantasma si el recinto está cerrado).
      const here: ResidentDef[] = residentsIn(id, Math.max(1, penCount(state, id)));
      const count = here.length;
      // El acompañante es el de la especie del primer residente (un recinto ya no es una especie).
      const lead = def.residents[0]!.species;
      const hasCompanion = Boolean(getArt()?.companions[lead]);
      // Los grandes empiezan más separados y más lejos de la valla.
      const biggest = Math.max(...def.residents.map((r) => radiusOf(r.species)));
      const spots = spreadPositions(space, count + (hasCompanion ? 1 : 0), Math.random, Math.max(8, biggest), Math.max(MIN_GAP * 1.5, biggest * 3));
      const spot = (i: number): Vec => spots[i] ?? home;
      const animals = here.map((resident, i) => {
        const p = spot(i);
        return wanderer(createAnimal(scene, resident.species, p.x, p.y, resident.look), resident.id, resident.species, radiusOf(resident.species));
      });
      const companionAt = spot(count);
      const companionWalker = hasCompanion ? createCompanion(scene, lead, companionAt.x, companionAt.y) : null;
      const companion = companionWalker ? wanderer(companionWalker, null, null, radiusOf(lead), 500 + Math.random() * 1500) : null;
      for (const w of [...animals, ...(companion ? [companion] : [])]) w.walker.object.setAlpha(unlocked ? 1 : LOCKED_ALPHA);

      this.pens.push({ id, rect, space, gate: gate.tile, home, animals, companion, lock, petting: def.visitors === true, keeperInside: false, followLeft: 0, shown: unlocked });
    }
  }

  /**
   * Con arte, los animales pasean por su recinto sin pisarse; sin arte, se balancean en su sitio.
   * Los de los recintos que no se ven (`view`: la zona de la cámara) no se actualizan.
   */
  update(time: number, delta: number, view: Rect, people: People): void {
    const art = getArt() !== null;
    for (const pen of this.pens) {
      if (!rectsOverlap(view, pen.rect, TILE_SIZE * 2)) continue;
      if (pen.petting && pen.shown) this.pet(pen, time, delta, people, art);
      const all = this.members(pen);
      for (const w of all) {
        if (w.residentId !== null && w.residentId === this.held) {
          w.walker.stop();
          continue;
        }
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
   * Recinto cerrado delante de cuya puerta acaba de llegar la cuidadora (para avisar de que se compra
   * en la tienda). Solo al llegar; no se repite hasta que se aparte de la puerta.
   */
  lockedDoorstep(keeperTile: Point, state: GameState): PenId | null {
    const gate = gateAtDoorstep(keeperTile, this.pens.map((pen) => ({ penId: pen.id, tile: pen.gate })));
    const id = gate?.penId ?? null;
    if (id === this.atDoorstep) return null;
    this.atDoorstep = id;
    return id && !isPenOpen(state, id) ? id : null;
  }

  /** Interior de los recintos abiertos: por ahí puede andar la cuidadora. */
  openSpaces(state: GameState): PenSpace[] {
    return this.pens.filter((pen) => isPenOpen(state, pen.id)).map((pen) => pen.space);
  }

  /** El residente de un recinto abierto más cercano a `point`, a no más de `radius` de su cuerpo. */
  residentAt(point: Vec, state: GameState, radius: number): { penId: PenId; residentId: string } | null {
    let best: { penId: PenId; residentId: string } | null = null;
    let bestDistance = radius;
    for (const pen of this.pens) {
      if (!isPenOpen(state, pen.id)) continue;
      for (const w of pen.animals) {
        if (w.residentId === null) continue;
        const distance = tapDistance({ x: w.walker.x, y: w.walker.y }, w.radius, point);
        if (distance <= bestDistance) {
          best = { penId: pen.id, residentId: w.residentId };
          bestDistance = distance;
        }
      }
    }
    return best;
  }

  positionOf(residentId: string): Vec | null {
    const w = this.find(residentId);
    return w ? { x: w.walker.x, y: w.walker.y } : null;
  }

  /** Punto sobre la cabeza del animal, donde irán los iconos de estado (hambre, enfermo). */
  anchorOf(residentId: string): Vec | null {
    const w = this.find(residentId);
    return w ? { x: w.walker.x, y: w.walker.y - 16 - (w.radius - BODY_RADIUS) * 2 } : null;
  }

  hold(residentId: string): void {
    this.held = residentId;
  }

  release(): void {
    this.held = null;
  }

  contains(penId: PenId, point: Vec): boolean {
    return rectContains(this.pen(penId).rect, point);
  }

  /** Interior de los recintos abiertos donde entran visitantes. */
  visitorSpaces(state: GameState): PenSpace[] {
    return this.pens.filter((pen) => pen.petting && isPenOpen(state, pen.id)).map((pen) => pen.space);
  }

  /** La granja de contacto, si está abierta: su zona y dónde están sus animales. */
  petting(state: GameState): Petting | null {
    const pen = this.pens.find((p) => p.petting && isPenOpen(state, p.id));
    if (!pen) return null;
    return { area: pen.rect, spots: () => pen.animals.map((w) => ({ x: w.walker.x, y: w.walker.y })) };
  }

  rectOf(penId: PenId): Rect {
    return this.pen(penId).rect;
  }

  /**
   * Granja de contacto. Cada animal, por orden: se aparta de quien pasa andando; sigue un rato a la
   * cuidadora cuando entra; el más cercano a un visitante parado se le acerca. Y cuando un visitante
   * parado y un animal están juntos, salen corazones.
   */
  private pet(pen: Pen, time: number, delta: number, people: People, art: boolean): void {
    const keeperInside = rectContains(pen.rect, people.keeper);
    if (keeperInside && !pen.keeperInside) pen.followLeft = FOLLOW_MS;
    pen.keeperInside = keeperInside;
    if (keeperInside) pen.followLeft = Math.max(0, pen.followLeft - delta);
    const standing = people.standing.filter((p) => rectContains(pen.rect, p));

    for (const w of art ? pen.animals : []) {
      if (w.residentId === this.held) continue;
      const pos = w.roam.pos;
      const passer = nearestWithin(people.walking, pos, FLEE_RADIUS);
      // undefined: pasea a su aire. null: se queda donde está.
      let target: Vec | null | undefined;
      if (passer) target = fleeTarget(pos, passer, pen.space) ?? undefined;
      else if (keeperInside && pen.followLeft > 0) target = followTarget(pos, people.keeper, pen.space, 22);
      else {
        const visitor = nearestWithin(standing, pos, CURIOUS_RADIUS);
        if (visitor && this.closest(pen, visitor) === w) target = followTarget(pos, visitor, pen.space, 14);
      }
      if (target === undefined) continue;
      w.roam = target ? { ...w.roam, target, rest: 0 } : { ...w.roam, target: null, rest: 300 };
    }

    for (const visitor of standing) {
      const w = this.closest(pen, visitor);
      if (!w || Math.hypot(w.walker.x - visitor.x, w.walker.y - visitor.y) > HEART_RADIUS) continue;
      if (time - w.heartAt < HEART_EVERY) continue;
      w.heartAt = time;
      this.heartsShown++;
      this.hearts({ x: w.walker.x, y: w.walker.y });
      this.hearts(visitor);
    }
  }

  private closest(pen: Pen, point: Vec): Wanderer | null {
    let best: Wanderer | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const w of pen.animals) {
      const d = Math.hypot(w.walker.x - point.x, w.walker.y - point.y);
      if (d < bestDistance) {
        best = w;
        bestDistance = d;
      }
    }
    return best;
  }

  /** Corazones que suben, como en la reacción especial de la ventana de dar de comer. */
  private hearts(at: Vec): void {
    ['❤️', '💕', '💖'].forEach((shape, i) => {
      const heart = this.sparkle(shape).setPosition(at.x + (i - 1) * 6, at.y - 14);
      this.scene.tweens.add({ targets: heart, y: heart.y - 16, alpha: 0, delay: i * 120, duration: 900, onComplete: () => heart.setVisible(false) });
    });
  }

  private find(residentId: string): Wanderer | null {
    for (const pen of this.pens) {
      const w = pen.animals.find((a) => a.residentId === residentId);
      if (w) return w;
    }
    return null;
  }

  lockedPenAt(point: Vec, state: GameState): PenId | null {
    const pen = this.pens.find((p) => !isPenOpen(state, p.id) && rectContains(p.rect, point));
    return pen?.id ?? null;
  }

  /** Nº de animales que hay en el mundo en cada recinto (para pruebas). */
  animalsIn(id: PenId): number {
    return this.pen(id).animals.length;
  }

  /** Anima los recintos recién comprados y añade los animales extra (se llama al volver de la tienda). */
  syncUnlocks(state: GameState): void {
    for (const pen of this.pens) {
      if (!isPenOpen(state, pen.id)) continue;
      if (!pen.shown) {
        pen.shown = true;
        this.playUnlock(pen);
      }
      while (pen.animals.length < penCount(state, pen.id)) this.addAnimal(pen);
    }
  }

  /** Reacciona el animal que ha comido y, con él, los de su especie que haya en el recinto. */
  celebrate(residentId: string, reaction: Reaction): void {
    const pen = this.pens.find((p) => p.animals.some((w) => w.residentId === residentId));
    const fed = pen?.animals.find((w) => w.residentId === residentId);
    if (!pen || !fed) return;
    for (const w of pen.animals.filter((a) => a.species === fed.species)) {
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
    const resident = PENS[pen.id].residents[pen.animals.length];
    if (!resident) return;
    const w = wanderer(createAnimal(this.scene, resident.species, entry.x, entry.y, resident.look), resident.id, resident.species, radiusOf(resident.species), 800);
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

  private pen(id: PenId): Pen {
    const pen = this.pens.find((p) => p.id === id);
    if (!pen) throw new Error(`Recinto desconocido: ${id}`);
    return pen;
  }
}
