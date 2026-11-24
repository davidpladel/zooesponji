/**
 * Dibujos propios del aviso de actualizar (Canvas 2D, sin arte de terceros): la flecha hacia abajo, la marca ✓
 * del botón de aceptar y el reloj del «luego». La geometría es pura para poder medirla en pruebas.
 */

export interface Pt {
  x: number;
  y: number;
}

/** Lo mínimo del contexto 2D que usan los dibujos (así una prueba puede pasarle uno falso). */
export type GlyphCtx = Pick<
  CanvasRenderingContext2D,
  'beginPath' | 'moveTo' | 'lineTo' | 'closePath' | 'fill' | 'stroke' | 'arc' | 'fillStyle' | 'strokeStyle' | 'lineWidth' | 'lineCap' | 'lineJoin'
>;

export type GlyphKind = 'arrow' | 'check' | 'clock';

/** Flecha hacia abajo (rabo y punta), centrada en un cuadro de `size`×`size`. 7 puntos, de arriba a la izquierda en sentido horario. */
export function arrowPoints(size: number): Pt[] {
  const c = size / 2;
  const shaft = size * 0.16;
  const head = size * 0.3;
  const top = size * 0.08;
  const neck = size * 0.5;
  const tip = size * 0.92;
  return [
    { x: c - shaft, y: top },
    { x: c + shaft, y: top },
    { x: c + shaft, y: neck },
    { x: c + head, y: neck },
    { x: c, y: tip },
    { x: c - head, y: neck },
    { x: c - shaft, y: neck },
  ];
}

/** Los tres puntos de la marca ✓: el corto, el vértice y el largo. */
export function checkPoints(size: number): [Pt, Pt, Pt] {
  return [
    { x: size * 0.16, y: size * 0.54 },
    { x: size * 0.4, y: size * 0.8 },
    { x: size * 0.86, y: size * 0.22 },
  ];
}

/** Reloj: esfera de radio `radius` y las manillas (las 12:00 y las 15:00 más o menos: la de los minutos, más larga). */
export function clockHands(size: number): { center: Pt; radius: number; hour: [Pt, Pt]; minute: [Pt, Pt] } {
  const center = { x: size / 2, y: size / 2 };
  const radius = size * 0.46;
  return {
    center,
    radius,
    hour: [center, { x: center.x + radius * 0.4, y: center.y }],
    minute: [center, { x: center.x, y: center.y - radius * 0.68 }],
  };
}

/** Pinta el dibujo en un cuadro de `size`×`size` con `color` (un solo color; el fondo lo pone quien lo usa). */
export function drawGlyph(ctx: GlyphCtx, kind: GlyphKind, size: number, color: string): void {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (kind === 'arrow') {
    const pts = arrowPoints(size);
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    return;
  }
  if (kind === 'check') {
    const [a, b, c] = checkPoints(size);
    ctx.lineWidth = Math.max(2, size * 0.17);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();
    return;
  }
  const { center, radius, hour, minute } = clockHands(size);
  ctx.lineWidth = Math.max(2, size * 0.09);
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hour[0].x, hour[0].y);
  ctx.lineTo(hour[1].x, hour[1].y);
  ctx.moveTo(minute[0].x, minute[0].y);
  ctx.lineTo(minute[1].x, minute[1].y);
  ctx.stroke();
}
