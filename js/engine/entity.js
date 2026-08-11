var FACING_ROWS = { down: 0, up: 1, left: 2, right: 3 };

function Entity(x, y) {
  this.x = x || 0;
  this.y = y || 0;
  this.w = TILE_SIZE;
  this.h = TILE_SIZE;
  this.spriteKey = null;
  this.spriteCols = 3;
  this.spriteRows = 4;
  this.facing = 'down';
  this.animFrame = 0;
  this.animTimer = 0;
  this.moving = false;
  this.fillColor = null;
}

Entity.prototype.update = function (dt) {
  if (this.moving) {
    this.animTimer += dt;
    if (this.animTimer > 0.15) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 3;
    }
  } else {
    this.animFrame = 0;
    this.animTimer = 0;
  }
};

Entity.prototype.hasSprite = function () {
  return this.spriteKey && !!getSprite(this.spriteKey);
};

Entity.prototype.renderSprite = function (ctx, cam, scaleX, scaleY) {
  if (!this.hasSprite()) return false;
  var sx = scaleX || SCALE;
  var sy = scaleY || SCALE;
  var dx = this.x * SCALE - cam.x;
  var dy = this.y * SCALE - cam.y;
  var row = FACING_ROWS[this.facing] || 0;
  var col = this.animFrame % this.spriteCols;
  var img = getSprite(this.spriteKey);
  var fw = Math.floor(img.width / this.spriteCols);
  var fh = Math.floor(img.height / this.spriteRows);
  ctx.drawImage(img, col * fw, row * fh, fw, fh, dx, dy, fw * sx, fh * sy);
  return true;
};

Entity.prototype.render = function (ctx, cam) {
  var sx = this.x * SCALE - cam.x;
  var sy = this.y * SCALE - cam.y;
  var sw = this.w * SCALE;
  var sh = this.h * SCALE;

  ctx.fillStyle = this.fillColor || '#ff6b6b';
  ctx.fillRect(sx, sy, sw, sh);

  var eyeSize = Math.max(2, Math.floor(sw * 0.15));
  ctx.fillStyle = '#fff';
  var eyeX = sx + sw * 0.25;
  var eyeY = sy + sh * 0.3;
  ctx.fillRect(eyeX, eyeY, eyeSize, eyeSize);
  ctx.fillRect(eyeX + sw * 0.3, eyeY, eyeSize, eyeSize);

  if (this.moving) {
    var bounce = Math.sin(this.animTimer * 20) * 2;
    sy += bounce;
    ctx.fillStyle = this.fillColor || '#ff6b6b';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = '#fff';
    ctx.fillRect(eyeX, eyeY + bounce, eyeSize, eyeSize);
    ctx.fillRect(eyeX + sw * 0.3, eyeY + bounce, eyeSize, eyeSize);
  }
};