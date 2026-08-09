const test = require('node:test');
const assert = require('node:assert');
const { COINS_KEY, PURCHASES_KEY, getCoins, addCoin, spendCoins, getPurchases, savePurchase } = require('../js/coins.js');

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

test('spendCoins descuenta monedas y persiste', () => {
  const storage = createFakeStorage();
  addCoin(storage, 10);
  assert.strictEqual(spendCoins(storage, 3), 7);
  assert.strictEqual(getCoins(storage), 7);
});

test('spendCoins lanza error si no hay suficientes monedas', () => {
  const storage = createFakeStorage();
  addCoin(storage, 2);
  assert.throws(() => spendCoins(storage, 5));
});

test('getPurchases con storage vacío devuelve objeto vacío', () => {
  const storage = createFakeStorage();
  assert.deepStrictEqual(getPurchases(storage), {});
});

test('savePurchase guarda y devuelve purchases', () => {
  const storage = createFakeStorage();
  const result = savePurchase(storage, 'shop');
  assert.strictEqual(result.shop, true);
  assert.strictEqual(getPurchases(storage).shop, true);
});

test('savePurchase acumula varias compras', () => {
  const storage = createFakeStorage();
  savePurchase(storage, 'shop');
  savePurchase(storage, 'pantera');
  const p = getPurchases(storage);
  assert.strictEqual(p.shop, true);
  assert.strictEqual(p.pantera, true);
  assert.strictEqual(p.panda, undefined);
});

test('getPurchases con JSON corrupto devuelve objeto vacío', () => {
  const storage = createFakeStorage();
  storage.setItem(PURCHASES_KEY, 'esto-no-es-json');
  assert.deepStrictEqual(getPurchases(storage), {});
});