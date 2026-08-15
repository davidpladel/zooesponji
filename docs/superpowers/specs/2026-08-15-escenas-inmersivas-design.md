# Escenas inmersivas de alimentación y tienda

**Fecha:** 2026-08-15
**Rama:** stardew-engine

## Visión general

Añadir dos pantallas inmersivas renderizadas sobre el canvas del juego:
1. Escena de alimentación (primer plano del animal + bandeja de arrastre)
2. Escena de tienda (tendero + productos visuales)

Ambas se ejecutan dentro del game loop (canvas 2D), pausando el mapa pero
manteniéndolo visible de fondo. Sustituyen el panel de comida y el modal de
tienda actuales.

---

## Arquitectura

### Gestor de estados

```js
var gameState = 'map';   // 'map' | 'feed' | 'shop'
```

El game loop bifurca según estado:

- **map:** comportamiento actual (player, animales, visitantes, checkInteraction)
- **feed / shop:** el mapa se congela (no se actualizan entidades), se dibuja
  un overlay negro semitransparente, y encima se renderiza la escena activa.

### Archivos

| Archivo | Cambio |
|---|---|
| `js/engine/scenes.js` | Nuevo. Contiene `setGameState()`, `renderFeedScene()`, `renderShopScene()`, `handleFeedInput()`, `handleShopInput()`, `updateFeedScene()`, `updateShopScene()` |
| `js/engine/game.js` | Modificado. `gameLoop()` bifurca por `gameState`. `buildFeedPanel()` y `buildHUD()` se adaptan. Se registran pointer events globales por escena. |
| `js/engine/player.js` | Modificado. `update()` solo ejecuta lógica si `gameState === 'map'`. |
| `js/engine/animals.js` | Modificado. `update()` solo ejecuta lógica si `gameState === 'map'`. |
| `js/engine/visitors.js` | Modificado si aplica, mismo guard. |
| `css/style.css` | Modificado. Añadir estilos mínimos para overlays de escena (si los hay en DOM). |

No se crean archivos HTML nuevos. No se toca `zones.js`, `tilemap.js`,
`pathfinding.js`, `camera.js`, ni `data.js`.

---

## Escena de alimentación

### Activación

Cuando el jugador está a ≤5 tiles de un animal desbloqueado y pulsa
"Dar de comer", se llama a `setGameState('feed')` pasando el animalId.

### Renderizado

Tres capas sobre el mapa congelado:

1. **Overlay oscuro:** rectángulo `rgba(0,0,0,0.5)` cubriendo todo el canvas.
2. **Fondo del recinto:** sprite de fondo centrado (path:
   `assets/img/scenes/{animalId}-bg.png`). Si la imagen no existe, se usa
   un degradado procedural con la paleta de colores del animal:
   - león: `#c8a84e` → `#7ec850`
   - cabra: `#a0a0a0` → `#8bb878`
   - pantera: `#2d2d2d` → `#4a6741`
   - panda: `#e8e8e8` → `#5a8a4a`
3. **Animal:** sprite del animal (`assets/img/sprites/{animalId}.png`)
   escalado ×2.5, centrado en la escena. Animación idle: leve escala
   sinusoidal (±2%). Animación de reacción heredada del sistema actual
   (emotes 😋 😝 🥰 dibujados encima).
4. **Bandeja de comida:** barra horizontal abajo con los 4 iconos de
   comida (`assets/img/sprites/comida-{food}.png` o procedural si no
   existen). Cada icono ocupa ~48×48 px en pantalla.
5. **Botón cerrar:** texto "✕" en esquina superior derecha.

### Interacción (drag sobre canvas)

Se registran pointer events (`pointerdown`, `pointermove`, `pointerup`,
`pointercancel`) en el canvas.

1. **pointerdown:** hit-test contra los rectángulos de los iconos de comida.
   Si se pulsa uno, se marca como `draggedFood`. El resto se atenúan
   (alpha 0.4). El centro del icono sigue al puntero.
2. **pointermove:** si hay `draggedFood`, se actualiza su posición al puntero.
3. **pointerup:** hit-test del rect del animal (rect central ampliado
   en un margen de ~20px). Si colisiona → `handleFeed(food)`. Si no → el
   icono vuelve a la bandeja con animación de interpolación (0.2s).
4. **pointercancel:** cancelar arrastre, devolver icono a la bandeja.

### Flujo de reacción

- `getReaction(animalId, food)` → `'come'` | `'rechaza'` | `'especial'`.
- `'come'`: sonido eat, `+X 🪙`, emote 😋, bandeja oculta 1.5s.
- `'rechaza'`: sonido reject, `+0 🪙`, emote 😝, bandeja oculta 1s.
- `'especial'`: sonido special, `+Y 🪙`, emote 🥰, bandeja oculta 2s.
- Tras la animación, la bandeja reaparece. Se puede repetir o cerrar.

### Salida

- Botón "✕" (esquina superior derecha).
- Tocar fuera del área del fondo (hit-test negativo).
- Se ejecuta `setGameState('map')`.

---

## Escena de tienda

### Activación

Al pulsar el botón "🏪 Tienda" (HUD actual), se llama a
`setGameState('shop')`.

### Renderizado

1. **Overlay oscuro:** igual que en feed.
2. **Fondo de tienda:** sprite `assets/img/scenes/shop-bg.png`. Si no
   existe, se genera un rectángulo con patrón de líneas (efecto madera,
   colores `#5c3a1e`, `#7a5230`, `#4a2a10`).
3. **Tendero:** sprite `assets/img/sprites/tendero.png` a la izquierda.
   Si no existe, se dibuja un placeholder (rectángulo marrón con
   círculo blanco como cabeza). Animación idle: balanceo sutil.
4. **Productos:** tarjetas horizontales a la derecha, una por cada ítem
   comprable:
   - Imagen del animal bloqueado en miniatura.
   - Etiqueta con nombre + precio.
   - Estado visual: comprable (verde), sin monedas (rojo atenuado),
     ya comprado (gris + check).
5. **Badge de monedas:** 🪙 arriba (mismo componente HUD actual).
6. **Botón cerrar:** "✕" en esquina superior derecha.

### Interacción

- `click`/`pointerdown` sobre tarjeta de producto:
  - Si `coins >= cost` y no comprado: animación de compra (brillo,
    escala, emote 🎉), `spendCoins()`, `savePurchase()`,
    `updateAnimalAccess()`. El tendero hace animación de asentir.
  - Si `coins < cost`: la tarjeta tiembla, el tendero niega con la
    cabeza (animación sacudida horizontal ×3, 0.3s).
  - Si ya comprado: sin acción (gris).

### Salida

- Botón "✕" (esquina superior derecha).
- Se ejecuta `setGameState('map')`.

---

## Cambios en el game loop

```js
function gameLoop(timestamp) {
  // ... dt ...

  if (gameState === 'map') {
    for (var i = 0; i < entities.length; i++) {
      entities[i].update(dt);
    }
    gameCamera.follow(...);
    debugRecordPlayer(dt);
    checkInteraction();
  } else if (gameState === 'feed') {
    updateFeedScene(dt);
  } else if (gameState === 'shop') {
    updateShopScene(dt);
  }

  render();
  requestAnimationFrame(gameLoop);
}

function render() {
  // ... fondo y/o mapBackground ...

  if (gameState === 'map') {
    entities.sort(...);
    for (...) entities[i].render(...);
  }

  if (gameState !== 'map') {
    // overlay oscuro
    gameCtx.fillStyle = 'rgba(0,0,0,0.5)';
    gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
  }

  if (gameState === 'feed') renderFeedScene(gameCtx, gameCamera);
  if (gameState === 'shop') renderShopScene(gameCtx, gameCamera);

  renderDebug(...);
}
```

### Registro de inputs

Al cambiar a `'feed'` o `'shop'`, se registran listeners de pointer
events en el canvas (se eliminan al volver a `'map'`).

### Adaptación del HUD

El botón "Dar de comer" actual (`feed-prompt`) sigue apareciendo en el mapa.
Al pulsarlo, en vez de mostrar `showFeedPanel()` (el panel DOM de botones),
llama a `setGameState('feed')`. El botón de tienda (`shop-hud-btn`) hace lo
mismo: `setGameState('shop')` en vez de `showShopOverlay()`.

Los overlays DOM actuales (`feed-panel`, `shop-overlay`) se mantienen en el
código para referencia pero dejan de usarse.

---

## Assets necesarios (rutas esperadas)

| Recurso | Path | Fallback |
|---|---|---|
| Fondo león | `assets/img/scenes/leon-bg.png` | Degradado procedural |
| Fondo cabra | `assets/img/scenes/cabra-bg.png` | Degradado procedural |
| Fondo pantera | `assets/img/scenes/pantera-bg.png` | Degradado procedural |
| Fondo panda | `assets/img/scenes/panda-bg.png` | Degradado procedural |
| Fondo tienda | `assets/img/scenes/shop-bg.png` | Patrón madera procedural |
| Tendero | `assets/img/sprites/tendero.png` | Placeholder geométrico |
| Comida (x4) | `assets/img/sprites/comida-{piedra,carne,conejo,zanahoria}.png` | Rectángulo de color + emoji |

Los sprites de animales ya existen en `assets/img/sprites/{animal}.png`.

---

## Scope y exclusiones

En alcance:
- Dos escenas canvas inmersivas con drag (feed) y click (shop).
- Animaciones de reacción, compra, idle.
- Fallback procedural si faltan imágenes.
- Mapa congelado visible de fondo.

Fuera de alcance:
- Música de escena.
- Partículas o efectos avanzados.
- Tienda con scroll o múltiples páginas.
- Cambiar el sistema de monedas o datos.