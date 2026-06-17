#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  deploy-vps.sh — Deploy completo del SGA en VPS desde cero
#  Uso: bash scripts/deploy-vps.sh
#
#  Requisitos previos:
#    - Ubuntu 22.04 / 24.04 en el VPS
#    - Acceso SSH como root o usuario con sudo
#    - El dominio cd-latam.com apuntando a la IP del VPS (para SSL)
#
#  Lo que hace este script:
#    1. Instala Docker + Docker Compose + Git + Certbot
#    2. Clona el repo SGA (GitHub) y el landing (GitLab)
#    3. Compila el landing (pnpm build)
#    4. Configura el .env del SGA
#    5. Levanta los contenedores (postgres + sga + nginx)
#    6. Obtiene certificado SSL con Certbot
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Colores ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Configuración ─────────────────────────────────────────────────────────────
SGA_DIR="/opt/sga"
LANDING_DIR="/opt/landing"
DOMINIO="${DOMINIO:-cd-latam.com}"
GITLAB_TOKEN="${GITLAB_TOKEN:-}"
GITHUB_REPO="https://github.com/setlopez1999/cdlatam_webform.git"
GITLAB_REPO="https://oauth2:${GITLAB_TOKEN}@gitlab.com/groupalnNet/cd-latam.git"
BRANCH="main-full"

# ── 1. Instalar dependencias del sistema ─────────────────────────────────────
info "1/6 — Instalando Docker, Docker Compose, Git, Node.js, pnpm, Certbot..."

if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  info "Docker instalado."
else
  info "Docker ya instalado: $(docker --version)"
fi

if ! command -v docker-compose &>/dev/null && ! docker compose version &>/dev/null 2>&1; then
  apt-get install -y docker-compose-plugin
fi

if ! command -v git &>/dev/null; then
  apt-get update && apt-get install -y git
fi

if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

if ! command -v pnpm &>/dev/null; then
  npm install -g pnpm
fi

if ! command -v certbot &>/dev/null; then
  apt-get update && apt-get install -y certbot python3-certbot-nginx
fi

# ── 2. Clonar / actualizar repo SGA ──────────────────────────────────────────
info "2/6 — Clonando SGA desde GitHub..."
if [ -d "$SGA_DIR/.git" ]; then
  cd "$SGA_DIR" && git fetch origin && git checkout "$BRANCH" && git pull origin "$BRANCH"
  info "SGA actualizado."
else
  git clone --branch "$BRANCH" "$GITHUB_REPO" "$SGA_DIR"
  info "SGA clonado en $SGA_DIR"
fi

# ── 3. Clonar / actualizar Landing ───────────────────────────────────────────
info "3/6 — Clonando Landing desde GitLab..."
if [ -z "$GITLAB_TOKEN" ]; then
  warn "GITLAB_TOKEN no definido — saltando landing. Define GITLAB_TOKEN=tu_token y re-ejecuta."
else
  if [ -d "$LANDING_DIR/.git" ]; then
    cd "$LANDING_DIR" && git pull origin main
    info "Landing actualizado."
  else
    git clone "$GITLAB_REPO" "$LANDING_DIR"
    info "Landing clonado en $LANDING_DIR"
  fi

  info "Compilando landing..."
  cd "$LANDING_DIR"
  pnpm install --frozen-lockfile
  pnpm build
  info "Landing compilado en $LANDING_DIR/dist/public"
fi

# ── 4. Configurar .env del SGA ───────────────────────────────────────────────
info "4/6 — Configurando .env del SGA..."
cd "$SGA_DIR"

if [ ! -f ".env" ]; then
  if [ ! -f ".env.example" ]; then
    error "No se encontró .env.example en $SGA_DIR"
  fi

  # Generar secrets seguros
  JWT_SECRET=$(openssl rand -hex 32)
  COOKIE_SECRET=$(openssl rand -hex 32)
  POSTGRES_PASSWORD=$(openssl rand -hex 16)

  cat > .env << ENV_EOF
# ── Entorno ──────────────────────────────────────────────────────────────────
NODE_ENV=production

# ── Base de datos PostgreSQL ──────────────────────────────────────────────────
POSTGRES_USER=sga_user
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=sga_db
DATABASE_URL=postgresql://sga_user:${POSTGRES_PASSWORD}@postgres:5432/sga_db

# ── Seguridad ─────────────────────────────────────────────────────────────────
JWT_SECRET=${JWT_SECRET}
COOKIE_SECRET=${COOKIE_SECRET}

# ── Usuarios por defecto (cambiar después del primer login) ───────────────────
# DEFAULT_ADMIN_PASSWORD=cambia_esto_urgente
# DEFAULT_USER_PASSWORD=cambia_esto_urgente

# ── Fuente de datos ───────────────────────────────────────────────────────────
USE_API=false
API_URL=

# ── Debug ─────────────────────────────────────────────────────────────────────
DEBUG=false
ENV_EOF

  info ".env creado con secrets generados automáticamente."
  warn "IMPORTANTE: Revisa y personaliza $SGA_DIR/.env antes de continuar."
  warn "Especialmente DEFAULT_ADMIN_PASSWORD y DEFAULT_USER_PASSWORD."
else
  info ".env ya existe — no se sobreescribe."
fi

# ── 5. Levantar contenedores ──────────────────────────────────────────────────
info "5/6 — Levantando contenedores Docker..."
cd "$SGA_DIR"
docker compose up --build -d
info "Contenedores levantados. Esperando que estén healthy..."
sleep 10
docker compose ps

# ── 6. SSL con Certbot ────────────────────────────────────────────────────────
info "6/6 — Obteniendo certificado SSL para $DOMINIO..."
warn "Asegúrate de que el DNS de $DOMINIO apunte a este servidor antes de continuar."
read -p "¿El DNS ya apunta a este servidor? [s/N] " dns_ok
if [[ "$dns_ok" =~ ^[Ss]$ ]]; then
  certbot --nginx -d "$DOMINIO" -d "www.$DOMINIO" --non-interactive --agree-tos -m "admin@$DOMINIO"
  info "SSL configurado correctamente."
  # Renovación automática
  (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && docker compose -f $SGA_DIR/docker-compose.yml restart nginx") | crontab -
  info "Renovación automática de SSL configurada (cron)."
else
  warn "SSL omitido. Ejecuta manualmente: certbot --nginx -d $DOMINIO -d www.$DOMINIO"
fi

info "═══════════════════════════════════════════════════════"
info "✅ Deploy completado!"
info "  SGA:     https://$DOMINIO/sga/"
info "  Landing: https://$DOMINIO/"
info "  Logs:    docker compose -f $SGA_DIR/docker-compose.yml logs -f"
info "═══════════════════════════════════════════════════════"
