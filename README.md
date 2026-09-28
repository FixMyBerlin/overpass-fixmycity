# FixMyCity Overpass

Private Overpass API instance for FixMyCity tools: Germany, minutely updated, with meta data (user, changeset), without history (attic).

The repository is intentionally thin. Everything Overpass-specific (import, replication, crash recovery, backups, overload handling, health) comes from the [b1tw153/overpass-api](https://github.com/b1tw153/Overpass-API) image. This repo adds:

- [infra/docker/compose.yml](infra/docker/compose.yml): the stack (Overpass, optional Traefik for TLS) plus two profiles, [germany.env](infra/docker/germany.env) (production) and [test.env](infra/docker/test.env) (Monaco, for local tests).
- [scripts/](scripts/): `smoke_test.sh` and `monitor_replication.sh` (OneUptime heartbeat).
- [infra/ansible/](infra/ansible/): host baseline, data directories, monitoring timer.

Data source: extract and minute diffs both come from [osm-fr](https://github.com/osm-fr/osm-extract-replication). The extract contains user meta data, so no Geofabrik OAuth is needed.

## Quick start (local test)

Needs only Docker. Data goes to a directory outside the repo, resources are capped by the profile (1 CPU, 1 GB).

```bash
export OVERPASS_DATA_ROOT="$TMPDIR/overpass-test"
mkdir -p "$OVERPASS_DATA_ROOT"/{db,diff,backup}
docker compose -p overpass-test -f infra/docker/compose.yml --env-file infra/docker/test.env run --rm import
docker compose -p overpass-test -f infra/docker/compose.yml --env-file infra/docker/test.env up -d
scripts/smoke_test.sh
docker compose -p overpass-test -f infra/docker/compose.yml --env-file infra/docker/test.env down
rm -rf "$OVERPASS_DATA_ROOT"
```

## Docs

- [docs/status.md](docs/status.md): current state, open decisions, next steps.
- [docs/ops/runbook.md](docs/ops/runbook.md): import, start/stop, verify, backup/restore.
- [docs/ops/host-prep.md](docs/ops/host-prep.md), [docs/ops/server-requirements.md](docs/ops/server-requirements.md), [docs/ops/oneuptime-monitoring.md](docs/ops/oneuptime-monitoring.md)
- [docs/research/](docs/research/): decision records and research.
