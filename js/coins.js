const COINS_KEY = 'zooesponji_coins';
const PURCHASES_KEY = 'zooesponji_purchases';

function getCoins(storage) {
  let raw;
  try {
    raw = storage.getItem(COINS_KEY);
  } catch (err) {
    return 0;
  }
  const value = parseInt(raw, 10);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function addCoin(storage, amount = 1) {
  const next = getCoins(storage) + amount;
  try {
    storage.setItem(COINS_KEY, String(next));
  } catch (err) {
  }
  return next;
}

function spendCoins(storage, amount) {
  const current = getCoins(storage);
  if (current < amount) {
    throw new Error(`Monedas insuficientes: tienes ${current}, necesitas ${amount}`);
  }
  const next = current - amount;
  try {
    storage.setItem(COINS_KEY, String(next));
  } catch (err) {
  }
  return next;
}

function getPurchases(storage) {
  try {
    const raw = storage.getItem(PURCHASES_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
  }
  return {};
}

function savePurchase(storage, itemId) {
  const purchases = getPurchases(storage);
  purchases[itemId] = true;
  try {
    storage.setItem(PURCHASES_KEY, JSON.stringify(purchases));
  } catch (err) {
  }
  return purchases;
}

if (typeof module !== 'undefined') {
  module.exports = { COINS_KEY, PURCHASES_KEY, getCoins, addCoin, spendCoins, getPurchases, savePurchase };
}