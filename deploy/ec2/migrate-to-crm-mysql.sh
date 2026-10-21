#!/usr/bin/env bash
# Move the existing production site's schema into the dedicated CRM-hosted schema.
# Requires the target schema/account to have been created first. Never touches CRM tables.
set -euo pipefail
umask 077
ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$ROOT"
ENV_FILE=${ENV_FILE:-$ROOT/.env.ec2}
DC=(docker compose --env-file "$ENV_FILE" -f "$ROOT/compose.ec2.yaml")
source "$ROOT/deploy/ec2/database-client.sh"
exec 9>"$ROOT/.deploy.lock"
flock -n 9 || { echo 'Another deployment or backup is running.' >&2; exit 1; }
"${DC[@]}" --profile maintenance config --format json | python3 deploy/ec2/validate-env.py
OLD=alemax-official-db-1
[[ $(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project" }}' "$OLD") == alemax-official ]]
[[ $(docker inspect -f '{{ index .Config.Labels "com.docker.compose.service" }}' "$OLD") == db ]]
[[ $(docker inspect -f '{{.State.Running}}' "$OLD") == true ]]
# Refuse the old server as the destination, even if it has been connected to the shared network.
SOURCE_UUID=$(docker exec "$OLD" sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -N -s -u "$MYSQL_USER" "$MYSQL_DATABASE" -e "SELECT @@server_uuid"')
TARGET_UUID=$(mysql_site -N -s -e 'SELECT @@server_uuid')
[[ "$SOURCE_UUID" != "$TARGET_UUID" ]] || { echo 'Source and target are the same MySQL server.' >&2; exit 1; }
[[ $(mysql_site -N -s -e 'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()') == 0 ]] \
  || { echo 'Target database is not empty. Refusing to overwrite it.' >&2; exit 1; }
# Build before the maintenance window. Existing applications keep running during build.
"${DC[@]}" --parallel 1 --progress plain build
DEST="$ROOT/backups/shared-mysql-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$DEST"
echo "Migration backup: $DEST"
"${DC[@]}" stop web worker api
# On failure leave writes stopped; the original server and its data volume remain intact.
trap 'echo "Migration interrupted. Keep site writes stopped; see docs/shared-crm-mysql.md for recovery. Backup: $DEST" >&2' ERR
docker exec "$OLD" sh -c \
 'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump -u "$MYSQL_USER" --single-transaction --no-tablespaces --set-gtid-purged=OFF "$MYSQL_DATABASE"' \
 | gzip > "$DEST/database.sql.gz"
"${DC[@]}" run --rm --no-deps -T --entrypoint tar api -C /app/uploads -czf - . > "$DEST/uploads.tar.gz"
gzip -t "$DEST/database.sql.gz"
tar -tzf "$DEST/uploads.tar.gz" > /dev/null
(cd "$DEST" && sha256sum database.sql.gz uploads.tar.gz > SHA256SUMS)
# Generate counts for every table, including future tables. SQL identifiers are escaped by MySQL.
docker exec "$OLD" sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -N -s -u "$MYSQL_USER" "$MYSQL_DATABASE" -e '\''SELECT CONCAT("SELECT ", QUOTE(table_name), ", COUNT(*) FROM `", REPLACE(table_name,"`","``"), "`;") FROM information_schema.tables WHERE table_schema=DATABASE() ORDER BY table_name'\''' > "$DEST/counts.sql"
[[ -s "$DEST/counts.sql" ]] || { echo 'Source has no tables; refusing migration.' >&2; exit 1; }
docker exec -i "$OLD" sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -N -B -u "$MYSQL_USER" "$MYSQL_DATABASE"' < "$DEST/counts.sql" > "$DEST/source-counts.tsv"
gzip -dc "$DEST/database.sql.gz" | mysql_site
mysql_site -N -B < "$DEST/counts.sql" > "$DEST/target-counts.tsv"
cmp "$DEST/source-counts.tsv" "$DEST/target-counts.tsv"
# Release lock so normal deployment can acquire it and check actual public pages.
flock -u 9
ENV_FILE="$ENV_FILE" bash "$ROOT/deploy/ec2/deploy.sh"
# Stop only the verified legacy website server after the new application passes checks.
docker update --restart=no "$OLD" > /dev/null
docker stop "$OLD" > /dev/null
trap - ERR
echo 'Migration verified. Legacy website MySQL is stopped, restart disabled; old volume retained.'
echo "Backup: $DEST"
