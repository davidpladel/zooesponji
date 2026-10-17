// Captura compose.html fotograma a fotograma y monta el MP4 con música y voz.
// Uso: node trailer/render.mjs <es|en> [ffmpeg.exe] [--preview]
// Antes: capture.mjs <idioma> y pasar out/gameplay-<idioma>.webm a MP4 (ver game/README.md).
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, 'out');
const FRAMES = path.join(OUT, 'frames');
const LANG = process.argv[2] === 'en' ? 'en' : 'es';
const FFMPEG = process.argv.slice(3).find((a) => !a.startsWith('--')) ?? 'ffmpeg';
const MARKS = JSON.parse(fs.readFileSync(path.join(OUT, `marks-${LANG}.json`), 'utf8'));
const PREVIEW = process.argv.includes('--preview');
const FPS = 30, DUR = 43;

fs.mkdirSync(FRAMES, { recursive: true });
for (const f of fs.readdirSync(FRAMES)) if (PREVIEW ? f.startsWith(`prev-${LANG}-`) : f.startsWith('f')) fs.rmSync(path.join(FRAMES, f));
const browser = await chromium.launch({ channel: 'chrome', args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.addInitScript(([lang, marks]) => { window.LANG = lang; window.MARKS = marks; }, [LANG, MARKS]);
await page.goto(pathToFileURL(path.join(DIR, 'compose.html')).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => document.getElementById('v').readyState >= 2);

const times = PREVIEW ? [1.5, 5, 8, 12, 15, 19, 22, 25, 28, 30, 33, 40] : [...Array(FPS * DUR).keys()].map((i) => i / FPS);
for (const [i, t] of times.entries()) {
  await page.evaluate((t) => window.render(t), t);
  await page.screenshot({ path: path.join(FRAMES, PREVIEW ? `prev-${LANG}-${i}.jpg` : `f${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 94 });
  if (i % 60 === 0) console.log('frame', i, '/', times.length);
}
await browser.close();
if (PREVIEW) process.exit(0);

const A = path.join(OUT, 'audio');
execFileSync(FFMPEG, [
  '-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(FRAMES, 'f%04d.jpg'),
  '-i', path.join(A, 'music.wav'),
  '-filter_complex', '[1]alimiter=limit=0.95[aout]',
  '-map', '0:v', '-map', '[aout]',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS),
  '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart',
  path.join(OUT, `zoo-esponji-trailer-${LANG}.mp4`),
]);
console.log('listo:', path.join(OUT, `zoo-esponji-trailer-${LANG}.mp4`));
