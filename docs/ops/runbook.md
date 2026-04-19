# Operations Runbook

## 1) Initialize Environment

```bash
cp infra/docker/.env.example infra/docker/.env
```

Edit `infra/docker/.env` for host-specific paths and routing settings.
Minimum required values for Traefik deployments:

- `OVERPASS_DOMAIN`
- `TRAEFIK_ACME_EMAIL`
- `OVERPASS_ALLOWED_CIDRS`

Required:

- `OVERPASS_BASE_URL` (used by smoke and lag scripts)
- `OVERPASS_EXTRACT_URL` (download source for `ops:download-extract`)

## 2) One-Time Germany Extract Cache

```bash
bun run ops:download-extract
```

Optional explicit refresh:

```bash
bun run ops:download-extract --force-refresh
```

Optional metadata refresh only (no full file download):

```bash
bun run ops:download-extract --refresh-metadata
```

## 3) Start Stack

```bash
bun run ops:start-stack
```

This script creates `${TRAEFIK_ACME_ROOT}/acme.json` with restrictive permissions if missing.

## 4) Verify Query And Update Signals

```bash
bun run smoke:run
bun run ops:check-update-lag
```

Manual checks (useful when isolating a failing smoke step):

```bash
bun run smoke:offline
bun run ops:verify-query
bun run ops:check-replication
```

For Traefik-only deployments, set an explicit base URL:

```bash
OVERPASS_BASE_URL="https://overpass.fixmycity.de" bun run smoke:run
OVERPASS_BASE_URL="https://overpass.fixmycity.de" bun run ops:check-update-lag
```

## 5) Stop Stack

```bash
bun run ops:stop-stack
```

## Recovery Notes

- If startup is interrupted during heavy import/update, capture logs and preserve DB volume before retry.
- Prefer restoring a local snapshot over re-downloading large upstream artifacts.
- If ACME fails, confirm DNS points to this host and ports `80/443` are reachable before retrying.

## Traefik Troubleshooting

- Increase Traefik logging temporarily by setting `TRAEFIK_LOG_LEVEL=INFO`.
- Keep dashboard disabled in normal operation; if temporarily enabling it, also keep `TRAEFIK_API_INSECURE=false` and expose access only through host firewall policy.
- Confirm only intended services are public by checking `traefik.enable` labels and `--providers.docker.exposedbydefault=false`.
