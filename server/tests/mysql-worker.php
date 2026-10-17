<?php
// Un proceso de MysqlTest: espera a la hora de salida y lanza operaciones contra MySQL a la vez que los demás.
declare(strict_types=1);
require __DIR__ . '/../app/autoload.php';
[, $modo, $salida, $indice] = $argv;
$almacen = Zoo\Servicio::almacen(['db_dsn' => getenv('ZOO_TEST_MYSQL_DSN'), 'db_usuario' => getenv('ZOO_TEST_MYSQL_USER') ?: 'root', 'db_clave' => getenv('ZOO_TEST_MYSQL_PASS') ?: '']);
while (microtime(true) < (float) $salida) {
    usleep(100);
}
try {
    for ($i = 0; $i < 15; $i++) {
        match ($modo) {
            'primeros' => $almacen->votar('v', 'o' . $i),
            'cruces' => ((int) $indice % 2 === 0) ? $almacen->votar('v', 'b', 'a') : $almacen->votar('v', 'a', 'b'),
            'tope' => $almacen->votarConTope('v', '2026-11-03 10', 50, 'a'),
            'ideas' => $almacen->sumarIdea(),
        };
    }
} catch (Throwable $error) {
    fwrite(STDERR, $error->getMessage());
    exit(1);
}
