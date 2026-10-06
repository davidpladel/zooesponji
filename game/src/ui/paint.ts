import * as Phaser from 'phaser';
import { FONT_STACK, PILL, UI, type PillColor } from './theme';

type Ctx = CanvasRenderingContext2D;

/** Rectángulo redondeado con arcTo (también en WebView sin roundRect). */
function roundedPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

function fill(ctx: Ctx, style: string | CanvasGradient, x: number, y: number, w: number, h: number, r: number): void {
  ctx.fillStyle = style;
  roundedPath(ctx, x, y, w, h, r);
  ctx.fill();
}

function vertical(ctx: Ctx, y0: number, y1: number, top: string, bottom: string): CanvasGradient {
  const gradient = ctx.createLinearGradient(0, y0, 0, y1);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  return gradient;
}

/** Alto de la sombra que cuelga por debajo de una pieza de alto `h`. */
export function shadowOf(h: number): number {
  return Math.max(2, Math.round(h * 0.09));
}

/** El juego usa pixelArt (filtro «vecino»): las piezas lisas piden filtro lineal. */
export function smooth(scene: Phaser.Scene, key: string): void {
  scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
}

/** Crea la textura una sola vez por clave. */
function ensure(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void): string {
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)));
  if (!texture) throw new Error(`No se pudo crear la textura ${key}`);
  draw(texture.context);
  texture.refresh();
  smooth(scene, key);
  return key;
}

/** Píldora (o ficha de color si `radius` es pequeño): reborde claro, cuerpo en degradado, brillo y canto. */
export function pillTexture(scene: Phaser.Scene, w: number, h: number, color: PillColor, radius = h / 2): string {
  const W = Math.round(w);
  const H = Math.round(h);
  const R = Math.round(radius);
  const s = shadowOf(H);
  return ensure(scene, `ui-pill-${color}-${W}x${H}-${R}`, W, H + s, (ctx) => {
    const c = PILL[color];
    const rim = Math.max(2, Math.round(H * 0.06));
    const lip = Math.max(2, Math.round(H * 0.09));
    fill(ctx, UI.shadow, 0, s, W, H, R);
    fill(ctx, UI.rim, 0, 0, W, H, R);
    fill(ctx, c.lip, rim, rim, W - 2 * rim, H - 2 * rim, R - rim);
    fill(ctx, vertical(ctx, rim, H - rim - lip, c.top, c.bottom), rim, rim, W - 2 * rim, H - 2 * rim - lip, R - rim);
    const glossH = (H - 2 * rim) * 0.36;
    fill(ctx, 'rgba(255,255,255,0.35)', rim + W * 0.04, rim + H * 0.05, W - 2 * rim - W * 0.08, glossH, Math.min(glossH / 2, R));
  });
}

/** Panel crema con marco naranja y contorno marrón. */
export function panelTexture(scene: Phaser.Scene, w: number, h: number): string {
  const W = Math.round(w);
  const H = Math.round(h);
  const side = Math.min(W, H);
  const s = Math.max(4, Math.round(side * 0.03));
  return ensure(scene, `ui-panel-${W}x${H}`, W, H + s, (ctx) => {
    const r = side * 0.09;
    const line = Math.max(2, Math.round(side * 0.012));
    const frame = Math.max(4, Math.round(side * 0.022));
    fill(ctx, UI.shadow, 0, s, W, H, r);
    fill(ctx, UI.outline, 0, 0, W, H, r);
    fill(ctx, UI.frame, line, line, W - 2 * line, H - 2 * line, r - line);
    fill(ctx, UI.cream, line + frame, line + frame, W - 2 * (line + frame), H - 2 * (line + frame), r - line - frame);
  });
}

/** Cartel naranja del título. */
export function ribbonTexture(scene: Phaser.Scene, w: number, h: number): string {
  const W = Math.round(w);
  const H = Math.round(h);
  const s = shadowOf(H);
  return ensure(scene, `ui-ribbon-${W}x${H}`, W, H + s, (ctx) => {
    const r = H * 0.22;
    const line = Math.max(2, Math.round(H * 0.07));
    fill(ctx, UI.shadow, 0, s, W, H, r);
    fill(ctx, UI.outline, 0, 0, W, H, r);
    fill(ctx, vertical(ctx, line, H - line, UI.ribbonTop, UI.ribbonBottom), line, line, W - 2 * line, H - 2 * line, r - line);
    fill(ctx, 'rgba(255,255,255,0.35)', line * 2, line * 1.6, W - line * 4, (H - 2 * line) * 0.22, H * 0.1);
  });
}

/** Ficha blanca con marco naranja. */
export function tileTexture(scene: Phaser.Scene, w: number, h: number): string {
  const W = Math.round(w);
  const H = Math.round(h);
  const side = Math.min(W, H);
  const s = Math.max(2, Math.round(side * 0.05));
  return ensure(scene, `ui-tile-${W}x${H}`, W, H + s, (ctx) => {
    const r = side * 0.18;
    const frame = Math.max(2, Math.round(side * 0.045));
    fill(ctx, 'rgba(60,30,0,0.25)', 0, s, W, H, r);
    fill(ctx, UI.frame, 0, 0, W, H, r);
    fill(ctx, '#f3dfb4', frame, frame, W - 2 * frame, H - 2 * frame, r - frame);
    fill(ctx, '#ffffff', frame, frame, W - 2 * frame, H - 2 * frame - Math.max(2, Math.round(side * 0.05)), r - frame);
  });
}

/** Moneda dorada con aro y un «1». */
export function coinTexture(scene: Phaser.Scene, diameter: number): string {
  const D = Math.round(diameter);
  const s = Math.max(2, Math.round(D * 0.08));
  return ensure(scene, `ui-coin-${D}`, D, D + s, (ctx) => {
    const c = D / 2;
    const disc = (radius: number, style: string | CanvasGradient, cy = c) => {
      ctx.fillStyle = style;
      ctx.beginPath();
      ctx.arc(c, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    };
    disc(c, 'rgba(60,30,0,0.4)', c + s);
    disc(c, '#a86200');
    const gold = ctx.createRadialGradient(D * 0.35, D * 0.3, D * 0.05, c, c, c);
    gold.addColorStop(0, '#fff2a8');
    gold.addColorStop(0.6, '#ffc21a');
    gold.addColorStop(1, '#f29a00');
    disc(c * 0.9, gold);
    ctx.strokeStyle = '#c97f00';
    ctx.lineWidth = Math.max(1, D * 0.05);
    ctx.beginPath();
    ctx.arc(c, c, c * 0.66, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#c97f00';
    ctx.font = `800 ${Math.round(D * 0.56)}px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1', c, c + D * 0.04);
  });
}

/** Ventana con cielo y prado donde se asoma el animal al darle de comer. */
export function sceneryTexture(scene: Phaser.Scene, w: number, h: number): string {
  const W = Math.round(w);
  const H = Math.round(h);
  return ensure(scene, `ui-scenery-${W}x${H}`, W, H, (ctx) => {
    const r = Math.min(W, H) * 0.12;
    const frame = Math.max(3, Math.round(Math.min(W, H) * 0.025));
    fill(ctx, UI.frame, 0, 0, W, H, r);
    ctx.save();
    roundedPath(ctx, frame, frame, W - 2 * frame, H - 2 * frame, r - frame);
    ctx.clip();
    ctx.fillStyle = vertical(ctx, 0, H * 0.55, '#8fd3f7', '#cdeeff');
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#a5dc6c';
    ctx.fillRect(0, H * 0.55, W, H);
    ctx.fillStyle = '#8ecb58';
    ctx.fillRect(0, H * 0.86, W, H);
    ctx.restore();
  });
}
