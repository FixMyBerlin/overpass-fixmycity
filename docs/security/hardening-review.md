# Security, Performance, And Code Hygiene Review

## Security Checklist

- Keep `--providers.docker.exposedbydefault=false` so only explicitly labeled services are exposed by Traefik.
- Enforce source restrictions with Traefik IP allowlist middleware (`OVERPASS_ALLOWED_CIDRS`).
- Keep Traefik dashboard/API disabled by default (`TRAEFIK_DASHBOARD=false`, `TRAEFIK_API_INSECURE=false`).
- Use ACME with valid DNS and keep `acme.json` outside the repository (`TRAEFIK_ACME_ROOT`).
- Avoid embedding secrets in compose files; use environment files or secret stores.
- Restrict host SSH, enforce key-based auth, and apply OS patching cadence.

## Performance Checklist

- Track import wall time and update lag from logs.
- Confirm SSD/NVMe throughput is sufficient to keep update lag bounded.
- Keep free disk headroom and monitor DB growth over time.
- Keep Traefik responding timeouts aligned with Overpass long queries (`TRAEFIK_READ_TIMEOUT`, `TRAEFIK_WRITE_TIMEOUT`).
- Set container memory/CPU limits in production once baseline metrics are known.

## Code Hygiene Checklist

- Scripts are modularized with shared helpers in `scripts/ops/lib.ts`.
- Entry scripts run under Bun with strict TypeScript checks.
- Cache and refresh behavior is explicit rather than implicit.
- Keep one script per responsibility (download/start/stop/query/update checks).
