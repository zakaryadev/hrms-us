#!/usr/bin/env bash
# HRMS — Webhook serverini o'rnatish va systemd service sifatida ishga tushirish.
#
# Foydalanish:
#   ssh root@<server-ip>
#   cd /opt/hrms
#   WEBHOOK_SECRET="sizning_maxfiy_kalit" bash scripts/setup-webhook.sh
#
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}") / .." && pwd)"
SERVICE_NAME="hrms-webhook"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
WEBHOOK_PORT="${WEBHOOK_PORT:-9000}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
WEBHOOK_SECRET="${WEBHOOK_SECRET:-}"
LOG_FILE="/var/log/hrms-deploy.log"

say()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31mXATO:\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "root huquqi kerak: sudo bash scripts/setup-webhook.sh"

# Node.js borligini tekshirish
command -v node >/dev/null 2>&1 || {
  say "Node.js o'rnatilmoqda..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
}

say "Node.js: $(node -v)"

# Log fayli
touch "$LOG_FILE"
chmod 644 "$LOG_FILE"

# systemd service fayli
say "systemd service yaratilmoqda: $SERVICE_FILE"
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=HRMS GitHub Webhook Deploy Server
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
WorkingDirectory=${REPO_DIR}
ExecStart=/usr/bin/node ${REPO_DIR}/scripts/webhook.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

# Muhit o'zgaruvchilari
Environment=WEBHOOK_PORT=${WEBHOOK_PORT}
Environment=DEPLOY_BRANCH=${DEPLOY_BRANCH}
Environment=REPO_DIR=${REPO_DIR}
Environment=LOG_FILE=${LOG_FILE}
$([ -n "$WEBHOOK_SECRET" ] && echo "Environment=WEBHOOK_SECRET=${WEBHOOK_SECRET}" || echo "# WEBHOOK_SECRET o'rnatilmagan — tavsiya etilmaydi!")

[Install]
WantedBy=multi-user.target
EOF

# UFW: portni ochish (agar faol bo'lsa)
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow "${WEBHOOK_PORT}/tcp" >/dev/null
  say "ufw: ${WEBHOOK_PORT} porti ochildi"
fi

# Serviceni ishga tushirish
say "Service ishga tushirilmoqda..."
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"
sleep 2

# Holat tekshiruvi
if systemctl is-active --quiet "$SERVICE_NAME"; then
  say "✅ ${SERVICE_NAME} muvaffaqiyatli ishga tushdi!"
else
  systemctl status "$SERVICE_NAME" --no-pager || true
  die "Service ishga tushmadi. Yuqoridagi xatoni ko'ring."
fi

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 HRMS Webhook Server tayyor!"
echo ""
echo "  Webhook URL:  http://${IP}:${WEBHOOK_PORT}/webhook"
echo "  Sog'lik:      http://${IP}:${WEBHOOK_PORT}/health"
echo "  Log:          journalctl -u ${SERVICE_NAME} -f"
echo "              tail -f ${LOG_FILE}"
echo ""
echo "  GitHub'da sozlash:"
echo "  → Repo → Settings → Webhooks → Add webhook"
echo "  → Payload URL: http://${IP}:${WEBHOOK_PORT}/webhook"
echo "  → Content type: application/json"
echo "  → Secret: ${WEBHOOK_SECRET:-<bo'sh - tavsiya etilmaydi>}"
echo "  → Events: Just the push event ✓"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
