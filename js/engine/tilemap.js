var tileMap = [];
var enclosureData = [];

function buildMap() {
  var i, j;
  for (i = 0; i < MAP_ROWS; i++) {
    tileMap[i] = [];
    for (j = 0; j < MAP_COLS; j++) {
      tileMap[i][j] = (i === 0 || i === MAP_ROWS - 1 || j === 0 || j === MAP_COLS - 1) ? TILE_FENCE : TILE_GRASS_1;
    }
  }

  enclosureData = [];
  addEnclosure('leon', 3, 3, 9, 8);
  addEnclosure('cabra', 27, 3, 9, 8);
  addEnclosure('pantera', 3, 21, 9, 8);
  addEnclosure('panda', 40, 3, 7, 7);

function addEnclosure(animalId, x, y, w, h) {
  enclosureData.push({
    animalId: animalId,
    centerX: (x + w / 2) * TILE_SIZE,
    centerY: (y + h / 2) * TILE_SIZE,
    gateX: (x + 1.5) * TILE_SIZE,
    gateY: y * TILE_SIZE,
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