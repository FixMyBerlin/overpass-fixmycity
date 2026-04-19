---
name: local-test-workflow
description: Documents how to validate changes locally with this repository's Bun-based smoke and runtime tests. Use when the user asks to test changes locally, verify behavior before commit, debug failing local checks, or choose the right test command for the scope of a change.
---

# Local Test Workflow

## Purpose

Use this skill to run and troubleshoot local validation for this repository.

Keep instructions brief and point to canonical docs for full operational detail.

## Canonical references

- Local test and stack flow: `docs/ops/runbook.md`
- Smoke orchestrator: `tests/smoke/run_smoke.ts`
- Runtime test suite: `tests/runtime/api_minute_updates.test.ts`
- Query/replication checks used by smoke: `scripts/ops/verify_query.ts`, `scripts/ops/check_replication.ts`

## Local testing decision flow

1. Choose the smallest check that matches the change.
2. Run only required setup for that check.
3. Run the test command.
4. If it fails, report the failure, likely cause, and next command to isolate.

## Commands by scope

### Fast smoke validation (recommended default)

```bash
bun --env-file=infra/docker/.env tests/smoke/run_smoke.ts
```

Use this for most behavior changes that touch scripts, Overpass query flow, or replication checks.

### Runtime regression check

```bash
bun test tests/runtime/api_minute_updates.test.ts
```

Use this when validating timestamp monotonicity and interpreter response shape.

### Full Bun test run

```bash
bun test
```

Use this before handoff when multiple test areas may be affected.

## Required local setup (when stack-backed tests are needed)

```bash
cp infra/docker/.env.example infra/docker/.env
# edit infra/docker/.env and set OVERPASS_OAUTH_PASSWORD
bun --env-file=infra/docker/.env scripts/ops/start_stack.ts
```

Then run the chosen test command.

## Germany data re-download decision matrix

- **Goal: run tests repeatedly, no dataset reset needed**  
  Keep `/db` persistent and restart normally:
  ```bash
  bun --env-file=infra/docker/.env scripts/ops/stop_stack.ts
  bun --env-file=infra/docker/.env scripts/ops/start_stack.ts
  ```

- **Goal: apply code/config changes only (same dataset)**  
  Recreate containers without deleting volumes:
  ```bash
  docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.yml down
  docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.yml up -d
  ```

- **Goal: intentionally re-bootstrap from Geofabrik (heavy; avoid in routine local tests)**  
  Delete Overpass DB volume/bind data, then start again:
  ```bash
  docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.yml down -v
  bun --env-file=infra/docker/.env scripts/ops/start_stack.ts
  ```
  Use this only when you intentionally need a full rebuild (e.g. switching baseline source or corrupted DB).

- **Rule of thumb**  
  `down -v` means "download/import again". If that is not your intent, do not use it.

For explicit Traefik URL testing:

```bash
OVERPASS_BASE_URL="https://private-overpass.fixmycity.de" bun --env-file=infra/docker/.env tests/smoke/run_smoke.ts
```

## Failure triage

- If tests cannot reach interpreter endpoint, verify stack status and `OVERPASS_BASE_URL`.
- If replication checks fail, rerun smoke once after waiting for replication to progress.
- If environment-derived behavior looks wrong, compare `infra/docker/.env` with `infra/docker/.env.example`.
- For repeated infra/startup failures, defer to recovery and troubleshooting guidance in `docs/ops/runbook.md`.

## Authoring expectations when adding/updating tests

- Prefer `import { test, expect } from "bun:test"` for tests.
- Prefer `import { $ } from "bun"` for shell execution in test-related scripts.
- Keep test entrypoints executable with Bun (`#!/usr/bin/env bun`) where appropriate.
- Reuse existing smoke/runtime structure instead of creating parallel test paths.
