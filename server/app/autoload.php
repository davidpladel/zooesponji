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
