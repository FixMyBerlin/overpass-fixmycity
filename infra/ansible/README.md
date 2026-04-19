# Ansible Operations

This directory is the default way to provision and reconcile Overpass hosts.

## Layout

- `ansible.cfg`: local Ansible defaults for this repo.
- `inventory/hosts.yml`: target hosts grouped under `overpass_hosts`.
- `group_vars/all.yml`: baseline and monitoring variables.
- `playbooks/site.yml`: full host baseline + monitoring deployment.
- `roles/`: modular automation for common packages, Docker, host paths/users, and monitoring.

## First-Time Setup

1. Update `inventory/hosts.yml` with your server address and SSH user.
2. Update `group_vars/all.yml`:
   - `overpass_operator_user`
   - `hostname_value` (optional)
   - `monitoring_status_url`
   - `monitoring_heartbeat_url`
   - `monitoring_heartbeat_fail_url`
3. Ensure repository code is present on host at `overpass_repo_root` (default `/opt/overpass-docker-workspace`), or override that variable.

## Source Of Truth

Keep deployment values in `group_vars/all.yml`. In particular:

- Monitoring thresholds/cadence (`monitoring_max_lag_seconds`, `monitoring_timer_cadence`)
- Systemd timing (`monitoring_on_boot_delay`, `monitoring_accuracy`)
- Script execution path (`overpass_repo_root`, `monitoring_script_relpath`)

## Run

From repository root:

```bash
ansible-playbook -i infra/ansible/inventory/hosts.yml infra/ansible/playbooks/site.yml
```

## Validation

Syntax check:

```bash
ansible-playbook -i infra/ansible/inventory/hosts.yml infra/ansible/playbooks/site.yml --syntax-check
```

Dry-run:

```bash
ansible-playbook -i infra/ansible/inventory/hosts.yml infra/ansible/playbooks/site.yml --check
```

Host verification after apply:

```bash
ssh <host> "systemctl status replication-monitor.timer --no-pager"
ssh <host> "systemctl list-timers | rg replication-monitor"
ssh <host> "systemctl start replication-monitor.service && systemctl status replication-monitor.service --no-pager"
```

Monitoring verification:

- Confirm OneUptime heartbeat check-ins arrive after a successful timer run.
- Run one forced-failure pass (for example temporary `monitoring_max_lag_seconds=1`) and confirm incident opens, then restore standard value and confirm auto-resolve.
