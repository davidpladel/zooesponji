<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use Zoo\Exportar;

/** La exportación ya no es una dirección web: solo se ejecuta por SSH (`app/exportar.php`). */
final class ExportarTest extends TestCase
{
    public function testDevuelveLosEnviosDesdeElDia(): void
    {
        $almacen = AlmacenTest::nuevo();
        $almacen->guardarEnvio(AlmacenTest::envio(['fecha' => '2026-10-20 10:00:00', 'idea' => 'vieja']));
        $almacen->guardarEnvio(AlmacenTest::envio(['fecha' => '2026-11-02 10:00:00', 'idea' => 'nueva']));
        [$estado, $cuerpo] = Exportar::procesar('2026-11-01', $almacen);
        self::assertSame(200, $estado);
        self::assertSame(['nueva'], array_column($cuerpo['envios'], 'idea'));
    }

    public function testDesdeTieneQueSerUnDia(): void
    {
        $almacen = AlmacenTest::nuevo();
        foreach (["2026-11-01' OR 1=1", '', null, ['2026-11-01'], '2026-11-01; rm -rf /'] as $malo) {
            self::assertSame([400, ['error' => 'peticion']], Exportar::procesar($malo, $almacen));
        }
    }

    public function testNoHayDireccionWebDeExportar(): void
    {
        self::assertFileDoesNotExist(__DIR__ . '/../public/exportar.php');
        self::assertFileExists(__DIR__ . '/../app/exportar.php');
    }

    public function testLaConfiguracionYaNoLlevaClaveDeExportar(): void
    {
        self::assertArrayNotHasKey('clave_exportar', require __DIR__ . '/../app/config.example.php');
    }
}
