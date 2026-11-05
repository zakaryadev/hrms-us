#!/usr/bin/env bash
# HRMS — serverga joylash (Ubuntu/Debian, root yoki sudo).
#
#   git clone <repo-url> /opt/hrms && cd /opt/hrms
#   sudo DOMAIN=hrms.example.uz ./scripts/deploy.sh      # HTTPS (Caddy, avtomatik sertifikat)
#   sudo ./scripts/deploy.sh                             # faqat HTTP: http://<server-ip>:8080
#
# Skript qayta ishga tushirilsa xavfsiz (idempotent): mavjud .env.prod (parollar) bosilmaydi,
# ma'lumotlar bazasi va fayllar volumelarda saqlanadi. Yangilash: git pull && sudo ./scripts/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
ENV_FILE="$ROOT/.env.prod"
DOMAIN="${DOMAIN:-}"
WEB_PORT="${WEB_PORT:-8080}"

say()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mOGOHLANTIRISH:\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31mXATO:\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "root huquqi kerak: sudo ./scripts/deploy.sh"
[ -f docker-compose.prod.yml ] || die "docker-compose.prod.yml topilmadi. Skriptni repozitoriy ichidan ishga tushiring."
if [ -n "$DOMAIN" ] && ! [[ "$DOMAIN" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$ ]]; then
  die "DOMAIN noto'g'ri: '$DOMAIN' (masalan: hrms.example.uz, 'https://' va yo'lsiz)"
fi

# ---- 1. Docker
if ! command -v docker >/dev/null 2>&1; then
  [ -r /etc/os-release ] && . /etc/os-release || true
  case "${ID:-}${ID_LIKE:-}" in
    *ubuntu*|*debian*) ;;
    *) die "Docker topilmadi va bu tizim (${ID:-unknown}) uchun avtomatik o'rnatish yo'q. Docker Engine + compose plugin'ni qo'lda o'rnating: https://docs.docker.com/engine/install/" ;;
  esac
  say "Docker o'rnatilmoqda (get.docker.com)…"
  command -v curl >/dev/null 2>&1 || { apt-get update -y && apt-get install -y curl ca-certificates; }
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker >/dev/null 2>&1 || true
docker compose version >/dev/null 2>&1 || die "'docker compose' plugin topilmadi. docker-compose-plugin ni o'rnating."
command -v openssl >/dev/null 2>&1 || { apt-get update -y && apt-get install -y openssl; }

# ---- 2. .env.prod (mavjudini bosmaymiz)
set_kv() { # set_kv KEY VALUE — bor bo'lsa almashtiradi, yo'q bo'lsa qo'shadi
  if grep -qE "^$1=" "$ENV_FILE"; then sed -i "s|^$1=.*|$1=$2|" "$ENV_FILE"; else printf '%s=%s\n' "$1" "$2" >> "$ENV_FILE"; fi
}
if [ ! -f "$ENV_FILE" ]; then
  say ".env.prod yaratilmoqda (tasodifiy parollar bilan)…"
  umask 077
  cat > "$ENV_FILE" <<ENV
POSTGRES_PASSWORD=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)
COOKIE_SECURE=false
WEB_PORT=$WEB_PORT
CORS_ORIGIN=
ENV
  NEW_ENV=1
else
  say "Mavjud .env.prod ishlatiladi (parollar o'zgarmaydi)."
  NEW_ENV=0
fi
chmod 600 "$ENV_FILE"
if [ -n "$DOMAIN" ]; then set_kv DOMAIN "$DOMAIN"; set_kv COOKIE_SECURE true
else
  # domen berilmagan: avval HTTPS rejimida bo'lgan o'rnatishni jim buzmaymiz
  if grep -qE '^DOMAIN=.+' "$ENV_FILE"; then DOMAIN="$(grep -E '^DOMAIN=' "$ENV_FILE" | head -1 | cut -d= -f2)"; warn "DOMAIN avvalgi qiymatdan olindi: $DOMAIN"; fi
fi
if ! grep -q '^POSTGRES_PASSWORD=.\+' "$ENV_FILE" || ! grep -q '^JWT_SECRET=.\{16,\}' "$ENV_FILE"; then
  die ".env.prod da POSTGRES_PASSWORD va JWT_SECRET (kamida 16 belgi) bo'lishi kerak"
fi

COMPOSE=(docker compose -f docker-compose.prod.yml)
[ -n "$DOMAIN" ] && COMPOSE+=(-f docker-compose.caddy.yml)
COMPOSE+=(--env-file "$ENV_FILE")

# ---- 3. Brandmauer (faqat ufw faol bo'lsa; yoqmaymiz — SSH'dan chiqib ketmaslik uchun)
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  if [ -n "$DOMAIN" ]; then ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; ufw allow 443/udp >/dev/null; say "ufw: 80, 443 ochildi"
  else ufw allow "${WEB_PORT}/tcp" >/dev/null; say "ufw: ${WEB_PORT} ochildi"; fi
fi

# ---- 4. Yangi kod (git bo'lsa) va ishga tushirish
if [ -d .git ] && [ "${NO_PULL:-0}" != "1" ]; then
  say "git pull…"; git pull --ff-only || warn "git pull bajarilmadi — mavjud kod bilan davom etiladi (NO_PULL=1 bilan o'chirish mumkin)"
fi
# Disk: build ~2–3 GB vaqtincha joy oladi. Joy kam bo'lsa, eski build keshi va ishlatilmayotgan image'lar tozalanadi
# (VOLUME'lar — baza, yuklangan fayllar, hujjatlar — hech qachon o'chirilmaydi).
DOCKER_ROOT="$(docker info -f '{{.DockerRootDir}}' 2>/dev/null || true)"; DOCKER_ROOT="${DOCKER_ROOT:-/var/lib/docker}"
free_mb() { local v; v="$(df -Pm "$DOCKER_ROOT" 2>/dev/null | awk 'NR==2{print $4}' || true)"; echo "${v:-99999}"; }
MIN_FREE_MB="${MIN_FREE_MB:-3000}"
if [ "$(free_mb)" -lt "$MIN_FREE_MB" ]; then
  warn "Diskda bo'sh joy kam ($(free_mb) MB < ${MIN_FREE_MB} MB): docker keshi tozalanmoqda…"
  docker builder prune -af >/dev/null 2>&1 || true
  docker image prune -af   >/dev/null 2>&1 || true
  [ "$(free_mb)" -ge "$MIN_FREE_MB" ] || die "Diskda hali ham joy yetarli emas ($(free_mb) MB). 'df -h' va 'docker system df' bilan tekshiring; log/zaxira fayllarni tozalang."
fi
say "Konteynerlar build qilinib ishga tushirilmoqda (birinchi marta bir necha daqiqa)…"
"${COMPOSE[@]}" up -d --build

# ---- 5. Sog'lik tekshiruvi
say "API tayyor bo'lishi kutilmoqda…"
ok=0
for _ in $(seq 1 60); do
  if "${COMPOSE[@]}" exec -T api node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then ok=1; break; fi
  sleep 2
done
if [ "$ok" -ne 1 ]; then
  "${COMPOSE[@]}" logs --tail=60 api || true
  die "API 2 daqiqada ishga tushmadi. Yuqoridagi loglarni ko'ring (docker compose -f docker-compose.prod.yml logs api)."
fi

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo
# Eski (osilib qolgan) image'lar va 3 kundan eski build keshi — disk to'lib ketmasligi uchun
docker image prune -f >/dev/null 2>&1 || true
docker builder prune -f --filter "until=72h" >/dev/null 2>&1 || true
say "TAYYOR."
if [ -n "$DOMAIN" ]; then
  echo "   Sayt:  https://$DOMAIN"
  echo "   Eslatma: $DOMAIN domeni bu serverning IP manziliga (${IP:-server IP}) yo'naltirilgan bo'lishi (DNS A-yozuv) va 80/443 portlar ochiq bo'lishi kerak."
  echo "   Sertifikat birinchi kirishda bir necha soniyada olinadi (xato bo'lsa: docker compose -f docker-compose.prod.yml -f docker-compose.caddy.yml logs caddy)."
else
  echo "   Sayt:  http://${IP:-<server-ip>}:${WEB_PORT}"
  warn "HTTPS yo'q: parollar shifrlanmasdan uzatiladi. Haqiqiy foydalanish uchun DOMAIN bilan qayta ishga tushiring."
fi
echo "   Birinchi kirishda sozlash ustasi chiqadi (Superadmin yaratiladi)."
[ "$NEW_ENV" = 1 ] && echo "   Maxfiy kalitlar: $ENV_FILE (chmod 600) — zaxira nusxasini xavfsiz joyda saqlang."
echo "   Zaxira nusxa:  sudo ./scripts/backup.sh"
