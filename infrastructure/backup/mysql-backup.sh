#!/usr/bin/env bash
set -euo pipefail

mkdir -p /backups
export MYSQL_PWD="${MYSQL_PASSWORD}"

while true; do
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  output="/backups/${MYSQL_DATABASE}-${timestamp}.sql.gz"
  mysqldump \
    --host="${MYSQL_HOST}" \
    --user="${MYSQL_USER}" \
    --single-transaction \
    --no-tablespaces \
    --routines \
    --events \
    "${MYSQL_DATABASE}" | gzip > "${output}"
  find /backups -type f -name '*.sql.gz' -mtime "+${BACKUP_RETENTION_DAYS}" -delete
  sleep "${BACKUP_INTERVAL_SECONDS}"
done
