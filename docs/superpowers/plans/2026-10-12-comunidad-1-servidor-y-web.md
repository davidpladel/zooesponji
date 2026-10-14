# Comunidad 1: servidor y web — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un servidor pequeño en PHP y MySQL que sirve la votación en curso, cuenta votos y recibe ideas y fallos desde una página web para adultos, más las herramientas para preparar `comunidad.json`.

**Architecture:** Toda la lógica vive en clases puras bajo `server/app/src/` (espacio de nombres `Zoo\`), probadas con PHPUnit sobre SQLite en memoria. Los cuatro archivos de `server/public/` solo leen la petición, llaman a una clase y responden JSON. La base de datos se usa con PDO y SQL que vale igual en SQLite y MySQL. Las herramientas de `tools/comunidad/` son Node sin dependencias, como `tools/matomo/`.

**Tech Stack:** PHP 8.3 (sin Composer; PHPUnit 11 como `.phar`), PDO (MySQL en producción, SQLite en pruebas), HTML/CSS/JS sin librerías, Node 24 (`node:test`).

**Spec:** `docs/superpowers/specs/2026-10-12-comunidad-design.md` (apartados 1, 2, 2b, 2c, 3, 9 y 10).

## Global Constraints

- Rama `feat/comunidad`, carpeta de trabajo `C:\Projects\games\zooesponji-comunidad`. Este plan no toca `game/`.
- El repositorio es público: ninguna contraseña, clave, dirección de n8n ni envío descargado entra en git.
- Solo consultas preparadas con parámetros. Ninguna consulta se arma pegando texto.
- Lo recibido nunca se devuelve al navegador. Las respuestas son mensajes fijos.
- Sin cookies, sin sesiones, sin identificadores. La IP no se guarda ni se usa.
- Tamaño máximo de petición: 8 KB (8192 bytes).
- Identificadores: `^[a-z0-9-]{1,40}$`. Nombres de dibujo: `^[a-z0-9-]{1,40}\.png$`.
- Longitudes: idea 300, fallo 500, nombre 15, versión 20, modelo 60, título de opción 30.
- De 2 a 4 opciones por votación. Muro: 30 entradas como máximo.
- Reparto de votos en porcentajes redondeados a 5, sin totales.
- Envíos: se borran a los 90 días. Tope global: 300 al día.
- Versión de las condiciones: `2026-10`.
- Días en hora de España (`Europe/Madrid`); fechas guardadas en UTC como `AAAA-MM-DD HH:MM:SS`.
- Comentarios, nombres de clases y mensajes de commit en español, como el resto del repositorio.
- Terminal de David: PowerShell 5 (no admite `&&`; usa `;`).

## Review Focus

1. **`comunidad.json` guardado con un editor de Windows** (con marca BOM al principio): debe leerse igual, no dar «sin votación». → Tarea 2.
2. **Idea con emojis o acentos** («🦒 ¡más jirafas!»): se guarda y se exporta idéntica. → Tarea 3.
3. **Base de datos caída o configuración ausente:** los cuatro puntos de entrada responden 503 con JSON genérico, nunca un error de PHP con rutas. → Tarea 4.
4. **Medianoche:** a las 23:30 UTC ya es el día siguiente en España; una votación que abre ese día debe estar abierta. → Tarea 4.
5. **Doble toque en «Enviar»:** el formulario envía una sola vez. → Tarea 8.

## Estructura de archivos

```
server/
  README.md                 instalación en el VPS y flujo de n8n
  phpunit.xml
  .gitignore                herramientas/, app/config.php, app/datos/*.json, *.ok
  app/
    autoload.php            carga las clases Zoo\
    config.example.php      plantilla de configuración
    esquema.sql             tablas para MySQL
    datos/comunidad.example.json
    src/
      Texto.php             limpieza y validación de textos
      Contenido.php         valida y lee comunidad.json
      Almacen.php           todo el SQL
      Reloj.php             hoy en España y ahora en UTC
      Estado.php            respuesta de estado.php
      Voto.php              regla de voto y cambio de voto
      Avisador.php          interfaz del aviso
      AvisadorN8n.php       aviso real por HTTP
      Envio.php             regla del formulario
      Exportar.php          descarga de envíos con clave
      Servicio.php          arranque, y fallo → 503
      Http.php              leer cuerpo y responder
  public/
    ruta.php                dónde está app/
    estado.php voto.php envio.php exportar.php
    .htaccess               cabeceras de seguridad
    ideas/index.html ideas/en.html ideas/ideas.js ideas/ideas.css
    condiciones.html terms.html
    dibujos/.gitkeep
  tests/
    bootstrap.php
    *Test.php
tools/comunidad/
  README.md  .env.example  lib.mjs  lib.test.mjs  check.mjs  envios.mjs
```

---

### Task 1: Preparar PHP en la máquina y el esqueleto de `server/`

**Files:**
- Create: `server/.gitignore`, `server/phpunit.xml`, `server/app/autoload.php`, `server/tests/bootstrap.php`, `server/app/src/Texto.php`, `server/tests/TextoTest.php`
- Modify: `.gitignore` (raíz)

**Interfaces:**
- Produces: `Zoo\Texto::limpio(mixed $valor, int $max, bool $lineas = false): ?string` — devuelve el texto recortado por los extremos, o `null` si no es texto, no es UTF-8 válido, lleva caracteres de control o pasa de `$max` caracteres. Con `$lineas` se admiten saltos de línea.
- Produces: comando de pruebas `php herramientas/phpunit.phar` desde `server/`.

- [ ] **Step 1: David instala PHP (paso manual, PowerShell)**

No hay PHP en la máquina. Pedir a David que ejecute, de uno en uno:

```powershell
winget install --id PHP.PHP.8.3 -e
```

Cerrar y abrir la terminal, y después:

```powershell
$dir = Split-Path (Get-Command php).Source; Copy-Item "$dir\php.ini-development" "$dir\php.ini"; (Get-Content "$dir\php.ini") -replace '^;extension_dir = "ext"','extension_dir = "ext"' -replace '^;extension=(pdo_sqlite|sqlite3|mbstring|openssl|curl)$','extension=$1' | Set-Content "$dir\php.ini" -Encoding ascii; php -m | Select-String 'pdo_sqlite|mbstring|curl'
```

Expected: tres líneas, `curl`, `mbstring` y `pdo_sqlite`. Si `winget` no encuentra el paquete: `winget search PHP.PHP` y usar el id de la 8.3 que salga.

- [ ] **Step 2: Descargar PHPUnit**

```bash
cd server && mkdir -p herramientas && curl -sSL -o herramientas/phpunit.phar https://phar.phpunit.de/phpunit-11.phar && php herramientas/phpunit.phar --version
```

Expected: `PHPUnit 11.x.x by Sebastian Bergmann and contributors.`

- [ ] **Step 3: Archivos de base**

`server/.gitignore`:

```
herramientas/
.phpunit.cache/
app/config.php
app/datos/*.json
app/datos/*.ok
!app/datos/comunidad.example.json
public/dibujos/*.png
```

Añadir al final de `.gitignore` de la raíz:

```
# Envíos descargados del servidor de comunidad: llevan nombres de menores
tools/comunidad/data/
```

`server/phpunit.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit bootstrap="tests/bootstrap.php" colors="true" failOnWarning="true" failOnRisky="true" cacheDirectory=".phpunit.cache">
  <testsuites>
    <testsuite name="servidor">
      <directory>tests</directory>
    </testsuite>
  </testsuites>
</phpunit>
```

`server/app/autoload.php`:

```php
<?php
declare(strict_types=1);

spl_autoload_register(static function (string $clase): void {
    if (!str_starts_with($clase, 'Zoo\\')) {
        return;
    }
    $ruta = __DIR__ . '/src/' . str_replace('\\', '/', substr($clase, 4)) . '.php';
    if (is_file($ruta)) {
        require $ruta;
    }
});
```

`server/tests/bootstrap.php`:

```php
<?php
declare(strict_types=1);

require __DIR__ . '/../app/autoload.php';
```

- [ ] **Step 4: Escribir la prueba que falla**

`server/tests/TextoTest.php`:

```php
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
```

- [ ] **Step 5: Comprobar que falla**

Run: `cd server && php herramientas/phpunit.phar`
Expected: FAIL, `Class "Zoo\Texto" not found`.

- [ ] **Step 6: Implementación**

`server/app/src/Texto.php`:

```php
<?php
declare(strict_types=1);

namespace Zoo;

/** Textos que llegan de fuera: o están limpios o no valen. No se escapan aquí: nunca se devuelven al navegador. */
final class Texto
{
    public static function limpio(mixed $valor, int $max, bool $lineas = false): ?string
    {
        if (!is_string($valor) || !mb_check_encoding($valor, 'UTF-8')) {
            return null;
        }
        $texto = trim(str_replace(["\r\n", "\r"], "\n", $valor));
        $control = $lineas ? '/[\x00-\x09\x0B-\x1F\x7F]/u' : '/[\x00-\x1F\x7F]/u';
        if (preg_match($control, $texto) === 1) {
            return null;
        }
        return mb_strlen($texto, 'UTF-8') > $max ? null : $texto;
    }
}
```

- [ ] **Step 7: Comprobar que pasa**

Run: `cd server && php herramientas/phpunit.phar`
Expected: `OK`.

- [ ] **Step 8: Commit**

```bash
git add .gitignore server/.gitignore server/phpunit.xml server/app/autoload.php server/app/src/Texto.php server/tests
git commit -m "feat: esqueleto del servidor de comunidad y limpieza de textos"
```

---

### Task 2: Validar y leer `comunidad.json`

**Files:**
- Create: `server/app/src/Contenido.php`, `server/app/datos/comunidad.example.json`, `server/tests/ContenidoTest.php`

**Interfaces:**
- Consumes: `Zoo\Texto::limpio`.
- Produces:
  - `Zoo\Contenido::VACIO` = `['votacion' => null, 'muro' => []]`
  - `Zoo\Contenido::ID`, `Zoo\Contenido::DIBUJO` (patrones)
  - `Zoo\Contenido::validar(mixed $datos): array` — devuelve `['votacion' => ?array, 'muro' => list<array>]` normalizado; lanza `\InvalidArgumentException` si algo no cumple.
  - `Zoo\Contenido::leer(string $ruta): array` — nunca lanza.
  - `Zoo\Contenido::abierta(?array $votacion, string $hoy): bool`
  - Forma de `votacion`: `['id' => string, 'abre' => 'AAAA-MM-DD', 'cierra' => 'AAAA-MM-DD', 'opciones' => list<['id','titulo'=>['es','en'],'dibujo','ideaDe'?]>, 'ganadora' => ?string]`
  - Forma de una entrada del muro: `['titulo'=>['es','en'], 'dibujo', 'ideaDe'?, 'estado' => 'elegida'|'hecha', 'recinto'?]`

- [ ] **Step 1: Archivo de ejemplo**

`server/app/datos/comunidad.example.json`:

```json
{
  "votacion": {
    "id": "2026-11-a",
    "abre": "2026-11-01",
    "cierra": "2026-11-15",
    "opciones": [
      { "id": "delfines", "titulo": { "es": "Delfines", "en": "Dolphins" }, "dibujo": "delfines.png", "ideaDe": "Lucía" },
      { "id": "koalas", "titulo": { "es": "Koalas", "en": "Koalas" }, "dibujo": "koalas.png" }
    ],
    "ganadora": null
  },
  "muro": [
    { "titulo": { "es": "Pingüinos", "en": "Penguins" }, "dibujo": "pinguinos.png", "ideaDe": "Adrián", "estado": "hecha", "recinto": "pinguino" }
  ]
}
```

- [ ] **Step 2: Escribir las pruebas que fallan**

`server/tests/ContenidoTest.php`:

```php
<?php
declare(strict_types=1);

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Zoo\Contenido;

final class ContenidoTest extends TestCase
{
    private string $dir;

    protected function setUp(): void
    {
        $this->dir = sys_get_temp_dir() . '/zoo-' . bin2hex(random_bytes(4));
        mkdir($this->dir);
    }

    protected function tearDown(): void
    {
        array_map('unlink', glob($this->dir . '/*') ?: []);
        rmdir($this->dir);
    }

    public static function ejemplo(): array
    {
        return json_decode((string) file_get_contents(__DIR__ . '/../app/datos/comunidad.example.json'), true);
    }

    public function testElEjemploEsValido(): void
    {
        $c = Contenido::validar(self::ejemplo());
        self::assertSame('2026-11-a', $c['votacion']['id']);
        self::assertSame('Lucía', $c['votacion']['opciones'][0]['ideaDe']);
        self::assertArrayNotHasKey('ideaDe', $c['votacion']['opciones'][1]);
        self::assertSame('pinguino', $c['muro'][0]['recinto']);
    }

    public function testSinVotacion(): void
    {
        self::assertSame(Contenido::VACIO, Contenido::validar(['votacion' => null, 'muro' => []]));
        self::assertSame(Contenido::VACIO, Contenido::validar([]));
    }

    public function testRecortaElNombreAQuince(): void
    {
        $d = self::ejemplo();
        $d['votacion']['opciones'][0]['ideaDe'] = 'Maximiliano Alejandro';
        self::assertSame('Maximiliano Ale', Contenido::validar($d)['votacion']['opciones'][0]['ideaDe']);
    }

    public function testDescartaLasClavesDesconocidas(): void
    {
        $d = self::ejemplo();
        $d['votacion']['opciones'][0]['html'] = '<b>x</b>';
        self::assertArrayNotHasKey('html', Contenido::validar($d)['votacion']['opciones'][0]);
    }

    /** @return iterable<string, array{callable}> */
    public static function rotos(): iterable
    {
        yield 'raiz no es objeto' => [static fn (array $d) => 'hola'];
        yield 'id con barra' => [static function (array $d) { $d['votacion']['id'] = '../x'; return $d; }];
        yield 'id con mayusculas' => [static function (array $d) { $d['votacion']['id'] = 'Nov'; return $d; }];
        yield 'fecha imposible' => [static function (array $d) { $d['votacion']['abre'] = '2026-02-31'; return $d; }];
        yield 'cierra antes de abrir' => [static function (array $d) { $d['votacion']['cierra'] = '2026-10-01'; return $d; }];
        yield 'una sola opcion' => [static function (array $d) { array_pop($d['votacion']['opciones']); return $d; }];
        yield 'cinco opciones' => [static function (array $d) {
            foreach (['a', 'b', 'c'] as $id) { $d['votacion']['opciones'][] = ['id' => $id] + $d['votacion']['opciones'][0]; }
            return $d;
        }];
        yield 'opcion repetida' => [static function (array $d) { $d['votacion']['opciones'][1]['id'] = 'delfines'; return $d; }];
        yield 'dibujo con ruta' => [static function (array $d) { $d['votacion']['opciones'][0]['dibujo'] = '../config.php'; return $d; }];
        yield 'dibujo que no es png' => [static function (array $d) { $d['votacion']['opciones'][0]['dibujo'] = 'a.svg'; return $d; }];
        yield 'titulo sin ingles' => [static function (array $d) { unset($d['votacion']['opciones'][0]['titulo']['en']); return $d; }];
        yield 'titulo vacio' => [static function (array $d) { $d['votacion']['opciones'][0]['titulo']['es'] = ' '; return $d; }];
        yield 'titulo largo' => [static function (array $d) { $d['votacion']['opciones'][0]['titulo']['es'] = str_repeat('a', 31); return $d; }];
        yield 'ganadora que no existe' => [static function (array $d) { $d['votacion']['ganadora'] = 'leones'; return $d; }];
        yield 'estado inventado' => [static function (array $d) { $d['muro'][0]['estado'] = 'pronto'; return $d; }];
        yield 'recinto con espacios' => [static function (array $d) { $d['muro'][0]['recinto'] = 'el pinguino'; return $d; }];
        yield 'muro que no es lista' => [static function (array $d) { $d['muro'] = ['a' => 1]; return $d; }];
        yield 'muro enorme' => [static function (array $d) { $d['muro'] = array_fill(0, 31, $d['muro'][0]); return $d; }];
    }

    #[DataProvider('rotos')]
    public function testRechaza(callable $romper): void
    {
        $this->expectException(InvalidArgumentException::class);
        Contenido::validar($romper(self::ejemplo()));
    }

    public function testAbiertaIncluyeLosDosDias(): void
    {
        $v = Contenido::validar(self::ejemplo())['votacion'];
        self::assertFalse(Contenido::abierta($v, '2026-10-31'));
        self::assertTrue(Contenido::abierta($v, '2026-11-01'));
        self::assertTrue(Contenido::abierta($v, '2026-11-15'));
        self::assertFalse(Contenido::abierta($v, '2026-11-16'));
        self::assertFalse(Contenido::abierta(null, '2026-11-05'));
    }

    public function testLeerArchivoBueno(): void
    {
        $ruta = $this->dir . '/comunidad.json';
        file_put_contents($ruta, json_encode(self::ejemplo()));
        self::assertSame('2026-11-a', Contenido::leer($ruta)['votacion']['id']);
        self::assertFileExists($ruta . '.ok');
    }

    public function testLeerArchivoConBom(): void
    {
        $ruta = $this->dir . '/comunidad.json';
        file_put_contents($ruta, "\xEF\xBB\xBF" . json_encode(self::ejemplo()));
        self::assertSame('2026-11-a', Contenido::leer($ruta)['votacion']['id']);
    }

    public function testArchivoRotoConservaElMuroAnteriorYQuitaLaVotacion(): void
    {
        $ruta = $this->dir . '/comunidad.json';
        file_put_contents($ruta, json_encode(self::ejemplo()));
        Contenido::leer($ruta);
        file_put_contents($ruta, '{ esto no es json');
        $c = Contenido::leer($ruta);
        self::assertNull($c['votacion']);
        self::assertCount(1, $c['muro']);
    }

    public function testSinArchivoNiCopia(): void
    {
        self::assertSame(Contenido::VACIO, Contenido::leer($this->dir . '/no-existe.json'));
    }

    public function testArchivoGiganteSeIgnora(): void
    {
        $ruta = $this->dir . '/comunidad.json';
        file_put_contents($ruta, str_repeat(' ', 70000) . '{}');
        self::assertSame(Contenido::VACIO, Contenido::leer($ruta));
    }
}
```

- [ ] **Step 3: Comprobar que fallan**

Run: `cd server && php herramientas/phpunit.phar --filter ContenidoTest`
Expected: FAIL, `Class "Zoo\Contenido" not found`.

- [ ] **Step 4: Implementación**

`server/app/src/Contenido.php`:

```php
<?php
declare(strict_types=1);

namespace Zoo;

use InvalidArgumentException;

/** `comunidad.json`: lo edita David a mano, así que se valida como cualquier otro dato de fuera. */
final class Contenido
{
    public const ID = '/^[a-z0-9-]{1,40}$/';
    public const DIBUJO = '/^[a-z0-9-]{1,40}\.png$/';
    public const VACIO = ['votacion' => null, 'muro' => []];

    private const MAX_BYTES = 65536;
    private const MAX_MURO = 30;
    private const MAX_TITULO = 30;
    private const MAX_NOMBRE = 15;

    /** Devuelve solo las claves conocidas, ya limpias. */
    public static function validar(mixed $datos): array
    {
        if (!is_array($datos)) {
            throw new InvalidArgumentException('raiz');
        }
        $votacion = ($datos['votacion'] ?? null) === null ? null : self::votacion($datos['votacion']);
        $entradas = $datos['muro'] ?? [];
        if (!is_array($entradas) || !array_is_list($entradas) || count($entradas) > self::MAX_MURO) {
            throw new InvalidArgumentException('muro');
        }
        return ['votacion' => $votacion, 'muro' => array_map(self::entrada(...), $entradas)];
    }

    /** Abierta entre `abre` y `cierra`, los dos días incluidos. */
    public static function abierta(?array $votacion, string $hoy): bool
    {
        return $votacion !== null && $votacion['abre'] <= $hoy && $hoy <= $votacion['cierra'];
    }

    /**
     * Lee el archivo sin lanzar nunca. Si está roto, no hay votación y se conserva el muro de la última
     * lectura buena (guardada al lado como `.ok`).
     */
    public static function leer(string $ruta): array
    {
        $copia = $ruta . '.ok';
        $bueno = self::intentar($ruta);
        if ($bueno !== null) {
            if (!is_file($copia) || filemtime($copia) < filemtime($ruta)) {
                @file_put_contents($copia, json_encode($bueno, JSON_UNESCAPED_UNICODE), LOCK_EX);
            }
            return $bueno;
        }
        $anterior = self::intentar($copia);
        return $anterior === null ? self::VACIO : ['votacion' => null, 'muro' => $anterior['muro']];
    }

    private static function intentar(string $archivo): ?array
    {
        if (!is_file($archivo) || filesize($archivo) > self::MAX_BYTES) {
            return null;
        }
        $texto = (string) file_get_contents($archivo);
        if (str_starts_with($texto, "\xEF\xBB\xBF")) {
            $texto = substr($texto, 3);
        }
        try {
            return self::validar(json_decode($texto, true, 16, JSON_THROW_ON_ERROR));
        } catch (\Throwable) {
            return null;
        }
    }

    private static function votacion(mixed $v): array
    {
        if (!is_array($v)) {
            throw new InvalidArgumentException('votacion');
        }
        $abre = self::dia($v['abre'] ?? null);
        $cierra = self::dia($v['cierra'] ?? null);
        $crudas = $v['opciones'] ?? null;
        if ($abre > $cierra || !is_array($crudas) || !array_is_list($crudas) || count($crudas) < 2 || count($crudas) > 4) {
            throw new InvalidArgumentException('votacion');
        }
        $opciones = [];
        $ids = [];
        foreach ($crudas as $cruda) {
            if (!is_array($cruda)) {
                throw new InvalidArgumentException('opcion');
            }
            $id = self::id($cruda['id'] ?? null);
            if (in_array($id, $ids, true)) {
                throw new InvalidArgumentException('opcion repetida');
            }
            $ids[] = $id;
            $opciones[] = ['id' => $id] + self::ficha($cruda);
        }
        $ganadora = $v['ganadora'] ?? null;
        if ($ganadora !== null && !in_array($ganadora, $ids, true)) {
            throw new InvalidArgumentException('ganadora');
        }
        return ['id' => self::id($v['id'] ?? null), 'abre' => $abre, 'cierra' => $cierra, 'opciones' => $opciones, 'ganadora' => $ganadora];
    }

    private static function entrada(mixed $e): array
    {
        if (!is_array($e) || !in_array($e['estado'] ?? null, ['elegida', 'hecha'], true)) {
            throw new InvalidArgumentException('muro');
        }
        $entrada = self::ficha($e) + ['estado' => $e['estado']];
        if (isset($e['recinto'])) {
            $entrada['recinto'] = self::id($e['recinto']);
        }
        return $entrada;
    }

    /** Lo común a una opción y a una entrada del muro: título en los dos idiomas, dibujo y crédito. */
    private static function ficha(array $f): array
    {
        $titulo = $f['titulo'] ?? null;
        $es = is_array($titulo) ? Texto::limpio($titulo['es'] ?? null, self::MAX_TITULO) : null;
        $en = is_array($titulo) ? Texto::limpio($titulo['en'] ?? null, self::MAX_TITULO) : null;
        $dibujo = $f['dibujo'] ?? null;
        if ($es === null || $es === '' || $en === null || $en === '' || !is_string($dibujo) || preg_match(self::DIBUJO, $dibujo) !== 1) {
            throw new InvalidArgumentException('ficha');
        }
        $ficha = ['titulo' => ['es' => $es, 'en' => $en], 'dibujo' => $dibujo];
        if (isset($f['ideaDe'])) {
            $nombre = Texto::limpio($f['ideaDe'], 40);
            if ($nombre === null) {
                throw new InvalidArgumentException('ideaDe');
            }
            if ($nombre !== '') {
                $ficha['ideaDe'] = mb_substr($nombre, 0, self::MAX_NOMBRE, 'UTF-8');
            }
        }
        return $ficha;
    }

    private static function id(mixed $v): string
    {
        if (!is_string($v) || preg_match(self::ID, $v) !== 1) {
            throw new InvalidArgumentException('id');
        }
        return $v;
    }

    private static function dia(mixed $v): string
    {
        if (!is_string($v) || preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $v, $m) !== 1 || !checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
            throw new InvalidArgumentException('dia');
        }
        return $v;
    }
}
```

- [ ] **Step 5: Comprobar que pasan**

Run: `cd server && php herramientas/phpunit.phar --filter ContenidoTest`
Expected: `OK`.

- [ ] **Step 6: Commit**

```bash
git add server/app/src/Contenido.php server/app/datos/comunidad.example.json server/tests/ContenidoTest.php
git commit -m "feat: validación y lectura de comunidad.json"
```

---

### Task 3: Base de datos (`Almacen`)

**Files:**
- Create: `server/app/src/Almacen.php`, `server/app/esquema.sql`, `server/tests/AlmacenTest.php`

**Interfaces:**
- Produces (`Zoo\Almacen`, constructor `__construct(\PDO $pdo)`; el PDO debe venir con `ERRMODE_EXCEPTION`):
  - `crearTablas(): void` — crea las tablas si faltan (SQLite y MySQL).
  - `votar(string $votacion, string $opcion, ?string $anterior = null): void` — suma uno a `$opcion`; si hay `$anterior`, le resta uno sin bajar de cero.
  - `totales(string $votacion): array` — `['delfines' => 3, ...]`.
  - `guardarEnvio(array $envio): int` — claves: `fecha, idea, fallo, nombre, version, modelo, idioma, condiciones`. Devuelve el id.
  - `enviosDelDia(string $dia): int` — `$dia` es `AAAA-MM-DD` (UTC).
  - `sumarIdea(): void`, `contarIdeas(): int`
  - `purgar(string $antesDe): int` — borra envíos con `fecha < $antesDe`.
  - `envios(string $desde): array` — lista de envíos con `fecha >= $desde`, del más nuevo al más viejo.

- [ ] **Step 1: Escribir las pruebas que fallan**

`server/tests/AlmacenTest.php`:

```php
<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use Zoo\Almacen;

final class AlmacenTest extends TestCase
{
    private Almacen $almacen;

    public static function nuevo(): Almacen
    {
        $pdo = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $almacen = new Almacen($pdo);
        $almacen->crearTablas();
        return $almacen;
    }

    public static function envio(array $cambios = []): array
    {
        return $cambios + [
            'fecha' => '2026-11-03 10:00:00', 'idea' => 'Delfines', 'fallo' => '', 'nombre' => 'Lucía',
            'version' => '2.7.0', 'modelo' => '', 'idioma' => 'es', 'condiciones' => '2026-10',
        ];
    }

    protected function setUp(): void
    {
        $this->almacen = self::nuevo();
    }

    public function testCrearTablasDosVecesNoFalla(): void
    {
        $this->almacen->crearTablas();
        self::assertSame([], $this->almacen->totales('v1'));
    }

    public function testVotarSuma(): void
    {
        $this->almacen->votar('v1', 'a');
        $this->almacen->votar('v1', 'a');
        $this->almacen->votar('v1', 'b');
        $this->almacen->votar('v2', 'a');
        self::assertSame(['a' => 2, 'b' => 1], $this->almacen->totales('v1'));
    }

    public function testCambiarElVotoRestaAlAnterior(): void
    {
        $this->almacen->votar('v1', 'a');
        $this->almacen->votar('v1', 'b', 'a');
        self::assertSame(['a' => 0, 'b' => 1], $this->almacen->totales('v1'));
    }

    public function testRestarNoBajaDeCero(): void
    {
        $this->almacen->votar('v1', 'b', 'a');
        $this->almacen->votar('v1', 'b', 'a');
        self::assertSame(['b' => 2], $this->almacen->totales('v1'));
    }

    public function testGuardaTextosRarosTalCual(): void
    {
        $idea = "🦒 ¡más jirafas! <script>alert('x')</script> \"; DROP TABLE envios; --";
        $id = $this->almacen->guardarEnvio(self::envio(['idea' => $idea]));
        self::assertSame(1, $id);
        $fila = $this->almacen->envios('2026-01-01 00:00:00')[0];
        self::assertSame($idea, $fila['idea']);
        self::assertSame('Lucía', $fila['nombre']);
        self::assertSame('2026-10', $fila['condiciones']);
    }

    public function testEnviosDelDia(): void
    {
        $this->almacen->guardarEnvio(self::envio(['fecha' => '2026-11-03 00:00:01']));
        $this->almacen->guardarEnvio(self::envio(['fecha' => '2026-11-03 23:59:59']));
        $this->almacen->guardarEnvio(self::envio(['fecha' => '2026-11-04 00:00:00']));
        self::assertSame(2, $this->almacen->enviosDelDia('2026-11-03'));
        self::assertSame(0, $this->almacen->enviosDelDia('2026-11-05'));
    }

    public function testContadorDeIdeas(): void
    {
        self::assertSame(0, $this->almacen->contarIdeas());
        $this->almacen->sumarIdea();
        $this->almacen->sumarIdea();
        self::assertSame(2, $this->almacen->contarIdeas());
    }

    public function testPurgarBorraSoloLoViejoYNoTocaElContador(): void
    {
        $this->almacen->guardarEnvio(self::envio(['fecha' => '2026-08-01 10:00:00']));
        $this->almacen->guardarEnvio(self::envio(['fecha' => '2026-11-01 10:00:00']));
        $this->almacen->sumarIdea();
        self::assertSame(1, $this->almacen->purgar('2026-08-05 00:00:00'));
        self::assertCount(1, $this->almacen->envios('2026-01-01 00:00:00'));
        self::assertSame(1, $this->almacen->contarIdeas());
    }

    public function testEnviosDesdeUnaFechaDelMasNuevoAlMasViejo(): void
    {
        $this->almacen->guardarEnvio(self::envio(['fecha' => '2026-11-01 10:00:00', 'idea' => 'vieja']));
        $this->almacen->guardarEnvio(self::envio(['fecha' => '2026-11-03 10:00:00', 'idea' => 'nueva']));
        $this->almacen->guardarEnvio(self::envio(['fecha' => '2026-10-01 10:00:00', 'idea' => 'fuera']));
        self::assertSame(['nueva', 'vieja'], array_column($this->almacen->envios('2026-11-01 00:00:00'), 'idea'));
    }
}
```

- [ ] **Step 2: Comprobar que fallan**

Run: `cd server && php herramientas/phpunit.phar --filter AlmacenTest`
Expected: FAIL, `Class "Zoo\Almacen" not found`.

- [ ] **Step 3: Implementación**

`server/app/src/Almacen.php`:

```php
<?php
declare(strict_types=1);

namespace Zoo;

use PDO;

/** Todo el SQL del servidor. Solo consultas preparadas; vale igual en MySQL y en SQLite (pruebas). */
final class Almacen
{
    private const CAMPOS = ['fecha', 'idea', 'fallo', 'nombre', 'version', 'modelo', 'idioma', 'condiciones'];

    public function __construct(private readonly PDO $pdo)
    {
    }

    public function crearTablas(): void
    {
        $sqlite = $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
        $id = $sqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT AUTO_INCREMENT PRIMARY KEY';
        $fin = $sqlite ? '' : ' DEFAULT CHARSET=utf8mb4';
        $this->pdo->exec("CREATE TABLE IF NOT EXISTS votos (votacion VARCHAR(40) NOT NULL, opcion VARCHAR(40) NOT NULL, total INT NOT NULL DEFAULT 0, PRIMARY KEY (votacion, opcion))$fin");
        $this->pdo->exec("CREATE TABLE IF NOT EXISTS envios (id $id, fecha VARCHAR(19) NOT NULL, idea VARCHAR(300) NOT NULL, fallo VARCHAR(500) NOT NULL, nombre VARCHAR(15) NOT NULL, version VARCHAR(20) NOT NULL, modelo VARCHAR(60) NOT NULL, idioma VARCHAR(2) NOT NULL, condiciones VARCHAR(10) NOT NULL)$fin");
        $this->pdo->exec("CREATE TABLE IF NOT EXISTS contadores (nombre VARCHAR(20) NOT NULL PRIMARY KEY, valor INT NOT NULL DEFAULT 0)$fin");
    }

    public function votar(string $votacion, string $opcion, ?string $anterior = null): void
    {
        $this->pdo->beginTransaction();
        try {
            $suma = $this->pdo->prepare('UPDATE votos SET total = total + 1 WHERE votacion = ? AND opcion = ?');
            $suma->execute([$votacion, $opcion]);
            if ($suma->rowCount() === 0) {
                $this->pdo->prepare('INSERT INTO votos (votacion, opcion, total) VALUES (?, ?, 1)')->execute([$votacion, $opcion]);
            }
            if ($anterior !== null) {
                $this->pdo->prepare('UPDATE votos SET total = total - 1 WHERE votacion = ? AND opcion = ? AND total > 0')->execute([$votacion, $anterior]);
            }
            $this->pdo->commit();
        } catch (\Throwable $error) {
            $this->pdo->rollBack();
            throw $error;
        }
    }

    /** @return array<string, int> */
    public function totales(string $votacion): array
    {
        $consulta = $this->pdo->prepare('SELECT opcion, total FROM votos WHERE votacion = ? ORDER BY opcion');
        $consulta->execute([$votacion]);
        $totales = [];
        foreach ($consulta->fetchAll(PDO::FETCH_ASSOC) as $fila) {
            $totales[(string) $fila['opcion']] = (int) $fila['total'];
        }
        return $totales;
    }

    public function guardarEnvio(array $envio): int
    {
        $valores = array_map(static fn (string $campo): string => (string) $envio[$campo], self::CAMPOS);
        $this->pdo->prepare('INSERT INTO envios (fecha, idea, fallo, nombre, version, modelo, idioma, condiciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')->execute($valores);
        return (int) $this->pdo->lastInsertId();
    }

    public function enviosDelDia(string $dia): int
    {
        $consulta = $this->pdo->prepare('SELECT COUNT(*) FROM envios WHERE fecha >= ? AND fecha <= ?');
        $consulta->execute([$dia . ' 00:00:00', $dia . ' 23:59:59']);
        return (int) $consulta->fetchColumn();
    }

    public function sumarIdea(): void
    {
        $suma = $this->pdo->prepare('UPDATE contadores SET valor = valor + 1 WHERE nombre = ?');
        $suma->execute(['ideas']);
        if ($suma->rowCount() === 0) {
            $this->pdo->prepare('INSERT INTO contadores (nombre, valor) VALUES (?, 1)')->execute(['ideas']);
        }
    }

    public function contarIdeas(): int
    {
        $consulta = $this->pdo->prepare('SELECT valor FROM contadores WHERE nombre = ?');
        $consulta->execute(['ideas']);
        return (int) $consulta->fetchColumn();
    }

    public function purgar(string $antesDe): int
    {
        $borrado = $this->pdo->prepare('DELETE FROM envios WHERE fecha < ?');
        $borrado->execute([$antesDe]);
        return $borrado->rowCount();
    }

    /** @return list<array<string, mixed>> */
    public function envios(string $desde): array
    {
        $consulta = $this->pdo->prepare('SELECT id, fecha, idea, fallo, nombre, version, modelo, idioma, condiciones FROM envios WHERE fecha >= ? ORDER BY fecha DESC, id DESC');
        $consulta->execute([$desde]);
        return $consulta->fetchAll(PDO::FETCH_ASSOC);
    }
}
```

`server/app/esquema.sql` (para crear las tablas a mano en phpMyAdmin; es lo mismo que hace `crearTablas()`):

```sql
CREATE TABLE IF NOT EXISTS votos (
  votacion VARCHAR(40) NOT NULL,
  opcion VARCHAR(40) NOT NULL,
  total INT NOT NULL DEFAULT 0,
  PRIMARY KEY (votacion, opcion)
) DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS envios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha VARCHAR(19) NOT NULL,
  idea VARCHAR(300) NOT NULL,
  fallo VARCHAR(500) NOT NULL,
  nombre VARCHAR(15) NOT NULL,
  version VARCHAR(20) NOT NULL,
  modelo VARCHAR(60) NOT NULL,
  idioma VARCHAR(2) NOT NULL,
  condiciones VARCHAR(10) NOT NULL
) DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS contadores (
  nombre VARCHAR(20) NOT NULL PRIMARY KEY,
  valor INT NOT NULL DEFAULT 0
) DEFAULT CHARSET=utf8mb4;
```

- [ ] **Step 4: Comprobar que pasan**

Run: `cd server && php herramientas/phpunit.phar --filter AlmacenTest`
Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
git add server/app/src/Almacen.php server/app/esquema.sql server/tests/AlmacenTest.php
git commit -m "feat: almacén de votos, envíos y contador de ideas"
```

---

### Task 4: Reloj, arranque y respuesta HTTP

**Files:**
- Create: `server/app/src/Reloj.php`, `server/app/src/Servicio.php`, `server/app/src/Http.php`, `server/app/config.example.php`, `server/public/ruta.php`, `server/tests/RelojTest.php`, `server/tests/ServicioTest.php`

**Interfaces:**
- Consumes: `Zoo\Almacen`.
- Produces:
  - `Zoo\Reloj::hoy(\DateTimeImmutable $ahora): string` — día en España, `AAAA-MM-DD`.
  - `Zoo\Reloj::utc(\DateTimeImmutable $ahora): string` — `AAAA-MM-DD HH:MM:SS` en UTC.
  - `Zoo\Servicio::config(string $dirApp): array` — lee `config.php`; lanza `\RuntimeException` si falta o está incompleto. Claves: `db_dsn, db_usuario, db_clave, n8n_url, n8n_clave, clave_exportar, condiciones, contenido`.
  - `Zoo\Servicio::almacen(array $config): Almacen`
  - `Zoo\Servicio::atender(callable $accion): array` — ejecuta `$accion(): array{0:int,1:array}`; cualquier excepción se convierte en `[503, ['error' => 'no-disponible']]`.
  - `Zoo\Http::cuerpoJson(): mixed` — cuerpo decodificado, o `null` si pasa de 8192 bytes o no es JSON.
  - `Zoo\Http::responder(int $estado, array $cuerpo, int $cacheSegundos = 0): void`
  - `Zoo\Http::metodo(string ...$admitidos): bool` — responde el `OPTIONS` y los métodos no admitidos; devuelve `true` si hay que seguir.
  - Códigos de error del API (texto fijo en `error`): `no-disponible`, `peticion`, `cerrada`, `aceptacion`, `vacio`, `metodo`.

- [ ] **Step 1: Escribir las pruebas que fallan**

`server/tests/RelojTest.php`:

```php
<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use Zoo\Reloj;

final class RelojTest extends TestCase
{
    public function testALas2330UtcYaEsElDiaSiguienteEnEspana(): void
    {
        $ahora = new DateTimeImmutable('2026-10-31 23:30:00', new DateTimeZone('UTC'));
        self::assertSame('2026-11-01', Reloj::hoy($ahora));
        self::assertSame('2026-10-31 23:30:00', Reloj::utc($ahora));
    }

    public function testEnVeranoEspanaVaDosHorasPorDelante(): void
    {
        $ahora = new DateTimeImmutable('2026-07-10 22:30:00', new DateTimeZone('UTC'));
        self::assertSame('2026-07-11', Reloj::hoy($ahora));
    }

    public function testNoDependeDeLaZonaDelServidor(): void
    {
        $ahora = new DateTimeImmutable('2026-11-01 08:00:00', new DateTimeZone('America/New_York'));
        self::assertSame('2026-11-01', Reloj::hoy($ahora));
        self::assertSame('2026-11-01 13:00:00', Reloj::utc($ahora));
    }
}
```

`server/tests/ServicioTest.php`:

```php
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
            ['db_dsn', 'db_usuario', 'db_clave', 'n8n_url', 'n8n_clave', 'clave_exportar', 'condiciones', 'contenido'],
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
```

- [ ] **Step 2: Comprobar que fallan**

Run: `cd server && php herramientas/phpunit.phar --filter "RelojTest|ServicioTest"`
Expected: FAIL, clases no encontradas.

- [ ] **Step 3: Implementación**

`server/app/src/Reloj.php`:

```php
<?php
declare(strict_types=1);

namespace Zoo;

use DateTimeImmutable;
use DateTimeZone;

final class Reloj
{
    /** El día en España: las votaciones abren y cierran con el calendario de aquí. */
    public static function hoy(DateTimeImmutable $ahora): string
    {
        return $ahora->setTimezone(new DateTimeZone('Europe/Madrid'))->format('Y-m-d');
    }

    public static function utc(DateTimeImmutable $ahora): string
    {
        return $ahora->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    }
}
```

`server/app/config.example.php`:

```php
<?php
// Copiar a config.php (ignorado por git) y rellenar. Nunca subir el archivo relleno.
return [
    'db_dsn' => 'mysql:host=localhost;dbname=NOMBRE;charset=utf8mb4',
    'db_usuario' => '',
    'db_clave' => '',
    // Webhook de n8n que avisa de cada envío. Vacío: no se avisa.
    'n8n_url' => '',
    // Clave compartida con n8n; viaja en la cabecera X-Zoo-Clave.
    'n8n_clave' => '',
    // Clave de tools/comunidad/envios.mjs. Mínimo 32 caracteres. Vacía: exportar.php responde 404.
    'clave_exportar' => '',
    // Versión vigente de las condiciones de las ideas.
    'condiciones' => '2026-10',
    // Ruta de comunidad.json. Vacía: app/datos/comunidad.json.
    'contenido' => '',
];
```

`server/app/src/Servicio.php`:

```php
<?php
declare(strict_types=1);

namespace Zoo;

use PDO;
use RuntimeException;

/** Arranque común de los puntos de entrada. Si algo falla, fuera solo se ve «no disponible». */
final class Servicio
{
    private const CLAVES = ['db_dsn', 'db_usuario', 'db_clave', 'n8n_url', 'n8n_clave', 'clave_exportar', 'condiciones', 'contenido'];

    public static function config(string $dirApp): array
    {
        $archivo = $dirApp . '/config.php';
        if (!is_file($archivo)) {
            throw new RuntimeException('Falta config.php');
        }
        $config = require $archivo;
        if (!is_array($config)) {
            throw new RuntimeException('config.php no devuelve una lista');
        }
        foreach (self::CLAVES as $clave) {
            if (!is_string($config[$clave] ?? null)) {
                throw new RuntimeException("config.php: falta $clave");
            }
        }
        if ($config['contenido'] === '') {
            $config['contenido'] = $dirApp . '/datos/comunidad.json';
        }
        return $config;
    }

    public static function almacen(array $config): Almacen
    {
        $pdo = new PDO($config['db_dsn'], $config['db_usuario'], $config['db_clave'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        return new Almacen($pdo);
    }

    /**
     * @param callable(): array{0: int, 1: array} $accion
     * @return array{0: int, 1: array}
     */
    public static function atender(callable $accion): array
    {
        try {
            return $accion();
        } catch (\Throwable $error) {
            // El detalle va al registro del servidor, que no es público. Fuera, un mensaje fijo.
            error_log('zoo-comunidad: ' . $error::class . ': ' . $error->getMessage());
            return [503, ['error' => 'no-disponible']];
        }
    }
}
```

`server/app/src/Http.php`:

```php
<?php
declare(strict_types=1);

namespace Zoo;

/** Entrada y salida HTTP. Sin lógica: por eso no tiene pruebas propias y se comprueba a mano (tarea 9). */
final class Http
{
    public const MAX_BYTES = 8192;

    /** Responde `OPTIONS` y los métodos no admitidos. `true`: hay que seguir. */
    public static function metodo(string ...$admitidos): bool
    {
        $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        if ($metodo === 'OPTIONS') {
            self::cabeceras(0);
            header('Access-Control-Allow-Methods: ' . implode(', ', $admitidos));
            header('Access-Control-Allow-Headers: Content-Type');
            http_response_code(204);
            return false;
        }
        if (!in_array($metodo, $admitidos, true)) {
            self::responder(405, ['error' => 'metodo']);
            return false;
        }
        return true;
    }

    /** El cuerpo como JSON, venga con el tipo que venga (el juego lo manda como texto para evitar la consulta previa). */
    public static function cuerpoJson(): mixed
    {
        if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > self::MAX_BYTES) {
            return null;
        }
        $cuerpo = (string) file_get_contents('php://input', false, null, 0, self::MAX_BYTES + 1);
        if ($cuerpo === '' || strlen($cuerpo) > self::MAX_BYTES) {
            return null;
        }
        try {
            return json_decode($cuerpo, true, 8, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }
    }

    public static function responder(int $estado, array $cuerpo, int $cacheSegundos = 0): void
    {
        self::cabeceras($cacheSegundos);
        http_response_code($estado);
        echo json_encode($cuerpo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    private static function cabeceras(int $cacheSegundos): void
    {
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: ' . ($cacheSegundos > 0 ? "public, max-age=$cacheSegundos" : 'no-store'));
    }
}
```

`server/public/ruta.php`:

```php
<?php
// Dónde está la carpeta app/ (fuera de la carpeta pública). En el VPS se cambia esta línea si hace falta.
return __DIR__ . '/../app';
```

- [ ] **Step 4: Comprobar que pasan**

Run: `cd server && php herramientas/phpunit.phar`
Expected: `OK`, todas las pruebas hasta aquí.

- [ ] **Step 5: Commit**

```bash
git add server/app/src/Reloj.php server/app/src/Servicio.php server/app/src/Http.php server/app/config.example.php server/public/ruta.php server/tests/RelojTest.php server/tests/ServicioTest.php
git commit -m "feat: reloj, arranque y respuesta HTTP del servidor de comunidad"
```

---

### Task 5: `estado.php`

**Files:**
- Create: `server/app/src/Estado.php`, `server/public/estado.php`, `server/tests/EstadoTest.php`

**Interfaces:**
- Consumes: `Contenido::validar`, `Contenido::abierta`, `Almacen::totales`, `Almacen::contarIdeas`.
- Produces:
  - `Zoo\Estado::porcentajes(array $totales, array $ids): array` — `[id => 0..100]`, múltiplos de 5.
  - `Zoo\Estado::construir(array $contenido, Almacen $almacen, string $hoy): array` — respuesta de `GET estado.php`:

```json
{
  "hoy": "2026-11-03",
  "ideas": 127,
  "votacion": {
    "id": "2026-11-a", "abre": "2026-11-01", "cierra": "2026-11-15", "ganadora": null,
    "abierta": true,
    "opciones": [{ "id": "delfines", "titulo": { "es": "Delfines", "en": "Dolphins" }, "dibujo": "delfines.png", "ideaDe": "Lucía" }],
    "reparto": { "delfines": 65, "koalas": 35 }
  },
  "muro": [{ "titulo": { "es": "Pingüinos", "en": "Penguins" }, "dibujo": "pinguinos.png", "ideaDe": "Adrián", "estado": "hecha", "recinto": "pinguino" }]
}
```

  `votacion` es `null` si no hay. El juego (plan 2) depende de esta forma exacta.

- [ ] **Step 1: Escribir las pruebas que fallan**

`server/tests/EstadoTest.php`:

```php
<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use Zoo\Contenido;
use Zoo\Estado;

final class EstadoTest extends TestCase
{
    public function testPorcentajesRedondeadosACinco(): void
    {
        self::assertSame(['a' => 65, 'b' => 35], Estado::porcentajes(['a' => 2, 'b' => 1], ['a', 'b']));
        self::assertSame(['a' => 100, 'b' => 0], Estado::porcentajes(['a' => 7], ['a', 'b']));
    }

    public function testSinVotosTodoACero(): void
    {
        self::assertSame(['a' => 0, 'b' => 0], Estado::porcentajes([], ['a', 'b']));
    }

    public function testIgnoraOpcionesQueYaNoExistenYTotalesNegativos(): void
    {
        self::assertSame(['a' => 100, 'b' => 0], Estado::porcentajes(['a' => 4, 'b' => -3, 'vieja' => 50], ['a', 'b']));
    }

    public function testConstruirConVotacionAbierta(): void
    {
        $almacen = AlmacenTest::nuevo();
        $almacen->votar('2026-11-a', 'delfines');
        $almacen->votar('2026-11-a', 'delfines');
        $almacen->votar('2026-11-a', 'koalas');
        $almacen->sumarIdea();
        $estado = Estado::construir(Contenido::validar(ContenidoTest::ejemplo()), $almacen, '2026-11-03');
        self::assertSame('2026-11-03', $estado['hoy']);
        self::assertSame(1, $estado['ideas']);
        self::assertTrue($estado['votacion']['abierta']);
        self::assertSame(['delfines' => 65, 'koalas' => 35], $estado['votacion']['reparto']);
        self::assertCount(1, $estado['muro']);
    }

    public function testNoEnsenaTotales(): void
    {
        $almacen = AlmacenTest::nuevo();
        $almacen->votar('2026-11-a', 'delfines');
        $json = json_encode(Estado::construir(Contenido::validar(ContenidoTest::ejemplo()), $almacen, '2026-11-03'));
        self::assertStringNotContainsString('total', (string) $json);
    }

    public function testConstruirCerradaYSinVotacion(): void
    {
        $almacen = AlmacenTest::nuevo();
        $cerrada = Estado::construir(Contenido::validar(ContenidoTest::ejemplo()), $almacen, '2026-11-16');
        self::assertFalse($cerrada['votacion']['abierta']);
        $vacio = Estado::construir(Contenido::VACIO, $almacen, '2026-11-16');
        self::assertNull($vacio['votacion']);
        self::assertSame([], $vacio['muro']);
        self::assertSame(0, $vacio['ideas']);
    }
}
```

- [ ] **Step 2: Comprobar que fallan**

Run: `cd server && php herramientas/phpunit.phar --filter EstadoTest`
Expected: FAIL, `Class "Zoo\Estado" not found`.

- [ ] **Step 3: Implementación**

`server/app/src/Estado.php`:

```php
<?php
declare(strict_types=1);

namespace Zoo;

/** Lo que lee el juego: la votación con su reparto, el muro y el número de ideas. */
final class Estado
{
    /**
     * Reparto en porcentajes redondeados a 5. No se dan totales: con pocos votos no se nota.
     *
     * @param array<string, int> $totales
     * @param list<string> $ids
     * @return array<string, int>
     */
    public static function porcentajes(array $totales, array $ids): array
    {
        $votos = [];
        foreach ($ids as $id) {
            $votos[$id] = max(0, (int) ($totales[$id] ?? 0));
        }
        $suma = array_sum($votos);
        return array_map(static fn (int $n): int => $suma === 0 ? 0 : (int) (round($n * 100 / $suma / 5) * 5), $votos);
    }

    public static function construir(array $contenido, Almacen $almacen, string $hoy): array
    {
        $votacion = $contenido['votacion'];
        if ($votacion !== null) {
            $votacion['abierta'] = Contenido::abierta($votacion, $hoy);
            $votacion['reparto'] = self::porcentajes($almacen->totales($votacion['id']), array_column($votacion['opciones'], 'id'));
        }
        return ['hoy' => $hoy, 'ideas' => $almacen->contarIdeas(), 'votacion' => $votacion, 'muro' => $contenido['muro']];
    }
}
```

`server/public/estado.php`:

```php
<?php
declare(strict_types=1);

use Zoo\Contenido;
use Zoo\Estado;
use Zoo\Http;
use Zoo\Reloj;
use Zoo\Servicio;

$app = require __DIR__ . '/ruta.php';
require $app . '/autoload.php';

if (!Http::metodo('GET')) {
    return;
}
[$estado, $cuerpo] = Servicio::atender(static function () use ($app): array {
    $config = Servicio::config($app);
    $hoy = Reloj::hoy(new DateTimeImmutable('now'));
    return [200, Estado::construir(Contenido::leer($config['contenido']), Servicio::almacen($config), $hoy)];
});
Http::responder($estado, $cuerpo, $estado === 200 ? 60 : 0);
```

- [ ] **Step 4: Comprobar que pasan**

Run: `cd server && php herramientas/phpunit.phar --filter EstadoTest`
Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
git add server/app/src/Estado.php server/public/estado.php server/tests/EstadoTest.php
git commit -m "feat: estado de la comunidad para el juego"
```

---

### Task 6: `voto.php`

**Files:**
- Create: `server/app/src/Voto.php`, `server/public/voto.php`, `server/tests/VotoTest.php`

**Interfaces:**
- Consumes: `Contenido::ID`, `Contenido::abierta`, `Almacen::votar`, `Estado::porcentajes`, `Almacen::totales`.
- Produces: `Zoo\Voto::procesar(mixed $entrada, array $contenido, Almacen $almacen, string $hoy): array{0:int,1:array}`
  - Petición: `{ "votacion": "2026-11-a", "opcion": "koalas", "anterior": "delfines" }` (`anterior` opcional).
  - `[200, ['ok' => true, 'reparto' => [...]]]` si se cuenta (o si `anterior` es la misma opción: no cambia nada).
  - `[400, ['error' => 'peticion']]` si falta algo, no es texto, o la opción o la anterior no existen.
  - `[409, ['error' => 'cerrada']]` si no hay votación, no es la vigente o no está abierta.

- [ ] **Step 1: Escribir las pruebas que fallan**

`server/tests/VotoTest.php`:

```php
<?php
declare(strict_types=1);

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Zoo\Almacen;
use Zoo\Contenido;
use Zoo\Voto;

final class VotoTest extends TestCase
{
    private Almacen $almacen;
    private array $contenido;

    protected function setUp(): void
    {
        $this->almacen = AlmacenTest::nuevo();
        $this->contenido = Contenido::validar(ContenidoTest::ejemplo());
    }

    private function votar(mixed $entrada, string $hoy = '2026-11-03'): array
    {
        return Voto::procesar($entrada, $this->contenido, $this->almacen, $hoy);
    }

    public function testVotoCorrecto(): void
    {
        [$estado, $cuerpo] = $this->votar(['votacion' => '2026-11-a', 'opcion' => 'koalas']);
        self::assertSame(200, $estado);
        self::assertSame(['ok' => true, 'reparto' => ['delfines' => 0, 'koalas' => 100]], $cuerpo);
        self::assertSame(['koalas' => 1], $this->almacen->totales('2026-11-a'));
    }

    public function testCambioDeVoto(): void
    {
        $this->votar(['votacion' => '2026-11-a', 'opcion' => 'koalas']);
        [$estado] = $this->votar(['votacion' => '2026-11-a', 'opcion' => 'delfines', 'anterior' => 'koalas']);
        self::assertSame(200, $estado);
        self::assertSame(['delfines' => 1, 'koalas' => 0], $this->almacen->totales('2026-11-a'));
    }

    public function testCambiarALaMismaOpcionNoSuma(): void
    {
        $this->votar(['votacion' => '2026-11-a', 'opcion' => 'koalas']);
        [$estado] = $this->votar(['votacion' => '2026-11-a', 'opcion' => 'koalas', 'anterior' => 'koalas']);
        self::assertSame(200, $estado);
        self::assertSame(['koalas' => 1], $this->almacen->totales('2026-11-a'));
    }

    /** @return iterable<string, array{mixed}> */
    public static function malas(): iterable
    {
        yield 'nada' => [null];
        yield 'texto' => ['koalas'];
        yield 'sin opcion' => [['votacion' => '2026-11-a']];
        yield 'opcion lista' => [['votacion' => '2026-11-a', 'opcion' => ['koalas']]];
        yield 'opcion inexistente' => [['votacion' => '2026-11-a', 'opcion' => 'leones']];
        yield 'opcion con sql' => [['votacion' => '2026-11-a', 'opcion' => "koalas'; DROP TABLE votos; --"]];
        yield 'anterior inexistente' => [['votacion' => '2026-11-a', 'opcion' => 'koalas', 'anterior' => 'leones']];
        yield 'anterior numero' => [['votacion' => '2026-11-a', 'opcion' => 'koalas', 'anterior' => 3]];
    }

    #[DataProvider('malas')]
    public function testPeticionMala(mixed $entrada): void
    {
        self::assertSame([400, ['error' => 'peticion']], $this->votar($entrada));
        self::assertSame([], $this->almacen->totales('2026-11-a'));
    }

    public function testVotacionCerradaODistinta(): void
    {
        $voto = ['votacion' => '2026-11-a', 'opcion' => 'koalas'];
        self::assertSame([409, ['error' => 'cerrada']], $this->votar($voto, '2026-11-16'));
        self::assertSame([409, ['error' => 'cerrada']], $this->votar($voto, '2026-10-31'));
        self::assertSame([409, ['error' => 'cerrada']], $this->votar(['votacion' => '2026-10-z', 'opcion' => 'koalas']));
        $this->contenido = Contenido::VACIO;
        self::assertSame([409, ['error' => 'cerrada']], $this->votar($voto));
        self::assertSame([], $this->almacen->totales('2026-11-a'));
    }
}
```

- [ ] **Step 2: Comprobar que fallan**

Run: `cd server && php herramientas/phpunit.phar --filter VotoTest`
Expected: FAIL, `Class "Zoo\Voto" not found`.

- [ ] **Step 3: Implementación**

`server/app/src/Voto.php`:

```php
<?php
declare(strict_types=1);

namespace Zoo;

/**
 * Un voto, o un cambio de voto. El servidor no sabe quién vota ni frena repetidos: que cada aparato
 * vote una vez lo lleva el juego. La ganadora la confirma David al cerrar.
 */
final class Voto
{
    /** @return array{0: int, 1: array} */
    public static function procesar(mixed $entrada, array $contenido, Almacen $almacen, string $hoy): array
    {
        $idVotacion = is_array($entrada) ? ($entrada['votacion'] ?? null) : null;
        $opcion = is_array($entrada) ? ($entrada['opcion'] ?? null) : null;
        $anterior = is_array($entrada) ? ($entrada['anterior'] ?? null) : null;
        if (!self::esId($idVotacion) || !self::esId($opcion) || ($anterior !== null && !self::esId($anterior))) {
            return [400, ['error' => 'peticion']];
        }
        $votacion = $contenido['votacion'];
        if ($votacion === null || $votacion['id'] !== $idVotacion || !Contenido::abierta($votacion, $hoy)) {
            return [409, ['error' => 'cerrada']];
        }
        $ids = array_column($votacion['opciones'], 'id');
        if (!in_array($opcion, $ids, true) || ($anterior !== null && !in_array($anterior, $ids, true))) {
            return [400, ['error' => 'peticion']];
        }
        if ($anterior !== $opcion) {
            $almacen->votar($idVotacion, $opcion, $anterior);
        }
        return [200, ['ok' => true, 'reparto' => Estado::porcentajes($almacen->totales($idVotacion), $ids)]];
    }

    private static function esId(mixed $valor): bool
    {
        return is_string($valor) && preg_match(Contenido::ID, $valor) === 1;
    }
}
```

`server/public/voto.php`:

```php
<?php
declare(strict_types=1);

use Zoo\Contenido;
use Zoo\Http;
use Zoo\Reloj;
use Zoo\Servicio;
use Zoo\Voto;

$app = require __DIR__ . '/ruta.php';
require $app . '/autoload.php';

if (!Http::metodo('POST')) {
    return;
}
$entrada = Http::cuerpoJson();
Http::responder(...Servicio::atender(static function () use ($app, $entrada): array {
    $config = Servicio::config($app);
    $hoy = Reloj::hoy(new DateTimeImmutable('now'));
    return Voto::procesar($entrada, Contenido::leer($config['contenido']), Servicio::almacen($config), $hoy);
}));
```

- [ ] **Step 4: Comprobar que pasan**

Run: `cd server && php herramientas/phpunit.phar --filter VotoTest`
Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
git add server/app/src/Voto.php server/public/voto.php server/tests/VotoTest.php
git commit -m "feat: votar y cambiar el voto"
```

---

### Task 7: `envio.php` y el aviso a n8n

**Files:**
- Create: `server/app/src/Avisador.php`, `server/app/src/AvisadorN8n.php`, `server/app/src/Envio.php`, `server/public/envio.php`, `server/tests/EnvioTest.php`

**Interfaces:**
- Consumes: `Texto::limpio`, `Almacen::{guardarEnvio, enviosDelDia, sumarIdea, purgar}`.
- Produces:
  - `interface Zoo\Avisador { public function avisar(array $envio): void; }` — nunca lanza.
  - `Zoo\AvisadorN8n::__construct(string $url, string $clave)`
  - `Zoo\Envio::TOPE_DIARIO = 300`, `Zoo\Envio::DIAS = 90`
  - `Zoo\Envio::procesar(mixed $entrada, Almacen $almacen, Avisador $avisador, \DateTimeImmutable $ahora, string $condiciones): array{0:int,1:array}`
  - Petición (JSON): `{ "idea": "", "fallo": "", "nombre": "", "version": "", "modelo": "", "idioma": "es", "mayor": true, "tutor": false, "condiciones": "2026-10", "web": "" }`. `web` es el campo trampa.
  - `[200, ['ok' => true]]` guardado (o trampa: no se guarda nada).
  - `[400, ['error' => 'peticion']]` texto no válido o demasiado largo.
  - `[400, ['error' => 'vacio']]` sin idea ni fallo.
  - `[400, ['error' => 'aceptacion']]` falta `mayor`, las condiciones no son las vigentes, o hay nombre sin `tutor`.

- [ ] **Step 1: Escribir las pruebas que fallan**

`server/tests/EnvioTest.php`:

```php
<?php
declare(strict_types=1);

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Zoo\Almacen;
use Zoo\Avisador;
use Zoo\Envio;

final class AvisadorFalso implements Avisador
{
    /** @var list<array> */
    public array $avisos = [];

    public function avisar(array $envio): void
    {
        $this->avisos[] = $envio;
    }
}

final class EnvioTest extends TestCase
{
    private Almacen $almacen;
    private AvisadorFalso $avisador;

    protected function setUp(): void
    {
        $this->almacen = AlmacenTest::nuevo();
        $this->avisador = new AvisadorFalso();
    }

    private static function formulario(array $cambios = []): array
    {
        return $cambios + [
            'idea' => 'Que haya delfines', 'fallo' => '', 'nombre' => '', 'version' => '2.7.0', 'modelo' => '',
            'idioma' => 'es', 'mayor' => true, 'tutor' => false, 'condiciones' => '2026-10', 'web' => '',
        ];
    }

    private function enviar(mixed $entrada, string $cuando = '2026-11-03 10:00:00'): array
    {
        $ahora = new DateTimeImmutable($cuando, new DateTimeZone('UTC'));
        return Envio::procesar($entrada, $this->almacen, $this->avisador, $ahora, '2026-10');
    }

    private function guardados(): array
    {
        return $this->almacen->envios('2000-01-01 00:00:00');
    }

    public function testIdeaSola(): void
    {
        self::assertSame([200, ['ok' => true]], $this->enviar(self::formulario()));
        $fila = $this->guardados()[0];
        self::assertSame('Que haya delfines', $fila['idea']);
        self::assertSame('2026-11-03 10:00:00', $fila['fecha']);
        self::assertSame('2026-10', $fila['condiciones']);
        self::assertSame(1, $this->almacen->contarIdeas());
        self::assertCount(1, $this->avisador->avisos);
    }

    public function testFalloSoloNoSumaIdeas(): void
    {
        self::assertSame(200, $this->enviar(self::formulario(['idea' => '', 'fallo' => "Se queda en negro\nal abrir la tienda", 'modelo' => 'Pixel 7']))[0]);
        self::assertSame("Se queda en negro\nal abrir la tienda", $this->guardados()[0]['fallo']);
        self::assertSame(0, $this->almacen->contarIdeas());
    }

    public function testIdeaYFalloALaVez(): void
    {
        self::assertSame(200, $this->enviar(self::formulario(['fallo' => 'El panda no come']))[0]);
        self::assertSame(1, $this->almacen->contarIdeas());
        self::assertCount(1, $this->guardados());
    }

    public function testVacio(): void
    {
        self::assertSame([400, ['error' => 'vacio']], $this->enviar(self::formulario(['idea' => '  ', 'fallo' => ''])));
        self::assertSame([], $this->guardados());
    }

    public function testNombreConTutor(): void
    {
        self::assertSame(200, $this->enviar(self::formulario(['nombre' => 'Lucía', 'tutor' => true]))[0]);
        self::assertSame('Lucía', $this->guardados()[0]['nombre']);
    }

    /** @return iterable<string, array{array}> */
    public static function sinAceptacion(): iterable
    {
        yield 'sin casilla de mayor' => [['mayor' => false]];
        yield 'mayor como texto' => [['mayor' => 'true']];
        yield 'mayor ausente' => [['mayor' => null]];
        yield 'condiciones viejas' => [['condiciones' => '2025-01']];
        yield 'condiciones ausentes' => [['condiciones' => null]];
        yield 'nombre sin tutor' => [['nombre' => 'Lucía', 'tutor' => false]];
        yield 'nombre con tutor como texto' => [['nombre' => 'Lucía', 'tutor' => 'si']];
    }

    #[DataProvider('sinAceptacion')]
    public function testSinAceptacionSeRechazaAunqueSeSaltenLaPagina(array $cambios): void
    {
        self::assertSame([400, ['error' => 'aceptacion']], $this->enviar(self::formulario($cambios)));
        self::assertSame([], $this->guardados());
        self::assertSame(0, $this->almacen->contarIdeas());
        self::assertSame([], $this->avisador->avisos);
    }

    /** @return iterable<string, array{mixed}> */
    public static function malas(): iterable
    {
        yield 'nada' => [null];
        yield 'texto' => ['hola'];
        yield 'idea larga' => [self::formulario(['idea' => str_repeat('a', 301)])];
        yield 'fallo largo' => [self::formulario(['fallo' => str_repeat('a', 501)])];
        yield 'nombre largo' => [self::formulario(['nombre' => str_repeat('a', 16), 'tutor' => true])];
        yield 'idea lista' => [self::formulario(['idea' => ['a']])];
        yield 'idea con nulo' => [self::formulario(['idea' => "a\x00b"])];
        yield 'idea utf8 roto' => [self::formulario(['idea' => "\xC3\x28"])];
        yield 'nombre con salto' => [self::formulario(['nombre' => "Lu\ncía", 'tutor' => true])];
        yield 'version rara' => [self::formulario(['version' => '<b>2</b>'])];
        yield 'idioma inventado' => [self::formulario(['idioma' => 'fr'])];
        yield 'trampa lista' => [self::formulario(['web' => ['x']])];
    }

    #[DataProvider('malas')]
    public function testPeticionMala(mixed $entrada): void
    {
        self::assertSame([400, ['error' => 'peticion']], $this->enviar($entrada));
        self::assertSame([], $this->guardados());
    }

    public function testTextosRarosSeGuardanTalCual(): void
    {
        $idea = "🦒 <script>alert('x')</script> \"; DROP TABLE envios; --";
        self::assertSame(200, $this->enviar(self::formulario(['idea' => $idea]))[0]);
        self::assertSame($idea, $this->guardados()[0]['idea']);
    }

    public function testLaRespuestaNuncaRepiteLoRecibido(): void
    {
        $respuesta = json_encode($this->enviar(self::formulario(['idea' => 'TEXTO-UNICO-123'])));
        self::assertStringNotContainsString('TEXTO-UNICO-123', (string) $respuesta);
    }

    public function testCampoTrampaRellenoNoGuardaNada(): void
    {
        self::assertSame([200, ['ok' => true]], $this->enviar(self::formulario(['web' => 'http://spam.example'])));
        self::assertSame([], $this->guardados());
        self::assertSame(0, $this->almacen->contarIdeas());
        self::assertSame([], $this->avisador->avisos);
    }

    public function testPasadoElTopeSeGuardaPeroNoSeCuentaNiSeAvisa(): void
    {
        for ($i = 0; $i < Envio::TOPE_DIARIO; $i++) {
            $this->almacen->guardarEnvio(AlmacenTest::envio(['fecha' => '2026-11-03 08:00:00']));
        }
        self::assertSame([200, ['ok' => true]], $this->enviar(self::formulario()));
        self::assertCount(Envio::TOPE_DIARIO + 1, $this->guardados());
        self::assertSame(0, $this->almacen->contarIdeas());
        self::assertSame([], $this->avisador->avisos);
    }

    public function testAlDiaSiguienteVuelveAContar(): void
    {
        for ($i = 0; $i < Envio::TOPE_DIARIO; $i++) {
            $this->almacen->guardarEnvio(AlmacenTest::envio(['fecha' => '2026-11-03 08:00:00']));
        }
        $this->enviar(self::formulario(), '2026-11-04 00:00:05');
        self::assertSame(1, $this->almacen->contarIdeas());
        self::assertCount(1, $this->avisador->avisos);
    }

    public function testBorraLoQueTieneMasDeNoventaDias(): void
    {
        $this->almacen->guardarEnvio(AlmacenTest::envio(['fecha' => '2026-08-04 09:59:59', 'idea' => 'vieja']));
        $this->almacen->guardarEnvio(AlmacenTest::envio(['fecha' => '2026-08-05 10:00:00', 'idea' => 'justa']));
        $this->enviar(self::formulario());
        self::assertSame(['Que haya delfines', 'justa'], array_column($this->guardados(), 'idea'));
    }

    public function testElAvisoLlevaLosDatosComoCamposSeparados(): void
    {
        $this->enviar(self::formulario(['nombre' => 'Lucía', 'tutor' => true]));
        self::assertSame(
            ['id' => 1, 'fecha' => '2026-11-03 10:00:00', 'idea' => 'Que haya delfines', 'fallo' => '', 'nombre' => 'Lucía', 'version' => '2.7.0', 'modelo' => '', 'idioma' => 'es'],
            $this->avisador->avisos[0],
        );
    }

    public function testSiElAvisadorLanzaElEnvioSeGuardaIgual(): void
    {
        $roto = new class implements Avisador {
            public function avisar(array $envio): void
            {
                throw new RuntimeException('n8n caído');
            }
        };
        $ahora = new DateTimeImmutable('2026-11-03 10:00:00', new DateTimeZone('UTC'));
        self::assertSame([200, ['ok' => true]], Envio::procesar(self::formulario(), $this->almacen, $roto, $ahora, '2026-10'));
        self::assertCount(1, $this->guardados());
    }
}
```

- [ ] **Step 2: Comprobar que fallan**

Run: `cd server && php herramientas/phpunit.phar --filter EnvioTest`
Expected: FAIL, `Interface "Zoo\Avisador" not found`.

- [ ] **Step 3: Implementación**

`server/app/src/Avisador.php`:

```php
<?php
declare(strict_types=1);

namespace Zoo;

interface Avisador
{
    /** Avisa a David de un envío nuevo. Un fallo aquí nunca impide guardar. */
    public function avisar(array $envio): void;
}
```

`server/app/src/AvisadorN8n.php`:

```php
<?php
declare(strict_types=1);

namespace Zoo;

/** Aviso por webhook. Los datos viajan como JSON, campo a campo: n8n los muestra como texto plano. */
final class AvisadorN8n implements Avisador
{
    public function __construct(private readonly string $url, private readonly string $clave)
    {
    }

    public function avisar(array $envio): void
    {
        if (!str_starts_with($this->url, 'https://')) {
            return;
        }
        $contexto = stream_context_create(['http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\nX-Zoo-Clave: {$this->clave}\r\n",
            'content' => json_encode($envio, JSON_UNESCAPED_UNICODE),
            'timeout' => 3,
            'ignore_errors' => true,
        ]]);
        @file_get_contents($this->url, false, $contexto);
    }
}
```

`server/app/src/Envio.php`:

```php
<?php
declare(strict_types=1);

namespace Zoo;

use DateTimeImmutable;

/** El formulario de ideas y fallos. Todo se comprueba aquí, aunque la página ya lo compruebe. */
final class Envio
{
    public const TOPE_DIARIO = 300;
    public const DIAS = 90;

    /** @return array{0: int, 1: array} */
    public static function procesar(mixed $entrada, Almacen $almacen, Avisador $avisador, DateTimeImmutable $ahora, string $condiciones): array
    {
        if (!is_array($entrada)) {
            return [400, ['error' => 'peticion']];
        }
        $idea = Texto::limpio($entrada['idea'] ?? '', 300, true);
        $fallo = Texto::limpio($entrada['fallo'] ?? '', 500, true);
        $nombre = Texto::limpio($entrada['nombre'] ?? '', 15);
        $version = Texto::limpio($entrada['version'] ?? '', 20);
        $modelo = Texto::limpio($entrada['modelo'] ?? '', 60);
        $trampa = Texto::limpio($entrada['web'] ?? '', 200);
        $idioma = $entrada['idioma'] ?? null;
        if ($idea === null || $fallo === null || $nombre === null || $version === null || $modelo === null || $trampa === null
            || !in_array($idioma, ['es', 'en'], true) || preg_match('/^[0-9A-Za-z. -]*$/', $version) !== 1) {
            return [400, ['error' => 'peticion']];
        }
        // Un robot rellena todos los campos: se le dice que sí y no se guarda nada.
        if ($trampa !== '') {
            return [200, ['ok' => true]];
        }
        if ($idea === '' && $fallo === '') {
            return [400, ['error' => 'vacio']];
        }
        $mayor = ($entrada['mayor'] ?? null) === true;
        $tutor = ($entrada['tutor'] ?? null) === true;
        if (!$mayor || ($entrada['condiciones'] ?? null) !== $condiciones || ($nombre !== '' && !$tutor)) {
            return [400, ['error' => 'aceptacion']];
        }

        $fecha = Reloj::utc($ahora);
        $almacen->purgar(Reloj::utc($ahora->modify('-' . self::DIAS . ' days')));
        $dentroDelTope = $almacen->enviosDelDia(substr($fecha, 0, 10)) < self::TOPE_DIARIO;
        $envio = compact('fecha', 'idea', 'fallo', 'nombre', 'version', 'modelo', 'idioma');
        $id = $almacen->guardarEnvio($envio + ['condiciones' => $condiciones]);
        if ($dentroDelTope) {
            if ($idea !== '') {
                $almacen->sumarIdea();
            }
            try {
                $avisador->avisar(['id' => $id] + $envio);
            } catch (\Throwable) {
                // El aviso es un extra: el envío ya está guardado.
            }
        }
        return [200, ['ok' => true]];
    }
}
```

`server/public/envio.php`:

```php
<?php
declare(strict_types=1);

use Zoo\AvisadorN8n;
use Zoo\Envio;
use Zoo\Http;
use Zoo\Servicio;

$app = require __DIR__ . '/ruta.php';
require $app . '/autoload.php';

if (!Http::metodo('POST')) {
    return;
}
$entrada = Http::cuerpoJson();
Http::responder(...Servicio::atender(static function () use ($app, $entrada): array {
    $config = Servicio::config($app);
    $avisador = new AvisadorN8n($config['n8n_url'], $config['n8n_clave']);
    return Envio::procesar($entrada, Servicio::almacen($config), $avisador, new DateTimeImmutable('now'), $config['condiciones']);
}));
```

- [ ] **Step 4: Comprobar que pasan**

Run: `cd server && php herramientas/phpunit.phar --filter EnvioTest`
Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
git add server/app/src/Avisador.php server/app/src/AvisadorN8n.php server/app/src/Envio.php server/public/envio.php server/tests/EnvioTest.php
git commit -m "feat: recepción de ideas y fallos con aceptación comprobada en el servidor"
```

---

### Task 8: Página de ideas y condiciones

**Files:**
- Create: `server/public/ideas/index.html`, `server/public/ideas/en.html`, `server/public/ideas/ideas.js`, `server/public/ideas/ideas.css`, `server/public/condiciones.html`, `server/public/terms.html`, `server/public/.htaccess`, `server/public/dibujos/.gitkeep`

**Interfaces:**
- Consumes: `POST ../envio.php` (tarea 7) y sus códigos `peticion`, `vacio`, `aceptacion`, `no-disponible`.
- Produces: las direcciones públicas `ideas/` (español), `ideas/en.html`, `condiciones.html`, `terms.html`. La dirección de `ideas/` es la que David mete en el QR. Admite `?v=2.7.0` para rellenar la versión.

Los textos legales de esta tarea son un **borrador que David debe leer y aprobar** antes de publicar. No son asesoramiento legal.

- [ ] **Step 1: Cabeceras de seguridad**

`server/public/.htaccess`:

```apache
Options -Indexes
<IfModule mod_headers.c>
  Header always set Content-Security-Policy "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
  Header always set X-Frame-Options "DENY"
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "no-referrer"
</IfModule>
<Files "ruta.php">
  Require all denied
</Files>
```

Crear `server/public/dibujos/.gitkeep` vacío.

- [ ] **Step 2: Estilos**

`server/public/ideas/ideas.css`:

```css
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; background: #fff8e1; color: #3e2723; font: 17px/1.5 system-ui, sans-serif; }
main { max-width: 640px; margin: 0 auto; padding: 20px 20px 48px; }
h1 { font-size: 28px; margin: 12px 0 4px; }
h2 { font-size: 20px; margin-top: 1.6em; color: #6d4c41; }
label { display: block; font-weight: 600; margin-top: 18px; }
.nota { display: block; font-weight: 400; font-size: 15px; color: #6d4c41; }
textarea, input[type="text"] { width: 100%; margin-top: 6px; padding: 10px; border: 2px solid #6d4c41; border-radius: 8px; background: #fff; font: inherit; }
textarea { min-height: 110px; resize: vertical; }
.casilla { display: flex; gap: 10px; align-items: flex-start; font-weight: 400; }
.casilla input { width: 24px; height: 24px; margin-top: 2px; flex: none; }
button { margin-top: 24px; min-height: 52px; padding: 0 28px; border: 3px solid #1b5e20; border-radius: 26px; background: #43a047; color: #fff; font: inherit; font-weight: 700; }
button:disabled { opacity: .5; }
.aviso { margin-top: 18px; padding: 12px; border-radius: 8px; background: #ffe0b2; }
.aviso.bien { background: #c8e6c9; }
.legal { margin-top: 28px; font-size: 15px; color: #5d4037; }
.trampa { position: absolute; left: -9999px; }
[hidden] { display: none !important; }
```

- [ ] **Step 3: Página en español**

`server/public/ideas/index.html`:

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Ideas y fallos · Zoo Esponji</title>
  <link rel="stylesheet" href="ideas.css">
</head>
<body>
<main>
  <h1>Ideas y fallos</h1>
  <p>Esta página es para personas adultas. Aquí puedes proponer una idea para Zoo Esponji, avisar de un fallo, o las dos cosas. <a href="en.html">English</a></p>

  <form id="form" novalidate data-idioma="es" data-condiciones="2026-10"
        data-vacio="Escribe una idea o un fallo."
        data-aceptacion="Marca las casillas para poder enviar."
        data-peticion="Revisa los textos: alguno es demasiado largo o tiene caracteres que no se admiten."
        data-error="No se ha podido enviar. Prueba otra vez dentro de un rato."
        data-bien="¡Gracias! Lo hemos recibido.">
    <label for="idea">Una idea para el zoo
      <span class="nota">Un animal nuevo, un sitio, algo que hacer… Hasta 300 letras.</span></label>
    <textarea id="idea" name="idea" maxlength="300"></textarea>

    <label for="nombre">Nombre de pila o apodo del niño o la niña (opcional)
      <span class="nota">Solo el nombre, sin apellidos. Saldrá en el juego como «idea de…» si la idea llega a votarse.</span></label>
    <input type="text" id="nombre" name="nombre" maxlength="15" autocomplete="off">

    <label for="fallo">Un fallo del juego
      <span class="nota">Qué estabas haciendo y qué pasó. Hasta 500 letras.</span></label>
    <textarea id="fallo" name="fallo" maxlength="500"></textarea>

    <label for="version">Versión del juego (opcional)
      <span class="nota">Está escrita en el tablón del zoo y en Ajustes.</span></label>
    <input type="text" id="version" name="version" maxlength="20" autocomplete="off">

    <label for="modelo">Modelo del móvil o la tableta (opcional)</label>
    <input type="text" id="modelo" name="modelo" maxlength="60" autocomplete="off">

    <div class="trampa" aria-hidden="true">
      <label for="web">No rellenes este campo</label>
      <input type="text" id="web" name="web" tabindex="-1" autocomplete="off">
    </div>

    <label class="casilla"><input type="checkbox" id="mayor">
      <span>Tengo 18 años o más y acepto las <a href="../condiciones.html" target="_blank" rel="noopener">condiciones</a>.</span></label>
    <label class="casilla" id="fila-tutor" hidden><input type="checkbox" id="tutor">
      <span>Soy su padre, madre o tutor, o tengo su permiso para enviar su nombre.</span></label>

    <button type="submit" id="enviar">Enviar</button>
    <p class="aviso" id="aviso" role="status" hidden></p>
  </form>

  <p class="legal">
    <strong>Qué hacemos con lo que envías.</strong> Responsable: David Salvador Plaza Delmarés (davidpladel),
    android@davidpladel.com. Usamos tu mensaje solo para mejorar el juego y, si diste un nombre, para ponerlo
    junto a la idea dentro del juego. Lo hacemos porque tú lo envías y lo aceptas. No pedimos correo ni
    apellidos, no guardamos tu dirección IP y no cedemos estos datos a nadie. Los mensajes se borran a los
    90 días. Puedes pedir antes que borremos el tuyo, o que quitemos un nombre del juego, escribiendo a ese
    correo. También puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).
    Más detalle en la <a href="https://www.davidpladel.com/privacidad-zoo-esponji/">política de privacidad</a>.
  </p>
</main>
<script src="ideas.js"></script>
</body>
</html>
```

- [ ] **Step 4: Página en inglés**

`server/public/ideas/en.html`: igual que la anterior con estos cambios exactos (el resto de etiquetas, ids y atributos, idénticos):

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Ideas and bugs · Zoo Esponji</title>
  <link rel="stylesheet" href="ideas.css">
</head>
<body>
<main>
  <h1>Ideas and bugs</h1>
  <p>This page is for adults. Here you can suggest an idea for Zoo Esponji, report a bug, or both. <a href="index.html">Español</a></p>

  <form id="form" novalidate data-idioma="en" data-condiciones="2026-10"
        data-vacio="Write an idea or a bug."
        data-aceptacion="Tick the boxes to send."
        data-peticion="Check the texts: one is too long or has characters we can't accept."
        data-error="We couldn't send it. Please try again in a while."
        data-bien="Thank you! We got it.">
    <label for="idea">An idea for the zoo
      <span class="nota">A new animal, a place, something to do… Up to 300 characters.</span></label>
    <textarea id="idea" name="idea" maxlength="300"></textarea>

    <label for="nombre">Child's first name or nickname (optional)
      <span class="nota">First name only, no surname. It will appear in the game as "…'s idea" if the idea goes to a vote.</span></label>
    <input type="text" id="nombre" name="nombre" maxlength="15" autocomplete="off">

    <label for="fallo">A bug in the game
      <span class="nota">What you were doing and what happened. Up to 500 characters.</span></label>
    <textarea id="fallo" name="fallo" maxlength="500"></textarea>

    <label for="version">Game version (optional)
      <span class="nota">It is written on the zoo board and in Settings.</span></label>
    <input type="text" id="version" name="version" maxlength="20" autocomplete="off">

    <label for="modelo">Phone or tablet model (optional)</label>
    <input type="text" id="modelo" name="modelo" maxlength="60" autocomplete="off">

    <div class="trampa" aria-hidden="true">
      <label for="web">Leave this field empty</label>
      <input type="text" id="web" name="web" tabindex="-1" autocomplete="off">
    </div>

    <label class="casilla"><input type="checkbox" id="mayor">
      <span>I am 18 or older and I accept the <a href="../terms.html" target="_blank" rel="noopener">terms</a>.</span></label>
    <label class="casilla" id="fila-tutor" hidden><input type="checkbox" id="tutor">
      <span>I am their parent or guardian, or I have their permission to send their name.</span></label>

    <button type="submit" id="enviar">Send</button>
    <p class="aviso" id="aviso" role="status" hidden></p>
  </form>

  <p class="legal">
    <strong>What we do with what you send.</strong> Controller: David Salvador Plaza Delmarés (davidpladel),
    android@davidpladel.com. We use your message only to improve the game and, if you gave a name, to show it
    next to the idea inside the game. We do this because you send it and accept it. We do not ask for email
    or surname, we do not store your IP address and we do not share this data with anyone. Messages are
    deleted after 90 days. You can ask us to delete yours sooner, or to remove a name from the game, by
    writing to that address. You can also complain to the Spanish Data Protection Agency (aepd.es).
    More in the <a href="https://www.davidpladel.com/privacidad-zoo-esponji/">privacy policy</a>.
  </p>
</main>
<script src="ideas.js"></script>
</body>
</html>
```

- [ ] **Step 5: Guion de la página**

`server/public/ideas/ideas.js`:

```js
// Sin librerías. Los mensajes son fijos y vienen del HTML: nada de lo que escribe la persona vuelve a pintarse.
(() => {
  const form = document.getElementById('form');
  const campo = (id) => document.getElementById(id);
  const aviso = campo('aviso');
  const boton = campo('enviar');
  const filaTutor = campo('fila-tutor');

  const version = new URLSearchParams(location.search).get('v') ?? '';
  if (/^[0-9A-Za-z. -]{1,20}$/.test(version)) campo('version').value = version;

  const decir = (clave, bien = false) => {
    aviso.textContent = form.dataset[clave];
    aviso.classList.toggle('bien', bien);
    aviso.hidden = false;
  };

  // La segunda casilla solo existe si se da el nombre de un menor.
  campo('nombre').addEventListener('input', () => {
    const hayNombre = campo('nombre').value.trim() !== '';
    filaTutor.hidden = !hayNombre;
    if (!hayNombre) campo('tutor').checked = false;
  });

  let enviando = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (enviando) return;
    const datos = {
      idea: campo('idea').value,
      fallo: campo('fallo').value,
      nombre: campo('nombre').value,
      version: campo('version').value,
      modelo: campo('modelo').value,
      web: campo('web').value,
      idioma: form.dataset.idioma,
      condiciones: form.dataset.condiciones,
      mayor: campo('mayor').checked,
      tutor: campo('tutor').checked,
    };
    if (datos.idea.trim() === '' && datos.fallo.trim() === '') return decir('vacio');
    if (!datos.mayor || (datos.nombre.trim() !== '' && !datos.tutor)) return decir('aceptacion');

    enviando = true;
    boton.disabled = true;
    try {
      const respuesta = await fetch('../envio.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
        credentials: 'omit',
      });
      const cuerpo = await respuesta.json().catch(() => ({}));
      if (respuesta.ok && cuerpo.ok === true) {
        form.reset();
        filaTutor.hidden = true;
        decir('bien', true);
      } else {
        decir(['vacio', 'aceptacion', 'peticion'].includes(cuerpo.error) ? cuerpo.error : 'error');
      }
    } catch {
      decir('error');
    } finally {
      enviando = false;
      boton.disabled = false;
    }
  });
})();
```

- [ ] **Step 6: Condiciones (borrador)**

`server/public/condiciones.html`:

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Condiciones de las ideas · Zoo Esponji</title>
  <link rel="stylesheet" href="ideas/ideas.css">
</head>
<body>
<main>
  <h1>Condiciones de las ideas y los avisos de fallos</h1>
  <p>Versión 2026-10 · en vigor desde el 12 de octubre de 2026 · <a href="terms.html">English</a></p>

  <h2>1. Quién puede enviar</h2>
  <p>Solo personas de 18 años o más. Si das el nombre de un menor, declaras que eres su padre, madre o tutor, o que tienes su permiso.</p>

  <h2>2. Qué pasa con tu idea</h2>
  <p>Enviar una idea es voluntario y gratuito. Al enviarla nos das permiso, sin límite de tiempo ni de lugar y sin exclusiva, para usarla, cambiarla, mezclarla con otras, publicarla dentro del juego o no usarla. Tú puedes seguir usando tu idea como quieras.</p>

  <h2>3. Sin dinero ni derechos sobre el juego</h2>
  <p>Enviar una idea, que se vote o que se haga no te da derecho a dinero, premios ni compensación de ningún tipo, ni te convierte en autor, dueño o socio de Zoo Esponji. El juego, su nombre, su código y su arte siguen siendo de sus titulares.</p>

  <h2>4. Ideas parecidas</h2>
  <p>Puede que ya estuviéramos trabajando en algo parecido, o que otra persona envíe lo mismo. Que el juego incluya algo similar a tu idea no significa que la hayamos tomado de ti.</p>

  <h2>5. Votaciones</h2>
  <p>Nosotros elegimos qué ideas se votan y con qué palabras. La votación orienta lo que haremos después, pero no nos obliga: una idea ganadora puede retrasarse, cambiar o no hacerse si resulta inviable.</p>

  <h2>6. Nombres</h2>
  <p>El nombre es opcional. Solo mostramos nombres de pila o apodos; podemos recortarlos, cambiarlos o no mostrarlos. Puedes pedir que quitemos un nombre escribiendo a android@davidpladel.com.</p>

  <h2>7. Qué no enviar</h2>
  <p>No envíes apellidos, direcciones, teléfonos, fotos ni otros datos personales, ni material que no sea tuyo. Lo que no cumpla esto se borra.</p>

  <h2>8. Tus datos</h2>
  <p>Lo explicamos en la página del formulario y en la <a href="https://www.davidpladel.com/privacidad-zoo-esponji/">política de privacidad</a>. Los mensajes se borran a los 90 días.</p>

  <h2>9. Cambios</h2>
  <p>Si cambiamos estas condiciones, publicaremos la nueva versión aquí con su fecha. A cada envío se le aplica la versión que aceptó. Versiones anteriores: ninguna todavía.</p>

  <h2>10. Ley aplicable</h2>
  <p>Estas condiciones se rigen por la ley española.</p>
</main>
</body>
</html>
```

`server/public/terms.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Idea terms · Zoo Esponji</title>
  <link rel="stylesheet" href="ideas/ideas.css">
</head>
<body>
<main>
  <h1>Terms for ideas and bug reports</h1>
  <p>Version 2026-10 · in force since 12 October 2026 · <a href="condiciones.html">Español</a></p>

  <h2>1. Who can send</h2>
  <p>Only people aged 18 or older. If you give a child's name, you declare that you are their parent or guardian, or that you have their permission.</p>

  <h2>2. What happens to your idea</h2>
  <p>Sending an idea is voluntary and free. By sending it you give us permission, with no limit in time or place and without exclusivity, to use it, change it, combine it with others, show it inside the game, or not use it. You can keep using your idea however you like.</p>

  <h2>3. No money and no rights over the game</h2>
  <p>Sending an idea, having it voted on or having it built does not entitle you to money, prizes or compensation of any kind, and does not make you an author, owner or partner of Zoo Esponji. The game, its name, its code and its art remain the property of their owners.</p>

  <h2>4. Similar ideas</h2>
  <p>We may already be working on something similar, or someone else may send the same thing. The game including something like your idea does not mean we took it from you.</p>

  <h2>5. Votes</h2>
  <p>We choose which ideas go to a vote and how they are worded. The vote guides what we do next but does not bind us: a winning idea may be delayed, changed or not built if it turns out not to be feasible.</p>

  <h2>6. Names</h2>
  <p>The name is optional. We only show first names or nicknames; we may shorten them, change them or not show them. You can ask us to remove a name by writing to android@davidpladel.com.</p>

  <h2>7. What not to send</h2>
  <p>Do not send surnames, addresses, phone numbers, photos or other personal data, or material that is not yours. Anything that breaks this is deleted.</p>

  <h2>8. Your data</h2>
  <p>We explain it on the form page and in the <a href="https://www.davidpladel.com/privacidad-zoo-esponji/">privacy policy</a>. Messages are deleted after 90 days.</p>

  <h2>9. Changes</h2>
  <p>If we change these terms, we will publish the new version here with its date. Each submission is governed by the version it accepted. Earlier versions: none yet.</p>

  <h2>10. Governing law</h2>
  <p>These terms are governed by Spanish law.</p>
</main>
</body>
</html>
```

- [ ] **Step 7: Probar la página con el servidor de PHP y SQLite**

Crear una configuración local de pruebas (ignorada por git):

```bash
cd server && cat > app/config.php <<'EOF'
<?php
return ['db_dsn' => 'sqlite:' . __DIR__ . '/datos/local.sqlite', 'db_usuario' => '', 'db_clave' => '', 'n8n_url' => '', 'n8n_clave' => '',
    'clave_exportar' => 'clave-local-de-pruebas-0123456789abcdef', 'condiciones' => '2026-10', 'contenido' => ''];
EOF
cp app/datos/comunidad.example.json app/datos/comunidad.json
php -r "require 'app/autoload.php'; Zoo\Servicio::almacen(Zoo\Servicio::config('app'))->crearTablas();"
```

Añadir `app/datos/*.sqlite` a `server/.gitignore`.

Arrancar: `php -S 127.0.0.1:8088 -t public` (en segundo plano) y comprobar con `curl`:

```bash
curl -s http://127.0.0.1:8088/estado.php
curl -s -X POST http://127.0.0.1:8088/envio.php -d '{"idea":"Delfines","idioma":"es","mayor":true,"condiciones":"2026-10"}'
curl -s -X POST http://127.0.0.1:8088/envio.php -d '{"idea":"Delfines","idioma":"es","mayor":false,"condiciones":"2026-10"}'
curl -s -X POST http://127.0.0.1:8088/envio.php -d '{"idea":"Delfines","nombre":"Lucía","idioma":"es","mayor":true,"tutor":false,"condiciones":"2026-10"}'
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:8088/envio.php --data-binary "$(head -c 9000 /dev/zero | tr '\0' 'a')"
curl -s -X DELETE http://127.0.0.1:8088/voto.php
```

Expected, en orden: el JSON del estado con `"ideas":0`; `{"ok":true}`; `{"error":"aceptacion"}`; `{"error":"aceptacion"}`; `400`; `{"error":"metodo"}`.

Abrir `http://127.0.0.1:8088/ideas/` en el navegador integrado y comprobar:

1. Enviar vacío → «Escribe una idea o un fallo.»
2. Escribir un nombre → aparece la segunda casilla; borrarlo → desaparece.
3. Idea con nombre y solo la primera casilla → «Marca las casillas para poder enviar.»
4. Todo marcado → «¡Gracias! Lo hemos recibido.» y el formulario se vacía.
5. **Doble toque:** pulsar «Enviar» dos veces seguidas con todo relleno; después `curl -s http://127.0.0.1:8088/estado.php` debe haber subido `ideas` en 1, no en 2.
6. `ideas/en.html`: mismos pasos, mensajes en inglés.
7. `ideas/?v=2.7.0` rellena la versión; `ideas/?v=<b>` no rellena nada.

- [ ] **Step 8: Commit**

```bash
git add server/public server/.gitignore
git commit -m "feat: página de ideas y fallos y condiciones, en español e inglés"
```

---

### Task 9: Exportar envíos y herramientas de `comunidad.json`

**Files:**
- Create: `server/app/src/Exportar.php`, `server/public/exportar.php`, `server/tests/ExportarTest.php`, `tools/comunidad/lib.mjs`, `tools/comunidad/lib.test.mjs`, `tools/comunidad/check.mjs`, `tools/comunidad/envios.mjs`, `tools/comunidad/.env.example`, `tools/comunidad/README.md`
- Modify: `docs/superpowers/specs/2026-10-12-comunidad-design.md` (apartado 2: fila de `exportar.php`)

**Interfaces:**
- Consumes: `Almacen::envios`, `Contenido` (reglas espejo en JS), `parseEnv` de `tools/matomo/lib.mjs`.
- Produces:
  - `Zoo\Exportar::procesar(mixed $entrada, Almacen $almacen, string $clave): array{0:int,1:array}` — petición `{ "clave": "...", "desde": "2026-11-01" }`; `[200, ['envios' => [...]]]`, `[404, ['error' => 'peticion']]` si la clave configurada tiene menos de 32 caracteres o no coincide, `[400, ['error' => 'peticion']]` si `desde` no es un día.
  - `tools/comunidad/lib.mjs`: `validar(datos): string[]` (lista de errores; vacía si vale).
  - `node tools/comunidad/check.mjs <archivo> [carpeta-de-dibujos]`, `node tools/comunidad/envios.mjs [--desde=AAAA-MM-DD]`.

- [ ] **Step 1: Pruebas de `Exportar` que fallan**

`server/tests/ExportarTest.php`:

```php
<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use Zoo\Exportar;

final class ExportarTest extends TestCase
{
    private const CLAVE = 'una-clave-larga-de-pruebas-0123456789';

    public function testConLaClaveDevuelveLosEnviosDesdeElDia(): void
    {
        $almacen = AlmacenTest::nuevo();
        $almacen->guardarEnvio(AlmacenTest::envio(['fecha' => '2026-10-20 10:00:00', 'idea' => 'vieja']));
        $almacen->guardarEnvio(AlmacenTest::envio(['fecha' => '2026-11-02 10:00:00', 'idea' => 'nueva']));
        [$estado, $cuerpo] = Exportar::procesar(['clave' => self::CLAVE, 'desde' => '2026-11-01'], $almacen, self::CLAVE);
        self::assertSame(200, $estado);
        self::assertSame(['nueva'], array_column($cuerpo['envios'], 'idea'));
    }

    public function testClaveMalaOAusenteEsUn404(): void
    {
        $almacen = AlmacenTest::nuevo();
        foreach ([null, 'hola', ['desde' => '2026-11-01'], ['clave' => 'otra', 'desde' => '2026-11-01'], ['clave' => ['x'], 'desde' => '2026-11-01']] as $entrada) {
            self::assertSame([404, ['error' => 'peticion']], Exportar::procesar($entrada, $almacen, self::CLAVE));
        }
    }

    public function testSinClaveConfiguradaOCortaNuncaExporta(): void
    {
        $almacen = AlmacenTest::nuevo();
        self::assertSame(404, Exportar::procesar(['clave' => '', 'desde' => '2026-11-01'], $almacen, '')[0]);
        self::assertSame(404, Exportar::procesar(['clave' => 'corta', 'desde' => '2026-11-01'], $almacen, 'corta')[0]);
    }

    public function testDesdeTieneQueSerUnDia(): void
    {
        $almacen = AlmacenTest::nuevo();
        self::assertSame([400, ['error' => 'peticion']], Exportar::procesar(['clave' => self::CLAVE, 'desde' => "2026-11-01' OR 1=1"], $almacen, self::CLAVE));
        self::assertSame([400, ['error' => 'peticion']], Exportar::procesar(['clave' => self::CLAVE], $almacen, self::CLAVE));
    }
}
```

Run: `cd server && php herramientas/phpunit.phar --filter ExportarTest`
Expected: FAIL, `Class "Zoo\Exportar" not found`.

- [ ] **Step 2: Implementación de `Exportar`**

`server/app/src/Exportar.php`:

```php
<?php
declare(strict_types=1);

namespace Zoo;

/** Descarga de envíos para `tools/comunidad/envios.mjs`. Sin clave buena responde como si no existiera. */
final class Exportar
{
    private const MIN_CLAVE = 32;

    /** @return array{0: int, 1: array} */
    public static function procesar(mixed $entrada, Almacen $almacen, string $clave): array
    {
        $recibida = is_array($entrada) ? ($entrada['clave'] ?? null) : null;
        if (strlen($clave) < self::MIN_CLAVE || !is_string($recibida) || !hash_equals($clave, $recibida)) {
            return [404, ['error' => 'peticion']];
        }
        $desde = $entrada['desde'] ?? null;
        if (!is_string($desde) || preg_match('/^\d{4}-\d{2}-\d{2}$/', $desde) !== 1) {
            return [400, ['error' => 'peticion']];
        }
        return [200, ['envios' => $almacen->envios($desde . ' 00:00:00')]];
    }
}
```

`server/public/exportar.php`:

```php
<?php
declare(strict_types=1);

use Zoo\Exportar;
use Zoo\Http;
use Zoo\Servicio;

$app = require __DIR__ . '/ruta.php';
require $app . '/autoload.php';

if (!Http::metodo('POST')) {
    return;
}
$entrada = Http::cuerpoJson();
Http::responder(...Servicio::atender(static function () use ($app, $entrada): array {
    $config = Servicio::config($app);
    return Exportar::procesar($entrada, Servicio::almacen($config), $config['clave_exportar']);
}));
```

Run: `cd server && php herramientas/phpunit.phar`
Expected: `OK`, todas.

- [ ] **Step 3: Pruebas de `lib.mjs` que fallan**

`tools/comunidad/lib.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { validar } from './lib.mjs';

const ejemplo = () => JSON.parse(readFileSync(new URL('../../server/app/datos/comunidad.example.json', import.meta.url), 'utf8'));
const con = (cambiar) => {
  const datos = ejemplo();
  cambiar(datos);
  return validar(datos);
};

test('el ejemplo del servidor es válido', () => {
  assert.deepEqual(validar(ejemplo()), []);
});

test('sin votación y sin muro es válido', () => {
  assert.deepEqual(validar({ votacion: null, muro: [] }), []);
});

test('cada error se nombra con su sitio', () => {
  assert.deepEqual(validar('hola'), ['El archivo no es un objeto.']);
  assert.match(con((d) => { d.votacion.id = 'Nov 1'; })[0], /votacion\.id/);
  assert.match(con((d) => { d.votacion.abre = '2026-02-31'; })[0], /votacion\.abre/);
  assert.match(con((d) => { d.votacion.cierra = '2026-10-01'; })[0], /cierra/);
  assert.match(con((d) => { d.votacion.opciones.pop(); })[0], /entre 2 y 4/);
  assert.match(con((d) => { d.votacion.opciones[1].id = 'delfines'; })[0], /repetid/);
  assert.match(con((d) => { d.votacion.opciones[0].dibujo = '../a.png'; })[0], /opciones\[0\]\.dibujo/);
  assert.match(con((d) => { delete d.votacion.opciones[0].titulo.en; })[0], /opciones\[0\]\.titulo\.en/);
  assert.match(con((d) => { d.votacion.opciones[0].titulo.es = 'a'.repeat(31); })[0], /30/);
  assert.match(con((d) => { d.votacion.ganadora = 'leones'; })[0], /ganadora/);
  assert.match(con((d) => { d.muro[0].estado = 'pronto'; })[0], /muro\[0\]\.estado/);
  assert.match(con((d) => { d.muro[0].recinto = 'el pinguino'; })[0], /muro\[0\]\.recinto/);
  assert.match(con((d) => { d.muro = Array(31).fill(d.muro[0]); })[0], /30/);
});

test('avisa de un nombre que el juego recortará', () => {
  assert.match(con((d) => { d.votacion.opciones[0].ideaDe = 'Maximiliano Alejandro'; })[0], /15/);
});

test('junta varios errores', () => {
  const errores = con((d) => { d.votacion.id = 'X'; d.muro[0].estado = 'no'; });
  assert.equal(errores.length, 2);
});
```

Run: `node --test tools/comunidad/lib.test.mjs`
Expected: FAIL, `Cannot find module ... lib.mjs`.

- [ ] **Step 4: Implementación de las herramientas**

`tools/comunidad/lib.mjs`:

```js
// Las mismas reglas que server/app/src/Contenido.php, con mensajes para una persona.
const ID = /^[a-z0-9-]{1,40}$/;
const DIBUJO = /^[a-z0-9-]{1,40}\.png$/;
const DIA = /^(\d{4})-(\d{2})-(\d{2})$/;

const esObjeto = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

function esDia(v) {
  const m = typeof v === 'string' ? DIA.exec(v) : null;
  if (!m) return false;
  const fecha = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return fecha.getUTCMonth() === +m[2] - 1 && fecha.getUTCDate() === +m[3];
}

function ficha(f, donde, errores) {
  for (const idioma of ['es', 'en']) {
    const titulo = f.titulo?.[idioma];
    if (typeof titulo !== 'string' || titulo.trim() === '') errores.push(`${donde}.titulo.${idioma}: falta el título.`);
    else if ([...titulo.trim()].length > 30) errores.push(`${donde}.titulo.${idioma}: pasa de 30 letras.`);
  }
  if (typeof f.dibujo !== 'string' || !DIBUJO.test(f.dibujo)) errores.push(`${donde}.dibujo: solo minúsculas, números y guiones, acabado en .png.`);
  if (f.ideaDe !== undefined) {
    if (typeof f.ideaDe !== 'string') errores.push(`${donde}.ideaDe: tiene que ser texto.`);
    else if ([...f.ideaDe.trim()].length > 15) errores.push(`${donde}.ideaDe: pasa de 15 letras; el juego lo recortaría.`);
  }
}

/** Lista de errores de un `comunidad.json` ya leído. Vacía: vale. */
export function validar(datos) {
  if (!esObjeto(datos)) return ['El archivo no es un objeto.'];
  const errores = [];
  const v = datos.votacion ?? null;
  if (v !== null) {
    if (!esObjeto(v)) return ['votacion: tiene que ser un objeto o null.'];
    if (typeof v.id !== 'string' || !ID.test(v.id)) errores.push('votacion.id: solo minúsculas, números y guiones.');
    if (!esDia(v.abre)) errores.push('votacion.abre: no es un día AAAA-MM-DD que exista.');
    if (!esDia(v.cierra)) errores.push('votacion.cierra: no es un día AAAA-MM-DD que exista.');
    if (esDia(v.abre) && esDia(v.cierra) && v.abre > v.cierra) errores.push('votacion: cierra antes de abrir.');
    const opciones = Array.isArray(v.opciones) ? v.opciones : [];
    if (opciones.length < 2 || opciones.length > 4) errores.push('votacion.opciones: tiene que haber entre 2 y 4.');
    const ids = [];
    opciones.forEach((o, i) => {
      const donde = `votacion.opciones[${i}]`;
      if (!esObjeto(o)) return errores.push(`${donde}: tiene que ser un objeto.`);
      if (typeof o.id !== 'string' || !ID.test(o.id)) errores.push(`${donde}.id: solo minúsculas, números y guiones.`);
      else if (ids.includes(o.id)) errores.push(`${donde}.id: está repetido.`);
      ids.push(o.id);
      ficha(o, donde, errores);
    });
    if ((v.ganadora ?? null) !== null && !ids.includes(v.ganadora)) errores.push('votacion.ganadora: no es el id de ninguna opción.');
  }
  const muro = datos.muro ?? [];
  if (!Array.isArray(muro)) return [...errores, 'muro: tiene que ser una lista.'];
  if (muro.length > 30) errores.push('muro: pasa de 30 entradas.');
  muro.forEach((e, i) => {
    const donde = `muro[${i}]`;
    if (!esObjeto(e)) return errores.push(`${donde}: tiene que ser un objeto.`);
    if (!['elegida', 'hecha'].includes(e.estado)) errores.push(`${donde}.estado: tiene que ser «elegida» o «hecha».`);
    if (e.recinto !== undefined && (typeof e.recinto !== 'string' || !ID.test(e.recinto))) errores.push(`${donde}.recinto: solo minúsculas, números y guiones.`);
    ficha(e, donde, errores);
  });
  return errores;
}

/** Nombres de dibujo que usa el archivo. */
export function dibujos(datos) {
  return [...new Set([...(datos.votacion?.opciones ?? []), ...(datos.muro ?? [])].map((f) => f?.dibujo).filter((d) => typeof d === 'string'))];
}
```

`tools/comunidad/check.mjs`:

```js
// node tools/comunidad/check.mjs <comunidad.json> [carpeta-de-dibujos]
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dibujos, validar } from './lib.mjs';

const [archivo, carpeta] = process.argv.slice(2);
if (!archivo) {
  console.error('Uso: node tools/comunidad/check.mjs <comunidad.json> [carpeta-de-dibujos]');
  process.exit(2);
}
let datos;
try {
  datos = JSON.parse(readFileSync(archivo, 'utf8').replace(/^\uFEFF/, ''));
} catch (error) {
  console.error(`No se puede leer como JSON: ${error.message}`);
  process.exit(1);
}
const errores = validar(datos);
if (carpeta && errores.length === 0) {
  for (const dibujo of dibujos(datos)) {
    if (!existsSync(join(carpeta, dibujo))) errores.push(`Falta el dibujo ${dibujo} en ${carpeta}.`);
  }
}
if (errores.length > 0) {
  console.error(errores.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log('✓ El archivo vale. Ya se puede subir.');
```

`tools/comunidad/.env.example`:

```
# Copiar a .env.local (ignorado por git) y rellenar. Nunca subir el fichero relleno.
# Dirección de la carpeta pública del servidor de comunidad, sin barra final.
COMUNIDAD_URL=
# La misma clave que clave_exportar en el config.php del servidor (32 caracteres o más).
COMUNIDAD_CLAVE=
```

`tools/comunidad/envios.mjs`:

```js
// node tools/comunidad/envios.mjs [--desde=AAAA-MM-DD]
// Descarga los envíos a tools/comunidad/data/ (ignorado por git). Llevan nombres de menores: no salen de esta máquina.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from '../matomo/lib.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const ENV = join(AQUI, '.env.local');
const DATOS = join(AQUI, 'data');

function fallo(mensaje) {
  console.error(mensaje);
  process.exit(1);
}

if (!existsSync(ENV)) fallo('Falta tools/comunidad/.env.local. Copia .env.example y rellénalo.');
for (const ruta of [ENV, join(DATOS, 'envios.json')]) {
  try {
    execFileSync('git', ['check-ignore', '-q', ruta], { cwd: AQUI, stdio: 'ignore' });
  } catch {
    fallo(`${ruta} NO está ignorado por git. No sigo: podría subirse al repositorio.`);
  }
}
const env = parseEnv(readFileSync(ENV, 'utf8'));
const url = (env.COMUNIDAD_URL ?? '').replace(/\/+$/, '');
const clave = env.COMUNIDAD_CLAVE ?? '';
if (!url.startsWith('https://') || clave.length < 32) fallo('.env.local incompleto: hacen falta COMUNIDAD_URL (https) y COMUNIDAD_CLAVE (32 o más).');

const arg = process.argv.find((a) => a.startsWith('--desde='))?.slice(8);
const desde = arg ?? new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(desde)) fallo('--desde tiene que ser AAAA-MM-DD.');

let respuesta;
try {
  // La clave va en el cuerpo, nunca en la dirección.
  respuesta = await fetch(`${url}/exportar.php`, { method: 'POST', body: JSON.stringify({ clave, desde }) });
} catch {
  fallo('No se ha podido conectar con el servidor.');
}
if (!respuesta.ok) fallo(`El servidor ha respondido ${respuesta.status}. Revisa la clave y la dirección.`);
const { envios } = await respuesta.json();
mkdirSync(DATOS, { recursive: true });
writeFileSync(join(DATOS, 'envios.json'), JSON.stringify(envios, null, 2));
const ideas = envios.filter((e) => e.idea !== '').length;
const fallos = envios.filter((e) => e.fallo !== '').length;
console.log(`${envios.length} envíos desde ${desde} (${ideas} con idea, ${fallos} con fallo) en tools/comunidad/data/envios.json`);
```

`tools/comunidad/README.md`:

```markdown
# Preparar una votación

Scripts de Node sin dependencias. `comunidad.json` no se escribe a mano: se prepara con Claude.

## Preparación (una vez)

Copia `.env.example` a `.env.local` en esta carpeta y rellénalo. Está ignorado por git; el script se
niega a arrancar si no lo está.

## Cada votación

Desde la raíz del repositorio:

    node tools/comunidad/envios.mjs --desde=2026-11-01

Descarga los envíos a `tools/comunidad/data/envios.json` (ignorado por git). **Llevan nombres de
menores: ese archivo no se comparte ni se sube.**

Con Claude: elegir las ideas, redactar las opciones en español e inglés y decidir los créditos
(solo nombre de pila o apodo). Guardar el resultado en `tools/comunidad/data/comunidad.json` y los
dibujos (PNG cuadrados de 256 px) en `tools/comunidad/data/dibujos/`.

    node tools/comunidad/check.mjs tools/comunidad/data/comunidad.json tools/comunidad/data/dibujos

Si dice que vale, subir con el gestor de archivos de Hestia: los dibujos a `dibujos/` de la carpeta
pública y `comunidad.json` a `app/datos/`. Los dibujos primero.

## Cerrar una votación

Poner en `ganadora` el id de la opción que gana (en caso de empate decides tú), añadir la entrada al
principio de `muro` con `"estado": "elegida"`, y pasar el comprobador. Cuando la idea esté hecha en el
juego, cambiar su estado a `"hecha"` y, si toca, poner `recinto`.
```

- [ ] **Step 5: Comprobar que pasan**

Run: `node --test tools/comunidad/lib.test.mjs`
Expected: `# pass 5`, `# fail 0`.

Run: `node tools/comunidad/check.mjs server/app/datos/comunidad.example.json`
Expected: `✓ El archivo vale. Ya se puede subir.`

Run: `node tools/comunidad/check.mjs server/app/datos/comunidad.example.json server/public/dibujos; echo $?`
Expected: tres líneas `✗ Falta el dibujo …` y `1`.

Con el servidor local de la tarea 8 en marcha, comprobar la exportación:

```bash
curl -s -X POST http://127.0.0.1:8088/exportar.php -d '{"clave":"mala","desde":"2026-01-01"}'
curl -s -X POST http://127.0.0.1:8088/exportar.php -d '{"clave":"clave-local-de-pruebas-0123456789abcdef","desde":"2026-01-01"}'
```

Expected: `{"error":"peticion"}` y después `{"envios":[...]}` con los envíos de prueba.

- [ ] **Step 6: Poner la spec al día**

En `docs/superpowers/specs/2026-10-12-comunidad-design.md`, apartado 2, añadir a la tabla esta fila:

```markdown
| `POST exportar.php` | `tools/comunidad/envios.mjs` | Con una clave larga, devuelve los envíos desde un día. Sin clave buena responde 404. |
```

Y en el apartado 2c, paso 1, sustituir «(con una clave local, como `tools/matomo/`)» por «(pide `exportar.php` con una clave local, como `tools/matomo/`)».

- [ ] **Step 7: Commit**

```bash
git add server/app/src/Exportar.php server/public/exportar.php server/tests/ExportarTest.php tools/comunidad docs/superpowers/specs/2026-10-12-comunidad-design.md
git commit -m "feat: exportar envíos con clave y herramientas para preparar comunidad.json"
```

---

### Task 10: Guía de instalación, n8n y documentación

**Files:**
- Create: `server/README.md`
- Modify: `README.md` (raíz), `docs/superpowers/specs/2026-10-12-comunidad-design.md` (línea de estado)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: los pasos manuales de David, escritos para PowerShell y Hestia.

- [ ] **Step 1: Guía del servidor**

`server/README.md`:

```markdown
# Servidor de comunidad de Zoo Esponji

PHP 8.1 o superior y MySQL. Sin Composer ni librerías. Diseño: `docs/superpowers/specs/2026-10-12-comunidad-design.md`.

## Pruebas (en tu ordenador)

    cd server
    php herramientas/phpunit.phar

## Instalar en el VPS (Hestia), una vez

1. **Dominio.** En Hestia, crea un subdominio con HTTPS (Let's Encrypt), por ejemplo `zoo.tudominio.com`.
2. **Base de datos.** En Hestia → DB, crea una base de datos y un usuario. Abre phpMyAdmin y ejecuta el
   contenido de `app/esquema.sql`.
3. **Archivos.** Con el gestor de archivos de Hestia:
   - Sube el contenido de `public/` a `public_html/` del subdominio.
   - Sube la carpeta `app/` a `private/app/` del subdominio (al lado de `public_html`, no dentro).
   - Edita `public_html/ruta.php` y deja: `return __DIR__ . '/../private/app';`
4. **Configuración.** Copia `private/app/config.example.php` a `private/app/config.php` y rellénalo.
   `clave_exportar` y `n8n_clave`: dos claves distintas de 40 caracteres al azar. En PowerShell:

       -join ((48..57) + (97..122) | Get-Random -Count 40 | ForEach-Object { [char]$_ })

5. **Contenido.** Copia `private/app/datos/comunidad.example.json` a `private/app/datos/comunidad.json`
   y cambia `"votacion": {...}` por `"votacion": null` hasta que haya una de verdad.
6. **Comprobar.** Abre `https://zoo.tudominio.com/estado.php`: debe salir `{"hoy":"…","ideas":0,"votacion":null,…}`.
   Abre `https://zoo.tudominio.com/ideas/` y envía una idea de prueba.
7. **Comprobar que lo privado no se ve.** `https://zoo.tudominio.com/ruta.php` debe dar «prohibido», y no
   debe existir ninguna dirección que enseñe `config.php`.

Si algo responde `{"error":"no-disponible"}`, el motivo está en el registro de errores del dominio en Hestia.

## Aviso por n8n

1. Flujo nuevo con un nodo **Webhook**: método POST, ruta a tu gusto, autenticación «Header Auth» con
   nombre `X-Zoo-Clave` y valor igual a `n8n_clave`.
2. Nodo de **Telegram** o de **correo**. Escribe el mensaje con los campos como texto plano, sin formato
   Markdown ni HTML (así nada de lo que escriba la gente puede cambiar el mensaje):

       Zoo Esponji · envío {{ $json.body.id }} ({{ $json.body.idioma }})
       Idea: {{ $json.body.idea }}
       Fallo: {{ $json.body.fallo }}
       Nombre: {{ $json.body.nombre }}
       Versión: {{ $json.body.version }} · Modelo: {{ $json.body.modelo }}

3. Activa el flujo y pega la dirección de producción del webhook en `n8n_url` de `config.php`.

Si n8n está caído, los envíos se guardan igual; se ven con `tools/comunidad/envios.mjs`.

## Actualizar

Vuelve a subir `public/` y `app/src/`. No pises `config.php`, `ruta.php` ni `datos/`.

## Cambiar las condiciones

Guarda la versión anterior como `condiciones-2026-10.html` y enlázala en el punto 9; cambia la versión y
la fecha en `condiciones.html` y `terms.html`, el atributo `data-condiciones` de los dos formularios y
`condiciones` en `config.php`. Las tres cosas a la vez: si no coinciden, el formulario rechaza los envíos.
```

- [ ] **Step 2: Documentación del repositorio**

En `README.md` de la raíz, en la tabla de specs y planes, añadir la fila de esta spec y este plan (mismo formato que las filas existentes), y en «Hoja de ruta» un párrafo:

```markdown
⬜ **Comunidad** (en la rama `feat/comunidad`): servidor de votaciones e ideas (`server/`), página web para adultos y herramientas para preparar cada votación (`tools/comunidad/`). Falta instalarlo en el VPS y el tablón dentro del juego (plan 2).
```

En la spec, cambiar la línea de estado por:

```markdown
Fecha: 2026-10-12 · Estado: plan 1 (servidor y web) implementado en `feat/comunidad`; falta instalarlo en el VPS y el plan 2 (juego).
```

- [ ] **Step 3: Comprobación final**

Run: `cd server && php herramientas/phpunit.phar`
Expected: `OK`, todas las pruebas.

Run: `node --test tools/comunidad/lib.test.mjs tools/matomo/lib.test.mjs`
Expected: `# fail 0`.

Run: `git status --short`
Expected: sin `server/app/config.php`, sin `*.sqlite`, sin `tools/comunidad/data/`, sin `server/herramientas/`.

- [ ] **Step 4: Commit**

```bash
git add server/README.md README.md docs/superpowers/specs/2026-10-12-comunidad-design.md
git commit -m "docs: guía de instalación del servidor de comunidad y hoja de ruta"
```

- [ ] **Step 5: Pasos manuales de David (escribírselos en el mensaje final, en PowerShell y sin jerga)**

1. Leer y aprobar `server/public/condiciones.html` y el texto legal del formulario.
2. Instalar en el VPS siguiendo `server/README.md`.
3. Montar el flujo de n8n.
4. Rellenar `tools/comunidad/.env.local`.
5. Pasar a Claude la dirección pública del servidor (hace falta para el plan 2 y para el QR).
