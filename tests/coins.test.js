const test = require('node:test');
const assert = require('node:assert');
const { COINS_KEY, getCoins, addCoin } = require('../js/coins.js');

function createFakeStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
  };
}

test('getCoins con storage vacío devuelve 0', () => {
  const storage = createFakeStorage();
  assert.strictEqual(getCoins(storage), 0);
});

test('addCoin incrementa desde 0 y persiste', () => {
  const storage = createFakeStorage();
  assert.strictEqual(addCoin(storage), 1);
  assert.strictEqual(addCoin(storage), 2);
  assert.strictEqual(getCoins(storage), 2);
});

test('getCoins con valor corrupto en storage devuelve 0', () => {
  const storage = createFakeStorage();
  storage.setItem(COINS_KEY, 'no-es-numero');
  assert.strictEqual(getCoins(storage), 0);
});

test('getCoins con valor negativo devuelve 0', () => {
  const storage = createFakeStorage();
  storage.setItem(COINS_KEY, '-5');
  assert.strictEqual(getCoins(storage), 0);
});

test('addCoin con amount suma más de una moneda', () => {
  const storage = createFakeStorage();
  assert.strictEqual(addCoin(storage, 2), 2);
  assert.strictEqual(addCoin(storage), 3);
  assert.strictEqual(getCoins(storage), 3);
});
