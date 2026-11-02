# Web de Zoo Esponji (www.zooesponji.com)

Portada, prensa, formulario de ideas y fallos, condiciones, privacidad y cookies, en español e inglés. Sin librerías.
Prensa: PDF en los 11 idiomas del juego, originales de imágenes y ZIP editorial. Fuentes y guía de regeneración/publicación en [prensa/README.md](prensa/README.md).
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
- `paginas/aviso-legal.html` y `paginas/legal-notice.html` llevan datos personales y están en `.gitignore`: solo
  existen en el ordenador de David y en el servidor. Un cambio común a todas las páginas (el pie, por ejemplo) hay
  que hacerlo también en ellas a mano; git no avisa porque no las ve.
- `prensa/` (no se publica): textos y generador del kit de prensa. Ver [prensa/README.md](prensa/README.md).

## Direcciones

| Dirección | Página |
|---|---|
| `/` · `/en` | Portada |
| `/prensa` · `/press` | Dossier, PDF, imágenes, tráileres y contacto de prensa |
| `/ideas` · `/ideas/en` | Formulario de ideas y fallos |
| `/condiciones` · `/terms` | Condiciones de las ideas |
| `/privacidad` · `/privacy` | Privacidad del juego y de esta web |
| `/cookies` · `/cookies/en` | Política de cookies |

## Reglas

- Ningún enlace a GitHub ni a una versión web del juego (lo comprueba `server/tests/WebTest.php`).
- `/ideas` e `/ideas/en` no se indexan (`noindex` y `robots.txt`), para que lleguen menos robots al formulario.
- Para compartir: cada página lleva Open Graph y X con `assets/img/compartir-1200.jpg` (o `-en`), 1200×630.
- Para publicar: ver «Publicar» más abajo.
- Ninguna versión del juego escrita en la web (así no hay que actualizarla). Lista de sitios con versión: «Versión» en `game/README.md`.
- El formulario es una sola caja (idea **o** fallo), con el nombre del peque primero; lo envía una persona adulta.
- Las imágenes salen del arte del juego y de la ficha de Play. El botón de Google Play es el oficial, sin modificar.
- `app-ads.txt` es una copia del de davidpladel.com, por si la web de desarrollador de Play pasa a ser este dominio.

**Caché:** el servidor guarda `assets/` en el navegador 10 años. Al cambiar un `.css` o `.js`, sube el `?v=AAAAMMDD` de sus enlaces en todas las páginas (`paginas/*.html`).

## Página nueva

1. La página en `paginas/` (copiar cabecera, pie, letras y `cookies.js?v=…` de una existente; así lleva Matomo).
2. Su clave en `paginas/rutas.php` y su regla en `public/.htaccess`.
3. Si va en el pie: añadir el enlace en **todas** las páginas, incluidas `aviso-legal.html` y `legal-notice.html`
   (ignoradas por git). `server/tests/WebTest.php` comprueba los enlaces del pie en todas las `paginas/*.html`.

## Probar en local

Arranque «web» de `.claude/launch.json` (PHP de XAMPP en `localhost:8090`). Sin `.htaccess`, así que las páginas se
abren como `/pagina.php?p=prensa`. Pruebas: `php herramientas/phpunit.phar tests/WebTest.php` desde `server/`.

## Publicar

Por SSH con el usuario de Hestia de la web (datos en la memoria local, nunca en el repo).

1. **Comparar antes de pisar**: sumas md5 de `public_html` y `private/paginas` del servidor contra el último commit
   publicado. Si algo difiere en contenido (no solo en fines de línea), alguien lo cambió allí: traerlo antes.
2. **Copia** en el servidor: `~/copia-web/web-AAAAMMDD-antes-<cambio>.tgz` con `public_html` y `private/paginas`.
3. **Subir** con `tar` por SSH: `public/` encima de `public_html` y `paginas/` encima de `private/paginas`
   (`--no-same-owner`). Nada se borra al subir; borrar algo del servidor solo con el permiso de David y con copia antes.
4. **Comprobar** desde fuera: cada dirección nueva da 200 con su CSP, una inexistente da 404, las descargas dan 200, y
   `bash ~/.claude/vps/comprobar-webs.sh 180` acaba en `TODO OK`. Apuntar el cambio en el registro de `vps-hestia.md`.

Los `.txt` se sirven como `text/plain; charset=utf-8`, así que las tildes salen bien sin BOM.
