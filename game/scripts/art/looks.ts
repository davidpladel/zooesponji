// Construye la hoja de sprites de un aspecto de animal.
import { PNG } from 'pngjs';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { editSheet, recolorPanther, reorderRows, shrinkFrames } from './pngTools.ts';
import { privateRepo, readSource, type LookSource } from './source.ts';

export const finished = (file: string): string => join(privateRepo, 'art-work/terminados', file);

/**
 * Por orden: el dibujo de los niños si existe (tal cual, sin retoques); si no, la hoja del pack
 * con su recolor, sus retoques y su reducción.
 */
export function buildLook(id: string, look: LookSource): { png: PNG; fromOverride: boolean } {
  const overridePath = look.override ? finished(look.override) : null;
  if (overridePath && existsSync(overridePath)) {
    let png: PNG = PNG.sync.read(readFileSync(overridePath));
    // Hojas pintadas con otro orden de filas (p. ej. la pantera: de espaldas arriba).
    if (look.overrideRows) png = reorderRows(png, look.overrideRows);
    return { png, fromOverride: true };
  }
  let png = readSource(look);
  if (png.width % 3 !== 0 || png.height % 4 !== 0) throw new Error(`La hoja de "${id}" no es de 3×4 fotogramas`);
  if (look.recolor === 'panther') png = recolorPanther(png);
  if (look.edits && look.edits.length > 0) png = editSheet(png, look.edits);
  if (look.shrink) png = shrinkFrames(png, look.shrink);
  return { png, fromOverride: false };
}
