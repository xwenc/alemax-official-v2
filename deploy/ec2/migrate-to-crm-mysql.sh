#!/usr/bin/env bash
# Move the existing production site's schema into the dedicated CRM-hosted schema.
# Requires the target schema/account to have been created first. Never touches CRM tables.
set -euo pipefail
umask 077
ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$ROOT"
INPUT=${1:?Usage: bash deploy/ec2/migrate-to-crm-mysql.sh backups/path/database.mysql.sql[.gz]}
# Resolve links and require an explicit backup, never guess which snapshot to restore.
SOURCE=$(python3 - "$ROOT" "$INPUT" <<'PY_SOURCE'
from pathlib import Path
import gzip, sys
root = Path(sys.argv[1]) / 'backups'
path = Path(sys.argv[2]).resolve(strict=True)
if not path.is_relative_to(root.resolve()) or not path.is_file():
    raise SystemExit('Choose a database file inside this project backups directory')
if not (path.name.endswith('.sql') or path.name.endswith('.sql.gz')):
    raise SystemExit('Expected a .sql or .sql.gz file (extract migration bundles first)')
opener = gzip.open if path.name.endswith('.gz') else open
with opener(path, 'rb') as source:
    if not source.read(1):
        raise SystemExit('Database backup is empty')
print(path)
PY_SOURCE
)
ENV_FILE=${ENV_FILE:-$ROOT/.env.ec2}
DC=(docker compose --env-file "$ENV_FILE" -f "$ROOT/compose.ec2.yaml")
source "$ROOT/deploy/ec2/database-client.sh"
exec 9>"$ROOT/.deploy.lock"
flock -n 9 || { echo 'Another deployment or backup is running.' >&2; exit 1; }
"${DC[@]}" --profile maintenance config --format json | python3 deploy/ec2/validate-env.py
OLD=alemax-official-db-1
# A previously removed legacy container is not required for backup imports.
OLD_EXISTS=false
if docker container inspect "$OLD" > /dev/null 2>&1; then
    [[ $(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project" }}' "$OLD") == alemax-official ]]
    [[ $(docker inspect -f '{{ index .Config.Labels "com.docker.compose.service" }}' "$OLD") == db ]]
    OLD_EXISTS=true
    if [[ $(docker inspect -f '{{.State.Running}}' "$OLD") == true ]]; then
        SOURCE_UUID=$(docker exec "$OLD" sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -N -s -u "$MYSQL_USER" "$MYSQL_DATABASE" -e "SELECT @@server_uuid"')
        TARGET_UUID=$(mysql_site -N -s -e 'SELECT @@server_uuid')
        [[ "$SOURCE_UUID" != "$TARGET_UUID" ]] || { echo 'Target must be the CRM MySQL server.' >&2; exit 1; }
    fi
fi
[[ $(mysql_site -N -s -e 'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()') == 0 ]] \
  || { echo 'Target database is not empty. Refusing to overwrite it.' >&2; exit 1; }
# Build before the maintenance window. Existing applications keep running during build.
"${DC[@]}" --parallel 1 --progress plain build
DEST="$ROOT/backups/shared-mysql-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$DEST"
echo "Database source: $SOURCE"
echo "Migration record: $DEST"
# Freeze and validate the chosen SQL before stopping the site or changing the target.
python3 "$ROOT/deploy/ec2/prepare-database-backup.py" "$SOURCE" "$DEST"
"${DC[@]}" stop web worker api
trap 'echo "Migration interrupted. Keep site writes stopped; see docs/shared-crm-mysql.md for recovery. Record: $DEST" >&2' ERR
"${DC[@]}" run --rm --no-deps -T --entrypoint tar api -C /app/uploads -czf - . > "$DEST/uploads.tar.gz"
tar -tzf "$DEST/uploads.tar.gz" > /dev/null
(cd "$DEST" && sha256sum database.sql.gz uploads.tar.gz > SHA256SUMS)
gzip -dc "$DEST/database.sql.gz" | mysql_site
# Always require the core site tables. When a manifest exists, also verify its row counts.
mysql_site -N -B -e 'SELECT COUNT(*) FROM cms_content; SELECT COUNT(*) FROM cms_translation_jobs; SELECT COUNT(*) FROM inquiries;' > "$DEST/core-counts.txt"
if [[ -s "$DEST/counts.sql" ]]; then
    mysql_site -N -B < "$DEST/counts.sql" > "$DEST/target-counts.tsv"
    cmp "$DEST/expected-counts.tsv" "$DEST/target-counts.tsv"
else
    echo 'No manifest.json supplied: SQL import and core tables checked; original row counts unavailable.'
fi
# Release lock so normal deployment can acquire it and check actual public pages.
flock -u 9
ENV_FILE="$ENV_FILE" bash "$ROOT/deploy/ec2/deploy.sh"
# Stop only the verified legacy website server after the new application passes checks.
if [[ "$OLD_EXISTS" == true ]]; then
    docker update --restart=no "$OLD" > /dev/null
    docker stop "$OLD" > /dev/null
fi
trap - ERR
echo 'Backup import verified. Legacy website MySQL stopped if present; old volume retained.'
echo "Backup: $DEST"
