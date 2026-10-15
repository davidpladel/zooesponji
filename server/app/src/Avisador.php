<?php
declare(strict_types=1);

namespace Zoo;

interface Avisador
{
    /** Avisa a David de un envío nuevo. Un fallo aquí nunca impide guardar. */
    public function avisar(array $envio): void;
}
