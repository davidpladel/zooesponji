# Web de Zoo Esponji (www.zooesponji.com)

Portada, formulario de ideas y fallos, condiciones, privacidad y cookies, en español e inglés. Sin librerías.
El formulario envía a `api.zooesponji.com/envio.php` (código en `server/`).

Medición: Matomo de statscrog.davidpladel.com, **sitio 4** (el juego usa otro sitio aparte). `assets/cookies.js`
no carga nada hasta que la persona pulsa «Aceptar» en el aviso; «Rechazar» pesa igual, la elección dura 12 meses y
«Configurar cookies» del pie la vuelve a preguntar. La cabecera CSP de `pagina.php` permite ese dominio. Si se añade
otra herramienta con cookies, hay que añadirla a `cookies.html` y `cookies-en.html`.

Letras: solo dos, Baloo 2 (títulos y botones) y Nunito (texto), servidas desde `assets/fonts/`. No añadir más.

## Carpetas

- `public/` → `public_html` del dominio: `pagina.php` (sirve las páginas con sus cabeceras de seguridad),
  `.htaccess` (direcciones limpias y `zooesponji.com` → `www`), `assets/`, `robots.txt`, `app-ads.txt`.
- `paginas/` → `private/paginas` (al lado de `public_html`): las páginas HTML y `rutas.php`, la lista de
  direcciones que existen. nginx entrega los `.html` sueltos sin cabeceras, por eso no están en `public/`.

## Direcciones

| Dirección | Página |
|---|---|
| `/` · `/en` | Portada |
| `/ideas` · `/ideas/en` | Formulario de ideas y fallos |
| `/condiciones` · `/terms` | Condiciones de las ideas |
| `/privacidad` · `/privacy` | Privacidad del juego y de esta web |
| `/cookies` · `/cookies/en` | Política de cookies |

## Reglas

- Ningún enlace a GitHub ni a una versión web del juego (lo comprueba `server/tests/WebTest.php`).
- `/ideas` e `/ideas/en` no se indexan (`noindex` y `robots.txt`), para que lleguen menos robots al formulario.
- Para compartir: cada página lleva Open Graph y X con `assets/img/compartir-1200.jpg` (o `-en`), 1200×630.
- Para publicar: copiar `public/` encima de `public_html` y `paginas/` encima de `private/paginas` (antes, copia de seguridad en `~/copia-web/`).
- Ninguna versión del juego escrita en la web (así no hay que actualizarla). Lista de sitios con versión: «Versión» en `game/README.md`.
- El formulario es una sola caja (idea **o** fallo), con el nombre del peque primero; lo envía una persona adulta.
- Las imágenes salen del arte del juego y de la ficha de Play. El botón de Google Play es el oficial, sin modificar.
- `app-ads.txt` es una copia del de davidpladel.com, por si la web de desarrollador de Play pasa a ser este dominio.

**Caché:** el servidor guarda `assets/` en el navegador 10 años. Al cambiar un `.css` o `.js`, sube el `?v=AAAAMMDD` de sus enlaces en todas las páginas (`paginas/*.html`).
