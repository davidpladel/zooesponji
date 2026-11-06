// Mando para jugadores con IA: un servidor HTTP local que abre el juego en un navegador sin ventana, como un
// móvil apaisado (640x360), y deja jugar solo como un niño: tocar, arrastrar y esperar. Cada acción devuelve
// una captura. El jugador no ve nada más del juego (ni escenas ni estado): solo las capturas.
//
// Uso: npm run build && npm run preview (en otra ventana) y npm run ia:mando
//   POST /partida   { id }                  → { captura }   partida nueva y limpia
//   POST /tocar     { id, x, y }            → { captura }
//   POST /arrastrar { id, x0, y0, x1, y1 }  → { captura }
//   POST /esperar   { id, ms }  (máx. 5000) → { captura }
//   POST /fin       { id }                  → { diario }
// Capturas y diario en zooesponji-private/docs/jugadores-ia/AAAA-MM-DD/<id>/. Máximo 60 acciones por partida.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

const PORT = 7801;
const GAME_URL = process.env.IA_GAME_URL ?? 'http://localhost:4173/';
const MAX_ACTIONS = 60;
const MAX_WAIT = 5000;
const SIZE = { width: 640, height: 360 };

const game = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const now = new Date();
// Fecha local (no UTC): la carpeta de la pasada lleva el día en que se juega.
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const outRoot = resolve(game, '../../zooesponji-private/docs/jugadores-ia', today);

interface Entry {
  n: number;
  hora: string;
  accion: string;
  datos: Record<string, unknown>;
  captura: string;
  /**
   * Escenas activas: solo para el diario (lo lee quien revisa), nunca se le devuelve al jugador. Solo se
   * conocen si el juego tiene los ganchos de prueba (`npm run dev`); con `npm run preview` queda vacío.
   */
  escenas: string[];
}

interface Game {
  id: string;
  dir: string;
  context: BrowserContext;
  page: Page;
  log: Entry[];
}

let browser: Browser | null = null;
const games = new Map<string, Game>();

const safeId = (id: unknown): string | null => (typeof id === 'string' && /^[a-z0-9-]{1,40}$/i.test(id) ? id : null);

async function scenes(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __ZOO__?: { activeScenes(): string[] } }).__ZOO__?.activeScenes() ?? []).catch(() => []);
}

async function snap(g: Game, accion: string, datos: Record<string, unknown>): Promise<string> {
  const n = g.log.length;
  const file = join(g.dir, `${String(n).padStart(2, '0')}-${accion}.png`);
  await g.page.screenshot({ path: file });
  g.log.push({ n, hora: new Date().toISOString(), accion, datos, captura: file, escenas: await scenes(g.page) });
  return file;
}

async function openGame(id: string): Promise<Game> {
  browser ??= await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' });
  const old = games.get(id);
  if (old) await old.context.close();
  const dir = join(outRoot, id);
  mkdirSync(dir, { recursive: true });
  // Contexto nuevo = partida limpia (sin guardado ni preferencias).
  const context = await browser.newContext({ viewport: SIZE, deviceScaleFactor: 1, locale: 'es-ES', hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto(GAME_URL);
  // En la versión construida no hay ganchos de prueba: se espera al lienzo y a que pase la carga.
  await page.waitForSelector('canvas', { timeout: 60_000 });
  await page.waitForTimeout(5000);
  const g: Game = { id, dir, context, page, log: [] };
  games.set(id, g);
  return g;
}

const num = (v: unknown, max: number): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? v : null);

async function act(g: Game, path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (g.log.length > MAX_ACTIONS) return { error: 'límite' };
  const { page } = g;
  switch (path) {
    case '/tocar': {
      const x = num(body.x, SIZE.width);
      const y = num(body.y, SIZE.height);
      if (x === null || y === null) return { error: 'x e y dentro de la pantalla (640x360)' };
      await page.mouse.click(x, y);
      await page.waitForTimeout(400);
      return { captura: await snap(g, 'tocar', { x, y }) };
    }
    case '/arrastrar': {
      const [x0, y0, x1, y1] = [num(body.x0, SIZE.width), num(body.y0, SIZE.height), num(body.x1, SIZE.width), num(body.y1, SIZE.height)];
      if (x0 === null || y0 === null || x1 === null || y1 === null) return { error: 'x0, y0, x1, y1 dentro de la pantalla (640x360)' };
      await page.mouse.move(x0, y0);
      await page.mouse.down();
      await page.mouse.move(x1, y1, { steps: 15 });
      await page.mouse.up();
      await page.waitForTimeout(400);
      return { captura: await snap(g, 'arrastrar', { x0, y0, x1, y1 }) };
    }
    case '/esperar': {
      const ms = Math.min(MAX_WAIT, num(body.ms, 1e9) ?? 1000);
      await page.waitForTimeout(ms);
      return { captura: await snap(g, 'esperar', { ms }) };
    }
    default:
      return { error: 'acción desconocida' };
  }
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 10_000) break;
  }
  try {
    const parsed = JSON.parse(raw || '{}') as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function send(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

// Una acción cada vez por partida: las peticiones de la misma partida se encolan.
const queues = new Map<string, Promise<unknown>>();

const server = createServer(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'solo POST' });
  const body = await readBody(req);
  const id = safeId(body.id);
  if (!id) return send(res, 400, { error: 'id: letras, números y guiones' });
  const path = (req.url ?? '').split('?')[0]!;
  const run = async (): Promise<Record<string, unknown>> => {
    if (path === '/partida') {
      const g = await openGame(id);
      return { captura: await snap(g, 'partida', {}) };
    }
    const g = games.get(id);
    if (!g) return { error: 'primero POST /partida' };
    if (path === '/fin') {
      const diario = join(g.dir, 'diario.json');
      writeFileSync(diario, JSON.stringify(g.log, null, 2));
      await g.context.close();
      games.delete(id);
      return { diario };
    }
    return act(g, path, body);
  };
  const prev = queues.get(id) ?? Promise.resolve();
  const next = prev.then(run, run);
  queues.set(id, next.catch(() => undefined));
  try {
    const result = await next;
    send(res, 'error' in result ? 400 : 200, result);
  } catch (error) {
    send(res, 500, { error: String(error) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Mando listo en http://127.0.0.1:${PORT} (juego: ${GAME_URL}; salida: ${outRoot})`);
});

const stop = async (): Promise<void> => {
  for (const g of games.values()) await g.context.close().catch(() => undefined);
  await browser?.close();
  process.exit(0);
};
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
