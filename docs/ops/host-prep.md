# Host Preparation Guide

## Goal

Prepare a Docker host for running the Overpass stack with low operational risk and minimal external-service impact.

## Required Host Setup

1. Install Docker Engine and Compose plugin.
2. Create a dedicated service user and operations group (optional but recommended).
3. Reserve persistent directories for:
   - Overpass DB data (`OVERPASS_DATA_ROOT`)
   - Local extract cache (`OVERPASS_CACHE_ROOT`)
   - Traefik ACME storage (`TRAEFIK_ACME_ROOT`, includes `acme.json`)
4. Ensure firewall defaults deny inbound except explicitly allowed endpoints.
5. Ensure DNS for `OVERPASS_DOMAIN` points to the host before first deployment so ACME issuance succeeds.
6. Allow inbound TCP `80` and `443` for Traefik entrypoints.

## External Impact Policy

- Baseline extract download is **one-time** and reused locally.
- Re-download full extract only with explicit `--force-refresh`.
- Prefer local DB snapshots/volume restore for iterative testing.
- Avoid aggressive retry loops and keep bounded backoff in update tooling.

## Bootstrap Option

For Debian/Ubuntu hosts:

```bash
sudo bun scripts/bootstrap/install_bun.ts
sudo bun scripts/bootstrap/bootstrap_host.ts
```

Review and adapt user/group names before running on production hosts.
