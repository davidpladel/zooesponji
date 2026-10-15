<?php
declare(strict_types=1);

namespace Zoo;

use PDO;
use RuntimeException;

/** Arranque común de los puntos de entrada. Si algo falla, fuera solo se ve «no disponible». */
final class Servicio
{
    private const CLAVES = ['db_dsn', 'db_usuario', 'db_clave', 'n8n_url', 'n8n_clave', 'condiciones', 'contenido'];

    public static function config(string $dirApp): array
    {
        $archivo = $dirApp . '/config.php';
        if (!is_file($archivo)) {
            throw new RuntimeException('Falta config.php');
        }
        $config = require $archivo;
        if (!is_array($config)) {
            throw new RuntimeException('config.php no devuelve una lista');
        }
        foreach (self::CLAVES as $clave) {
            if (!is_string($config[$clave] ?? null)) {
                throw new RuntimeException("config.php: falta $clave");
            }
        }
        if ($config['contenido'] === '') {
            $config['contenido'] = $dirApp . '/datos/comunidad.json';
        }
        return $config;
    }

    public static function almacen(array $config): Almacen
    {
        $pdo = new PDO($config['db_dsn'], $config['db_usuario'], $config['db_clave'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        // Emojis y tildes intactos aunque el DSN no pida utf8mb4 o el servidor tenga otro juego por defecto.
        if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql') {
            $pdo->exec('SET NAMES utf8mb4');
        }
        return new Almacen($pdo);
    }

    /**
     * @param callable(): array{0: int, 1: array} $accion
     * @return array{0: int, 1: array}
     */
    public static function atender(callable $accion): array
    {
        try {
            return $accion();
        } catch (\Throwable $error) {
            // El detalle va al registro del servidor, que no es público. Fuera, un mensaje fijo.
            error_log('zoo-comunidad: ' . $error::class . ': ' . $error->getMessage());
            return [503, ['error' => 'no-disponible']];
        }
    }
}
