#!/usr/bin/env bash
set -euo pipefail

# Input file (you can change this)
INPUT_FILE="required_env.txt"

# Temporary variables
current_service=""

# backend location
LOCATION="../../backend/"

while IFS= read -r line || [[ -n "$line" ]]; do
    # Trim leading/trailing whitespace
    line="$(echo "$line" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"

    # Skip empty lines
    [[ -z "$line" ]] && continue

    # Detect section header (e.g. "gateway:")
    if [[ "$line" =~ ^([a-zA-Z0-9\/_-]+):$ ]]; then
        current_service="${LOCATION}${BASH_REMATCH[1]}"
        mkdir -p "$current_service"
        : > "$current_service/.env"  # clear previous content
        continue
    fi

    # Ensure we're inside a service block
    [[ -z "$current_service" ]] && continue

    # If line contains '=', write as-is; else treat as a variable name with empty value
    if [[ "$line" == *"="* ]]; then
        echo "$line" >> "$current_service/.env"
    else
        echo "$line=" >> "$current_service/.env"
    fi
done < "$INPUT_FILE"

echo "✅ .env files generated for all services."
