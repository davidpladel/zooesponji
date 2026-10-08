// Uso: node tools/matomo/resumen.mjs   (después de pull.mjs)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA } from './config.mjs';
import { MIN_SAMPLE, byAction, events, meanText, medianText, share, table, toRows, truncated } from './lib.mjs';

const file = join(DATA, 'events.json');
if (!existsSync(file)) {
  console.error('No hay datos. Lanza antes: node tools/matomo/pull.mjs');
  process.exit(1);
}
const meta = existsSync(join(DATA, 'meta.json')) ? JSON.parse(readFileSync(join(DATA, 'meta.json'), 'utf8')) : {};
const report = JSON.parse(readFileSync(file, 'utf8'));
const rows = toRows(report);
const index = byAction(rows);
const n = (action, name) => events(index, action, name);
const of = (action) => [...(index.get(action)?.values() ?? [])];
const top = (list, key, limit = 20) => [...list].sort((a, b) => b[key] - a[key]).slice(0, limit);
const FEED = ['come', 'rechaza', 'especial'];
const feedsOf = (prefix) => FEED.reduce((sum, action) => sum + of(action).filter((r) => r.name.startsWith(`${prefix}/`)).reduce((s, r) => s + r.events, 0), 0);
const counts = (action) => new Map(of(action).map((r) => [r.name, r.events]));
const median = (action, order) => medianText(counts(action), order);
// La media de Matomo es sobre sus eventos: esa es su muestra.
const avg = (row) => (row ? meanText(row.avg, row.events) : '—');

const playerDays = n('dia');
const news = n('nuevo');
const sessions = n('inicio');
const allEvents = rows.reduce((sum, r) => sum + r.events, 0);
const lost = of('perdidos').reduce((sum, r) => sum + r.sum, 0);
const out = [];

out.push(`# Resumen de estadísticas — ${meta.date ?? 'periodo desconocido'}`, '');
if (truncated(report)) {
  out.push('> **AVISO: el informe de Matomo está incompleto** (trae una fila «Otros»/«Others» que agrupa lo que pasó del límite). Las tablas largas pueden no mostrar todas las filas.', '');
}
out.push(`Las cifras de alcance son «jugadores por día»: un jugador que juega tres días cuenta tres veces. Con menos de ${MIN_SAMPLE} en el denominador se marca «insuficiente» y no se concluye nada. En la retención, las cohortes de quienes empezaron a jugar antes de esta versión no tienen fila de «nuevos», y las más recientes salen bajas solo porque aún no han pasado los días suficientes.`, '');

out.push('## Muestra', '', table(['Dato', 'Valor'], [
  ['Jugadores nuevos', news],
  ['Jugadores por día (suma)', playerDays],
  ['Sesiones', sessions],
  ['Comidas por sesión (media)', meanText(FEED.reduce((s, a) => s + n(a), 0) / sessions, sessions)],
  ['Comidas por rato de juego (mediana, tramo)', median('rato-comidas', ['cero', '1-2', '3-5', '6-10', '11-20', '21+'])],
  ['Animales distintos por rato (mediana, tramo)', median('rato-animales', ['cero', '1', '2-3', '4-6', '7+'])],
  ['Duración del rato (mediana, tramo)', median('fin', ['<1m', '1-3m', '3-10m', '10-30m', '30m+'])],
  ['Eventos perdidos (sin red o caducados)', `${lost} frente a ${allEvents} recibidos`],
]), '');

out.push('## Versiones del juego', '', table(
  ['Versión', 'Sesiones', 'Jugadores por día'],
  [...new Set([...of('inicio'), ...of('dia')].map((r) => r.name))].sort().map((v) => [v || '(sin versión)', n('inicio', v), n('dia', v)]),
), '');

out.push('## Animales: quién gusta más entre quienes lo tienen', '', table(
  ['Animal', 'Le dan de comer (de quienes lo tienen)', 'Comidas', 'Ventanas', 'Ventanas vacías'],
  top(of('tiene-animal').map((r) => ({ name: r.name, owners: r.events, fed: n('dia-animal', r.name), feeds: feedsOf(r.name) })), 'fed', 80)
    .map((a) => [a.name, share(a.fed, a.owners), a.feeds, n('ventana', a.name), n('ventana-vacia', a.name)]),
), '');

out.push('## Comidas: cuáles se usan más', '', table(
  ['Comida', 'La usan (de los jugadores del día)'],
  top(of('dia-comida'), 'events').map((r) => [r.name, share(r.events, playerDays)]),
), '');

out.push('## Combinaciones animal y comida más repetidas', '', table(
  ['Reacción', 'Animal / comida', 'Veces'],
  top(FEED.flatMap((action) => of(action).map((r) => ({ action, ...r }))), 'events', 25).map((r) => [r.action, r.name, r.events]),
), '');

const pens = [...new Set([...of('tiene-recinto'), ...of('cerca-cerrado'), ...of('toca-cerrado')].map((r) => r.name))];
out.push('## Recintos: visitados, alimentados y deseados', '', table(
  ['Recinto', 'Lo visitan (de quienes lo tienen)', 'Comidas', 'Se acercan estando cerrado', 'Lo tocan estando cerrado', 'Intentos sin monedas'],
  pens.map((pen) => [pen, share(n('dia-recinto', pen), n('tiene-recinto', pen)), feedsOf(pen), n('cerca-cerrado', pen), n('toca-cerrado', pen), n('sin-monedas', pen) + n('sin-monedas', `extra-${pen}`)]),
), '');

out.push('## Libro', '', table(['Dato', 'Valor'], [
  ['Abren el libro (de los jugadores del día)', share(n('dia-pantalla', 'libro'), playerDays)],
  ['Aperturas', n('abre')],
  ['Páginas leídas por apertura (mediana, tramo)', median('libro-fin', ['cero', '1', '2-3', '4-7', '8+'])],
]), '', table(
  ['Página', 'Leída (veces)', 'Segundos (media)', 'Hojeada', 'Vista bloqueada'],
  top([...new Set([...of('lee'), ...of('hojea'), ...of('bloqueada')].map((r) => r.name))].map((name) => ({ name, events: n('lee', name), seen: n('lee', name) + n('hojea', name) + n('bloqueada', name) })), 'seen', 80)
    .map((p) => [p.name, p.events, avg(index.get('lee')?.get(p.name)), n('hojea', p.name), n('bloqueada', p.name)]),
), '');

const drops = FEED.reduce((s, a) => s + n(a), 0) + n('fuera');
out.push('## Tropiezos', '', table(['Dato', 'Valor'], [
  ['Comidas soltadas fuera del animal', share(n('fuera'), drops)],
  ['Ventanas de comer cerradas sin dar nada', share(n('ventana-vacia'), n('ventana'))],
  ['Visitas a la tienda sin comprar', share(n('tienda-sin-compra'), n('tienda-fin'))],
  ['Veces que se pisó la tienda cerrada', n('tienda-cerrada')],
]), '');

const STEPS = ['primer-paso', 'primer-toque-animal', 'primera-ventana', 'primera-comida', 'tienda-abierta', 'primera-tienda', 'primera-compra', 'primer-libro', 'libro-completo', 'zoo-completo'];
out.push('## Embudo de inicio', '', table(
  ['Paso', 'Llegan (de los nuevos)', 'Minutos de juego hasta llegar (media)'],
  STEPS.map((step) => [step, share(n(step), news), avg(index.get(step)?.values().next().value)]),
), '');

out.push('## Retención por semana de inicio', '', table(
  ['Semana', 'Nuevos', 'Vuelven día 1+', 'Vuelven día 7+', 'Vuelven día 30+'],
  of('nuevo').sort((a, b) => a.name.localeCompare(b.name)).map((r) => [r.name, r.events, share(n('vuelve-d1', r.name), r.events), share(n('vuelve-d7', r.name), r.events), share(n('vuelve-d30', r.name), r.events)]),
), '');

writeFileSync(join(DATA, 'resumen.md'), `${out.join('\n')}\n`);
console.log('Resumen escrito en tools/matomo/data/resumen.md');
