<?php
declare(strict_types=1);

use Zoo\Contenido;
use Zoo\Estado;
use Zoo\Http;
use Zoo\Reloj;
use Zoo\Servicio;

$app = require __DIR__ . '/ruta.php';
require $app . '/autoload.php';

if (!Http::metodo('GET')) {
    return;
}
[$estado, $cuerpo] = Servicio::atender(static function () use ($app): array {
    $config = Servicio::config($app);
    $hoy = Reloj::hoy(new DateTimeImmutable('now'));
    return [200, Estado::construir(Contenido::leer($config['contenido']), Servicio::almacen($config), $hoy)];
});
Http::responder($estado, $cuerpo, $estado === 200 ? 60 : 0);
