var TILE_GRASS = 0;
var TILE_PATH = 1;
var TILE_FENCE = 2;
var TILE_GATE = 3;
var TILE_ENCLOSURE = 4;
var TILE_WATER = 5;
var TILE_WALL = 6;
var TILE_FLOOR = 7;

var TILE_COLORS_BG = {};
TILE_COLORS_BG[TILE_GRASS] = '#7ec850';
TILE_COLORS_BG[TILE_PATH] = '#c4a45a';
TILE_COLORS_BG[TILE_FENCE] = '#6d4c2e';
TILE_COLORS_BG[TILE_GATE] = '#a08050';
TILE_COLORS_BG[TILE_ENCLOSURE] = '#c8b878';
TILE_COLORS_BG[TILE_WATER] = '#4a90d9';
TILE_COLORS_BG[TILE_WALL] = '#5c5c5c';
TILE_COLORS_BG[TILE_FLOOR] = '#d4c4a8';

var MOVE_PERMS = {
  keeper: {},
  visitor: {},
  animal: {},
};

MOVE_PERMS.keeper[TILE_PATH] = true;
MOVE_PERMS.keeper[TILE_GATE] = true;
MOVE_PERMS.keeper[TILE_GRASS] = false;
MOVE_PERMS.keeper[TILE_ENCLOSURE] = false;
MOVE_PERMS.keeper[TILE_FENCE] = false;
MOVE_PERMS.keeper[TILE_WATER] = false;
MOVE_PERMS.keeper[TILE_WALL] = false;

MOVE_PERMS.visitor[TILE_PATH] = true;
MOVE_PERMS.visitor[TILE_GATE] = true;
MOVE_PERMS.visitor[TILE_GRASS] = false;
MOVE_PERMS.visitor[TILE_ENCLOSURE] = false;
MOVE_PERMS.visitor[TILE_FENCE] = false;
MOVE_PERMS.visitor[TILE_WATER] = false;
MOVE_PERMS.visitor[TILE_WALL] = false;

MOVE_PERMS.animal[TILE_ENCLOSURE] = true;
MOVE_PERMS.animal[TILE_GRASS] = true;
MOVE_PERMS.animal[TILE_PATH] = true;
MOVE_PERMS.animal[TILE_GATE] = false;
MOVE_PERMS.animal[TILE_FENCE] = false;
MOVE_PERMS.animal[TILE_WATER] = false;
MOVE_PERMS.animal[TILE_WALL] = false;

var tileMap = [];
var enclosureData = [];
var tilesetCanvas = null;
var currentZone = null;

function buildMap() {
  var i, j;
  for (i = 0; i < MAP_ROWS; i++) {
    tileMap[i] = [];
    for (j = 0; j < MAP_COLS; j++) {
      tileMap[i][j] = TILE_GRASS;
    }
  }

  fillRect(0, 0, MAP_COLS, 1, TILE_FENCE);
  fillRect(0, MAP_ROWS - 1, MAP_COLS, 1, TILE_FENCE);
  fillRect(0, 0, 1, MAP_ROWS, TILE_FENCE);
  fillRect(MAP_COLS - 1, 0, 1, MAP_ROWS, TILE_FENCE);

  for (i = 0; i < PATHS_H.length; i++) {
    var ph = PATHS_H[i];
    fillRect(ph.x, ph.y, ph.w, 2, TILE_PATH);
  }
  for (i = 0; i < PATHS_V.length; i++) {
    var pv = PATHS_V[i];
    fillRect(pv.x, pv.y, 2, pv.h, TILE_PATH);
  }

  enclosureData = [];
  for (i = 0; i < ZONES.length; i++) {
    var z = ZONES[i];
    var e = z.enclosure;
    fillRect(e.x - 1, e.y - 1, e.w + 2, e.h + 2, TILE_FENCE);
    fillRect(e.x, e.y, e.w, e.h, TILE_ENCLOSURE);
    for (var g = 0; g < z.gates.length; g++) {
      fillRect(z.gates[g].x, z.gates[g].y, 2, 1, TILE_GATE);
    }
    var center = zoneCenterGameCoords(z);
    enclosureData.push({
      zoneId: z.id,
      animalId: z.animalId,
      centerX: center.x,
      centerY: center.y,
      gatePx: (z.gates[0].x + 1) * TILE_SIZE,
      gatePy: z.gates[0].y * TILE_SIZE + TILE_SIZE / 2,
    });
  }
}

function fillRect(x, y, w, h, tile) {
  for (var i = y; i < y + h; i++) {
    for (var j = x; j < x + w; j++) {
      if (i >= 0 && i < MAP_ROWS && j >= 0 && j < MAP_COLS) {
        tileMap[i][j] = tile;
      }
    }
  }
}

function getTileAt(tx, ty) {
  if (ty < 0 || ty >= MAP_ROWS || tx < 0 || tx >= MAP_COLS) return -1;
  return tileMap[ty][tx];
}

function getTileAtPixel(px, py) {
  return getTileAt(Math.floor(px / TILE_SIZE), Math.floor(py / TILE_SIZE));
}

function canMove(entityType, px, py) {
  var tile = getTileAtPixel(px, py);
  if (tile < 0) return false;
  var perms = MOVE_PERMS[entityType];
  if (!perms) return false;
  if (tile in perms) return perms[tile];
  return true;
}

function canMoveRect(entityType, x, y, w, h) {
  return canMove(entityType, x + w / 2, y + h / 2);
}

function getCurrentZone() {
  return currentZone;
}

function setCurrentZone(zone) {
  currentZone = zone;
}

function tryEnterZone(entityType, px, py) {
  var tx = Math.floor(px / TILE_SIZE);
  var ty = Math.floor(py / TILE_SIZE);
  var tile = getTileAt(tx, ty);
  if (tile === TILE_GATE && entityType === 'keeper') {
    return getZoneAt(tx, ty + 1);
  }
  return null;
}

function renderTilemap(ctx, cam) {
  var startCol = Math.floor(cam.x / DISPLAY_TILE);
  var startRow = Math.floor(cam.y / DISPLAY_TILE);
  var endCol = startCol + Math.ceil(cam.w / DISPLAY_TILE) + 1;
  var endRow = startRow + Math.ceil(cam.h / DISPLAY_TILE) + 1;
  startCol = Math.max(0, startCol);
  startRow = Math.max(0, startRow);
  endCol = Math.min(MAP_COLS, endCol);
  endRow = Math.min(MAP_ROWS, endRow);

  for (var row = startRow; row < endRow; row++) {
    for (var col = startCol; col < endCol; col++) {
      var tile = tileMap[row][col];
      var sx = col * DISPLAY_TILE - cam.x;
      var sy = row * DISPLAY_TILE - cam.y;
      if (!tilesetCanvas) buildProceduralTileset();
      var srcX = tile * TILE_SIZE;
      ctx.drawImage(tilesetCanvas, srcX, 0, TILE_SIZE, TILE_SIZE, sx, sy, DISPLAY_TILE, DISPLAY_TILE);
    }
  }
}

function buildProceduralTileset() {
  var count = 8;
  tilesetCanvas = document.createElement('canvas');
  tilesetCanvas.width = TILE_SIZE * count;
  tilesetCanvas.height = TILE_SIZE;
  var ctx = tilesetCanvas.getContext('2d');

  for (var t = 0; t < count; t++) {
    var x = t * TILE_SIZE;
    ctx.fillStyle = TILE_COLORS_BG[t] || '#888';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);

    if (t === TILE_FENCE) {
      ctx.strokeStyle = '#4a3020';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, 2, 12, 12);
      ctx.fillStyle = '#8b6040';
      ctx.fillRect(x + 6, 2, 4, 12);
    }
    if (t === TILE_GATE) {
      ctx.strokeStyle = '#4a3020';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 2, 2, 12, 12);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 5, 3, 6, 10);
    }
    if (t === TILE_ENCLOSURE) {
      ctx.fillStyle = '#b8a868';
      ctx.fillRect(x + 2, 2, 4, 3);
      ctx.fillRect(x + 10, 5, 3, 4);
      ctx.fillRect(x + 5, 11, 4, 2);
    }
  }
}