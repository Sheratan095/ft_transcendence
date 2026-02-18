#!/usr/bin/env bash
set -euo pipefail

# Run the project's Prod env generator then start docker compose.
# Usage: ./start_prod.sh [docker-compose-args]

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
POPULATE_SCRIPT="$ROOT_DIR/docs/env/Prod/populate_env.bash"

if [[ ! -f "$POPULATE_SCRIPT" ]]; then
  echo "Error: populate script not found at $POPULATE_SCRIPT" >&2
  exit 1
fi

echo "Generating .env files from docs/env/Prod..."
"$POPULATE_SCRIPT"

echo "Running: docker compose up $*"
docker compose up "$@"
