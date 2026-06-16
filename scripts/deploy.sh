#!/usr/bin/env bash
set -euo pipefail

# Uso: bash scripts/deploy.sh [ruta_al_tar.gz]
# Default: busca tmp/cdlatam_deploy.tar.gz en la raiz del proyecto

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

PKG="${1:-$ROOT_DIR/tmp/cdlatam_deploy.tar.gz}"

if [ ! -f "$PKG" ]; then
  echo "ERROR: No se encuentra $PKG"
  echo "Uso: bash scripts/deploy.sh [ruta/al/paquete.tar.gz]"
  exit 1
fi

echo "1/4 - git pull"
git pull

echo "2/4 - Extrayendo $PKG ..."
tar -xzf "$PKG"
echo "  OK: gestion.db y data/clauses/ actualizados"

echo "3/4 - docker-compose up -d --build"
docker-compose up -d --build

echo "4/4 - Listo!"
