# Web de Zoo Esponji (www.zooesponji.com)

Portada, formulario de ideas y fallos, condiciones y privacidad, en español e inglés. Sin librerías, sin cookies
y sin medición. El formulario envía a `api.zooesponji.com/envio.php` (código en `server/`).

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

## Reglas

- Ningún enlace a GitHub ni a una versión web del juego (lo comprueba `server/tests/WebTest.php`).
- Las imágenes salen del arte del juego y de la ficha de Play. El botón de Google Play es el oficial, sin modificar.
- `app-ads.txt` es una copia del de davidpladel.com, por si la web de desarrollador de Play pasa a ser este dominio.
