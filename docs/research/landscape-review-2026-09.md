# Overpass Self-Hosting Landscape Review (2026-09)

Re-evaluation of the inputs behind [ADR 0001](decision-record-0001-baseline.md), done on 2026-09-28, about five months after the original research (2026-04).

## 1. What changed in the community (forum thread)

Source: [Overpass API performance issues](https://community.openstreetmap.org/t/overpass-api-performance-issues/140598) — 188 posts, last read up to #188 (2026-09-24). Relevant developments since April:

- **Public instances got stricter, not looser.** User-Agent enforcement (HTTP 406, April), bans of deployment platforms (lovable.app, netlify.app), and since September a **per-IP and per-app CPU quota with hard bans** (#182). Fair share for regular use is now stated as roughly 50 requests/day per application (#171), ~150 s CPU/day (#173).
- **Main instances are unreliable in practice:** `lambert` replication froze on 2026-09-22 (#176–#178). Our reason for self-hosting is stronger than in April.
- **Community recommends self-hosting or not using Overpass at all** (osmium extracts, vector tiles, QLever) for recurring workloads (#96, #122, #160, #164).
- **New commercial/semi-public offers:** FairwayMapper API slots with keys (#149, #175). Not relevant for us (dependency + quota).

## 2. Existing base software — how it evolved

| Project | April 2026 | September 2026 | Assessment |
| --- | --- | --- | --- |
| [drolbr/Overpass-API](https://dev.overpass-api.de/releases/) (upstream) | 0.7.62.x | Latest release **0.7.62.11** (2026-03-11). GitHub tags stop at 0.7.62.4; releases are only on dev.overpass-api.de. No 0.7.63. | Stable, slow. No action. |
| [wiktorn/Overpass-API](https://github.com/wiktorn/Overpass-API) (our base) | we pin `wiktorn/overpass-api:0.7.62` | Rebuilt all tags on 2026-08-01 with **new `v`-prefixed scheme** (`v0.7.62` … `v0.7.62.11`), multi-arch (arm64) builds, osmium 4.3.1, configurable nginx `client_max_body_size`. Still ~27 open issues, low maintainer activity. | Still viable. Our pin is effectively **0.7.62.0 (2024)**; should move to `v0.7.62.11`. arm64 build may remove the Mac `platform: linux/amd64` workaround. |
| [osm-fr/ansible-scripts PR #112](https://github.com/osm-fr/ansible-scripts/pull/112) | open | still open, changes requested; `/tmp` diff storage filled prod disk | Reference only, unchanged. |
| [osm-fr/osm-extract-replication](https://github.com/osm-fr/osm-extract-replication) Germany minute feed | passed canary gate | `state.txt` current on 2026-09-28 (lag < 1 min) | Still valid choice. |
| OSMF Chef cookbook | reference | unchanged in role | Reference only. |

## 3. New projects found

### 3.1 `b1tw153/Overpass-API` (Kai Johnson) — **most relevant**

- Repo: https://github.com/b1tw153/Overpass-API — image: `b1tw153/overpass-api` (latest `0.7.62.11-r18`, 2026-08-31, releases roughly every 1–3 weeks since June).
- Fork of upstream 0.7.62.11 focused on **operations**, not query engine changes. Existing drolbr databases can be reused unchanged.
- Features that overlap with what we built ourselves:
  - nginx + fcgiwrap with **429 on overload**, per-IP connection/rate limits, queue, query timeout (≈ our Traefik/`OVERPASS_RATE_LIMIT` policy).
  - **Controlled shutdown / safer crash recovery** in `apply_osc_to_db.sh` (≈ our resilience concerns in start/stop scripts).
  - **Online backups** (`OVERPASS_BACKUP_TIME/DAY`) — we have nothing equivalent.
  - `container_status.sh` (text/JSON) + Docker healthcheck (≈ our `check_replication.ts`/`verify_query.ts`).
  - Optional **Munin** plugins (the same metrics the OSMF servers publish).
  - Diff cleanup (`clean_osc.sh`) — directly addresses the disk-fill issue seen in osm-fr PR #112.
  - Non-root (uid 10001), PBF import without our pbf→bz2 preprocess hack, regional extract + custom `OVERPASS_DIFF_URL` supported.
- Gaps to verify: no documented Geofabrik OAuth cookie download (we would download the internal PBF ourselves before import), 27 stars / single maintainer, author is active and well-informed in the forum.
- Also used by [MapRVA helm chart](https://github.com/MapRVA/helm-charts/tree/main/charts/overpass).

### 3.2 `mmd-osm/Overpass-API` (branch `test7591`, "0.7.59_mmd") — **fastest, but costly to adopt**

- Repo: https://github.com/mmd-osm/Overpass-API. Performance fork (FastCGI instead of per-request processes, lz4, epoll dispatcher, libosmium output).
- Production evidence: cartes.app ([serveur#151](https://codeberg.org/cartes/serveur/issues/151), [#156](https://codeberg.org/cartes/serveur/issues/156)): 45 h A/B with 471k requests — ~50× faster for element+meta lookups, 2–5× elsewhere.
- Costs: **incompatible DB format** (full re-import), no releases (development branch), no maintained Docker image (only a Dockerfile to build binaries), no packaged replication/ops tooling. Native build + own web server (cartes used Caddy/FastCGI).

### 3.3 Other projects (checked, not relevant)

- [RemiKalbe/overpass-api-helm-chart](https://github.com/RemiKalbe/overpass-api-helm-chart), [MapRVA helm chart](https://github.com/MapRVA/helm-charts/tree/main/charts/overpass): Kubernetes; we do not run k8s.
- [KingPin sumguy-examples](https://github.com/KingPin/sumguy-examples/tree/main/self-hosting/overpass-api-self-hosted/), [madflex blog](https://madflex.de/selfhost-overpass-api/): compose wrappers around wiktorn, nothing beyond our setup.
- Qloverleaf (Overpass QL on QLever, [forum](https://community.openstreetmap.org/t/qloverleaf-an-overpass-ql-interpreter-poc-using-qlever/144454)): PoC, weekly data only.
- GeoDesk (#185): not an Overpass replacement; no minutely updates yet.

## 4. Conclusion

See [ADR 0002](decision-record-0002-base-image-review.md) and [project status](../status.md).
