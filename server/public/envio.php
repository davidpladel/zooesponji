<?php
declare(strict_types=1);

use Zoo\AvisadorN8n;
use Zoo\Envio;
use Zoo\Http;
use Zoo\Servicio;

$app = require __DIR__ . '/ruta.php';
require $app . '/autoload.php';

if (!Http::metodo('POST')) {
    return;
}
$entrada = Http::cuerpoJson();
Http::responder(...Servicio::atender(static function () use ($app, $entrada): array {
    $config = Servicio::config($app);
    $avisador = new AvisadorN8n($config['n8n_url'], $config['n8n_clave']);
    return Envio::procesar($entrada, Servicio::almacen($config), $avisador, new DateTimeImmutable('now'), $config['condiciones']);
}));
