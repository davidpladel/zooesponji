<?php
declare(strict_types=1);

// Prepara el servidor de la comunidad para probar en casa (nunca en el VPS): config.php con una base de datos
// SQLite de archivo (sin MySQL) y un comunidad.json sin votación y con la clave `actualizacion` del tipo pedido.
// Uso: php local/preparar.php pequena|grande|rota|ninguno

$tipo = $argv[1] ?? 'pequena';
$claves = [
    'pequena' => ['minima' => 10, 'ultima' => 14, 'grande' => false],
    'grande' => ['minima' => 10, 'ultima' => 14, 'grande' => true],
    // El juego de prueba dice que tiene la 13: por debajo de la mínima, está «rota».
    'rota' => ['minima' => 14, 'ultima' => 14, 'grande' => false],
    'ninguno' => null,
];
if (!array_key_exists($tipo, $claves)) {
    fwrite(STDERR, "Tipo desconocido: $tipo (pequena, grande, rota o ninguno)\n");
    exit(1);
}

$app = dirname(__DIR__) . '/app';
require $app . '/autoload.php';

$config = $app . '/config.php';
$base = $app . '/datos/local.sqlite';
if (!is_file($config)) {
    $texto = "<?php\n// Solo para probar en casa (server/local/preparar.php). Ignorado por git. Nunca se sube al VPS.\nreturn [\n"
        . "    'db_dsn' => " . var_export('sqlite:' . $base, true) . ",\n"
        . "    'db_usuario' => '',\n    'db_clave' => '',\n    'n8n_url' => '',\n    'n8n_clave' => '',\n"
        . "    'condiciones' => '2026-10',\n    'contenido' => '',\n    'votos_hora' => 300,\n];\n";
    file_put_contents($config, $texto);
    echo "Creado app/config.php (SQLite de prueba)\n";
} elseif (!str_contains((string) file_get_contents($config), 'sqlite:')) {
    fwrite(STDERR, "app/config.php ya existe y no es el de prueba: no lo toco. Muévelo antes de probar en casa.\n");
    exit(1);
}

$pdo = new PDO('sqlite:' . $base, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
(new Zoo\Almacen($pdo))->crearTablas();

$contenido = ['votacion' => null, 'muro' => []];
if ($claves[$tipo] !== null) {
    $contenido['actualizacion'] = $claves[$tipo];
}
Zoo\Contenido::validar($contenido);
file_put_contents($app . '/datos/comunidad.json', json_encode($contenido, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
@unlink($app . '/datos/comunidad.json.ok');
echo "comunidad.json listo: actualizacion = " . json_encode($claves[$tipo]) . "\n";
