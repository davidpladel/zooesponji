<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

/** `public/ruta.php` se sube con cada actualización: tiene que encontrar app/ en las dos disposiciones. */
final class RutaTest extends TestCase
{
    private string $raiz;

    protected function setUp(): void
    {
        $this->raiz = sys_get_temp_dir() . '/zoo-ruta-' . bin2hex(random_bytes(4));
        mkdir($this->raiz . '/public', 0777, true);
        copy(__DIR__ . '/../public/ruta.php', $this->raiz . '/public/ruta.php');
    }

    protected function tearDown(): void
    {
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($this->raiz, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
        foreach ($it as $f) {
            $f->isDir() ? rmdir($f->getPathname()) : unlink($f->getPathname());
        }
        rmdir($this->raiz);
    }

    public function testEnHestiaUsaPrivateApp(): void
    {
        mkdir($this->raiz . '/private/app', 0777, true);
        self::assertSame(realpath($this->raiz . '/private/app'), realpath(require $this->raiz . '/public/ruta.php'));
    }

    public function testEnElRepositorioUsaApp(): void
    {
        mkdir($this->raiz . '/app');
        self::assertSame(realpath($this->raiz . '/app'), realpath(require $this->raiz . '/public/ruta.php'));
    }
}
