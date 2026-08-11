# 🦁 ZooEsponji

Creado por y para Daniela y Adrián, con la ayuda de su padre y de Claude + OpenCode + DeepSeek + ChatGPT.

## La idea

Eres el cuidador de los animales del zoo y les das de comer. Cada animal tiene sus gustos: si le ofreces la comida que le gusta se la come feliz (con su sonido), y si le ofreces otra pone cara de disgusto y suena un "no me gusta". Algún animal tiene además una reacción especial con algún alimento. Ganas monedas al alimentarlos bien, y con ellas puedes desbloquear nuevas zonas del zoo en la tienda.

## Estado del proyecto

| Versión | Rama | Fecha | Novedades |
|---------|------|-------|-----------|
| **v2.0.0-dev** | `stardew-engine` | 2026-08-11 | Motor Canvas 2D Stardew Valley, cuidador controlable, visitantes con pathfinding A\*, 4 animales con sprites pixel art, tienda + progresión, arquitectura por zonas data-driven, modo debug con 3 capas (caminos/vallas/puertas), optimizado móvil |
| v1.1.0 | `main` | 2026-08-09 | Tienda con sistema de desbloqueo, 2 nuevos animales (pantera negra, oso panda), progresión con monedas (20 tienda, 50 pantera, 100 panda), compras persistentes en localStorage, 31 tests |
| v1.0.0 | — | 2026-08-08 | MVP inicial: mapa del zoo, 2 animales (león, cabra), 4 alimentos, drag & drop, sonidos Web Audio, monedas básicas, 13 tests |

> **v2.0 está en desarrollo activo** en la rama `stardew-engine`. La rama `main` contiene v1.1.0 estable en producción.

Sin empaquetar a Android todavía.

---

## v2.0 — Motor Stardew Valley (rama `stardew-engine`)

Reescritura completa del motor de renderizado: de pantallas estáticas con fotos PNG a un mundo 2D continuo con sprites animados, cámara y entidades vivas.

### Novedades

- **Motor Canvas 2D** con bucle de juego (`requestAnimationFrame`), cámara con seguimiento y scroll
- **Cuidador controlable** con teclado (WASD/flechas) + joystick táctil en móvil
- **15 visitantes** paseando con IA continua (sin pausas, rebotan al chocar)
- **4 animales** en recintos con sprites cargados desde PNG
- **Sistema de zonas**: cada recinto es una entrada de datos en `zones.js`
- **Reglas de movimiento por tipo de entidad**: cuidador solo por caminos, visitantes solo por caminos, animales solo dentro de su recinto
- **Puertas (GATE)**: el cuidador entra/sale de recintos por las puertas
- **Fondo de mapa único** (`zoo-map.png`) cargado como imagen bajo las entidades
- **Sprites pixel art**: cuidador (4 dirs × 3 frames), animales (1 frame), visitantes (4 dirs × 3 frames)
- Mismas mecánicas de v1.1: reacciones, sonidos, monedas, tienda, progresión

### Arquitectura del motor

```
js/engine/
├── constants.js   — TILE_SIZE (16px), SCALE (×4), dimensiones del mapa
├── zones.js       — Definición de recintos, caminos, puertas como datos
├── tilemap.js     — Mapa de tiles con capas: GRASS, PATH, FENCE, GATE, ENCLOSURE
├── sprites.js     — Carga de sprites desde PNG, soporte multicuadro y 1-frame
├── camera.js      — Cámara que sigue al cuidador con límites
├── entity.js      — Entidad base: posición, animación, renderizado con spritesheet
├── player.js      — Cuidador: input (teclado + touch), colisiones, puertas
├── animals.js     — Animales: idle wander, reacciones, bloqueo visual
├── visitors.js    — Visitantes: wander continuo, solo caminos, colisiones
├── shop.js        — Tienda overlay, desbloqueo, compras, celebraciones
└── game.js        — Bucle principal, init, pipeline de render
```

### Tipos de tile y permisos de movimiento

| Tile | Código | Cuidador | Visitante | Animal |
|------|--------|----------|-----------|--------|
| 🧱 PATH (camino) | `TILE_PATH` | ✅ | ✅ | ✅ |
| 🌿 GRASS (césped) | `TILE_GRASS` | ❌ | ❌ | ✅ |
| 🚧 FENCE (valla) | `TILE_FENCE` | ❌ | ❌ | ❌ |
| 🚪 GATE (puerta) | `TILE_GATE` | ✅ | ✅ | ❌ |
| 🏠 ENCLOSURE (recinto) | `TILE_ENCLOSURE` | ✅\* | ❌ | ✅ |

> \* El cuidador solo puede entrar al recinto pisando un GATE. Una vez dentro se mueve libremente. Al salir vuelve a modo solo-caminos.

### Cómo añadir un animal nuevo

Solo hay que tocar **2 archivos**:

**1. `js/engine/zones.js`** — añadir el recinto:
```js
{
  id: 'tigre',
  animalId: 'tigre',
  label: 'Zona del Tigre',
  enclosure: { x: 55, y: 20, w: 10, h: 8 },
  gates: [{ x: 58, y: 20 }],
  unlockedByDefault: false,
  shopItem: { cost: 150, desc: '¡Nuevo tigre en el zoo!' },
}
```

**2. `js/data.js`** — añadir reacciones, monedas, label y emoji:
```js
ANIMALS.push('tigre');
ANIMAL_LABELS.tigre = 'Tigre';
ANIMAL_EMOJI.tigre = '🐯';
REACTIONS.tigre = { carne: 'come', ... };
ANIMAL_COINS.tigre = { come: 3 };
```

**3. Añadir sprite**: `assets/img/sprites/tigre.png` (cualquier tamaño, se escala solo).

Nada más. El motor genera el recinto, las vallas, la puerta, el shop item, los permisos de movimiento y la interacción automáticamente.

### Sprites

Todas las imágenes generadas con ChatGPT. Se colocan en `assets/img/sprites/`:

| Archivo | Tipo | Layout |
|---------|------|--------|
| `zoo-map.png` | Fondo del mapa | 1 imagen completa |
| `cuidador.png` | Personaje | 4 filas (direcciones) × 3 columnas (frames) |
| `leon.png` | Animal | 1 frame |
| `cabra.png` | Animal | 1 frame |
| `pantera.png` | Animal | 1 frame |
| `panda.png` | Animal | 1 frame |
| `visitante-1.png` | Visitante | 4 filas × 3 columnas |
| `visitante-2.png` | Visitante | 4 filas × 3 columnas |
| `visitante-3.png` | Visitante | 4 filas × 3 columnas |

El motor acepta cualquier resolución: escala automáticamente al tamaño de la entidad. Para sprites de 1 frame (animales) usa la imagen completa. Para sprites multicuadro (cuidador, visitantes) recorta por filas/columnas.

> **Optimizar**: pasar los PNGs por [TinyPNG](https://tinypng.com/) antes de commit — los originales de ChatGPT pesan 1-3MB.

---

## v1.1 — Versión estable (`main`)

### Cómo jugarlo

No hace falta instalar nada. Basta con abrir `index.html` directamente en un navegador (doble clic en el archivo, o `start index.html` en Windows / `open index.html` en Mac).

Para ejecutar los tests automáticos (requiere Node.js):

```bash
node --test tests/*.test.js
```

### Desplegado en producción

El juego vive en `davidpladel.com/zooesponji`, desplegado con un simple `git pull` en el VPS.

**Importante — caché del navegador:** toda la versión está centralizada en una sola constante `APP_VERSION` definida en el `<script>` inicial de `index.html`. CSS, JS e imágenes usan este mismo número como `?v=`. **Para forzar la recarga de caché en todos los clientes, basta con cambiar `APP_VERSION` en `index.html`** (ej. de `'1.1.0'` a `'1.1.1'`). No hay que tocar nada más.

### Diseño de contenido (v1.1.0)

**Animales:** león, cabra, pantera negra, oso panda

**Alimentos:** piedra, carne, conejo, zanahoria

**Progresión:**
- León y cabra disponibles desde el principio
- Al conseguir **20 monedas** se puede desbloquear la **tienda**
- En la tienda se compran nuevas zonas: **pantera negra** (50 monedas) y **oso panda** (100 monedas)
- Las compras se guardan en `localStorage` y persisten entre sesiones

**Reacciones por animal y alimento:**

| Alimento   | 🦁 León | 🐐 Cabra | 🐆 Pantera negra | 🐼 Oso panda |
|------------|---------|----------|-------------------|--------------|
| Carne      | come (+1) | rechaza | come (+2) | rechaza |
| Conejo     | come (+1) | especial (+2) | come (+2) | especial (+4) |
| Piedra     | rechaza | come (+1) | rechaza | rechaza |
| Zanahoria  | rechaza | come (+1) | rechaza | come (+2) |

Esta tabla se implementa como datos (no lógica hardcodeada por animal), para poder añadir animales y alimentos nuevos fácilmente. Cada combinación animal+alimento tiene un resultado de tres tipos posibles: `come`, `rechaza`, o `especial`. Las monedas ganadas por reacción varían por animal (definido en `ANIMAL_COINS` en `js/data.js`).

---

## Decisiones técnicas

El objetivo es plataforma **Android**, pero todo el desarrollo se hace desde Claude + OpenCode + DeepSeek + ChatGPT (terminal, sin editor gráfico), lo que descarta motores con editor visual como Unity o Godot.

### v1.x: DOM + CSS

- **HTML5 + JavaScript** — pantallas como elementos `<img>` posicionados con CSS
- Drag & drop con **Pointer Events** (funciona igual ratón y dedo)
- Sin Canvas: más simple de depurar para menús y transiciones entre pantallas

### v2.x: Canvas 2D + DOM overlay

- **Canvas 2D** para el mundo del juego (mapa, entidades, sprites)
- **DOM** para UI overlays (monedas, botones, tienda, panel de comida)
- `requestAnimationFrame` como bucle de juego, cámara con culling
- Sprites cargados desde PNG y escalados automáticamente
- Tilemap procedural como fallback si no hay imagen de fondo
- **[Capacitor](https://capacitorjs.com/)** para empaquetar la web como APK de Android al final del desarrollo (pendiente)

---

## Assets gráficos

Los niños crean las imágenes con generación de IA (ChatGPT), ajustando prompts base. Basta con guardar el PNG en la carpeta correcta y el juego lo usa automáticamente.

- Formato **PNG** (nunca JPG)
- **Sin fondo** cuando sea un personaje/objeto recortado
- En v2, cualquier resolución vale: el motor escala automáticamente

### Prompts base para ChatGPT

**Mapa del zoo (v2):**
```
Top-down pixel art zoo map, Stardew Valley style, showing a complete zoo from above.
The zoo is surrounded by a wooden fence. Inside: 4 animal enclosures, dirt paths
connecting all areas, a small shop building, a fountain, trees and benches.
Crisp pixel art, bright green grass, warm earth tones, no text, no UI.
```

**Personajes (v2):**
```
Top-down pixel art character spritesheet, Stardew Valley style,
[zookeeper in green uniform / casual park visitor],
4 rows (down, up, left, right) × 3 walking frames each,
crisp pixel art, transparent background, consistent warm colors.
```

**Animales (v2):**
```
Top-down pixel art [animal], Stardew Valley style, side profile,
32x32 pixels, transparent background, crisp pixel art, no anti-aliasing.
```

> Consejo: generar primero el personaje/animal en pose neutra, y usar esa misma imagen como referencia en ChatGPT al pedir variantes, para mantener consistencia de diseño.

---

## Roadmap

Próximas versiones planeadas (sin fecha cerrada):

- **Merge de `stardew-engine` a `main`** cuando v2 esté estable
- **Pathfinding A\*** para visitantes (ahora usan wander con colisión)
- **Más animales y zonas** usando el sistema de datos de `zones.js`
- **Más items en la tienda**: nuevos tipos de comida, zonas adicionales (delfines)
- **Mejorar los sonidos**: sustituir tonos Web Audio por samples grabados
- **Clínica veterinaria**, **bañar animales**, **limpiar jaulas**
- **Delfines / zona de acuario**
- **Animaciones de verdad** (no solo fotos/sprites fijas)
- **Empaquetado APK** de Android con Capacitor

---

## Cómo contribuir

¡Se aceptan colaboraciones! Para contribuir:

1. Haz un fork del repositorio y crea una rama para tu cambio.
2. **v1.x (`main`)**: nuevo animal o comida → `js/data.js` (listas `ANIMALS`/`FOODS`, `REACTIONS`, `ANIMAL_COINS`, imágenes en `ANIMAL_STATE_IMAGE`)
3. **v2.x (`stardew-engine`)**: nuevo animal → `js/engine/zones.js` + `js/data.js` + sprite en `assets/img/sprites/`
4. Comprueba que los tests pasan: `node --test tests/*.test.js`
5. Abre un Pull Request describiendo el cambio.

---

## Licencia

Copyright (C) 2026 [davidpladel](https://github.com/davidpladel) — hecho con cariño por Daniela y Adrián 💛

[GPL-3.0](LICENSE). Cualquiera puede usar, copiar, modificar y redistribuir este proyecto, siempre que las versiones modificadas que se distribuyan sigan siendo de código abierto bajo la misma licencia.