<?php
declare(strict_types=1);

namespace Zoo;

/** Nombres de los dibujos del tablón que se pueden servir: solo letras minúsculas, cifras y guiones, y `.png`. */
final class Dibujo
{
    public static function nombre(mixed $valor): ?string
    {
        if (!is_string($valor) || strlen($valor) > 100) {
            return null;
        }
        return preg_match('/\A[a-z0-9-]+\.png\z/', $valor) === 1 ? $valor : null;
    }
}
