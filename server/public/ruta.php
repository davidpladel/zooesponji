<?php
// Dónde está la carpeta app/, fuera de la carpeta pública. En Hestia, private/app (al lado de public_html);
// en el repositorio, app/. Se sube con cada actualización, así que no hay que editarlo a mano.
return is_dir(__DIR__ . '/../private/app') ? __DIR__ . '/../private/app' : __DIR__ . '/../app';
