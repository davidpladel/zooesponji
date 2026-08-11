var DEBUG = false;
var debugShowGrid = false;
var debugMode = 'P';
var debugPathPoints = [];
var debugFencePoints = [];
var debugGatePoints = [];
var debugPanel = null;
var debugRecording = false;
var debugRecTimer = 0;

function initDebug() {
  if (window.location.search.indexOf('debug=1') === -1 && window.location.hash.indexOf('debug=1') === -1) return;
  DEBUG = true;
  window.DEBUG_FREE_MOVE = true;
  console.log('DEBUG ON | P=camino F=valla G=puerta R=grabar Enter=export C=clear');

  debugPanel = document.createElement('div');
  debugPanel.id = 'debug-panel';
  debugPanel.style.cssText = 'position:fixed;bottom:56px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.88);color:#fff;padding:6px 14px;font:12px monospace;z-index:100;border-radius:8px;text-align:center;pointer-events:none;';
  document.body.appendChild(debugPanel);
  updateDebugLabel();

  var dtEl = document.getElementById('debug-tile');
  if (dtEl) dtEl.style.cssText = 'position:fixed;top:4px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#0f0;padding:4px 12px;font:12px monospace;z-index:100;border-radius:6px;pointer-events:none;';

  var canvas = document.getElementById('game-canvas');
  canvas.addEventListener('mousemove', function (e) {
    if (!DEBUG) return;
    var tx = Math.floor((e.offsetX + gameCamera.x) / DISPLAY_TILE);
    var ty = Math.floor((e.offsetY + gameCamera.y) / DISPLAY_TILE);
    var tile = getTileAt(tx, ty);
    var names = ['GRASS','PATH','FENCE','GATE','ENCLOSURE','WATER','WALL','FLOOR'];
    if (dtEl) dtEl.textContent = (names[tile]||tile)+' ('+tx+','+ty+')';
  });

  document.addEventListener('keydown', function (e) {
    if (!DEBUG) return;
    if (e.key === 'p' || e.key === 'P') { debugMode = 'P'; updateDebugLabel(); }
    if (e.key === 'f' || e.key === 'F') { debugMode = 'F'; updateDebugLabel(); }
    if (e.key === 'g' || e.key === 'G') { debugMode = 'G'; updateDebugLabel(); }
    if (e.key === 'r' || e.key === 'R') { debugRecording = !debugRecording; updateDebugLabel(); }
    if (e.key === 'c' || e.key === 'C') { debugPathPoints=[]; debugFencePoints=[]; debugGatePoints=[]; debugRecording=false; updateDebugLabel(); }
    if (e.key === 'Enter') { exportAll(); e.preventDefault(); }
    if (e.key === 't' || e.key === 'T') { debugShowGrid = !debugShowGrid; }
  });
}

function updateDebugLabel() {
  var modes = { P: 'camino', F: 'valla', G: 'puerta' };
  var colors = { P: '#4f4', F: '#f44', G: '#ff4' };
  var rec = debugRecording ? '<b style="color:'+(colors[debugMode]||'#fff')+'">REC</b>' : 'parado';
  debugPanel.innerHTML = '<b style="color:'+(colors[debugMode]||'#fff')+'">'+modes[debugMode]+'</b> | '+rec+' | P:'+debugPathPoints.length+' F:'+debugFencePoints.length+' G:'+debugGatePoints.length+' | P/F/G modo R=grabar Enter=export C=clear T=grid';
}

function debugRecordPlayer(dt) {
  if (!DEBUG || !debugRecording || !gamePlayer) return;
  debugRecTimer += dt;
  if (debugRecTimer < 0.3) return;
  debugRecTimer = 0;
  var tx = Math.floor(gamePlayer.x / TILE_SIZE);
  var ty = Math.floor(gamePlayer.y / TILE_SIZE);
  var arr = debugMode === 'P' ? debugPathPoints : debugMode === 'F' ? debugFencePoints : debugGatePoints;
  if (arr.length === 0 || arr[arr.length-1].x !== tx || arr[arr.length-1].y !== ty) arr.push({ x: tx, y: ty });
  updateDebugLabel();
}

function groupRuns(points) {
  var sorted = points.slice().sort(function(a,b){ return a.y!==b.y ? a.y-b.y : a.x-b.x; });
  var used = {}, hRuns = [], vRuns = [];
  for (var i = 0; i < sorted.length; i++) {
    if (used[i]) continue;
    var p = sorted[i], hEnd = p.x;
    for (var hx = p.x+1; ; hx++) {
      var found = false;
      for (var j = 0; j < sorted.length; j++) { if (!used[j] && j!==i && sorted[j].x===hx && sorted[j].y===p.y) { hEnd=hx; used[j]=true; found=true; break; } }
      if (!found) break;
    }
    var vEnd = p.y;
    for (var vy = p.y+1; ; vy++) {
      var found2 = false;
      for (var k = 0; k < sorted.length; k++) { if (!used[k] && k!==i && sorted[k].x===p.x && sorted[k].y===vy) { vEnd=vy; used[k]=true; found2=true; break; } }
      if (!found2) break;
    }
    var hLen = hEnd-p.x+1, vLen = vEnd-p.y+1;
    if (hLen>=2 && hLen>=vLen) { hRuns.push({x:p.x, y:p.y, w:hLen}); used[i]=true; }
    else if (vLen>=2) { vRuns.push({x:p.x, y:p.y, h:vLen}); used[i]=true; }
    else { hRuns.push({x:p.x, y:p.y, w:1}); used[i]=true; }
  }
  return { h: hRuns, v: vRuns };
}

function exportAll() {
  console.clear();
  var paths = groupRuns(debugPathPoints);
  console.log('// --- CAMINOS ---');
  console.log('var PATHS_H = [');
  for (var i = 0; i < paths.h.length; i++) console.log('  { x: '+paths.h[i].x+', y: '+paths.h[i].y+', w: '+paths.h[i].w+' },');
  console.log('];');
  console.log('var PATHS_V = [');
  for (var j = 0; j < paths.v.length; j++) console.log('  { x: '+paths.v[j].x+', y: '+paths.v[j].y+', h: '+paths.v[j].h+' },');
  console.log('];');

  if (debugFencePoints.length > 0) {
    var minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
    for (var m = 0; m < debugFencePoints.length; m++) {
      if (debugFencePoints[m].x < minX) minX = debugFencePoints[m].x;
      if (debugFencePoints[m].y < minY) minY = debugFencePoints[m].y;
      if (debugFencePoints[m].x > maxX) maxX = debugFencePoints[m].x;
      if (debugFencePoints[m].y > maxY) maxY = debugFencePoints[m].y;
    }
    console.log('\n// --- RECINTO (vallas) ---');
    console.log('// Bounding box: x='+minX+' y='+minY+' w='+(maxX-minX+1)+' h='+(maxY-minY+1));
    console.log('// Copia esto a ZONES ajustando enclosure y gates');
    console.log('// enclosure: { x: '+minX+', y: '+minY+', w: '+(maxX-minX+1)+', h: '+(maxY-minY+1)+' },');
  }

  if (debugGatePoints.length > 0) {
    console.log('\n// --- PUERTAS ---');
    console.log('gates: [');
    for (var n = 0; n < debugGatePoints.length; n++) console.log('  { x: '+debugGatePoints[n].x+', y: '+debugGatePoints[n].y+' },');
    console.log('],');
  }
}

function renderDebug(ctx, cam) {
  if (!DEBUG) return;
  if (debugShowGrid) {
    var sc = Math.floor(cam.x/DISPLAY_TILE), sr = Math.floor(cam.y/DISPLAY_TILE);
    var ec = sc+Math.ceil(cam.w/DISPLAY_TILE)+1, er = sr+Math.ceil(cam.h/DISPLAY_TILE)+1;
    ctx.strokeStyle='rgba(255,255,255,0.12)'; ctx.lineWidth=0.5;
    for (var r=sr; r<er; r++) for (var c=sc; c<ec; c++) ctx.strokeRect(c*DISPLAY_TILE-cam.x, r*DISPLAY_TILE-cam.y, DISPLAY_TILE, DISPLAY_TILE);
  }
  drawDebugLayer(ctx, cam, debugPathPoints, '#4f4', 'rgba(0,255,0,0.3)');
  drawDebugLayer(ctx, cam, debugFencePoints, '#f44', 'rgba(255,0,0,0.3)');
  for (var i = 0; i < debugGatePoints.length; i++) {
    var dp = debugGatePoints[i];
    var sx = dp.x*DISPLAY_TILE-cam.x+DISPLAY_TILE/2, sy = dp.y*DISPLAY_TILE-cam.y+DISPLAY_TILE/2;
    ctx.fillStyle='#ff4'; ctx.beginPath(); ctx.arc(sx,sy,DISPLAY_TILE*0.35,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#000'; ctx.lineWidth=2; ctx.stroke();
  }
  if (debugRecording && gamePlayer) {
    var colors = { P: '#4f4', F: '#f44', G: '#ff4' };
    var px = gamePlayer.x*SCALE-cam.x+gamePlayer.w*SCALE/2, py = gamePlayer.y*SCALE-cam.y+gamePlayer.h*SCALE/2;
    ctx.strokeStyle=colors[debugMode]||'#fff'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(px,py,DISPLAY_TILE*0.55,0,Math.PI*2); ctx.stroke();
  }
}

function drawDebugLayer(ctx, cam, pts, color, lineColor) {
  for (var i = 1; i < pts.length; i++) {
    var a = pts[i-1], b = pts[i];
    ctx.strokeStyle=lineColor; ctx.lineWidth=3;
    ctx.beginPath();
    ctx.moveTo(a.x*DISPLAY_TILE-cam.x+DISPLAY_TILE/2, a.y*DISPLAY_TILE-cam.y+DISPLAY_TILE/2);
    ctx.lineTo(b.x*DISPLAY_TILE-cam.x+DISPLAY_TILE/2, b.y*DISPLAY_TILE-cam.y+DISPLAY_TILE/2);
    ctx.stroke();
  }
  for (var j = 0; j < pts.length; j++) {
    var dp = pts[j], sx = dp.x*DISPLAY_TILE-cam.x+DISPLAY_TILE/2, sy = dp.y*DISPLAY_TILE-cam.y+DISPLAY_TILE/2;
    ctx.fillStyle=j===pts.length-1?color:'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.arc(sx,sy,DISPLAY_TILE*0.25,0,Math.PI*2); ctx.fill();
  }
}