# OneUptime Monitoring (Canonical Guide)

This is the single source of truth for monitoring this Overpass service with the self-managed OneUptime instance.

## Scope

Monitoring is designed to answer:

- Is the publicly accessible service endpoint reachable and responding?
- Is TLS still valid?
- Is replication still advancing within our SLO?

## Configuration Source Of Truth

Use `infra/ansible/group_vars/all.yml` as the authoritative source for deployment values:

- `monitoring_interpreter_url`
- `monitoring_max_lag_seconds`
- `monitoring_timer_cadence`
- `monitoring_on_boot_delay`
- `monitoring_accuracy`
- `overpass_repo_root`
- `monitoring_script_relpath`

Systemd files are rendered from Ansible templates and should not be edited directly on hosts.

## Current Signals (Baseline)

- **Container health endpoint:** `overpass` is probed via `/api/status` in `infra/docker/docker-compose.yml`.
- **Replication lag signal:** `scripts/ops/monitor_replication.ts` extracts `timestamp_osm_base` from `/api/interpreter` and computes `lag_seconds`.
- **Replication monotonicity signal:** `scripts/ops/check_replication.ts` confirms timestamps do not move backwards.

## Signal Ownership (Simple)

- **External OneUptime monitors and heartbeat are the paging/incident source of truth.**
- **Docker container health is local diagnostics for operators** (for example, quick status in `docker compose ps` while troubleshooting on the host).
- A container becoming `unhealthy` by itself should not be treated as a paging incident unless external monitors also show customer impact.
- This separation keeps alerting focused on real external impact and replication freshness, while preserving fast local debugging signals.

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
- SLO threshold comes from `monitoring_max_lag_seconds` (default: `300`, 5 minutes).
- Cadence comes from `monitoring_timer_cadence` (default: `1m`).
- If lag exceeds threshold or timestamp is invalid, the script exits non-zero and should not send success heartbeat.

## Setup (Ansible-First)

1. In OneUptime, create the two HTTP monitors and one SSL monitor above.
2. In OneUptime, create a Heartbeat monitor and copy heartbeat URL(s).
3. Set monitoring variables in `infra/ansible/group_vars/all.yml`:
   - `monitoring_interpreter_url`
   - `monitoring_max_lag_seconds`
   - `monitoring_heartbeat_url`
   - `monitoring_heartbeat_fail_url`
4. Apply Ansible site playbook:

```bash
ansible-playbook -i infra/ansible/inventory/hosts.yml infra/ansible/playbooks/site.yml
```

This renders `/etc/overpass/monitoring.env`, installs `replication-monitor.service` and `replication-monitor.timer`, reloads systemd, and enables the timer.

## Script and Scheduler

Run manually:

```bash
bun scripts/ops/monitor_replication.ts --interpreter-url https://<public-overpass-host>/api/interpreter --max-lag-seconds 300 --heartbeat-url https://monitoring.fixmycity.de/heartbeat/<success-token>
```

Ansible-managed assets:

- `infra/ansible/roles/monitoring/templates/replication-monitor.service.j2`
- `infra/ansible/roles/monitoring/templates/replication-monitor.timer.j2`
- `infra/ansible/roles/monitoring/templates/monitoring.env.j2`

## Fault-Injection Verification

Validate incident behavior after setup:

1. **Endpoint down test:** stop proxy or block ingress and confirm HTTP monitor incident opens and resolves.
2. **TLS alert test:** use OneUptime test notification path; confirm on-call routing.
3. **Replication lag test:** run monitor with strict threshold (`--max-lag-seconds 1`) and confirm heartbeat incident.
4. **Recovery test:** restore normal threshold and verify incident auto-resolves after successful checks.

## Automation Validation

Use these checks during rollout:

```bash
ansible-playbook -i infra/ansible/inventory/hosts.yml infra/ansible/playbooks/site.yml --syntax-check
ansible-playbook -i infra/ansible/inventory/hosts.yml infra/ansible/playbooks/site.yml --check
```

After apply, verify on host:

```bash
systemctl status replication-monitor.timer --no-pager
systemctl list-timers | rg replication-monitor
systemctl start replication-monitor.service && systemctl status replication-monitor.service --no-pager
```

## Alert Policy

- **P1:** publicly accessible endpoint down or TLS invalid/expired.
- **P2:** replication lag above 5 minutes.
- **P3:** transient monitor execution failures without confirmed lag breach.

Route all incidents to the shared ops alert channel plus on-call escalation.

## Quick Triage

- **HTTP/TLS alert:** check OneUptime monitor timeline -> check `docker compose ps` and reverse proxy logs.
- **Replication lag alert:** run `bun scripts/ops/monitor_replication.ts --interpreter-url https://<public-overpass-host>/api/interpreter --max-lag-seconds 300` and `bun scripts/ops/check_replication.ts` locally, then inspect Overpass updater logs.
