function Visitor(x, y, spriteKey) {
  Entity.call(this, x, y, 'visitor');
  this.spriteKey = spriteKey || 'visitante-1';
  this.spriteCols = 3;
  this.spriteRows = 4;
  this.w = TILE_SIZE * 1.5;
  this.h = TILE_SIZE * 1.5;
  this.speed = 0.9 + Math.random() * 0.5;
  this.facing = 'down';
  this.wanderTimer = 0;
  this.dirX = 0;
  this.dirY = 1;
  this.targetX = x;
  this.targetY = y;
  this.moving = true;
  this.fillColor = null;
}

Visitor.prototype = Object.create(Entity.prototype);
Visitor.prototype.constructor = Visitor;

Visitor.prototype.update = function (dt) {
  this.wanderTimer -= dt;

  var dx = this.targetX - this.x;
  var dy = this.targetY - this.y;
  var dist = Math.hypot(dx, dy);

  if (dist < 6 || this.wanderTimer <= 0) {
    this.pickNewTarget();
  }

  dx = this.targetX - this.x;
  dy = this.targetY - this.y;
  dist = Math.hypot(dx, dy);

  if (dist > 1) {
    this.dirX += (dx / dist - this.dirX) * 0.08;
    this.dirY += (dy / dist - this.dirY) * 0.08;
    var dlen = Math.hypot(this.dirX, this.dirY);
    if (dlen > 0) { this.dirX /= dlen; this.dirY /= dlen; }

    if (Math.abs(this.dirX) >= Math.abs(this.dirY)) {
      this.facing = this.dirX > 0 ? 'right' : 'left';
    } else {
      this.facing = this.dirY > 0 ? 'down' : 'up';
    }

    this.moving = true;
    var nx = this.x + this.dirX * this.speed;
    var ny = this.y + this.dirY * this.speed;
    if (canMoveRect('visitor', nx, this.y, this.w, this.h)) this.x = nx;
    else { this.pickNewTarget(); }
    if (canMoveRect('visitor', this.x, ny, this.w, this.h)) this.y = ny;
    else { this.pickNewTarget(); }
  }

  Entity.prototype.update.call(this, dt);
};

Visitor.prototype.pickNewTarget = function () {
  this.wanderTimer = 3 + Math.random() * 4;
  var angle = Math.random() * Math.PI * 2;
  var range = TILE_SIZE * 8 + Math.random() * TILE_SIZE * 14;
  this.targetX = this.x + Math.cos(angle) * range;
  this.targetY = this.y + Math.sin(angle) * range;
  this.targetX = Math.max(TILE_SIZE * 2, Math.min(MAP_PX_W - TILE_SIZE * 2, this.targetX));
  this.targetY = Math.max(TILE_SIZE * 2, Math.min(MAP_PX_H - TILE_SIZE * 2, this.targetY));
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