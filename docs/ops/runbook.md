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
- `OVERPASS_PLANET_URL` (protected Geofabrik source URL)
- `USE_OAUTH_COOKIE_CLIENT` (set to `yes` for oauth cookie refresh flow)
- `OVERPASS_OAUTH_USER`
- `OVERPASS_OAUTH_PASSWORD`

For `OVERPASS_RATE_LIMIT` policy, rationale for the configured value, and tuning guidance, see `docs/security/overpass-resource-policy-evaluation.md`.

## 2) Configure OAuth Credentials

Set these values in `infra/docker/.env`:

- `OVERPASS_OAUTH_USER`
- `OVERPASS_OAUTH_PASSWORD`
- optional overrides: `OVERPASS_OAUTH_OSM_HOST`, `OVERPASS_OAUTH_CONSUMER_URL`

`scripts/ops/start_stack.ts` validates these env vars with Zod and generates `/secrets/oauth-settings.json` automatically at startup.

## 3) Start Stack

```bash
bun --env-file=infra/docker/.env scripts/ops/start_stack.ts
```

This script creates `${TRAEFIK_ACME_ROOT}/acme.json` with restrictive permissions if missing.

Image/runtime note:

- Overpass is pinned to `wiktorn/overpass-api:0.7.62` in Compose for stable, repeatable production behavior on a maintained image line.
- Compose enforces `platform: linux/amd64` for Overpass to keep Mac ARM hosts compatible via Docker emulation; expect lower performance versus native ARM execution.
- Initial import downloads and processes the configured Germany source once per persistent `/db`. Keeping `/db` intact prevents re-downloading the large bootstrap file.

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
- For local testing, avoid `docker compose down -v` unless a full re-initialization is explicitly required.
- If ACME fails, confirm DNS points to this host and ports `80/443` are reachable before retrying.

## Local testing: re-download decision matrix

- **No re-download (default local iteration)**  
  Keep `/db` and use normal stop/start:

  ```bash
  bun --env-file=infra/docker/.env scripts/ops/stop_stack.ts
  bun --env-file=infra/docker/.env scripts/ops/start_stack.ts
  ```

- **No re-download (recreate containers after compose/env edits)**  
  Bring stack down/up without volume deletion:

  ```bash
  docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.yml down
  docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.yml up -d
  ```

- **Re-download required (intentional full rebuild only)**  
  Delete volumes/data and re-run bootstrap:
  ```bash
  docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.yml down -v
  bun --env-file=infra/docker/.env scripts/ops/start_stack.ts
  ```
  Use this when you intentionally want a clean DB bootstrap (for example after changing baseline source URL or when DB state is irrecoverable).

## Traefik Troubleshooting

- Increase Traefik logging temporarily by setting `TRAEFIK_LOG_LEVEL=INFO`.
- Keep dashboard disabled in normal operation; if temporarily enabling it, also keep `TRAEFIK_API_INSECURE=false` and expose access only through host firewall policy.
- Confirm only intended services are public by checking `traefik.enable` labels and `--providers.docker.exposedbydefault=false`.
