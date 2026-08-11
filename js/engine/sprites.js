var spriteCache = {};
var spriteTileset = null;
var spriteTilesetCols = 16;
var spriteTilesetRows = 4;
var spriteTileSrcW = 0;
var spriteTileSrcH = 0;
var hasSpriteTileset = false;
var spriteTileMap = {};

function initSpriteTileset(cols, rows, mapping) {
  spriteTilesetCols = cols;
  spriteTilesetRows = rows;
  spriteTileMap = mapping || {};
}

function loadSpriteTileset(src, callback) {
  var img = new Image();
  img.onload = function () {
    spriteTileset = img;
    spriteTileSrcW = Math.floor(img.width / spriteTilesetCols);
    spriteTileSrcH = Math.floor(img.height / spriteTilesetRows);
    hasSpriteTileset = true;
    if (callback) callback();
  };
  img.onerror = function () {
    hasSpriteTileset = false;
    if (callback) callback();
  };
  img.src = src;
}

function drawSpriteTile(ctx, tileId, screenX, screenY) {
  if (!hasSpriteTileset || !spriteTileset) {
    drawTile(ctx, tileId, screenX, screenY);
    return;
  }

  var idx = spriteTileMap[tileId];
  if (idx === undefined) {
    drawTile(ctx, tileId, screenX, screenY);
    return;
  }

  var col = idx % spriteTilesetCols;
  var row = Math.floor(idx / spriteTilesetCols);
  var sx = col * spriteTileSrcW;
  var sy = row * spriteTileSrcH;

  ctx.drawImage(spriteTileset, sx, sy, spriteTileSrcW, spriteTileSrcH, screenX, screenY, DISPLAY_TILE, DISPLAY_TILE);
}

function loadSprite(key, src, callback) {
  var img = new Image();
  img.onload = function () {
    spriteCache[key] = img;
    if (callback) callback(img);
  };
  img.onerror = function () {
    if (callback) callback(null);
  };
  img.src = src;
}

function getSprite(key) {
  return spriteCache[key] || null;
}

function drawSpriteFrame(ctx, key, frameCol, frameRow, framesW, framesH, dx, dy, dw, dh) {
  var img = spriteCache[key];
  if (!img) return false;
  var fw = Math.floor(img.width / framesW);
  var fh = Math.floor(img.height / framesH);
  var sx = frameCol * fw;
  var sy = frameRow * fh;
  ctx.drawImage(img, sx, sy, fw, fh, dx, dy, dw || fw * SCALE, dh || fh * SCALE);
  return true;
}