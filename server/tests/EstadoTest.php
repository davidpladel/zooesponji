<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use Zoo\Contenido;
use Zoo\Estado;

final class EstadoTest extends TestCase
{
    public function testPorcentajesRedondeadosACinco(): void
    {
        self::assertSame(['a' => 65, 'b' => 35], Estado::porcentajes(['a' => 2, 'b' => 1], ['a', 'b']));
        self::assertSame(['a' => 100, 'b' => 0], Estado::porcentajes(['a' => 7], ['a', 'b']));
    }

    public function testSinVotosTodoACero(): void
    {
        self::assertSame(['a' => 0, 'b' => 0], Estado::porcentajes([], ['a', 'b']));
    }

    public function testIgnoraOpcionesQueYaNoExistenYTotalesNegativos(): void
    {
        self::assertSame(['a' => 100, 'b' => 0], Estado::porcentajes(['a' => 4, 'b' => -3, 'vieja' => 50], ['a', 'b']));
    }

    public function testConstruirConVotacionAbierta(): void
    {
        $almacen = AlmacenTest::nuevo();
        $almacen->votar('2026-11-a', 'delfines');
        $almacen->votar('2026-11-a', 'delfines');
        $almacen->votar('2026-11-a', 'koalas');
        $almacen->sumarIdea();
        $estado = Estado::construir(Contenido::validar(ContenidoTest::ejemplo()), $almacen, '2026-11-03');
        self::assertSame('2026-11-03', $estado['hoy']);
        self::assertSame(1, $estado['ideas']);
        self::assertTrue($estado['votacion']['abierta']);
        self::assertSame(['delfines' => 65, 'koalas' => 35], $estado['votacion']['reparto']);
        self::assertCount(1, $estado['muro']);
    }

    public function testNoEnsenaTotales(): void
    {
        $almacen = AlmacenTest::nuevo();
        $almacen->votar('2026-11-a', 'delfines');
        $json = json_encode(Estado::construir(Contenido::validar(ContenidoTest::ejemplo()), $almacen, '2026-11-03'));
        self::assertStringNotContainsString('total', (string) $json);
    }

    public function testConstruirCerradaYSinVotacion(): void
    {
        $almacen = AlmacenTest::nuevo();
        $cerrada = Estado::construir(Contenido::validar(ContenidoTest::ejemplo()), $almacen, '2026-11-16');
        self::assertFalse($cerrada['votacion']['abierta']);
        $vacio = Estado::construir(Contenido::VACIO, $almacen, '2026-11-16');
        self::assertNull($vacio['votacion']);
        self::assertSame([], $vacio['muro']);
        self::assertSame(0, $vacio['ideas']);
    }
}
