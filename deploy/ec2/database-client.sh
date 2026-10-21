#!/usr/bin/env bash
# Source after defining DC. Credentials stay in the client's environment.
mysql_site() {
  "${DC[@]}" run --rm --no-deps -T --entrypoint sh db-client -c \
    'exec mysql --default-character-set=utf8mb4 -u "$MYSQL_USER" "$MYSQL_DATABASE" "$@"' sh "$@"
}
dump_site() {
  "${DC[@]}" run --rm --no-deps -T --entrypoint sh db-client -c \
    'exec mysqldump -u "$MYSQL_USER" --single-transaction --no-tablespaces --set-gtid-purged=OFF "$MYSQL_DATABASE"'
}
