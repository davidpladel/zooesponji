# Servidor de comunidad de Zoo Esponji

PHP 8.1 o superior y MySQL. Sin Composer ni librerías. Diseño: `docs/superpowers/specs/2026-10-12-comunidad-design.md`.

## Pruebas (en tu ordenador)

    cd server
    php herramientas/phpunit.phar

## Instalar en el VPS (Hestia), una vez

1. **Dominio.** En Hestia, crea un subdominio con HTTPS (Let's Encrypt), en nuestro caso `api.zooesponji.com`, con un usuario de Hestia propio solo para esto (sin permisos de administrador).
2. **Base de datos.** En Hestia → DB, crea una base de datos y un usuario. Abre phpMyAdmin y ejecuta el
   contenido de `app/esquema.sql`.
3. **Archivos.** Con el gestor de archivos de Hestia:
   - Sube el contenido de `public/` a `public_html/` del subdominio.
   - Sube la carpeta `app/` a `private/app/` del subdominio (al lado de `public_html`, no dentro).
   - No hay que tocar `ruta.php`: encuentra `private/app` solo.
4. **Configuración.** Copia `private/app/config.example.php` a `private/app/config.php` y rellénalo.
   `n8n_clave`: una clave de 40 caracteres al azar. En PowerShell:

       -join ((48..57) + (97..122) | Get-Random -Count 40 | ForEach-Object { [char]$_ })

5. **Contenido.** Copia `private/app/datos/comunidad.example.json` a `private/app/datos/comunidad.json`
   y cambia `"votacion": {...}` por `"votacion": null` hasta que haya una de verdad.
6. **Comprobar.** Abre `https://api.zooesponji.com/estado.php`: debe salir `{"hoy":"…","ideas":0,"votacion":null,…}`.
   La página del formulario está en la web (`web/`, www.zooesponji.com/ideas).
7. **Comprobar que lo privado no se ve.** `https://api.zooesponji.com/ruta.php` debe dar «prohibido», y no
   debe existir ninguna dirección que enseñe `config.php`.

Los dibujos del tablón (`public/dibujos/`) los sirve `dibujo.php?f=<nombre>.png`, que añade el permiso de lectura (CORS) que nginx no manda en los archivos estáticos y que el juego necesita para pintarlos.

Si algo responde `{"error":"no-disponible"}`, el motivo está en el registro de errores del dominio en Hestia.

## Aviso por n8n

El flujo está hecho: `server/n8n/aviso-comunidad.json`. Para ponerlo en marcha:

1. En n8n: **Importar desde archivo** y elige ese JSON.
2. En el nodo **Envío desde api.zooesponji.com**, crea la credencial «Header Auth» llamada
   `Zoo comunidad (X-Zoo-Clave)`: nombre `X-Zoo-Clave`, valor el de `n8n_clave` de `private/app/config.php`
   (cópialo desde el gestor de archivos de Hestia; no lo pegues en ningún otro sitio).
3. En el nodo **Correo**, elige tu credencial SMTP (o crea una). Va de `android@davidpladel.com` a
   `android@davidpladel.com`; cámbialo si quieres.
4. Opcional: activa el nodo **Telegram**, elige su credencial y pon tu chat. Va desactivado.
5. Activa el flujo y copia la «Production URL» del webhook en `n8n_url` de `config.php`.

Los mensajes van en texto plano, sin Markdown ni HTML: nada de lo que escriba la gente puede cambiar su formato.
El flujo no guarda las ejecuciones que van bien, para no dejar copias de los envíos en n8n.

Si n8n está caído, los envíos se guardan igual; se ven con `tools/comunidad/envios.mjs`.

## Freno de votos

Dos capas. La de PHP ya viene en el código: cada votación cuenta como mucho `votos_hora` votos por hora
(300 por defecto; cámbialo en `config.php`). Los que pasan no suman, pero se responde igual. Antes de cerrar
una votación, mira si ha habido avalanchas:

    php ~/web/api.zooesponji.com/private/app/votos-hora.php <votación>

La de nginx frena a una sola dirección que manda muchos votos. Necesita un administrador del VPS, una vez:

1. Crear `/etc/nginx/conf.d/zoo-voto.conf` con:

       limit_req_zone $binary_remote_addr zone=zoo_voto:1m rate=<votos>r/m;

2. Crear `/home/<usuario>/conf/web/api.zooesponji.com/nginx.ssl.conf_zoo-voto` (Hestia lo incluye dentro del
   `server` del dominio y no lo borra al reconstruir). `<ip>` y el puerto son los de `proxy_pass` en el
   `nginx.ssl.conf` de al lado:

       location = /voto.php {
           limit_req zone=zoo_voto burst=<margen> nodelay;
           limit_req_status 429;
           proxy_ssl_server_name on;
           proxy_ssl_name $host;
           proxy_pass https://<ip>:<puerto>;
       }

3. `nginx -t` y, si dice «ok», `systemctl reload nginx`.

nginx lleva la cuenta solo en memoria; la dirección no se escribe en ningún sitio.

## Actualizar

Vuelve a subir `public/` y `app/src/` (y los scripts sueltos de `app/`, como `votos-hora.php`). No pises `config.php` ni `datos/`.
Si `app/esquema.sql` trae una tabla nueva, ejecútala en phpMyAdmin antes de subir el código.

## Cambiar las condiciones

Guarda la versión anterior como `condiciones-2026-10.html` y enlázala en el punto 9; cambia la versión y
la fecha en `condiciones.html` y `terms.html`, el atributo `data-condiciones` de los dos formularios y
`condiciones` en `config.php`. Las tres cosas a la vez: si no coinciden, el formulario rechaza los envíos.
