var tileMap = [];
var enclosureData = [];

function buildMap() {
  var i, j;
  for (i = 0; i < MAP_ROWS; i++) {
    tileMap[i] = [];
    for (j = 0; j < MAP_COLS; j++) {
      tileMap[i][j] = TILE_GRASS_1;
    }
  }

  fillRect(0, 0, MAP_COLS, 1, TILE_FENCE);
  fillRect(0, MAP_ROWS - 1, MAP_COLS, 1, TILE_FENCE);
  fillRect(0, 0, 1, MAP_ROWS, TILE_FENCE);
  fillRect(MAP_COLS - 1, 0, 1, MAP_ROWS, TILE_FENCE);

  fillRect(1, MAP_ROWS - 2, 4, 1, TILE_DIRT);
  fillRect(5, MAP_ROWS - 2, 4, 1, TILE_COBBLE);

  fillRect(10, 34, 30, 1, TILE_DIRT);
  fillRect(24, 34, 2, 4, TILE_COBBLE);
  fillRect(24, 7, 2, 27, TILE_DIRT);
  fillRect(12, 18, 12, 2, TILE_DIRT);
  fillRect(26, 12, 12, 2, TILE_DIRT);
  fillRect(12, 26, 12, 2, TILE_DIRT);
  fillRect(12, 7, 2, 11, TILE_DIRT);
  fillRect(22, 7, 2, 11, TILE_DIRT);
  fillRect(12, 20, 2, 6, TILE_DIRT);
  fillRect(22, 20, 2, 6, TILE_DIRT);
  fillRect(38, 7, 2, 13, TILE_DIRT);
  fillRect(38, 12, 10, 2, TILE_DIRT);

  enclosureData = [];
  addEnclosure('leon', 2, 2, 10, 10);
  addEnclosure('cabra', 26, 2, 10, 10);
  addEnclosure('pantera', 2, 22, 10, 10);
  addEnclosure('panda', 40, 2, 8, 8);

  fillRect(28, 26, 3, 3, TILE_WATER);
  fillRect(30, 27, 2, 2, TILE_WATER);
  fillRect(29, 26, 1, 1, TILE_GRASS_1);

  fillRect(40, 24, 8, 6, TILE_WALL);
  fillRect(41, 25, 6, 4, TILE_FLOOR);
  fillRect(42, 24, 2, 1, TILE_FENCE);
  fillRect(42, 29, 2, 1, TILE_COBBLE);

  addTrees();
}

function addEnclosure(animalId, x, y, w, h) {
  fillRect(x, y, w + 2, h + 2, TILE_FENCE);
  fillRect(x + 1, y + 1, w, h, TILE_ENCLOSURE);
  fillRect(x + 2, y, 2, 1, TILE_COBBLE);
  enclosureData.push({
    animalId: animalId,
    centerX: (x + 1 + w / 2) * TILE_SIZE,
    centerY: (y + 1 + h / 2) * TILE_SIZE,
    gateX: (x + 2 + 0.5) * TILE_SIZE,
    gateY: (y + 0.5) * TILE_SIZE,
  });
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

function addTrees() {
  var treeSpots = [
    [5, 14], [9, 14], [15, 4], [18, 4], [22, 4],
    [40, 3], [43, 3], [46, 5], [5, 20], [20, 22],
    [5, 34], [8, 36], [33, 30], [36, 30], [45, 15],
    [47, 18], [15, 34], [18, 34], [22, 34], [40, 34],
    [8, 8], [20, 16], [35, 20], [44, 10], [48, 12],
  ];
  for (var t = 0; t < treeSpots.length; t++) {
    var tx = treeSpots[t][0];
    var ty = treeSpots[t][1];
    if (tileMap[ty] && tileMap[ty][tx] === TILE_GRASS_1) {
      tileMap[ty][tx] = TILE_GRASS_2;
    }
  }
}

function getTileAtPixel(px, py) {
  var col = Math.floor(px / TILE_SIZE);
  var row = Math.floor(py / TILE_SIZE);
  if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return -1;
  return tileMap[row][col];
}

function canWalkAt(px, py) {
  var tile = getTileAtPixel(px, py);
  if (tile < 0) return false;
  return isWalkable(tile);
}

function canWalkRect(x, y, w, h) {
  var margin = 2;
  var cx = x + margin;
  var cy = y + margin;
  var cw = w - margin * 2;
  var ch = h - margin * 2;
  return canWalkAt(cx, cy)
    && canWalkAt(cx + cw, cy)
    && canWalkAt(cx, cy + ch)
    && canWalkAt(cx + cw, cy + ch);
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
      drawTile(ctx, tile, sx, sy);
    }
  }
}