#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Boots a throwaway Postgres cluster, applies every migration in order, loads
# the seed, then runs the RLS isolation tests. Requires initdb/pg_ctl/psql on
# PATH (Debian: /usr/lib/postgresql/16/bin).
#
#   ./supabase/tests/run.sh
#
# Postgres refuses to run as root, so when invoked as root the server itself is
# started as the `postgres` system user while psql connects over the socket.
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PGBIN="${PGBIN:-}"
if [ -z "$PGBIN" ]; then
  for d in /usr/lib/postgresql/*/bin; do [ -x "$d/initdb" ] && PGBIN="$d"; done
fi
export PATH="${PGBIN:+$PGBIN:}$PATH"

for bin in initdb pg_ctl psql createdb; do
  command -v "$bin" >/dev/null || { echo "missing $bin — set PGBIN to your Postgres bin directory" >&2; exit 127; }
done

SERVER_USER="$(id -un)"
RUNAS=()
if [ "$(id -u)" = 0 ]; then
  SERVER_USER=postgres
  RUNAS=(runuser -u postgres --)
fi

WORKDIR="$(mktemp -d /tmp/propercrm-db-XXXXXX)"
chmod 777 "$WORKDIR"
export PGDATA="$WORKDIR/data"
export PGHOST="$WORKDIR/sock"
export PGPORT="${PGPORT:-54329}"
export PGUSER="$SERVER_USER"
export PGDATABASE=propercrm_test
mkdir -p "$PGHOST"
chmod 777 "$PGHOST"
[ "$(id -u)" = 0 ] && chown -R postgres "$WORKDIR"

cleanup() {
  "${RUNAS[@]}" env PGDATA="$PGDATA" pg_ctl -D "$PGDATA" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

echo "→ initdb"
"${RUNAS[@]}" initdb -D "$PGDATA" -U "$SERVER_USER" --auth=trust >/dev/null

echo "→ starting postgres"
"${RUNAS[@]}" pg_ctl -D "$PGDATA" \
  -o "-k $PGHOST -c listen_addresses='' -p $PGPORT" \
  -w -l "$WORKDIR/pg.log" start >/dev/null || { cat "$WORKDIR/pg.log"; exit 1; }

createdb "$PGDATABASE"

PSQL=(psql -v ON_ERROR_STOP=1 --quiet --no-psqlrc -X)

echo "→ supabase shim"
"${PSQL[@]}" -f "$ROOT/supabase/tests/00_supabase_shim.sql" >/dev/null

echo "→ migrations"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "   $(basename "$f")"
  "${PSQL[@]}" -f "$f" >/dev/null
done

echo "→ seed"
"${PSQL[@]}" -f "$ROOT/supabase/seed.sql" >/dev/null

echo "→ rls isolation tests"
"${PSQL[@]}" -f "$ROOT/supabase/tests/rls_test.sql"

echo "✓ all database tests passed"
