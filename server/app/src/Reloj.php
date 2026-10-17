<?php
declare(strict_types=1);

namespace Zoo;

use DateTimeImmutable;
use DateTimeZone;

final class Reloj
{
    /** El día en España: las votaciones abren y cierran con el calendario de aquí. */
    public static function hoy(DateTimeImmutable $ahora): string
    {
        return $ahora->setTimezone(new DateTimeZone('Europe/Madrid'))->format('Y-m-d');
    }

    /** La hora en España, «AAAA-MM-DD HH»: el tope de votos va por horas de aquí. */
    public static function hora(DateTimeImmutable $ahora): string
    {
        return $ahora->setTimezone(new DateTimeZone('Europe/Madrid'))->format('Y-m-d H');
    }

    public static function utc(DateTimeImmutable $ahora): string
    {
        return $ahora->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    }
}
