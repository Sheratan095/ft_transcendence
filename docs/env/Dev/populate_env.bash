#!/usr/bin/env bash
set -euo pipefail

# Determine root directory (3 levels up from docs/env/Dev/)
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

# Input files to process
INPUT_FILES=("BackendRequiredEnv.txt" "FrontendRequiredEnv.txt" "required_env.txt")

# If an argument is provided, use it as the only input file
if [[ $# -gt 0 ]]; then
    INPUT_FILES=("$1")
fi

echo "Project root: $ROOT_DIR"

for INPUT_FILE_NAME in "${INPUT_FILES[@]}"; do
    # Check if file exists relative to script
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    INPUT_FILE="$SCRIPT_DIR/$INPUT_FILE_NAME"
    
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
