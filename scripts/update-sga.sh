#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  update-sga.sh — Actualizar SGA en producción
#  Uso: bash scripts/update-sga.sh [--full]
#
#  Sin --full: solo git pull + restart (cambios de config, sin rebuild)
#  Con --full: git pull + docker build + restart (cambios de código)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info() { echo -e "${GREEN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }

SGA_DIR="${SGA_DIR:-/opt/sga}"
FULL="${1:-}"

cd "$SGA_DIR"

info "Actualizando código desde GitHub..."
git pull origin main-full

if [ "$FULL" = "--full" ]; then
  info "Rebuild completo (--full)..."
  docker compose up --build -d
  info "✅ Actualización completa terminada."
else
  info "Restart rápido (sin rebuild)..."
  docker compose restart sga
  info "✅ SGA reiniciado."
fi

docker compose ps
