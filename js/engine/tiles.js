var TILE_GRASS_1 = 0;
var TILE_GRASS_2 = 1;
var TILE_DIRT = 2;
var TILE_COBBLE = 3;
var TILE_FENCE = 4;
var TILE_WATER = 5;
var TILE_WALL = 6;
var TILE_FLOOR = 7;
var TILE_ENCLOSURE = 8;

var TILE_COLORS = {};
TILE_COLORS[TILE_GRASS_1] = '#7ec850';
TILE_COLORS[TILE_GRASS_2] = '#6db840';
TILE_COLORS[TILE_DIRT] = '#c4a45a';
TILE_COLORS[TILE_COBBLE] = '#9e9e9e';
TILE_COLORS[TILE_FENCE] = '#6d4c2e';
TILE_COLORS[TILE_WATER] = '#4a90d9';
TILE_COLORS[TILE_WALL] = '#5c5c5c';
TILE_COLORS[TILE_FLOOR] = '#d4c4a8';
TILE_COLORS[TILE_ENCLOSURE] = '#c8b878';

var TILE_WALKABLE_MAP = {};
TILE_WALKABLE_MAP[TILE_GRASS_1] = true;
TILE_WALKABLE_MAP[TILE_GRASS_2] = true;
TILE_WALKABLE_MAP[TILE_DIRT] = true;
TILE_WALKABLE_MAP[TILE_COBBLE] = true;
TILE_WALKABLE_MAP[TILE_FENCE] = false;
TILE_WALKABLE_MAP[TILE_WATER] = false;
TILE_WALKABLE_MAP[TILE_WALL] = false;
TILE_WALKABLE_MAP[TILE_FLOOR] = true;
TILE_WALKABLE_MAP[TILE_ENCLOSURE] = true;

var tilesetCanvas = null;

function buildTileset() {
  var count = 9;
  tilesetCanvas = document.createElement('canvas');
  tilesetCanvas.width = TILE_SIZE * count;
  tilesetCanvas.height = TILE_SIZE;
  var ctx = tilesetCanvas.getContext('2d');

  var types = [TILE_GRASS_1, TILE_GRASS_2, TILE_DIRT, TILE_COBBLE, TILE_FENCE, TILE_WATER, TILE_WALL, TILE_FLOOR, TILE_ENCLOSURE];

  for (var i = 0; i < types.length; i++) {
    var t = types[i];
    var x = i * TILE_SIZE;
    ctx.fillStyle = TILE_COLORS[t];
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);

    if (t === TILE_GRASS_1 || t === TILE_GRASS_2) {
      ctx.fillStyle = t === TILE_GRASS_1 ? '#6ab840' : '#5ea838';
      for (var g = 0; g < 3; g++) {
        var gx = x + 3 + (g * 5) + ((i + g) % 3);
        var gy = 3 + ((g * 7) % 10);
        ctx.fillRect(gx, gy, 2, 3);
      }
    }

    if (t === TILE_DIRT) {
      ctx.fillStyle = '#b3944a';
      ctx.fillRect(x + 2, yDot(5), 3, 2);
      ctx.fillRect(x + 10, yDot(2), 2, 2);
      ctx.fillRect(x + 7, yDot(10), 2, 3);
    }

    if (t === TILE_COBBLE) {
      ctx.fillStyle = '#b0b0b0';
      ctx.fillRect(x + 1, 1, 6, 6);
      ctx.fillRect(x + 9, 1, 6, 6);
      ctx.fillRect(x + 1, 9, 6, 6);
      ctx.fillRect(x + 9, 9, 6, 6);
      ctx.fillStyle = '#8a8a8a';
      ctx.fillRect(x, 0, 1, TILE_SIZE);
      ctx.fillRect(x, 7, TILE_SIZE, 1);
      ctx.fillRect(x, 15, TILE_SIZE, 1);
    }

    if (t === TILE_FENCE) {
      ctx.strokeStyle = '#4a3020';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, 2, 12, 12);
      ctx.fillStyle = '#8b6040';
      ctx.fillRect(x + 6, 2, 4, 12);
    }

    if (t === TILE_WATER) {
      ctx.fillStyle = '#3a7ac0';
      ctx.fillRect(x + 2, yDot(4), 12, 2);
      ctx.fillRect(x + 4, yDot(9), 8, 2);
    }

    if (t === TILE_WALL) {
      ctx.fillStyle = '#4a4a4a';
      ctx.fillRect(x + 1, 1, 6, 6);
      ctx.fillRect(x + 9, 1, 6, 6);
      ctx.fillRect(x + 1, 9, 6, 6);
      ctx.fillRect(x + 9, 9, 6, 6);
      ctx.strokeStyle = '#3a3a3a';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, 0.5, 15, 15);
    }

    if (t === TILE_FLOOR) {
      ctx.fillStyle = '#c4b498';
      for (var fy = 0; fy < TILE_SIZE; fy += 4) {
        ctx.fillRect(x, fy, TILE_SIZE, 1);
      }
      ctx.strokeStyle = '#b4a488';
      ctx.lineWidth = 0.5;
      for (var fx = 0; fx < TILE_SIZE; fx += 4) {
        ctx.beginPath();
        ctx.moveTo(x + fx + 0.5, 0);
        ctx.lineTo(x + fx + 0.5, TILE_SIZE);
        ctx.stroke();
      }
    }

    if (t === TILE_ENCLOSURE) {
      ctx.fillStyle = '#b8a868';
      ctx.fillRect(x + 2, 2, 4, 3);
      ctx.fillRect(x + 10, 5, 3, 4);
      ctx.fillRect(x + 5, 11, 4, 2);
    }
  }

  function yDot(y) { return y; }
}

function isWalkable(tileId) {
  return !!TILE_WALKABLE_MAP[tileId];
}

function drawTile(ctx, tileId, screenX, screenY) {
  if (hasSpriteTileset) {
    drawSpriteTile(ctx, tileId, screenX, screenY);
    return;
  }
  if (!tilesetCanvas) buildTileset();
  var sx = tileId * TILE_SIZE;
  ctx.drawImage(tilesetCanvas, sx, 0, TILE_SIZE, TILE_SIZE, screenX, screenY, DISPLAY_TILE, DISPLAY_TILE);
}