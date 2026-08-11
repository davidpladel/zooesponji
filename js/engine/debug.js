var DEBUG = false;
var debugCoords = { tx: 0, ty: 0 };
var debugShowGrid = false;
var debugPoints = [];
var debugPanel = null;
var debugCanvas = null;

function initDebug() {
  if (window.location.search.indexOf('debug=1') === -1) return;
  DEBUG = true;

  debugPanel = document.createElement('div');
  debugPanel.id = 'debug-panel';
  debugPanel.style.cssText = 'position:fixed;top:4px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#0f0;padding:4px 10px;font:12px monospace;z-index:100;border-radius:6px;pointer-events:none;';
  debugPanel.textContent = 'DEBUG | 0 pts | G=grid C=clear Enter=export';
  document.body.appendChild(debugPanel);

  debugCanvas = document.getElementById('game-canvas');
  debugCanvas.addEventListener('mousemove', function (e) {
    if (!DEBUG) return;
    var tx = Math.floor((e.offsetX + gameCamera.x) / DISPLAY_TILE);
    var ty = Math.floor((e.offsetY + gameCamera.y) / DISPLAY_TILE);
    debugCoords.tx = tx;
    debugCoords.ty = ty;
    var tile = getTileAt(tx, ty);
    var names = ['GRASS', 'PATH', 'FENCE', 'GATE', 'ENCLOSURE', 'WATER', 'WALL', 'FLOOR'];
    debugPanel.textContent = (names[tile] || tile) + ' col:' + tx + ' row:' + ty + ' | ' + debugPoints.length + ' pts | G=grid C=clear Enter=export';
  });

  debugCanvas.addEventListener('click', function (e) {
    if (!DEBUG) return;
    var tx = Math.floor((e.offsetX + gameCamera.x) / DISPLAY_TILE);
    var ty = Math.floor((e.offsetY + gameCamera.y) / DISPLAY_TILE);
    debugPoints.push({ x: tx, y: ty });
    console.log(debugPoints.length + ': { x: ' + tx + ', y: ' + ty + ' },');
    debugPanel.textContent = debugPoints.length + ' pts | G=grid C=clear Enter=export';
  });

  document.addEventListener('keydown', function (e) {
    if (!DEBUG) return;
    if (e.key === 'g') { debugShowGrid = !debugShowGrid; }
    if (e.key === 'c') { debugPoints = []; console.clear(); console.log('--- Puntos limpiados ---'); }
    if (e.key === 'Enter') { exportPathDefinitions(); e.preventDefault(); }
  });
}

function exportPathDefinitions() {
  if (debugPoints.length === 0) return;
  console.log('--- PATHS_H / PATHS_V sugeridos ---');

  var points = debugPoints.slice();
  var used = {};
  var hPaths = [];
  var vPaths = [];

  for (var i = 0; i < points.length; i++) {
    if (used[i]) continue;
    var p = points[i];

    var hCount = 1;
    for (var j = i + 1; j < points.length; j++) {
      if (used[j]) continue;
      if (points[j].y === p.y && points[j].x === p.x + hCount) { hCount++; used[j] = true; }
    }

    var vCount = 1;
    for (var k = i + 1; k < points.length; k++) {
      if (used[k]) continue;
      if (points[k].x === p.x && points[k].y === p.y + vCount) { vCount++; used[k] = true; }
    }

    if (hCount >= 2 && hCount > vCount) {
      console.log('  { x: ' + p.x + ', y: ' + p.y + ', w: ' + hCount + ' },');
      used[i] = true;
      continue;
    }
    if (vCount >= 2) {
      console.log('  { x: ' + p.x + ', y: ' + p.y + ', h: ' + vCount + ' },');
      used[i] = true;
      continue;
    }
    if (hCount >= 2) {
      console.log('  { x: ' + p.x + ', y: ' + p.y + ', w: ' + hCount + ' },');
      used[i] = true;
      continue;
    }
  }

  console.log('--- Puntos sueltos (no agrupados) ---');
  for (var m = 0; m < points.length; m++) {
    if (!used[m]) console.log('  { x: ' + points[m].x + ', y: ' + points[m].y + ' },');
  }
}

function renderDebug(ctx, cam) {
  if (!DEBUG) return;

  if (debugShowGrid) {
    var startCol = Math.floor(cam.x / DISPLAY_TILE);
    var startRow = Math.floor(cam.y / DISPLAY_TILE);
    var endCol = startCol + Math.ceil(cam.w / DISPLAY_TILE) + 1;
    var endRow = startRow + Math.ceil(cam.h / DISPLAY_TILE) + 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 0.5;
    for (var row = startRow; row < endRow; row++) {
      for (var col = startCol; col < endCol; col++) {
        ctx.strokeRect(col * DISPLAY_TILE - cam.x, row * DISPLAY_TILE - cam.y, DISPLAY_TILE, DISPLAY_TILE);
      }
    }
  }

  for (var i = 0; i < debugPoints.length; i++) {
    var dp = debugPoints[i];
    var sx = dp.x * DISPLAY_TILE - cam.x + DISPLAY_TILE / 2;
    var sy = dp.y * DISPLAY_TILE - cam.y + DISPLAY_TILE / 2;
    ctx.fillStyle = 'rgba(255,0,0,0.5)';
    ctx.beginPath();
    ctx.arc(sx, sy, DISPLAY_TILE * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(i + 1, sx, sy + 4);
  }
}