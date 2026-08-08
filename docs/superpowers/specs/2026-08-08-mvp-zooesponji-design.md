# ZooEsponji — Diseño del MVP jugable en navegador

Fecha: 2026-08-08

## Objetivo

Un MVP de ZooEsponji jugable localmente en el navegador (sin empaquetar a Android todavía): el jugador elige un animal en un mapa del zoo y le da de comer arrastrando alimentos, con reacciones distintas según lo que le guste a cada animal.

## Mecánica y contenido

- **Animales (v1):** león, cabra.
- **Alimentos (v1):** piedra, carne, conejo, zanahoria.
- **Reacciones** por combinación animal+alimento, de tres tipos posibles:
  - `come` — el animal se come el alimento feliz, con su sonido, y da **+1 moneda**.
  - `rechaza` — cara de disgusto + sonido de rechazo. No da moneda.
  - `especial` — reacción propia distinta de comer/rechazar (ej. la cabra acaricia el conejo con la cabeza). No da moneda.

Tabla de reacciones v1:

| Alimento | León | Cabra |
|---|---|---|
| Carne | come | rechaza |
| Conejo | come | especial (lo acaricia con la cabeza) |
| Piedra | rechaza | come |
| Zanahoria | rechaza | come |

- Los alimentos están siempre disponibles (no se gastan al usarlos); se pueden repetir libremente.
- Juego sin condición de victoria: es juego libre con recompensa de monedas por acertar, sin objetivo final.

## Pantallas y navegación

1. **Mapa del zoo** (vista desde arriba): muestra la jaula del león y la jaula de la cabra como zonas tocables, y el contador de monedas. Tocar una jaula lleva a su pantalla de alimentar.
2. **Alimentar animal**: muestra el animal seleccionado y los iconos de los 4 alimentos. Arrastrando un alimento sobre el animal se dispara su reacción (cara/animación + sonido + moneda si corresponde). Incluye botón de "volver al mapa del zoo" y el contador de monedas.

Flujo: `Mapa del zoo → (elegir jaula) → Alimentar animal → (volver) → Mapa del zoo`.

## Arquitectura técnica

- **DOM + CSS**, sin Canvas. Las imágenes son elementos `<img>` (o placeholders con emoji/CSS mientras no hay PNG reales de los niños), posicionados con CSS. Se decidió así en vez de Canvas (la idea original del README del proyecto) porque el drag&drop y las pantallas tipo menú son mucho más simples de implementar y depurar en DOM que a mano sobre un canvas; Canvas solo aportaría valor si hiciera falta dibujo pixel a pixel o muchos sprites/partículas, que no es el caso de este MVP.
- **Arrastrar y soltar** implementado con **Pointer Events** (no el Drag & Drop API nativo del navegador), porque funciona igual de bien con ratón y con dedo en pantallas táctiles.
- Sin frameworks — HTML, CSS y JavaScript plano. Router mínimo casero entre las dos pantallas (mostrar/ocultar secciones), sin librería de rutas.
- Se seguirá usando **Capacitor** para empaquetar a APK de Android, pero eso queda fuera del alcance de este MVP (ver "Fuera de alcance").

### Estructura de archivos

```
index.html
css/style.css
js/main.js         → arranca el juego, cambia entre pantallas (mapa ↔ alimentar)
js/data.js          → animales, comidas, tabla de reacciones (datos, no lógica)
js/sound.js         → 3 sonidos simples con Web Audio (come / rechaza / especial)
js/coins.js         → leer, sumar y guardar monedas en localStorage
js/screens/zoo.js   → pantalla de mapa (jaulas)
js/screens/feed.js  → pantalla de alimentar (drag&drop, reacciones)
assets/img/         → PNG cuando los niños los generen (placeholders con emoji mientras tanto)
```

## Modelo de datos

`js/data.js` define animales y alimentos como listas, y las reacciones como una tabla de datos (objeto animal → alimento → tipo de reacción). La lógica de `feed.js` es genérica: lee la reacción de la tabla y actúa según su tipo (`come` / `rechaza` / `especial`), sin condicionales por animal concreto. Añadir un animal o alimento nuevo en el futuro es solo editar `data.js`, no tocar la lógica.

## Sonido

Sonidos simples generados por código con Web Audio (osciladores/tonos básicos), uno por cada tipo de reacción (`come`, `rechaza`, `especial`). No se usan archivos de audio en el MVP; se podrán sustituir por sonidos reales más adelante sin cambiar la lógica del juego.

## Monedas y persistencia

- +1 moneda cada vez que un animal come feliz (reacción `come`).
- Las monedas no se gastan en nada en este MVP — solo se acumulan y se muestran en pantalla.
- Se guardan en `localStorage` del navegador, así que persisten entre sesiones (cerrar y volver a abrir el navegador mantiene las monedas).

## Fuera de alcance del MVP

- Más animales o alimentos.
- Tienda para gastar las monedas.
- Imágenes reales generadas con Grok por los niños (sustituirán a los placeholders sin cambiar código de lógica).
- Animaciones o sprites más elaborados.
- Empaquetado a APK de Android con Capacitor (siguiente hito, después de validar el MVP en el navegador).

## Testing

Al ser un juego pequeño para niños jugado a mano, el MVP se valida jugándolo directamente en el navegador (recorrer el flujo completo: mapa → elegir animal → probar las 4 comidas con cada animal → comprobar reacciones, sonidos y monedas → volver al mapa). No se plantea un framework de tests automatizados para este MVP.
