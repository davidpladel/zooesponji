<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use Zoo\Reloj;

final class RelojTest extends TestCase
{
    public function testALas2330UtcYaEsElDiaSiguienteEnEspana(): void
    {
        $ahora = new DateTimeImmutable('2026-10-31 23:30:00', new DateTimeZone('UTC'));
        self::assertSame('2026-11-01', Reloj::hoy($ahora));
        self::assertSame('2026-10-31 23:30:00', Reloj::utc($ahora));
    }

    public function testEnVeranoEspanaVaDosHorasPorDelante(): void
    {
        $ahora = new DateTimeImmutable('2026-07-10 22:30:00', new DateTimeZone('UTC'));
        self::assertSame('2026-07-11', Reloj::hoy($ahora));
    }

    public function testNoDependeDeLaZonaDelServidor(): void
    {
        $ahora = new DateTimeImmutable('2026-11-01 08:00:00', new DateTimeZone('America/New_York'));
        self::assertSame('2026-11-01', Reloj::hoy($ahora));
        self::assertSame('2026-11-01 13:00:00', Reloj::utc($ahora));
    }
}
