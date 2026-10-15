<?php
declare(strict_types=1);

namespace Zoo;

/** Textos que llegan de fuera: o están limpios o no valen. No se escapan aquí: nunca se devuelven al navegador. */
final class Texto
{
    public static function limpio(mixed $valor, int $max, bool $lineas = false): ?string
    {
        if (!is_string($valor) || !mb_check_encoding($valor, 'UTF-8')) {
            return null;
        }
        $texto = trim(str_replace(["\r\n", "\r"], "\n", $valor));
        $control = $lineas ? '/[\x00-\x09\x0B-\x1F\x7F]/u' : '/[\x00-\x1F\x7F]/u';
        if (preg_match($control, $texto) === 1) {
            return null;
        }
        return mb_strlen($texto, 'UTF-8') > $max ? null : $texto;
    }
}
