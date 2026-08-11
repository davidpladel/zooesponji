var DEBUG = false;
var debugCoords = { tx: 0, ty: 0 };
var debugShowGrid = false;

function initDebug() {
  if (window.location.search.indexOf('debug=1') === -1) return;
  DEBUG = true;

  var panel = document.createElement('div');
  panel.id = 'debug-panel';
  panel.style.cssText = 'position:fixed;top:4px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#0f0;padding:4px 10px;font:12px monospace;z-index:100;border-radius:6px;pointer-events:none;';
  panel.textContent = 'DEBUG';
  document.body.appendChild(panel);

  var canvas = document.getElementById('game-canvas');
  canvas.addEventListener('mousemove', function (e) {
    if (!DEBUG) return;
    var tx = Math.floor((e.offsetX + gameCamera.x) / DISPLAY_TILE);
    var ty = Math.floor((e.offsetY + gameCamera.y) / DISPLAY_TILE);
    debugCoords.tx = tx;
    debugCoords.ty = ty;
    var tile = getTileAt(tx, ty);
    var names = ['GRASS', 'PATH', 'FENCE', 'GATE', 'ENCLOSURE', 'WATER', 'WALL', 'FLOOR'];
    panel.textContent = 'col:' + tx + ' row:' + ty + ' | ' + (names[tile] || tile);
  });

  canvas.addEventListener('click', function (e) {
    if (!DEBUG) return;
    var tx = Math.floor((e.offsetX + gameCamera.x) / DISPLAY_TILE);
    var ty = Math.floor((e.offsetY + gameCamera.y) / DISPLAY_TILE);
    console.log('  { x: ' + tx + ', y: ' + ty + ' },');
  });

  document.addEventListener('keydown', function (e) {
    if (!DEBUG || e.key !== 'g') return;
    debugShowGrid = !debugShowGrid;
  });
}

function renderDebug(ctx, cam) {
  if (!DEBUG || !debugShowGrid) return;

  var startCol = Math.floor(cam.x / DISPLAY_TILE);
  var startRow = Math.floor(cam.y / DISPLAY_TILE);
  var endCol = startCol + Math.ceil(cam.w / DISPLAY_TILE) + 1;
  var endRow = startRow + Math.ceil(cam.h / DISPLAY_TILE) + 1;

  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 0.5;
  for (var row = startRow; row < endRow; row++) {
    for (var col = startCol; col < endCol; col++) {
      var sx = col * DISPLAY_TILE - cam.x;
      var sy = row * DISPLAY_TILE - cam.y;
      ctx.strokeRect(sx, sy, DISPLAY_TILE, DISPLAY_TILE);
    }
  }
}