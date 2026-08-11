function Camera(x, y, w, h) {
  this.x = x || 0;
  this.y = y || 0;
  this.w = w || 640;
  this.h = h || 480;
}

Camera.prototype.follow = function (targetX, targetY) {
  this.x = targetX - this.w / 2;
  this.y = targetY - this.h / 2;

  if (this.x < 0) this.x = 0;
  if (this.y < 0) this.y = 0;

  var maxX = MAP_PX_W * SCALE - this.w;
  var maxY = MAP_PX_H * SCALE - this.h;
  if (this.x > maxX) this.x = maxX;
  if (this.y > maxY) this.y = maxY;
};

Camera.prototype.setSize = function (w, h) {
  this.w = w;
  this.h = h;
};