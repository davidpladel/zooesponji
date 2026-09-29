# Escenas Inmersivas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir escenas canvas inmersivas de alimentación (arrastre) y tienda (compra visual) como overlays sobre el mapa congelado.

**Architecture:** Nuevo módulo `scenes.js` con estado global `gameState`, funciones de render/update/input por escena. Game loop bifurca en `game.js` según estado. Entidades se congelan con guard `gameState === 'map'`. Render: mapa → overlay oscuro → escena activa.

**Tech Stack:** Vanilla JS (ES5, sin módulos), Canvas 2D, Pointer Events, localStorage.

**Spec:** `docs/superpowers/specs/2026-08-15-escenas-inmersivas-design.md`

## Global Constraints

- Sin nuevas dependencias npm ni ES modules.
- Sin cambios en `data.js`, `coins.js`, `sound.js`, `zones.js`, `tilemap.js`, `camera.js`, `pathfinding.js`.
- Los overlays DOM actuales (`feed-panel`, `shop-overlay`) se mantienen en el código pero dejan de usarse.
- Fallback procedural para toda imagen que no exista.

---

## File Structure

| File | Responsibility |
|---|---|
| `js/engine/scenes.js` (nuevo) | Estado global `gameState`, carga de imágenes con fallback, render/update/input de escena feed y shop. |
| `js/engine/game.js` (modificar) | Bifurcar `gameLoop()` y `render()` por `gameState`. Conectar HUD a `startFeedingScene()` y `startShopScene()`. |
| `js/engine/player.js` (modificar) | Guard `if (gameState !== 'map') return;` al inicio de `update()`. |
| `js/engine/animals.js` (modificar) | Guard `if (gameState !== 'map') return;` al inicio de `update()`. |
| `js/engine/visitors.js` (modificar) | Guard `if (gameState !== 'map') return;` en `VisitorsManager.update()`. |
| `index.html` (modificar) | Añadir `<script>` para cargar `js/engine/scenes.js` (antes de game.js). |

---

### Task 1: Módulo scenes.js — esqueleto y estado

**Files:**
- Create: `js/engine/scenes.js`
- Modify: `index.html`

**Interfaces:**
- Produces: `gameState`, `feedAnimalId`, `sceneImages`, `setGameState(state, data)`, `sceneLoadImage(path)`, `sceneDrawCloseButton(ctx, w)`, `sceneRectHit(px, py, rx, ry, rw, rh)`

- [ ] **Step 1: Crear js/engine/scenes.js con estado global y helpers**

```js
var gameState = 'map';
var feedAnimalId = null;
var feedFoodIcons = [];
var draggedFood = null;
var draggedFoodX = 0;
var draggedFoodY = 0;
var dragStartX = 0;
var dragStartY = 0;
var feedReaction = null;
var feedReactionTimer = 0;
var feedIdleTimer = 0;
var shopItems = [];
var shopkeeperAnim = 0;
var sceneImages = {};
var FOOD_COLORS = { piedra: '#9e9e9e', carne: '#e57373', conejo: '#a5d6a7', zanahoria: '#ffb74d' };
var ANIMAL_BG_COLORS = { leon: ['#c8a84e','#7ec850'], cabra: ['#a0a0a0','#8bb878'], pantera: ['#2d2d2d','#4a6741'], panda: ['#e8e8e8','#5a8a4a'] };

function setGameState(state, data) {
  gameState = state;
  if (state === 'feed') {
    feedAnimalId = data.animalId;
    feedFoodIcons = [];
    feedReaction = null;
    feedReactionTimer = 0;
    feedIdleTimer = 0;
    draggedFood = null;
  }
  if (state === 'shop') {
    shopItems = buildShopItems();
    shopkeeperAnim = 0;
  }
  rebindSceneInputs();
}

function sceneLoadImage(path) {
  if (sceneImages[path]) return sceneImages[path];
  var img = new Image();
  img.src = path;
  sceneImages[path] = img;
  return img;
}

function sceneDrawCloseButton(ctx, w) {
  var cx = w - 30;
  var cy = 20;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(cx - 16, cy - 16, 32, 32);
  ctx.fillStyle = '#fff';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✕', cx, cy);
}

function sceneRectHit(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

var sceneInputBound = false;
var sceneInputMode = null;

function rebindSceneInputs() {
  sceneInputBound = false;
  if (!gameCanvas) return;
  if (sceneInputMode === 'feed') {
    gameCanvas.removeEventListener('pointerdown', handleFeedPointerDown);
    gameCanvas.removeEventListener('pointermove', handleFeedPointerMove);
    gameCanvas.removeEventListener('pointerup', handleFeedPointerUp);
    gameCanvas.removeEventListener('pointercancel', handleFeedPointerCancel);
  }
  if (sceneInputMode === 'shop') {
    gameCanvas.removeEventListener('pointerdown', handleShopPointerDown);
  }
  if (gameState === 'feed') {
    gameCanvas.addEventListener('pointerdown', handleFeedPointerDown);
    gameCanvas.addEventListener('pointermove', handleFeedPointerMove);
    gameCanvas.addEventListener('pointerup', handleFeedPointerUp);
    gameCanvas.addEventListener('pointercancel', handleFeedPointerCancel);
    sceneInputMode = 'feed';
    sceneInputBound = true;
  } else if (gameState === 'shop') {
    gameCanvas.addEventListener('pointerdown', handleShopPointerDown);
    sceneInputMode = 'shop';
    sceneInputBound = true;
  } else {
    if (sceneInputMode === 'feed') {
      gameCanvas.removeEventListener('pointerdown', handleFeedPointerDown);
      gameCanvas.removeEventListener('pointermove', handleFeedPointerMove);
      gameCanvas.removeEventListener('pointerup', handleFeedPointerUp);
      gameCanvas.removeEventListener('pointercancel', handleFeedPointerCancel);
    }
    if (sceneInputMode === 'shop') {
      gameCanvas.removeEventListener('pointerdown', handleShopPointerDown);
    }
    sceneInputMode = null;
  }
}
```

- [ ] **Step 2: Registrar scenes.js en index.html**

Añadir antes del `<script>` de `game.js`:
```html
<script src="js/engine/scenes.js?v=APP_VERSION_PLACEHOLDER"></script>
```

Usar el mismo patrón `document.write` con cache-busting que el resto de scripts.

- [ ] **Step 3: Commit**

```
git add js/engine/scenes.js index.html
git commit -m "feat: modulo scenes.js con estado global y helpers"
```

---

### Task 2: Adaptar game loop en game.js

**Files:**
- Modify: `js/engine/game.js`

**Interfaces:**
- Consumes: `gameState` (global from scenes.js), `updateFeedScene(dt)`, `updateShopScene(dt)`, `renderFeedScene(ctx, cam)`, `renderShopScene(ctx, cam)` (defined in later tasks — declare stubs for now)

- [ ] **Step 1: Añadir stubs temporales en scenes.js para que game.js no rompa**

```js
function updateFeedScene(dt) {}
function updateShopScene(dt) {}
function renderFeedScene(ctx, cam) {}
function renderShopScene(ctx, cam) {}
```

- [ ] **Step 2: Modificar gameLoop() — solo actualizar entidades en modo map**

Cambiar en `gameLoop` (líneas ~110-118):
```js
// reemplazar el for loop de entities[i].update(dt) con:
if (gameState === 'map') {
  for (var i = 0; i < entities.length; i++) {
    entities[i].update(dt);
  }
  gameCamera.follow(
    gamePlayer.x * SCALE + gamePlayer.w * SCALE / 2,
    gamePlayer.y * SCALE + gamePlayer.h * SCALE / 2
  );
  debugRecordPlayer(dt);
  checkInteraction();
} else if (gameState === 'feed') {
  updateFeedScene(dt);
} else if (gameState === 'shop') {
  updateShopScene(dt);
}
```

- [ ] **Step 3: Modificar render() — añadir overlay + escenas**

Cambiar en `render()` (líneas ~131-148):
```js
function render() {
  gameCtx.fillStyle = '#2d5a1e';
  gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

  // El mapa siempre se renderiza de fondo (se congela en feed/shop)
  if (mapBackground) {
    var mapW = MAP_PX_W * SCALE;
    var mapH = MAP_PX_H * SCALE;
    gameCtx.drawImage(mapBackground, -gameCamera.x, -gameCamera.y, mapW, mapH);
  } else {
    renderTilemap(gameCtx, gameCamera);
  }

  entities.sort(function (a, b) { return a.y - b.y; });
  for (var i = 0; i < entities.length; i++) {
    entities[i].render(gameCtx, gameCamera);
  }

  if (gameState !== 'map') {
    gameCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
  }

  if (gameState === 'feed') renderFeedScene(gameCtx, gameCamera);
  if (gameState === 'shop') renderShopScene(gameCtx, gameCamera);

  renderDebug(gameCtx, gameCamera);
}
```

- [ ] **Step 4: Commit**

```
git add js/engine/game.js js/engine/scenes.js
git commit -m "feat: game loop bifurca por gameState (map/feed/shop)"
```

---

### Task 3: Guard en entidades — pausar en escenas

**Files:**
- Modify: `js/engine/player.js`
- Modify: `js/engine/animals.js`
- Modify: `js/engine/visitors.js`

**Interfaces:**
- Consumes: `gameState` (global from scenes.js)

- [ ] **Step 1: Guard en Player.prototype.update**

Añadir al inicio de `Player.prototype.update` (`player.js` línea ~94, tras `var dx=0; var dy=0;`):
```js
if (gameState !== 'map') return;
```

- [ ] **Step 2: Guard en Animal.prototype.update**

Añadir al inicio de `Animal.prototype.update` (`animals.js` línea ~28, tras `if (this.locked...)`):
```js
if (gameState !== 'map') return;
```

Nota: el guard se coloca DESPUÉS del return temprano de `this.locked` para que los animales bloqueados sigan sin dibujar nada; y ANTES del resto de la lógica de wander.

- [ ] **Step 3: Guard en VisitorsManager.prototype.update**

En `visitors.js`, dentro del único `update` que tengan (buscar la función que itera visitantes):
```js
if (gameState !== 'map') return;
```

- [ ] **Step 4: Commit**

```
git add js/engine/player.js js/engine/animals.js js/engine/visitors.js
git commit -m "feat: entidades se congelan cuando gameState no es map"
```

---

### Task 4: Escena feed — renderizado

**Files:**
- Modify: `js/engine/scenes.js`

**Interfaces:**
- Produces: `updateFeedScene(dt)`, `renderFeedScene(ctx, cam)`
- Consumes: `feedAnimalId`, `feedFoodIcons`, `feedReaction`, `feedReactionTimer`, `feedIdleTimer`, `draggedFood`, `draggedFoodX`, `draggedFoodY`

- [ ] **Step 1: Sustituir el stub de updateFeedScene con lógica de animación**

```js
function updateFeedScene(dt) {
  feedIdleTimer += dt;
  if (feedReaction) {
    feedReactionTimer -= dt;
    if (feedReactionTimer <= 0) {
      feedReaction = null;
      feedReactionTimer = 0;
    }
  }
}
```

- [ ] **Step 2: Sustituir el stub de renderFeedScene**

```js
function renderFeedScene(ctx, cam) {
  var w = gameCanvas.width;
  var h = gameCanvas.height;

  // Fondo del recinto
  var bgW = Math.min(w * 0.8, 600);
  var bgH = Math.min(h * 0.65, 400);
  var bgX = (w - bgW) / 2;
  var bgY = (h - bgH) / 2 - 20;

  var animalImg = sceneLoadImage('assets/img/sprites/' + feedAnimalId + '.png');
  var bgImg = sceneLoadImage('assets/img/scenes/' + feedAnimalId + '-bg.png');

  if (bgImg.complete && bgImg.naturalWidth > 0) {
    ctx.drawImage(bgImg, bgX, bgY, bgW, bgH);
  } else {
    var colors = ANIMAL_BG_COLORS[feedAnimalId] || ['#6b8e5a', '#4a7a3a'];
    var grad = ctx.createLinearGradient(bgX, bgY, bgX, bgY + bgH);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(bgX, bgY, bgW, bgH);
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 4;
    ctx.strokeRect(bgX, bgY, bgW, bgH);
  }

  // Animal grande (escala x2.5, idle)
  var idleScale = 1 + Math.sin(feedIdleTimer * 3) * 0.02;
  var animalW = 32 * 2.5 * idleScale;
  var animalH = 32 * 2.5 * idleScale;
  var animalX = w / 2 - animalW / 2;
  var animalY = bgY + bgH / 2 - animalH / 2;
  if (animalImg.complete && animalImg.naturalWidth > 0) {
    ctx.drawImage(animalImg, 0, 0, animalImg.width, animalImg.height, animalX, animalY, animalW, animalH);
  } else {
    ctx.fillStyle = '#888';
    ctx.fillRect(animalX, animalY, animalW, animalH);
  }

  // Reacción
  if (feedReaction) {
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    var emote = feedReaction === 'come' ? '😋' : feedReaction === 'rechaza' ? '😝' : '🥰';
    ctx.fillText(emote, w / 2, animalY - 20);
  }

  // Bandeja de comida (solo si no hay reacción activa)
  if (!feedReaction) {
    var trayY = bgY + bgH + 10;
    var iconSize = Math.min(48, (bgW - 40) / 4);
    var gap = (bgW - iconSize * 4) / 5;
    var icons = [];
    for (var i = 0; i < FOODS.length; i++) {
      var ix = bgX + gap + i * (iconSize + gap);
      var iy = trayY;
      icons.push({ x: ix, y: iy, w: iconSize, h: iconSize, food: FOODS[i], alpha: draggedFood && draggedFood !== FOODS[i] ? 0.4 : 1 });
    }
    feedFoodIcons = icons;

    // Fondo de la bandeja
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(bgX, trayY - 5, bgW, iconSize + 20);
    ctx.strokeStyle = '#6b4d3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(bgX, trayY - 5, bgW, iconSize + 20);

    for (var j = 0; j < icons.length; j++) {
      var ic = icons[j];
      if (draggedFood === ic.food) continue;
      ctx.globalAlpha = ic.alpha;
      drawFoodIcon(ctx, ic);
      ctx.globalAlpha = 1;
    }
  }

  // Icono arrastrado (por encima de todo)
  if (draggedFood) {
    var dragIcon = { x: draggedFoodX - 24, y: draggedFoodY - 24, w: 48, h: 48, food: draggedFood, alpha: 1 };
    drawFoodIcon(ctx, dragIcon);
  }

  // Botón cerrar
  sceneDrawCloseButton(ctx, w);
}

function drawFoodIcon(ctx, icon) {
  var foodImg = sceneLoadImage('assets/img/sprites/comida-' + icon.food + '.png');
  if (foodImg.complete && foodImg.naturalWidth > 0) {
    ctx.drawImage(foodImg, 0, 0, foodImg.width, foodImg.height, icon.x, icon.y, icon.w, icon.h);
  } else {
    ctx.fillStyle = FOOD_COLORS[icon.food] || '#ccc';
    ctx.fillRect(icon.x, icon.y, icon.w, icon.h);
    ctx.fillStyle = '#fff';
    ctx.font = Math.floor(icon.w * 0.5) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(FOOD_EMOJI[icon.food] || '?', icon.x + icon.w / 2, icon.y + icon.h / 2);
  }
}
```

- [ ] **Step 3: Commit**

```
git add js/engine/scenes.js
git commit -m "feat: escena feed - renderizado de fondo, animal, bandeja"
```

---

### Task 5: Escena feed — input de arrastre

**Files:**
- Modify: `js/engine/scenes.js`

**Interfaces:**
- Produces: `handleFeedPointerDown(e)`, `handleFeedPointerMove(e)`, `handleFeedPointerUp(e)`, `handleFeedPointerCancel(e)`
- Consumes: `feedFoodIcons`, `draggedFood`, `draggedFoodX`, `draggedFoodY`, `dragStartX`, `dragStartY`

- [ ] **Step 1: Implementar handleFeedPointerDown**

```js
function handleFeedPointerDown(e) {
  if (feedReaction) return;
  var rect = gameCanvas.getBoundingClientRect();
  var px = e.clientX - rect.left;
  var py = e.clientY - rect.top;

  // Botón cerrar
  if (px >= gameCanvas.width - 48 && py <= 48) {
    setGameState('map');
    return;
  }

  for (var i = 0; i < feedFoodIcons.length; i++) {
    var ic = feedFoodIcons[i];
    if (sceneRectHit(px, py, ic.x, ic.y, ic.w, ic.h)) {
      draggedFood = ic.food;
      draggedFoodX = px;
      draggedFoodY = py;
      dragStartX = ic.x + ic.w / 2;
      dragStartY = ic.y + ic.h / 2;
      e.preventDefault();
      return;
    }
  }
}
```

- [ ] **Step 2: Implementar handleFeedPointerMove**

```js
function handleFeedPointerMove(e) {
  if (!draggedFood) return;
  var rect = gameCanvas.getBoundingClientRect();
  draggedFoodX = e.clientX - rect.left;
  draggedFoodY = e.clientY - rect.top;
  e.preventDefault();
}
```

- [ ] **Step 3: Implementar handleFeedPointerUp**

```js
function handleFeedPointerUp(e) {
  if (!draggedFood) return;
  var food = draggedFood;
  draggedFood = null;

  var rectBounds = gameCanvas.getBoundingClientRect();
  var px = e.clientX - rectBounds.left;
  var py = e.clientY - rectBounds.top;

  // Animal rect (centrado en pantalla, mismo cálculo que en render)
  var w = gameCanvas.width;
  var h = gameCanvas.height;
  var bgW = Math.min(w * 0.8, 600);
  var bgH = Math.min(h * 0.65, 400);
  var bgX = (w - bgW) / 2;
  var bgY = (h - bgH) / 2 - 20;
  var animalW = 32 * 2.5;
  var animalH = 32 * 2.5;
  var animalX = w / 2 - animalW / 2;
  var animalY = bgY + bgH / 2 - animalH / 2;
  var margin = 20;

  if (sceneRectHit(px, py, animalX - margin, animalY - margin, animalW + margin * 2, animalH + margin * 2)) {
    handleFeedReaction(food);
  }
  e.preventDefault();
}

function handleFeedPointerCancel(e) {
  draggedFood = null;
}
```

- [ ] **Step 4: Commit**

```
git add js/engine/scenes.js
git commit -m "feat: escena feed - drag input con pointer events"
```

---

### Task 6: Escena feed — flujo de reacción

**Files:**
- Modify: `js/engine/scenes.js`
- Modify: `js/engine/game.js`

**Interfaces:**
- Consumes: `feedAnimalId`, `feedReaction`, `feedReactionTimer`, `getReaction()`, `addCoin()`, sound functions, `coins`

- [ ] **Step 1: Añadir handleFeedReaction a scenes.js**

```js
function handleFeedReaction(food) {
  var reaction = getReaction(feedAnimalId, food);
  feedReaction = reaction;
  var timers = { come: 1.5, rechaza: 1.0, especial: 2.0 };
  feedReactionTimer = timers[reaction] || 1.5;

  if (reaction === 'come') {
    var comeCoins = (ANIMAL_COINS[feedAnimalId] && ANIMAL_COINS[feedAnimalId].come) || 0;
    coins = addCoin(storage, comeCoins);
    updateCoinDisplay();
    checkShopUnlock();
    playEatSound();
  } else if (reaction === 'rechaza') {
    playRejectSound();
  } else if (reaction === 'especial') {
    var especCoins = (ANIMAL_COINS[feedAnimalId] && ANIMAL_COINS[feedAnimalId].especial) || 0;
    coins = addCoin(storage, especCoins);
    updateCoinDisplay();
    checkShopUnlock();
    playSpecialSound();
  }
}
```

- [ ] **Step 2: Añadir startFeedingScene a scenes.js**

```js
function startFeedingScene(animalId) {
  var zone = getZoneForAnimal(animalId);
  setGameState('feed', { animalId: animalId, zone: zone });
}
```

- [ ] **Step 3: Conectar feed-prompt a startFeedingScene en game.js**

En `buildHUD()` de `game.js`, cambiar el `click` listener del `feed-prompt`:
```js
// antes: prompt.addEventListener('click', function () { showFeedPanel(); });
// después:
prompt.addEventListener('click', function () {
  if (interactionTarget) {
    startFeedingScene(interactionTarget.animalId);
  }
});
```

- [ ] **Step 4: Commit**

```
git add js/engine/scenes.js js/engine/game.js
git commit -m "feat: escena feed - flujo de reaccion y conexion HUD"
```

---

### Task 7: Escena shop — renderizado

**Files:**
- Modify: `js/engine/scenes.js`

**Interfaces:**
- Produces: `updateShopScene(dt)`, `renderShopScene(ctx, cam)`, `buildShopItems()`

- [ ] **Step 1: Sustituir stub de updateShopScene**

```js
function updateShopScene(dt) {
  shopkeeperAnim += dt;
}
```

- [ ] **Step 2: Sustituir stub de renderShopScene + añadir buildShopItems**

```js
function buildShopItems() {
  var items = [];
  var purchases = getPurchases(storage);
  for (var i = 0; i < SHOP_ITEMS.length; i++) {
    var item = SHOP_ITEMS[i];
    if (typeof item.cost !== 'number') continue;
    var owned = !!purchases[item.id];
    var affordable = coins >= item.cost;
    items.push({ id: item.id, label: item.label, cost: item.cost, image: item.image, owned: owned, affordable: affordable, shaking: 0, shakeTimer: 0 });
  }
  return items;
}

function renderShopScene(ctx, cam) {
  var w = gameCanvas.width;
  var h = gameCanvas.height;

  // Fondo tienda
  var bgW = Math.min(w * 0.9, 600);
  var bgH = Math.min(h * 0.7, 400);
  var bgX = (w - bgW) / 2;
  var bgY = (h - bgH) / 2;

  var bgImg = sceneLoadImage('assets/img/scenes/shop-bg.png');
  if (bgImg.complete && bgImg.naturalWidth > 0) {
    ctx.drawImage(bgImg, bgX, bgY, bgW, bgH);
  } else {
    // Patrón madera procedural
    ctx.fillStyle = '#5c3a1e';
    ctx.fillRect(bgX, bgY, bgW, bgH);
    for (var ly = bgY; ly < bgY + bgH; ly += 12) {
      ctx.fillStyle = ly % 24 === 0 ? '#4a2a10' : '#7a5230';
      ctx.fillRect(bgX, ly, bgW, 6);
    }
    ctx.strokeStyle = '#3a1a0a';
    ctx.lineWidth = 4;
    ctx.strokeRect(bgX, bgY, bgW, bgH);
  }

  // Tendero
  var keeperX = bgX + 30;
  var keeperY = bgY + bgH - 120;
  var keeperW = 64;
  var keeperH = 80;
  var shopkeeperImg = sceneLoadImage('assets/img/sprites/tendero.png');
  if (shopkeeperImg.complete && shopkeeperImg.naturalWidth > 0) {
    ctx.drawImage(shopkeeperImg, 0, 0, shopkeeperImg.width, shopkeeperImg.height, keeperX, keeperY + Math.sin(shopkeeperAnim * 2) * 2, keeperW, keeperH);
  } else {
    ctx.fillStyle = '#6d4c2e';
    ctx.fillRect(keeperX, keeperY + Math.sin(shopkeeperAnim * 2) * 2, keeperW, keeperH);
    ctx.fillStyle = '#ffcc80';
    ctx.beginPath();
    ctx.arc(keeperX + keeperW / 2, keeperY + 12, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.fillRect(keeperX + keeperW / 2 - 6, keeperY + 8, 4, 4);
    ctx.fillRect(keeperX + keeperW / 2 + 4, keeperY + 8, 4, 4);
  }

  // Productos
  var itemsX = bgX + 140;
  var itemsY = bgY + 40;
  var itemH = 80;
  for (var i = 0; i < shopItems.length; i++) {
    var si = shopItems[i];
    var iy = itemsY + i * (itemH + 10);

    // Tarjeta
    var cardColor = si.owned ? '#555' : si.affordable ? 'rgba(76,175,80,0.3)' : 'rgba(244,67,54,0.3)';
    ctx.fillStyle = cardColor;
    ctx.fillRect(itemsX, iy, bgW - 160, itemH);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(itemsX, iy, bgW - 160, itemH);

    // Imagen animal
    var animalSprite = sceneLoadImage('assets/img/sprites/' + si.id + '.png');
    var sprX = itemsX + 8;
    var sprY = iy + 8;
    var sprW = itemH - 16;
    var sprH = itemH - 16;
    if (animalSprite.complete && animalSprite.naturalWidth > 0) {
      ctx.drawImage(animalSprite, 0, 0, animalSprite.width, animalSprite.height, sprX, sprY, sprW, sprH);
    } else {
      ctx.fillStyle = '#666';
      ctx.fillRect(sprX, sprY, sprW, sprH);
    }

    if (si.owned) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(sprX, sprY, sprW, sprH);
    }

    // Etiqueta
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    var labelY = iy + itemH / 2;
    ctx.fillText(si.label, sprX + sprW + 10, labelY - 10);

    if (si.owned) {
      ctx.fillStyle = '#4caf50';
      ctx.fillText('✓ Comprado', sprX + sprW + 10, labelY + 12);
    } else {
      ctx.fillText(si.cost + ' 🪙', sprX + sprW + 10, labelY + 12);
    }

    si._rect = { x: itemsX, y: iy, w: bgW - 160, h: itemH };
  }

  // Badge monedas
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(bgX + bgW - 100, bgY + 8, 92, 28);
  ctx.fillStyle = '#ffd700';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🪙 ' + coins, bgX + bgW - 54, bgY + 26);

  // Botón cerrar
  sceneDrawCloseButton(ctx, w);
}
```

- [ ] **Step 3: Commit**

```
git add js/engine/scenes.js
git commit -m "feat: escena shop - renderizado de fondo, tendero, productos"
```

---

### Task 8: Escena shop — interacción y compra

**Files:**
- Modify: `js/engine/scenes.js`
- Modify: `js/engine/game.js`

**Interfaces:**
- Produces: `handleShopPointerDown(e)`, `startShopScene()`

- [ ] **Step 1: Implementar handleShopPointerDown**

```js
function handleShopPointerDown(e) {
  var rectBounds = gameCanvas.getBoundingClientRect();
  var px = e.clientX - rectBounds.left;
  var py = e.clientY - rectBounds.top;

  if (px >= gameCanvas.width - 48 && py <= 48) {
    setGameState('map');
    return;
  }

  for (var i = 0; i < shopItems.length; i++) {
    var si = shopItems[i];
    if (!si._rect) continue;
    if (!sceneRectHit(px, py, si._rect.x, si._rect.y, si._rect.w, si._rect.h)) continue;

    if (si.owned) return;
    if (!si.affordable) {
      si.shaking = true;
      si.shakeTimer = 0.3;
      return;
    }

    try {
      coins = spendCoins(storage, si.cost);
    } catch (err) {
      si.shaking = true;
      si.shakeTimer = 0.3;
      return;
    }

    savePurchase(storage, si.id);
    updateCoinDisplay();
    updateAnimalAccess();
    checkShopUnlock();
    playEatSound();

    shopItems = buildShopItems();
    e.preventDefault();
    return;
  }
}
```

- [ ] **Step 2: Añadir animación de sacudida en updateShopScene**

Añadir al final de `updateShopScene`:
```js
for (var i = 0; i < shopItems.length; i++) {
  if (shopItems[i].shaking) {
    shopItems[i].shakeTimer -= dt;
    if (shopItems[i].shakeTimer <= 0) {
      shopItems[i].shaking = false;
    }
  }
}
```

- [ ] **Step 3: Añadir efecto visual de sacudida en renderShopScene**

En el loop de render de productos, añadir desplazamiento X si está temblando:
```js
var shakeX = si.shaking ? Math.sin(Date.now() * 0.05) * 4 : 0;
// usar itemsX + shakeX como x en vez de itemsX
```

Aplicar en el `fillRect` y `strokeRect` de la tarjeta y en el resto.

- [ ] **Step 4: Añadir startShopScene y conectar botón de tienda en game.js**

En `scenes.js`:
```js
function startShopScene() {
  setGameState('shop', {});
}
```

En `game.js` `buildShopUI()`, cambiar el click listener del `shop-hud-btn`:
```js
// antes: btn.addEventListener('click', showShopOverlay);
// después:
btn.addEventListener('click', function () { startShopScene(); });
```

- [ ] **Step 5: Commit**

```
git add js/engine/scenes.js js/engine/game.js
git commit -m "feat: escena shop - interaccion de compra y conexion HUD"
```

---

### Task 9: Integración final y pulido

**Files:**
- Modify: `js/engine/scenes.js`
- Modify: `js/engine/game.js`

**Interfaces:**
- N/A — pulido, edge cases, verificación cruzada

- [ ] **Step 1: Ocultar HUD DOM durante escenas en game.js**

En `checkInteraction()` y `updateFeedPrompt()`:
```js
function checkInteraction() {
  if (gameState !== 'map') return;
  // ... resto igual
}
```

Y en el render loop de game.js, ocultar/mostrar `feed-prompt` según `gameState`:
```js
var prompt = document.getElementById('feed-prompt');
if (prompt) {
  prompt.style.display = (gameState === 'map' && interactionTarget) ? 'block' : 'none';
}
```

- [ ] **Step 2: Inicializar foodIcons al entrar en feed (no solo en render)**

En `setGameState('feed')`, inicializar los iconos para evitar parpadeo en el primer frame:
```js
if (state === 'feed') {
  // ... existing code ...
  // Pre-compute icon positions (same logic as renderFeedScene)
  feedFoodIcons = computeFoodIcons();
}

function computeFoodIcons() {
  var w = gameCanvas.width;
  var h = gameCanvas.height;
  var bgW = Math.min(w * 0.8, 600);
  var bgH = Math.min(h * 0.65, 400);
  var bgX = (w - bgW) / 2;
  var bgY = (h - bgH) / 2 - 20;
  var trayY = bgY + bgH + 10;
  var iconSize = Math.min(48, (bgW - 40) / 4);
  var gap = (bgW - iconSize * 4) / 5;
  var icons = [];
  for (var i = 0; i < FOODS.length; i++) {
    icons.push({
      x: bgX + gap + i * (iconSize + gap),
      y: trayY,
      w: iconSize,
      h: iconSize,
      food: FOODS[i],
      alpha: 1
    });
  }
  return icons;
}
```

- [ ] **Step 3: Verificar que el close button funciona en ambas escenas**

Review `sceneDrawCloseButton` y los hit-tests en `handleFeedPointerDown` y `handleShopPointerDown` — ambos ya incluyen el close button.

- [ ] **Step 4: Verificar que `reaction === 'especial'` emite emoji correcto**

En `renderFeedScene`, la línea:
```js
var emote = feedReaction === 'come' ? '😋' : feedReaction === 'rechaza' ? '😝' : '🥰';
```

- [ ] **Step 5: Commit**

```
git add js/engine/scenes.js js/engine/game.js
git commit -m "feat: integracion final - ocultar HUD en escenas, suavizar transiciones"
```

---

### Task 10: Push y prueba

- [ ] **Step 1: Push a stardew-engine**

```
git push origin stardew-engine
```

- [ ] **Step 2: Solicitar test manual**

Abrir `index.html` en navegador (con servidor local o directamente):
1. Acercarse a un animal → pulsar "Dar de comer" → debe abrir escena feed con fondo, animal grande, bandeja.
2. Arrastrar comida al animal → debe reaccionar (emote, sonido, monedas).
3. Cerrar con ✕ → volver al mapa.
4. Abrir tienda → escena shop con tendero, productos, monedas.
5. Comprar → animación, descuento, desbloqueo.
6. Probar en móvil: arrastre táctil funciona igual.