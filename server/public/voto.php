<?php
declare(strict_types=1);

use Zoo\Contenido;
use Zoo\Http;
use Zoo\Reloj;
use Zoo\Servicio;
use Zoo\Voto;

$app = require __DIR__ . '/ruta.php';
require $app . '/autoload.php';

if (!Http::metodo('POST')) {
    return;
}
$entrada = Http::cuerpoJson();
Http::responder(...Servicio::atender(static function () use ($app, $entrada): array {
    $config = Servicio::config($app);
    $hoy = Reloj::hoy(new DateTimeImmutable('now'));
    return Voto::procesar($entrada, Contenido::leer($config['contenido']), Servicio::almacen($config), $hoy);
}));
