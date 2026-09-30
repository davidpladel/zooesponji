// Genera public/audio/paso.wav: un paso suave sobre suelo de madera (obra propia, sintetizada).
// Va flojito a propósito: suena en cada paso de la cuidadora dentro de la tienda.
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const LENGTH = 0.12;
const samples = new Float32Array(Math.round(RATE * LENGTH));
let seed = 7;
const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
let low = 0;
for (let i = 0; i < samples.length; i++) {
  const t = i / RATE;
  low += 0.18 * (noise() - low); // ruido filtrado: el "toc" de la madera
  const body = Math.sin(2 * Math.PI * 170 * t) * Math.exp(-t * 55); // cuerpo grave del tablón
  samples[i] = 0.28 * (0.7 * body + 0.9 * low * Math.exp(-t * 90)) * Math.min(1, t * 600);
}

const data = Buffer.alloc(samples.length * 2);
samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
const header = Buffer.alloc(44);
header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8);
header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
header.writeUInt32LE(RATE, 24); header.writeUInt32LE(RATE * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
header.write('data', 36); header.writeUInt32LE(data.length, 40);
const out = resolve(dirname(fileURLToPath(import.meta.url)), '../public/audio/paso.wav');
writeFileSync(out, Buffer.concat([header, data]));
console.log('Paso generado en', out);
