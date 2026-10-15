<?php
declare(strict_types=1);

namespace Zoo;

use InvalidArgumentException;

/** `comunidad.json`: lo edita David a mano, así que se valida como cualquier otro dato de fuera. */
final class Contenido
{
    public const ID = '/^[a-z0-9-]{1,40}$/';
    public const DIBUJO = '/^[a-z0-9-]{1,40}\.png$/';
    public const VACIO = ['votacion' => null, 'muro' => []];

    private const MAX_BYTES = 65536;
    private const MAX_MURO = 30;
    private const MAX_TITULO = 30;
    private const MAX_NOMBRE = 20;

    /** Devuelve solo las claves conocidas, ya limpias. */
    public static function validar(mixed $datos): array
    {
        if (!is_array($datos)) {
            throw new InvalidArgumentException('raiz');
        }
        $votacion = ($datos['votacion'] ?? null) === null ? null : self::votacion($datos['votacion']);
        $entradas = $datos['muro'] ?? [];
        if (!is_array($entradas) || !array_is_list($entradas) || count($entradas) > self::MAX_MURO) {
            throw new InvalidArgumentException('muro');
        }
        return ['votacion' => $votacion, 'muro' => array_map(self::entrada(...), $entradas)];
    }

    /** Abierta entre `abre` y `cierra`, los dos días incluidos. */
    public static function abierta(?array $votacion, string $hoy): bool
    {
        return $votacion !== null && $votacion['abre'] <= $hoy && $hoy <= $votacion['cierra'];
    }

    /**
     * Lee el archivo sin lanzar nunca. Si está roto, no hay votación y se conserva el muro de la última
     * lectura buena (guardada al lado como `.ok`).
     */
    public static function leer(string $ruta): array
    {
        $copia = $ruta . '.ok';
        $bueno = self::intentar($ruta);
        if ($bueno !== null) {
            if (!is_file($copia) || filemtime($copia) < filemtime($ruta)) {
                @file_put_contents($copia, json_encode($bueno, JSON_UNESCAPED_UNICODE), LOCK_EX);
            }
            return $bueno;
        }
        $anterior = self::intentar($copia);
        return $anterior === null ? self::VACIO : ['votacion' => null, 'muro' => $anterior['muro']];
    }

    private static function intentar(string $archivo): ?array
    {
        if (!is_file($archivo) || filesize($archivo) > self::MAX_BYTES) {
            return null;
        }
        $texto = (string) file_get_contents($archivo);
        if (str_starts_with($texto, "\xEF\xBB\xBF")) {
            $texto = substr($texto, 3);
        }
        try {
            return self::validar(json_decode($texto, true, 16, JSON_THROW_ON_ERROR));
        } catch (\Throwable) {
            return null;
        }
    }

    private static function votacion(mixed $v): array
    {
        if (!is_array($v)) {
            throw new InvalidArgumentException('votacion');
        }
        $abre = self::dia($v['abre'] ?? null);
        $cierra = self::dia($v['cierra'] ?? null);
        $crudas = $v['opciones'] ?? null;
        if ($abre > $cierra || !is_array($crudas) || !array_is_list($crudas) || count($crudas) < 2 || count($crudas) > 4) {
            throw new InvalidArgumentException('votacion');
        }
        $opciones = [];
        $ids = [];
        foreach ($crudas as $cruda) {
            if (!is_array($cruda)) {
                throw new InvalidArgumentException('opcion');
            }
            $id = self::id($cruda['id'] ?? null);
            if (in_array($id, $ids, true)) {
                throw new InvalidArgumentException('opcion repetida');
            }
            $ids[] = $id;
            $opciones[] = ['id' => $id] + self::ficha($cruda);
        }
        $ganadora = $v['ganadora'] ?? null;
        if ($ganadora !== null && !in_array($ganadora, $ids, true)) {
            throw new InvalidArgumentException('ganadora');
        }
        return ['id' => self::id($v['id'] ?? null), 'abre' => $abre, 'cierra' => $cierra, 'opciones' => $opciones, 'ganadora' => $ganadora];
    }

    private static function entrada(mixed $e): array
    {
        if (!is_array($e) || !in_array($e['estado'] ?? null, ['elegida', 'hecha'], true)) {
            throw new InvalidArgumentException('muro');
        }
        $entrada = self::ficha($e) + ['estado' => $e['estado']];
        if (isset($e['recinto'])) {
            $entrada['recinto'] = self::id($e['recinto']);
        }
        return $entrada;
    }

    /** Lo común a una opción y a una entrada del muro: título en los dos idiomas, dibujo y crédito. */
    private static function ficha(array $f): array
    {
        $titulo = $f['titulo'] ?? null;
        $es = is_array($titulo) ? Texto::limpio($titulo['es'] ?? null, self::MAX_TITULO) : null;
        $en = is_array($titulo) ? Texto::limpio($titulo['en'] ?? null, self::MAX_TITULO) : null;
        $dibujo = $f['dibujo'] ?? null;
        if ($es === null || $es === '' || $en === null || $en === '' || !is_string($dibujo) || preg_match(self::DIBUJO, $dibujo) !== 1) {
            throw new InvalidArgumentException('ficha');
        }
        $ficha = ['titulo' => ['es' => $es, 'en' => $en], 'dibujo' => $dibujo];
        if (isset($f['ideaDe'])) {
            $nombre = Texto::limpio($f['ideaDe'], 40);
            if ($nombre === null) {
                throw new InvalidArgumentException('ideaDe');
            }
            if ($nombre !== '') {
                $ficha['ideaDe'] = mb_substr($nombre, 0, self::MAX_NOMBRE, 'UTF-8');
            }
        }
        return $ficha;
    }

    private static function id(mixed $v): string
    {
        if (!is_string($v) || preg_match(self::ID, $v) !== 1) {
            throw new InvalidArgumentException('id');
        }
        return $v;
    }

    private static function dia(mixed $v): string
    {
        if (!is_string($v) || preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $v, $m) !== 1 || !checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
            throw new InvalidArgumentException('dia');
        }
        return $v;
    }
}
