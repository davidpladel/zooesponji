# 🦁 ZooEsponji

Creado por y para Daniela y Adrián, con la ayuda de su padre y de Claude + OpenCode + DeepSeek + ChatGPT.

## La idea

Eres el cuidador de los animales del zoo y les das de comer. Cada animal tiene sus gustos: si le ofreces la comida que le gusta se la come feliz (con su sonido), y si le ofreces otra pone cara de disgusto y suena un "no me gusta". Algún animal tiene además una reacción especial con algún alimento. Ganas monedas al alimentarlos bien, y con ellas puedes desbloquear nuevas zonas del zoo en la tienda.

## Estado del proyecto

v1.1.0 — 4 animales jugables (león, cabra, pantera negra, oso panda), tienda con sistema de desbloqueo de zonas, progresión con monedas, 31 tests. Sin empaquetar a Android todavía.

## Cómo jugarlo

No hace falta instalar nada. Basta con abrir `index.html` directamente en un navegador (doble clic en el archivo, o `start index.html` en Windows / `open index.html` en Mac).

Para ejecutar los tests automáticos (requiere Node.js):

```bash
node --test tests/*.test.js
```

### Desplegado en producción

El juego vive también en `davidpladel.com/zooesponji`, desplegado con un simple `git pull` en el VPS.

**Importante — caché del navegador:** toda la versión está centralizada en una sola constante `APP_VERSION` definida en el `<script>` inicial de `index.html`. CSS, JS e imágenes usan este mismo número como `?v=`. **Para forzar la recarga de caché en todos los clientes, basta con cambiar `APP_VERSION` en `index.html`** (ej. de `'1.1.0'` a `'1.1.1'`). No hay que tocar nada más.

## Diseño de contenido (v1.1.0)

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

## Decisiones técnicas

El objetivo es plataforma **Android**, pero todo el desarrollo se hace desde Claude + OpenCode + DeepSeek + ChatGPT (terminal, sin editor gráfico), lo que descarta motores con editor visual como Unity o Godot.

Stack elegido:

- **HTML5 + JavaScript** — todo el juego es código plano (HTML/CSS/JS), editable directamente sin necesidad de una GUI.
- **DOM + CSS**, sin Canvas — las imágenes son elementos `<img>` normales posicionados con CSS. Se decidió así (en vez de Canvas) porque arrastrar-y-soltar y las pantallas tipo menú son mucho más simples de hacer y depurar en DOM.
- Arrastrar y soltar con **Pointer Events** (funciona igual con ratón y con el dedo en tablet/móvil).
- **[Capacitor](https://capacitorjs.com/)** para empaquetar la web como APK de Android al final del desarrollo (pendiente).

Este stack se eligió para minimizar la complejidad del desarrollo asistido por IA: sin assets pesados, sin escenas de editor, sin configuración compleja — solo lógica en JS.

## Assets gráficos

Los niños crean las imágenes ellos mismos con generación de IA (ChatGPT), ajustando un prompt base. Basta con guardar el PNG en `assets/img/` con el nombre exacto que toque y el juego lo usa automáticamente en vez del emoji de repuesto, sin tocar código (ver `js/sprites.js`).

- Imágenes **estáticas**, no vídeo ni GIF (mejor control de tiempos, transparencia real, y el juego ya cambia de imagen por código en el momento justo).
- Formato **PNG con fondo transparente** cuando sea un personaje/objeto recortado (nunca JPG, que lleva fondo sólido).
- **Mapa del zoo:** una única imagen de escena completa — `assets/img/mapa-zoo-2-zonas-mapa-todo-activo.png`. Las zonas pinchables se definen como porcentajes sobre esa imagen en `ZOO_HOTSPOTS` (`js/data.js`). Las zonas bloqueadas se marcan con insignias circulares de candado (`candado-1.png`) posicionadas por código sobre cada zona no desbloqueada.
- **Animales:** una foto por estado en `ANIMAL_STATE_IMAGE` (`js/data.js`) — `normal`, `come` (feliz), `rechaza` (enfadado), y `especial` solo si el animal tiene alguna reacción especial (ej. la cabra o el panda con el conejo).
- **Alimentos:** un PNG por alimento en `assets/img/` (`piedra.png`, `carne.png`, `conejo.png`, `zanahoria.png`) — de momento siguen como emoji.
- **Tienda:** imagen de fondo independiente — `assets/img/tienda-para-desbloquear.png`.

### Prompt base para ChatGPT (a ajustar por los niños)

Plantilla de partida — cambiar solo lo que está entre `[corchetes]`, manteniendo el resto para que todos los animales/alimentos tengan un estilo consistente:

```
Ilustración digital plana de [ANIMAL/OBJETO: ej. "un león", "una zanahoria"],
estilo cartoon infantil, colores vivos y alegres, contorno grueso limpio,
sin sombras realistas, vista frontal o de 3/4, personaje/objeto centrado,
sin fondo (fondo totalmente transparente / blanco puro para recortar),
alta resolución, sin texto, sin marca de agua.
```

Para las expresiones/reacciones del mismo animal, usar el mismo prompt añadiendo la emoción, para mantener el mismo diseño de personaje en todos los frames:

```
[mismo prompt del animal] + expresión de [feliz comiendo / disgusto y rechazo / sorpresa cariñosa]
```

Consejo: generar primero el animal en pose neutra, y usar esa misma imagen como referencia en ChatGPT al pedir las variantes de expresión, para que no cambie el diseño del personaje entre frames.

## Roadmap

Próximas versiones planeadas (sin fecha cerrada):

- **Más items en la tienda**: nuevos tipos de comida, zonas adicionales (delfines), y otras sorpresas.
- **Mejorar los sonidos**: sustituir los tonos generados por código (Web Audio) por sonidos más elaborados o grabados.
- **Clínica veterinaria**: una zona del zoo para curar a los animales cuando se ponen malitos.
- **Bañar a los animales**: otra tarea de cuidado además de darles de comer.
- **Más trabajos de cuidador**: ampliar el juego más allá de dar de comer con otras tareas propias de un empleado del zoo (limpiar la jaula, jugar con el animal, etc.).
- **Delfines** como nuevo animal (y, con ellos, probablemente una zona de acuario en el mapa del zoo).
- **Animaciones de verdad** para los animales (que se muevan, no solo fotos fijas por reacción).
- **Empaquetado APK** de Android con Capacitor.

## Cómo contribuir

¡Se aceptan colaboraciones! La idea es que el zoo crezca con más animales, más comidas y mejores gráficos. Para contribuir:

1. Haz un fork del repositorio y crea una rama para tu cambio.
2. Sigue las convenciones ya establecidas: nuevo animal o comida → añádelo en `js/data.js` (listas `ANIMALS`/`FOODS`, `REACTIONS`, `ANIMAL_COINS`, imágenes en `ANIMAL_STATE_IMAGE`/`FOOD_IMAGE`) sin tocar la lógica de las pantallas, que ya es genérica.
3. Comprueba que los tests siguen pasando: `node --test tests/*.test.js`.
4. Abre un Pull Request describiendo el cambio.

## Licencia

Copyright (C) 2026 [davidpladel](https://github.com/davidpladel) — hecho con cariño por Daniela y Adrián 💛

[GPL-3.0](LICENSE). Cualquiera puede usar, copiar, modificar y redistribuir este proyecto, siempre que las versiones modificadas que se distribuyan sigan siendo de código abierto bajo la misma licencia.