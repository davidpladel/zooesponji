<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use Zoo\Http;

final class HttpTest extends TestCase
{
    public function testLasPaginasLlevanSusCabecerasDeSeguridad(): void
    {
        $cabeceras = implode("\n", Http::cabecerasPagina());
        self::assertStringContainsString("Content-Security-Policy: default-src 'self'", $cabeceras);
        self::assertStringContainsString("frame-ancestors 'none'", $cabeceras);
        self::assertStringContainsString('X-Frame-Options: DENY', $cabeceras);
        self::assertStringContainsString('X-Content-Type-Options: nosniff', $cabeceras);
        self::assertStringContainsString('Referrer-Policy: no-referrer', $cabeceras);
        self::assertStringContainsString('Content-Type: text/html; charset=utf-8', $cabeceras);
    }

    public function testLosFormulariosSeSirvenPorPhpNoComoHtmlSuelto(): void
    {
        foreach (['index.html', 'en.html'] as $suelto) {
            self::assertFileDoesNotExist(__DIR__ . '/../public/ideas/' . $suelto);
        }
        foreach (['index.php', 'en.php'] as $entrada) {
            self::assertFileExists(__DIR__ . '/../public/ideas/' . $entrada);
        }
        foreach (['ideas-es.html', 'ideas-en.html'] as $pagina) {
            self::assertFileExists(__DIR__ . '/../app/paginas/' . $pagina);
        }
    }

    public function testLaVersionInglesaSeAbreComoIdeasEn(): void
    {
        $htaccess = (string) file_get_contents(__DIR__ . '/../public/.htaccess');
        self::assertMatchesRegularExpression('#RewriteRule \^ideas/en\$ ideas/en\.php#', $htaccess);
        self::assertStringContainsString('<a href="en">English</a>', (string) file_get_contents(__DIR__ . '/../app/paginas/ideas-es.html'));
    }
}
