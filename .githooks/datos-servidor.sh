#!/usr/bin/env bash
# Busca datos del servidor (IP, usuarios, rutas, cifras de los frenos) en las líneas añadidas de un diff.
# Los patrones viven en .githooks/prohibido.local (uno por línea, texto literal), que no se sube nunca.
# Uso: datos-servidor.sh <fichero con el diff>.  Sale con 1 si encuentra algo o si falta la lista.
set -u
RED=$'\033[31m'; NC=$'\033[0m'
REPO_ROOT="$(git rev-parse --show-toplevel)"
LISTA="$REPO_ROOT/.githooks/prohibido.local"
if [ ! -s "$LISTA" ]; then
  echo "${RED}BLOQUEADO: falta .githooks/prohibido.local (la lista de datos del servidor que no se suben).${NC}"
  echo "Créalo con la IP, los usuarios y las rutas del servidor, uno por línea (ver SECURITY.md)."
  exit 1
fi
PATRONES="$(mktemp)"; trap 'rm -f "$PATRONES"' EXIT
grep -vE '^\s*(#|$)' "$LISTA" | tr -d '\r' > "$PATRONES"
# Línea añadida que no es la cabecera `+++`.
HITS="$(grep -EnI '^\+[^+]' "$1" | grep -FiI -f "$PATRONES")"
if [ -n "$HITS" ]; then
  echo "${RED}BLOQUEADO: datos del servidor en lo que vas a subir:${NC}"
  echo "$HITS" | cut -c1-160 | sed 's/^/   /'
  echo "Cámbialos por huecos como <ip>, <usuario> o <votos>."
  exit 1
fi
exit 0
