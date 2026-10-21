#!/usr/bin/env bash
# A coordinated DB + uploads snapshot. Stops content writes briefly.
set -euo pipefail
umask 077
ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$ROOT"
ENV_FILE=${ENV_FILE:-$ROOT/.env.ec2}
DC=(docker compose --env-file "$ENV_FILE" -f "$ROOT/compose.ec2.yaml")
source "$ROOT/deploy/ec2/database-client.sh"
"${DC[@]}" --profile maintenance config --format json | python3 "$ROOT/deploy/ec2/validate-env.py"
exec 9>"$ROOT/.deploy.lock"
flock -n 9 || { echo 'Another deployment or backup is running.' >&2; exit 1; }
DEST="$ROOT/backups/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$DEST"
mysql_site -N -s -e "SELECT 1" > /dev/null
# Stop the web first so no request can change content while backing up.
"${DC[@]}" stop web worker api
resume() { "${DC[@]}" start api worker web; }
trap resume EXIT
dump_site | gzip > "$DEST/database.sql.gz"
"${DC[@]}" run --rm --no-deps -T --entrypoint tar api -C /app/uploads -czf - . > "$DEST/uploads.tar.gz"
test -s "$DEST/database.sql.gz"
gzip -t "$DEST/database.sql.gz"
tar -tzf "$DEST/uploads.tar.gz" > /dev/null
git -c safe.directory="$ROOT" rev-parse HEAD > "$DEST/commit.txt"
(cd "$DEST" && sha256sum database.sql.gz uploads.tar.gz > SHA256SUMS)
printf 'Backup created: %s — copy off-host and test restoration.\n' "$DEST"
