var DEBUG = false;
var debugShowGrid = false;
var debugPoints = [];
var debugPanel = null;
var debugRecording = false;
var debugRecTimer = 0;

function initDebug() {
  if (window.location.search.indexOf('debug=1') === -1) return;
  DEBUG = true;
  window.DEBUG_FREE_MOVE = true;

  var dtEl = document.getElementById('debug-tile');
  if (dtEl) dtEl.style.cssText = 'position:fixed;top:4px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#0f0;padding:4px 12px;font:12px monospace;z-index:100;border-radius:6px;pointer-events:none;';

  debugPanel = document.createElement('div');
  debugPanel.id = 'debug-panel';
  debugPanel.style.cssText = 'position:fixed;bottom:56px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#0f0;padding:6px 14px;font:12px monospace;z-index:100;border-radius:8px;text-align:center;';
  debugPanel.innerHTML = 'DEBUG | <b>libre</b> | G=grid R=grabar Enter=export C=clear';
  document.body.appendChild(debugPanel);

  var canvas = document.getElementById('game-canvas');
  canvas.addEventListener('mousemove', function (e) {
    if (!DEBUG) return;
    var tx = Math.floor((e.offsetX + gameCamera.x) / DISPLAY_TILE);
    var ty = Math.floor((e.offsetY + gameCamera.y) / DISPLAY_TILE);
    var tile = getTileAt(tx, ty);
    var names = ['GRASS', 'PATH', 'FENCE', 'GATE', 'ENCLOSURE', 'WATER', 'WALL', 'FLOOR'];
    document.getElementById('debug-tile').textContent = (names[tile] || tile) + ' (' + tx + ',' + ty + ')';
  });

  document.addEventListener('keydown', function (e) {
    if (!DEBUG) return;
    if (e.key === 'g') { debugShowGrid = !debugShowGrid; }
    if (e.key === 'c') { debugPoints = []; debugRecording = false; updateDebugLabel(); }
    if (e.key === 'r') { debugRecording = !debugRecording; updateDebugLabel(); }
    if (e.key === 'Enter') { exportPaths(); e.preventDefault(); }
  });
}

function updateDebugLabel() {
  var status = debugRecording ? '<b style="color:#f44">REC</b>' : '<b>libre</b>';
  debugPanel.innerHTML = 'DEBUG | ' + status + ' | ' + debugPoints.length + ' pts | G=grid R=grabar Enter=export C=clear';
}

function debugRecordPlayer(dt) {
  if (!DEBUG || !debugRecording || !gamePlayer) return;
  debugRecTimer += dt;
  if (debugRecTimer < 0.3) return;
  debugRecTimer = 0;

  var tx = Math.floor(gamePlayer.x / TILE_SIZE);
  var ty = Math.floor(gamePlayer.y / TILE_SIZE);

  if (debugPoints.length === 0) {
    debugPoints.push({ x: tx, y: ty });
  } else {
    var last = debugPoints[debugPoints.length - 1];
    if (last.x !== tx || last.y !== ty) {
      debugPoints.push({ x: tx, y: ty });
    }
  }
  updateDebugLabel();
}

function exportPaths() {
  if (debugPoints.length === 0) return;
  console.clear();

  var points = debugPoints.slice();
  points.sort(function (a, b) { return a.y !== b.y ? a.y - b.y : a.x - b.x; });

  var horizontal = [];
  var vertical = [];

  for (var i = 0; i < points.length; i++) {
    var p = points[i];
    if (p.used) continue;

    var runH = [p];
    for (var j = i + 1; j < points.length; j++) {
      if (points[j].used) continue;
      if (points[j].y === p.y && points[j].x === runH[runH.length - 1].x + 1) {
        runH.push(points[j]);
      }
    }

    var runV = [p];
    for (var k = i + 1; k < points.length; k++) {
      if (points[k].used) continue;
      if (points[k].x === p.x && points[k].y === runV[runV.length - 1].y + 1) {
        runV.push(points[k]);
      }
    }

    if (runH.length >= 2 && runH.length >= runV.length) {
      for (var h = 0; h < runH.length; h++) runH[h].used = true;
      horizontal.push({ x: p.x, y: p.y, w: runH.length });
    } else if (runV.length >= 2) {
      for (var v = 0; v < runV.length; v++) runV[v].used = true;
      vertical.push({ x: p.x, y: p.y, h: runV.length });
    } else {
      p.used = true;
      horizontal.push({ x: p.x, y: p.y, w: 1 });
    }
  }

  console.log('var PATHS_H = [');
  for (var hi = 0; hi < horizontal.length; hi++) {
    console.log('  { x: ' + horizontal[hi].x + ', y: ' + horizontal[hi].y + ', w: ' + horizontal[hi].w + ' },');
  }
  console.log('];\n');
  console.log('var PATHS_V = [');
  for (var vi = 0; vi < vertical.length; vi++) {
    console.log('  { x: ' + vertical[vi].x + ', y: ' + vertical[vi].y + ', h: ' + vertical[vi].h + ' },');
  }
  console.log('];');
  console.log('\n// Copia esto a zones.js reemplazando PATHS_H y PATHS_V');
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

  for (var i = 1; i < debugPoints.length; i++) {
    var a = debugPoints[i - 1];
    var b = debugPoints[i];
    ctx.strokeStyle = 'rgba(255,50,50,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(a.x * DISPLAY_TILE - cam.x + DISPLAY_TILE / 2, a.y * DISPLAY_TILE - cam.y + DISPLAY_TILE / 2);
    ctx.lineTo(b.x * DISPLAY_TILE - cam.x + DISPLAY_TILE / 2, b.y * DISPLAY_TILE - cam.y + DISPLAY_TILE / 2);
    ctx.stroke();
  }

  for (var j = 0; j < debugPoints.length; j++) {
    var dp = debugPoints[j];
    var sx = dp.x * DISPLAY_TILE - cam.x + DISPLAY_TILE / 2;
    var sy = dp.y * DISPLAY_TILE - cam.y + DISPLAY_TILE / 2;
    ctx.fillStyle = j === debugPoints.length - 1 ? '#f00' : 'rgba(255,100,100,0.5)';
    ctx.beginPath();
    ctx.arc(sx, sy, DISPLAY_TILE * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  if (debugRecording && gamePlayer) {
    var px = gamePlayer.x * SCALE - cam.x + gamePlayer.w * SCALE / 2;
    var py = gamePlayer.y * SCALE - cam.y + gamePlayer.h * SCALE / 2;
    ctx.strokeStyle = '#f00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, DISPLAY_TILE * 0.6, 0, Math.PI * 2);
    ctx.stroke();
  }
}