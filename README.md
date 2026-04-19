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

## Quick Start

```bash
cp infra/docker/.env.example infra/docker/.env
bash scripts/ops/download_extract.sh
bash scripts/ops/start_stack.sh
bash tests/smoke/run_smoke.sh
```
