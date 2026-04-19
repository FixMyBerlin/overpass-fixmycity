# Host Preparation Guide

## Goal

Prepare a Docker host for running the Overpass stack with low operational risk and minimal external-service impact.

## Required Host Setup

1. Install Docker Engine and Compose plugin.
2. Create a dedicated service user and operations group (optional but recommended).
3. Reserve persistent directories for:
   - Overpass DB data (`OVERPASS_DATA_ROOT`)
   - Local extract cache (`OVERPASS_CACHE_ROOT`)
   - TLS material for proxy (`OVERPASS_DATA_ROOT/tls`)
4. Ensure firewall defaults deny inbound except explicitly allowed endpoints.

## External Impact Policy

- Baseline extract download is **one-time** and reused locally.
- Re-download full extract only with explicit `--force-refresh`.
- Prefer local DB snapshots/volume restore for iterative testing.
- Avoid aggressive retry loops and keep bounded backoff in update tooling.

## Bootstrap Option

For Debian/Ubuntu hosts:

```bash
sudo bun scripts/bootstrap/bootstrap_host.ts
```

Review and adapt user/group names before running on production hosts.
