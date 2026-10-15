<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use Zoo\Dibujo;

final class DibujoTest extends TestCase
{
    public function testAceptaNombresNormales(): void
    {
        self::assertSame('delfines.png', Dibujo::nombre('delfines.png'));
        self::assertSame('elefantes-2.png', Dibujo::nombre('elefantes-2.png'));
    }

    public function testRechazaLoQueSaleDeLaCarpetaOEsOtraCosa(): void
    {
        foreach (['../x.png', 'a/b.png', 'a\b.png', '..png', 'a.b.png', 'A.png', 'x.jpg', 'x.png.php', ".png", '', "x.png\n", "x\0.png"] as $malo) {
            self::assertNull(Dibujo::nombre($malo), var_export($malo, true));
        }
        self::assertNull(Dibujo::nombre(['x.png']));
        self::assertNull(Dibujo::nombre(null));
        self::assertNull(Dibujo::nombre(str_repeat('a', 200) . '.png'));
    }
}
