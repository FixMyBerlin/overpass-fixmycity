# Security, Performance, And Code Hygiene Review

## Security Checklist

- Run Overpass and proxy with minimal exposed interfaces (`127.0.0.1` binding by default).
- Keep proxy in default-deny mode and only add explicit allow-list entries.
- Store TLS materials outside the repository and mount read-only.
- Avoid embedding secrets in compose files; use environment files or secret stores.
- Restrict host SSH, enforce key-based auth, and apply OS patching cadence.

## Performance Checklist

- Track import wall time and update lag from logs.
- Confirm SSD/NVMe throughput is sufficient to keep update lag bounded.
- Keep free disk headroom and monitor DB growth over time.
- Set container memory/CPU limits in production once baseline metrics are known.

## Code Hygiene Checklist

- Scripts are modularized with shared helpers in `scripts/ops/lib.sh`.
- Entry scripts use strict shell options (`set -euo pipefail`).
- Cache and refresh behavior is explicit rather than implicit.
- Keep one script per responsibility (download/start/stop/query/update checks).
