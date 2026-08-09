const test = require('node:test');
const assert = require('node:assert');
const { getReaction, ANIMAL_COINS } = require('../js/data.js');

test('león come carne', () => {
  assert.strictEqual(getReaction('leon', 'carne'), 'come');
});

test('león come conejo', () => {
  assert.strictEqual(getReaction('leon', 'conejo'), 'come');
});

test('león rechaza piedra', () => {
  assert.strictEqual(getReaction('leon', 'piedra'), 'rechaza');
});

test('león rechaza zanahoria', () => {
  assert.strictEqual(getReaction('leon', 'zanahoria'), 'rechaza');
});

test('cabra rechaza carne', () => {
  assert.strictEqual(getReaction('cabra', 'carne'), 'rechaza');
});

test('cabra reacción especial con conejo', () => {
  assert.strictEqual(getReaction('cabra', 'conejo'), 'especial');
});

test('cabra come piedra', () => {
  assert.strictEqual(getReaction('cabra', 'piedra'), 'come');
});

test('cabra come zanahoria', () => {
  assert.strictEqual(getReaction('cabra', 'zanahoria'), 'come');
});

test('pantera come carne', () => {
  assert.strictEqual(getReaction('pantera', 'carne'), 'come');
});

test('pantera come conejo', () => {
  assert.strictEqual(getReaction('pantera', 'conejo'), 'come');
});

test('pantera rechaza piedra', () => {
  assert.strictEqual(getReaction('pantera', 'piedra'), 'rechaza');
});

test('pantera rechaza zanahoria', () => {
  assert.strictEqual(getReaction('pantera', 'zanahoria'), 'rechaza');
});

test('panda rechaza carne', () => {
  assert.strictEqual(getReaction('panda', 'carne'), 'rechaza');
});

test('panda reacción especial con conejo', () => {
  assert.strictEqual(getReaction('panda', 'conejo'), 'especial');
});

test('panda rechaza piedra', () => {
  assert.strictEqual(getReaction('panda', 'piedra'), 'rechaza');
});

test('panda come zanahoria', () => {
  assert.strictEqual(getReaction('panda', 'zanahoria'), 'come');
});

test('combinación no definida lanza error', () => {
  assert.throws(() => getReaction('leon', 'pizza'));
});

test('león gana 1 moneda por come', () => {
  assert.strictEqual(ANIMAL_COINS.leon.come, 1);
});

test('pantera gana 2 monedas por come', () => {
  assert.strictEqual(ANIMAL_COINS.pantera.come, 2);
});

test('panda gana 2 monedas por come y 4 por especial', () => {
  assert.strictEqual(ANIMAL_COINS.panda.come, 2);
  assert.strictEqual(ANIMAL_COINS.panda.especial, 4);
});