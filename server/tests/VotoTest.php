<?php
declare(strict_types=1);

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Zoo\Almacen;
use Zoo\Contenido;
use Zoo\Voto;

final class VotoTest extends TestCase
{
    private Almacen $almacen;
    private array $contenido;

    protected function setUp(): void
    {
        $this->almacen = AlmacenTest::nuevo();
        $this->contenido = Contenido::validar(ContenidoTest::ejemplo());
    }

    private function votar(mixed $entrada, string $hoy = '2026-11-03'): array
    {
        return Voto::procesar($entrada, $this->contenido, $this->almacen, $hoy);
    }

    public function testVotoCorrecto(): void
    {
        [$estado, $cuerpo] = $this->votar(['votacion' => '2026-11-a', 'opcion' => 'koalas']);
        self::assertSame(200, $estado);
        self::assertSame(['ok' => true, 'reparto' => ['delfines' => 0, 'koalas' => 100]], $cuerpo);
        self::assertSame(['koalas' => 1], $this->almacen->totales('2026-11-a'));
    }

    public function testCambioDeVoto(): void
    {
        $this->votar(['votacion' => '2026-11-a', 'opcion' => 'koalas']);
        [$estado] = $this->votar(['votacion' => '2026-11-a', 'opcion' => 'delfines', 'anterior' => 'koalas']);
        self::assertSame(200, $estado);
        self::assertSame(['delfines' => 1, 'koalas' => 0], $this->almacen->totales('2026-11-a'));
    }

    public function testCambiarALaMismaOpcionNoSuma(): void
    {
        $this->votar(['votacion' => '2026-11-a', 'opcion' => 'koalas']);
        [$estado] = $this->votar(['votacion' => '2026-11-a', 'opcion' => 'koalas', 'anterior' => 'koalas']);
        self::assertSame(200, $estado);
        self::assertSame(['koalas' => 1], $this->almacen->totales('2026-11-a'));
    }

    /** @return iterable<string, array{mixed}> */
    public static function malas(): iterable
    {
        yield 'nada' => [null];
        yield 'texto' => ['koalas'];
        yield 'sin opcion' => [['votacion' => '2026-11-a']];
        yield 'opcion lista' => [['votacion' => '2026-11-a', 'opcion' => ['koalas']]];
        yield 'opcion inexistente' => [['votacion' => '2026-11-a', 'opcion' => 'leones']];
        yield 'opcion con sql' => [['votacion' => '2026-11-a', 'opcion' => "koalas'; DROP TABLE votos; --"]];
        yield 'anterior inexistente' => [['votacion' => '2026-11-a', 'opcion' => 'koalas', 'anterior' => 'leones']];
        yield 'anterior numero' => [['votacion' => '2026-11-a', 'opcion' => 'koalas', 'anterior' => 3]];
    }

    #[DataProvider('malas')]
    public function testPeticionMala(mixed $entrada): void
    {
        self::assertSame([400, ['error' => 'peticion']], $this->votar($entrada));
        self::assertSame([], $this->almacen->totales('2026-11-a'));
    }

    public function testVotacionCerradaODistinta(): void
    {
        $voto = ['votacion' => '2026-11-a', 'opcion' => 'koalas'];
        self::assertSame([409, ['error' => 'cerrada']], $this->votar($voto, '2026-11-16'));
        self::assertSame([409, ['error' => 'cerrada']], $this->votar($voto, '2026-10-31'));
        self::assertSame([409, ['error' => 'cerrada']], $this->votar(['votacion' => '2026-10-z', 'opcion' => 'koalas']));
        $this->contenido = Contenido::VACIO;
        self::assertSame([409, ['error' => 'cerrada']], $this->votar($voto));
        self::assertSame([], $this->almacen->totales('2026-11-a'));
    }
}
