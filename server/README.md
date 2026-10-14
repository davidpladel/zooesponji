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
   Abre `https://api.zooesponji.com/ideas/` y envía una idea de prueba.
7. **Comprobar que lo privado no se ve.** `https://api.zooesponji.com/ruta.php` debe dar «prohibido», y no
   debe existir ninguna dirección que enseñe `config.php`.

Si algo responde `{"error":"no-disponible"}`, el motivo está en el registro de errores del dominio en Hestia.

## Aviso por n8n

1. Flujo nuevo con un nodo **Webhook**: método POST, ruta a tu gusto, autenticación «Header Auth» con
   nombre `X-Zoo-Clave` y valor igual a `n8n_clave`.
2. Nodo de **Telegram** o de **correo**. Escribe el mensaje con los campos como texto plano, sin formato
   Markdown ni HTML (así nada de lo que escriba la gente puede cambiar el mensaje):

       Zoo Esponji · envío {{ $json.body.id }} ({{ $json.body.idioma }})
       Idea: {{ $json.body.idea }}
       Fallo: {{ $json.body.fallo }}
       Nombre: {{ $json.body.nombre }}
       Versión: {{ $json.body.version }} · Modelo: {{ $json.body.modelo }}

3. Activa el flujo y pega la dirección de producción del webhook en `n8n_url` de `config.php`.

Si n8n está caído, los envíos se guardan igual; se ven con `tools/comunidad/envios.mjs`.

## Actualizar

Vuelve a subir `public/` y `app/src/`. No pises `config.php` ni `datos/`.

## Cambiar las condiciones

Guarda la versión anterior como `condiciones-2026-10.html` y enlázala en el punto 9; cambia la versión y
la fecha en `condiciones.html` y `terms.html`, el atributo `data-condiciones` de los dos formularios y
`condiciones` en `config.php`. Las tres cosas a la vez: si no coinciden, el formulario rechaza los envíos.
