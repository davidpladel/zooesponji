# Preparar una votación

Scripts de Node sin dependencias. `comunidad.json` no se escribe a mano: se prepara con Claude.

## Preparación (una vez)

Copia `.env.example` a `.env.local` en esta carpeta y rellénalo. Está ignorado por git; el script se
niega a arrancar si no lo está. Los envíos se piden por SSH (no hay dirección web que los dé), así que
hace falta la clave SSH del usuario del servidor y que tu IP esté permitida en el cortafuegos.

## Cada votación

Desde la raíz del repositorio:

    node tools/comunidad/envios.mjs --desde=2026-11-01

Descarga los envíos a `tools/comunidad/data/envios.json` (ignorado por git). **Llevan nombres de
menores: ese archivo no se comparte ni se sube.**

Con Claude: elegir las ideas, redactar las opciones en español e inglés y decidir los créditos
(solo nombre de pila o apodo). Guardar el resultado en `tools/comunidad/data/comunidad.json` y los
dibujos (PNG cuadrados de 256 px) en `tools/comunidad/data/dibujos/`.

    node tools/comunidad/check.mjs tools/comunidad/data/comunidad.json tools/comunidad/data/dibujos

**Cachés.** `estado.php` se lee siempre al momento: el juego lo pide sin caché y lo nuevo de `comunidad.json`
se ve al arrancar el juego y cada vez que se abre el tablón. Los dibujos, en cambio, se guardan un día en los móviles.
Por eso **nunca se cambia un dibujo con el mismo nombre**: cada dibujo nuevo, o retocado, lleva un nombre nuevo
(por ejemplo `2026-11-delfines.png`, o `-v2`), y se cambia también en `comunidad.json`.

Si dice que vale, subir con el gestor de archivos de Hestia: los dibujos a `dibujos/` de la carpeta
pública y `comunidad.json` a `app/datos/`. Los dibujos primero.

## Cerrar una votación

Poner en `ganadora` el id de la opción que gana (en caso de empate decides tú), añadir la entrada al
principio de `muro` con `"estado": "elegida"`, y pasar el comprobador. Cuando la idea esté hecha en el
juego, cambiar su estado a `"hecha"` y, si toca, poner `recinto`.
