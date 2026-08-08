const COINS_KEY = 'zooesponji_coins';

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
    // Persistence failed (e.g. storage blocked on file:// origins); still
    // return the in-memory value so the UI reflects this session's total.
  }
  return next;
}

if (typeof module !== 'undefined') {
  module.exports = { COINS_KEY, getCoins, addCoin };
}
