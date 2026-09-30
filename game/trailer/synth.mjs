// Música (120 BPM) + efectos del tráiler, sintetizados. Salida: out/audio/music.wav
import fs from 'node:fs';
export const POPS = [0.4, 3.1, 6.6, 10.1, 13.6, 17.1, 20.6, 24.1, 26.6, 29.1, 31.6, 35.3, 35.6];
const SR = 44100, DUR = 43, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);
const add = (t, v, pan = 0) => { const i = Math.round(t * SR); if (i >= 0 && i < N) { L[i] += v * (1 - pan) ; R[i] += v * (1 + pan); } };
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

function tone(t0, dur, freq, vol, type = 'sq', pan = 0, decay = 6) {
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR, ph = (freq * t) % 1;
    let s = type === 'sq' ? (ph < 0.5 ? 1 : -1) * 0.6 : type === 'tri' ? 4 * Math.abs(ph - 0.5) - 1 : type === 'saw' ? 2 * ph - 1 : Math.sin(2 * Math.PI * ph);
    const env = Math.min(1, t * 200) * Math.exp(-t * decay) * Math.min(1, (dur - t) * 60);
    add(t0 + t, s * env * vol, pan);
  }
}
function kick(t0, vol = 0.9) { let p = 0; for (let i = 0; i < 0.3 * SR; i++) { const t = i / SR; p += (50 + 120 * Math.exp(-t * 30)) / SR; add(t0 + t, Math.sin(2 * Math.PI * p) * Math.exp(-t * 9) * vol); } }
function noise(t0, dur, vol, decay, pan = 0, lp = 1) { let y = 0; for (let i = 0; i < dur * SR; i++) { const t = i / SR; y += (rnd() - y) * lp; add(t0 + t, y * Math.exp(-t * decay) * vol, pan); } }
const snare = (t, v = 0.35) => { noise(t, 0.2, v, 18, 0, 0.7); tone(t, 0.1, 190, v * 0.6, 'sin', 0, 20); };
const hat = (t) => noise(t, 0.04, 0.08, 80, 0.3, 1);
function pop(t0) { let p = 0; for (let i = 0; i < 0.12 * SR; i++) { const t = i / SR; p += (300 + 1800 * t / 0.12) / SR; add(t0 + t, Math.sin(2 * Math.PI * p) * Math.exp(-t * 25) * 0.5); } }
function whoosh(t0, dur = 0.6) { let y = 0; for (let i = 0; i < dur * SR; i++) { const t = i / SR, k = Math.sin(Math.PI * t / dur); y += (rnd() - y) * (0.05 + 0.4 * k); add(t0 + t, y * k * 0.5, Math.cos(Math.PI * t / dur) * 0.6); } }
function roar(t0, dur = 1.8, vol = 0.8) {
  let p = 0, y = 0;
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR, k = t / dur;
    const f = 90 + 40 * Math.sin(Math.PI * k) + 6 * Math.sin(2 * Math.PI * 23 * t);
    p += f / SR; y += (rnd() - y) * 0.25;
    let s = (2 * (p % 1) - 1) * 0.7 + y * 1.4 + Math.sin(2 * Math.PI * p * 2) * 0.4;
    s = Math.tanh(s * 3);
    const env = Math.min(1, t * 8) * Math.pow(1 - k, 1.3);
    add(t0 + t, s * env * vol * 0.6);
  }
}

const B = 0.5; // un pulso
function boom(t0, vol = 0.9) { let p = 0; for (let i = 0; i < 1.2 * SR; i++) { const t = i / SR; p += (45 + 60 * Math.exp(-t * 12)) / SR; add(t0 + t, Math.sin(2 * Math.PI * p) * Math.exp(-t * 3.5) * vol); } }
const chords = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]; // C G Am F
const arp = [0, 1, 2, 1, 2, 0, 1, 2];
// Intro: tres golpes de timbal con una nota que sube
[[0.2, 48], [1.2, 50], [2.2, 52]].forEach(([t, n]) => { boom(t); tone(t, 0.9, hz(n + 12), 0.14, 'tri', 0, 2.5); });
tone(2.7, 0.3, hz(67), 0.12, 'sq', 0, 4);
const END = 41;
for (let t = 3; t < END; t += B) {
  const beat = Math.round((t - 3) / B), bar = Math.floor(beat / 4), ch = chords[bar % 4];
  const build = t >= 29 && t < 31.5, finale = t >= 31.5;
  if (!build || beat % 2 === 0) kick(t, finale ? 1 : 0.85);
  if (beat % 2 === 1 && !build) snare(t);
  hat(t + B / 2); if (finale) hat(t);
  if (beat % 4 === 0) tone(t, 2 * B * 1.9, hz(ch[0] - 24), 0.35, 'tri', 0, 1.5);
  if (t >= 6.5) for (let e = 0; e < 2; e++) {
    const n = ch[arp[(beat * 2 + e) % 8]] + 12 + (finale ? 12 : 0);
    tone(t + e * B / 2, B / 2, hz(n), finale ? 0.12 : 0.09, 'sq', (e ? 0.4 : -0.4), 9);
  }
  if (finale && beat % 4 === 0) for (const n of ch) tone(t, 4 * B, hz(n), 0.07, 'saw', 0, 1);
}
for (let t = 29; t < 31.5; t += 0.125) snare(t, 0.1 + 0.2 * (t - 29) / 2.5); // redoble
// ¡Ta-dá! cuando sale Google Play, y acorde final limpio
[72, 76, 79, 84].forEach((n, i) => tone(38.5 + i * 0.12, 0.6, hz(n), 0.14, 'sq', 0, 4));
kick(END); boom(END, 0.7);
for (const n of [48, 60, 64, 67, 72, 76]) tone(END, 2, hz(n), 0.1, 'tri', 0, 1.3);
for (const p of POPS) pop(p);

let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(L[i] / peak * 0.85 * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(R[i] / peak * 0.85 * 32767), 46 + i * 4); }
fs.writeFileSync(new URL('./out/audio/music.wav', import.meta.url), buf);
console.log('ok peak', peak.toFixed(2));
