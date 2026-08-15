function Visitor(x, y, spriteKey) {
  Entity.call(this, x, y, 'visitor');
  this.spriteKey = spriteKey || 'visitante-1';
  this.spriteCols = 3;
  this.spriteRows = 4;
  this.w = TILE_SIZE * 1.5;
  this.h = TILE_SIZE * 1.5;
  this.speed = 1.2 + Math.random() * 0.4;
  this.facing = 'down';
  this.path = [];
  this.pathIdx = 0;
  this.waitTimer = 0;
  this.moving = false;
  this.fillColor = null;
}

Visitor.prototype = Object.create(Entity.prototype);
Visitor.prototype.constructor = Visitor;

Visitor.prototype.update = function (dt) {
  if (gameState !== 'map') return;
  if (this.path.length === 0 || this.pathIdx >= this.path.length) {
    if (this.waitTimer > 0) {
      this.waitTimer -= dt;
      this.moving = false;
    } else {
      this.findNewPath();
    }
  }

  if (this.path.length > 0 && this.pathIdx < this.path.length) {
    var wp = this.path[this.pathIdx];
    var tx = wp.x * TILE_SIZE + TILE_SIZE / 2;
    var ty = wp.y * TILE_SIZE + TILE_SIZE / 2;
    var dx = tx - this.x;
    var dy = ty - this.y;
    var dist = Math.hypot(dx, dy);

    if (dist < 3) {
      this.pathIdx++;
      if (this.pathIdx >= this.path.length) {
        this.waitTimer = 1.5 + Math.random() * 3;
        this.moving = false;
      }
    } else {
      this.moving = true;
      if (Math.abs(dx) >= Math.abs(dy)) {
        this.facing = dx > 0 ? 'right' : 'left';
      } else {
        this.facing = dy > 0 ? 'down' : 'up';
      }
      var spd = this.speed;
      this.x += (dx / dist) * spd;
      this.y += (dy / dist) * spd;
    }
  }

  Entity.prototype.update.call(this, dt);
};

Visitor.prototype.findNewPath = function () {
  this.waitTimer = 0;
  var sc = Math.floor(this.x / TILE_SIZE);
  var sr = Math.floor(this.y / TILE_SIZE);

  var pathTiles = [];
  for (var ty = 0; ty < MAP_ROWS; ty++) {
    for (var tx = 0; tx < MAP_COLS; tx++) {
      if (tileMap[ty][tx] === TILE_PATH) {
        pathTiles.push({ tx: tx, ty: ty });
      }
    }
  }

  var best = null;
  for (var attempt = 0; attempt < 20; attempt++) {
    var r = pathTiles[Math.floor(Math.random() * pathTiles.length)];
    if (r.tx === sc && r.ty === sr) continue;
    var p = astar(sc, sr, r.tx, r.ty);
    if (p && p.length > 1) {
      best = p;
      break;
    }
  }

  if (best) {
    this.path = best;
    this.pathIdx = 1;
  } else {
    this.path = [];
    this.pathIdx = 0;
    this.waitTimer = 2;
  }
};

Visitor.prototype.render = function (ctx, cam) {
  if (this.renderSprite(ctx, cam)) return;
  var sx = this.x * SCALE - cam.x;
  var sy = this.y * SCALE - cam.y;
  ctx.fillStyle = '#ff9800';
  ctx.fillRect(sx, sy, this.w * SCALE, this.h * SCALE);
};

function spawnVisitors() {
  var pathTiles = [];
  for (var ty = 0; ty < MAP_ROWS; ty++) {
    for (var tx = 0; tx < MAP_COLS; tx++) {
      if (tileMap[ty][tx] === TILE_PATH) {
        pathTiles.push({ tx: tx, ty: ty });
      }
    }
  }

  var count = 3;
  var spriteKeys = ['visitante-1', 'visitante-2', 'visitante-3'];

  for (var i = 0; i < count; i++) {
    var idx = Math.floor(Math.random() * pathTiles.length);
    var tile = pathTiles[idx];
    var vx = tile.tx * TILE_SIZE + TILE_SIZE / 2;
    var vy = tile.ty * TILE_SIZE + TILE_SIZE / 2;
    var v = new Visitor(vx, vy, spriteKeys[i % spriteKeys.length]);
    entities.push(v);
  }
}