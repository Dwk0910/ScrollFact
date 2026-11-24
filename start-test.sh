#!/bin/sh
set -eu
cd "$(dirname "$0")"
export SCROLLFACT_PORT="${SCROLLFACT_PORT:-8080}"
if ! docker info >/dev/null 2>&1; then
  echo 'Start Docker Desktop, then run this script again.' >&2
  exit 1
fi
docker compose up --build -d --wait --wait-timeout 180
printf '\nScrollFact: http://127.0.0.1:%s\n' "$SCROLLFACT_PORT"
