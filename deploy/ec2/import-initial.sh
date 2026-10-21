#!/usr/bin/env bash
# First deployment only: refuses an existing schema or running application.
set -euo pipefail
umask 077
ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$ROOT"
BUNDLE=${1:?Usage: bash deploy/ec2/import-initial.sh /absolute/path/to/migration-bundle}
BUNDLE=$(cd -- "$BUNDLE" && pwd)
ENV_FILE=${ENV_FILE:-$ROOT/.env.ec2}
DC=(docker compose --env-file "$ENV_FILE" -f "$ROOT/compose.ec2.yaml")
source "$ROOT/deploy/ec2/database-client.sh"
"${DC[@]}" --profile maintenance config --format json | python3 "$ROOT/deploy/ec2/validate-env.py"
exec 9>"$ROOT/.deploy.lock"
flock -n 9 || { echo 'Deployment or backup is running.' >&2; exit 1; }
python3 - "$BUNDLE" <<'PY'
import hashlib, json, pathlib, sys, tarfile
bundle = pathlib.Path(sys.argv[1])
checks = (bundle / 'SHA256SUMS').read_text().splitlines()
expected = {'database.mysql.sql', 'uploads.tar.gz', 'manifest.json'}
seen = set()
for line in checks:
    digest, name = line.split('  ', 1)
    if name not in expected or name in seen:
        raise SystemExit('Invalid checksum manifest')
    if hashlib.sha256((bundle / name).read_bytes()).hexdigest() != digest:
        raise SystemExit('Checksum mismatch: ' + name)
    seen.add(name)
if seen != expected:
    raise SystemExit('Missing checksums')
manifest = json.loads((bundle / 'manifest.json').read_text())
found = {}
with tarfile.open(bundle / 'uploads.tar.gz') as archive:
    for member in archive:
        path = pathlib.PurePosixPath(member.name)
        if not member.isfile() or path.is_absolute() or '..' in path.parts or member.name in found:
            raise SystemExit('Unsafe upload archive member')
        found[member.name] = hashlib.sha256(archive.extractfile(member).read()).hexdigest()
if found != manifest['uploads']:
    raise SystemExit('Upload manifest mismatch')
print('Bundle checksums and uploads verified.')
PY
RUNNING_SERVICES=$("${DC[@]}" ps --status running --services)
while IFS= read -r SERVICE; do
    case "$SERVICE" in
        api|web|worker) echo 'Stop api/web/worker before initial import.' >&2; exit 1 ;;
    esac
done <<< "$RUNNING_SERVICES"
TABLE_COUNT=$(mysql_site -N -s -e 'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()')
[[ "$TABLE_COUNT" == '0' ]] || { echo 'Target database is not empty; refusing to overwrite it.' >&2; exit 1; }
"${DC[@]}" run --rm --no-deps -T --entrypoint python api -c \
 'from pathlib import Path; import sys; sys.exit(1 if any(Path("/app/uploads").iterdir()) else 0)' \
 || { echo 'Uploads volume is not empty; refusing to overwrite it.' >&2; exit 1; }
"${DC[@]}" run --rm --no-deps -T --entrypoint tar api -C /app/uploads -xzf - < "$BUNDLE/uploads.tar.gz"
mysql_site < "$BUNDLE/database.mysql.sql"
python3 - "$BUNDLE/manifest.json" <<'PY' > "$ROOT/.migration-counts.sql"
import json,sys
for table, count in json.load(open(sys.argv[1]))['tables'].items():
    if table not in {'cms_content','cms_translation_jobs','inquiries','cms_site_seo','site_visit_days','site_visit_keys'}:
        raise SystemExit('Unexpected table')
    print(f"SELECT '{table}' AS table_name, COUNT(*) AS actual_rows, {int(count)} AS expected_rows FROM `{table}`;")
PY
trap 'rm -f "$ROOT/.migration-counts.sql"' EXIT
COUNTS=$(mysql_site -N -B < "$ROOT/.migration-counts.sql")
python3 -c '
import sys
for line in sys.argv[1].splitlines():
    table, actual, expected = line.split("\t")
    print(f"{table}: actual_rows={actual} expected_rows={expected}")
    if int(actual) != int(expected):
        raise SystemExit("Row count mismatch; do not start the application")
' "$COUNTS"
echo 'Import finished. Check row counts above, then run deploy/ec2/deploy.sh to start the site.'
