---
name: bun-overpass-workspace
description: Guides work in this Bun-based Overpass workspace using the project’s scripting, shell `$`, testing, and env conventions. Use when editing scripts, running tests, handling `.env` values, or planning ops/security changes; point to canonical docs instead of duplicating them.
---

# Bun Overpass Workspace

## Purpose

Use this skill for tasks in this repository that touch Bun scripts, command execution, tests, environment configuration, Docker operations, and runbook-driven workflows.

Do not restate full documentation. Link users to canonical sources.

## Canonical learning sources

- Bun LLM docs index: https://bun.sh/llms.txt
- Bun full LLM docs: https://bun.sh/llms-full.txt

## Repository references (local)

- Project overview and quick start: `README.md`
- Ops runbook and command flow: `docs/ops/runbook.md`
- Host and sizing docs: `docs/ops/host-prep.md`, `docs/ops/server-requirements.md`
- Security guidance: `docs/security/hardening-review.md`, `docs/security/access-options.md`
- Architecture rationale: `docs/research/decision-record-0001-baseline.md`

## Repository conventions to follow

### Runtime and scripting

- Prefer Bun TypeScript entrypoints with shebang (`#!/usr/bin/env bun`).
- Use `import { $ } from "bun"` for shell commands.
- Treat `const { $ } = Bun` as legacy style; only keep it when touching old code minimally and avoid introducing it in new or refactored code.
- Enable throwing shell behavior (`$.throws(true)`) unless a non-zero exit is intentionally handled.
- Keep scripts in `scripts/bootstrap/` or `scripts/ops/` by concern.

### Tests

- Use Bun test runner (`bun:test`) for runtime checks in `tests/runtime/`.
- Keep smoke orchestration in `tests/smoke/` and execute via Bun scripts.
- Prefer command-level smoke validation for Overpass interpreter and replication checks.

### Environment handling

- Source env values from `infra/docker/.env` with `infra/docker/.env.example` as template.
- Use existing helpers in `scripts/ops/lib.ts` (`ensureEnvFile`, `loadEnv`, `setEnvVar`) instead of ad-hoc parsing.
- Keep configurable behavior behind `process.env.*` with sensible defaults.

## Response behavior for agents using this skill

1. For Bun API/framework questions, cite Bun docs URLs above first.
2. For repository workflows, point to the relevant local doc path instead of re-documenting procedures.
3. When implementing changes, match existing style:
   - Bun + TypeScript ESM
   - Bun `$` shell commands
   - `process.env` configuration
   - Bun test patterns
4. If uncertain about ops/security policy, defer to the corresponding docs file and ask for confirmation before diverging.

