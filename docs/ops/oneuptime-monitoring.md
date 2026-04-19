# OneUptime Monitoring (Canonical Guide)

This is the single source of truth for monitoring this Overpass service with the self-managed OneUptime instance.

## Scope

Monitoring is designed to answer:

- Is the public service reachable and responding?
- Is TLS still valid?
- Is replication still advancing within our SLO?

## Current Signals (Baseline)

- **Container health endpoint:** `overpass` is probed via `/api/status` in `infra/docker/docker-compose.yml`.
- **Replication lag signal:** `scripts/ops/check_update_lag.ts` extracts `timestamp_osm_base` and computes `lag_seconds`.
- **Replication monotonicity signal:** `scripts/ops/check_replication.ts` confirms timestamps do not move backwards.

## OneUptime Features Used For This Service

### 1) HTTP uptime checks

- Monitor `https://<public-overpass-host>/api/status`
  - Expect HTTP 200.
  - Check interval: 1 minute.
  - Incident trigger: 3 consecutive failures.

- Monitor interpreter endpoint using lightweight query:
  - URL: `https://<public-overpass-host>/api/interpreter?data=%5Bout%3Ajson%5D%3Bnode(1)%3Bout%3B`
  - Expect HTTP 200 and response containing `timestamp_osm_base`.
  - Check interval: 2 minutes.

### 2) TLS certificate checks

- SSL monitor for `https://<public-overpass-host>`.
- Warning: certificate expires within 21 days.
- Critical: certificate expires within 7 days.

### 3) Replication freshness heartbeat

- Heartbeat monitor fed by `scripts/ops/monitor_replication.ts`.
- SLO: lag must stay <= 1800 seconds (30 minutes).
- Cadence: run check every 5 minutes.
- If lag exceeds threshold or timestamp is invalid, the script exits non-zero and should not send success heartbeat.

## Setup (Focused, Minimal)

1. In OneUptime, create the two HTTP monitors and one SSL monitor above.
2. In OneUptime, create a Heartbeat monitor and copy heartbeat URL(s).
3. On host, place env values in `/etc/overpass/monitoring.env` (template in `infra/ops/systemd/monitoring.env.example`).
4. Install `infra/ops/systemd/replication-monitor.service` and `infra/ops/systemd/replication-monitor.timer`.
5. Enable timer:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now replication-monitor.timer
```

## Script and Scheduler

Run manually:

```bash
bun scripts/ops/monitor_replication.ts --status-url https://<public-overpass-host>/api/status --max-lag-seconds 1800 --heartbeat-url https://monitoring.fixmycity.de/heartbeat/<success-token>
```

Systemd assets:

- `infra/ops/systemd/replication-monitor.service`
- `infra/ops/systemd/replication-monitor.timer`
- `infra/ops/systemd/monitoring.env.example`

## Fault-Injection Verification

Validate incident behavior after setup:

1. **Endpoint down test:** stop proxy or block ingress and confirm HTTP monitor incident opens and resolves.
2. **TLS alert test:** use OneUptime test notification path; confirm on-call routing.
3. **Replication lag test:** run monitor with strict threshold (`--max-lag-seconds 1`) and confirm heartbeat incident.
4. **Recovery test:** restore normal threshold and verify incident auto-resolves after successful checks.

## Alert Policy

- **P1:** public endpoint down or TLS invalid/expired.
- **P2:** replication lag above 30 minutes.
- **P3:** transient monitor execution failures without confirmed lag breach.

Route all incidents to the shared ops alert channel plus on-call escalation.

## Quick Triage

- **HTTP/TLS alert:** check OneUptime monitor timeline -> check `docker compose ps` and reverse proxy logs.
- **Replication lag alert:** run `bun scripts/ops/check_update_lag.ts` and `bun scripts/ops/check_replication.ts` locally, then inspect Overpass updater logs.
