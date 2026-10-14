<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use Zoo\Texto;

final class TextoTest extends TestCase
{
    public function testRecortaLosExtremos(): void
    {
        self::assertSame('hola', Texto::limpio("  hola \n", 10));
    }

    public function testRechazaLoQueNoEsTexto(): void
    {
        self::assertNull(Texto::limpio(['a'], 10));
        self::assertNull(Texto::limpio(7, 10));
        self::assertNull(Texto::limpio(null, 10));
    }

    public function testRechazaUtf8Roto(): void
    {
        self::assertNull(Texto::limpio("\xC3\x28", 10));
    }

    public function testCuentaCaracteresNoBytes(): void
    {
        self::assertSame('ñandú🦒', Texto::limpio('ñandú🦒', 6));
        self::assertNull(Texto::limpio('ñandú🦒!', 6));
    }

    public function testCaracteresDeControl(): void
    {
        self::assertNull(Texto::limpio("a\x00b", 10));
        self::assertNull(Texto::limpio("a\nb", 10));
        self::assertSame("a\nb", Texto::limpio("a\r\nb", 10, true));
        self::assertNull(Texto::limpio("a\tb", 10, true));
    }

    public function testNoTocaComillasNiEtiquetas(): void
    {
        $raro = "<script>alert('x')</script> \"; DROP TABLE envios; --";
        self::assertSame($raro, Texto::limpio($raro, 300));
    }
}
