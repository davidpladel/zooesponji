<?php
declare(strict_types=1);

$app = require __DIR__ . '/../ruta.php';
require $app . '/autoload.php';

Zoo\Http::pagina($app . '/paginas/ideas-en.html');
