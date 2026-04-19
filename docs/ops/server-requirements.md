# Server Requirements

## Baseline Target (Germany Extract, No Attic/No Meta)

- **CPU:** 8 vCPU minimum (16 preferred for faster import and catch-up operations).
- **RAM:** 32 GB minimum (64 GB preferred for stable query/update concurrency).
- **Disk Type:** NVMe SSD strongly recommended.
- **Disk Capacity:** 1 TB minimum for safe growth, cache, snapshots, and logs.
- **Network:** Stable low-latency outbound network for replication fetches.

## Why This Is Conservative

Overpass database files can grow significantly beyond input extract size. Updater and query workloads are I/O sensitive, so disk throughput is a limiting factor.

## Capacity Planning Notes

- Keep at least 30% free disk space to avoid compaction/update stress.
- Track import duration and update lag as part of acceptance gates.
- Docker Compose log retention defaults are `json-file` with `max-size: 20m` and `max-file: "5"` per container (approximately 100 MB per service before rotation), and should be included in host disk budgeting.
- For history/attic enablement, plan a substantial increase in disk and RAM.
