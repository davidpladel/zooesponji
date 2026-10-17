<?php
// Solo por SSH:  php <carpeta app>/votos-hora.php <votación>
// Votos contados y frenados por el tope, hora a hora. Para mirar antes de cerrar una votación.
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require __DIR__ . '/autoload.php';

[$estado, $cuerpo] = Zoo\Servicio::atender(static function () use ($argv): array {
    $votacion = $argv[1] ?? null;
    if (!is_string($votacion) || preg_match(Zoo\Contenido::ID, $votacion) !== 1) {
        return [400, ['error' => 'peticion']];
    }
    return [200, ['horas' => Zoo\Servicio::almacen(Zoo\Servicio::config(__DIR__))->votosPorHora($votacion)]];
});
fwrite($estado === 200 ? STDOUT : STDERR, (string) json_encode($cuerpo, JSON_PRETTY_PRINT) . "\n");
exit($estado === 200 ? 0 : 1);
