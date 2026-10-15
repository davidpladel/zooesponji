<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use Zoo\Servicio;

final class ServicioTest extends TestCase
{
    public function testAtenderDevuelveLoQueDevuelveLaAccion(): void
    {
        self::assertSame([200, ['ok' => true]], Servicio::atender(static fn (): array => [200, ['ok' => true]]));
    }

    public function testCualquierFalloEsUn503Generico(): void
    {
        $respuesta = Servicio::atender(static function (): array {
            throw new PDOException('SQLSTATE[HY000] [2002] /var/run/mysqld/mysqld.sock usuario zoo_admin');
        });
        self::assertSame([503, ['error' => 'no-disponible']], $respuesta);
    }

    public function testSinConfiguracionLanza(): void
    {
        $this->expectException(RuntimeException::class);
        Servicio::config(sys_get_temp_dir() . '/no-existe-' . bin2hex(random_bytes(4)));
    }

    public function testLaPlantillaDeConfiguracionTieneTodasLasClaves(): void
    {
        $plantilla = require __DIR__ . '/../app/config.example.php';
        self::assertSame(
            ['db_dsn', 'db_usuario', 'db_clave', 'n8n_url', 'n8n_clave', 'condiciones', 'contenido'],
            array_keys($plantilla),
        );
        self::assertSame('2026-10', $plantilla['condiciones']);
    }

    public function testConfiguracionIncompletaLanza(): void
    {
        $dir = sys_get_temp_dir() . '/zoo-cfg-' . bin2hex(random_bytes(4));
        mkdir($dir);
        file_put_contents($dir . '/config.php', "<?php return ['db_dsn' => 'sqlite::memory:'];");
        try {
            $this->expectException(RuntimeException::class);
            Servicio::config($dir);
        } finally {
            unlink($dir . '/config.php');
            rmdir($dir);
        }
    }
}
