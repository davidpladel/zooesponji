import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { validar } from './lib.mjs';

const ejemplo = () => JSON.parse(readFileSync(new URL('../../server/app/datos/comunidad.example.json', import.meta.url), 'utf8'));
const con = (cambiar) => {
  const datos = ejemplo();
  cambiar(datos);
  return validar(datos);
};

test('el ejemplo del servidor es válido', () => {
  assert.deepEqual(validar(ejemplo()), []);
});

test('sin votación y sin muro es válido', () => {
  assert.deepEqual(validar({ votacion: null, muro: [] }), []);
});

test('cada error se nombra con su sitio', () => {
  assert.deepEqual(validar('hola'), ['El archivo no es un objeto.']);
  assert.match(con((d) => { d.votacion.id = 'Nov 1'; })[0], /votacion\.id/);
  assert.match(con((d) => { d.votacion.abre = '2026-02-31'; })[0], /votacion\.abre/);
  assert.match(con((d) => { d.votacion.cierra = '2026-10-01'; })[0], /cierra/);
  assert.match(con((d) => { d.votacion.opciones.pop(); })[0], /entre 2 y 4/);
  assert.match(con((d) => { d.votacion.opciones[1].id = 'delfines'; })[0], /repetid/);
  assert.match(con((d) => { d.votacion.opciones[0].dibujo = '../a.png'; })[0], /opciones\[0\]\.dibujo/);
  assert.match(con((d) => { delete d.votacion.opciones[0].titulo.en; })[0], /opciones\[0\]\.titulo\.en/);
  assert.match(con((d) => { d.votacion.opciones[0].titulo.es = 'a'.repeat(31); })[0], /30/);
  assert.match(con((d) => { d.votacion.ganadora = 'leones'; })[0], /ganadora/);
  assert.match(con((d) => { d.muro[0].estado = 'pronto'; })[0], /muro\[0\]\.estado/);
  assert.match(con((d) => { d.muro[0].recinto = 'el pinguino'; })[0], /muro\[0\]\.recinto/);
  assert.match(con((d) => { d.muro = Array(31).fill(d.muro[0]); })[0], /30/);
});

test('avisa de un nombre que el juego recortará', () => {
  assert.match(con((d) => { d.votacion.opciones[0].ideaDe = 'Maximiliano Alejandro'; })[0], /15/);
});

test('junta varios errores', () => {
  const errores = con((d) => { d.votacion.id = 'X'; d.muro[0].estado = 'no'; });
  assert.equal(errores.length, 2);
});
