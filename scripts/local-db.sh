#!/usr/bin/env bash
# 로컬 개발용 Postgres 16 클러스터를 ./../pgdata 에 만들고 띄운다. (운영 배포에서는 쓰지 않음)
# 사용법: scripts/local-db.sh start | stop | status
set -euo pipefail
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
PGDATA=${PGDATA:-$(cd "$(dirname "$0")/.." && pwd)/../pgdata}
RUNAS=${RUNAS:-postgres}
cmd=${1:-start}
run() { if [ "$(id -u)" = "0" ]; then su "$RUNAS" -c "$*"; else bash -c "$*"; fi; }
case "$cmd" in
  start)
    if [ ! -f "$PGDATA/PG_VERSION" ]; then
      mkdir -p "$PGDATA"; [ "$(id -u)" = "0" ] && chown "$RUNAS" "$PGDATA"
      run "$PGBIN/initdb -D '$PGDATA' -U postgres --auth=trust -E UTF8 --locale=C.UTF-8" >/dev/null
    fi
    run "$PGBIN/pg_ctl -D '$PGDATA' -l '$PGDATA/server.log' -o '-p 5432 -k /tmp' start"
    sleep 1
    psql -h /tmp -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='contact'" | grep -q 1 || psql -h /tmp -U postgres -c "CREATE DATABASE contact;"
    ;;
  stop) run "$PGBIN/pg_ctl -D '$PGDATA' stop" ;;
  status) run "$PGBIN/pg_ctl -D '$PGDATA' status" ;;
  *) echo "usage: $0 start|stop|status"; exit 1 ;;
esac
