function renderZooScreen(container, coins, purchases, callbacks, options) {
  var opts = options || {};
  var shopUnlocked = !!purchases.shop;
  var showUnlockPrompt = !opts.hideUnlockPrompt && !shopUnlocked && coins >= SHOP_UNLOCK_COST;

  const unlockedAnimals = ANIMALS.filter(function (a) {
    if (a === 'leon' || a === 'cabra') return true;
    return !!purchases[a];
  });

  var lockableZones = [
    { id: 'shop', locked: !shopUnlocked },
    { id: 'pantera', locked: !purchases.pantera },
    { id: 'panda', locked: !purchases.panda },
  ];

  var lockOverlaysHtml = lockableZones.filter(function (z) { return z.locked; }).map(function (z) {
    var h = ZOO_HOTSPOTS[z.id];
    var cx = h.left + h.width / 2;
    var cy = h.top + h.height / 2;
    return '<div class="zoo-lock-overlay" data-lock="' + z.id + '" role="button" aria-label="Zona bloqueada" style="left:' + cx + '%;top:' + cy + '%">'
      + '<img class="zoo-lock-icon" src="' + ZOO_LOCK_IMAGE + '" alt="Bloqueado">'
      + '</div>';
  }).join('');

  var hotspotsHtml = unlockedAnimals.map(function (animal) {
    var h = ZOO_HOTSPOTS[animal];
    return '<button class="zoo-hotspot" data-animal="' + animal + '" aria-label="' + ANIMAL_LABELS[animal] + '" style="left:' + h.left + '%;top:' + h.top + '%;width:' + h.width + '%;height:' + h.height + '%"></button>';
  }).join('');

  if (shopUnlocked) {
    var sh = ZOO_HOTSPOTS.shop;
    hotspotsHtml += '<button class="zoo-hotspot zoo-hotspot--shop" data-animal="__shop__" aria-label="Tienda" style="left:' + sh.left + '%;top:' + sh.top + '%;width:' + sh.width + '%;height:' + sh.height + '%"></button>';
  }

  var unlockPromptHtml = '';
  if (showUnlockPrompt) {
    unlockPromptHtml = '<div class="unlock-prompt-overlay">'
      + '<div class="unlock-prompt-card">'
      + '<div class="unlock-prompt-icon">🔓</div>'
      + '<h2>¡Enhorabuena!</h2>'
      + '<p>Has conseguido <strong>' + SHOP_UNLOCK_COST + ' monedas</strong>. ¡Ya puedes desbloquear la tienda del zoo!</p>'
      + '<button class="unlock-prompt-btn" id="unlock-shop-btn">🪙 Desbloquear tienda (' + SHOP_UNLOCK_COST + ' monedas)</button>'
      + '<button class="unlock-prompt-btn unlock-prompt-btn--later" id="unlock-shop-later">Ahora no</button>'
      + '</div></div>';
  }

  container.innerHTML = '<div class="zoo-map">'
    + '<div class="coins-badge">🪙 <span id="zoo-coins">' + coins + '</span></div>'
    + '<img class="zoo-map-image" src="' + ZOO_MAP_IMAGE + '" alt="Mapa del zoo">'
    + lockOverlaysHtml
    + hotspotsHtml
    + unlockPromptHtml
    + '</div>';

  container.querySelectorAll('.zoo-hotspot').forEach(function (el) {
    el.addEventListener('click', function () {
      var animal = el.dataset.animal;
      if (animal === '__shop__') {
        callbacks.onEnterShop();
      } else {
        callbacks.onSelectAnimal(animal);
      }
    });
  });

  var unlockBtn = container.querySelector('#unlock-shop-btn');
  if (unlockBtn) {
    unlockBtn.addEventListener('click', function () {
      callbacks.onUnlockShop();
    });
  }

  var laterBtn = container.querySelector('#unlock-shop-later');
  if (laterBtn) {
    laterBtn.addEventListener('click', function () {
      callbacks.onDismissUnlock();
    });
  }

  container.querySelectorAll('.zoo-lock-overlay').forEach(function (el) {
    el.addEventListener('click', function () {
      var lockId = el.dataset.lock;
      if (lockId === 'shop' && coins >= SHOP_UNLOCK_COST) {
        callbacks.onUnlockShop();
        return;
      }
      callbacks.onLockClick(lockId);
    });
  });
}