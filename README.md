# 🦁 ZooEsponji

Creado por y para Daniela y Adrián, con la ayuda de su padre y de [Claude Code](https://claude.com/claude-code).

## La idea

Eres el cuidador de los animales del zoo y les das de comer. Cada animal tiene sus gustos: si le ofreces la comida que le gusta se la come feliz (con su sonido), y si le ofreces otra pone cara de disgusto y suena un "no me gusta". Algún animal tiene además una reacción especial con algún alimento, en vez de comérselo o rechazarlo.

## Estado del proyecto

✅ MVP jugable en el navegador (mapa del zoo con imagen real + alimentar león/cabra con fotos reales por reacción). Sin empaquetar a Android todavía.

## Cómo jugarlo

No hace falta instalar nada. Basta con abrir `index.html` directamente en un navegador (doble clic en el archivo, o `start index.html` en Windows / `open index.html` en Mac).

Para ejecutar los tests automáticos de la lógica de datos y monedas (requiere Node.js):

```bash
node --test tests/*.test.js
```

### Desplegado en producción

El juego vive también en `davidpladel.com/zooesponji`, desplegado con un simple `git pull` en el VPS (ver instrucciones más abajo).

**Importante — caché del navegador:** los `<script>` y `<link>` de `index.html` llevan un parámetro `?v=N` (ej. `js/main.js?v=2`). Los móviles cachean agresivamente los JS/CSS por su nombre de archivo; sin ese parámetro, tras actualizar el código en el VPS los usuarios pueden seguir viendo la versión antigua durante días aunque recarguen la página. **Cada vez que se modifique algún archivo `.js` o `.css`, hay que subir en 1 ese número en todas sus apariciones dentro de `index.html`** para forzar la descarga de la versión nueva.

## Diseño de contenido (v1)

**Animales:** león, cabra

**Alimentos:** piedra, carne, conejo, zanahoria

**Reacciones por animal y alimento:**

| Alimento   | 🦁 León                          | 🐐 Cabra                              |
|------------|-----------------------------------|----------------------------------------|
| Carne      | Se lo come (feliz, +1 moneda)     | No le gusta (cara + sonido de rechazo) |
| Conejo     | Se lo come (feliz, +1 moneda)     | Reacción especial: lo acaricia con la cabeza, no se lo come (+2 monedas) |
| Piedra     | No le gusta (cara + sonido de rechazo) | Se lo come (feliz, +1 moneda) — gracioso, se come una piedra |
| Zanahoria  | No le gusta (cara + sonido de rechazo) | Se lo come (feliz, +1 moneda)     |

Esta tabla se implementa como datos (no lógica hardcodeada por animal), para poder añadir animales y alimentos nuevos fácilmente. Cada combinación animal+alimento tiene un resultado de tres tipos posibles: `come` (feliz + sonido, +1 moneda), `rechaza` (cara de disgusto + sonido negativo, sin moneda), o `especial` (animación/sonido propio, ej. acariciar, +2 monedas — el doble por ser una reacción rara).

## Decisiones técnicas

El objetivo es plataforma **Android**, pero todo el desarrollo se hace desde **Claude Code** (terminal, sin editor gráfico), lo que descarta motores con editor visual como Unity o Godot.

Stack elegido:

- **HTML5 + JavaScript** — todo el juego es código plano (HTML/CSS/JS), editable directamente por Claude Code sin necesidad de una GUI.
- **DOM + CSS**, sin Canvas — las imágenes son elementos `<img>` normales posicionados con CSS. Se decidió así (en vez de Canvas) porque arrastrar-y-soltar y las pantallas tipo menú son mucho más simples de hacer y depurar en DOM.
- Arrastrar y soltar con **Pointer Events** (funciona igual con ratón y con el dedo en tablet/móvil).
- **[Capacitor](https://capacitorjs.com/)** para empaquetar la web como APK de Android al final del desarrollo (pendiente).

Este stack se eligió para minimizar la complejidad (y el gasto de tokens) del desarrollo asistido por IA: sin assets pesados, sin escenas de editor, sin configuración compleja — solo lógica en JS.

## Assets gráficos

Los niños crean las imágenes ellos mismos con generación de IA (ChatGPT), ajustando un prompt base. Claude Code no genera las imágenes, solo las integra en el juego una vez creadas — basta con guardar el PNG en `assets/img/` con el nombre exacto que toque y el juego lo usa automáticamente en vez del emoji de repuesto, sin tocar código (ver `js/sprites.js`).

- Imágenes **estáticas**, no vídeo ni GIF (mejor control de tiempos, transparencia real, y el juego ya cambia de imagen por código en el momento justo).
- Formato **PNG con fondo transparente** cuando sea un personaje/objeto recortado (nunca JPG, que lleva fondo sólido).
- **Mapa del zoo:** una única imagen de escena completa — `assets/img/mapa-zoo-2-zonas.png`. Las zonas pinchables (león, cabra) se definen como porcentajes sobre esa imagen en `ZOO_HOTSPOTS` (`js/data.js`), fáciles de reajustar sin tocar el resto del código. Las jaulas todavía no disponibles se pintan directamente en la imagen (con candado), no hace falta lógica aparte para "desactivarlas".
- **Animales:** una foto por estado en `ANIMAL_STATE_IMAGE` (`js/data.js`) — `normal`, `come` (feliz), `rechaza` (enfadado), y `especial` solo si el animal tiene alguna reacción especial (ej. la cabra con el conejo). Nomenclatura actual: `leon-normal.png`, `leon-contentos.png`, `leon-enfadado.png`, `cabras-normal.png`, `cabras-contentas.png`, `cabras-enfadadas.png`, `cabras-con-el-conejo-especial.png`.
- **Alimentos:** un PNG por alimento en `assets/img/` (`piedra.png`, `carne.png`, `conejo.png`, `zanahoria.png`) — de momento siguen como emoji porque aún no se han generado.

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

Próximas versiones planeadas (sin fecha cerrada — cualquiera puede coger una de estas):

- **Tienda**: gastar las monedas ganadas para comprar/desbloquear la pantera y los pandas (ya aparecen bloqueados en el mapa del zoo) y comprar nuevos tipos de comida.
- **Mejorar los sonidos**: sustituir los tonos generados por código (Web Audio) por sonidos más elaborados o grabados.
- **Clínica veterinaria**: una zona del zoo para curar a los animales cuando se ponen malitos.
- **Bañar a los animales**: otra tarea de cuidado además de darles de comer.
- **Más trabajos de cuidador**: ampliar el juego más allá de dar de comer con otras tareas propias de un empleado del zoo (limpiar la jaula, jugar con el animal, etc. — a definir).

Más adelante:

- **Delfines** como nuevo animal (y, con ellos, probablemente una zona de acuario en el mapa del zoo).
- **Animaciones de verdad** para los animales (que se muevan, no solo fotos fijas por reacción).

Ideas ya recogidas antes pero sin planificar todavía: imágenes reales para los alimentos (de momento son emoji), y empaquetado a APK de Android con Capacitor.

## Cómo contribuir

¡Se aceptan colaboraciones! La idea es que el zoo crezca con más animales, más comidas y mejores gráficos. Para contribuir:

1. Haz un fork del repositorio y crea una rama para tu cambio.
2. Sigue las convenciones ya establecidas: nuevo animal o comida → añádelo en `js/data.js` (listas `ANIMALS`/`FOODS`, `REACTIONS`, imágenes en `ANIMAL_STATE_IMAGE`/`FOOD_IMAGE`) sin tocar la lógica de las pantallas, que ya es genérica.
3. Comprueba que los tests siguen pasando: `node --test tests/*.test.js`.
4. Abre un Pull Request describiendo el cambio.

## Licencia

Copyright (C) 2026 [davidpladel](https://github.com/davidpladel) — hecho con cariño por Daniela y Adrián 💛

[GPL-3.0](LICENSE). Cualquiera puede usar, copiar, modificar y redistribuir este proyecto, siempre que las versiones modificadas que se distribuyan sigan siendo de código abierto bajo la misma licencia.
