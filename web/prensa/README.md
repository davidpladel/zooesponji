# Prensa / Press

Páginas estáticas `/prensa` (ES) y `/press` (EN), servidas por `pagina.php` con la misma CSP que el resto de la web. Los PDF están en los once idiomas del juego. `dossiers.json` es el texto editable y no contiene datos de destinatarios ni campañas individuales.

## Regeneración

Python 3, `fpdf2==2.9.0`, `uharfbuzz`, `fonttools` y Pillow, en un entorno aparte para no tocar el Python del sistema:

```bash
python -m venv <carpeta-temporal>/venv
<carpeta-temporal>/venv/Scripts/python.exe -m pip install fpdf2==2.9.0 uharfbuzz fonttools pillow
<carpeta-temporal>/venv/Scripts/python.exe web/prensa/build.py
```

Desde la raíz del repositorio. Los avisos `MERG NOT subset` de fontTools son normales. Las fuentes se buscan en `C:/Windows/Fonts` o en `PRESS_FONTS_DIR`: arial.ttf, tahoma.ttf, Nirmala.ttc, msyh.ttc y YuGothR.ttc. No se copian los archivos de fuentes al repositorio; los PDF incorporan subconjuntos. Mantener las imágenes y el ZIP de la carpeta de la edición actual (`STAMP`) antes de regenerar. Revisar visualmente las dos páginas de cada idioma después de cambiar textos. Las traducciones no cuentan con revisión profesional externa.

El generador actualiza únicamente los once PDF y las dos páginas. La navegación, rutas, CSS, miniaturas y ZIP se mantienen aparte (ver «Materiales y permisos»). Los textos HTML proceden del mismo JSON que los PDF; la cabecera y el pie se derivan de las portadas existentes para mantener metadatos, fuentes y consentimiento. No editar el HTML generado para cambiar textos del dossier.

**Nombre de contacto:** David Plaza (no «David Pladel»; `davidpladel` es solo el nombre de la cuenta de desarrollador y del dominio del correo). Está en `CONTACT` de `build.py` (contacto y autor de los PDF) y en la ficha de cada idioma de `dossiers.json` («Proyecto familiar…»).

**Comprobar tras regenerar:** con `pdftotext` (Git Bash) que los 11 PDF dicen lo nuevo, y con `pypdf` que su autor y sus enlaces apuntan a la carpeta de `STAMP`. Las páginas `/prensa` y `/press` deben cambiar solo en lo esperado (texto, carpeta y tamaños en KB).

## Materiales y permisos

ZIP: seis capturas originales PNG de 1920 × 1080 (`capturas/`), el logo (el león sentado, el de la web y la portada del libro) transparente en PNG de 2048 × 2048 (`identidad/leon-icono-master.png`) y de 512 × 512 (`identidad/logo-512.png`), el icono de la app (el león con la moneda, el de Play y el móvil desde la 2.11.0) en PNG de 512 × 512 (`identidad/icono-512.png`, copia de `game/store/play/icono-512.png`), condiciones ES/EN y enlaces a los tráileres. Sin vídeos pesados, sprites, datos de contactos ni fotografías de menores. Las descargas individuales usan las mismas imágenes; las de la página son miniaturas WebP de 960 × 540 en `miniaturas/` de la misma carpeta. El ZIP se rehace a mano con esos archivos (sin PDF ni miniaturas).

**Capturas sin cerdos:** el kit es uno para todos los idiomas, árabe incluido, así que se eligen capturas en las que no salen cerdos (como en las fichas de Play de países de mayoría musulmana). Edición 20261126: zona de los leones, Tembo comiendo (también en la portada de los PDF y de la página), baño de Tembo, panteras, tienda y libro. Salen de `game/store/out/` (`galeria/es-*`, `es-tembo-01.png` con `node shots-cerdo.mjs es tembo elefantes-africanos`, `tienda.png`, `libro-mary.png`). **Los nombres de fichero se mantienen** (`captura-1-leones.png`, `captura-4-tienda.png`…) para que la redirección de las carpetas viejas caiga en una imagen equivalente; si una captura nueva no tiene equivalente, lleva nombre nuevo (`captura-2-comer.png`, `captura-3-banar.png`). Las condiciones son de uso editorial, no una cesión de propiedad o de los recursos licenciados.

## Medición y privacidad

- Se reutiliza `/assets/cookies.js?v=20261015`, sin cambios. Matomo web: sitio 4, `statscrog.davidpladel.com`. Solo se carga tras aceptar cookies; conserva rechazo, caducidad y configuración del pie. No hay otro píxel, script de analítica ni iframe de YouTube.
- `enableLinkTracking` registra descargas y enlaces externos cuando existe consentimiento. No duplicar con eventos manuales. Los PDF/ZIP abiertos directamente desde fuera no ejecutan Matomo: para contar esas peticiones hay que consultar registros del servidor. No equivalen a lectura ni a instalación.
- PDF compartidos: `utm_source=kit_prensa`, `utm_medium=pdf`, `utm_campaign=prensa_2026_11`, `utm_content=web_IDIOMA`, `google_play_IDIOMA` o `privacidad_IDIOMA`. El enlace a privacidad sigue siendo directo y accesible. YouTube conserva enlaces oficiales sin UTM; los clics de salida desde la web pueden verse en Matomo.
- No se ponen UTM en la navegación interna de la web. En correos se pueden enlazar `/prensa` o `/press` con UTM de campaña y un código opaco de destinatario, nunca su nombre o correo. El PDF público es común y no identifica al destinatario. Los UTM de Google Play no demuestran instalaciones por sí solos: para esa atribución se necesita comprobar la integración y los informes de Play/Install Referrer.

## Publicación manual

1. Seguir «Publicar» de [../README.md](../README.md): comparar con el servidor y copia de seguridad.
2. Copiar `web/public/` a `public_html/`, incluida `.htaccess` y los nuevos assets.
3. Copiar `web/paginas/` a `private/paginas/`, incluido `rutas.php`. Preservar `aviso-legal.html` y `legal-notice.html` existentes en el servidor, ignorados por Git.
4. No subir `web/prensa/` al directorio público: contiene las fuentes editoriales y el generador.
5. Abrir `/prensa` y `/press`; comprobar alternancia ES/EN, PDF, ZIP, logo, capturas, tráileres y aviso de cookies. Verificar cabeceras CSP y metadatos con la URL pública tras subir.

## Nueva edición (cambia cualquier PDF, el ZIP o una imagen)

Los assets tienen caché de 10 años en el navegador: **nunca sobrescribir un descargable publicado en la misma dirección.**

1. `git mv` de la carpeta actual a una nueva (fecha, o fecha + letra si es el mismo día: `20261102` → `20261102b`).
2. Cambiar `STAMP` en `build.py` (también sube el `?v=` de `prensa.css`) y regenerar.
3. Redirigir las carpetas viejas a la nueva en `web/public/.htaccess` (regla «Ediciones viejas del kit de prensa»).
   Si cambian imágenes o el ZIP, rehacer también las miniaturas y el ZIP (ver «Materiales y permisos»).
4. Publicar la carpeta nueva, `.htaccess`, `prensa.css` y las dos páginas, y **apartar** la carpeta vieja del servidor a
   `~/copia-web/prensa-<carpeta>-apartada` (sin borrarla). nginx sirve directamente los archivos que existen y solo
   pasa a Apache los que no, así que la redirección 301 a la carpeta nueva solo funciona cuando la vieja ya no está.
5. Con permiso de David, borrar la carpeta vieja del servidor después de guardar `~/copia-web/prensa-<carpeta>-borrada.tgz`.

Historial: `20261102` (primera edición, borrada el 2026-11-02) → `20261102b` (contacto «David Plaza») → `20261116` (insignia «Aprobada por profesores» de Google Play) → `20261126` (icono nuevo de la app separado del logo, seis capturas del mapa nuevo con baño, textos con el baño y la clínica, icono hecho con ChatGPT en los créditos). Las direcciones de `20261102b` y `20261116` redirigen a las de `20261126` (una sola regla en `web/public/.htaccess`: al sacar edición nueva se cambia el destino y se añade la carpeta anterior a la lista).
