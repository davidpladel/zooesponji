<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use Zoo\Almacen;

final class AlmacenTest extends TestCase
{
    private Almacen $almacen;

    public static function nuevo(): Almacen
    {
        $pdo = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $almacen = new Almacen($pdo);
        $almacen->crearTablas();
        return $almacen;
    }

    public static function envio(array $cambios = []): array
    {
        return $cambios + [
            'fecha' => '2026-11-03 10:00:00', 'idea' => 'Delfines', 'fallo' => '', 'nombre' => 'Lucía',
            'version' => '2.7.0', 'modelo' => '', 'idioma' => 'es', 'condiciones' => '2026-10',
        ];
    }

    protected function setUp(): void
    {
        $this->almacen = self::nuevo();
    }

    public function testCrearTablasDosVecesNoFalla(): void
    {
        $this->almacen->crearTablas();
        self::assertSame([], $this->almacen->totales('v1'));
    }

    public function testVotarSuma(): void
    {
        $this->almacen->votar('v1', 'a');
        $this->almacen->votar('v1', 'a');
        $this->almacen->votar('v1', 'b');
        $this->almacen->votar('v2', 'a');
        self::assertSame(['a' => 2, 'b' => 1], $this->almacen->totales('v1'));
    }

    public function testCambiarElVotoRestaAlAnterior(): void
    {
        $this->almacen->votar('v1', 'a');
        $this->almacen->votar('v1', 'b', 'a');
        self::assertSame(['a' => 0, 'b' => 1], $this->almacen->totales('v1'));
    }

    public function testRestarNoBajaDeCero(): void
    {
        $this->almacen->votar('v1', 'b', 'a');
        $this->almacen->votar('v1', 'b', 'a');
        self::assertSame(['b' => 2], $this->almacen->totales('v1'));
    }

    public function testGuardaTextosRarosTalCual(): void
    {
        $idea = "🦒 ¡más jirafas! <script>alert('x')</script> \"; DROP TABLE envios; --";
        $id = $this->almacen->guardarEnvio(self::envio(['idea' => $idea]));
        self::assertSame(1, $id);
        $fila = $this->almacen->envios('2026-01-01 00:00:00')[0];
        self::assertSame($idea, $fila['idea']);
        self::assertSame('Lucía', $fila['nombre']);
        self::assertSame('2026-10', $fila['condiciones']);
    }

    public function testEnviosDelDia(): void
    {
        $this->almacen->guardarEnvio(self::envio(['fecha' => '2026-11-03 00:00:01']));
        $this->almacen->guardarEnvio(self::envio(['fecha' => '2026-11-03 23:59:59']));
        $this->almacen->guardarEnvio(self::envio(['fecha' => '2026-11-04 00:00:00']));
        self::assertSame(2, $this->almacen->enviosDelDia('2026-11-03'));
        self::assertSame(0, $this->almacen->enviosDelDia('2026-11-05'));
    }

    public function testContadorDeIdeas(): void
    {
        self::assertSame(0, $this->almacen->contarIdeas());
        $this->almacen->sumarIdea();
        $this->almacen->sumarIdea();
        self::assertSame(2, $this->almacen->contarIdeas());
    }

    public function testPurgarBorraSoloLoViejoYNoTocaElContador(): void
    {
        $this->almacen->guardarEnvio(self::envio(['fecha' => '2026-08-01 10:00:00']));
        $this->almacen->guardarEnvio(self::envio(['fecha' => '2026-11-01 10:00:00']));
        $this->almacen->sumarIdea();
        self::assertSame(1, $this->almacen->purgar('2026-08-05 00:00:00'));
        self::assertCount(1, $this->almacen->envios('2026-01-01 00:00:00'));
        self::assertSame(1, $this->almacen->contarIdeas());
    }

    public function testEnviosDesdeUnaFechaDelMasNuevoAlMasViejo(): void
    {
        $this->almacen->guardarEnvio(self::envio(['fecha' => '2026-11-01 10:00:00', 'idea' => 'vieja']));
        $this->almacen->guardarEnvio(self::envio(['fecha' => '2026-11-03 10:00:00', 'idea' => 'nueva']));
        $this->almacen->guardarEnvio(self::envio(['fecha' => '2026-10-01 10:00:00', 'idea' => 'fuera']));
        self::assertSame(['nueva', 'vieja'], array_column($this->almacen->envios('2026-11-01 00:00:00'), 'idea'));
    }
}
