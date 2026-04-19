# Operations Runbook

Monitoring configuration and incident policy are maintained in `docs/ops/oneuptime-monitoring.md`.

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
- `OVERPASS_EXTRACT_URL` (download source for `scripts/ops/download_extract.ts`)

## 2) One-Time Germany Extract Cache

```bash
bun --env-file=infra/docker/.env scripts/ops/download_extract.ts
```

Optional explicit refresh:

```bash
bun --env-file=infra/docker/.env scripts/ops/download_extract.ts --force-refresh
```

Optional metadata refresh only (no full file download):

```bash
bun --env-file=infra/docker/.env scripts/ops/download_extract.ts --refresh-metadata
```

## 3) Start Stack

```bash
bun --env-file=infra/docker/.env scripts/ops/start_stack.ts
```

This script creates `${TRAEFIK_ACME_ROOT}/acme.json` with restrictive permissions if missing.

Image/runtime note:

- Overpass is pinned to `wiktorn/overpass-api:0.7.62` in Compose for stable, repeatable production behavior on a maintained image line.
- Compose enforces `platform: linux/amd64` for Overpass to keep Mac ARM hosts compatible via Docker emulation; expect lower performance versus native ARM execution.

## 4) Verify Query And Update Signals

```bash
bun --env-file=infra/docker/.env tests/smoke/run_smoke.ts
bun --env-file=infra/docker/.env scripts/ops/check_update_lag.ts
```

Manual checks (useful when isolating a failing smoke step):

```bash
bun --env-file=infra/docker/.env tests/smoke/offline_validation.ts
bun --env-file=infra/docker/.env scripts/ops/verify_query.ts
bun --env-file=infra/docker/.env scripts/ops/check_replication.ts
```

For Traefik-only deployments, set an explicit base URL:

```bash
OVERPASS_BASE_URL="https://overpass.fixmycity.de" bun --env-file=infra/docker/.env tests/smoke/run_smoke.ts
OVERPASS_BASE_URL="https://overpass.fixmycity.de" bun --env-file=infra/docker/.env scripts/ops/check_update_lag.ts
```

## 5) Stop Stack

```bash
bun --env-file=infra/docker/.env scripts/ops/stop_stack.ts
```

## Recovery Notes

- If startup is interrupted during heavy import/update, capture logs and preserve DB volume before retry.
- Prefer restoring a local snapshot over re-downloading large upstream artifacts.
- If ACME fails, confirm DNS points to this host and ports `80/443` are reachable before retrying.

## Traefik Troubleshooting

- Increase Traefik logging temporarily by setting `TRAEFIK_LOG_LEVEL=INFO`.
- Keep dashboard disabled in normal operation; if temporarily enabling it, also keep `TRAEFIK_API_INSECURE=false` and expose access only through host firewall policy.
- Confirm only intended services are public by checking `traefik.enable` labels and `--providers.docker.exposedbydefault=false`.
