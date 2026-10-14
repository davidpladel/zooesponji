<?php
// Sirve las páginas de la web con sus cabeceras de seguridad. nginx entrega los .html sueltos sin pasar por
// Apache, así que las páginas viven fuera de la carpeta pública y solo salen por aquí.
declare(strict_types=1);

$dir = is_dir(__DIR__ . '/../private/paginas') ? __DIR__ . '/../private/paginas' : __DIR__ . '/../paginas';
$rutas = require $dir . '/rutas.php';
$clave = $_GET['p'] ?? '';
if (!is_string($clave) || !isset($rutas[$clave]) || $clave === '404') {
    http_response_code(404);
    $clave = '404';
}
header_remove('X-Powered-By');
header('Content-Type: text/html; charset=utf-8');
header("Content-Security-Policy: default-src 'self'; connect-src 'self' https://api.zooesponji.com; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Cache-Control: public, max-age=300');
readfile($dir . '/' . $rutas[$clave]);
