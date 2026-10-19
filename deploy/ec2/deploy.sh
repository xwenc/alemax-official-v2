#!/usr/bin/env bash
# Run from any directory on the EC2 host after configuring .env.ec2.
set -euo pipefail
ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$ROOT"
ENV_FILE=${ENV_FILE:-$ROOT/.env.ec2}
[[ -f "$ENV_FILE" ]] || { echo 'Missing .env.ec2; copy deploy/ec2/ec2.env.example first.' >&2; exit 1; }
exec 9>"$ROOT/.deploy.lock"
flock -n 9 || { echo 'Another deployment or backup is running.' >&2; exit 1; }
DC=(docker compose --env-file "$ENV_FILE" -f "$ROOT/compose.ec2.yaml")
"${DC[@]}" config --format json | python3 deploy/ec2/validate-env.py
# Build first so failed builds leave the current containers running.
"${DC[@]}" build
"${DC[@]}" up -d --wait --wait-timeout 240
PORT=$("${DC[@]}" port web 3000)
# Exercise actual CMS-backed pages, not just a responding Node process.
for path in /admin /en /es; do
    curl --fail --silent --show-error --retry 5 --retry-delay 3 --retry-all-errors \
        --max-time 30 --output /dev/null "http://$PORT$path"
done
"${DC[@]}" ps
REVISION=$(git -c safe.directory="$ROOT" rev-parse HEAD)
printf 'Deployment verified: %s\n' "$REVISION"
