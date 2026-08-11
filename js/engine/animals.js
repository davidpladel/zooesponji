function Animal(animalId, x, y) {
  Entity.call(this, x, y);
  this.animalId = animalId;
  this.fillColor = getAnimalColor(animalId);
  this.spriteKey = animalId;
  this.spriteCols = 1;
  this.spriteRows = 1;
  this.w = TILE_SIZE * 2;
  this.h = TILE_SIZE * 2;
  this.facing = 'left';
  this.baseX = x;
  this.baseY = y;
  this.wanderTimer = 0;
  this.wanderDir = 0;
  this.state = 'normal';
  this.stateTimer = 0;
}

Animal.prototype = Object.create(Entity.prototype);
Animal.prototype.constructor = Animal;

function getAnimalColor(id) {
  var colors = { leon: '#daa520', cabra: '#d2d2d2', pantera: '#2d2d2d', panda: '#f5f5f5' };
  return colors[id] || '#888';
}

Animal.prototype.update = function (dt) {
  if (this.state !== 'normal') {
    this.stateTimer -= dt;
    if (this.stateTimer <= 0) {
      this.state = 'normal';
    }
    return;
  }

  this.wanderTimer -= dt;
  if (this.wanderTimer <= 0) {
    this.wanderTimer = 1.5 + Math.random() * 2;
    this.wanderDir = Math.random();
    if (this.wanderDir < 0.3) this.facing = 'left';
    else if (this.wanderDir < 0.6) this.facing = 'right';
    else if (this.wanderDir < 0.8) this.moving = true;
    else this.moving = false;
  }

  if (this.moving) {
    var dx = this.facing === 'left' ? -0.3 : 0.3;
    var nx = this.x + dx;
    if (canWalkRect(nx, this.y, this.w, this.h) && Math.abs(nx - this.baseX) < TILE_SIZE * 6) {
      this.x = nx;
    } else {
      this.facing = this.facing === 'left' ? 'right' : 'left';
    }
  }

  Entity.prototype.update.call(this, dt);
};

Animal.prototype.react = function (reaction) {
  this.state = reaction;
  this.stateTimer = 1.5;
  this.moving = false;
};

Animal.prototype.render = function (ctx, cam) {
  var sx = this.x * SCALE - cam.x;
  var sy = this.y * SCALE - cam.y;
  var sw = this.w * SCALE;
  var sh = this.h * SCALE;

  if (this.state === 'come') sy -= 6;
  if (this.state === 'rechaza') sy += 2;

  if (this.renderSprite(ctx, cam)) {
    if (this.state === 'come') {
      ctx.fillStyle = '#ffeb3b';
      ctx.font = (14 * SCALE) + 'px sans-serif';
      ctx.fillText('😋', sx + sw / 2 - 12, sy - 8);
    }
    if (this.state === 'rechaza') {
      ctx.fillStyle = '#ff5722';
      ctx.font = (14 * SCALE) + 'px sans-serif';
      ctx.fillText('😝', sx + sw / 2 - 12, sy - 8);
    }
    if (this.state === 'especial') {
      ctx.fillStyle = '#e91e63';
      ctx.font = (14 * SCALE) + 'px sans-serif';
      ctx.fillText('🥰', sx + sw / 2 - 12, sy - 16);
    }
    return;
  }

  ctx.fillStyle = this.fillColor;
  ctx.fillRect(sx, sy + 6, sw, sh - 6);

  ctx.fillStyle = this.state === 'come' ? '#ffeb3b' : this.state === 'rechaza' ? '#ff5722' : '#fff';
  var eyeX = this.facing === 'left' ? sx + sw * 0.3 : sx + sw * 0.55;
  ctx.fillRect(eyeX, sy + 10, 6, 6);

  if (this.state === 'come') {
    ctx.fillStyle = '#ffeb3b';
    ctx.font = (14 * SCALE) + 'px sans-serif';
    ctx.fillText('😋', sx + sw / 2 - 12, sy - 8);
  }
  if (this.state === 'rechaza') {
    ctx.fillStyle = '#ff5722';
    ctx.font = (14 * SCALE) + 'px sans-serif';
    ctx.fillText('😝', sx + sw / 2 - 12, sy - 8);
  }
  if (this.state === 'especial') {
    ctx.fillStyle = '#e91e63';
    ctx.font = (14 * SCALE) + 'px sans-serif';
    ctx.fillText('🥰', sx + sw / 2 - 12, sy - 16);
  }
};

Animal.prototype.getInteractionPoint = function () {
  return {
    x: this.x + this.w / 2,
    y: this.y + this.h,
  };
};