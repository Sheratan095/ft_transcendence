#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

populate_env()
{
  # Directory containing the input env definition files
  ENV_DIR="$ROOT_DIR/docs/env/Prod"

  # Input files to process
  INPUT_FILES=("BackendRequiredEnv.txt" "FrontendRequiredEnv.txt" "required_env.txt")

  # If an argument is provided, use it as the only input file
  if [[ $# -gt 0 ]]; then
      INPUT_FILES=("$1")
  fi

  echo "Project root: $ROOT_DIR"

  for INPUT_FILE_NAME in "${INPUT_FILES[@]}"; do
      # Check if file exists relative to env dir
      INPUT_FILE="$ENV_DIR/$INPUT_FILE_NAME"
      
      if [[ ! -f "$INPUT_FILE" ]]; then
          # Check if it was meant to be an absolute path or relative to CWD
          if [[ -f "$INPUT_FILE_NAME" ]]; then
              INPUT_FILE="$INPUT_FILE_NAME"
          else
              [[ "$INPUT_FILE_NAME" == "required_env.txt" ]] || echo "⚠️ Skipping $INPUT_FILE_NAME: File not found"
              continue
          fi
      fi

      echo "Reading from $INPUT_FILE..."

      # Temporary variables
      current_service_path=""

      while IFS= read -r line || [[ -n "$line" ]]; do
          # Trim leading/trailing whitespace
          line="$(echo "$line" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"

          # Skip empty lines
          [[ -z "$line" ]] && continue

          # Detect section header (e.g. "gateway:", "services/auth:", "frontend:", "backend/gateway:")
          if [[ "$line" =~ ^([a-zA-Z0-9\/._-]+):$ ]]; then
              service_name="${BASH_REMATCH[1]}"
              
              # Determine target directory
              if [[ "$service_name" == "frontend" ]]; then
                  current_service_path="$ROOT_DIR/frontend"
              elif [[ "$service_name" == "gateway" || "$service_name" == services/* ]]; then
                  current_service_path="$ROOT_DIR/backend/$service_name"
              elif [[ "$service_name" == backend/* ]] || [[ "$service_name" == frontend/* ]]; then
                  current_service_path="$ROOT_DIR/$service_name"
              else
                  # Default behavior: treat as relative to root
                  current_service_path="$ROOT_DIR/$service_name"
              fi

              mkdir -p "$current_service_path"
              echo "  Updating $current_service_path/.env"
              : > "$current_service_path/.env"  # clear previous content
              continue
          fi

          # Ensure we're inside a service block
          [[ -z "$current_service_path" ]] && continue

          # If line contains '=', write as-is; else treat as a variable name with empty value
          if [[ "$line" == *"="* ]]; then
              echo "$line" >> "$current_service_path/.env"
          else
              echo "$line=" >> "$current_service_path/.env"
          fi
      done < "$INPUT_FILE"
  done

  echo "✅ .env files synchronization complete."
}

# Run population
populate_env
exit 0 # TO DO REMOVE

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

# Generate tailwind.css for production build
echo "Generating tailwind.css for production..."

# Ensure an output file exists so downstream steps don't fail
TAILWIND_OUT="$ROOT_DIR/frontend/tailwind.css"
if [[ ! -f "$TAILWIND_OUT" ]]; then
  mkdir -p "$(dirname "$TAILWIND_OUT")"
  cat > "$TAILWIND_OUT" <<'EOF'
/* Tailwind CSS output — generated for production
   This file is intentionally empty and will be populated by the build process.
*/
EOF
  echo "Created empty $TAILWIND_OUT"
fi

echo "Running: docker compose up $*"
docker compose up "$@"
