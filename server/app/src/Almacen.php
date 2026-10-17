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
        $this->pdo->exec("CREATE TABLE IF NOT EXISTS votos_hora (votacion VARCHAR(40) NOT NULL, hora CHAR(13) NOT NULL, contados INT NOT NULL DEFAULT 0, frenados INT NOT NULL DEFAULT 0, PRIMARY KEY (votacion, hora))$fin");
        $this->pdo->exec("CREATE TABLE IF NOT EXISTS contadores (nombre VARCHAR(20) NOT NULL PRIMARY KEY, valor INT NOT NULL DEFAULT 0)$fin");
        $this->pdo->exec(($sqlite ? 'INSERT OR IGNORE' : 'INSERT IGNORE') . " INTO contadores (nombre, valor) VALUES ('ideas', 0)");
    }

    /**
     * Suma uno a `$opcion` y, si hay `$anterior`, le resta uno sin bajar de cero. Las filas se crean con un
     * solo «insertar o sumar» y se tocan siempre en el mismo orden: así dos votos a la vez no se bloquean
     * entre sí. Si aun así MySQL corta la transacción por un bloqueo, se repite.
     */
    public function votar(string $votacion, string $opcion, ?string $anterior = null): void
    {
        $this->repetirSiSeBloquea(fn () => $this->aplicar($votacion, $opcion, $anterior));
    }

    /**
     * Como `votar`, pero solo si a `$votacion` le quedan votos en esa `$hora`; si no, se apunta como frenado.
     * La cuenta de la hora va en la misma transacción que el voto. Devuelve si el voto se ha contado.
     */
    public function votarConTope(string $votacion, string $hora, int $tope, string $opcion, ?string $anterior = null): bool
    {
        $contado = false;
        $this->repetirSiSeBloquea(function () use ($votacion, $hora, $tope, $opcion, $anterior, &$contado): void {
            $insertar = $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite' ? 'INSERT OR IGNORE' : 'INSERT IGNORE';
            $this->pdo->prepare("$insertar INTO votos_hora (votacion, hora) VALUES (?, ?)")->execute([$votacion, $hora]);
            $hueco = $this->pdo->prepare('UPDATE votos_hora SET contados = contados + 1 WHERE votacion = ? AND hora = ? AND contados < ?');
            $hueco->execute([$votacion, $hora, $tope]);
            $contado = $hueco->rowCount() === 1;
            if ($contado) {
                $this->aplicar($votacion, $opcion, $anterior);
            } else {
                $this->pdo->prepare('UPDATE votos_hora SET frenados = frenados + 1 WHERE votacion = ? AND hora = ?')->execute([$votacion, $hora]);
            }
        });
        return $contado;
    }

    /** @return list<array{hora: string, contados: int, frenados: int}> */
    public function votosPorHora(string $votacion): array
    {
        $consulta = $this->pdo->prepare('SELECT hora, contados, frenados FROM votos_hora WHERE votacion = ? ORDER BY hora');
        $consulta->execute([$votacion]);
        return array_map(static fn (array $fila): array => [
            'hora' => (string) $fila['hora'], 'contados' => (int) $fila['contados'], 'frenados' => (int) $fila['frenados'],
        ], $consulta->fetchAll(PDO::FETCH_ASSOC));
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
        $this->repetirSiSeBloquea(function (): void {
            $this->pdo->prepare($this->sumar('contadores', 'nombre', 'valor'))->execute(['ideas']);
        });
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

    /** Los cambios de un voto, en orden fijo para que dos votos a la vez no se bloqueen. Sin transacción propia. */
    private function aplicar(string $votacion, string $opcion, ?string $anterior): void
    {
        $cambios = [$opcion => 1];
        if ($anterior !== null && $anterior !== $opcion) {
            $cambios[$anterior] = -1;
        }
        ksort($cambios, SORT_STRING);
        foreach ($cambios as $id => $cambio) {
            if ($cambio > 0) {
                $this->pdo->prepare($this->sumar('votos', 'votacion, opcion', 'total'))->execute([$votacion, $id]);
            } else {
                $this->pdo->prepare('UPDATE votos SET total = total - 1 WHERE votacion = ? AND opcion = ? AND total > 0')->execute([$votacion, $id]);
            }
        }
    }

    /** «Insertar con 1, o sumar 1 si ya existe» en una sola sentencia. Las columnas clave van como parámetros. */
    private function sumar(string $tabla, string $claves, string $columna): string
    {
        $huecos = implode(', ', array_fill(0, substr_count($claves, ',') + 1, '?'));
        $insertar = "INSERT INTO $tabla ($claves, $columna) VALUES ($huecos, 1)";
        return $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite'
            ? "$insertar ON CONFLICT($claves) DO UPDATE SET $columna = $columna + 1"
            : "$insertar ON DUPLICATE KEY UPDATE $columna = $columna + 1";
    }

    /** Ejecuta `$trabajo` en una transacción; si MySQL la corta por bloqueo (40001), lo intenta hasta 5 veces. */
    private function repetirSiSeBloquea(callable $trabajo): void
    {
        for ($intento = 1; ; $intento++) {
            $this->pdo->beginTransaction();
            try {
                $trabajo();
                $this->pdo->commit();
                return;
            } catch (\PDOException $error) {
                if ($this->pdo->inTransaction()) {
                    $this->pdo->rollBack();
                }
                if ($error->getCode() !== '40001' || $intento >= 5) {
                    throw $error;
                }
                usleep(random_int(5_000, 30_000) * $intento);
            }
        }
    }
}
