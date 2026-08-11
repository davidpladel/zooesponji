var shopOverlay = null;
var celebrationOverlay = null;
var unlockOverlay = null;
var shopBtn = null;
var purchases = {};

function buildShopUI() {
  shopOverlay = document.createElement('div');
  shopOverlay.id = 'shop-overlay';
  shopOverlay.className = 'shop-overlay';
  shopOverlay.style.display = 'none';
  document.body.appendChild(shopOverlay);

  celebrationOverlay = document.createElement('div');
  celebrationOverlay.id = 'celebration-overlay';
  celebrationOverlay.className = 'celebration-overlay';
  celebrationOverlay.style.display = 'none';
  document.body.appendChild(celebrationOverlay);

  unlockOverlay = document.createElement('div');
  unlockOverlay.id = 'unlock-overlay';
  unlockOverlay.className = 'unlock-overlay-engine';
  unlockOverlay.style.display = 'none';
  document.body.appendChild(unlockOverlay);

  shopBtn = document.createElement('button');
  shopBtn.id = 'shop-hud-btn';
  shopBtn.className = 'shop-hud-btn';
  shopBtn.textContent = '🏪 Tienda';
  shopBtn.style.display = 'none';
  shopBtn.addEventListener('click', showShopOverlay);
  document.body.appendChild(shopBtn);
}

function updatePurchases() {
  purchases = getPurchases(storage);
}

function isShopUnlocked() {
  return !!purchases.shop;
}

function isAnimalUnlocked(animalId) {
  if (animalId === 'leon' || animalId === 'cabra') return true;
  return !!purchases[animalId];
}

function checkShopUnlock() {
  if (!purchases.shop && coins >= SHOP_UNLOCK_COST) {
    showUnlockPrompt();
  }
  if (purchases.shop) {
    shopBtn.style.display = 'block';
  }
}

function showUnlockPrompt() {
  unlockOverlay.innerHTML = '<div class="unlock-card">'
    + '<div class="unlock-icon">🔓</div>'
    + '<h2>¡Enhorabuena!</h2>'
    + '<p>Has conseguido <strong>' + SHOP_UNLOCK_COST + ' monedas</strong>. ¡Ya puedes desbloquear la tienda del zoo!</p>'
    + '<button class="unlock-btn" id="unlock-yes">🪙 Desbloquear tienda (' + SHOP_UNLOCK_COST + ' monedas)</button>'
    + '<button class="unlock-btn-later" id="unlock-no">Ahora no</button>'
    + '</div>';
  unlockOverlay.style.display = 'flex';

  document.getElementById('unlock-yes').addEventListener('click', function () {
    try { coins = spendCoins(storage, SHOP_UNLOCK_COST); } catch (e) { return; }
    savePurchase(storage, 'shop');
    updatePurchases();
    updateCoinDisplay();
    unlockOverlay.style.display = 'none';
    shopBtn.style.display = 'block';
    playSpecialSound();
    showCelebration('🏪', '¡Tienda desbloqueada!', 'Ya puedes entrar y comprar nuevas zonas.');
  });

  document.getElementById('unlock-no').addEventListener('click', function () {
    unlockOverlay.style.display = 'none';
  });
}

function showShopOverlay() {
  var itemsHtml = SHOP_ITEMS.map(function (item) {
    var owned = purchases[item.id];
    var hasCost = typeof item.cost === 'number';
    var canAfford = hasCost && coins >= item.cost;
    var actionHtml = '';
    if (owned) {
      actionHtml = '<span class="shop-state-owned">✅ Comprado</span>';
    } else if (!hasCost) {
      actionHtml = '<span class="shop-state-locked">🔒 Próximamente</span>';
    } else if (canAfford) {
      actionHtml = '<button class="shop-buy-btn" data-id="' + item.id + '" data-cost="' + item.cost + '">🪙 ' + item.cost + ' Comprar</button>';
    } else {
      actionHtml = '<button class="shop-buy-btn shop-buy-nocoins" data-id="' + item.id + '" data-cost="' + item.cost + '">🪙 ' + item.cost + '</button>';
    }
    return '<div class="shop-item-row ' + (owned ? 'owned' : '') + '">'
      + '<span class="shop-item-img">' + item.image + '</span>'
      + '<div class="shop-item-text"><strong>' + item.label + '</strong><br><small>' + item.desc + '</small></div>'
      + '<div class="shop-item-action">' + actionHtml + '</div>'
      + '</div>';
  }).join('');

  shopOverlay.innerHTML = '<div class="shop-panel">'
    + '<div class="shop-header">🏪 Tienda del Zoo <button class="shop-close" id="shop-close">✕</button></div>'
    + '<div class="shop-coin">🪙 ' + coins + ' monedas</div>'
    + '<div class="shop-list">' + itemsHtml + '</div>'
    + '</div>';
  shopOverlay.style.display = 'flex';

  document.getElementById('shop-close').addEventListener('click', function () {
    shopOverlay.style.display = 'none';
  });

  shopOverlay.querySelectorAll('.shop-buy-btn').forEach(function (btn) {
    if (btn.classList.contains('shop-buy-nocoins')) {
      btn.addEventListener('click', function () {
        showShopToast('😞 No tienes suficientes monedas');
      });
    } else {
      btn.addEventListener('click', function () {
        var id = btn.dataset.id;
        var cost = parseInt(btn.dataset.cost, 10);
        try { coins = spendCoins(storage, cost); } catch (e) { return; }
        savePurchase(storage, id);
        updatePurchases();
        updateCoinDisplay();
        shopOverlay.style.display = 'none';
        playSpecialSound();
        updateAnimalAccess();
        var item = SHOP_ITEMS.find(function (it) { return it.id === id; });
        showCelebration('🎉', item.label + ' desbloqueada!', 'Vuelve al zoo para jugar con tu nueva zona.');
      });
    }
  });
}

function showShopToast(msg) {
  var t = document.createElement('div');
  t.className = 'shop-toast-engine';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function () { t.classList.add('fade'); }, 1800);
  setTimeout(function () { if (t.parentNode) t.remove(); }, 2200);
}

function showCelebration(icon, title, msg) {
  celebrationOverlay.innerHTML = '<div class="celebration-card-engine">'
    + '<div class="celebration-icon">' + icon + '</div>'
    + '<h2>' + title + '</h2>'
    + '<p>' + msg + '</p>'
    + '<button class="celebration-ok" id="celeb-ok">¡Genial!</button>'
    + '</div>';
  celebrationOverlay.style.display = 'flex';
  document.getElementById('celeb-ok').addEventListener('click', function () {
    celebrationOverlay.style.display = 'none';
  });
}

function showLockedToast(animalId) {
  var label = ANIMAL_LABELS[animalId] || animalId;
  var msg = purchases.shop ? '🪙 Cómprala en la tienda' : '🔒 Gana monedas para desbloquear la tienda primero';
  showShopToast(label + ': ' + msg);
}

function updateAnimalAccess() {
  for (var i = 0; i < animals.length; i++) {
    var a = animals[i];
    a.locked = !isAnimalUnlocked(a.animalId);
  }
}