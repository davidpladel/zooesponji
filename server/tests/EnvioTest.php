<?php
declare(strict_types=1);

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Zoo\Almacen;
use Zoo\Avisador;
use Zoo\Envio;

final class AvisadorFalso implements Avisador
{
    /** @var list<array> */
    public array $avisos = [];

    public function avisar(array $envio): void
    {
        $this->avisos[] = $envio;
    }
}

final class EnvioTest extends TestCase
{
    private Almacen $almacen;
    private AvisadorFalso $avisador;

    protected function setUp(): void
    {
        $this->almacen = AlmacenTest::nuevo();
        $this->avisador = new AvisadorFalso();
    }

    private static function formulario(array $cambios = []): array
    {
        return $cambios + [
            'idea' => 'Que haya delfines', 'fallo' => '', 'nombre' => '', 'version' => '2.7.0', 'modelo' => '',
            'idioma' => 'es', 'mayor' => true, 'tutor' => false, 'condiciones' => '2026-10', 'web' => '',
        ];
    }

    private function enviar(mixed $entrada, string $cuando = '2026-11-03 10:00:00'): array
    {
        $ahora = new DateTimeImmutable($cuando, new DateTimeZone('UTC'));
        return Envio::procesar($entrada, $this->almacen, $this->avisador, $ahora, '2026-10');
    }

    private function guardados(): array
    {
        return $this->almacen->envios('2000-01-01 00:00:00');
    }

    public function testIdeaSola(): void
    {
        self::assertSame([200, ['ok' => true]], $this->enviar(self::formulario()));
        $fila = $this->guardados()[0];
        self::assertSame('Que haya delfines', $fila['idea']);
        self::assertSame('2026-11-03 10:00:00', $fila['fecha']);
        self::assertSame('2026-10', $fila['condiciones']);
        self::assertSame(1, $this->almacen->contarIdeas());
        self::assertCount(1, $this->avisador->avisos);
    }

    public function testFalloSoloNoSumaIdeas(): void
    {
        self::assertSame(200, $this->enviar(self::formulario(['idea' => '', 'fallo' => "Se queda en negro\nal abrir la tienda", 'modelo' => 'Pixel 7']))[0]);
        self::assertSame("Se queda en negro\nal abrir la tienda", $this->guardados()[0]['fallo']);
        self::assertSame(0, $this->almacen->contarIdeas());
    }

    public function testIdeaYFalloALaVez(): void
    {
        self::assertSame(200, $this->enviar(self::formulario(['fallo' => 'El panda no come']))[0]);
        self::assertSame(1, $this->almacen->contarIdeas());
        self::assertCount(1, $this->guardados());
    }

    public function testVacio(): void
    {
        self::assertSame([400, ['error' => 'vacio']], $this->enviar(self::formulario(['idea' => '  ', 'fallo' => ''])));
        self::assertSame([], $this->guardados());
    }

    public function testNombreConTutor(): void
    {
        self::assertSame(200, $this->enviar(self::formulario(['nombre' => 'Lucía', 'tutor' => true]))[0]);
        self::assertSame('Lucía', $this->guardados()[0]['nombre']);
    }

    /** @return iterable<string, array{array}> */
    public static function sinAceptacion(): iterable
    {
        yield 'sin casilla de mayor' => [['mayor' => false]];
        yield 'mayor como texto' => [['mayor' => 'true']];
        yield 'mayor ausente' => [['mayor' => null]];
        yield 'condiciones viejas' => [['condiciones' => '2025-01']];
        yield 'condiciones ausentes' => [['condiciones' => null]];
        yield 'nombre sin tutor' => [['nombre' => 'Lucía', 'tutor' => false]];
        yield 'nombre con tutor como texto' => [['nombre' => 'Lucía', 'tutor' => 'si']];
    }

    #[DataProvider('sinAceptacion')]
    public function testSinAceptacionSeRechazaAunqueSeSaltenLaPagina(array $cambios): void
    {
        self::assertSame([400, ['error' => 'aceptacion']], $this->enviar(self::formulario($cambios)));
        self::assertSame([], $this->guardados());
        self::assertSame(0, $this->almacen->contarIdeas());
        self::assertSame([], $this->avisador->avisos);
    }

    /** @return iterable<string, array{mixed}> */
    public static function malas(): iterable
    {
        yield 'nada' => [null];
        yield 'texto' => ['hola'];
        yield 'idea larga' => [self::formulario(['idea' => str_repeat('a', 301)])];
        yield 'fallo largo' => [self::formulario(['fallo' => str_repeat('a', 501)])];
        yield 'nombre largo' => [self::formulario(['nombre' => str_repeat('a', 16), 'tutor' => true])];
        yield 'idea lista' => [self::formulario(['idea' => ['a']])];
        yield 'idea con nulo' => [self::formulario(['idea' => "a\x00b"])];
        yield 'idea utf8 roto' => [self::formulario(['idea' => "\xC3\x28"])];
        yield 'nombre con salto' => [self::formulario(['nombre' => "Lu\ncía", 'tutor' => true])];
        yield 'version rara' => [self::formulario(['version' => '<b>2</b>'])];
        yield 'idioma inventado' => [self::formulario(['idioma' => 'fr'])];
        yield 'trampa lista' => [self::formulario(['web' => ['x']])];
    }

    #[DataProvider('malas')]
    public function testPeticionMala(mixed $entrada): void
    {
        self::assertSame([400, ['error' => 'peticion']], $this->enviar($entrada));
        self::assertSame([], $this->guardados());
    }

    public function testTextosRarosSeGuardanTalCual(): void
    {
        $idea = "🦒 <script>alert('x')</script> \"; DROP TABLE envios; --";
        self::assertSame(200, $this->enviar(self::formulario(['idea' => $idea]))[0]);
        self::assertSame($idea, $this->guardados()[0]['idea']);
    }

    public function testLaRespuestaNuncaRepiteLoRecibido(): void
    {
        $respuesta = json_encode($this->enviar(self::formulario(['idea' => 'TEXTO-UNICO-123'])));
        self::assertStringNotContainsString('TEXTO-UNICO-123', (string) $respuesta);
    }

    public function testCampoTrampaRellenoNoGuardaNada(): void
    {
        self::assertSame([200, ['ok' => true]], $this->enviar(self::formulario(['web' => 'http://spam.example'])));
        self::assertSame([], $this->guardados());
        self::assertSame(0, $this->almacen->contarIdeas());
        self::assertSame([], $this->avisador->avisos);
    }

    public function testPasadoElTopeSeGuardaPeroNoSeCuentaNiSeAvisa(): void
    {
        for ($i = 0; $i < Envio::TOPE_DIARIO; $i++) {
            $this->almacen->guardarEnvio(AlmacenTest::envio(['fecha' => '2026-11-03 08:00:00']));
        }
        self::assertSame([200, ['ok' => true]], $this->enviar(self::formulario()));
        self::assertCount(Envio::TOPE_DIARIO + 1, $this->guardados());
        self::assertSame(0, $this->almacen->contarIdeas());
        self::assertSame([], $this->avisador->avisos);
    }

    public function testAlDiaSiguienteVuelveAContar(): void
    {
        for ($i = 0; $i < Envio::TOPE_DIARIO; $i++) {
            $this->almacen->guardarEnvio(AlmacenTest::envio(['fecha' => '2026-11-03 08:00:00']));
        }
        $this->enviar(self::formulario(), '2026-11-04 00:00:05');
        self::assertSame(1, $this->almacen->contarIdeas());
        self::assertCount(1, $this->avisador->avisos);
    }

    public function testBorraLoQueTieneMasDeNoventaDias(): void
    {
        $this->almacen->guardarEnvio(AlmacenTest::envio(['fecha' => '2026-08-04 09:59:59', 'idea' => 'vieja']));
        $this->almacen->guardarEnvio(AlmacenTest::envio(['fecha' => '2026-08-05 10:00:00', 'idea' => 'justa']));
        $this->enviar(self::formulario());
        self::assertSame(['Que haya delfines', 'justa'], array_column($this->guardados(), 'idea'));
    }

    public function testElAvisoLlevaLosDatosComoCamposSeparados(): void
    {
        $this->enviar(self::formulario(['nombre' => 'Lucía', 'tutor' => true]));
        self::assertSame(
            ['id' => 1, 'fecha' => '2026-11-03 10:00:00', 'idea' => 'Que haya delfines', 'fallo' => '', 'nombre' => 'Lucía', 'version' => '2.7.0', 'modelo' => '', 'idioma' => 'es'],
            $this->avisador->avisos[0],
        );
    }

    public function testSiElAvisadorLanzaElEnvioSeGuardaIgual(): void
    {
        $roto = new class implements Avisador {
            public function avisar(array $envio): void
            {
                throw new RuntimeException('n8n caído');
            }
        };
        $ahora = new DateTimeImmutable('2026-11-03 10:00:00', new DateTimeZone('UTC'));
        self::assertSame([200, ['ok' => true]], Envio::procesar(self::formulario(), $this->almacen, $roto, $ahora, '2026-10'));
        self::assertCount(1, $this->guardados());
    }
}
