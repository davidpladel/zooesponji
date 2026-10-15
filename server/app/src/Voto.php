<?php
declare(strict_types=1);

namespace Zoo;

/**
 * Un voto, o un cambio de voto. El servidor no sabe quién vota ni frena repetidos: que cada aparato
 * vote una vez lo lleva el juego. La ganadora la confirma David al cerrar.
 */
final class Voto
{
    /** @return array{0: int, 1: array} */
    public static function procesar(mixed $entrada, array $contenido, Almacen $almacen, string $hoy): array
    {
        $idVotacion = is_array($entrada) ? ($entrada['votacion'] ?? null) : null;
        $opcion = is_array($entrada) ? ($entrada['opcion'] ?? null) : null;
        $anterior = is_array($entrada) ? ($entrada['anterior'] ?? null) : null;
        if (!self::esId($idVotacion) || !self::esId($opcion) || ($anterior !== null && !self::esId($anterior))) {
            return [400, ['error' => 'peticion']];
        }
        $votacion = $contenido['votacion'];
        if ($votacion === null || $votacion['id'] !== $idVotacion || !Contenido::abierta($votacion, $hoy)) {
            return [409, ['error' => 'cerrada']];
        }
        $ids = array_column($votacion['opciones'], 'id');
        if (!in_array($opcion, $ids, true) || ($anterior !== null && !in_array($anterior, $ids, true))) {
            return [400, ['error' => 'peticion']];
        }
        if ($anterior !== $opcion) {
            $almacen->votar($idVotacion, $opcion, $anterior);
        }
        return [200, ['ok' => true, 'reparto' => Estado::porcentajes($almacen->totales($idVotacion), $ids)]];
    }

    private static function esId(mixed $valor): bool
    {
        return is_string($valor) && preg_match(Contenido::ID, $valor) === 1;
    }
}
