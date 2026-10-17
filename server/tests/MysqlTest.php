<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use Zoo\Servicio;

/**
 * Lo que SQLite no reproduce: carreras de InnoDB y juego de caracteres de la conexión.
 * Solo corre con una base de datos de pruebas: ZOO_TEST_MYSQL_DSN (y ZOO_TEST_MYSQL_USER / _PASS).
 */
final class MysqlTest extends TestCase
{
    private const PROCESOS = 8;

    private static function dsn(): string
    {
        $dsn = (string) getenv('ZOO_TEST_MYSQL_DSN');
        if ($dsn === '') {
            self::markTestSkipped('Sin ZOO_TEST_MYSQL_DSN');
        }
        return $dsn;
    }

    private static function almacen(string $dsn): Zoo\Almacen
    {
        return Servicio::almacen(['db_dsn' => $dsn, 'db_usuario' => getenv('ZOO_TEST_MYSQL_USER') ?: 'root', 'db_clave' => getenv('ZOO_TEST_MYSQL_PASS') ?: '']);
    }

    protected function setUp(): void
    {
        $pdo = new PDO(self::dsn(), getenv('ZOO_TEST_MYSQL_USER') ?: 'root', getenv('ZOO_TEST_MYSQL_PASS') ?: '');
        $pdo->exec('DROP TABLE IF EXISTS votos, votos_hora, envios, contadores');
        self::almacen(self::dsn())->crearTablas();
    }

    /** @return list<string> errores de los procesos */
    private static function aLaVez(string $modo): array
    {
        $salida = (string) (microtime(true) + 1.5);
        $procesos = [];
        for ($i = 0; $i < self::PROCESOS; $i++) {
            $procesos[] = proc_open([PHP_BINARY, __DIR__ . '/mysql-worker.php', $modo, $salida, (string) $i], [2 => ['pipe', 'w']], $tubos);
            $errores[$i] = $tubos[2];
        }
        $fallos = [];
        foreach ($procesos as $i => $proceso) {
            $texto = stream_get_contents($errores[$i]);
            if (proc_close($proceso) !== 0) {
                $fallos[] = $texto;
            }
        }
        return $fallos;
    }

    public function testPrimerosVotosALaVezNoSePierden(): void
    {
        self::assertSame([], self::aLaVez('primeros'));
        $totales = self::almacen(self::dsn())->totales('v');
        self::assertCount(15, $totales);
        self::assertSame([self::PROCESOS], array_values(array_unique($totales)));
    }

    public function testCambiosDeVotoCruzadosNoFallan(): void
    {
        $almacen = self::almacen(self::dsn());
        for ($i = 0; $i < 200; $i++) {
            $almacen->votar('v', 'a');
            $almacen->votar('v', 'b');
        }
        self::assertSame([], self::aLaVez('cruces'));
        self::assertSame(400, array_sum($almacen->totales('v')));
    }

    public function testElTopeAguantaVotosALaVez(): void
    {
        self::assertSame([], self::aLaVez('tope'));
        $almacen = self::almacen(self::dsn());
        self::assertSame(['a' => 50], $almacen->totales('v'));
        self::assertSame([['hora' => '2026-11-03 10', 'contados' => 50, 'frenados' => self::PROCESOS * 15 - 50]], $almacen->votosPorHora('v'));
    }

    public function testContadorDeIdeasALaVez(): void
    {
        self::assertSame([], self::aLaVez('ideas'));
        self::assertSame(self::PROCESOS * 15, self::almacen(self::dsn())->contarIdeas());
    }

    public function testEmojisYTildesAunqueElDsnNoPidaUtf8mb4(): void
    {
        $dsn = preg_replace('/;charset=[^;]*/', '', self::dsn()) . ';charset=latin1';
        $almacen = self::almacen($dsn);
        $idea = '🦒 ¡más jirafas! ñandú';
        $almacen->guardarEnvio(AlmacenTest::envio(['idea' => $idea, 'nombre' => 'Lucía😀']));
        $fila = self::almacen(self::dsn())->envios('2000-01-01 00:00:00')[0];
        self::assertSame($idea, $fila['idea']);
        self::assertSame('Lucía😀', $fila['nombre']);
    }
}
