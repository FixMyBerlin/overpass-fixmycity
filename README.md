# Germany Overpass Docker Workspace

This repository contains a Docker-first, reproducible setup for running an Overpass API instance focused on Germany, with mandatory update tracking, operational documentation, and security guidance.

## Quick Structure

- `docs/research/`: findings and architecture decisions.
- `docs/ops/`: sizing, host prep, runbook.
- `docs/security/`: hardening notes and access-control evaluation.
- `infra/ansible/`: host and monitoring automation playbooks/roles.
- `infra/docker/`: compose stack, YAML stack config, and env template.
- `scripts/ops/`: import/update/verification workflows.
- `tests/smoke/`: API and replication smoke checks.

## Workflow Summary

1. Prepare host and persistent data directories.
2. Configure container auth for protected Geofabrik source downloads.
3. Start the Docker stack and import baseline data in-container.
4. Run smoke tests for query functionality and replication progress.
5. Apply hardening and access controls before production exposure.

## Image And Runtime Strategy

- Overpass runs on `wiktorn/overpass-api:0.7.62`, pinned for repeatable production deployments while staying on a currently maintained upstream image.
- Compose sets `platform: linux/amd64` for the Overpass service so Apple Silicon Macs can run the image through Docker emulation when needed.
- On ARM Macs, emulation is expected to be slower (especially during import and heavy queries) than native ARM images, but behavior is consistent with x86_64 environments.

## Monitoring

Monitoring setup and alert policy are documented in `docs/ops/oneuptime-monitoring.md`.

## Host Provisioning

Default provisioning and host reconciliation are Ansible-first:

```bash
ansible-playbook -i infra/ansible/inventory/hosts.yml infra/ansible/playbooks/site.yml
```

## Quick Start

```bash
cp infra/docker/.env.example infra/docker/.env
# review infra/docker/stack.env.yaml defaults
# edit infra/docker/.env and set OVERPASS_OAUTH_PASSWORD
bun --env-file=infra/docker/.env scripts/ops/start_stack.ts
bun --env-file=infra/docker/.env tests/smoke/run_smoke.ts
```

For the full operational command set (manual verification, lag checks, stop flow), use `docs/ops/runbook.md`.
