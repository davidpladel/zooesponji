const test = require('node:test');
const assert = require('node:assert');
const { getReaction } = require('../js/data.js');

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

test('combinación no definida lanza error', () => {
  assert.throws(() => getReaction('leon', 'pizza'));
});
