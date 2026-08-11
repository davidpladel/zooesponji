var gameCanvas = null;
var gameCtx = null;
var gameCamera = null;
var gamePlayer = null;
var entities = [];
var lastTime = 0;
var running = false;

function initGame() {
  gameCanvas = document.getElementById('game-canvas');
  gameCtx = gameCanvas.getContext('2d');
  gameCtx.imageSmoothingEnabled = false;

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  buildTileset();
  buildMap();

  var startX = 24 * TILE_SIZE + TILE_SIZE / 2;
  var startY = 36 * TILE_SIZE;

  gamePlayer = new Player(startX, startY);
  gameCamera = new Camera(0, 0, gameCanvas.width, gameCanvas.height);
  entities = [gamePlayer];

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

  render();

  requestAnimationFrame(gameLoop);
}

function render() {
  gameCtx.fillStyle = '#2d5a1e';
  gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

  renderTilemap(gameCtx, gameCamera);

  for (var i = 0; i < entities.length; i++) {
    entities[i].render(gameCtx, gameCamera);
  }
}