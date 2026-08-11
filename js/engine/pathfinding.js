function astar(sx, sy, gx, gy) {
  var key = function(x,y){ return x+','+y; };
  var open = [], closed = {};
  var start = { x: sx, y: sy, g: 0, f: 0, parent: null };
  open.push(start);

  while (open.length > 0) {
    open.sort(function(a,b){ return b.f - a.f; });
    var cur = open.pop();
    var ck = key(cur.x, cur.y);

    if (cur.x === gx && cur.y === gy) {
      var path = [];
      while (cur) { path.unshift({ x: cur.x, y: cur.y }); cur = cur.parent; }
      return path;
    }

    if (closed[ck]) continue;
    closed[ck] = true;

    var dirs = [[0,-1],[0,1],[-1,0],[1,0]];
    for (var d = 0; d < 4; d++) {
      var nx = cur.x + dirs[d][0], ny = cur.y + dirs[d][1];
      var nk = key(nx, ny);
      if (closed[nk]) continue;
      var tile = getTileAt(nx, ny);
      if (tile < 0) continue;
      if (tile !== TILE_PATH && tile !== TILE_GATE) continue;

      var ng = cur.g + 1;
      var nh = Math.abs(nx - gx) + Math.abs(ny - gy);
      open.push({ x: nx, y: ny, g: ng, f: ng + nh, parent: cur });
    }
  }
  return null;
}