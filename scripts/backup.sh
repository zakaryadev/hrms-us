#!/usr/bin/env bash
# HRMS zaxira nusxasi: PostgreSQL (pg_dump) + yuklangan/yaratilgan fayllar.
#   sudo ./scripts/backup.sh                       # /var/backups/hrms ga yozadi
#   BACKUP_DIR=/mnt/disk KEEP=30 sudo -E ./scripts/backup.sh
# Cron (har kuni 03:15):  15 3 * * *  cd /opt/hrms && ./scripts/backup.sh >> /var/log/hrms-backup.log 2>&1
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; cd "$ROOT"
DIR="${BACKUP_DIR:-/var/backups/hrms}"; KEEP="${KEEP:-14}"
ENV_FILE="$ROOT/.env.prod"
[ -f "$ENV_FILE" ] || { echo "XATO: .env.prod topilmadi" >&2; exit 1; }

COMPOSE=(docker compose -f docker-compose.prod.yml)
grep -qE '^DOMAIN=.+' "$ENV_FILE" && COMPOSE+=(-f docker-compose.caddy.yml)
COMPOSE+=(--env-file "$ENV_FILE")

mkdir -p "$DIR"; chmod 700 "$DIR"
TS="$(date +%F-%H%M%S)"
DB="$DIR/db-$TS.sql.gz"; FILES="$DIR/files-$TS.tar.gz"
trap 'rm -f "$DB.part" "$FILES.part"' EXIT   # xato bo'lsa yarim yozilgan fayllar qolmasin

# Yarim yozilgan fayl "yaroqli zaxira" bo'lib qolmasligi uchun: avval .part ga, muvaffaqiyatda nomlanadi
"${COMPOSE[@]}" exec -T db pg_dump -U hrms --clean --if-exists hrms | gzip > "$DB.part"
gzip -t "$DB.part" && [ -s "$DB.part" ] && mv "$DB.part" "$DB"
"${COMPOSE[@]}" exec -T api tar -C /data -czf - uploads generated > "$FILES.part"
tar -tzf "$FILES.part" >/dev/null && mv "$FILES.part" "$FILES"
chmod 600 "$DB" "$FILES"

# Eskilarini o'chirish (oxirgi $KEEP tasi qoladi)
for pattern in 'db-*.sql.gz' 'files-*.tar.gz'; do
  find "$DIR" -maxdepth 1 -name "$pattern" -type f -printf '%T@ %p\n' | sort -rn | tail -n +$((KEEP + 1)) | cut -d' ' -f2- | xargs -r rm -f
done
echo "OK: $DB ($(du -h "$DB" | cut -f1)), $FILES ($(du -h "$FILES" | cut -f1))"
