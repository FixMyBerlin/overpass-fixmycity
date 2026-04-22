# FixMyCity Overpass Operations Repository

## Project Overview

This repository orchestrates Overpass operations in two core parts:

1. **Server provisioning and host reconciliation** with Ansible.
2. **Deployment and operation of the Overpass Docker stack**, including configuration, verification, and monitoring.

The runtime stack intentionally builds on the upstream [wiktorn/Overpass-API](https://github.com/wiktorn/Overpass-API) Docker image; this repository provides the surrounding provisioning, configuration, validation, and monitoring workflows.

The current checked-in defaults are Germany-oriented (import and replication defaults), but runtime behavior is configurable through stack profiles and environment variables.

## System Basics

The operational flow is intentionally simple:

1. Prepare and provision the host.
2. Load stack configuration ([infra/docker/stack.env.yaml](infra/docker/stack.env.yaml) + `.env`) and start Overpass.
3. Verify query and replication signals with smoke checks.
4. Enable external monitoring and heartbeats.

Important: In normal operation, manage the stack via [scripts/ops/start_stack.ts](scripts/ops/start_stack.ts) and [scripts/ops/stop_stack.ts](scripts/ops/stop_stack.ts); direct `docker compose up/down` calls are exceptional (debug or maintenance only), with smoke verification in [tests/smoke/run_smoke.ts](tests/smoke/run_smoke.ts) and operational details in [docs/ops/runbook.md](docs/ops/runbook.md).

## Repository Structure

### Primary operational artifacts

- [infra/ansible/](infra/ansible/): Provisioning and reconciliation for host baseline, Docker, and monitoring timers.
- [infra/docker/](infra/docker/): Compose definitions and stack profiles for Overpass runtime operations.
- [scripts/ops/](scripts/ops/): Start/stop, verification, and monitoring scripts for daily operations.
- [tests/smoke/](tests/smoke/): End-to-end smoke checks for API availability and replication progress.

### Secondary/reference artifacts

- [docs/ops/](docs/ops/): Canonical operations documentation (host prep, runbook, monitoring, requirements).
- [docs/security/](docs/security/): Security and hardening evaluations and guidance.
- [docs/research/](docs/research/): Decision records (ADR) and technical research.

## Usage

### Server Requirements and Provisioning

Before provisioning, confirm host sizing and baseline requirements:
- [docs/ops/server-requirements.md](docs/ops/server-requirements.md)

The default path is Ansible-first:

```bash
ansible-playbook -i infra/ansible/inventory/hosts.yml infra/ansible/playbooks/site.yml
```

Details:
- [docs/ops/host-prep.md](docs/ops/host-prep.md)
- [infra/ansible/README.md](infra/ansible/README.md)

### Start and Operate the Stack

Use the custom TypeScript operations scripts as the default interface: they validate and resolve environment/config inputs and help apply startup setup steps in the intended, safe order.

This script-first workflow wraps the upstream Overpass Docker package usage so runtime setup stays reproducible and operational checks are consistently applied.


First decide your stack profile and data-source/auth setup in [infra/docker/stack.env.yaml](infra/docker/stack.env.yaml).
Use [infra/docker/.env.example](infra/docker/.env.example) only when you need the required secret `OVERPASS_OAUTH_PASSWORD` (for internal Geofabrik OAuth access) or explicit runtime overrides.

```bash
bun scripts/ops/start_stack.ts
bun tests/smoke/run_smoke.ts
```

Details:
- [docs/ops/runbook.md](docs/ops/runbook.md)
- [docs/ops/env-config-matrix.md](docs/ops/env-config-matrix.md)

### Monitoring and Ping Systems

Monitoring (HTTP/TLS + replication heartbeat) is part of initial setup and is integrated via OneUptime plus Ansible-managed timers.

Details:
- [docs/ops/oneuptime-monitoring.md](docs/ops/oneuptime-monitoring.md)
