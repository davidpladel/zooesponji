<?php
declare(strict_types=1);

namespace Zoo;

/** Entrada y salida HTTP. Sin lógica: por eso no tiene pruebas propias y se comprueba a mano (tarea 9). */
final class Http
{
    public const MAX_BYTES = 8192;

    /** Responde `OPTIONS` y los métodos no admitidos. `true`: hay que seguir. */
    public static function metodo(string ...$admitidos): bool
    {
        $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        if ($metodo === 'OPTIONS') {
            self::cabeceras(0);
            header('Access-Control-Allow-Methods: ' . implode(', ', $admitidos));
            header('Access-Control-Allow-Headers: Content-Type');
            http_response_code(204);
            return false;
        }
        if (!in_array($metodo, $admitidos, true)) {
            self::responder(405, ['error' => 'metodo']);
            return false;
        }
        return true;
    }

    /** El cuerpo como JSON, venga con el tipo que venga (el juego lo manda como texto para evitar la consulta previa). */
    public static function cuerpoJson(): mixed
    {
        if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > self::MAX_BYTES) {
            return null;
        }
        $cuerpo = (string) file_get_contents('php://input', false, null, 0, self::MAX_BYTES + 1);
        if ($cuerpo === '' || strlen($cuerpo) > self::MAX_BYTES) {
            return null;
        }
        try {
            return json_decode($cuerpo, true, 8, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }
    }

    public static function responder(int $estado, array $cuerpo, int $cacheSegundos = 0): void
    {
        self::cabeceras($cacheSegundos);
        http_response_code($estado);
        echo json_encode($cuerpo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /** Cabeceras de las páginas HTML: no se pueden meter en otra web ni cargar nada de fuera. */
    public static function cabecerasPagina(): array
    {
        return [
            'Content-Type: text/html; charset=utf-8',
            "Content-Security-Policy: default-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
            'X-Frame-Options: DENY',
            'X-Content-Type-Options: nosniff',
            'Referrer-Policy: no-referrer',
        ];
    }

    /** Sirve una página de `app/paginas/` con sus cabeceras (nginx no lee `.htaccess`). */
    public static function pagina(string $archivo): void
    {
        header_remove('X-Powered-By');
        foreach (self::cabecerasPagina() as $cabecera) {
            header($cabecera);
        }
        readfile($archivo);
    }

    private static function cabeceras(int $cacheSegundos): void
    {
        header_remove('X-Powered-By');
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: ' . ($cacheSegundos > 0 ? "public, max-age=$cacheSegundos" : 'no-store'));
    }
}
