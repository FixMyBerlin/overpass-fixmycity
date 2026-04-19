---
name: bun-overpass-workspace
description: Guides work in this Bun-based workspace with strict Bun runtime conventions for scripts, shell execution, env loading, and Bun test usage.
---

# Bun Overpass Workspace

## Purpose

Use this skill for tasks in this repository that touch Bun scripts, Bun shell, Bun env loading behavior, and Bun tests.

Do not restate full documentation. Link users to canonical sources.

## Canonical learning sources

- Bun LLM docs index: https://bun.sh/llms.txt
- Bun environment variables: https://bun.com/docs/runtime/environment-variables
- Bun shell runtime: https://bun.com/docs/runtime/shell

## Repository references (Bun-related)

- Script entrypoints and utilities: `scripts/`
- Bun scripts config: `package.json`
- Env template for Bun `--env-file`: `infra/docker/.env.example`
- Runtime and smoke tests: `tests/runtime/`, `tests/smoke/`

## Repository conventions to follow

### Runtime and scripting

- Prefer Bun TypeScript entrypoints with shebang (`#!/usr/bin/env bun`).
- Use `import { $ } from "bun"` for shell commands.
- Enable throwing shell behavior (`$.throws(true)`) unless a non-zero exit is intentionally handled.
- Keep script entrypoints runnable via `bun run ...` scripts in `package.json`.

### Tests

- Use Bun test runner (`bun:test`) for runtime checks in `tests/runtime/`.
- Keep smoke orchestration in `tests/smoke/` and execute through Bun scripts.

### Environment handling

- Use Bun `--env-file=infra/docker/.env` for script execution (do not add custom env file parsers).
- Validate required env vars with centralized Zod schemas before use.
- Avoid runtime fallbacks (`??`, `||`) for required config values.
- Keep a single explicit config path: `.env.example` declares required keys, scripts consume validated parsed env.

## Response behavior for agents using this skill

1. For Bun runtime behavior questions, cite Bun docs URLs above first.
2. Prefer Bun-native patterns over Node legacy compatibility shims when both are possible.
3. Keep code examples focused on Bun usage: Bun shell, `bun run`, Bun test, Bun env-file behavior.
4. Do not introduce duplicate config pathways or implicit defaults for required runtime settings.

