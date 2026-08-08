const COINS_KEY = 'zooesponji_coins';

function getCoins(storage) {
  const raw = storage.getItem(COINS_KEY);
  const value = parseInt(raw, 10);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function addCoin(storage) {
  const next = getCoins(storage) + 1;
  storage.setItem(COINS_KEY, String(next));
  return next;
}

if (typeof module !== 'undefined') {
  module.exports = { COINS_KEY, getCoins, addCoin };
}
