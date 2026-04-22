# Env And Config Matrix

This document defines ownership and precedence only.
It intentionally does not duplicate per-key inventories that are already defined in code and config.

Canonical key definitions live in:

- `scripts/config/env.ts` (Zod schemas and getters)
- `infra/docker/stack.env.yaml` (non-secret defaults)
- `infra/docker/.env.example` (secrets contract)

## Ownership Model

- `stack.env.yaml`
  - Source of truth for non-secret stack configuration defaults.
- `.env` / process env
  - Secrets and one-off runtime overrides.
- `env.ts`
  - Validation, normalization, and merge behavior used by scripts.

## Current Secret Contract

- Required env-file secret is documented in `infra/docker/.env.example` and validated in `scripts/config/env.ts`.

## Precedence

For script execution, effective values resolve as:

1. defaults from `infra/docker/stack.env.yaml`
2. overridden by process env (including `bun --env-file=infra/docker/.env`)
