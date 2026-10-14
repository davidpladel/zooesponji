<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use Zoo\Http;

final class HttpTest extends TestCase
{
    private const WEB = ['https://www.zooesponji.com', 'https://zooesponji.com'];

    public function testElFormularioSoloSeAceptaDesdeLaWeb(): void
    {
        self::assertSame('https://www.zooesponji.com', Http::elegirOrigen('https://www.zooesponji.com', self::WEB));
        self::assertSame('https://zooesponji.com', Http::elegirOrigen('https://zooesponji.com', self::WEB));
        self::assertSame('https://www.zooesponji.com', Http::elegirOrigen('https://malo.example', self::WEB));
        self::assertSame('https://www.zooesponji.com', Http::elegirOrigen(null, self::WEB));
    }

    public function testApiYaNoTienePaginasDePersonas(): void
    {
        foreach (['public/ideas', 'public/condiciones.html', 'public/terms.html', 'app/paginas'] as $viejo) {
            self::assertFileDoesNotExist(__DIR__ . '/../' . $viejo);
        }
    }

    public function testLasDireccionesViejasRedirigenALaWeb(): void
    {
        $htaccess = (string) file_get_contents(__DIR__ . '/../public/.htaccess');
        foreach (['ideas', 'ideas/en', 'condiciones', 'terms'] as $destino) {
            self::assertStringContainsString("https://www.zooesponji.com/$destino [R=301", $htaccess);
        }
    }
}
