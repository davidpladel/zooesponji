var gameCanvas = null;
var gameCtx = null;
var gameCamera = null;
var gamePlayer = null;
var entities = [];
var animals = [];
var lastTime = 0;
var running = false;
var interactionTarget = null;
var feedPanelVisible = false;
var coins = 0;
var storage = window.localStorage;
var mapBackground = null;

function initGame() {
  var footerEl = document.querySelector('.site-footer');
  if (footerEl && footerEl.innerHTML.indexOf('Versión') === -1) {
    footerEl.innerHTML += ' · Versión ' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '2.0.0-dev');
  }

  gameCanvas = document.getElementById('game-canvas');
  gameCtx = gameCanvas.getContext('2d');
  gameCtx.imageSmoothingEnabled = false;

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  buildMap();
  buildShopUI();
  updatePurchases();
  initDebug();

  var startX = 25 * TILE_SIZE;
  var startY = 34 * TILE_SIZE;
  if (DEBUG) {
    if (!canMove('animal', startX, startY)) {
      for (var ty = 0; ty < MAP_ROWS && !canMove('animal', startX, startY); ty++) {
        for (var tx = 0; tx < MAP_COLS; tx++) {
          if (canMove('animal', tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2)) {
            startX = tx * TILE_SIZE + TILE_SIZE / 2;
            startY = ty * TILE_SIZE + TILE_SIZE / 2;
            ty = MAP_ROWS;
            break;
          }
        }
      }
    }
  }
  gamePlayer = new Player(startX, startY);

  gameCamera = new Camera(0, 0, gameCanvas.width, gameCanvas.height);

  entities = [];
  animals = [];

  for (var e = 0; e < enclosureData.length; e++) {
    var enc = enclosureData[e];
    var animal = new Animal(enc.animalId, enc.centerX, enc.centerY);
    animal.locked = !isAnimalUnlocked(enc.animalId);
    animals.push(animal);
    entities.push(animal);
  }

  entities.push(gamePlayer);

  spawnVisitors();

  buildFeedPanel();
  buildHUD();
  coins = getCoins(storage);
  updateCoinDisplay();

  checkShopUnlock();

  loadSprite('cuidador', 'assets/img/sprites/cuidador.png');
  loadSprite('leon', 'assets/img/sprites/leon.png');
  loadSprite('cabra', 'assets/img/sprites/cabra.png');
  loadSprite('pantera', 'assets/img/sprites/pantera.png');
  loadSprite('panda', 'assets/img/sprites/panda.png');
  loadSprite('visitante-1', 'assets/img/sprites/visitante-1.png');
  loadSprite('visitante-2', 'assets/img/sprites/visitante-2.png');
  loadSprite('visitante-3', 'assets/img/sprites/visitante-3.png');

  var bg = new Image();
  bg.onload = function () { mapBackground = bg; };
  bg.src = 'assets/img/sprites/zoo-map.png';

  lastTime = performance.now();
  running = true;
  requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
  var app = document.getElementById('app');
  var w = app ? app.clientWidth : window.innerWidth;
  var h = window.innerHeight;
  if (gameCanvas) {
    gameCanvas.width = w;
    gameCanvas.height = h;
    if (gameCamera) gameCamera.setSize(w, h);
  }
}

function gameLoop(timestamp) {
  if (!running) return;
  var dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  for (var i = 0; i < entities.length; i++) {
    entities[i].update(dt);
  }

  gameCamera.follow(
    gamePlayer.x * SCALE + gamePlayer.w * SCALE / 2,
    gamePlayer.y * SCALE + gamePlayer.h * SCALE / 2
  );

  debugRecordPlayer(dt);

  checkInteraction();
  render();
  requestAnimationFrame(gameLoop);
}
function render() {
  gameCtx.fillStyle = '#2d5a1e';
  gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

  if (mapBackground) {
    var mapW = MAP_PX_W * SCALE;
    var mapH = MAP_PX_H * SCALE;
    gameCtx.drawImage(mapBackground, -gameCamera.x, -gameCamera.y, mapW, mapH);
  } else {
    renderTilemap(gameCtx, gameCamera);
  }

  entities.sort(function (a, b) { return a.y - b.y; });
  for (var i = 0; i < entities.length; i++) {
    entities[i].render(gameCtx, gameCamera);
  }

  renderDebug(gameCtx, gameCamera);
}

function checkInteraction() {
  var closestAnimal = null;
  var closestDist = Infinity;

  for (var i = 0; i < animals.length; i++) {
    var a = animals[i];
    if (a.locked) continue;
    var pt = a.getInteractionPoint();
    var dx = gamePlayer.x + gamePlayer.w / 2 - pt.x;
    var dy = gamePlayer.y + gamePlayer.h / 2 - pt.y;
    var dist = Math.hypot(dx, dy);
    if (dist < TILE_SIZE * 5 && dist < closestDist) {
      closestAnimal = a;
      closestDist = dist;
    }
  }

  if (closestAnimal !== interactionTarget) {
    interactionTarget = closestAnimal;
    updateFeedPrompt();
  }
}

function updateFeedPrompt() {
  var prompt = document.getElementById('feed-prompt');
  if (!prompt) return;
  if (interactionTarget) {
    var label = ANIMAL_LABELS[interactionTarget.animalId] || interactionTarget.animalId;
    prompt.textContent = '🍽️ Dar de comer a ' + label;
    prompt.style.display = 'block';
  } else {
    prompt.style.display = 'none';
  }
}

function buildFeedPanel() {
  var panel = document.createElement('div');
  panel.id = 'feed-panel';
  panel.className = 'feed-panel';
  panel.innerHTML = '<div class="feed-panel-title">Elige comida</div><div class="feed-panel-items" id="feed-items"></div><button class="feed-panel-close" id="feed-close">✕</button>';

  var itemsDiv = panel.querySelector('#feed-items');
  for (var f = 0; f < FOODS.length; f++) {
    var food = FOODS[f];
    var btn = document.createElement('button');
    btn.className = 'feed-item-btn';
    btn.textContent = FOOD_EMOJI[food] + ' ' + FOOD_LABELS[food];
    btn.dataset.food = food;
    btn.addEventListener('click', function () {
      handleFeed(this.dataset.food);
    });
    itemsDiv.appendChild(btn);
  }

  panel.querySelector('#feed-close').addEventListener('click', hideFeedPanel);
  document.body.appendChild(panel);
}

function buildHUD() {
  var prompt = document.createElement('button');
  prompt.id = 'feed-prompt';
  prompt.className = 'feed-prompt-btn';
  prompt.style.display = 'none';
  prompt.addEventListener('click', function () {
    showFeedPanel();
  });
  document.body.appendChild(prompt);

  var coinBadge = document.createElement('div');
  coinBadge.id = 'coin-badge';
  coinBadge.className = 'hud-coin-badge';
  coinBadge.innerHTML = '🪙 <span id="coin-value">0</span>';
  document.body.appendChild(coinBadge);
}

function updateCoinDisplay() {
  var el = document.getElementById('coin-value');
  if (el) el.textContent = String(coins);
}

function showFeedPanel() {
  feedPanelVisible = true;
  document.getElementById('feed-panel').classList.add('feed-panel--visible');
  document.getElementById('feed-prompt').style.display = 'none';
}

function hideFeedPanel() {
  feedPanelVisible = false;
  document.getElementById('feed-panel').classList.remove('feed-panel--visible');
  updateFeedPrompt();
}

function handleFeed(food) {
  if (!interactionTarget) return;
  hideFeedPanel();

  var animalId = interactionTarget.animalId;
  var reaction = getReaction(animalId, food);

  if (reaction === 'come') {
    var coinAmount = (ANIMAL_COINS[animalId] && ANIMAL_COINS[animalId].come) || 0;
    coins = addCoin(storage, coinAmount);
    updateCoinDisplay();
    playEatSound();
    checkShopUnlock();
  } else if (reaction === 'rechaza') {
    playRejectSound();
  } else {
    var specialAmount = (ANIMAL_COINS[animalId] && ANIMAL_COINS[animalId].especial) || 0;
    coins = addCoin(storage, specialAmount);
    updateCoinDisplay();
    playSpecialSound();
    checkShopUnlock();
  }

  interactionTarget.react(reaction);
}