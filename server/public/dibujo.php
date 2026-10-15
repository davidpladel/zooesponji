<?php
declare(strict_types=1);

use Zoo\Dibujo;
use Zoo\Http;

// Sirve un dibujo de `dibujos/` con permiso de lectura para el juego (nginx no manda CORS en los estáticos y Phaser lo necesita).
$app = require __DIR__ . '/ruta.php';
require $app . '/autoload.php';

if (!Http::metodo('GET')) {
    return;
}
$nombre = Dibujo::nombre($_GET['f'] ?? null);
if ($nombre === null) {
    Http::responder(400, ['error' => 'peticion']);
    return;
}
$ruta = __DIR__ . '/dibujos/' . $nombre;
if (!is_file($ruta)) {
    Http::responder(404, ['error' => 'no-existe']);
    return;
}
header_remove('X-Powered-By');
header('Content-Type: image/png');
header('Access-Control-Allow-Origin: *');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: public, max-age=86400');
$tam = filesize($ruta);
if ($tam !== false) {
    header('Content-Length: ' . (string) $tam);
}
readfile($ruta);
