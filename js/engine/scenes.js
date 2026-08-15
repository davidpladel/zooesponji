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

function updateFeedScene(dt) {}
function updateShopScene(dt) {}
function renderFeedScene(ctx, cam) {}
function renderShopScene(ctx, cam) {}

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
