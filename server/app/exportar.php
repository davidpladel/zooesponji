<?php
// Solo por SSH, desde tools/comunidad/envios.mjs:  php <carpeta app>/exportar.php AAAA-MM-DD
// Está fuera de la carpeta pública; y si alguien lo llamara desde la web, no responde nada.
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require __DIR__ . '/autoload.php';

[$estado, $cuerpo] = Zoo\Servicio::atender(static fn (): array => Zoo\Exportar::procesar(
    $argv[1] ?? null,
    Zoo\Servicio::almacen(Zoo\Servicio::config(__DIR__)),
));
fwrite($estado === 200 ? STDOUT : STDERR, (string) json_encode($cuerpo, JSON_UNESCAPED_UNICODE));
exit($estado === 200 ? 0 : 1);
