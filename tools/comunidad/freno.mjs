// node tools/comunidad/freno.mjs
// Comprueba que el freno de nginx sigue puesto: manda 25 votos a una votación que no existe (no suman nada)
// y espera que los últimos reciban 429. Lanzarlo después de actualizar Hestia o Linux.
const URL_VOTO = 'https://api.zooesponji.com/voto.php';

const codigos = [];
for (let i = 0; i < 25; i++) {
  const respuesta = await fetch(URL_VOTO, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ votacion: 'no-existe', opcion: 'x' }),
  });
  codigos.push(respuesta.status);
}
console.log(codigos.join(' '));
if (!codigos.includes(429)) {
  console.error('✗ El freno de nginx NO está puesto. Mira «Freno de votos» en server/README.md y vuelve a ponerlo.');
  process.exit(1);
}
if (codigos.some((c) => c !== 409 && c !== 429)) {
  console.error('✗ El servidor responde algo raro (ni 409 ni 429). Mira el registro de errores en Hestia.');
  process.exit(1);
}
console.log('✓ El freno de nginx sigue puesto.');
