<?php
declare(strict_types=1);

namespace Zoo;

/** Lo que lee el juego: la votación con su reparto, el muro y el número de ideas. */
final class Estado
{
    /**
     * Reparto en porcentajes redondeados a 5. No se dan totales: con pocos votos no se nota.
     *
     * @param array<string, int> $totales
     * @param list<string> $ids
     * @return array<string, int>
     */
    public static function porcentajes(array $totales, array $ids): array
    {
        $votos = [];
        foreach ($ids as $id) {
            $votos[$id] = max(0, (int) ($totales[$id] ?? 0));
        }
        $suma = array_sum($votos);
        return array_map(static fn (int $n): int => $suma === 0 ? 0 : (int) (round($n * 100 / $suma / 5) * 5), $votos);
    }

    public static function construir(array $contenido, Almacen $almacen, string $hoy): array
    {
        $votacion = $contenido['votacion'];
        if ($votacion !== null) {
            $votacion['abierta'] = Contenido::abierta($votacion, $hoy);
            $votacion['reparto'] = self::porcentajes($almacen->totales($votacion['id']), array_column($votacion['opciones'], 'id'));
        }
        return ['hoy' => $hoy, 'ideas' => $almacen->contarIdeas(), 'votacion' => $votacion, 'muro' => $contenido['muro']];
    }
}
