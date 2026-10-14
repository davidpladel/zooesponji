<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

/** La web de www.zooesponji.com (carpeta web/ del repositorio). */
final class WebTest extends TestCase
{
    private const WEB = __DIR__ . '/../../web';

    /** @return list<string> */
    private static function archivosDeTexto(): array
    {
        $todos = [];
        // Solo lo que se publica: public/ y paginas/ (el README no se sube).
        foreach (['/public', '/paginas'] as $carpeta) {
            $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(self::WEB . $carpeta, FilesystemIterator::SKIP_DOTS));
            foreach ($it as $f) {
            if (preg_match('/\.(html|php|css|js|txt|md)$/', $f->getFilename()) === 1 && $f->getFilename() !== 'Baloo2-LICENSE.txt') {
                    $todos[] = $f->getPathname();
                }
            }
        }
        return $todos;
    }

    public function testCadaRutaTieneSuPagina(): void
    {
        $rutas = require self::WEB . '/paginas/rutas.php';
        foreach ($rutas as $pagina) {
            self::assertFileExists(self::WEB . '/paginas/' . $pagina);
        }
    }

    public function testNingunEnlaceAGithubNiALaVersionWeb(): void
    {
        foreach (self::archivosDeTexto() as $archivo) {
            $texto = (string) file_get_contents($archivo);
            self::assertStringNotContainsStringIgnoringCase('github', $texto, $archivo);
            self::assertStringNotContainsString('davidpladel.com/zoo', $texto, $archivo);
        }
    }

    public function testTodasLasPaginasLlevanLosEnlacesLegales(): void
    {
        foreach (glob(self::WEB . '/paginas/*.html') ?: [] as $pagina) {
            $html = (string) file_get_contents($pagina);
            self::assertMatchesRegularExpression('#href="/(privacidad|privacy)"#', $html, $pagina);
            self::assertMatchesRegularExpression('#href="/(condiciones|terms)"#', $html, $pagina);
            self::assertStringContainsString('aviso-legal', $html, $pagina);
        }
    }

    public function testElFormularioEnviaALaApiYLaPaginaLoPermite(): void
    {
        self::assertStringContainsString("fetch('https://api.zooesponji.com/envio.php'", (string) file_get_contents(self::WEB . '/public/assets/ideas.js'));
        self::assertStringContainsString('connect-src', (string) file_get_contents(self::WEB . '/public/pagina.php'));
    }

    public function testLaPortadaEnlazaAPlayYAlFormulario(): void
    {
        foreach (['inicio.html' => '/ideas', 'home.html' => '/ideas/en'] as $pagina => $ideas) {
            $html = (string) file_get_contents(self::WEB . '/paginas/' . $pagina);
            self::assertStringContainsString('https://play.google.com/store/apps/details?id=com.davidpladel.zooesponji', $html);
            self::assertStringContainsString('href="' . $ideas . '"', $html);
            self::assertStringContainsString('Daniela (9)', $html);
            self::assertStringContainsString('Adrián (5)', $html);
        }
    }
}
