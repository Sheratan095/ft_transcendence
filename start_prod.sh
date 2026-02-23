#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
POPULATE_SCRIPT="$ROOT_DIR/docs/env/Prod/populate_env.bash"

if [[ ! -f "$POPULATE_SCRIPT" ]]; then
  echo "Error: populate script not found at $POPULATE_SCRIPT" >&2
  exit 1
fi

echo "Generating .env files from docs/env/Prod..."
"$POPULATE_SCRIPT"

FRONTEND_CERT_DIR="$ROOT_DIR/frontend/certs/certs"
BACKEND_CERT_DIR="$ROOT_DIR/backend/certs"
GEN_SCRIPT="$ROOT_DIR/frontend/certs/generate-certs.sh"

if [[ ! -f "$FRONTEND_CERT_DIR/cert.pem" || ! -f "$FRONTEND_CERT_DIR/key.pem" ]]; then
  mkdir -p "$FRONTEND_CERT_DIR"
  mkdir -p "$BACKEND_CERT_DIR"

  if command -v openssl >/dev/null 2>&1; then
    echo "Generating self-signed certs in $FRONTEND_CERT_DIR using openssl..."
    # Run openssl from inside the target dir and write relative filenames to avoid
    # MSYS/Git Bash path-conversion problems with absolute paths.
    (cd "$FRONTEND_CERT_DIR" && MSYS_NO_PATHCONV=1 openssl req -x509 -newkey rsa:2048 -nodes \
      -keyout key.pem \
      -out cert.pem \
      -days 365 -subj "/CN=localhost")
  elif [[ -x "$GEN_SCRIPT" || -f "$GEN_SCRIPT" ]]; then
    echo "OpenSSL not found, falling back to $GEN_SCRIPT"
    (cd "$ROOT_DIR/frontend/certs" && bash generate-certs.sh)
  else
    echo "Error: no method to generate TLS certs (openssl missing and $GEN_SCRIPT not found)." >&2
    echo "Please create $FRONTEND_CERT_DIR/cert.pem and key.pem before running the script." >&2
    exit 1
  fi

  # Ensure backend has copies (only copy if destination missing)
  cp -n "$FRONTEND_CERT_DIR/cert.pem" "$BACKEND_CERT_DIR/" || true
  cp -n "$FRONTEND_CERT_DIR/key.pem" "$BACKEND_CERT_DIR/" || true
fi

# Verify backend certificate/key pair matches; if not, replace backend with generated pair.
certs_match() {
  local dir="$1"
  (cd "$dir" || return 2
   if ! command -v openssl >/dev/null 2>&1; then return 2; fi
   # compute modulus hash for cert and key
   cert_mod=$(MSYS_NO_PATHCONV=1 openssl x509 -noout -modulus -in cert.pem 2>/dev/null | openssl md5 2>/dev/null) || return 2
   key_mod=$(MSYS_NO_PATHCONV=1 openssl rsa -noout -modulus -in key.pem 2>/dev/null | openssl md5 2>/dev/null) || return 2
   [[ "$cert_mod" == "$key_mod" ]]
  )
}

if [[ -f "$BACKEND_CERT_DIR/cert.pem" && -f "$BACKEND_CERT_DIR/key.pem" ]]; then
  if certs_match "$BACKEND_CERT_DIR"; then
    echo "Backend cert/key pair OK."
  else
    echo "Backend cert/key mismatch — replacing with generated frontend certs."
    cp -f "$FRONTEND_CERT_DIR/cert.pem" "$BACKEND_CERT_DIR/"
    cp -f "$FRONTEND_CERT_DIR/key.pem" "$BACKEND_CERT_DIR/"
  fi
else
  # Ensure backend has the generated ones
  cp -f "$FRONTEND_CERT_DIR/cert.pem" "$BACKEND_CERT_DIR/"
  cp -f "$FRONTEND_CERT_DIR/key.pem" "$BACKEND_CERT_DIR/"
fi

if command -v docker >/dev/null 2>&1; then
  echo "Cleaning Docker: stopping/removing containers and pruning system..."
  docker stop $(docker ps -aq) 2>/dev/null || true
  docker rm $(docker ps -aq) 2>/dev/null || true
  docker system prune -a --volumes -f || true
else
  echo "Warning: docker not found in PATH; skipping Docker cleanup." >&2
fi

echo "Running: docker compose up $*"
docker compose up "$@"
