#!/usr/bin/env bash
set -euo pipefail

# Load .env if present
if [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | xargs -I {} echo {})
fi

RELAY_DOMAIN=${RELAY_DOMAIN:-}
RELAY_TUNNEL_NAME=${RELAY_TUNNEL_NAME:-nostr-relay}
RELAY_PORT=${RELAY_PORT:-8080}

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared not installed. macOS: brew install cloudflare/cloudflare/cloudflared" >&2
  exit 1
fi

# Login if needed
cloudflared tunnel login || true

# Create tunnel if missing
if ! cloudflared tunnel list | grep -q "${RELAY_TUNNEL_NAME}"; then
  cloudflared tunnel create "${RELAY_TUNNEL_NAME}"
fi

# Create DNS CNAME for subdomain
if [ -n "$RELAY_DOMAIN" ]; then
  cloudflared tunnel route dns "${RELAY_TUNNEL_NAME}" "$RELAY_DOMAIN"
else
  echo "Set RELAY_DOMAIN in .env to create DNS record automatically." >&2
fi

# Run the tunnel (foreground)
exec cloudflared tunnel run --url http://localhost:${RELAY_PORT} "${RELAY_TUNNEL_NAME}"









