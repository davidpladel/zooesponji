// Copia la letra y los iconos de la interfaz desde node_modules a public/.
// Los iconos de Tabler usan currentColor: aquí se dejan en blanco para teñirlos en el juego.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const tabler = `${root}node_modules/@tabler/icons/icons/`;

/** Nombre en el juego → nombre en Tabler. */
const ICONS = {
  play: 'player-play',
  close: 'x',
  music: 'music',
  volume: 'volume',
  joystick: 'device-gamepad-2',
  gear: 'settings',
  lock: 'lock',
  shield: 'shield-lock',
  door: 'door-exit',
  left: 'caret-left',
  right: 'caret-right',
  heart: 'heart',
};
/** Estos se quieren de trazo aunque exista la versión rellena. */
const OUTLINE = new Set(['close', 'door']);

mkdirSync(`${root}public/assets/ui/icons`, { recursive: true });
for (const [name, source] of Object.entries(ICONS)) {
  const filled = `${tabler}filled/${source}.svg`;
  const outline = `${tabler}outline/${source}.svg`;
  const useFilled = !OUTLINE.has(name) && existsSync(filled);
  const path = useFilled ? filled : outline;
  if (!existsSync(path)) throw new Error(`No existe el icono de Tabler: ${source}`);
  let svg = readFileSync(path, 'utf8').replaceAll('currentColor', '#ffffff');
  if (!useFilled) {
    if (!svg.includes('stroke-width="2"')) throw new Error(`El icono de trazo ${source} no trae stroke-width="2"`);
    svg = svg.replace('stroke-width="2"', 'stroke-width="2.6"');
  }
  writeFileSync(`${root}public/assets/ui/icons/${name}.svg`, svg);
  console.log(`${name}.svg ← ${useFilled ? 'filled' : 'outline'}/${source}`);
}

mkdirSync(`${root}public/fonts`, { recursive: true });
const font = 'baloo-2-latin-800-normal.woff2';
copyFileSync(`${root}node_modules/@fontsource/baloo-2/files/${font}`, `${root}public/fonts/${font}`);
console.log(font);

// Las licencias viajan con lo que copiamos (SIL OFL de la letra, MIT de los iconos).
const licences = [
  [`${root}node_modules/@fontsource/baloo-2/LICENSE`, `${root}public/fonts/Baloo2-LICENSE.txt`],
  [`${root}node_modules/@tabler/icons/LICENSE`, `${root}public/assets/ui/icons/LICENSE.txt`],
];
for (const [from, to] of licences) {
  if (!existsSync(from)) throw new Error(`Falta el texto de la licencia: ${from}`);
  copyFileSync(from, to);
  console.log(to.slice(root.length));
}
