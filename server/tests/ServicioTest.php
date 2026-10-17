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
            ['db_dsn', 'db_usuario', 'db_clave', 'n8n_url', 'n8n_clave', 'condiciones', 'contenido', 'votos_hora'],
            array_keys($plantilla),
        );
        self::assertSame('2026-10', $plantilla['condiciones']);
        self::assertSame(300, $plantilla['votos_hora']);
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

    private static function conTope(string $tope): array
    {
        $dir = sys_get_temp_dir() . '/zoo-cfg-' . bin2hex(random_bytes(4));
        mkdir($dir);
        $base = "'db_dsn' => '', 'db_usuario' => '', 'db_clave' => '', 'n8n_url' => '', 'n8n_clave' => '', 'condiciones' => '', 'contenido' => 'x'";
        file_put_contents($dir . '/config.php', "<?php return [$base$tope];");
        try {
            return Servicio::config($dir);
        } finally {
            unlink($dir . '/config.php');
            rmdir($dir);
        }
    }

    public function testSinTopeDeVotosSeUsan300(): void
    {
        self::assertSame(300, self::conTope('')['votos_hora']);
        self::assertSame(50, self::conTope(", 'votos_hora' => 50")['votos_hora']);
    }

    public function testTopeDeVotosRaroLanza(): void
    {
        $this->expectException(RuntimeException::class);
        self::conTope(", 'votos_hora' => 0");
    }
}
