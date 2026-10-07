import assert from 'node:assert/strict';
import { test } from 'node:test';
import { byAction, events, meanText, medianBucket, medianText, parseEnv, redact, share, table, toRows, truncated } from './lib.mjs';

test('parseEnv lee claves, ignora comentarios y quita comillas', () => {
  assert.deepEqual(parseEnv('# nota\nMATOMO_URL=https://stats.example.com/\nMATOMO_SITE="7"\n\nMATOMO_TOKEN=abc=def\n'), {
    MATOMO_URL: 'https://stats.example.com/',
    MATOMO_SITE: '7',
    MATOMO_TOKEN: 'abc=def',
  });
});

test('toRows usa las columnas de acción y nombre si vienen', () => {
  const rows = toRows([{ label: 'x', Events_EventAction: 'come', Events_EventName: 'cabra/gordi/pan', nb_events: 4, nb_visits: 3, sum_event_value: 4, avg_event_value: 1, min_event_value: 1, max_event_value: 1 }]);
  assert.deepEqual(rows, [{ action: 'come', name: 'cabra/gordi/pan', events: 4, visits: 3, sum: 4, avg: 1, min: 1, max: 1 }]);
});

test('toRows, sin esas columnas, parte la etiqueta «acción - nombre»', () => {
  const rows = toRows([{ label: 'ventana-fin - cabra/gordi', nb_events: '2' }, { label: 'primer-paso', nb_events: 5 }]);
  assert.equal(rows[0].action, 'ventana-fin');
  assert.equal(rows[0].name, 'cabra/gordi');
  assert.equal(rows[0].events, 2);
  assert.equal(rows[1].action, 'primer-paso');
  assert.equal(rows[1].name, '');
});

test('toRows aguanta una respuesta que no es una lista', () => {
  assert.deepEqual(toRows({ result: 'error' }), []);
});

test('events suma una acción entera o un nombre concreto', () => {
  const index = byAction(toRows([{ label: 'come - a', nb_events: 3 }, { label: 'come - b', nb_events: 2 }]));
  assert.equal(events(index, 'come'), 5);
  assert.equal(events(index, 'come', 'a'), 3);
  assert.equal(events(index, 'come', 'z'), 0);
  assert.equal(events(index, 'nada'), 0);
});

test('share no concluye con muestra pequeña', () => {
  assert.equal(share(12, 40), '30 % (12 de 40)');
  assert.equal(share(3, 10), 'insuficiente (3 de 10)');
  assert.equal(share(0, 0), 'insuficiente (0 de 0)');
});

test('medianBucket da el tramo donde cae la mitad', () => {
  const order = ['0', '1-2', '3-5', '6-10'];
  assert.equal(medianBucket(new Map([['0', 10], ['1-2', 30], ['3-5', 50], ['6-10', 10]]), order), '3-5');
  assert.equal(medianBucket(new Map([['0', 60], ['1-2', 40]]), order), '0');
  assert.equal(medianBucket(new Map(), order), null);
});

test('table escribe una tabla de Markdown', () => {
  assert.equal(table(['a', 'b'], [['1', '2']]), '| a | b |\n|---|---|\n| 1 | 2 |');
});

test('share acepta justo 30 y marca 29', () => {
  assert.equal(share(30, 30), '100 % (30 de 30)');
  assert.equal(share(29, 29), 'insuficiente (29 de 29)');
});

test('medianText da tramo y muestra, insuficiente o sin datos', () => {
  const order = ['0', '1-2', '3-5'];
  assert.equal(medianText(new Map([['0', 10], ['1-2', 30], ['3-5', 80]]), order), '3-5 (n=120)');
  assert.equal(medianText(new Map([['0', 5], ['1-2', 7]]), order), 'insuficiente (n=12)');
  assert.equal(medianText(new Map(), order), 'sin datos');
  assert.equal(medianText(new Map([['1-2', 30]]), order), '1-2 (n=30)');
  assert.equal(medianText(new Map([['1-2', 29]]), order), 'insuficiente (n=29)');
});

test('meanText da la media con su muestra', () => {
  assert.equal(meanText(4.24, 85), '4.2 (n=85)');
  assert.equal(meanText(4.24, 7), 'insuficiente (n=7)');
  assert.equal(meanText(0, 0), '—');
  assert.equal(meanText(4.24, 30), '4.2 (n=30)');
  assert.equal(meanText(4.256, 85, 30, 2), '4.26 (n=85)');
});

test('truncated detecta la fila agrupada de Matomo', () => {
  assert.equal(truncated([{ label: 'a' }, { label: 'Others' }]), true);
  assert.equal(truncated([{ label: 'otros' }]), true);
  assert.equal(truncated([{ label: 'Otros' }]), true);
  assert.equal(truncated([{ label: '-1' }]), true);
  assert.equal(truncated([{ label: 'come - a' }]), false);
  assert.equal(truncated({ result: 'error' }), false);
});

test('redact enmascara secretos y su forma codificada', () => {
  assert.equal(redact('fallo con tok123 y https://h.example/x', ['tok123', 'https://h.example']), 'fallo con *** y ***/x');
  assert.equal(redact('a%20b y a b', ['a b']), '*** y ***');
  assert.equal(redact('nada', ['', undefined]), 'nada');
});
