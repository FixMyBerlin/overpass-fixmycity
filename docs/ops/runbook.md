# Operations Runbook

Monitoring configuration and incident policy are maintained in `docs/ops/oneuptime-monitoring.md`.
Host baseline and monitoring reconciliation are managed with Ansible in `infra/ansible/`.

Re-apply host + monitoring state:

```bash
ansible-playbook -i infra/ansible/inventory/hosts.yml infra/ansible/playbooks/site.yml
```

## 1) Initialize Environment

```bash
cp infra/docker/.env.example infra/docker/.env
```

Primary stack defaults (including paths, domain, Traefik, and Overpass runtime knobs) are located in `infra/docker/stack.env.yaml`.

Set required runtime value in `infra/docker/.env`:

- `OVERPASS_OAUTH_PASSWORD`

All non-secret defaults are sourced from `infra/docker/stack.env.yaml` and can be overridden by exporting process env vars for one-off runs.

For `OVERPASS_RATE_LIMIT` policy, rationale for the configured value, and tuning guidance, see `docs/security/overpass-resource-policy-evaluation.md`.

## 2) Configure OAuth Credentials

Set this value in `infra/docker/.env`:

- `OVERPASS_OAUTH_PASSWORD`

`scripts/ops/start_stack.ts` validates config inputs with Zod, then generates `/secrets/oauth-settings.json` automatically at startup.

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

For one-off test target overrides, use `OVERPASS_TEST_BASE_URL`:

```bash
OVERPASS_TEST_BASE_URL="https://private-overpass.fixmycity.de" bun --env-file=infra/docker/.env tests/smoke/run_smoke.ts
OVERPASS_TEST_BASE_URL="https://private-overpass.fixmycity.de" bun --env-file=infra/docker/.env scripts/ops/check_update_lag.ts
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

  Healthcheck policy:
  - Runtime/default (strict startup window): `infra/docker/docker-compose.yml` only (`start_period: 15m`).

- **Re-download required (intentional full rebuild only)**  
  Delete volumes/data and re-run bootstrap:
  ```bash
  docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.yml down -v
  bun --env-file=infra/docker/.env scripts/ops/start_stack.ts
  ```
  Use this when you intentionally want a clean DB bootstrap (for example after changing baseline source URL or when DB state is irrecoverable).
  For direct compose startup during bootstrap-heavy imports, include the bootstrap override with long grace:
  ```bash
  docker compose --env-file infra/docker/.env \
    -f infra/docker/docker-compose.yml \
    -f infra/docker/docker-compose.bootstrap.yml up -d
  ```
  If imports on this host regularly exceed 8h before API availability, increase only the bootstrap override `start_period` to `12h`.

## Traefik Troubleshooting

- Increase Traefik logging temporarily by setting `TRAEFIK_LOG_LEVEL=INFO`.
- Keep dashboard disabled in normal operation; if temporarily enabling it, also keep `TRAEFIK_API_INSECURE=false` and expose access only through host firewall policy.
- Confirm only intended services are public by checking `traefik.enable` labels and `--providers.docker.exposedbydefault=false`.

## Log Retention Defaults

- Compose sets Docker `json-file` logging for all services with `max-size: 20m` and `max-file: "5"` (about 100 MB max per container before older logs rotate out).
- Inspect the resolved Compose config to confirm logging policy:

  ```bash
  docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.yml config
  ```

- Inspect a running container to confirm active log driver and options:

  ```bash
  docker inspect overpass_de --format '{{.HostConfig.LogConfig.Type}} {{json .HostConfig.LogConfig.Config}}'
  docker inspect overpass_traefik --format '{{.HostConfig.LogConfig.Type}} {{json .HostConfig.LogConfig.Config}}'
  ```

- If you temporarily increase Traefik verbosity for troubleshooting, revert `TRAEFIK_LOG_LEVEL` after the incident to reduce log volume and disk churn.
