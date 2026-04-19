# Germany Overpass Docker Workspace

This repository contains a Docker-first, reproducible setup for running an Overpass API instance focused on Germany, with mandatory update tracking, operational documentation, and security guidance.

## Quick Structure

- `docs/research/`: findings and architecture decisions.
- `docs/ops/`: sizing, host prep, runbook.
- `docs/security/`: hardening notes and access-control evaluation.
- `infra/docker/`: compose stack and environment template.
- `infra/proxy/`: reverse proxy config.
- `scripts/bootstrap/`: optional host bootstrap helper.
- `scripts/ops/`: import/update/verification workflows.
- `tests/smoke/`: API and replication smoke checks.

## Workflow Summary

1. Prepare host and create local cache directories.
2. Download baseline Germany extract once (cache-first workflow).
3. Start the Docker stack and import baseline data.
4. Run smoke tests for query functionality and replication progress.
5. Apply hardening and access controls before production exposure.

## Image And Runtime Strategy

- Overpass runs on `wiktorn/overpass-api:0.7.62`, pinned for repeatable production deployments while staying on a currently maintained upstream image.
- Compose sets `platform: linux/amd64` for the Overpass service so Apple Silicon Macs can run the image through Docker emulation when needed.
- On ARM Macs, emulation is expected to be slower (especially during import and heavy queries) than native ARM images, but behavior is consistent with x86_64 environments.

## Monitoring

Monitoring setup and alert policy are documented in `docs/ops/oneuptime-monitoring.md`.

## Quick Start

```bash
cp infra/docker/.env.example infra/docker/.env
bun --env-file=infra/docker/.env scripts/ops/download_extract.ts
bun --env-file=infra/docker/.env scripts/ops/start_stack.ts
bun --env-file=infra/docker/.env tests/smoke/run_smoke.ts
```

For the full operational command set (manual verification, lag checks, stop flow), use `docs/ops/runbook.md`.
