<?php
declare(strict_types=1);

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Zoo\Contenido;

final class ContenidoTest extends TestCase
{
    private string $dir;

    protected function setUp(): void
    {
        $this->dir = sys_get_temp_dir() . '/zoo-' . bin2hex(random_bytes(4));
        mkdir($this->dir);
    }

    protected function tearDown(): void
    {
        array_map('unlink', glob($this->dir . '/*') ?: []);
        rmdir($this->dir);
    }

    public static function ejemplo(): array
    {
        return json_decode((string) file_get_contents(__DIR__ . '/../app/datos/comunidad.example.json'), true);
    }

    public function testElEjemploEsValido(): void
    {
        $c = Contenido::validar(self::ejemplo());
        self::assertSame('2026-11-a', $c['votacion']['id']);
        self::assertSame('Lucía', $c['votacion']['opciones'][0]['ideaDe']);
        self::assertArrayNotHasKey('ideaDe', $c['votacion']['opciones'][1]);
        self::assertSame('pinguino', $c['muro'][0]['recinto']);
    }

    public function testSinVotacion(): void
    {
        self::assertSame(Contenido::VACIO, Contenido::validar(['votacion' => null, 'muro' => []]));
        self::assertSame(Contenido::VACIO, Contenido::validar([]));
    }

    public function testRecortaElNombreAVeinte(): void
    {
        $d = self::ejemplo();
        $d['votacion']['opciones'][0]['ideaDe'] = 'Maximiliano Alejandro';
        self::assertSame('Maximiliano Alejandr', Contenido::validar($d)['votacion']['opciones'][0]['ideaDe']);
    }

    public function testDescartaLasClavesDesconocidas(): void
    {
        $d = self::ejemplo();
        $d['votacion']['opciones'][0]['html'] = '<b>x</b>';
        self::assertArrayNotHasKey('html', Contenido::validar($d)['votacion']['opciones'][0]);
    }

    /** @return iterable<string, array{callable}> */
    public static function rotos(): iterable
    {
        yield 'raiz no es objeto' => [static fn (array $d) => 'hola'];
        yield 'id con barra' => [static function (array $d) { $d['votacion']['id'] = '../x'; return $d; }];
        yield 'id con mayusculas' => [static function (array $d) { $d['votacion']['id'] = 'Nov'; return $d; }];
        yield 'fecha imposible' => [static function (array $d) { $d['votacion']['abre'] = '2026-02-31'; return $d; }];
        yield 'cierra antes de abrir' => [static function (array $d) { $d['votacion']['cierra'] = '2026-10-01'; return $d; }];
        yield 'una sola opcion' => [static function (array $d) { array_pop($d['votacion']['opciones']); return $d; }];
        yield 'cinco opciones' => [static function (array $d) {
            foreach (['a', 'b', 'c'] as $id) { $d['votacion']['opciones'][] = ['id' => $id] + $d['votacion']['opciones'][0]; }
            return $d;
        }];
        yield 'opcion repetida' => [static function (array $d) { $d['votacion']['opciones'][1]['id'] = 'delfines'; return $d; }];
        yield 'dibujo con ruta' => [static function (array $d) { $d['votacion']['opciones'][0]['dibujo'] = '../config.php'; return $d; }];
        yield 'dibujo que no es png' => [static function (array $d) { $d['votacion']['opciones'][0]['dibujo'] = 'a.svg'; return $d; }];
        yield 'titulo sin ingles' => [static function (array $d) { unset($d['votacion']['opciones'][0]['titulo']['en']); return $d; }];
        yield 'titulo vacio' => [static function (array $d) { $d['votacion']['opciones'][0]['titulo']['es'] = ' '; return $d; }];
        yield 'titulo largo' => [static function (array $d) { $d['votacion']['opciones'][0]['titulo']['es'] = str_repeat('a', 31); return $d; }];
        yield 'ganadora que no existe' => [static function (array $d) { $d['votacion']['ganadora'] = 'leones'; return $d; }];
        yield 'estado inventado' => [static function (array $d) { $d['muro'][0]['estado'] = 'pronto'; return $d; }];
        yield 'recinto con espacios' => [static function (array $d) { $d['muro'][0]['recinto'] = 'el pinguino'; return $d; }];
        yield 'muro que no es lista' => [static function (array $d) { $d['muro'] = ['a' => 1]; return $d; }];
        yield 'muro enorme' => [static function (array $d) { $d['muro'] = array_fill(0, 31, $d['muro'][0]); return $d; }];
    }

    #[DataProvider('rotos')]
    public function testRechaza(callable $romper): void
    {
        $this->expectException(InvalidArgumentException::class);
        Contenido::validar($romper(self::ejemplo()));
    }

    public function testAbiertaIncluyeLosDosDias(): void
    {
        $v = Contenido::validar(self::ejemplo())['votacion'];
        self::assertFalse(Contenido::abierta($v, '2026-10-31'));
        self::assertTrue(Contenido::abierta($v, '2026-11-01'));
        self::assertTrue(Contenido::abierta($v, '2026-11-15'));
        self::assertFalse(Contenido::abierta($v, '2026-11-16'));
        self::assertFalse(Contenido::abierta(null, '2026-11-05'));
    }

    public function testLeerArchivoBueno(): void
    {
        $ruta = $this->dir . '/comunidad.json';
        file_put_contents($ruta, json_encode(self::ejemplo()));
        self::assertSame('2026-11-a', Contenido::leer($ruta)['votacion']['id']);
        self::assertFileExists($ruta . '.ok');
    }

    public function testLeerArchivoConBom(): void
    {
        $ruta = $this->dir . '/comunidad.json';
        file_put_contents($ruta, "\xEF\xBB\xBF" . json_encode(self::ejemplo()));
        self::assertSame('2026-11-a', Contenido::leer($ruta)['votacion']['id']);
    }

    public function testArchivoRotoConservaElMuroAnteriorYQuitaLaVotacion(): void
    {
        $ruta = $this->dir . '/comunidad.json';
        file_put_contents($ruta, json_encode(self::ejemplo()));
        Contenido::leer($ruta);
        file_put_contents($ruta, '{ esto no es json');
        $c = Contenido::leer($ruta);
        self::assertNull($c['votacion']);
        self::assertCount(1, $c['muro']);
    }

    public function testSinArchivoNiCopia(): void
    {
        self::assertSame(Contenido::VACIO, Contenido::leer($this->dir . '/no-existe.json'));
    }

    public function testArchivoGiganteSeIgnora(): void
    {
        $ruta = $this->dir . '/comunidad.json';
        file_put_contents($ruta, str_repeat(' ', 70000) . '{}');
        self::assertSame(Contenido::VACIO, Contenido::leer($ruta));
    }
}
