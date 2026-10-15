<?php
declare(strict_types=1);

namespace Zoo;

use DateTimeImmutable;

/** El formulario de ideas y fallos. Todo se comprueba aquí, aunque la página ya lo compruebe. */
final class Envio
{
    public const TOPE_DIARIO = 300;
    public const DIAS = 90;

    /** @return array{0: int, 1: array} */
    public static function procesar(mixed $entrada, Almacen $almacen, Avisador $avisador, DateTimeImmutable $ahora, string $condiciones): array
    {
        if (!is_array($entrada)) {
            return [400, ['error' => 'peticion']];
        }
        $idea = Texto::limpio($entrada['idea'] ?? '', 300, true);
        $fallo = Texto::limpio($entrada['fallo'] ?? '', 500, true);
        $nombre = Texto::limpio($entrada['nombre'] ?? '', 15);
        $version = Texto::limpio($entrada['version'] ?? '', 20);
        $modelo = Texto::limpio($entrada['modelo'] ?? '', 60);
        $trampa = Texto::limpio($entrada['web'] ?? '', 200);
        $idioma = $entrada['idioma'] ?? null;
        if ($idea === null || $fallo === null || $nombre === null || $version === null || $modelo === null || $trampa === null
            || !in_array($idioma, ['es', 'en'], true) || preg_match('/^[0-9A-Za-z. -]*$/', $version) !== 1) {
            return [400, ['error' => 'peticion']];
        }
        // Un robot rellena todos los campos: se le dice que sí y no se guarda nada.
        if ($trampa !== '') {
            return [200, ['ok' => true]];
        }
        if ($idea === '' && $fallo === '') {
            return [400, ['error' => 'vacio']];
        }
        $mayor = ($entrada['mayor'] ?? null) === true;
        $tutor = ($entrada['tutor'] ?? null) === true;
        if (!$mayor || ($entrada['condiciones'] ?? null) !== $condiciones || ($nombre !== '' && !$tutor)) {
            return [400, ['error' => 'aceptacion']];
        }

        $fecha = Reloj::utc($ahora);
        $almacen->purgar(Reloj::utc($ahora->modify('-' . self::DIAS . ' days')));
        $dentroDelTope = $almacen->enviosDelDia(substr($fecha, 0, 10)) < self::TOPE_DIARIO;
        $envio = compact('fecha', 'idea', 'fallo', 'nombre', 'version', 'modelo', 'idioma');
        $id = $almacen->guardarEnvio($envio + ['condiciones' => $condiciones]);
        if ($dentroDelTope) {
            if ($idea !== '') {
                $almacen->sumarIdea();
            }
            try {
                $avisador->avisar(['id' => $id] + $envio);
            } catch (\Throwable) {
                // El aviso es un extra: el envío ya está guardado.
            }
        }
        return [200, ['ok' => true]];
    }
}
