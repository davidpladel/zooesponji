function Player(x, y) {
  Entity.call(this, x, y, 'keeper');
  this.fillColor = '#4caf50';
  this.w = TILE_SIZE * 2;
  this.h = TILE_SIZE * 2;
  this.speed = PLAYER_SPEED * 1.2;
  this.spriteKey = 'cuidador';
  this.spriteCols = 3;
  this.spriteRows = 4;
  this.inZone = null;
  this.keys = {};
  this.touchActive = false;
  this.touchDX = 0;
  this.touchDY = 0;
  this.touchStartX = 0;
  this.touchStartY = 0;
  this.touchId = null;

  this.bindInput();
}

Player.prototype = Object.create(Entity.prototype);
Player.prototype.constructor = Player;

Player.prototype.bindInput = function () {
  var self = this;

  document.addEventListener('keydown', function (e) {
    self.keys[e.key] = true;
    e.preventDefault();
  });

  document.addEventListener('keyup', function (e) {
    self.keys[e.key] = false;
  });

  var canvas = document.getElementById('game-canvas');
  if (!canvas) return;

  canvas.addEventListener('touchstart', function (e) {
    if (self.touchActive) return;
    var t = e.changedTouches[0];
    self.touchActive = true;
    self.touchStartX = t.clientX;
    self.touchStartY = t.clientY;
    self.touchId = t.identifier;
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchmove', function (e) {
    if (!self.touchActive) return;
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === self.touchId) {
        var t = e.changedTouches[i];
        var dx = t.clientX - self.touchStartX;
        var dy = t.clientY - self.touchStartY;
        var dist = Math.hypot(dx, dy);
        var threshold = 15;
        if (dist > threshold) {
          var angle = Math.atan2(dy, dx);
          var clamped = Math.min(dist, 60);
          self.touchDX = Math.cos(angle) * (clamped / 60);
          self.touchDY = Math.sin(angle) * (clamped / 60);
        } else {
          self.touchDX = 0;
          self.touchDY = 0;
        }
        e.preventDefault();
        return;
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchend', function (e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === self.touchId) {
        self.touchActive = false;
        self.touchDX = 0;
        self.touchDY = 0;
        self.touchId = null;
        return;
      }
    }
  });

  canvas.addEventListener('touchcancel', function () {
    self.touchActive = false;
    self.touchDX = 0;
    self.touchDY = 0;
    self.touchId = null;
  });
};

Player.prototype.update = function (dt) {
  var dx = 0;
  var dy = 0;

  if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) dy = -1;
  if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) dy = 1;
  if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) dx = -1;
  if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) dx = 1;

  if (this.touchActive) {
    dx = this.touchDX;
    dy = this.touchDY;
  }

  var wasMoving = this.moving;
  this.moving = dx !== 0 || dy !== 0;

  if (this.moving) {
    if (Math.abs(dx) >= Math.abs(dy)) {
      this.facing = dx > 0 ? 'right' : 'left';
    } else {
      this.facing = dy > 0 ? 'down' : 'up';
    }

    var len = Math.hypot(dx, dy);
    dx = (dx / len) * this.speed;
    dy = (dy / len) * this.speed;

    var nx = this.x + dx;
    var ny = this.y + dy;

    var eType = this.inZone ? 'animal' : 'keeper';
    if (canMoveRect(eType, nx, this.y, this.w, this.h)) this.x = nx;
    else if (dx !== 0) {
      if (canMoveRect(eType, this.x + Math.sign(dx), this.y, this.w, this.h)) this.x += Math.sign(dx);
    }
    if (canMoveRect(eType, this.x, ny, this.w, this.h)) this.y = ny;
    else if (dy !== 0) {
      if (canMoveRect(eType, this.x, this.y + Math.sign(dy), this.w, this.h)) this.y += Math.sign(dy);
    }

    var entered = tryEnterZone('keeper', this.x + this.w / 2, this.y + this.h / 2);
    if (entered) { this.inZone = entered; }
    if (this.inZone) {
      var ez = this.inZone.enclosure;
      var ex = ez.x * TILE_SIZE;
      var ey = ez.y * TILE_SIZE;
      var ew = ez.w * TILE_SIZE;
      var eh = ez.h * TILE_SIZE;
      var cx = this.x + this.w / 2;
      var cy = this.y + this.h / 2;
      if (cx < ex || cx > ex + ew || cy < ey || cy > ey + eh) {
        this.inZone = null;
      }
    }
  }

  Entity.prototype.update.call(this, dt);
};

Player.prototype.render = function (ctx, cam) {
  if (this.renderSprite(ctx, cam)) return;

  var sx = this.x * SCALE - cam.x;
  var sy = this.y * SCALE - cam.y;
  var sw = this.w * SCALE;
  var sh = this.h * SCALE;

  var bounce = this.moving ? Math.sin(this.animTimer * 18) * 2 : 0;
  sy += bounce;

  ctx.fillStyle = this.fillColor;
  ctx.fillRect(sx + 4, sy + 4, sw - 8, sh - 8);

  ctx.fillStyle = '#ffcc80';
  ctx.beginPath();
  ctx.arc(sx + sw / 2, sy + 8, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  var eyeY = sy + 14;
  ctx.fillRect(sx + 18, eyeY, 5, 5);
  ctx.fillRect(sx + 36, eyeY, 5, 5);

  ctx.fillStyle = '#333';
  ctx.fillRect(sx + 20, eyeY + 2, 3, 3);
  ctx.fillRect(sx + 38, eyeY + 2, 3, 3);

  ctx.fillStyle = '#2e7d32';
  ctx.fillRect(sx + 8, sy + 30, sw - 16, 10);

  ctx.fillStyle = '#1b5e20';
  ctx.fillRect(sx + 8, sy + 40, sw - 10, 6);

  ctx.fillStyle = '#795548';
  ctx.fillRect(sx + 8, sy + 44, sw - 14, 3);
  ctx.fillRect(sx + sw - 8, sy + 44, 4, 3);
};