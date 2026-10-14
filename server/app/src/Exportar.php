<?php
declare(strict_types=1);

namespace Zoo;

/**
 * Envíos desde un día, para `tools/comunidad/envios.mjs`. Llevan nombres de menores, así que no hay
 * dirección web que los dé: solo se piden por SSH con `app/exportar.php`, fuera de la carpeta pública.
 */
final class Exportar
{
    /** @return array{0: int, 1: array} */
    public static function procesar(mixed $desde, Almacen $almacen): array
    {
        if (!is_string($desde) || preg_match('/^\d{4}-\d{2}-\d{2}$/', $desde) !== 1) {
            return [400, ['error' => 'peticion']];
        }
        return [200, ['envios' => $almacen->envios($desde . ' 00:00:00')]];
    }
}
