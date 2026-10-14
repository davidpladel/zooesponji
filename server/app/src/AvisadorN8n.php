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
