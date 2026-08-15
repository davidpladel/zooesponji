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

function updateShopScene(dt) {}
function renderShopScene(ctx, cam) {}

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
