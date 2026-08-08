# 🦁 ZooEsponji

Juego creado por una niña de 9 años y un niño de 5 años, con la ayuda de su padre y de [Claude Code](https://claude.com/claude-code).

## La idea

Eres el cuidador de los animales del zoo y les das de comer. Cada animal tiene sus gustos: si le ofreces la comida que le gusta se la come feliz (con su sonido), y si le ofreces otra pone cara de disgusto y suena un "no me gusta". Algún animal tiene además una reacción especial con algún alimento, en vez de comérselo o rechazarlo.

## Estado del proyecto

✅ MVP jugable en el navegador (mapa del zoo + alimentar león/cabra). Sin imágenes reales todavía (placeholders con emoji) y sin empaquetar a Android.

## Cómo jugarlo

No hace falta instalar nada. Basta con abrir `index.html` directamente en un navegador (doble clic en el archivo, o `start index.html` en Windows / `open index.html` en Mac).

Para ejecutar los tests automáticos de la lógica de datos y monedas (requiere Node.js):

```bash
node --test tests/*.test.js
```

## Diseño de contenido (v1)

**Animales:** león, cabra

**Alimentos:** piedra, carne, conejo, zanahoria

**Reacciones por animal y alimento:**

| Alimento   | 🦁 León                          | 🐐 Cabra                              |
|------------|-----------------------------------|----------------------------------------|
| Carne      | Se lo come (feliz)                | No le gusta (cara + sonido de rechazo) |
| Conejo     | Se lo come (feliz)                | Reacción especial: lo acaricia con la cabeza (no se lo come) |
| Piedra     | No le gusta (cara + sonido de rechazo) | Se lo come (feliz) — gracioso, se come una piedra |
| Zanahoria  | No le gusta (cara + sonido de rechazo) | Se lo come (feliz)                 |

Esta tabla se implementará como datos (no lógica hardcodeada por animal), para poder añadir animales y alimentos nuevos fácilmente. Cada combinación animal+alimento tiene un resultado de tres tipos posibles: `come` (feliz + sonido), `rechaza` (cara de disgusto + sonido negativo), o `especial` (animación/sonido propio, ej. acariciar).

## Decisiones técnicas

El objetivo es plataforma **Android**, pero todo el desarrollo se hace desde **Claude Code** (terminal, sin editor gráfico), lo que descarta motores con editor visual como Unity o Godot.

Stack elegido:

- **HTML5 + JavaScript** — todo el juego es código plano (HTML/CSS/JS), editable directamente por Claude Code sin necesidad de una GUI.
- **Canvas nativo** para la lógica de dibujo y juego. Se valorará usar [Phaser](https://phaser.io/) solo si hacen falta físicas, animaciones de sprites o colisiones complejas; para una mecánica simple de "elegir animal + dar de comer", Canvas a pelo debería bastar y mantiene el proyecto ligero.
- **[Capacitor](https://capacitorjs.com/)** para empaquetar la web como APK de Android al final del desarrollo.

Este stack se eligió para minimizar la complejidad (y el gasto de tokens) del desarrollo asistido por IA: sin assets pesados, sin escenas de editor, sin configuración compleja — solo lógica en JS.

## Assets gráficos

Los niños crean las imágenes ellos mismos con generación de IA (Grok Imagine), ajustando un prompt base. Claude Code no genera las imágenes, solo las integra en el juego una vez creadas.

- Imágenes **estáticas**, no vídeo (Canvas dibuja imágenes/sprites, no reproduce vídeo).
- Formato **PNG con fondo transparente** (nunca JPG, que lleva fondo sólido y se recorta mal sobre el escenario del zoo).
- Un PNG por animal en pose neutra como mínimo; opcionalmente varios frames (idle / feliz-comiendo / disgusto / especial) para animación sencilla por cambio de frame.
- Un PNG por alimento, también con transparencia.
- Nomenclatura clara y descriptiva, ej. `leon.png`, `cabra.png`, `piedra.png`, `carne.png`, `conejo.png`, `zanahoria.png`.

### Prompt base para Grok (a ajustar por los niños)

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

Consejo: generar primero el animal en pose neutra, y usar esa misma imagen como referencia en Grok al pedir las variantes de expresión, para que no cambie el diseño del personaje entre frames.

## Licencia

Este proyecto no tiene licencia definida todavía. Sin licencia, se aplican los derechos de autor por defecto: el código es visible en GitHub pero no está autorizado su uso, copia o modificación por terceros. Se decidirá una licencia más adelante.
