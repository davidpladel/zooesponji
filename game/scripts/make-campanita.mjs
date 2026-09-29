// Genera public/audio/campanita.wav: la campanilla de la puerta de la tienda (obra propia, sintetizada).
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const LENGTH = 1.1;
const samples = new Float32Array(Math.round(RATE * LENGTH));
// Parciales típicos de campana (relación con la fundamental) y su volumen.
const PARTIALS = [[1, 1], [2.0, 0.5], [2.76, 0.35], [5.4, 0.2], [8.93, 0.1]];
function strike(start, freq, gain) {
  for (let i = Math.round(start * RATE); i < samples.length; i++) {
    const t = i / RATE - start;
    let v = 0;
    for (const [ratio, amp] of PARTIALS) v += amp * Math.sin(2 * Math.PI * freq * ratio * t) * Math.exp(-t * (3 + ratio * 1.5));
    samples[i] += gain * v * Math.min(1, t * 400); // ataque de 2,5 ms sin chasquido
  }
}
strike(0, 1568, 0.35); // sol
strike(0.16, 2093, 0.3); // do agudo

const data = Buffer.alloc(samples.length * 2);
samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
const header = Buffer.alloc(44);
header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8);
header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
header.writeUInt32LE(RATE, 24); header.writeUInt32LE(RATE * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
header.write('data', 36); header.writeUInt32LE(data.length, 40);
const out = resolve(dirname(fileURLToPath(import.meta.url)), '../public/audio/campanita.wav');
writeFileSync(out, Buffer.concat([header, data]));
console.log('Campanita generada en', out);
