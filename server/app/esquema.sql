CREATE TABLE IF NOT EXISTS votos (
  votacion VARCHAR(40) NOT NULL,
  opcion VARCHAR(40) NOT NULL,
  total INT NOT NULL DEFAULT 0,
  PRIMARY KEY (votacion, opcion)
) DEFAULT CHARSET=utf8mb4;

-- Votos de cada votación por hora de España («AAAA-MM-DD HH»): contados y frenados por el tope.
CREATE TABLE IF NOT EXISTS votos_hora (
  votacion VARCHAR(40) NOT NULL,
  hora CHAR(13) NOT NULL,
  contados INT NOT NULL DEFAULT 0,
  frenados INT NOT NULL DEFAULT 0,
  PRIMARY KEY (votacion, hora)
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

INSERT IGNORE INTO contadores (nombre, valor) VALUES ('ideas', 0);
