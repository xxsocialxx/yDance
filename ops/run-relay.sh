#!/usr/bin/env bash
set -euo pipefail

# Load .env if present
if [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | xargs -I {} echo {})
fi

RELAY_PORT=${RELAY_PORT:-8080}
RELAY_WHITELIST_HEX=${RELAY_WHITELIST_HEX:-}
DATA_DIR=${DATA_DIR:-$HOME/nrr-data}
CONFIG_FILE=${CONFIG_FILE:-$(pwd)/ops/relay-config.toml}

mkdir -p "$DATA_DIR"

# Write config.toml dynamically if not present
if [ ! -f "$CONFIG_FILE" ]; then
  cat > "$CONFIG_FILE" <<CFG
[server]
host = "0.0.0.0"
port = ${RELAY_PORT}

[options]
whitelist = [$(echo "$RELAY_WHITELIST_HEX" | awk -F, '{for(i=1;i<=NF;i++) printf"\"%s\"%s", $i, (i<NF?",":"") }')]
read = true
write = true
CFG
fi

# Run relay via Docker
docker rm -f nrr 2>/dev/null || true
exec docker run -d --name nrr --restart=always \
  -p ${RELAY_PORT}:${RELAY_PORT} \
  -v "${DATA_DIR}:/app/data" \
  -v "${CONFIG_FILE}:/app/config.toml" \
  scsibug/nostr-rs-relay:latest
