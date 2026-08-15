var gameState = 'map';
var feedAnimalId = null;
var feedFoodIcons = [];
var draggedFood = null;
var draggedFoodX = 0;
var draggedFoodY = 0;
var dragStartX = 0;
var dragStartY = 0;
var feedReaction = null;
var feedReactionTimer = 0;
var feedIdleTimer = 0;
var shopItems = [];
var shopkeeperAnim = 0;
var sceneImages = {};
var FOOD_COLORS = { piedra: '#9e9e9e', carne: '#e57373', conejo: '#a5d6a7', zanahoria: '#ffb74d' };
var ANIMAL_BG_COLORS = { leon: ['#c8a84e', '#7ec850'], cabra: ['#a0a0a0', '#8bb878'], pantera: ['#2d2d2d', '#4a6741'], panda: ['#e8e8e8', '#5a8a4a'] };

function setGameState(state, data) {
  gameState = state;
  if (state === 'feed') {
    feedAnimalId = data.animalId;
    feedFoodIcons = [];
    feedReaction = null;
    feedReactionTimer = 0;
    feedIdleTimer = 0;
    draggedFood = null;
  }
  if (state === 'shop') {
    shopItems = buildShopItems();
    shopkeeperAnim = 0;
  }
  rebindSceneInputs();
}

function sceneLoadImage(path) {
  if (sceneImages[path]) return sceneImages[path];
  var img = new Image();
  img.src = path;
  sceneImages[path] = img;
  return img;
}

function sceneDrawCloseButton(ctx, w) {
  var cx = w - 30;
  var cy = 20;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(cx - 16, cy - 16, 32, 32);
  ctx.fillStyle = '#fff';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✕', cx, cy);
}

function sceneRectHit(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

var sceneInputBound = false;
var sceneInputMode = null;

function updateFeedScene(dt) {
  feedIdleTimer += dt;
  if (feedReaction) {
    feedReactionTimer -= dt;
    if (feedReactionTimer <= 0) {
      feedReaction = null;
      feedReactionTimer = 0;
    }
  }
}

function updateShopScene(dt) {
  shopkeeperAnim += dt;
  for (var i = 0; i < shopItems.length; i++) {
    if (shopItems[i].shaking) {
      shopItems[i].shakeTimer -= dt;
      if (shopItems[i].shakeTimer <= 0) {
        shopItems[i].shaking = false;
      }
    }
  }
}

function buildShopItems() {
  var items = [];
  var purchases = getPurchases(storage);
  for (var i = 0; i < SHOP_ITEMS.length; i++) {
    var item = SHOP_ITEMS[i];
    if (typeof item.cost !== 'number') continue;
    var owned = !!purchases[item.id];
    var affordable = coins >= item.cost;
    items.push({ id: item.id, label: item.label, cost: item.cost, image: item.image, owned: owned, affordable: affordable, shaking: false, shakeTimer: 0 });
  }
  return items;
}

function renderShopScene(ctx, cam) {
  var w = gameCanvas.width;
  var h = gameCanvas.height;

  var bgW = Math.min(w * 0.9, 600);
  var bgH = Math.min(h * 0.7, 400);
  var bgX = (w - bgW) / 2;
  var bgY = (h - bgH) / 2;

  var bgImg = sceneLoadImage('assets/img/scenes/shop-bg.png');
  if (bgImg.complete && bgImg.naturalWidth > 0) {
    ctx.drawImage(bgImg, bgX, bgY, bgW, bgH);
  } else {
    ctx.fillStyle = '#5c3a1e';
    ctx.fillRect(bgX, bgY, bgW, bgH);
    for (var ly = bgY; ly < bgY + bgH; ly += 12) {
      ctx.fillStyle = ly % 24 === 0 ? '#4a2a10' : '#7a5230';
      ctx.fillRect(bgX, ly, bgW, 6);
    }
    ctx.strokeStyle = '#3a1a0a';
    ctx.lineWidth = 4;
    ctx.strokeRect(bgX, bgY, bgW, bgH);
  }

  var keeperX = bgX + 30;
  var keeperY = bgY + bgH - 120;
  var keeperW = 64;
  var keeperH = 80;
  var shopkeeperImg = sceneLoadImage('assets/img/sprites/tendero.png');
  if (shopkeeperImg.complete && shopkeeperImg.naturalWidth > 0) {
    ctx.drawImage(shopkeeperImg, 0, 0, shopkeeperImg.width, shopkeeperImg.height, keeperX, keeperY + Math.sin(shopkeeperAnim * 2) * 2, keeperW, keeperH);
  } else {
    ctx.fillStyle = '#6d4c2e';
    ctx.fillRect(keeperX, keeperY + Math.sin(shopkeeperAnim * 2) * 2, keeperW, keeperH);
    ctx.fillStyle = '#ffcc80';
    ctx.beginPath();
    ctx.arc(keeperX + keeperW / 2, keeperY + 12, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.fillRect(keeperX + keeperW / 2 - 6, keeperY + 8, 4, 4);
    ctx.fillRect(keeperX + keeperW / 2 + 4, keeperY + 8, 4, 4);
  }

  var itemsX = bgX + 140;
  var itemsY = bgY + 40;
  var itemH = 80;
  for (var i = 0; i < shopItems.length; i++) {
    var si = shopItems[i];
    var iy = itemsY + i * (itemH + 10);
    var shakeX = si.shaking ? Math.sin(Date.now() * 0.05) * 4 : 0;

    ctx.fillStyle = si.owned ? '#555' : si.affordable ? 'rgba(76,175,80,0.3)' : 'rgba(244,67,54,0.3)';
    ctx.fillRect(itemsX + shakeX, iy, bgW - 160, itemH);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(itemsX + shakeX, iy, bgW - 160, itemH);

    var animalSprite = sceneLoadImage('assets/img/sprites/' + si.id + '.png');
    var sprX = itemsX + shakeX + 8;
    var sprY = iy + 8;
    var sprW = itemH - 16;
    var sprH = itemH - 16;
    if (animalSprite.complete && animalSprite.naturalWidth > 0) {
      ctx.drawImage(animalSprite, 0, 0, animalSprite.width, animalSprite.height, sprX, sprY, sprW, sprH);
    } else {
      ctx.fillStyle = '#666';
      ctx.fillRect(sprX, sprY, sprW, sprH);
    }

    if (si.owned) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(sprX, sprY, sprW, sprH);
    }

    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    var labelY = iy + itemH / 2;
    ctx.fillText(si.label, sprX + sprW + 10, labelY - 10);

    if (si.owned) {
      ctx.fillStyle = '#4caf50';
      ctx.fillText('✓ Comprado', sprX + sprW + 10, labelY + 12);
    } else {
      ctx.fillText(si.cost + ' 🪙', sprX + sprW + 10, labelY + 12);
    }

    si._rect = { x: itemsX, y: iy, w: bgW - 160, h: itemH };
  }

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(bgX + bgW - 100, bgY + 8, 92, 28);
  ctx.fillStyle = '#ffd700';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🪙 ' + coins, bgX + bgW - 54, bgY + 26);

  sceneDrawCloseButton(ctx, w);
}

function renderFeedScene(ctx, cam) {
  var w = gameCanvas.width;
  var h = gameCanvas.height;

  var bgW = Math.min(w * 0.8, 600);
  var bgH = Math.min(h * 0.65, 400);
  var bgX = (w - bgW) / 2;
  var bgY = (h - bgH) / 2 - 20;

  var animalImg = sceneLoadImage('assets/img/sprites/' + feedAnimalId + '.png');
  var bgImg = sceneLoadImage('assets/img/scenes/' + feedAnimalId + '-bg.png');

  if (bgImg.complete && bgImg.naturalWidth > 0) {
    ctx.drawImage(bgImg, bgX, bgY, bgW, bgH);
  } else {
    var colors = ANIMAL_BG_COLORS[feedAnimalId] || ['#6b8e5a', '#4a7a3a'];
    var grad = ctx.createLinearGradient(bgX, bgY, bgX, bgY + bgH);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(bgX, bgY, bgW, bgH);
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 4;
    ctx.strokeRect(bgX, bgY, bgW, bgH);
  }

  var idleScale = 1 + Math.sin(feedIdleTimer * 3) * 0.02;
  var animalW = 32 * 2.5 * idleScale;
  var animalH = 32 * 2.5 * idleScale;
  var animalX = w / 2 - animalW / 2;
  var animalY = bgY + bgH / 2 - animalH / 2;
  if (animalImg.complete && animalImg.naturalWidth > 0) {
    ctx.drawImage(animalImg, 0, 0, animalImg.width, animalImg.height, animalX, animalY, animalW, animalH);
  } else {
    ctx.fillStyle = '#888';
    ctx.fillRect(animalX, animalY, animalW, animalH);
  }

  if (feedReaction) {
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    var emote = feedReaction === 'come' ? '😋' : feedReaction === 'rechaza' ? '😝' : '🥰';
    ctx.fillText(emote, w / 2, animalY - 20);
  }

  if (!feedReaction) {
    var trayY = bgY + bgH + 10;
    var iconSize = Math.min(48, (bgW - 40) / 4);
    var gap = (bgW - iconSize * 4) / 5;
    var icons = [];
    for (var i = 0; i < FOODS.length; i++) {
      var ix = bgX + gap + i * (iconSize + gap);
      var iy = trayY;
      icons.push({ x: ix, y: iy, w: iconSize, h: iconSize, food: FOODS[i], alpha: draggedFood && draggedFood !== FOODS[i] ? 0.4 : 1 });
    }
    feedFoodIcons = icons;

    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(bgX, trayY - 5, bgW, iconSize + 20);
    ctx.strokeStyle = '#6b4d3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(bgX, trayY - 5, bgW, iconSize + 20);

    for (var j = 0; j < icons.length; j++) {
      var ic = icons[j];
      if (draggedFood === ic.food) continue;
      ctx.globalAlpha = ic.alpha;
      drawFoodIcon(ctx, ic);
      ctx.globalAlpha = 1;
    }
  }

  if (draggedFood) {
    var dragIcon = { x: draggedFoodX - 24, y: draggedFoodY - 24, w: 48, h: 48, food: draggedFood, alpha: 1 };
    drawFoodIcon(ctx, dragIcon);
  }

  sceneDrawCloseButton(ctx, w);
}

function drawFoodIcon(ctx, icon) {
  var foodImg = sceneLoadImage('assets/img/sprites/comida-' + icon.food + '.png');
  if (foodImg.complete && foodImg.naturalWidth > 0) {
    ctx.drawImage(foodImg, 0, 0, foodImg.width, foodImg.height, icon.x, icon.y, icon.w, icon.h);
  } else {
    ctx.fillStyle = FOOD_COLORS[icon.food] || '#ccc';
    ctx.fillRect(icon.x, icon.y, icon.w, icon.h);
    ctx.fillStyle = '#fff';
    ctx.font = Math.floor(icon.w * 0.5) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(FOOD_EMOJI[icon.food] || '?', icon.x + icon.w / 2, icon.y + icon.h / 2);
  }
}

function rebindSceneInputs() {
  if (!gameCanvas) return;
  if (sceneInputMode === 'feed') {
    gameCanvas.removeEventListener('pointerdown', handleFeedPointerDown);
    gameCanvas.removeEventListener('pointermove', handleFeedPointerMove);
    gameCanvas.removeEventListener('pointerup', handleFeedPointerUp);
    gameCanvas.removeEventListener('pointercancel', handleFeedPointerCancel);
  }
  if (sceneInputMode === 'shop') {
    gameCanvas.removeEventListener('pointerdown', handleShopPointerDown);
  }
  if (gameState === 'feed') {
    gameCanvas.addEventListener('pointerdown', handleFeedPointerDown);
    gameCanvas.addEventListener('pointermove', handleFeedPointerMove);
    gameCanvas.addEventListener('pointerup', handleFeedPointerUp);
    gameCanvas.addEventListener('pointercancel', handleFeedPointerCancel);
    sceneInputMode = 'feed';
    sceneInputBound = true;
  } else if (gameState === 'shop') {
    gameCanvas.addEventListener('pointerdown', handleShopPointerDown);
    sceneInputMode = 'shop';
    sceneInputBound = true;
  } else {
    if (sceneInputMode === 'feed') {
      gameCanvas.removeEventListener('pointerdown', handleFeedPointerDown);
      gameCanvas.removeEventListener('pointermove', handleFeedPointerMove);
      gameCanvas.removeEventListener('pointerup', handleFeedPointerUp);
      gameCanvas.removeEventListener('pointercancel', handleFeedPointerCancel);
    }
    if (sceneInputMode === 'shop') {
      gameCanvas.removeEventListener('pointerdown', handleShopPointerDown);
    }
    sceneInputMode = null;
  }
}

function handleFeedPointerDown(e) {
  if (feedReaction) return;
  var rect = gameCanvas.getBoundingClientRect();
  var px = e.clientX - rect.left;
  var py = e.clientY - rect.top;

  if (px >= gameCanvas.width - 48 && py <= 48) {
    setGameState('map');
    return;
  }

  for (var i = 0; i < feedFoodIcons.length; i++) {
    var ic = feedFoodIcons[i];
    if (sceneRectHit(px, py, ic.x, ic.y, ic.w, ic.h)) {
      draggedFood = ic.food;
      draggedFoodX = px;
      draggedFoodY = py;
      dragStartX = ic.x + ic.w / 2;
      dragStartY = ic.y + ic.h / 2;
      e.preventDefault();
      return;
    }
  }
}

function handleFeedPointerMove(e) {
  if (!draggedFood) return;
  var rect = gameCanvas.getBoundingClientRect();
  draggedFoodX = e.clientX - rect.left;
  draggedFoodY = e.clientY - rect.top;
  e.preventDefault();
}

function handleFeedPointerUp(e) {
  if (!draggedFood) return;
  var food = draggedFood;
  draggedFood = null;

  var rectBounds = gameCanvas.getBoundingClientRect();
  var px = e.clientX - rectBounds.left;
  var py = e.clientY - rectBounds.top;

  var w = gameCanvas.width;
  var h = gameCanvas.height;
  var bgW = Math.min(w * 0.8, 600);
  var bgH = Math.min(h * 0.65, 400);
  var bgY = (h - bgH) / 2 - 20;
  var animalW = 32 * 2.5;
  var animalH = 32 * 2.5;
  var animalX = w / 2 - animalW / 2;
  var animalY = bgY + bgH / 2 - animalH / 2;
  var margin = 20;

  if (sceneRectHit(px, py, animalX - margin, animalY - margin, animalW + margin * 2, animalH + margin * 2)) {
    handleFeedReaction(food);
  }
  e.preventDefault();
}

function handleFeedPointerCancel(e) {
  draggedFood = null;
}

function handleFeedReaction(food) {
  var reaction = getReaction(feedAnimalId, food);
  feedReaction = reaction;
  var timers = { come: 1.5, rechaza: 1.0, especial: 2.0 };
  feedReactionTimer = timers[reaction] || 1.5;

  if (reaction === 'come') {
    var comeCoins = (ANIMAL_COINS[feedAnimalId] && ANIMAL_COINS[feedAnimalId].come) || 0;
    coins = addCoin(storage, comeCoins);
    updateCoinDisplay();
    checkShopUnlock();
    playEatSound();
  } else if (reaction === 'rechaza') {
    playRejectSound();
  } else if (reaction === 'especial') {
    var especCoins = (ANIMAL_COINS[feedAnimalId] && ANIMAL_COINS[feedAnimalId].especial) || 0;
    coins = addCoin(storage, especCoins);
    updateCoinDisplay();
    checkShopUnlock();
    playSpecialSound();
  }
}

function startFeedingScene(animalId) {
  var zone = getZoneForAnimal(animalId);
  setGameState('feed', { animalId: animalId, zone: zone });
}

function startShopScene() {
  setGameState('shop', {});
}

function handleShopPointerDown(e) {
  var rectBounds = gameCanvas.getBoundingClientRect();
  var px = e.clientX - rectBounds.left;
  var py = e.clientY - rectBounds.top;

  if (px >= gameCanvas.width - 48 && py <= 48) {
    setGameState('map');
    return;
  }

  for (var i = 0; i < shopItems.length; i++) {
    var si = shopItems[i];
    if (!si._rect) continue;
    if (!sceneRectHit(px, py, si._rect.x, si._rect.y, si._rect.w, si._rect.h)) continue;

    if (si.owned) return;
    if (!si.affordable) {
      si.shaking = true;
      si.shakeTimer = 0.3;
      return;
    }

    try {
      coins = spendCoins(storage, si.cost);
    } catch (err) {
      si.shaking = true;
      si.shakeTimer = 0.3;
      return;
    }

    savePurchase(storage, si.id);
    updateCoinDisplay();
    updateAnimalAccess();
    checkShopUnlock();
    playEatSound();

    shopItems = buildShopItems();
    e.preventDefault();
    return;
  }
}
