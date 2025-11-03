# Private Nostr Relay via Cloudflare Tunnel (nostr-rs-relay)

Goal: Run a private relay at `wss://relay.yourdomain.com` without renting a server.

## Prereqs
- Docker installed
- Cloudflare account managing `yourdomain.com`
- `cloudflared` installed (`brew install cloudflare/cloudflare/cloudflared` on macOS)

## 1) Run nostr-rs-relay locally
```bash
mkdir -p ~/nrr-data
cat > config.toml <<'CFG'
[server]
host = "0.0.0.0"
port = 8080

[options]
# Replace with allowed hex pubkeys
whitelist = ["HEX_PUBKEY1","HEX_PUBKEY2"]
read = true
write = true
CFG

docker run -d --name nrr --restart=always \
  -p 8080:8080 \
  -v ~/nrr-data:/app/data \
  -v $(pwd)/config.toml:/app/config.toml \
  ghcr.io/scsibug/nostr-rs-relay:latest
```

Verify:
```bash
curl -i http://localhost:8080
```

## 2) Create a Cloudflare Tunnel
```bash
cloudflared tunnel login
cloudflared tunnel create nostr-relay
cloudflared tunnel route dns nostr-relay relay.yourdomain.com
```

Run the tunnel (foreground for testing):
```bash
cloudflared tunnel run --url http://localhost:8080 nostr-relay
```

Now `wss://relay.yourdomain.com` forwards to your local relay.

## 3) Lock it down (optional but recommended)
- Use Cloudflare Access to require login for writes (or restrict by IP).
- Keep `whitelist` in `config.toml` to limit writers by pubkey.

## 4) Wire into the app (read-only first)
- Launch the app with a relay override:
  - `?relay=wss://relay.yourdomain.com` appended to the site URL, or
- Edit `CONFIG.nostrRelayUrl` in `script.js` to your domain.
- Keep publishes off (flag still prevents sending); you’re just reading.

## 5) Post a test note (from your allowed pubkey)
Create a kind-1 note with content JSON:
```json
{
  "type": "dance_event",
  "title": "Loft Night",
  "start": "2025-11-01T21:00:00-04:00",
  "end": "2025-11-02T02:00:00-04:00",
  "city": "New York",
  "venue": "Loft 27",
  "coords": [40.7480, -73.9940],
  "styles": ["house"],
  "price": "20",
  "links": ["https://tickets.example.com/loft"]
}
```
Use tags `t=ydance` and `t=event`.

## 6) Normalize into the Events list (optional demo)
- Deploy the function:
```bash
supabase functions deploy normalize --project-ref <project-ref>
```
- Dry run:
```bash
supabase functions invoke normalize --query dry_run=true
```
- Live:
```bash
supabase functions invoke normalize
```
The UI reads from `normalized_events_latest` automatically.

## Troubleshooting
- Tunnel up but no data: check whitelist pubkeys, tags, and JSON content.
- Browser errors on WebSocket: confirm `wss://relay.yourdomain.com` resolves and `cloudflared` is running.
- Nothing in Events list: run `normalize` live; verify `raw_events` has rows.









