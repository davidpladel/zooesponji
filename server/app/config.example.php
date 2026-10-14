<?php
// Copiar a config.php (ignorado por git) y rellenar. Nunca subir el archivo relleno.
return [
    'db_dsn' => 'mysql:host=localhost;dbname=NOMBRE;charset=utf8mb4',
    'db_usuario' => '',
    'db_clave' => '',
    // Webhook de n8n que avisa de cada envío. Vacío: no se avisa.
    'n8n_url' => '',
    // Clave compartida con n8n; viaja en la cabecera X-Zoo-Clave.
    'n8n_clave' => '',
    // Versión vigente de las condiciones de las ideas.
    'condiciones' => '2026-10',
    // Ruta de comunidad.json. Vacía: app/datos/comunidad.json.
    'contenido' => '',
];
