document.addEventListener('DOMContentLoaded', function () {
  var app = document.getElementById('app');

  var storage = window.localStorage;
  var versionKey = 'zooesponji_version';
  var storedVersion = storage.getItem(versionKey);
  if (storedVersion !== APP_VERSION) {
    try { storage.removeItem('zooesponji_coins'); } catch (e) {}
    try { storage.setItem(versionKey, APP_VERSION); } catch (e) {}
  }

  var footerEl = document.querySelector('.site-footer');
  if (footerEl) {
    var versionText = '1.0.0';
    if (typeof APP_VERSION !== 'undefined') {
      versionText = APP_VERSION;
    }
    var currentHtml = footerEl.innerHTML;
    if (currentHtml.indexOf('Versión') === -1) {
      footerEl.innerHTML = currentHtml + ' · Versión ' + versionText;
    }
  }

  var dismissedUnlockPrompt = false;

  function showZooScreen(options) {
    var opts = options || {};
    var storage = window.localStorage;
    var coins = getCoins(storage);
    var purchases = getPurchases(storage);

    renderZooScreen(app, coins, purchases, {
      onSelectAnimal: showFeedScreen,
      onEnterShop: showShopScreen,
      onUnlockShop: function () {
        try {
          spendCoins(storage, SHOP_UNLOCK_COST);
        } catch (err) {
          showZooScreen();
          return;
        }
        savePurchase(storage, 'shop');
        playSpecialSound();
        showCelebration(app, '🏪', '¡Tienda desbloqueada!', 'Ya puedes entrar y comprar nuevas zonas del zoo.', showZooScreen);
      },
      onDismissUnlock: function () {
        dismissedUnlockPrompt = true;
        showZooScreen({ hideUnlockPrompt: true });
      },
      onLockClick: function (lockId) {
        showLockToast(app, lockId);
      },
    }, { hideUnlockPrompt: opts.hideUnlockPrompt || dismissedUnlockPrompt });
  }

  function showShopScreen() {
    var storage = window.localStorage;
    var coins = getCoins(storage);
    var purchases = getPurchases(storage);

    renderShopScreen(app, coins, purchases, {
      onBack: showZooScreen,
      onPurchase: function (itemId, cost) {
        var currentCoins = getCoins(storage);
        if (currentCoins < cost) {
          return;
        }
        try {
          spendCoins(storage, cost);
        } catch (err) {
          showShopScreen();
          return;
        }
        savePurchase(storage, itemId);
        playSpecialSound();

        var item = SHOP_ITEMS.find(function (it) { return it.id === itemId; });
        var label = item ? item.label : itemId;
        showCelebration(app, '🎉', '¡' + label + ' desbloqueada!', 'Vuelve al mapa para jugar con tu nueva zona.', showZooScreen);
      },
    });
  }

  function showFeedScreen(animal) {
    var coins = getCoins(window.localStorage);
    renderFeedScreen(app, animal, coins, {
      onBack: showZooScreen,
      onCoinEarned: function (amount) { return addCoin(window.localStorage, amount); },
    });
  }

  function showCelebration(container, icon, title, message, callback) {
    container.innerHTML = '<div class="celebration-overlay">'
      + '<div class="celebration-card">'
      + '<div class="celebration-icon">' + icon + '</div>'
      + '<h2>' + title + '</h2>'
      + '<p>' + message + '</p>'
      + '<button class="celebration-btn" id="celebration-ok">¡Genial!</button>'
      + '</div></div>';

    container.querySelector('#celebration-ok').addEventListener('click', function () {
      callback();
    });
  }

  function showLockToast(container, lockId) {
    var existing = container.querySelector('.lock-toast');
    if (existing) existing.remove();

    var msg = lockId === 'shop'
      ? '🪙 Gana ' + SHOP_UNLOCK_COST + ' monedas para desbloquear la tienda'
      : '🔒 Gana monedas para desbloquearlo';

    var toast = document.createElement('div');
    toast.className = 'lock-toast';
    toast.textContent = msg;
    container.appendChild(toast);

    setTimeout(function () {
      toast.classList.add('lock-toast--fade');
      setTimeout(function () { if (toast.parentNode) toast.remove(); }, 400);
    }, 2000);
  }

  showZooScreen();
});