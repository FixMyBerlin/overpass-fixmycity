# ADR 0002: Switch to b1tw153/overpass-api and osm-fr extract

## Status

Accepted (2026-09-28). Supersedes the runtime parts of [ADR 0001](decision-record-0001-baseline.md). Evidence: [landscape review 2026-09](landscape-review-2026-09.md).

## Context

- Our pin `wiktorn/overpass-api:0.7.62` was the 2024 base release; wiktorn is low-activity.
- `b1tw153/overpass-api` (upstream 0.7.62.11, DB-compatible, releases every 1–3 weeks) ships the operational layer we had built ourselves in ~900 lines of Bun/TypeScript (config validation, stale-lock cleanup, PBF preprocessing, healthcheck split) plus things we lacked (online backups, diff cleanup, disk-space guards, overload 429s, controlled shutdown).
- osm-fr publishes `germany-latest.osm.pbf` from the same pipeline as its Germany minute feed, including user meta data. The Geofabrik internal download with OAuth is not needed.
- `mmd-osm` fork is much faster but requires a full re-import, native build and has no releases; not adopted.

## Decision

1. Runtime image `b1tw153/overpass-api` (pinned tag), configured by env only.
2. Initial load with the image's `import_osm_data.sh` from the osm-fr Germany extract; replication from the osm-fr Germany minute feed. No OAuth, no secrets in the stack.
3. Keep: Traefik (optional profile), Ansible host baseline, OneUptime heartbeat. Replace all Bun/TypeScript tooling with two shell scripts (smoke test, replication monitor).
4. Local test profile: Monaco from osm-fr (same pipeline as production, ~1 MB, import < 1 min) instead of Berlin from Geofabrik.

## Consequences

- Repository shrinks to compose + two env profiles + two scripts + Ansible.
- Single-maintainer dependency; mitigated because the DB format is upstream, so we can switch back to wiktorn or plain upstream without re-import.
- Image is amd64-only; on Apple Silicon it runs under emulation (fine for the Monaco test).

## Verification (2026-09-28, local, Monaco, 1 CPU / 1 GB cap)

- Import incl. replicate_id detection: 26 s, DB 93 MB, peak memory < 160 MB.
- Queries return `user`/`uid`; `/api/timestamp` advances; catch-up CPU-bound at the 1-CPU cap.
- `docker kill -s KILL` during updates → restart detected and removed the stale socket, healthy within 60 s, replication continued.
- Online backup (`backup.sh`) while serving: 90 MB, no interruption.
