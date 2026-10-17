# Tráiler de Zoo Esponji

Vídeo promocional de 43 s a 1920×1080 y 30 fps, en español y en inglés. Todo sale de scripts: se graba una partida guionizada del juego real, se monta encima con textos, zooms y confeti en una página HTML, y se le pone una música sintetizada. No hay ningún archivo de vídeo, música ni arte en el repo: todo lo generado va a `trailer/out/` (ignorada por git).

Última versión: 2026-10-17, con el juego 2.6.0 (ventana de comer nueva y tienda por dentro).

## Qué hace falta

- El juego en marcha: `npm run dev` en `game/` (puerto 5173).
- Google Chrome instalado (Playwright lo usa con `channel: 'chrome'`).
- Un `ffmpeg.exe` con `libx264` y `aac`. No está en el PATH; el que funciona en el PC de David es `C:\Program Files\OmniVoice Studio\ffmpeg.exe`. El ffmpeg de Playwright y el de CapCut **no** valen (no traen libx264).

## Pasos (desde `game/`, en PowerShell)

```powershell
$FF = "C:\Program Files\OmniVoice Studio\ffmpeg.exe"
node trailer/synth.mjs                      # música: out/audio/music.wav (igual para los dos idiomas; solo hace falta una vez)
node trailer/capture.mjs es                 # graba la partida: out/gameplay-es.webm + out/marks-es.json (~2 min)
& $FF -v error -y -i trailer/out/gameplay-es.webm -c:v libx264 -preset fast -crf 16 -g 1 -pix_fmt yuv420p -r 25 trailer/out/gameplay-es.mp4
node trailer/render.mjs es $FF --preview    # 12 fotogramas sueltos en out/frames/prev-es-*.jpg para revisar
node trailer/render.mjs es $FF              # vídeo final: out/zoo-esponji-trailer-es.mp4 (~10 min)
```

Para inglés, lo mismo cambiando `es` por `en`. Cada idioma necesita su propia grabación, porque los textos del juego (nombres de los animales, bocadillos, tienda) salen en ese idioma: `capture.mjs` abre el navegador con `locale` `es-ES` o `en-US` y el juego lo detecta solo.

El paso a MP4 con `-g 1` (todos los fotogramas clave) es a propósito: el montaje salta a segundos exactos del vídeo fuente y así cada salto es inmediato y exacto. El archivo pesa ~250 MB, no pasa nada.

`synth.mjs` necesita que exista la carpeta `out/audio/` (créala si no está).

## Las piezas

| Archivo | Qué hace |
|---|---|
| `capture.mjs <idioma>` | Abre el juego con la partida borrada y juega solo, con los ganchos de prueba `window.__ZOO__`. Graba la pantalla y apunta en `marks-<idioma>.json` el segundo en que pasa cada cosa. |
| `compose.html` | El montaje. `window.render(t)` dibuja el segundo `t` del tráiler: elige el plano, salta al segundo del vídeo fuente, aplica zoom y temblor, y pone el texto con rebote, los destellos y el confeti. |
| `render.mjs <idioma> <ffmpeg>` | Abre `compose.html` inyectando `window.LANG` y `window.MARKS`, saca los 1290 fotogramas como JPG y los une con la música en el MP4. Con `--preview` solo saca 12 fotogramas. |
| `synth.mjs` | Sintetiza la música (120 BPM, Do–Sol–Lam–Fa), los golpes de timbal del principio, el redoble, los «pop» de cada texto (`POPS`) y el ¡ta‑dá! final. |

## La partida que se graba (`capture.mjs`)

1. Portada 4 s y toque en «Jugar».
2. Mundo 2,5 s (la cuidadora junto al portón).
3. Da de comer a **Bills, el león**: carne, piedra y conejo (`feedResident('bills')`).
4. Da de comer a **Gordi, la cabra**: zanahoria y conejo.
5. Recibe 130 monedas, va a la tienda y compra el **panda**.
6. Da de comer a **Mochi, el panda**: zanahoria y conejo.

Cada comida es un arrastre real con el ratón, de la comida al animal, y deja 2,2 s para la reacción («¡Ñam!», «¡Guau!», corazones…). Marcas que se apuntan: `title`, `world`, `<animal>_walk`, `<animal>_feed`, `<animal>_<comida>`, `shop_walk`, `shop`, `panda_bought`, `end`.

Si cambia el juego y se rompe la grabación, lo normal es que haya cambiado un gancho de `src/systems/testHooks.ts` (por ejemplo, en la 2.6.0 ya no basta con ir a la puerta del recinto: hay que usar `feedResident(id)`) o el nombre de un animal en `src/data/pens.ts`.

## El guion (`compose.html`)

Los planos no usan segundos fijos del vídeo fuente sino las marcas (`M.leon_carne - 0.35`…), así que aguantan que la partida tarde más o menos.

| Tiempo | Plano (vídeo fuente) | Texto ES | Texto EN |
|---|---|---|---|
| 0–3 s | negro, tres golpes de timbal con temblor | ¡¿QUÉ ES ESO?! | WHAT IS THAT?! |
| 3–6,5 | portón de entrada (`world`) | ¡BIENVENIDO! | WELCOME! |
| 6,5–10 | paseo hacia la cabra, la fuente (`cabra_walk`) | TU PROPIO ZOO | YOUR OWN ZOO |
| 10–13,5 | león comiendo carne (`leon_carne`) | ¡LEONES! | LIONS! |
| 13,5–17 | cabra (`cabra_zanahoria`) | ¡CABRAS! | GOATS! |
| 17–20,5 | panda (`panda_zanahoria`) | ¡PANDAS! | PANDAS! |
| 20,5–24 | cabra con el conejo (`cabra_conejo`) | ¡DALES DE COMER! | FEED THEM! |
| 24–26,5 | león con el conejo (`leon_conejo`) | ¡CUIDA! | CARE! |
| 26,5–29 | panda con corazones (`panda_conejo`) | ¡RÍE! | LAUGH! |
| 29–31,5 | tienda, compra del panda (`panda_bought`); redoble | ¡WOW! | WOW! |
| 31,5–35 | gente paseando por la plaza (`panda_walk`) | ¡TODOS TE ESPERAN! | THEY'RE ALL WAITING! |
| 35–43 | portón desenfocado, confeti | ZOO / ESPONJI | ZOO / ESPONJI |
| 38,5–43 | | ¡MUY PRONTO EN GOOGLE PLAY! | COMING SOON TO GOOGLE PLAY! |

Destellos blancos en 3, 10, 24, 31,5, 35 y 41 s. Letra Lilita One (Google Fonts), mayúsculas amarillas con borde marrón.

Para cambiar algo:

- **Textos**: la tabla `WORDS` (un array por idioma, en el mismo orden que `TEXTS`). Tamaño, altura y color, en `TEXTS`. Si un texto en inglés es más largo, baja su tamaño para que quepa en 1920 px.
- **Planos**: `SHOTS` = `[inicio, fin, segundo fuente, zoom inicial, zoom final, centroX, centroY]`. El centro 960,470 encuadra la ventana de comer.
- **Música y efectos**: `synth.mjs`. Si se mueven los textos, mueve también `POPS` para que el «pop» coincida.
- **Cuando el juego ya esté publicado**: cambia «¡MUY PRONTO EN GOOGLE PLAY!» por «¡YA EN GOOGLE PLAY!» / «NOW ON GOOGLE PLAY!».

Para revisar sin esperar al render entero, `--preview` saca los fotogramas de los segundos 1,5, 5, 8, 12, 15, 19, 22, 25, 28, 30, 33 y 40.
