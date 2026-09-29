import * as Phaser from 'phaser';
import { ART_KEYS, animalKey, companionKey, getArt, idleFrame, visitorKey, walkAnimKey } from '../art/art';
import { TEXTURES } from '../config';
import { depthForY } from '../core/depth';
import { facingFromDelta, type Facing } from '../core/facing';
import { ANIMALS, type AnimalId } from '../data/animals';

export interface Walker {
  readonly object: Phaser.GameObjects.Sprite | Phaser.GameObjects.Text;
  readonly x: number;
  readonly y: number;
  moveTo(x: number, y: number): void;
  stop(): void;
  /** Se queda quieto mirando hacia un lado. */
  face(facing: Facing): void;
}

/** Sprite con animación de andar en 4 direcciones (hojas 3×4 de VectoRaith). */
class SpriteWalker implements Walker {
  private facing: Facing = 'down';
  private walking = false;

  constructor(
    readonly object: Phaser.GameObjects.Sprite,
    private readonly textureKey: string,
    private readonly depthOf: (y: number) => number = depthForY,
  ) {
    object.setFrame(idleFrame(this.facing)).setDepth(depthOf(object.y));
  }

  get x(): number {
    return this.object.x;
  }

  get y(): number {
    return this.object.y;
  }

  moveTo(x: number, y: number): void {
    const dx = x - this.object.x;
    const dy = y - this.object.y;
    if (dx === 0 && dy === 0) return;
    const facing = facingFromDelta(dx, dy, this.facing);
    if (!this.walking || facing !== this.facing) {
      this.facing = facing;
      this.walking = true;
      this.object.play(walkAnimKey(this.textureKey, facing), true);
    }
    this.object.setPosition(x, y).setDepth(this.depthOf(y));
  }

  stop(): void {
    if (!this.walking) return;
    this.walking = false;
    this.object.stop();
    this.object.setFrame(idleFrame(this.facing));
  }

  face(facing: Facing): void {
    this.stop();
    this.facing = facing;
    this.object.setFrame(idleFrame(facing));
  }
}

/** Modo provisional: se mueve sin animación. */
class PlainWalker implements Walker {
  constructor(
    readonly object: Phaser.GameObjects.Sprite | Phaser.GameObjects.Text,
    private readonly depthOf: (y: number) => number = depthForY,
  ) {
    object.setDepth(depthOf(object.y));
  }

  get x(): number {
    return this.object.x;
  }

  get y(): number {
    return this.object.y;
  }

  moveTo(x: number, y: number): void {
    this.object.setPosition(x, y).setDepth(this.depthOf(y));
  }

  stop(): void {}

  face(): void {}
}

/** `depthOf` permite otra forma de ordenar (en la tienda se ordena por la Y del interior). */
export function createKeeper(scene: Phaser.Scene, x: number, y: number, depthOf: (y: number) => number = depthForY): Walker {
  if (getArt()) {
    const sprite = scene.add.sprite(x, y, ART_KEYS.keeper).setOrigin(0.5, 0.85);
    return new SpriteWalker(sprite, ART_KEYS.keeper, depthOf);
  }
  return new PlainWalker(scene.add.sprite(x, y, TEXTURES.keeper), depthOf);
}

export function createVisitor(scene: Phaser.Scene, index: number, x: number, y: number, emoji: string): Walker {
  const art = getArt();
  if (art && art.visitors.length > 0) {
    const key = visitorKey(index % art.visitors.length);
    const sprite = scene.add.sprite(x, y, key).setOrigin(0.5, 0.85).setDepth(4);
    return new SpriteWalker(sprite, key);
  }
  return new PlainWalker(
    scene.add.text(x, y, emoji, { fontSize: '12px' }).setOrigin(0.5, 0.8).setResolution(4).setDepth(4),
  );
}

export function createAnimal(scene: Phaser.Scene, id: AnimalId, x: number, y: number): Walker {
  if (getArt()) {
    const key = animalKey(id);
    const sprite = scene.add.sprite(x, y, key).setOrigin(0.5, 0.75).setDepth(5);
    return new SpriteWalker(sprite, key);
  }
  return new PlainWalker(
    scene.add.text(x, y, ANIMALS[id].emoji, { fontSize: '22px' }).setOrigin(0.5).setResolution(4).setDepth(5),
  );
}

/** Retrato grande del animal (pose quieta de perfil, la más reconocible) con escala entera para que el pixel art se vea nítido. */
export function animalPortrait(
  scene: Phaser.Scene,
  id: AnimalId,
  x: number,
  y: number,
  targetHeight: number,
): Phaser.GameObjects.Sprite | Phaser.GameObjects.Text {
  const art = getArt();
  if (art) {
    const frameHeight = art.animals[id].frameHeight;
    const scale = Math.max(1, Math.floor(targetHeight / frameHeight));
    return scene.add.sprite(x, y, animalKey(id), idleFrame('right')).setScale(scale);
  }
  return scene.add.text(x, y, ANIMALS[id].emoji, { fontSize: `${Math.round(targetHeight)}px` }).setOrigin(0.5);
}

/** Animal decorativo que acompaña al principal (p. ej. la leona). Solo existe con arte. */
export function createCompanion(scene: Phaser.Scene, id: AnimalId, x: number, y: number): Walker | null {
  if (!getArt()?.companions[id]) return null;
  const key = companionKey(id);
  const sprite = scene.add.sprite(x, y, key).setOrigin(0.5, 0.75);
  return new SpriteWalker(sprite, key);
}
