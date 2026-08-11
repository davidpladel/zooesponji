function Visitor(x, y, spriteKey) {
  Entity.call(this, x, y);
  this.spriteKey = spriteKey || 'visitante-1';
  this.spriteCols = 3;
  this.spriteRows = 4;
  this.w = TILE_SIZE * 1.5;
  this.h = TILE_SIZE * 1.5;
  this.speed = 0.8 + Math.random() * 0.6;
  this.facing = 'down';
  this.wanderTimer = 0;
  this.pauseTimer = 0;
  this.targetX = x;
  this.targetY = y;
  this.fillColor = null;
}

Visitor.prototype = Object.create(Entity.prototype);
Visitor.prototype.constructor = Visitor;

Visitor.prototype.update = function (dt) {
  if (this.pauseTimer > 0) {
    this.pauseTimer -= dt;
    this.moving = false;
    Entity.prototype.update.call(this, dt);
    return;
  }

  this.wanderTimer -= dt;
  if (this.wanderTimer <= 0) {
    this.wanderTimer = 2 + Math.random() * 4;
    this.targetX = this.x + (Math.random() - 0.5) * TILE_SIZE * 8;
    this.targetY = this.y + (Math.random() - 0.5) * TILE_SIZE * 8;
    this.targetX = Math.max(TILE_SIZE, Math.min(MAP_PX_W - TILE_SIZE, this.targetX));
    this.targetY = Math.max(TILE_SIZE, Math.min(MAP_PX_H - TILE_SIZE, this.targetY));
  }

  var dx = this.targetX - this.x;
  var dy = this.targetY - this.y;
  var dist = Math.hypot(dx, dy);

  if (dist < 2) {
    this.pauseTimer = 1 + Math.random() * 3;
    this.moving = false;
  } else {
    this.moving = true;
    var speed = this.speed;
    if (Math.abs(dx) >= Math.abs(dy)) {
      this.facing = dx > 0 ? 'right' : 'left';
    } else {
      this.facing = dy > 0 ? 'down' : 'up';
    }
    var nx = this.x + (dx / dist) * speed;
    var ny = this.y + (dy / dist) * speed;
    if (canWalkRect(nx, this.y, this.w, this.h)) this.x = nx;
    if (canWalkRect(this.x, ny, this.w, this.h)) this.y = ny;
  }

  Entity.prototype.update.call(this, dt);
};

Visitor.prototype.render = function (ctx, cam) {
  if (this.renderSprite(ctx, cam)) return;
  var sx = this.x * SCALE - cam.x;
  var sy = this.y * SCALE - cam.y;
  ctx.fillStyle = '#ff9800';
  ctx.fillRect(sx, sy, this.w * SCALE, this.h * SCALE);
};

function spawnVisitors() {
  var visitorSpots = [
    [12, 34], [18, 34], [30, 34], [36, 34],
    [14, 18], [20, 18], [28, 14], [34, 14],
    [40, 10], [45, 8], [8, 14], [8, 26],
    [16, 8], [24, 22], [20, 26],
  ];
  var spriteKeys = ['visitante-1', 'visitante-2', 'visitante-3'];

  for (var i = 0; i < visitorSpots.length; i++) {
    var vx = visitorSpots[i][0] * TILE_SIZE + TILE_SIZE / 2;
    var vy = visitorSpots[i][1] * TILE_SIZE + TILE_SIZE / 2;
    var v = new Visitor(vx, vy, spriteKeys[i % spriteKeys.length]);
    entities.push(v);
  }
}