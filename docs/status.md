# Project Status (2026-09-28)

Previous status (April 2026, wiktorn + Bun tooling) is in the git history.

## Where we are

- Research revisited ([landscape review](research/landscape-review-2026-09.md)); decision in [ADR 0002](research/decision-record-0002-base-image-review.md): switch to `b1tw153/overpass-api`, import from the osm-fr Germany extract, no OAuth.
- Stack rebuilt: one compose file, two env profiles, two shell scripts, Ansible. All Bun/TypeScript tooling removed.
- Verified locally with the Monaco profile (import, meta data, replication, crash recovery, online backup, monitor script). See ADR 0002.
- Not deployed anywhere yet. Germany import not yet run.

## Deployment target: open decision

### Option A: separate small VM (recommended)

4 vCPU, 8–16 GB RAM, ≥ 100 GB NVMe (see [server requirements](ops/server-requirements.md)). Full isolation, the existing Ansible playbook fits as is, agents can get root there without any TILDA risk.

### Option B: TILDA staging host (`tilda-staging`)

Read-only inspection on 2026-09-28:

- 8 vCPU (EPYC Milan), 15 GB RAM, **no swap**, 297 GB free on a single 480 GB virtual disk.
- TILDA runs `app`, `db` (PostGIS, ~7.6 GB RSS), `tiles`, `tiles_proxy`, `traefik` (owns 80/443), `opentelemetry-collector`; nightly TILDA processing also imports Germany data on this host.
- Users `quirky-penguin` and `github` are in the `docker` group. **Docker group membership is root-equivalent**, so a new user in that group could stop or read TILDA containers and volumes.

Isolation plan if we go this way (needs one-time sudo by an admin):

1. New Linux user `overpass` without sudo and **not** in the `docker` group; own SSH key for agents (`AllowUsers`/`Match User overpass` with key-only login).
2. **Rootless Docker** for that user (`dockerd-rootless-setuptool.sh`, `loginctl enable-linger overpass`). Its daemon cannot see or touch TILDA containers, volumes or the root daemon socket.
3. Hard caps for everything the user runs via systemd: `user-<uid>.slice` with `MemoryMax=5G`, `CPUQuota=300%`, `IOWeight=50`. The compose profile caps the container on top (`OVERPASS_CPUS`, `OVERPASS_MEMORY`).
4. Data in `/srv/overpass` owned by `overpass`; `OVERPASS_MIN_FREE_DISK_PERCENT=20` pauses updates/backups before the shared disk gets tight.
5. Ingress: TILDA's Traefik only discovers root-daemon containers. One small, reviewed change in the tilda-geo repo is required: a Traefik file-provider route `private-overpass.fixmycity.de → http://<docker bridge gateway>:8080`, with the Overpass port bound to that gateway address instead of loopback. This is the only coupling to TILDA.
6. Skip the Ansible `common`/`docker` roles there (they upgrade packages and may reboot the host).

Risks of B: shared disk and RAM with TILDA processing, no swap, the one-time Germany import competes with nightly TILDA runs (schedule it outside the processing window), and the Traefik change touches TILDA's deploy config.

## Next steps

1. Decide A or B.
2. Provision the host (A: Ansible; B: isolation steps above).
3. Run the Germany import, check duration/size against [server requirements](ops/server-requirements.md), update them with real numbers.
4. Set up OneUptime (HTTP, TLS, heartbeat) per [monitoring](ops/oneuptime-monitoring.md).
5. Try the endpoint with our QA tools. If the iD-based editing workflow covers QA, re-check whether we need Overpass at all.

## Ready to publish the repository?

Content-wise yes after the deploy decision: no secrets are tracked anymore (OAuth removed), only the team e-mail for ACME and the domain. Still missing: a LICENSE and a decision whether the domain should appear publicly.
