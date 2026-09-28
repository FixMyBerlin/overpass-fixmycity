# Operations Runbook

All commands run from the repository root on the host (`/opt/overpass-fixmycity`). Shorthand:

```bash
alias op='docker compose -p overpass -f infra/docker/compose.yml --env-file infra/docker/germany.env'
```

Add `--profile traefik` to `op` on a dedicated host where this stack terminates TLS itself (ports 80/443, DNS for `OVERPASS_DOMAIN` must point to the host).

## 1) Initial import (once per database)

```bash
op run --rm import
```

Downloads the osm-fr Germany extract (~6 GB), imports it with meta data and writes `db/replicate_id` for the osm-fr Germany minute feed. Checks free disk space before downloading. Run it in `tmux`/`screen`; it takes hours and can be re-run after a failure (clear `db/` first).

## 2) Start / stop

```bash
op up -d
op down
```

On first start the database catches up with the minute feed and builds areas; queries work during catch-up but return older data. The image cleans stale dispatcher sockets after a crash and shuts the updater down in a controlled way, so a plain `docker compose up -d` after a crash or reboot is the recovery path.

## 3) Verify

```bash
scripts/smoke_test.sh http://127.0.0.1:8080 <germany-node-id>   # meta data + replication advances
curl -s http://127.0.0.1:8080/api/timestamp                     # current data timestamp
docker exec overpass-overpass-1 /opt/overpass/bin/container_status.sh   # all components
```

## 4) Backups

`OVERPASS_BACKUP_TIME` (UTC) in `germany.env` runs a daily online backup to `${OVERPASS_DATA_ROOT}/backup` (same size as the DB). Queries and updates continue during backup. One-off backup:

```bash
docker exec overpass-overpass-1 /opt/overpass/bin/backup.sh /opt/overpass/backup
```

Restore: stop the stack, replace `db/` with the content of `backup/`, start again; replication resumes from the restored `replicate_id`.

## 5) Rate limits and capacity

- `NGINX_CLIENT_REQ_RATE` limits requests per client IP (429 above the limit).
- Beyond `CPU count` concurrent queries the image queues and then answers 429.
- `OVERPASS_CPUS`/`OVERPASS_MEMORY` cap the container, so a heavy query cannot take down other services on the host.
- All other knobs: [etc/overpass.env upstream](https://github.com/b1tw153/Overpass-API/blob/main/etc/overpass.env).

## 6) Update the image

Bump the tag in `infra/docker/compose.yml` (see [Docker Hub](https://hub.docker.com/r/b1tw153/overpass-api/tags) and the upstream `CHANGELOG-DOCKER.md`), then `op pull && op up -d`. The database format is upstream Overpass, so switching images does not require a re-import.
