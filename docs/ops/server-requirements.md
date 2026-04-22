# Server Requirements

## Scope (Germany Profile)

This baseline is for the Germany-oriented runtime profile used in this repository:

- Import default: `OVERPASS_PLANET_URL=https://.../europe/germany-latest-internal.osm.pbf` in [infra/docker/stack.env.yaml](../../infra/docker/stack.env.yaml)
- Replication default: Germany minute feed in [infra/docker/stack.env.yaml](../../infra/docker/stack.env.yaml)
- Strategy context: [docs/research/decision-record-0001-baseline.md](../research/decision-record-0001-baseline.md)

## Baseline Target (Germany Extract, No Attic, Meta Enabled)

- **CPU:** 8 vCPU minimum (16 preferred for faster import and catch-up operations).
- **RAM:** 32 GB minimum (64 GB preferred for stable query/update concurrency).
- **Disk Type:** NVMe SSD strongly recommended.
- **Disk Capacity:** 1 TB minimum for safe growth, cache, snapshots, and logs.
- **Network:** Stable low-latency outbound network for replication fetches.

## Source Confirmation And Number Mapping

The baseline above is grounded in these sources:

- OSM Wiki installation guidance: [Overpass API/Installation](https://osm.wiki/wiki/Overpass_API/install)
  - Explicitly states that `overpass-api.de` runs with **32 GB RAM**.
  - Explicitly recommends **fast SSDs**.
- Operational diary reference used by this project: [Setting up an Overpass API server - how hard can it be?](https://www.openstreetmap.org/user/SomeoneElse/diary/408252)
  - Shows strong storage amplification during import (small extract -> much larger DB files).
  - Documents real-world import/update sensitivity to machine size and disk behavior.
- Repository research index: [docs/research/sources-summary.md](../research/sources-summary.md)

Confirmed vs. derived values:

- **Confirmed directly in sources:** `32 GB RAM` baseline context and `SSD` recommendation.
- **Conservative project policy (derived for Germany profile):** `8/16 vCPU`, `64 GB preferred`, and `1 TB disk`.
  - These are not quoted as one fixed tuple in a single upstream source; they are chosen to keep Germany import, replication catch-up, and operational headroom low-risk.

## Why This Is Conservative For Germany

Overpass database files can grow significantly beyond input extract size. Updater and query workloads are I/O sensitive, so disk throughput is a limiting factor.

## Capacity Planning Notes

- Keep at least 30% free disk space to avoid compaction/update stress.
- Track import duration and update lag as part of acceptance gates.
- Docker Compose log retention defaults are `json-file` with `max-size: 20m` and `max-file: "5"` per container (approximately 100 MB per service before rotation), and should be included in host disk budgeting.
- For history/attic enablement, plan a substantial increase in disk and RAM.
